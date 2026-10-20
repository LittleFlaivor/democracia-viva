/**
 * CAPA DE DOMINIO — DNIe (ICAO 9303 TD1) : generador MOCK + verificador en RAM.
 *
 * El verificador `verifyDnieInRam` es el MISMO código para DNIs simulados y reales:
 * lo único que cambia es el ancla de confianza (`TEST_CSCA` vs masterlist CSCA de la Policía).
 * El PACE/CAN y la lectura ISO-DEP ocurren en el puente nativo; aquí se verifica el resultado.
 *
 * Simplificaciones declaradas (ver SPEC.md §A.1): SOD en JSON (no CMS/ASN.1), claves ECDSA P-256
 * (el DNIe real usa RSA/ECDSA con cadenas CSCA→DS), DG2 reducido a un hash de bytes de foto.
 */
import { p256, sha256, sha256Hex, bytesToHex, hexToBytes, utf8ToBytes, concatBytes, randomBytes, u64be, ctEqual } from './crypto.ts';

/* ── Autoridad de pruebas ── */
const TEST_CSCA_SK = sha256(utf8ToBytes('DEMOCRACIA-VIVA::TEST_CSCA::NOT-A-REAL-AUTHORITY'));
export const TEST_CSCA_PUBLIC: string = bytesToHex(p256.getPublicKey(TEST_CSCA_SK));

/* ── MRZ TD1 (3×30) con dígitos de control 7-3-1 ── */
const W = [7, 3, 1];
export function mrzCheckDigit(s: string): number {
  let t = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const v = c === '<' ? 0 : c >= '0' && c <= '9' ? Number(c) : c.charCodeAt(0) - 55;
    t += v * W[i % 3];
  }
  return t % 10;
}
const pad = (s: string, n: number) => (s + '<'.repeat(n)).slice(0, n);
export const yymmdd = (d: Date) =>
  String(d.getUTCFullYear() % 100).padStart(2, '0') + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0');

export interface DnieIdentity { dniNumber: string; supportNumber: string; birth: Date; expiry: Date; surname: string; given: string }

export function buildMrz(id: DnieIdentity): Uint8Array {
  const doc = pad(id.supportNumber, 9);
  const l1 = pad(`I<ESP${doc}${mrzCheckDigit(doc)}${id.dniNumber}`, 30);
  const b = yymmdd(id.birth), x = yymmdd(id.expiry);
  const body2 = `${b}${mrzCheckDigit(b)}M${x}${mrzCheckDigit(x)}ESP${'<'.repeat(11)}`;
  const composite = mrzCheckDigit(l1.slice(5, 30) + body2.slice(0, 7) + body2.slice(8, 15) + body2.slice(18, 29));
  const l2 = body2 + composite;
  const l3 = pad(`${id.surname}<<${id.given}`.toUpperCase(), 30);
  return utf8ToBytes(l1 + l2 + l3);
}

export interface ParsedMrz { dniNumber: Uint8Array; birth: Date; expiry: Date }
function parseDate(yymmddStr: string, kind: 'birth' | 'expiry', now: number): Date | null {
  if (!/^\d{6}$/.test(yymmddStr)) return null;
  const yy = Number(yymmddStr.slice(0, 2)), mm = Number(yymmddStr.slice(2, 4)), dd = Number(yymmddStr.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  let year = 2000 + yy;
  if (kind === 'birth' && Date.UTC(year, mm - 1, dd) > now) year -= 100;
  return new Date(Date.UTC(year, mm - 1, dd));
}
/** Devuelve null si el MRZ es estructuralmente inválido (check digits incluidos). */
export function parseMrz(bytes: Uint8Array, now: number): ParsedMrz | null {
  if (bytes.length !== 90) return null;
  const s = new TextDecoder().decode(bytes);
  const l1 = s.slice(0, 30), l2 = s.slice(30, 60);
  if (!l1.startsWith('I<ESP')) return null;
  if (mrzCheckDigit(l1.slice(5, 14)) !== Number(l1[14])) return null;
  if (mrzCheckDigit(l2.slice(0, 6)) !== Number(l2[6])) return null;
  if (mrzCheckDigit(l2.slice(8, 14)) !== Number(l2[14])) return null;
  const composite = mrzCheckDigit(l1.slice(5, 30) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29));
  if (composite !== Number(l2[29])) return null;
  const birth = parseDate(l2.slice(0, 6), 'birth', now), expiry = parseDate(l2.slice(8, 14), 'expiry', now);
  if (!birth || !expiry) return null;
  const dni = l1.slice(15, 30).replace(/</g, '');
  if (!/^\d{8}[A-Z]$/.test(dni)) return null;
  return { dniNumber: utf8ToBytes(dni), birth, expiry };
}

