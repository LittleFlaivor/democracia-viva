/**
 * SUITE DE AUDITORÍA ADVERSARIA: GAUNTLET LOOP RED TEAM (ÁRBITRO 1)
 * Prueba exhaustiva de la Urna Atómica Desacoplada, Censo Zero-PII,
 * Compromiso con Sal Local, Detección de Fraude e Invariante Contable.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AtomicBallotBoxManager,
  generateVoterSecretSalt,
  computeCommitmentHash,
  generateReceiptCode,
  verifyClientReceipt
} from '../src/domain/civic/atomic-ballot-box.ts';

import {
  IdentityProviderAdapter,
  deriveCitizenNullifierHash
} from '../src/domain/civic/identity-adapter.ts';

import {
  DynamicRollupEngine
} from '../src/domain/liquid-democracy/dynamic-rollup.ts';

const CID = 'ley-vivienda-rdl-2026';

/* ───────────────────────────────────────────────────────────────────
   TEST 1: CONTROL REGULATORIO DE MAYORÍA DE EDAD (+18)
   ─────────────────────────────────────────────────────────────────── */
test('RED TEAM [1/10]: Bloqueo Inmediato de Menores de Edad (<18)', () => {
  const adapter = new IdentityProviderAdapter();

  // Caso 1: Adulto válido
  const adult = adapter.verifyIdentityPayload({
    provider: 'SANDBOX_EMULATOR',
    provider_reference: 'doc_adult_valid_01',
    is_adult_18: true,
    webhook_signature: 'sig',
    timestamp: Date.now(),
    opaque_identity_token: 'adult_alice'
  });
  assert.equal(adult.valid, true);
  assert.ok(adult.nullifier_hash);

  // Caso 2: Menor de edad
  const minor = adapter.verifyIdentityPayload({
    provider: 'SANDBOX_EMULATOR',
    provider_reference: 'doc_minor_rejected_02',
    is_adult_18: false,
    webhook_signature: 'sig',
    timestamp: Date.now(),
    opaque_identity_token: 'minor_bob'
  });
  assert.equal(minor.valid, false);
  assert.equal(minor.is_adult_18, false);
  assert.ok(minor.error.includes('+18'));
});

/* ───────────────────────────────────────────────────────────────────
   TEST 2: REGLA DE 1 CIUDADANO = 1 DISPOSITIVO ACTIVO (MIGRACIÓN)
   ─────────────────────────────────────────────────────────────────── */
test('RED TEAM [2/10]: Migración de Móvil Revoca Atómicamente la Passkey Previa', () => {
  const adapter = new IdentityProviderAdapter();
  const nullifier = deriveCitizenNullifierHash('citizen_carmen');

  // Terminal 1: Móvil original
  const reg1 = adapter.registerDevicePasskey({
    citizenNullifierHash: nullifier,
    credentialId: 'cred_iphone_13',
    publicKey: 'pubkey_es256_01'
  });
  assert.equal(reg1.ok, true);
  assert.equal(reg1.device_replaced, false);
  assert.equal(adapter.isCredentialActive('cred_iphone_13'), true);

  // Terminal 2: Nuevo móvil con el mismo nullifier
  const reg2 = adapter.registerDevicePasskey({
    citizenNullifierHash: nullifier,
    credentialId: 'cred_pixel_9',
    publicKey: 'pubkey_es256_02'
  });
  assert.equal(reg2.ok, true);
  assert.equal(reg2.device_replaced, true);
  assert.equal(reg2.revoked_credential_id, 'cred_iphone_13');

  // Comprobar que el terminal antiguo queda 100% revocado
  assert.equal(adapter.isCredentialActive('cred_iphone_13'), false);
  // Y el nuevo terminal está activo
  assert.equal(adapter.isCredentialActive('cred_pixel_9'), true);
  // Total de ciudadanos activos sigue siendo 1
  assert.equal(adapter.getSecurityStats().total_active_citizens, 1);
});

