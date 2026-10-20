/**
 * CAPA DE DOMINIO — PROTOCOLO: Censo, Urna, Delegación DAG y Mundo Sandbox.
 *
 * Invariantes (cubiertas por tests/civic-core.test.js):
 *  I1  1 Nullifier = 1 passkey activa; el alta con otro dispositivo revoca la anterior de forma atómica.
 *  I2  1 Nullifier = como máximo 1 token ciego O 1 voto público por consulta (sin doble gasto).
 *  I3  El grafo de delegación por categoría es siempre acíclico (DFS antes de aceptar la arista).
 *  I4  Voto directo > delegación (hot-override) y el peso delegado jamás supera el censo.
 *  I5  La urna nunca almacena identidad, IP ni marcas de tiempo por papeleta.
 *  I6  Todo registro lleva `env: 'SANDBOX'`.
 */
import { argon2id } from '@noble/hashes/argon2.js';
import {
  sha256Hex, bytesToHex, hexToBytes, utf8ToBytes, randomBytes, u64be,
  merkleRoot, merkleProof, verifyMerkleProof, generateBlindKey, blindPublic, blindMessage, blindSign,
  unblindSignature, verifyBlindSignature, TimestampAuthoritySim,
} from './crypto.ts';
import type { BlindKeyPair, BlindPublicKey, MerkleProof, TimestampToken, TimestampAuthority } from './crypto.ts';
import { TEST_CSCA_PUBLIC, mockChipForScenario, aaChallenge, verifyDnieInRam } from './dnie.ts';
import type { DniePacket, AaResponse, MockChip, DnieScenario, VerifyStep } from './dnie.ts';
import { VirtualPasskey, verifyAssertion, actionChallenge, DEFAULT_RP } from './passkey.ts';
import type { Assertion, PasskeySigner, RpConfig } from './passkey.ts';

export type Env = 'SANDBOX';
export const ENV: Env = 'SANDBOX';
export type Choice = 'YES' | 'NO' | 'ABSTAIN';
export const CHOICES: Choice[] = ['YES', 'NO', 'ABSTAIN'];
export type ConsultationStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export type CensusState = 'AVAILABLE' | 'BLIND_TOKEN_ISSUED' | 'DELEGATED' | 'PUBLIC_VOTED';
export type Fail = { ok: false; code: string };
export type Res<T> = ({ ok: true } & T) | Fail;
const fail = (code: string): Fail => ({ ok: false, code });

export interface SecurityEvent { seq: number; at: number; env: Env; type: string; code?: string; ref?: string }
export interface Consultation { id: string; title: string; category: string; boeRef: string; status: ConsultationStatus; env: Env }

/** Parámetros Argon2id. Producción (OWASP): m=19456 KiB, t=2, p=1. Sandbox: ligero para batch de 200. */
export interface ArgonParams { m: number; t: number; p: number }
export const ARGON_PROD: ArgonParams = { m: 19456, t: 2, p: 1 };
export const ARGON_SANDBOX: ArgonParams = { m: 1024, t: 1, p: 1 };

/* ───────────────────────── DAG por categoría ───────────────────────── */
export function wouldCreateCycle(edges: Map<string, string>, from: string, to: string): boolean {
  if (from === to) return true;
  const seen = new Set<string>();
  let cur: string | undefined = to;
  while (cur !== undefined && !seen.has(cur)) {
    if (cur === from) return true;
    seen.add(cur);
    cur = edges.get(cur);
  }
  return false;
}

/* ───────────────────────── CENSO ───────────────────────── */
interface Member {
  nullifier: string; credentialId: string; publicKey: Uint8Array; counter: number;
  revokedCredentials: string[]; devicesRegistered: number; env: Env;
}
export interface CensusOptions {
  pepper?: Uint8Array; argon?: ArgonParams; rp?: RpConfig; cscaKeys?: string[]; now?: () => number;
}
export interface RegistrationRequest {
  packet: DniePacket; aa: AaResponse; timestampMs: number; nonce: string;
  passkey: { credentialId: string; publicKey: Uint8Array }; registrationAssertion: Assertion; faceMatchedLocally: boolean;
}

