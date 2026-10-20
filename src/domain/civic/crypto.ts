/**
 * CAPA DE DOMINIO CRIPTOGRÁFICO — PRIMITIVAS (funciones puras, sin DOM ni estado de UI).
 *
 * - SHA-256 real (@noble/hashes), NO el hash FNV/Murmur del juego legacy.
 * - Árbol de Merkle SHA-256 con separación de dominio hoja/nodo (0x00 / 0x01)
 *   y promoción (no duplicación) del nodo impar → sin la colisión CVE-2012-2459.
 * - Firma ciega RSA-FDH (Chaum, 1983) sobre BigInt, clave RSA-2048 generada con WebCrypto.
 *   NOTA: NO es RFC 9474 (RSABSSA-PSS). Es el esquema clásico FDH; la migración está
 *   documentada en SPEC.md §B.1.
 * - TimestampAuthoritySim: token con forma RFC 3161 firmado con ECDSA P-256.
 *   ES UNA SIMULACIÓN: en producción se sustituye por una TSA cualificada eIDAS vía la
 *   interfaz `TimestampAuthority` (petición TimeStampReq DER).
 */
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes, concatBytes, randomBytes } from '@noble/hashes/utils.js';
import { p256 } from '@noble/curves/nist.js';

export { bytesToHex, hexToBytes, utf8ToBytes, concatBytes, randomBytes, sha256, p256 };

export const sha256Hex = (...parts: Array<Uint8Array | string>): string =>
  bytesToHex(sha256(concatBytes(...parts.map((p) => (typeof p === 'string' ? utf8ToBytes(p) : p)))));

export function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function b64urlDecode(str: string): Uint8Array {
  const pad = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const bin = atob(pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export function u64be(n: number): Uint8Array {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setBigUint64(0, BigInt(n));
  return out;
}
export function ctEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

/* ───────────────────────── MERKLE (SHA-256) ───────────────────────── */

export interface MerkleStep { hash: string; position: 'left' | 'right' }
export interface MerkleProof { leaf: string; index: number; steps: MerkleStep[]; root: string }

const EMPTY_ROOT = sha256Hex('DV-MERKLE-EMPTY-v1');
const nodeHash = (l: string, r: string) => sha256Hex(new Uint8Array([1]), hexToBytes(l), hexToBytes(r));

/** Hoja = valor ya hasheado por el dominio de aplicación; se re-hashea con prefijo 0x00. */
export const merkleLeaf = (leafValueHex: string) => sha256Hex(new Uint8Array([0]), hexToBytes(leafValueHex));

/** Devuelve todos los niveles (nivel 0 = hojas hasheadas). Las hojas se ordenan canónicamente. */
export function buildMerkleLevels(leafValues: string[]): string[][] {
  const sorted = [...leafValues].sort();
  if (sorted.length === 0) return [[EMPTY_ROOT]];
  let level = sorted.map(merkleLeaf);
  const levels = [level];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(i + 1 < level.length ? nodeHash(level[i], level[i + 1]) : level[i]);
    }
    levels.push(next);
    level = next;
  }
  return levels;
}
export const merkleRoot = (leafValues: string[]) => {
  const lv = buildMerkleLevels(leafValues);
  return lv[lv.length - 1][0];
};
export function merkleProof(leafValues: string[], leafValue: string): MerkleProof | null {
  const sorted = [...leafValues].sort();
  const index = sorted.indexOf(leafValue);
  if (index < 0) return null;
  const levels = buildMerkleLevels(sorted);
  const steps: MerkleStep[] = [];
  let idx = index;
  for (let l = 0; l < levels.length - 1; l++) {
    const sib = idx ^ 1;
    if (sib < levels[l].length) steps.push({ hash: levels[l][sib], position: sib < idx ? 'left' : 'right' });
    idx = idx >> 1;
  }
  return { leaf: leafValue, index, steps, root: levels[levels.length - 1][0] };
}
/** Verificación independiente: solo necesita (hoja, prueba, raíz publicada). */
export function verifyMerkleProof(proof: MerkleProof, expectedRoot: string): boolean {
  let h = merkleLeaf(proof.leaf);
  for (const s of proof.steps) h = s.position === 'left' ? nodeHash(s.hash, h) : nodeHash(h, s.hash);
  return h === expectedRoot && proof.root === expectedRoot;
}

/* ───────────────────────── FIRMA CIEGA RSA-FDH ───────────────────────── */

export interface BlindPublicKey { n: bigint; e: bigint }
export interface BlindKeyPair extends BlindPublicKey { p: bigint; q: bigint; dp: bigint; dq: bigint; qi: bigint }