/* ───────────────────────────────────────────────────────────────────
   TEST 3: PREVENCIÓN ESTRICTA DE DOBLE VOTO (CENSO DE PARTICIPACIÓN)
   ─────────────────────────────────────────────────────────────────── */
test('RED TEAM [3/10]: Doble Voto con la Misma Identidad Bloqueado al 100%', async () => {
  const box = new AtomicBallotBoxManager('SANDBOX');
  const nullifier = deriveCitizenNullifierHash('citizen_voter_01');

  // Primer voto legítimo
  const vote1 = await box.castAtomicVote({
    consultationId: CID,
    citizenNullifierHash: nullifier,
    voteChoice: 'YES',
    webauthnAssertionSignature: 'assertion_sig_hw_passkey_legit_1'
  });
  assert.equal(vote1.ok, true);
  assert.ok(vote1.receipt);

  // Segundo voto malicioso con la misma identidad
  const vote2 = await box.castAtomicVote({
    consultationId: CID,
    citizenNullifierHash: nullifier,
    voteChoice: 'NO',
    webauthnAssertionSignature: 'assertion_sig_hw_passkey_malicious_2'
  });
  assert.equal(vote2.ok, false);
  assert.equal(vote2.code, 'DOUBLE_VOTE_REJECTED');

  // Comprobar que en la urna solo figura 1 voto
  assert.equal(box.getAllBallots(CID).length, 1);
});

/* ───────────────────────────────────────────────────────────────────
   TEST 4: ANTI-BALLOT STUFFING (EXIGE FIRMA WEBAUTHN HARDWARE)
   ─────────────────────────────────────────────────────────────────── */
test('RED TEAM [4/10]: Inyección de Voto sin Firma WebAuthn es Rechazada', async () => {
  const box = new AtomicBallotBoxManager('SANDBOX');
  const nullifier = deriveCitizenNullifierHash('citizen_voter_attacker');

  const vote = await box.castAtomicVote({
    consultationId: CID,
    citizenNullifierHash: nullifier,
    voteChoice: 'YES',
    webauthnAssertionSignature: '' // Firma vacía o ausente
  });
  assert.equal(vote.ok, false);
  assert.equal(vote.code, 'MISSING_WEBAUTHN_SIGNATURE');
  assert.equal(box.getAllBallots(CID).length, 0);
});

/* ───────────────────────────────────────────────────────────────────
   TEST 5: AUSENCIA TOTAL DE METADATOS FORENSES EN LA URNA (ZERO-PII)
   ─────────────────────────────────────────────────────────────────── */
test('RED TEAM [5/10]: La Urna no Contiene Nullifiers, IDs, IPs ni Marcas Temporales', async () => {
  const box = new AtomicBallotBoxManager('SANDBOX');
  const nullifier = deriveCitizenNullifierHash('citizen_privacy_tester');

  await box.castAtomicVote({
    consultationId: CID,
    citizenNullifierHash: nullifier,
    voteChoice: 'YES',
    webauthnAssertionSignature: 'assertion_sig_hw_passkey_001'
  });

  const ballots = box.getAllBallots(CID);
  assert.equal(ballots.length, 1);
  const b = ballots[0];

  // Comprobar esquema estricto de la papeleta en la urna
  const keys = Object.keys(b).sort();
  assert.deepEqual(keys, ['commitment_hash', 'receipt_code', 'vote_choice']);

  const jsonStr = JSON.stringify(b);
  assert.ok(!jsonStr.includes(nullifier), 'La urna NO debe contener el nullifier');
  assert.ok(!jsonStr.includes('timestamp'), 'La papeleta individual NO debe llevar timestamp');
  assert.ok(!jsonStr.includes('192.168.'), 'La urna NO debe llevar IP');
});

/* ───────────────────────────────────────────────────────────────────
   TEST 6: RECIBO CON SAL LOCAL Y DETECCIÓN DE MANIPULACIÓN (TAMPERING)
   ─────────────────────────────────────────────────────────────────── */