export class CensusAuthority {
  readonly env: Env = ENV;
  readonly rp: RpConfig;
  readonly now: () => number;
  private pepper: Uint8Array;
  private argon: ArgonParams;
  private cscaKeys: string[];
  private nonces = new Map<string, { exp: number; used: boolean }>();
  private members = new Map<string, Member>();
  private credIndex = new Map<string, string>();
  private revokedIndex = new Map<string, string>();
  private consultations = new Map<string, Consultation>();
  private blindKeys = new Map<string, BlindKeyPair>();
  private tokens = new Map<string, Set<string>>();
  private publicVotes = new Map<string, Map<string, Choice>>();
  private delegations = new Map<string, Map<string, string>>();
  private specialists = new Map<string, Set<string>>();
  private log: SecurityEvent[] = [];
  private rejections: Record<string, number> = {};
  private seq = 0;
  lastWipeMs = 0;

  constructor(opts: CensusOptions = {}) {
    this.pepper = opts.pepper ?? randomBytes(32); // en producción: secreto en KMS/HSM, nunca en la app
    this.argon = opts.argon ?? ARGON_SANDBOX;
    this.rp = opts.rp ?? DEFAULT_RP;
    this.cscaKeys = opts.cscaKeys ?? [TEST_CSCA_PUBLIC];
    this.now = opts.now ?? (() => Date.now());
  }

  private event(type: string, code?: string, ref?: string) {
    this.log.push({ seq: ++this.seq, at: this.now(), env: ENV, type, code, ref });
    if (this.log.length > 500) this.log.shift();
  }
  private reject(type: string, code: string, ref?: string): Fail {
    this.rejections[code] = (this.rejections[code] ?? 0) + 1;
    this.event(type, code, ref);
    return fail(code);
  }

  /* — Alta —  */
  issueNonce(): string {
    const n = bytesToHex(randomBytes(16));
    this.nonces.set(n, { exp: this.now() + 120_000, used: false });
    return n;
  }

  registerDnie(req: RegistrationRequest): Res<{ nullifier: string; deviceReplaced: boolean; steps: VerifyStep[]; wipeMs: number }> {
    const n = this.nonces.get(req.nonce);
    if (!n) return this.reject('REGISTRATION_REJECTED', 'NONCE_UNKNOWN');
    if (n.used) return this.reject('REGISTRATION_REJECTED', 'NONCE_REPLAY');
    n.used = true; // se quema siempre, también si la verificación falla
    const t = this.now();
    if (t > n.exp || Math.abs(t - req.timestampMs) > 120_000) return this.reject('REGISTRATION_REJECTED', 'NONCE_EXPIRED');

    // Copias efímeras: lo que "vive" en RAM del servidor y se destruye al final.
    const packet: DniePacket = { ...req.packet, dg1: req.packet.dg1.slice(), dg2: req.packet.dg2.slice(), dg15: req.packet.dg15.slice() };
    const v = verifyDnieInRam(packet, req.aa, {
      nonce: hexToBytes(req.nonce), webauthnPublicKey: req.passkey.publicKey, timestampMs: req.timestampMs,
      now: t, cscaPublicKeys: this.cscaKeys, faceMatchedLocally: req.faceMatchedLocally,
    });
    if (!v.ok) { packet.dg1.fill(0); packet.dg2.fill(0); return { ...this.reject('REGISTRATION_REJECTED', v.code), } as Fail; }

    // Posesión de la passkey declarada
    const pa = verifyAssertion(req.registrationAssertion, req.passkey.publicKey,
      { challenge: actionChallenge('REGISTER', 'census', req.nonce), ...this.rp }, 0);
    if (!pa.ok) { v.dniNumber.fill(0); packet.dg1.fill(0); packet.dg2.fill(0); return this.reject('REGISTRATION_REJECTED', 'PASSKEY_POSSESSION_' + pa.code); }

    const t0 = performance.now();
    const nullifier = bytesToHex(argon2id(v.dniNumber, utf8ToBytes('DV-NULLIFIER-v1'), { ...this.argon, dkLen: 32, key: this.pepper }));
    v.dniNumber.fill(0); packet.dg1.fill(0); packet.dg2.fill(0); packet.dg15.fill(0);
    const wipeMs = performance.now() - t0;
    this.lastWipeMs = wipeMs;

    const existing = this.members.get(nullifier);
    let deviceReplaced = false;
    if (existing) {
      // Revocación atómica (sin await entre medias): vieja fuera, nueva dentro.
      this.credIndex.delete(existing.credentialId);
      this.revokedIndex.set(existing.credentialId, nullifier);
      existing.revokedCredentials.push(existing.credentialId);
      existing.credentialId = req.passkey.credentialId;
      existing.publicKey = req.passkey.publicKey;
      existing.counter = 0;
      existing.devicesRegistered++;
      this.credIndex.set(req.passkey.credentialId, nullifier);
      deviceReplaced = true;
      this.event('DEVICE_REPLACED', 'OLD_PASSKEY_REVOKED', nullifier.slice(0, 8));
    } else {
      this.members.set(nullifier, { nullifier, credentialId: req.passkey.credentialId, publicKey: req.passkey.publicKey, counter: 0, revokedCredentials: [], devicesRegistered: 1, env: ENV });
      this.credIndex.set(req.passkey.credentialId, nullifier);
      this.event('CITIZEN_REGISTERED', undefined, nullifier.slice(0, 8));
    }
    return { ok: true, nullifier, deviceReplaced, steps: v.steps, wipeMs };
  }