/* ── Paquete NFC ── */
export interface Sod {
  dsPublicKey: string;
  dsCertSignature: string; // CSCA firma el certificado DS
  dgHashes: { dg1: string; dg2: string; dg15: string };
  signature: string;       // DS firma los hashes
}
export interface DniePacket {
  dg1: Uint8Array;
  dg2: Uint8Array;
  dg15: Uint8Array; // clave pública de Autenticación Activa del chip
  sod: Sod;
}
export interface AaResponse { signature: Uint8Array }

export const aaChallenge = (nonce: Uint8Array, webauthnPub: Uint8Array, timestampMs: number) =>
  sha256(concatBytes(nonce, webauthnPub, u64be(timestampMs)));

const dsCertBytes = (dsPub: string) => utf8ToBytes(`DV-DS-CERT-v1|${dsPub}`);
const sodBytes = (h: Sod['dgHashes']) => utf8ToBytes(`DV-SOD-v1|${h.dg1}|${h.dg2}|${h.dg15}`);

/* ── Chip simulado ── */
export interface MockChip {
  packet: DniePacket;
  identity: DnieIdentity;
  /** Responde al reto de Autenticación Activa. En el escenario REPLAY devuelve una firma antigua. */
  signChallenge(challenge: Uint8Array): AaResponse;
  readonly label: string;
}
export type DnieScenario = 'VALID_ADULT' | 'MINOR' | 'EXPIRED' | 'DEVICE_CHANGE' | 'FORGED' | 'REPLAY';

const LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
export const dniLetter = (n: number) => LETTERS[n % 23];
export function randomDniNumber(rand: () => number = Math.random): string {
  const n = 10_000_000 + Math.floor(rand() * 89_999_999);
  return `${n}${dniLetter(n)}`;
}
const addYears = (now: number, y: number, dDays = 0) => {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear() + y, d.getUTCMonth(), d.getUTCDate() + dDays));
};

export function buildChip(identity: DnieIdentity, opts: { forgeDg1?: boolean; replayStale?: boolean } = {}): MockChip {
  const aaSk = p256.keygen().secretKey;
  const dsSk = p256.keygen().secretKey;
  const dsPub = bytesToHex(p256.getPublicKey(dsSk));
  const dg1 = buildMrz(identity);
  const dg2 = randomBytes(64); // "foto" simulada
  const dg15 = p256.getPublicKey(aaSk);
  const dgHashes = { dg1: sha256Hex(dg1), dg2: sha256Hex(dg2), dg15: sha256Hex(dg15) };
  const sod: Sod = {
    dsPublicKey: dsPub,
    dsCertSignature: bytesToHex(p256.sign(dsCertBytes(dsPub), TEST_CSCA_SK)),
    dgHashes,
    signature: bytesToHex(p256.sign(sodBytes(dgHashes), dsSk)),
  };
  // FORGED: se altera DG1 DESPUÉS de firmar el SOD (p. ej. cambiar la fecha de nacimiento).
  const sentDg1 = opts.forgeDg1 ? buildMrz({ ...identity, birth: new Date(Date.UTC(1980, 0, 1)) }) : dg1;
  const stale = p256.sign(sha256(utf8ToBytes('stale-session-challenge')), aaSk);
  return {
    packet: { dg1: sentDg1, dg2, dg15, sod },
    identity,
    label: opts.forgeDg1 ? 'forged' : opts.replayStale ? 'replay' : 'chip',
    signChallenge: (challenge) => ({ signature: opts.replayStale ? stale : p256.sign(challenge, aaSk) }),
  };
}

export function mockChipForScenario(scenario: DnieScenario, now: number, rand: () => number = Math.random, reuse?: MockChip): MockChip {
  if (scenario === 'DEVICE_CHANGE' && reuse) return reuse; // mismo chip físico, otro móvil
  const base = { dniNumber: randomDniNumber(rand), supportNumber: `CAB${String(Math.floor(rand() * 1e6)).padStart(6, '0')}`, surname: 'SIMULADA', given: 'PRUEBA' };
  const adultBirth = addYears(now, -(25 + Math.floor(rand() * 40)), -Math.floor(rand() * 300));
  switch (scenario) {
    case 'MINOR': return buildChip({ ...base, birth: addYears(now, -16, -40), expiry: addYears(now, 3) });
    case 'EXPIRED': return buildChip({ ...base, birth: adultBirth, expiry: addYears(now, 0, -1) });
    case 'FORGED': return buildChip({ ...base, birth: addYears(now, -16, -40), expiry: addYears(now, 3) }, { forgeDg1: true });
    case 'REPLAY': return buildChip({ ...base, birth: adultBirth, expiry: addYears(now, 5) }, { replayStale: true });
    default: return buildChip({ ...base, birth: adultBirth, expiry: addYears(now, 5) });
  }
}