test('RED TEAM [6/10]: Manipulación de un Voto en la Base de Datos Falla la Sal Local', async () => {
  const box = new AtomicBallotBoxManager('SANDBOX');
  const nullifier = deriveCitizenNullifierHash('citizen_tamper_test');
  const voterSecretSalt = generateVoterSecretSalt();

  // Emite voto 'YES'
  const vote = await box.castAtomicVote({
    consultationId: CID,
    citizenNullifierHash: nullifier,
    voteChoice: 'YES',
    webauthnAssertionSignature: 'assertion_sig_hw_passkey_001',
    voterSecretSalt
  });
  assert.equal(vote.ok, true);
  const clientReceipt = vote.receipt;

  // 1. Verificación inicial: correcta
  let ballotInUrn = box.getBallotByReceipt(CID, clientReceipt.receipt_code);
  const initialCheck = verifyClientReceipt(clientReceipt, ballotInUrn);
  assert.equal(initialCheck.verified, true);
  assert.equal(initialCheck.tampered, false);

  // 2. Ataque adversario: un atacante altera el voto en la urna a 'NO'
  box.simulateTampering({
    consultationId: CID,
    type: 'ALTER_VOTE_CHOICE',
    targetReceiptCode: clientReceipt.receipt_code
  });

  // 3. Verificación ciudadana posterior: salta la alarma
  ballotInUrn = box.getBallotByReceipt(CID, clientReceipt.receipt_code);
  const tamperCheck = verifyClientReceipt(clientReceipt, ballotInUrn);
  assert.equal(tamperCheck.verified, false);
  assert.equal(tamperCheck.tampered, true);
  assert.ok(tamperCheck.reason.includes('ALERTA DE MANIPULACIÓN'));
});

/* ───────────────────────────────────────────────────────────────────
   TEST 7: INVARIANTE PÚBLICO DE CUADRE CONTABLE
   ─────────────────────────────────────────────────────────────────── */
test('RED TEAM [7/10]: Invariante COUNT(Roll) === COUNT(Ballot_Box) y Detección de Voto Fantasma', async () => {
  const box = new AtomicBallotBoxManager('SANDBOX');

  // Emitir 3 votos limpios
  for (let i = 0; i < 3; i++) {
    const nf = deriveCitizenNullifierHash(`user_batch_${i}`);
    await box.castAtomicVote({
      consultationId: CID,
      citizenNullifierHash: nf,
      voteChoice: 'YES',
      webauthnAssertionSignature: `assertion_sig_${i}_hw`
    });
  }

  // Comprobar cuadre perfecto
  const auditInitial = box.auditAccountingBalance(CID);
  assert.equal(auditInitial.balanced, true);
  assert.equal(auditInitial.direct_voters_in_roll, 3);
  assert.equal(auditInitial.ballots_in_urn, 3);
  assert.equal(auditInitial.status, 'AUDIT_OK_BALANCED');

  // Ataque adversario: inyección de un voto fantasma no autorizado en la urna
  box.simulateTampering({
    consultationId: CID,
    type: 'INJECT_GHOST_BALLOT'
  });

  // Comprobar que el invariante detecta inmediatamente el desajuste
  const auditTampered = box.auditAccountingBalance(CID);
  assert.equal(auditTampered.balanced, false);
  assert.equal(auditTampered.difference, -1);
  assert.equal(auditTampered.status, 'AUDIT_ALERT_UNBALANCED');
});

/* ───────────────────────────────────────────────────────────────────
   TEST 8: AISLAMIENTO FÍSICO ENTRE PROD Y SANDBOX
   ─────────────────────────────────────────────────────────────────── */