  revokePasskey(nullifier: string, reason = 'ADMIN_REVOCATION'): Res<object> {
    const m = this.members.get(nullifier);
    if (!m || !this.credIndex.has(m.credentialId)) return fail('NOT_ACTIVE');
    this.credIndex.delete(m.credentialId);
    this.revokedIndex.set(m.credentialId, nullifier);
    m.revokedCredentials.push(m.credentialId);
    this.event('PASSKEY_REVOKED', reason, nullifier.slice(0, 8));
    return { ok: true };
  }

  /* — Autenticación por acción — */
  private authenticate(a: Assertion, challenge: Uint8Array, type: string): Res<{ member: Member }> {
    const id = this.credIndex.get(a.credentialId);
    if (!id) return this.reject(type, this.revokedIndex.has(a.credentialId) ? 'PASSKEY_REVOKED' : 'UNKNOWN_CREDENTIAL');
    const m = this.members.get(id)!;
    const r = verifyAssertion(a, m.publicKey, { challenge, ...this.rp }, m.counter);
    if (!r.ok) return this.reject(type, 'ASSERTION_' + r.code, id.slice(0, 8));
    m.counter = r.counter;
    return { ok: true, member: m };
  }

  /* — Consultas — */
  registerConsultation(c: Omit<Consultation, 'env'>, key: BlindKeyPair): void {
    this.consultations.set(c.id, { ...c, env: ENV });
    this.blindKeys.set(c.id, key);
    this.tokens.set(c.id, new Set());
    this.publicVotes.set(c.id, new Map());
  }
  setStatus(id: string, status: ConsultationStatus) { const c = this.consultations.get(id); if (c) c.status = status; }
  consultation(id: string) { return this.consultations.get(id); }
  consultationList(): Consultation[] { return [...this.consultations.values()].map((c) => ({ ...c })); }
  blindPublicKey(id: string): BlindPublicKey | undefined { const k = this.blindKeys.get(id); return k ? { n: k.n, e: k.e } : undefined; }

  /* — Estado de censo (solo lectura, sin dato de voto) — */
  stateOf(cid: string, nullifier: string): CensusState {
    if (this.tokens.get(cid)?.has(nullifier)) return 'BLIND_TOKEN_ISSUED';
    if (this.publicVotes.get(cid)?.has(nullifier)) return 'PUBLIC_VOTED';
    const cat = this.consultations.get(cid)?.category;
    if (cat && this.delegations.get(cat)?.has(nullifier)) return 'DELEGATED';
    return 'AVAILABLE';
  }

  /* — Token ciego — */
  requestBlindToken(cid: string, blindedHex: string, a: Assertion): Res<{ blindSignature: string; stateBefore: CensusState }> {
    const c = this.consultations.get(cid);
    if (!c) return fail('UNKNOWN_CONSULTATION');
    if (c.status !== 'ACTIVE') return this.reject('TOKEN_REJECTED', 'CONSULTATION_NOT_ACTIVE');
    const auth = this.authenticate(a, actionChallenge('BLIND_TOKEN', cid, blindedHex), 'TOKEN_REJECTED');
    if (!auth.ok) return auth;
    const nf = auth.member.nullifier;
    const stateBefore = this.stateOf(cid, nf);
    if (stateBefore === 'BLIND_TOKEN_ISSUED') return this.reject('TOKEN_REJECTED', 'DOUBLE_SPEND_TOKEN_ALREADY_ISSUED', nf.slice(0, 8));
    if (stateBefore === 'PUBLIC_VOTED') return this.reject('TOKEN_REJECTED', 'DOUBLE_SPEND_ALREADY_PUBLIC_VOTED', nf.slice(0, 8));
    let sig: string;
    try { sig = blindSign(this.blindKeys.get(cid)!, blindedHex); } catch { return this.reject('TOKEN_REJECTED', 'BAD_BLINDED_VALUE'); }
    this.tokens.get(cid)!.add(nf); // hot-override: si estaba DELEGATED, a partir de aquí el voto directo manda
    this.event(stateBefore === 'DELEGATED' ? 'DELEGATION_OVERRIDDEN_BY_DIRECT_VOTE' : 'BLIND_TOKEN_ISSUED', undefined, nf.slice(0, 8));
    return { ok: true, blindSignature: sig, stateBefore };
  }

