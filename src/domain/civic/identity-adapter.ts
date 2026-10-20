/**
 * CONECTOR MODULAR DE IDENTIDAD HOMOLOGADO (ZERO-PII)
 * Y GESTIÓN DE DISPOSITIVO ACTIVO ÚNICO (PASSKEYS WEBAUTHN)
 * Democracia Viva (democraciaviva.es)
 * 
 * Cumple con SPEC.md:
 * 1. Conector modular IdentityProviderAdapter (Didit, Stripe Identity, Cl@ve eIDAS).
 * 2. Cero PII: NUNCA almacena nombres, fotos ni números de DNI.
 * 3. 1 Ciudadano = 1 Dispositivo Activo (migración atómica con revocación previa).
 * 4. Control de mayoría de edad (+18) estricto.
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

export type IdentityProviderType = 'DIDIT_KYC' | 'STRIPE_IDENTITY' | 'CLAVE_EIDAS' | 'SANDBOX_EMULATOR';

export interface IdentityWebhookPayload {
  provider: IdentityProviderType;
  provider_reference: string;
  is_adult_18: boolean;
  webhook_signature: string;
  timestamp: number;
  // Identificador opaco de sesión/documento del proveedor (del que se deriva el nullifier seguro)
  opaque_identity_token: string;
}

export interface CitizenDeviceRecord {
  citizen_nullifier_hash: string;
  active_credential_id: string;
  public_key: string;
  registered_at: number;
  devices_count: number;
  revoked_credentials: string[];
}

export interface EnrollmentResult {
  ok: boolean;
  code?: string;
  citizen_nullifier_hash?: string;
  device_replaced?: boolean;
  revoked_credential_id?: string;
  error?: string;
}

const DEFAULT_SERVER_PEPPER = 'DEMOCRACIA_VIVA_KMS_IDENTITY_PEPPER_2026_ES';

/**
 * Deriva un hash de nulificador determinista e irreversible sin almacenar PII
 */
export function deriveCitizenNullifierHash(opaqueToken: string, pepper: string = DEFAULT_SERVER_PEPPER): string {
  const h = hmac(sha256, utf8ToBytes(pepper), utf8ToBytes(opaqueToken));
  return `0x${bytesToHex(h)}`;
}

/**
 * Adaptador de Proveedores de Identidad Certificados
 */
export class IdentityProviderAdapter {
  private serverPepper: string;
  // Registro de dispositivos activos: key = citizen_nullifier_hash
  private activeDevices = new Map<string, CitizenDeviceRecord>();
  // Índice inverso de credenciales: key = credential_id -> nullifier
  private credentialIndex = new Map<string, string>();
  // Credenciales revocadas para verificación rápida
  private revokedCredentials = new Set<string>();

  constructor(serverPepper: string = DEFAULT_SERVER_PEPPER) {
    this.serverPepper = serverPepper;
  }

  /**
   * Procesa la atestación de identidad desde un webhook o callback OIDC certificado
   */
  verifyIdentityPayload(payload: IdentityWebhookPayload, expectedSecretKey: string = 'webhook_secret'): {
    valid: boolean;
    is_adult_18: boolean;
    nullifier_hash?: string;
    error?: string;
  } {
    // 1. Validar mayoría de edad legal (+18)
    if (!payload.is_adult_18) {
      return {
        valid: false,
        is_adult_18: false,
        error: 'El titular no cumple con el requisito legal de mayoría de edad (+18 años)'
      };
    }

    // 2. Validar firma del webhook del proveedor (HMAC-SHA256)
    const expectedSig = bytesToHex(
      hmac(sha256, utf8ToBytes(expectedSecretKey), utf8ToBytes(`${payload.provider}:${payload.provider_reference}:${payload.timestamp}`))
    );
    // En modo simulación o si la firma coincide
    const signatureValid = payload.provider === 'SANDBOX_EMULATOR' || payload.webhook_signature === expectedSig;
    if (!signatureValid) {
      return {
        valid: false,
        is_adult_18: true,
        error: 'Firma de webhook del proveedor de identidad inválida o manipulada'
      };
    }

    // 3. Derivar el citizen_nullifier_hash (Cero PII)
    const nullifierHash = deriveCitizenNullifierHash(payload.opaque_identity_token, this.serverPepper);
    return {
      valid: true,
      is_adult_18: true,
      nullifier_hash: nullifierHash
    };
  }

  /**
   * Vinculación de Dispositivo con Passkey WebAuthn
   * Implementa la regla atómica: 1 Ciudadano = 1 Dispositivo Activo
   * Si el ciudadano registra un nuevo teléfono, se revoca atómicamente el anterior.
   */
  registerDevicePasskey(params: {
    citizenNullifierHash: string;
    credentialId: string;
    publicKey: string;
  }): EnrollmentResult {
    const { citizenNullifierHash, credentialId, publicKey } = params;

    const existing = this.activeDevices.get(citizenNullifierHash);
    let deviceReplaced = false;
    let revokedCredentialId: string | undefined;

    if (existing) {
      // 1 Ciudadano = 1 Dispositivo Activo: Revocación atómica del dispositivo anterior
      revokedCredentialId = existing.active_credential_id;
      this.credentialIndex.delete(revokedCredentialId);
      this.revokedCredentials.add(revokedCredentialId);
      existing.revoked_credentials.push(revokedCredentialId);

      existing.active_credential_id = credentialId;
      existing.public_key = publicKey;
      existing.registered_at = Date.now();
      existing.devices_count++;
      deviceReplaced = true;
    } else {
      // Alta inicial
      this.activeDevices.set(citizenNullifierHash, {
        citizen_nullifier_hash: citizenNullifierHash,
        active_credential_id: credentialId,
        public_key: publicKey,
        registered_at: Date.now(),
        devices_count: 1,
        revoked_credentials: []
      });
    }

    this.credentialIndex.set(credentialId, citizenNullifierHash);

    return {
      ok: true,
      citizen_nullifier_hash: citizenNullifierHash,
      device_replaced: deviceReplaced,
      revoked_credential_id: revokedCredentialId
    };
  }

  /**
   * Comprueba si una credencial WebAuthn está activa y autorizada
   */
  isCredentialActive(credentialId: string): boolean {
    if (this.revokedCredentials.has(credentialId)) return false;
    const nullifier = this.credentialIndex.get(credentialId);
    if (!nullifier) return false;
    const record = this.activeDevices.get(nullifier);
    return record?.active_credential_id === credentialId;
  }

  /**
   * Obtiene el registro del ciudadano por su nullifier (sin PII)
   */
  getDeviceRecord(citizenNullifierHash: string): CitizenDeviceRecord | undefined {
    return this.activeDevices.get(citizenNullifierHash);
  }

  /**
   * Estadísticas anónimas para el panel de administración
   */
  getSecurityStats(): {
    total_active_citizens: number;
    active_passkeys: number;
    revoked_passkeys: number;
  } {
    return {
      total_active_citizens: this.activeDevices.size,
      active_passkeys: this.credentialIndex.size,
      revoked_passkeys: this.revokedCredentials.size
    };
  }

  /**
   * Vaciado para el Sandbox
   */
  resetSandbox(): void {
    this.activeDevices.clear();
    this.credentialIndex.clear();
    this.revokedCredentials.clear();
  }
}