/* ── Verificación en RAM ── */
export type DnieRejection =
  | 'BAD_CSCA_CHAIN' | 'BAD_SOD_SIGNATURE' | 'SOD_HASH_MISMATCH' | 'MRZ_INVALID'
  | 'UNDER_18' | 'DOCUMENT_EXPIRED' | 'ACTIVE_AUTH_FAILED' | 'FACE_MISMATCH';
export interface VerifyStep { step: string; ok: boolean }
export interface VerifyContext {
  nonce: Uint8Array; webauthnPublicKey: Uint8Array; timestampMs: number; now: number;
  cscaPublicKeys: string[]; faceMatchedLocally: boolean;
}
export type VerifyResult =
  | { ok: true; dniNumber: Uint8Array; steps: VerifyStep[] }
  | { ok: false; code: DnieRejection; steps: VerifyStep[] };

export function verifyDnieInRam(packet: DniePacket, aa: AaResponse, ctx: VerifyContext): VerifyResult {
  const steps: VerifyStep[] = [];
  const fail = (step: string, code: DnieRejection): VerifyResult => { steps.push({ step, ok: false }); return { ok: false, code, steps }; };
  const pass = (step: string) => steps.push({ step, ok: true });
  const safeVerify = (sig: Uint8Array, msg: Uint8Array, pub: Uint8Array) => { try { return p256.verify(sig, msg, pub); } catch { return false; } };

  // 1) Cadena CSCA → DS
  const dsPub = hexToBytes(packet.sod.dsPublicKey);
  const chainOk = ctx.cscaPublicKeys.some((c) => safeVerify(hexToBytes(packet.sod.dsCertSignature), dsCertBytes(packet.sod.dsPublicKey), hexToBytes(c)));
  if (!chainOk) return fail('CSCA→DS', 'BAD_CSCA_CHAIN');
  pass('CSCA→DS');
  // 2) Firma del EF.SOD
  if (!safeVerify(hexToBytes(packet.sod.signature), sodBytes(packet.sod.dgHashes), dsPub)) return fail('EF.SOD', 'BAD_SOD_SIGNATURE');
  pass('EF.SOD');
  // 3) Hashes de grupos de datos
  const h = packet.sod.dgHashes;
  if (sha256Hex(packet.dg1) !== h.dg1 || sha256Hex(packet.dg2) !== h.dg2 || sha256Hex(packet.dg15) !== h.dg15) return fail('DG1/DG2/DG15 hash', 'SOD_HASH_MISMATCH');
  pass('DG1/DG2/DG15 hash');
  // 4) MRZ → edad y vigencia (única información que sobrevive: booleanos + número DNI efímero)
  const mrz = parseMrz(packet.dg1, ctx.now);
  if (!mrz) return fail('MRZ', 'MRZ_INVALID');
  pass('MRZ');
  const adultAt = Date.UTC(mrz.birth.getUTCFullYear() + 18, mrz.birth.getUTCMonth(), mrz.birth.getUTCDate());
  if (ctx.now < adultAt) return fail('edad ≥ 18', 'UNDER_18');
  pass('edad ≥ 18');
  if (mrz.expiry.getTime() <= ctx.now) return fail('vigencia', 'DOCUMENT_EXPIRED');
  pass('vigencia');
  // 5) DG15 Active Authentication con channel binding
  const challenge = aaChallenge(ctx.nonce, ctx.webauthnPublicKey, ctx.timestampMs);
  if (!safeVerify(aa.signature, challenge, packet.dg15)) return fail('DG15 AA + channel binding', 'ACTIVE_AUTH_FAILED');
  pass('DG15 AA + channel binding');
  // 6) Cotejo facial DG2 (atestiguado por el dispositivo; el servidor nunca ve la imagen real)
  if (!ctx.faceMatchedLocally) return fail('DG2 cotejo local', 'FACE_MISMATCH');
  pass('DG2 cotejo local');
  return { ok: true, dniNumber: mrz.dniNumber, steps };
}

export { ctEqual };