  /* — Delegación líquida — */
  setSpecialist(category: string, nullifier: string, on: boolean): Res<object> {
    if (!this.members.has(nullifier)) return fail('UNKNOWN_MEMBER');
    if (!this.specialists.has(category)) this.specialists.set(category, new Set());
    on ? this.specialists.get(category)!.add(nullifier) : this.specialists.get(category)!.delete(nullifier);
    return { ok: true };
  }
  isSpecialist(category: string, nullifier: string) { return !!this.specialists.get(category)?.has(nullifier); }

  delegate(category: string, toNullifier: string | null, a: Assertion): Res<object> {
    const auth = this.authenticate(a, actionChallenge('DELEGATE', category, toNullifier ?? 'REVOKE'), 'DELEGATION_REJECTED');
    if (!auth.ok) return auth;
    const from = auth.member.nullifier;
    if (!this.delegations.has(category)) this.delegations.set(category, new Map());
    const edges = this.delegations.get(category)!;
    if (toNullifier === null) { edges.delete(from); this.event('DELEGATION_REVOKED', undefined, from.slice(0, 8)); return { ok: true }; }
    if (!this.members.has(toNullifier)) return this.reject('DELEGATION_REJECTED', 'UNKNOWN_DELEGATE', from.slice(0, 8));
    if (wouldCreateCycle(edges, from, toNullifier)) return this.reject('DELEGATION_REJECTED', 'CYCLE_DETECTED', from.slice(0, 8));
    edges.set(from, toNullifier);
    this.event('DELEGATION_SET', category, from.slice(0, 8));
    return { ok: true };
  }

  /** Voto público de especialista (peso = 1 + delegadores efectivos). Solo especialistas verificados. */
  publicVote(cid: string, choice: Choice, a: Assertion): Res<object> {
    const c = this.consultations.get(cid);
    if (!c) return fail('UNKNOWN_CONSULTATION');
    if (c.status !== 'ACTIVE') return this.reject('PUBLIC_VOTE_REJECTED', 'CONSULTATION_NOT_ACTIVE');
    const auth = this.authenticate(a, actionChallenge('PUBLIC_VOTE', cid, choice), 'PUBLIC_VOTE_REJECTED');
    if (!auth.ok) return auth;
    const nf = auth.member.nullifier;
    if (!this.isSpecialist(c.category, nf)) return this.reject('PUBLIC_VOTE_REJECTED', 'NOT_A_VERIFIED_SPECIALIST', nf.slice(0, 8));
    const st = this.stateOf(cid, nf);
    if (st === 'BLIND_TOKEN_ISSUED') return this.reject('PUBLIC_VOTE_REJECTED', 'DOUBLE_SPEND_TOKEN_ALREADY_ISSUED', nf.slice(0, 8));
    if (st === 'PUBLIC_VOTED') return this.reject('PUBLIC_VOTE_REJECTED', 'DOUBLE_SPEND_ALREADY_PUBLIC_VOTED', nf.slice(0, 8));
    this.publicVotes.get(cid)!.set(nf, choice);
    this.event('PUBLIC_VOTE_CAST', undefined, nf.slice(0, 8));
    return { ok: true };
  }