test('RED TEAM [8/10]: Aislamiento Físico de Colecciones prod_* vs sandbox_*', () => {
  const prodBox = new AtomicBallotBoxManager('PROD');
  const sandBox = new AtomicBallotBoxManager('SANDBOX');

  assert.equal(prodBox.rollCollectionName, 'prod_participation_roll');
  assert.equal(prodBox.boxCollectionName, 'prod_ballot_box');

  assert.equal(sandBox.rollCollectionName, 'sandbox_participation_roll');
  assert.equal(sandBox.boxCollectionName, 'sandbox_ballot_box');

  // Prohibición de simulación de ataque en producción
  assert.throws(() => {
    prodBox.simulateTampering({ consultationId: CID, type: 'ALTER_VOTE_CHOICE' });
  }, /PROD/);
});

/* ───────────────────────────────────────────────────────────────────
   TEST 9: DEMOCRACIA LÍQUIDA — PREVENCIÓN DE BUCLES EN EL GRAFO (DAG)
   ─────────────────────────────────────────────────────────────────── */
test('RED TEAM [9/10]: Prevención de Ciclos Circulares (A -> B -> C -> A) mediante DFS', () => {
  const engine = new DynamicRollupEngine();

  // A -> B
  const r1 = engine.setDelegation({ category: 'vivienda', fromNullifier: '0x_A', toNullifier: '0x_B' });
  assert.equal(r1.ok, true);

  // B -> C
  const r2 = engine.setDelegation({ category: 'vivienda', fromNullifier: '0x_B', toNullifier: '0x_C' });
  assert.equal(r2.ok, true);

  // C -> A (Intento de cerrar el ciclo)
  const r3 = engine.setDelegation({ category: 'vivienda', fromNullifier: '0x_C', toNullifier: '0x_A' });
  assert.equal(r3.ok, false);
  assert.equal(r3.code, 'CYCLE_DETECTED');

  // Auto-delegación (A -> A)
  const r4 = engine.setDelegation({ category: 'vivienda', fromNullifier: '0x_A', toNullifier: '0x_A' });
  assert.equal(r4.ok, false);
  assert.equal(r4.code, 'CYCLE_DETECTED');
});

/* ───────────────────────────────────────────────────────────────────
   TEST 10: DEMOCRACIA LÍQUIDA — HOT-OVERRIDE (VOTO DIRECTO PREVALECE)
   ─────────────────────────────────────────────────────────────────── */
test('RED TEAM [10/10]: Hot-Override Descuenta Inmediatamente al Delegador que Vota Directo', () => {
  const engine = new DynamicRollupEngine();
  const specNullifier = '0x_spec_vivienda_colectivo';

  // 2 ciudadanos delegan en el especialista de vivienda
  engine.setDelegation({ category: 'vivienda', fromNullifier: '0x_citizen_1', toNullifier: specNullifier });
  engine.setDelegation({ category: 'vivienda', fromNullifier: '0x_citizen_2', toNullifier: specNullifier });

  // Caso 1: Ninguno ha votado directo -> Peso = 1 (especialista) + 2 (delegadores) = 3
  const rollupBefore = engine.resolveDynamicRollup({
    category: 'vivienda',
    directVotersSet: new Set()
  });
  const specBefore = rollupBefore.specialists.find(s => s.specialist_nullifier === specNullifier);
  assert.equal(specBefore.total_effective_weight, 3);
  assert.equal(specBefore.discounted_direct_voters_count, 0);

  // Caso 2: El ciudadano 1 vota directamente sobre la ley -> Hot-Override activo
  const directVoters = new Set(['0x_citizen_1']);
  const rollupAfter = engine.resolveDynamicRollup({
    category: 'vivienda',
    directVotersSet: directVoters
  });
  const specAfter = rollupAfter.specialists.find(s => s.specialist_nullifier === specNullifier);

  // Su peso pasa a ser 1 + 1 = 2 (se descuenta exactamente 1)
  assert.equal(specAfter.total_effective_weight, 2);
  assert.equal(specAfter.discounted_direct_voters_count, 1);
  assert.equal(rollupAfter.totalDiscountedOverrides, 1);
});
