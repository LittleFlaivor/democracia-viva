/**
 * CAPA DE DOMINIO — WebAuthn / Passkeys (ES256).
 *
 * `VirtualPasskey` produce aserciones con la MISMA estructura que WebAuthn
 * (authenticatorData || clientDataJSON, firma ES256 sobre authData || SHA-256(clientDataJSON)),
 * de modo que `verifyAssertion` valida igual una passkey virtual y una real de TouchID/Hello
 * (esta última entra por `passkey-platform.ts`, formato de firma DER).
 *
 * NO verificamos attestation (el registro confía en el canal DNIe + posesión de la clave).
 */
import { p256, sha256, sha256Hex, bytesToHex, hexToBytes, utf8ToBytes, concatBytes, randomBytes, b64urlEncode, ctEqual } from './crypto.ts';

export interface Assertion {
  credentialId: string;
  authenticatorData: Uint8Array;
  clientDataJSON: Uint8Array;
  signature: Uint8Array;
  sigFormat: 'compact' | 'der';
}
export interface PasskeySigner {
  readonly credentialId: string;
  readonly publicKey: Uint8Array; // P-256 comprimida (33 bytes)
  readonly kind: 'VIRTUAL' | 'PLATFORM';
  sign(challenge: Uint8Array): Promise<Assertion>;
}
export interface RpConfig { rpId: string; origin: string }

export const DEFAULT_RP: RpConfig = { rpId: 'democraciaviva.es', origin: 'https://democraciaviva.es' };

export class VirtualPasskey implements PasskeySigner {
  readonly credentialId: string;
  readonly publicKey: Uint8Array;
  readonly kind = 'VIRTUAL' as const;
  private sk: Uint8Array;
  private counter = 0;
  private rp: RpConfig;
  constructor(rp: RpConfig = DEFAULT_RP) {
    const k = p256.keygen();
    this.sk = k.secretKey;
    this.publicKey = k.publicKey;
    this.credentialId = b64urlEncode(randomBytes(16));
    this.rp = rp;
  }
  async sign(challenge: Uint8Array): Promise<Assertion> {
    const flags = new Uint8Array([0x05]); // UP + UV
    const counter = new Uint8Array(4);
    new DataView(counter.buffer).setUint32(0, ++this.counter);
    const authenticatorData = concatBytes(sha256(utf8ToBytes(this.rp.rpId)), flags, counter);
    const clientDataJSON = utf8ToBytes(JSON.stringify({ type: 'webauthn.get', challenge: b64urlEncode(challenge), origin: this.rp.origin }));
    const signature = p256.sign(concatBytes(authenticatorData, sha256(clientDataJSON)), this.sk);
    return { credentialId: this.credentialId, authenticatorData, clientDataJSON, signature, sigFormat: 'compact' };
  }
}

export type AssertionRejection = 'BAD_CLIENT_DATA' | 'CHALLENGE_MISMATCH' | 'ORIGIN_MISMATCH' | 'RPID_MISMATCH' | 'USER_NOT_VERIFIED' | 'COUNTER_REPLAY' | 'BAD_SIGNATURE';
export type AssertionResult = { ok: true; counter: number } | { ok: false; code: AssertionRejection };

export function verifyAssertion(a: Assertion, publicKey: Uint8Array, expected: { challenge: Uint8Array } & RpConfig, lastCounter: number): AssertionResult {
  let cd: { type?: string; challenge?: string; origin?: string };
  try { cd = JSON.parse(new TextDecoder().decode(a.clientDataJSON)); } catch { return { ok: false, code: 'BAD_CLIENT_DATA' }; }
  if (cd.type !== 'webauthn.get') return { ok: false, code: 'BAD_CLIENT_DATA' };
  if (cd.challenge !== b64urlEncode(expected.challenge)) return { ok: false, code: 'CHALLENGE_MISMATCH' };
  if (cd.origin !== expected.origin) return { ok: false, code: 'ORIGIN_MISMATCH' };
  if (a.authenticatorData.length < 37 || !ctEqual(a.authenticatorData.slice(0, 32), sha256(utf8ToBytes(expected.rpId)))) return { ok: false, code: 'RPID_MISMATCH' };
  const flags = a.authenticatorData[32];
  if (!(flags & 0x01) || !(flags & 0x04)) return { ok: false, code: 'USER_NOT_VERIFIED' };
  const counter = new DataView(a.authenticatorData.buffer, a.authenticatorData.byteOffset + 33, 4).getUint32(0);
  // Contador 0 permitido solo para autenticadores que no lo implementan (passkeys sincronizadas).
  if (counter !== 0 && counter <= lastCounter) return { ok: false, code: 'COUNTER_REPLAY' };
  const msg = concatBytes(a.authenticatorData, sha256(a.clientDataJSON));
  let ok = false;
  try { ok = p256.verify(a.signature, msg, publicKey, a.sigFormat === 'der' ? { format: 'der' } : undefined); } catch { ok = false; }
  return ok ? { ok: true, counter } : { ok: false, code: 'BAD_SIGNATURE' };
}

export const actionChallenge = (action: string, scope: string, payload: string): Uint8Array =>
  sha256(utf8ToBytes(`DV-ACTION-v1|${action}|${scope}|${payload}`));

export { sha256Hex, bytesToHex, hexToBytes };