  /**
   * Resuelve pesos de delegación para una consulta. Cada nodo que NO ha votado y tiene arista sigue la cadena
   * hasta el primer nodo que votó: público → suma peso; token (voto secreto) → peso perdido; ninguno → pendiente.
   */
  resolveWeights(cid: string) {
    const cat = this.consultations.get(cid)?.category ?? '';
    const edges = this.delegations.get(cat) ?? new Map<string, string>();
    const pv = this.publicVotes.get(cid) ?? new Map<string, Choice>();
    const tk = this.tokens.get(cid) ?? new Set<string>();
    const delegated = new Map<string, number>();
    let lost = 0, pending = 0;
    for (const start of edges.keys()) {
      if (!this.members.has(start) || pv.has(start) || tk.has(start)) continue; // voto directo manda
      let cur: string | undefined = edges.get(start);
      const seen = new Set<string>([start]);
      while (cur !== undefined && !seen.has(cur)) {
        if (pv.has(cur)) { delegated.set(cur, (delegated.get(cur) ?? 0) + 1); break; }
        if (tk.has(cur)) { lost++; break; }
        seen.add(cur);
        const next = edges.get(cur);
        if (next === undefined) { pending++; break; }
        cur = next;
      }
    }
    const publicBy: Record<Choice, number> = { YES: 0, NO: 0, ABSTAIN: 0 };
    const specialists: { id: string; choice: Choice; weight: number }[] = [];
    for (const [id, choice] of pv) { const w = 1 + (delegated.get(id) ?? 0); publicBy[choice] += w; specialists.push({ id, choice, weight: w }); }
    return { publicBy, specialists, lost, pending };
  }

  /* — Lecturas agregadas (usadas por AdminReadModel) — */
  memberCount() { return this.members.size; }
  activePasskeys() { return this.credIndex.size; }
  revokedPasskeys() { return this.revokedIndex.size; }
  tokenCount(cid: string) { return this.tokens.get(cid)?.size ?? 0; }
  rejectionCounts() { return { ...this.rejections }; }
  securityLog() { return this.log.map((e) => ({ ...e })); }
  delegationEdges(category: string): Array<{ from: string; to: string }> {
    return [...(this.delegations.get(category) ?? new Map()).entries()].map(([from, to]) => ({ from: from.slice(0, 8), to: to.slice(0, 8) }));
  }
  specialistIds(category: string) { return [...(this.specialists.get(category) ?? [])]; }
  memberIds() { return [...this.members.keys()]; }
}

/* ───────────────────────── URNA ───────────────────────── */
export interface AnonymousToken { serial: string; signature: string }
export interface Ballot extends AnonymousToken { salt: string; choice: Choice }
export interface Receipt { receiptHash: string; leaf: string; consultationId: string; env: Env }

export const leafOf = (cid: string, salt: string, choice: Choice) =>
  sha256Hex(`DV-LEAF-v1|${cid}|`, hexToBytes(sha256Hex(hexToBytes(salt), utf8ToBytes(choice))));
export const receiptOf = (cid: string, leaf: string) => sha256Hex(`DV-RECEIPT-v1|${cid}|${leaf}`);

export interface Finalization { merkleRoot: string; leafCount: number; timestamp: TimestampToken }

export class BallotBox {
  readonly env: Env = ENV;
  readonly consultationId: string;
  private pub: BlindPublicKey;
  private spent = new Set<string>();
  private leaves = new Set<string>(); // I5: solo hashes; sin identidad, IP ni timestamp por papeleta
  private counts: Record<Choice, number> = { YES: 0, NO: 0, ABSTAIN: 0 };
  private open = false;
  private final: Finalization | null = null;
  constructor(cid: string, pub: BlindPublicKey) { this.consultationId = cid; this.pub = pub; }
  setOpen(o: boolean) { this.open = o; }

  submit(b: Ballot): Res<{ receipt: Receipt }> {
    if (!this.open) return fail('BOX_CLOSED');
    if (!CHOICES.includes(b.choice)) return fail('BAD_CHOICE');
    if (!verifyBlindSignature(this.pub, this.consultationId, b.serial, b.signature)) return fail('BAD_BLIND_SIGNATURE');
    if (this.spent.has(b.serial)) return fail('SERIAL_ALREADY_SPENT');
    const leaf = leafOf(this.consultationId, b.salt, b.choice);
    this.spent.add(b.serial);
    this.leaves.add(leaf);
    this.counts[b.choice]++;
    return { ok: true, receipt: { receiptHash: receiptOf(this.consultationId, leaf), leaf, consultationId: this.consultationId, env: ENV } };
  }
  leafCount() { return this.leaves.size; }
  tally() { return { ...this.counts }; }
  root() { return merkleRoot([...this.leaves]); }
  leafList() { return [...this.leaves].sort(); }
  proofFor(leaf: string): MerkleProof | null { return merkleProof([...this.leaves], leaf); }
  hasReceipt(receiptHash: string): { leaf: string } | null {
    for (const l of this.leaves) if (receiptOf(this.consultationId, l) === receiptHash) return { leaf: l };
    return null;
  }
  finalize(tsa: TimestampAuthority, nowMs: number): Finalization {
    if (this.final) return this.final;
    this.open = false;
    const root = this.root();
    this.final = { merkleRoot: root, leafCount: this.leaves.size, timestamp: tsa.stamp(root, nowMs) };
    return this.final;
  }
  finalization() { return this.final; }
}