const big = (b64: string) => BigInt('0x' + bytesToHex(b64urlDecode(b64)));
export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base %= mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    base = (base * base) % mod;
    exp >>= 1n;
  }
  return result;
}
export function modInv(a: bigint, m: bigint): bigint {
  let [old_r, r] = [((a % m) + m) % m, m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  if (old_r !== 1n) throw new Error('NO_INVERSE');
  return ((old_s % m) + m) % m;
}
const bytesToBig = (b: Uint8Array) => BigInt('0x' + (bytesToHex(b) || '0'));

export async function generateBlindKey(): Promise<BlindKeyPair> {
  const subtle = globalThis.crypto.subtle;
  const kp = await subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify']
  );
  const jwk = (await subtle.exportKey('jwk', kp.privateKey)) as Record<string, string>;
  return { n: big(jwk.n), e: big(jwk.e), p: big(jwk.p), q: big(jwk.q), dp: big(jwk.dp), dq: big(jwk.dq), qi: big(jwk.qi) };
}
export const blindPublic = (k: BlindPublicKey) => ({ n: k.n.toString(16), e: k.e.toString(16) });

/** Full-Domain-Hash: 255 bytes derivados con SHA-256 en modo contador (< n de 2048 bits). */
export function fdh(consultationId: string, serialHex: string): bigint {
  const parts: Uint8Array[] = [];
  for (let c = 0; c < 8; c++) parts.push(sha256(utf8ToBytes(`DV-BLIND-FDH-v1|${consultationId}|${serialHex}|${c}`)));
  return bytesToBig(concatBytes(...parts).slice(0, 255));
}
export interface BlindingState { blinded: string; r: bigint; m: bigint }
export function blindMessage(pub: BlindPublicKey, consultationId: string, serialHex: string): BlindingState {
  const m = fdh(consultationId, serialHex);
  let r: bigint;
  do { r = bytesToBig(randomBytes(255)) % pub.n; } while (r < 2n);
  const blinded = (m * modPow(r, pub.e, pub.n)) % pub.n;
  return { blinded: blinded.toString(16), r, m };
}
/** Lado Censo: firma el valor cegado sin conocer serial ni mensaje (CRT). */
export function blindSign(key: BlindKeyPair, blindedHex: string): string {
  const c = BigInt('0x' + blindedHex);
  if (c <= 0n || c >= key.n) throw new Error('BLINDED_OUT_OF_RANGE');
  const m1 = modPow(c % key.p, key.dp, key.p);
  const m2 = modPow(c % key.q, key.dq, key.q);
  const h = (key.qi * (((m1 - m2) % key.p) + key.p)) % key.p;
  return (m2 + h * key.q).toString(16);
}
export function unblindSignature(pub: BlindPublicKey, blindSigHex: string, r: bigint): string {
  return ((BigInt('0x' + blindSigHex) * modInv(r, pub.n)) % pub.n).toString(16);
}
export function verifyBlindSignature(pub: BlindPublicKey, consultationId: string, serialHex: string, sigHex: string): boolean {
  try {
    const s = BigInt('0x' + sigHex);
    if (s <= 0n || s >= pub.n) return false;
    return modPow(s, pub.e, pub.n) === fdh(consultationId, serialHex);
  } catch { return false; }
}

/* ───────────────────────── RFC 3161 (SIMULADO) ───────────────────────── */

export interface TimestampToken {
  format: 'RFC3161-SHAPED-SIMULATION';
  policyOid: string;
  messageImprint: { alg: 'sha256'; digest: string };
  genTime: string;
  serialNumber: string;
  tsaPublicKey: string;
  signature: string;
  simulated: true;
}
export interface TimestampAuthority {
  stamp(digestHex: string, nowMs: number): TimestampToken;
  verify(token: TimestampToken, digestHex: string): boolean;
}
const tstBytes = (t: Omit<TimestampToken, 'signature'>) =>
  utf8ToBytes(`DV-TST-v1|${t.policyOid}|${t.messageImprint.alg}|${t.messageImprint.digest}|${t.genTime}|${t.serialNumber}`);

export class TimestampAuthoritySim implements TimestampAuthority {
  private sk: Uint8Array;
  readonly publicKey: string;
  private counter = 0;
  constructor() {
    const k = p256.keygen();
    this.sk = k.secretKey;
    this.publicKey = bytesToHex(k.publicKey);
  }
  stamp(digestHex: string, nowMs: number): TimestampToken {
    const base = {
      format: 'RFC3161-SHAPED-SIMULATION' as const,
      policyOid: '1.3.6.1.4.1.99999.1.sandbox',
      messageImprint: { alg: 'sha256' as const, digest: digestHex },
      genTime: new Date(nowMs).toISOString(),
      serialNumber: String(++this.counter),
      tsaPublicKey: this.publicKey,
      simulated: true as const,
    };
    return { ...base, signature: bytesToHex(p256.sign(tstBytes(base), this.sk)) };
  }
  verify(token: TimestampToken, digestHex: string): boolean {
    if (token.messageImprint.digest !== digestHex || token.tsaPublicKey !== this.publicKey) return false;
    const { signature, ...rest } = token;
    try { return p256.verify(hexToBytes(signature), tstBytes(rest), hexToBytes(token.tsaPublicKey)); } catch { return false; }
  }
}
