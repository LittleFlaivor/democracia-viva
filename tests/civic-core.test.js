/**
 * RED TEAM — NÚCLEO CRIPTOGRÁFICO CÍVICO (Árbitro 1, `CRYPTO_QA_GAPS`)
 * Cada test intenta ROMPER un invariante usando el Sandbox como lo haría un atacante.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { SandboxWorld, AdminReadModel, CHOICES, leafOf, receiptOf, wouldCreateCycle, BallotBox } from '../src/domain/civic/protocol.ts';
import { merkleRoot, merkleProof, verifyMerkleProof, generateBlindKey, blindMessage, blindSign, unblindSignature, verifyBlindSignature, sha256Hex, TimestampAuthoritySim, bytesToHex, randomBytes } from '../src/domain/civic/crypto.ts';
import { mrzCheckDigit, buildMrz, parseMrz, TEST_CSCA_PUBLIC, verifyDnieInRam, mockChipForScenario, aaChallenge } from '../src/domain/civic/dnie.ts';
import { VirtualPasskey, verifyAssertion, actionChallenge, DEFAULT_RP } from '../src/domain/civic/passkey.ts';

const CID = 'ley-vivienda';
const mk = async () => {
  const w = await SandboxWorld.create();
  await w.createConsultation({ id: CID, title: 'Ley de Vivienda', category: 'Vivienda', boeRef: 'BOE-A-2023-12203' });
  w.setStatus(CID, 'ACTIVE');
  return w;
};

test('MRZ: dígito de control ICAO 7-3-1 (vector oficial) y ida/vuelta', () => {
  assert.equal(mrzCheckDigit('520727'), 3); // ejemplo oficial ICAO 9303 (fecha)
  assert.equal(mrzCheckDigit('L898902C3'), 6); // ejemplo oficial ICAO 9303 (nº documento)
  const now = Date.UTC(2026, 9, 20);
  const chip = mockChipForScenario('VALID_ADULT', now);
  assert.ok(parseMrz(chip.packet.dg1, now));
  const tampered = chip.packet.dg1.slice(); tampered[40] ^= 1;
  assert.equal(parseMrz(tampered, now), null);
});

test('A.1 Adulto válido: pasa los 8 pasos reales y devuelve nullifier', async () => {
  const w = await mk();
  const r = await w.enroll('VALID_ADULT');
  assert.equal(r.ok, true);
  assert.equal(r.steps.length, 8);
  assert.ok(r.steps.every((s) => s.ok));
  assert.equal(w.census.memberCount(), 1);
  assert.match(r.citizen.nullifier, /^[0-9a-f]{64}$/);
});

test('A.2 Menor, caducado, firma falsa y replay: bloqueados al 100%', async () => {
  const w = await mk();
  const expect = { MINOR: 'UNDER_18', EXPIRED: 'DOCUMENT_EXPIRED', FORGED: 'SOD_HASH_MISMATCH', REPLAY: 'ACTIVE_AUTH_FAILED' };
  for (let i = 0; i < 10; i++) {
    for (const [sc, code] of Object.entries(expect)) {
      const r = await w.enroll(sc);
      assert.equal(r.ok, false, sc);
      assert.equal(r.code, code, sc);
    }
  }
  assert.equal(w.census.memberCount(), 0, 'ningún intruso en el censo');
  assert.equal(w.census.rejectionCounts().UNDER_18, 10);
});

test('A.2b Sin cotejo facial local → rechazo; nonce reutilizado → NONCE_REPLAY; CSCA desconocida → BAD_CSCA_CHAIN', async () => {
  const w = await mk();
  assert.equal((await w.enroll('VALID_ADULT', { faceMatch: false })).code, 'FACE_MISMATCH');
  const now = w.census.now();
  const chip = mockChipForScenario('VALID_ADULT', now);
  const pk = new VirtualPasskey();
  const nonce = w.census.issueNonce();
  const aa = chip.signChallenge(aaChallenge(Buffer.from(nonce, 'hex'), pk.publicKey, now));
  const reg = await pk.sign(actionChallenge('REGISTER', 'census', nonce));
  const req = { packet: chip.packet, aa, timestampMs: now, nonce, passkey: { credentialId: pk.credentialId, publicKey: pk.publicKey }, registrationAssertion: reg, faceMatchedLocally: true };
  assert.equal(w.census.registerDnie(req).ok, true);
  assert.equal(w.census.registerDnie(req).code, 'NONCE_REPLAY'); // replay exacto del mismo paquete
  const out = verifyDnieInRam(chip.packet, aa, { nonce: Buffer.from(nonce, 'hex'), webauthnPublicKey: pk.publicKey, timestampMs: now, now, cscaPublicKeys: [bytesToHex(new VirtualPasskey().publicKey)], faceMatchedLocally: true });
  assert.equal(out.code, 'BAD_CSCA_CHAIN');
});

test('A.2c Channel binding: AA firmada para OTRA passkey no sirve (MITM)', async () => {
  const w = await mk();
  const now = w.census.now();
  const chip = mockChipForScenario('VALID_ADULT', now);
  const victim = new VirtualPasskey(), attacker = new VirtualPasskey();
  const nonce = w.census.issueNonce();
  const aa = chip.signChallenge(aaChallenge(Buffer.from(nonce, 'hex'), victim.publicKey, now));
  const reg = await attacker.sign(actionChallenge('REGISTER', 'census', nonce));
  const r = w.census.registerDnie({ packet: chip.packet, aa, timestampMs: now, nonce, passkey: { credentialId: attacker.credentialId, publicKey: attacker.publicKey }, registrationAssertion: reg, faceMatchedLocally: true });
  assert.equal(r.code, 'ACTIVE_AUTH_FAILED');
});

test('A.3 Cambio de móvil: misma DNI revoca la passkey anterior y NO permite segundo voto', async () => {
  const w = await mk();
  const a = (await w.enroll('VALID_ADULT')).citizen;
  const v1 = await w.castSecretVote(a, CID, 'YES');
  assert.equal(v1.ok, true);
  const b = await w.enroll('DEVICE_CHANGE', { reuse: a });
  assert.equal(b.ok, true);
  assert.equal(b.deviceReplaced, true);
  assert.equal(b.citizen.nullifier, a.nullifier, 'mismo nullifier');
  assert.equal(w.census.memberCount(), 1);
  assert.equal(w.census.activePasskeys(), 1);
  assert.equal(w.census.revokedPasskeys(), 1);
  // el móvil viejo ya no puede operar
  const old = await w.castSecretVote(a, CID, 'NO');
  assert.equal(old.code, 'PASSKEY_REVOKED');
  // el móvil nuevo tampoco puede votar de nuevo
  const again = await w.castSecretVote(b.citizen, CID, 'NO');
  assert.equal(again.code, 'DOUBLE_SPEND_TOKEN_ALREADY_ISSUED');
  assert.equal(w.boxes.get(CID).leafCount(), 1);
  assert.ok(w.census.securityLog().some((e) => e.type === 'DEVICE_REPLACED'));
});

test('A.4 Nullifier determinista con pepper; distinto pepper → distinto nullifier; sin PII en el censo', async () => {
  const w1 = await mk(), w2 = await mk();
  const c1 = (await w1.enroll('VALID_ADULT')).citizen;
  const c2 = (await w2.enroll('DEVICE_CHANGE', { reuse: c1 })).citizen;
  assert.notEqual(c1.nullifier, c2.nullifier, 'pepper distinto (KMS) → nullifier distinto');
  const dump = JSON.stringify([w1.census.securityLog(), new AdminReadModel(w1).snapshot()]);
  assert.ok(!dump.includes(new TextDecoder().decode(c1.chip.packet.dg1).slice(15, 24)), 'el DNI no aparece en logs/admin');
  assert.ok(w1.census.lastWipeMs < 50, `wipe < 50ms (fue ${w1.census.lastWipeMs.toFixed(1)}ms)`);
});

test('B.1 Passkey: contador anti-clonado, challenge y origin verificados', async () => {
  const pk = new VirtualPasskey();
  const ch = actionChallenge('X', 'y', 'z');
  const a = await pk.sign(ch);
  const exp = { challenge: ch, ...DEFAULT_RP };
  assert.equal(verifyAssertion(a, pk.publicKey, exp, 0).ok, true);
  assert.equal(verifyAssertion(a, pk.publicKey, exp, 1).code, 'COUNTER_REPLAY');
  assert.equal(verifyAssertion(a, pk.publicKey, { ...exp, challenge: actionChallenge('X', 'y', 'w') }, 0).code, 'CHALLENGE_MISMATCH');
  assert.equal(verifyAssertion(a, pk.publicKey, { ...exp, origin: 'https://evil.es' }, 0).code, 'ORIGIN_MISMATCH');
  assert.equal(verifyAssertion(a, new VirtualPasskey().publicKey, exp, 0).code, 'BAD_SIGNATURE');
});

test('B.2 Firma ciega: correcta, no enlazable, imposible falsificar', async () => {
  const key = await generateBlindKey();
  const pub = { n: key.n, e: key.e };
  const serial = bytesToHex(randomBytes(32));
  const bl = blindMessage(pub, 'c1', serial);
  const sBlind = blindSign(key, bl.blinded);
  const sig = unblindSignature(pub, sBlind, bl.r);
  assert.equal(verifyBlindSignature(pub, 'c1', serial, sig), true);
  assert.equal(verifyBlindSignature(pub, 'c2', serial, sig), false, 'ligada a la consulta');
  assert.equal(verifyBlindSignature(pub, 'c1', bytesToHex(randomBytes(32)), sig), false, 'otro serial');
  assert.notEqual(bl.blinded, bl.m.toString(16), 'el firmante no ve el mensaje');
  const bl2 = blindMessage(pub, 'c1', serial);
  assert.notEqual(bl.blinded, bl2.blinded, 'mismo mensaje, cegados distintos (aleatorio)');
  assert.equal(verifyBlindSignature(pub, 'c1', serial, '1234'), false);
});

test('B.3 Urna: serial gastado dos veces y firma falsa → rechazados', async () => {
  const w = await mk();
  const c = (await w.enroll('VALID_ADULT')).citizen;
  const key = await generateBlindKey();
  const box = new BallotBox('x', { n: key.n, e: key.e }); box.setOpen(true);
  const serial = bytesToHex(randomBytes(32));
  const bl = blindMessage({ n: key.n, e: key.e }, 'x', serial);
  const sig = unblindSignature({ n: key.n, e: key.e }, blindSign(key, bl.blinded), bl.r);
  assert.equal(box.submit({ serial, signature: sig, salt: '00', choice: 'YES' }).ok, true);
  assert.equal(box.submit({ serial, signature: sig, salt: '01', choice: 'NO' }).code, 'SERIAL_ALREADY_SPENT');
  assert.equal(box.submit({ serial: bytesToHex(randomBytes(32)), signature: sig, salt: '02', choice: 'NO' }).code, 'BAD_BLIND_SIGNATURE');
  assert.equal(box.submit({ serial, signature: sig, salt: '03', choice: 'MAYBE' }).code, 'BAD_CHOICE');
  assert.ok(c);
});

test('B.4 Doble gasto: voto directo + delegación + voto público; hot-override; sin peso duplicado', async () => {
  const w = await mk();
  const [spec, a, b] = [(await w.enroll('VALID_ADULT')).citizen, (await w.enroll('VALID_ADULT')).citizen, (await w.enroll('VALID_ADULT')).citizen];
  w.census.setSpecialist('Vivienda', spec.nullifier, true);
  assert.equal((await w.delegate(a, 'Vivienda', spec)).ok, true);
  assert.equal((await w.delegate(b, 'Vivienda', a)).ok, true); // cadena b → a → spec
  assert.equal(w.census.stateOf(CID, a.nullifier), 'DELEGATED');
  await w.castPublicVote(spec, CID, 'YES');
  assert.equal(w.tally(CID).publicBy.YES, 3, 'spec + a + b');
  // a vota directo: hot override. Su peso y el de b (que pasa por a) ya no llegan a spec
  const direct = await w.castSecretVote(a, CID, 'NO');
  assert.equal(direct.trace.stateBefore, 'DELEGATED');
  let t = w.tally(CID);
  assert.equal(t.publicBy.YES, 1);
  assert.equal(t.secret.NO, 1);
  assert.equal(t.lost, 1, 'b: su delegado a votó en secreto → peso perdido, NUNCA doble');
  assert.ok(t.publicWeight + t.secretBallots + t.lost + t.pending <= t.census);
  // segundo voto de a, voto público de especialista tras token, y viceversa
  assert.equal((await w.castSecretVote(a, CID, 'YES')).code, 'DOUBLE_SPEND_TOKEN_ALREADY_ISSUED');
  assert.equal((await w.castPublicVote(spec, CID, 'NO')).code, 'DOUBLE_SPEND_ALREADY_PUBLIC_VOTED');
  assert.equal((await w.castSecretVote(spec, CID, 'NO')).code, 'DOUBLE_SPEND_ALREADY_PUBLIC_VOTED');
  assert.equal((await w.castPublicVote(a, CID, 'YES')).code, 'NOT_A_VERIFIED_SPECIALIST');
});

test('B.5 Ciclos: A→B→C→A y auto-delegación bloqueados (DFS), grafo intacto', async () => {
  const w = await mk();
  const [A, B, C] = [(await w.enroll('VALID_ADULT')).citizen, (await w.enroll('VALID_ADULT')).citizen, (await w.enroll('VALID_ADULT')).citizen];
  assert.equal((await w.delegate(A, 'Vivienda', B)).ok, true);
  assert.equal((await w.delegate(B, 'Vivienda', C)).ok, true);
  assert.equal((await w.delegate(C, 'Vivienda', A)).code, 'CYCLE_DETECTED');
  assert.equal((await w.delegate(A, 'Vivienda', A)).code, 'CYCLE_DETECTED');
  assert.equal(w.census.delegationEdges('Vivienda').length, 2);
  // categorías independientes: en Economía C→A sí es legal
  assert.equal((await w.delegate(C, 'Economía', A)).ok, true);
  assert.equal(wouldCreateCycle(new Map([['a', 'b'], ['b', 'c']]), 'c', 'a'), true);
  assert.equal((await w.delegate(A, 'Vivienda', null)).ok, true, 'revocar permitido');
});

test('B.6 Cada voto Sandbox → #Receipt_Hash verificable en el Merkle; recibo ajeno/alterado no verifica', async () => {
  const w = await mk();
  const rm = new AdminReadModel(w);
  const receipts = [];
  for (let i = 0; i < 9; i++) {
    const c = (await w.enroll('VALID_ADULT')).citizen;
    const r = await w.castSecretVote(c, CID, CHOICES[i % 3]);
    assert.equal(r.ok, true);
    assert.equal(r.receipt.env, 'SANDBOX');
    receipts.push(r.receipt);
  }
  for (const r of receipts) {
    const chk = rm.checkReceipt(CID, r.receiptHash);
    assert.equal(chk.included, true);
    assert.equal(verifyMerkleProof(chk.proof, chk.root), true);
    assert.equal(receiptOf(CID, r.leaf), r.receiptHash);
  }
  assert.equal(rm.checkReceipt(CID, sha256Hex('inventado')).included, false);
  const chk = rm.checkReceipt(CID, receipts[0].receiptHash);
  assert.equal(verifyMerkleProof({ ...chk.proof, leaf: receipts[1].leaf }, chk.root), false);
  assert.equal(verifyMerkleProof(chk.proof, sha256Hex('otra raíz')), false);
});

test('B.7 Merkle: tamaños 1..33, impares, sin colisión por duplicado, hoja ≠ nodo', () => {
  for (let n = 1; n <= 33; n++) {
    const leaves = Array.from({ length: n }, (_, i) => sha256Hex('l' + i));
    const root = merkleRoot(leaves);
    for (const l of leaves) assert.equal(verifyMerkleProof(merkleProof(leaves, l), root), true, `n=${n}`);
  }
  const L = [sha256Hex('a'), sha256Hex('b'), sha256Hex('c')];
  assert.notEqual(merkleRoot(L), merkleRoot([...L, L[2]]), 'CVE-2012-2459: duplicar última hoja cambia raíz');
  assert.equal(merkleRoot(L), merkleRoot([L[2], L[0], L[1]]), 'orden canónico');
});

test('B.8 Privacidad de urna: ni identidad, ni IP, ni timestamps por papeleta', async () => {
  const w = await mk();
  const c = (await w.enroll('VALID_ADULT')).citizen;
  await w.castSecretVote(c, CID, 'YES');
  const box = w.boxes.get(CID);
  const dump = JSON.stringify(Object.fromEntries(Object.entries(box).map(([k, v]) => [k, v instanceof Set ? [...v] : v])), (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
  assert.ok(!dump.includes(c.nullifier), 'sin nullifier');
  assert.ok(!/timestamp|ip|createdAt|nullifier/i.test(Object.keys(box).join()), 'sin campos de metadatos');
});

test('B.9 Cierre: raíz anclada con sello de tiempo RFC3161-shaped verificable y no manipulable', async () => {
  const w = await mk();
  for (let i = 0; i < 4; i++) await w.castSecretVote((await w.enroll('VALID_ADULT')).citizen, CID, 'YES');
  const fin = w.setStatus(CID, 'CLOSED');
  assert.equal(fin.leafCount, 4);
  assert.equal(fin.timestamp.simulated, true);
  assert.equal(w.tsa.verify(fin.timestamp, fin.merkleRoot), true);
  assert.equal(w.tsa.verify(fin.timestamp, sha256Hex('otra')), false);
  assert.equal(w.tsa.verify({ ...fin.timestamp, genTime: '2000-01-01T00:00:00.000Z' }, fin.merkleRoot), false);
  assert.equal(new TimestampAuthoritySim().verify(fin.timestamp, fin.merkleRoot), false, 'otra TSA');
  const late = await w.castSecretVote((await w.enroll('VALID_ADULT')).citizen, CID, 'NO');
  assert.equal(late.code, 'CONSULTATION_NOT_ACTIVE');
  assert.equal(w.setStatus(CID, 'CLOSED').merkleRoot, fin.merkleRoot, 'finalize idempotente');
});

test('C.1 Batch Simulator 60: invariantes de conteo, peso y receipts', async () => {
  const w = await mk();
  const out = await w.batchSimulate(CID, 60);
  const t = out.tally;
  assert.equal(out.stats.enrolled, 60);
  assert.equal(t.secretBallots, out.stats.secretVotes, 'hojas == votos secretos');
  assert.ok(t.publicWeight + t.secretBallots + t.lost + t.pending <= t.census, 'peso total ≤ censo');
  assert.ok(out.stats.attacksBlocked >= 1);
  assert.equal(t.total.YES + t.total.NO + t.total.ABSTAIN, t.secretBallots + t.publicWeight);
  const box = w.boxes.get(CID);
  for (const leaf of box.leafList().slice(0, 10)) assert.equal(verifyMerkleProof(box.proofFor(leaf), box.root()), true);
});

test('C.2 Reset Sandbox State vacía todo', async () => {
  const w = await mk();
  await w.castSecretVote((await w.enroll('VALID_ADULT')).citizen, CID, 'YES');
  await w.reset();
  assert.equal(w.census.memberCount(), 0);
  assert.equal(w.boxes.size, 0);
  assert.equal(w.census.securityLog().length, 0);
});

test('D.1 Zero-Trust: AdminReadModel congelado y sin API para ver voto individual ni alterar conteo', async () => {
  const w = await mk();
  const rm = new AdminReadModel(w);
  const api = Object.getOwnPropertyNames(Object.getPrototypeOf(rm));
  for (const forbidden of [/whoVoted/i, /voteOf/i, /setTally/i, /editTally/i, /mutate/i, /deleteVote/i, /receiptOwner/i, /identity/i]) {
    assert.ok(!api.some((m) => forbidden.test(m)), String(forbidden));
  }
  const snap = rm.snapshot();
  assert.throws(() => { 'use strict'; snap.census = {}; }, TypeError);
  for (const m of ['castSecretVote']) assert.equal(typeof rm[m], 'undefined');
  const boxApi = Object.getOwnPropertyNames(Object.getPrototypeOf(w.boxes.get(CID)));
  assert.ok(!boxApi.some((m) => /voteOf|whoVoted|owner|identity|setTally|edit/i.test(m)), 'la urna no tiene API de identidad ni edición');
});