/* ───────────────────────── MUNDO SANDBOX ───────────────────────── */
export interface VirtualCitizen {
  label: string; chip: MockChip; passkey: PasskeySigner; nullifier: string; scenario: DnieScenario; env: Env;
}
export interface BlindTrace {
  serial: string; blinded: string; blindSignature: string; unblinded: string; verified: boolean;
  leaf: string; receiptHash: string; jitterMs: number; stateBefore: CensusState; r: string;
}
export interface EnrollOutcome { ok: boolean; code?: string; steps: VerifyStep[]; citizen?: VirtualCitizen; deviceReplaced?: boolean; wipeMs?: number }

export interface WorldOptions { rp?: RpConfig; argon?: ArgonParams; now?: () => number; seed?: number; jitterMs?: [number, number] }

export function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class SandboxWorld {
  readonly env: Env = ENV;
  census!: CensusAuthority;
  boxes = new Map<string, BallotBox>();
  tsa: TimestampAuthority = new TimestampAuthoritySim();
  citizens: VirtualCitizen[] = [];
  private opts: WorldOptions;
  private rand: () => number;
  private blindKeyCache: BlindKeyPair[] = [];
  resetCount = 0;

  private constructor(opts: WorldOptions) { this.opts = opts; this.rand = mulberry32(opts.seed ?? 20261020); }
  get now() { return this.opts.now ?? (() => Date.now()); }

  static async create(opts: WorldOptions = {}): Promise<SandboxWorld> {
    const w = new SandboxWorld(opts);
    await w.init();
    return w;
  }
  private async init() {
    this.census = new CensusAuthority({ rp: this.opts.rp, argon: this.opts.argon, now: this.opts.now });
    this.boxes = new Map();
    this.citizens = [];
    this.tsa = new TimestampAuthoritySim();
  }
  /** "Reset Sandbox State": vacía censo, urnas, citizens y registros. Las claves RSA se reutilizan (solo coste de cómputo). */
  async reset() { this.resetCount++; await this.init(); }

  private async takeKey(): Promise<BlindKeyPair> { return this.blindKeyCache.pop() ?? (await generateBlindKey()); }

  async createConsultation(c: { id: string; title: string; category: string; boeRef: string }): Promise<Consultation> {
    const key = await this.takeKey();
    this.census.registerConsultation({ ...c, status: 'DRAFT' }, key);
    this.boxes.set(c.id, new BallotBox(c.id, { n: key.n, e: key.e }));
    return this.census.consultation(c.id)!;
  }
  setStatus(id: string, status: ConsultationStatus): Finalization | null {
    this.census.setStatus(id, status);
    const box = this.boxes.get(id)!;
    box.setOpen(status === 'ACTIVE');
    if (status === 'CLOSED') return box.finalize(this.tsa, this.census.now());
    return null;
  }

  /** Flujo completo de alta: NFC simulado → verificación RAM → nullifier → passkey. */
  async enroll(scenario: DnieScenario, opts: { reuse?: VirtualCitizen; passkey?: PasskeySigner; faceMatch?: boolean; label?: string } = {}): Promise<EnrollOutcome> {
    const now = this.census.now();
    const chip = mockChipForScenario(scenario, now, this.rand, opts.reuse?.chip);
    const passkey = opts.passkey ?? new VirtualPasskey(this.census.rp);
    const nonce = this.census.issueNonce();
    const timestampMs = now;
    const challenge = aaChallenge(hexToBytes(nonce), passkey.publicKey, timestampMs);
    const aa = chip.signChallenge(challenge);
    const registrationAssertion = await passkey.sign(actionChallenge('REGISTER', 'census', nonce));
    const r = this.census.registerDnie({
      packet: chip.packet, aa, timestampMs, nonce, passkey: { credentialId: passkey.credentialId, publicKey: passkey.publicKey },
      registrationAssertion, faceMatchedLocally: opts.faceMatch ?? true,
    });
    if (!r.ok) return { ok: false, code: r.code, steps: [] };
    const citizen: VirtualCitizen = { label: opts.label ?? `ciudadano-${this.citizens.length + 1}`, chip, passkey, nullifier: r.nullifier, scenario, env: ENV };
    this.citizens.push(citizen);
    return { ok: true, citizen, steps: r.steps, deviceReplaced: r.deviceReplaced, wipeMs: r.wipeMs };
  }

  /** Voto secreto completo con cegado, firma, desenmascarado y depósito. Devuelve traza paso a paso. */
  async castSecretVote(c: VirtualCitizen, cid: string, choice: Choice, opts: { jitter?: boolean } = {}): Promise<Res<{ receipt: Receipt; trace: BlindTrace }>> {
    const pub = this.census.blindPublicKey(cid);
    if (!pub) return fail('UNKNOWN_CONSULTATION');
    const serial = bytesToHex(randomBytes(32));
    const bl = blindMessage(pub, cid, serial);
    const assertion = await c.passkey.sign(actionChallenge('BLIND_TOKEN', cid, bl.blinded));
    const tk = this.census.requestBlindToken(cid, bl.blinded, assertion);
    if (!tk.ok) return tk;
    const sig = unblindSignature(pub, tk.blindSignature, bl.r);
    // Jitter aleatorio anti-correlación temporal entre emisión del token y depósito
    const [lo, hi] = this.opts.jitterMs ?? [0, 0];
    const jitterMs = opts.jitter === false ? 0 : Math.round(lo + this.rand() * (hi - lo));
    if (jitterMs > 0) await sleep(jitterMs);
    const salt = bytesToHex(randomBytes(16));
    const res = this.boxes.get(cid)!.submit({ serial, signature: sig, salt, choice });
    if (!res.ok) return res;
    return {
      ok: true, receipt: res.receipt,
      trace: { serial, blinded: bl.blinded, blindSignature: tk.blindSignature, unblinded: sig, verified: verifyBlindSignature(pub, cid, serial, sig), leaf: res.receipt.leaf, receiptHash: res.receipt.receiptHash, jitterMs, stateBefore: tk.stateBefore, r: bl.r.toString(16) },
    };
  }
  async castPublicVote(c: VirtualCitizen, cid: string, choice: Choice) {
    return this.census.publicVote(cid, choice, await c.passkey.sign(actionChallenge('PUBLIC_VOTE', cid, choice)));
  }
  async delegate(c: VirtualCitizen, category: string, to: VirtualCitizen | null) {
    return this.census.delegate(category, to ? to.nullifier : null, await c.passkey.sign(actionChallenge('DELEGATE', category, to ? to.nullifier : 'REVOKE')));
  }

  tally(cid: string) {
    const box = this.boxes.get(cid)!;
    const secret = box.tally();
    const w = this.census.resolveWeights(cid);
    const total: Record<Choice, number> = { YES: secret.YES + w.publicBy.YES, NO: secret.NO + w.publicBy.NO, ABSTAIN: secret.ABSTAIN + w.publicBy.ABSTAIN };
    const publicWeight = w.publicBy.YES + w.publicBy.NO + w.publicBy.ABSTAIN;
    return { secret, publicBy: w.publicBy, total, secretBallots: box.leafCount(), publicWeight, lost: w.lost, pending: w.pending, census: this.census.memberCount(), specialists: w.specialists };
  }

  /** Simulador de tráfico: N ciudadanos virtuales con votos directos, delegaciones en cadena y overrides. */
  async batchSimulate(cid: string, n: number, hooks: { onProgress?: (p: { done: number; total: number; phase: string; lastReceipt?: Receipt }) => void; yieldEvery?: number } = {}) {
    const category = this.census.consultation(cid)!.category;
    const yieldEvery = hooks.yieldEvery ?? 4;
    const stats = { enrolled: 0, secretVotes: 0, delegations: 0, overrides: 0, publicVotes: 0, abstained: 0, attacksBlocked: 0 };
    const pool: VirtualCitizen[] = [];
    const total = n * 2;
    let step = 0;
    const tick = async (phase: string, lastReceipt?: Receipt) => {
      step++;
      hooks.onProgress?.({ done: Math.min(step, total), total, phase, lastReceipt });
      if (step % yieldEvery === 0) await sleep(0);
    };
    for (let i = 0; i < n; i++) {
      const o = await this.enroll('VALID_ADULT', { label: `sim-${this.citizens.length + 1}` });
      if (o.ok && o.citizen) { pool.push(o.citizen); stats.enrolled++; }
      await tick('Alta DNIe');
    }
    const nSpec = Math.max(3, Math.round(n * 0.04));
    const specs = pool.slice(0, nSpec);
    specs.forEach((s) => this.census.setSpecialist(category, s.nullifier, true));
    const weights: Choice[] = ['YES', 'YES', 'YES', 'NO', 'NO', 'ABSTAIN'];
    const pick = () => weights[Math.floor(this.rand() * weights.length)];
    const delegators: VirtualCitizen[] = [];
    const regular = pool.slice(nSpec);
    for (let i = 0; i < regular.length; i++) {
      const c = regular[i];
      const roll = this.rand();
      if (roll < 0.3) {
        // delegación directa a especialista o encadenada a un ciudadano previo ya delegado
        const target = delegators.length && this.rand() < 0.3 ? delegators[Math.floor(this.rand() * delegators.length)] : specs[Math.floor(this.rand() * specs.length)];
        const r = await this.delegate(c, category, target);
        if (r.ok) { delegators.push(c); stats.delegations++; }
      } else if (roll < 0.9) {
        const r = await this.castSecretVote(c, cid, pick(), { jitter: false });
        if (r.ok) { stats.secretVotes++; await tick('Voto secreto', r.receipt); continue; }
      } else stats.abstained++;
      await tick('Delegación / abstención');
    }
    // 12% de delegadores cambian de idea → voto directo (hot-override)
    for (const c of delegators.slice(0, Math.ceil(delegators.length * 0.12))) {
      const r = await this.castSecretVote(c, cid, pick(), { jitter: false });
      if (r.ok) { stats.overrides++; stats.secretVotes++; }
    }
    for (const s of specs) { const r = await this.castPublicVote(s, cid, pick()); if (r.ok) stats.publicVotes++; }
    // Ataques en vivo que DEBEN bloquearse
    if (delegators.length >= 2) {
      const last = delegators[delegators.length - 1];
      const first = specs[0];
      const r1 = await this.delegate(first, category, last); if (!r1.ok) stats.attacksBlocked++;
    }
    const dup = await this.castSecretVote(pool[nSpec] ?? pool[0], cid, 'YES', { jitter: false });
    if (!dup.ok) stats.attacksBlocked++;
    hooks.onProgress?.({ done: total, total, phase: 'Completado' });
    return { stats, tally: this.tally(cid) };
  }
}

