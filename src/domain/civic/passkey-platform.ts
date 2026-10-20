/**
 * ADAPTADOR NAVEGADOR — passkey real (TouchID / FaceID / Windows Hello).
 * Solo se ejecuta en cliente. NO está cubierto por tests automáticos de hardware
 * (se prueba manualmente desde el botón "Biometría real" del Sandbox).
 *
 * Nota: el rpId de WebAuthn debe coincidir con el dominio donde corre la app
 * (localhost en desarrollo, democraciaviva.es en producción).
 */
import { p256, bytesToHex, b64urlEncode, b64urlDecode, randomBytes } from './crypto.ts';
import type { Assertion, PasskeySigner } from './passkey.ts';

const SPKI_P256_PREFIX_LEN = 26; // cabecera SPKI de P-256; el resto = punto no comprimido de 65 bytes

export async function createPlatformPasskey(label: string): Promise<PasskeySigner> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: 'Democracia Viva (Sandbox)', id: location.hostname },
      user: { id: randomBytes(16), name: label, displayName: label },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      authenticatorSelection: { userVerification: 'required', residentKey: 'preferred' },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error('PASSKEY_CREATION_CANCELLED');
  const spki = new Uint8Array((cred.response as AuthenticatorAttestationResponse).getPublicKey()!);
  const point = spki.slice(SPKI_P256_PREFIX_LEN);
  const publicKey = p256.Point.fromBytes(point).toBytes(true);
  const credentialId = b64urlEncode(new Uint8Array(cred.rawId));
  return {
    credentialId,
    publicKey,
    kind: 'PLATFORM',
    async sign(challenge: Uint8Array): Promise<Assertion> {
      const got = (await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: location.hostname,
          allowCredentials: [{ type: 'public-key', id: b64urlDecode(credentialId) }],
          userVerification: 'required',
          timeout: 60_000,
        },
      })) as PublicKeyCredential;
      const r = got.response as AuthenticatorAssertionResponse;
      return {
        credentialId,
        authenticatorData: new Uint8Array(r.authenticatorData),
        clientDataJSON: new Uint8Array(r.clientDataJSON),
        signature: new Uint8Array(r.signature),
        sigFormat: 'der',
      };
    },
  };
}
export const passkeyHex = (p: PasskeySigner) => bytesToHex(p.publicKey);