/* ───────────────────────── READ-MODEL ADMIN (Zero-Trust) ─────────────────────────
 * Solo agregados congelados. Deliberadamente NO existen métodos para:
 *  - saber el voto de una persona,   - modificar un escrutinio,   - mapear recibo → identidad.        */
export class AdminReadModel {
  private world: SandboxWorld;
  constructor(world: SandboxWorld) { this.world = world; }
  snapshot() {
    const w = this.world;
    const consultations = w.census.consultationList().map((c) => {
      const box = w.boxes.get(c.id)!;
      const fin = box.finalization();
      return { ...c, ballots: box.leafCount(), tokensIssued: w.census.tokenCount(c.id), tally: w.tally(c.id), merkleRoot: box.root(), finalization: fin };
    });
    return Object.freeze({
      env: ENV,
      census: { activeNullifiers: w.census.memberCount(), activePasskeys: w.census.activePasskeys(), revokedPasskeys: w.census.revokedPasskeys(), rejections: w.census.rejectionCounts(), lastWipeMs: w.census.lastWipeMs },
      security: w.census.securityLog().slice(-40).reverse(),
      consultations,
    });
  }
  /** Verificación pública de recibo: ¿está incluido en la raíz? Sin revelar el sentido del voto. */
  checkReceipt(consultationId: string, receiptHash: string) {
    const box = this.world.boxes.get(consultationId);
    const hit = box?.hasReceipt(receiptHash);
    if (!box || !hit) return { included: false as const };
    const proof = box.proofFor(hit.leaf)!;
    return { included: verifyMerkleProof(proof, box.root()), proof, root: box.root() };
  }
  graph(category: string) {
    const c = this.world.census;
    return { env: ENV, category, specialists: c.specialistIds(category).map((i) => i.slice(0, 8)), edges: c.delegationEdges(category) };
  }
}

export { u64be };
