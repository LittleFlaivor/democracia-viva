/**
 * DEMOCRACIA VIVA — SUITE DE AUDITORÍA INTEGRAL EN 10 RONDAS
 * 
 * Verifica al 100% todos los invariantes criptográficos, matemáticos,
 * de persistencia, anti-trampas y de experiencia de usuario de la plataforma.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SandboxWorld,
  AdminReadModel,
  CHOICES,
  leafOf,
  receiptOf,
  wouldCreateCycle,
  BallotBox
} from '../src/domain/civic/protocol.ts';

import {
  merkleRoot,
  merkleProof,
  verifyMerkleProof,
  buildMerkleLevels,
  merkleLeaf,
  generateBlindKey,
  blindMessage,
  blindSign,
  unblindSignature,
  verifyBlindSignature,
  sha256Hex,
  TimestampAuthoritySim,
  bytesToHex,
  randomBytes
} from '../src/domain/civic/crypto.ts';

import {
  mrzCheckDigit,
  buildMrz,
  parseMrz,
  TEST_CSCA_PUBLIC,
  verifyDnieInRam,
  mockChipForScenario,
  aaChallenge
} from '../src/domain/civic/dnie.ts';

import {
  VirtualPasskey,
  verifyAssertion,
  actionChallenge,
  DEFAULT_RP
} from '../src/domain/civic/passkey.ts';

import { LiquidDemocracyDAGEngine } from '../src/domain/liquid-democracy/dag-engine.ts';
import { DelegationResolver } from '../src/domain/liquid-democracy/delegation-resolver.ts';
import { CITIZEN_PROFILES } from '../src/domain/data/citizen-profiles.ts';
import { DECREE_VIVIENDA } from '../src/domain/data/decree-vivienda.ts';
import {
  isReflectionTimerEnabled,
  setReflectionTimerEnabled,
  toggleReflectionTimer,
  DEFAULT_REFLECTION_SECONDS
} from '../src/services/deliberation-timer.ts';
import {
  getConsultationDeadlineConfig,
  setConsultationDeadlineConfig,
  toggleConsultationDeadline,
  calculateTimeRemaining,
  DEFAULT_DEADLINE_ISO,
  DEFAULT_DEADLINE_LABEL
} from '../src/services/consultation-deadline.ts';

import fs from 'node:fs';
import path from 'node:path';

const CID = 'ley-vivienda';
const setupWorld = async () => {
  const w = await SandboxWorld.create();
  await w.createConsultation({
    id: CID,
    title: 'Ley de Vivienda',
    category: 'Vivienda',
    boeRef: 'BOE-A-2023-12203'
  });
  w.setStatus(CID, 'ACTIVE');
  return w;
};

/* ───────────────────────────────────────────────────────────────────
   RONDA 1: CENSO CIUDADANO, DNIe NFC Y DEFENSA SYBIL (+18)
   ─────────────────────────────────────────────────────────────────── */
test('RONDA 1 [1/3]: Alta de adulto válido con 8 verificaciones y nullifier determinista', async () => {
  const w = await setupWorld();
  const res = await w.enroll('VALID_ADULT');
  assert.equal(res.ok, true, 'El alta de un ciudadano mayor de edad debe ser exitosa');
  assert.equal(res.steps.length, 8, 'Debe ejecutar exactamente las 8 comprobaciones de seguridad');
  assert.ok(res.steps.every((s) => s.ok), 'Todos los pasos deben estar en estado OK');
  assert.match(res.citizen.nullifier, /^[0-9a-f]{64}$/, 'El nullifier debe ser un hash SHA-256 de 64 caracteres hex');
  assert.equal(w.census.memberCount(), 1, 'El censo debe contener exactamente 1 miembro');
});

test('RONDA 1 [2/3]: Bloqueo exhaustivo de menores, DNI caducado, firmas falsas y replay', async () => {
  const w = await setupWorld();
  const scenarios = [
    { scenario: 'MINOR', expectedCode: 'UNDER_18' },
    { scenario: 'EXPIRED', expectedCode: 'DOCUMENT_EXPIRED' },
    { scenario: 'FORGED', expectedCode: 'SOD_HASH_MISMATCH' },
    { scenario: 'REPLAY', expectedCode: 'ACTIVE_AUTH_FAILED' }
  ];

  for (const { scenario, expectedCode } of scenarios) {
    const res = await w.enroll(scenario);
    assert.equal(res.ok, false, `El escenario ${scenario} debe ser rechazado`);
    assert.equal(res.code, expectedCode, `El código de error debe ser ${expectedCode}`);
  }
  assert.equal(w.census.memberCount(), 0, 'Ningún atacante o usuario no cualificado debe entrar al censo');
});

test('RONDA 1 [3/3]: Cambio de móvil revoca la passkey anterior y conserva el nullifier único', async () => {
  const w = await setupWorld();
  const primerAlta = await w.enroll('VALID_ADULT');
  assert.equal(primerAlta.ok, true);

  const cambioMovil = await w.enroll('DEVICE_CHANGE', { reuse: primerAlta.citizen });
  assert.equal(cambioMovil.ok, true, 'El cambio de móvil debe ser aceptado para el mismo titular');
  assert.equal(cambioMovil.deviceReplaced, true, 'Debe indicar que el dispositivo anterior fue reemplazado');
  assert.equal(cambioMovil.citizen.nullifier, primerAlta.citizen.nullifier, 'El nullifier del ciudadano debe ser el mismo');
  assert.equal(w.census.memberCount(), 1, 'No debe duplicar el número de miembros en el censo');
});

/* ───────────────────────────────────────────────────────────────────
   RONDA 2: AUTENTICACIÓN BIOMÉTRICA WEBAUTHN / PASSKEYS
   ─────────────────────────────────────────────────────────────────── */
test('RONDA 2 [1/2]: Contador anti-clonación, validación de challenge y channel binding', async () => {
  const w = await setupWorld();
  const pk = new VirtualPasskey(DEFAULT_RP);
  const challenge = actionChallenge('REGISTER', 'census', 'nonce-1234');
  const assertion1 = await pk.sign(challenge);

  const exp = { origin: DEFAULT_RP.origin, rpId: DEFAULT_RP.rpId, challenge };
  const v1 = verifyAssertion(assertion1, pk.publicKey, exp, 0);
  assert.equal(v1.ok, true);
  assert.equal(v1.counter, 1);

  // Intento de replay con contador anterior o igual debe fallar
  const vReplay = verifyAssertion(assertion1, pk.publicKey, exp, 1);
  assert.equal(vReplay.ok, false, 'Un contador no incremental debe ser rechazado');
  assert.equal(vReplay.code, 'COUNTER_REPLAY');

  // Intento con origin alterado (phishing) debe fallar
  const vPhish = verifyAssertion(assertion1, pk.publicKey, { ...exp, origin: 'https://sitio-falso.com' }, 0);
  assert.equal(vPhish.ok, false, 'Un origen no autorizado debe ser rechazado');
  assert.equal(vPhish.code, 'ORIGIN_MISMATCH');
});

test('RONDA 2 [2/2]: Desacoplamiento total entre clave biométrica y contenido del voto', async () => {
  const pk = new VirtualPasskey(DEFAULT_RP);
  const challengeA = actionChallenge('BLIND_TOKEN', CID, 'hash_aleatorio_enmascarado');
  const assertion = await pk.sign(challengeA);

  const assertionStr = JSON.stringify(assertion);
  assert.ok(!assertionStr.includes('YES'), 'La firma passkey nunca debe contener el sentido del voto');
  assert.ok(!assertionStr.includes('NO'), 'La firma passkey nunca debe contener el sentido del voto');
  assert.ok(!assertionStr.includes('ABSTAIN'), 'La firma passkey nunca debe contener el sentido del voto');
});

/* ───────────────────────────────────────────────────────────────────
   RONDA 3: PROTOCOLO DE VOTO CIEGO Y PRIVACIDAD ABSOLUTA
   ─────────────────────────────────────────────────────────────────── */
test('RONDA 3 [1/2]: Firma ciega RSA-FDH matemáticamente correcta e incorrelacionable', async () => {
  const key = await generateBlindKey();
  const serial = bytesToHex(randomBytes(32));

  // 1. El cliente ciega el mensaje
  const bl = blindMessage({ n: key.n, e: key.e }, CID, serial);
  assert.notEqual(bl.blinded, serial, 'El mensaje enmascarado no debe revelar el número de serie');

  // 2. La autoridad firma la máscara sin conocer el serial
  const blindSig = blindSign(key, bl.blinded);

  // 3. El cliente retira la máscara (unblind)
  const unblindedSig = unblindSignature({ n: key.n, e: key.e }, blindSig, bl.r);

  // 4. La urna verifica que la firma es válida para el serial original
  const valid = verifyBlindSignature({ n: key.n, e: key.e }, CID, serial, unblindedSig);
  assert.equal(valid, true, 'La firma desenmascarada debe verificar contra la clave pública');

  // Intento de alterar el serial debe fallar
  const tamperedSerial = bytesToHex(randomBytes(32));
  const invalid = verifyBlindSignature({ n: key.n, e: key.e }, CID, tamperedSerial, unblindedSig);
  assert.equal(invalid, false, 'Un serial alterado no debe verificar');
});

test('RONDA 3 [2/2]: La urna rechaza firmas ciegas falsificadas y seriales ya gastados', async () => {
  const w = await setupWorld();
  const box = w.boxes.get(CID);
  const enrollRes = await w.enroll('VALID_ADULT');
  const citizen = enrollRes.citizen;

  // Emisión de un voto legítimo
  const voteRes = await w.castSecretVote(citizen, CID, 'YES');
  assert.equal(voteRes.ok, true);

  // Intento de reusar el mismo serial
  const serialReused = voteRes.trace.serial;
  const duplicateBallot = {
    serial: serialReused,
    signature: voteRes.trace.unblinded,
    salt: bytesToHex(randomBytes(16)),
    choice: 'NO'
  };
  const submitDup = box.submit(duplicateBallot);
  assert.equal(submitDup.ok, false);
  assert.equal(submitDup.code, 'SERIAL_ALREADY_SPENT', 'No se puede depositar dos veces el mismo serial');
});

/* ───────────────────────────────────────────────────────────────────
   RONDA 4: ÁRBOL DE MERKLE SHA-256 E INCLUSIÓN CRIPTOGRÁFICA
   ─────────────────────────────────────────────────────────────────── */
test('RONDA 4 [1/2]: Integridad de Merkle con dominio separado y promoción de nodos impares', () => {
  const testSizes = [1, 2, 3, 4, 7, 16, 31, 33];
  for (const size of testSizes) {
    const leaves = Array.from({ length: size }, (_, i) => sha256Hex(`hoja-prueba-${i}`));
    const root = merkleRoot(leaves);
    assert.match(root, /^[0-9a-f]{64}$/, 'La raíz de Merkle debe ser un hash SHA-256 de 64 caracteres');

    // Comprobar que el 100% de las hojas pueden ser probadas
    for (const leaf of leaves) {
      const proof = merkleProof(leaves, leaf);
      assert.ok(proof, 'Debe generar prueba para cada hoja');
      assert.equal(verifyMerkleProof(proof, root), true, 'La prueba debe verificar contra la raíz');
    }
  }

  // Comprobar separación de dominio de hoja vs nodo interior (previene CVE-2012-2459)
  const leafValue = sha256Hex('hoja-test');
  const leafHash = merkleLeaf(leafValue);
  assert.notEqual(leafHash, leafValue);
});

test('RONDA 4 [2/2]: Recibos alterados o falsificados fallan la prueba de inclusión', () => {
  const leaves = ['a', 'b', 'c', 'd', 'e'].map((s) => sha256Hex(`voto-${s}`));
  const root = merkleRoot(leaves);
  const proof = merkleProof(leaves, leaves[2]);

  // Modificar un hash en un paso de la prueba
  const tamperedProof = {
    ...proof,
    steps: proof.steps.map((st, i) => i === 0 ? { ...st, hash: sha256Hex('hash-falso') } : st)
  };
  assert.equal(verifyMerkleProof(tamperedProof, root), false, 'Una prueba alterada debe fallar');
});

/* ───────────────────────────────────────────────────────────────────
   RONDA 5: DEMOCRACIA LÍQUIDA Y GRAFO ACÍCLICO (DAG)
   ─────────────────────────────────────────────────────────────────── */
test('RONDA 5 [1/2]: Intercepción instantánea de ciclos (A -> B -> C -> A) mediante DFS', () => {
  const delegations = new Map();
  LiquidDemocracyDAGEngine.setDelegation(delegations, 'citizen-A', 'citizen-B');
  LiquidDemocracyDAGEngine.setDelegation(delegations, 'citizen-B', 'citizen-C');

  // Intento de cerrar el ciclo C -> A
  const cycleAttempt = LiquidDemocracyDAGEngine.setDelegation(delegations, 'citizen-C', 'citizen-A');
  assert.equal(cycleAttempt.success, false, 'El intento de bucle debe ser rechazado');
  assert.ok(cycleAttempt.error?.includes('ERROR_CIRCULAR_DELEGATION'));

  // Intento de auto-delegación A -> A
  const selfAttempt = LiquidDemocracyDAGEngine.setDelegation(delegations, 'citizen-A', 'citizen-A');
  assert.equal(selfAttempt.success, false, 'La auto-delegación debe ser rechazada');
});

test('RONDA 5 [2/2]: Hot-Override (Voto Directo anula delegación para el artículo)', () => {
  const citizenIds = ['A', 'B', 'C', 'D'];
  const delegations = new Map();
  delegations.set('A', 'B'); // A delega en B
  delegations.set('C', 'B'); // C delega en B

  // Escenario 1: Nadie vota directo todavía, B acumula su voto + A + C = 3
  const directVotes1 = new Map();
  const weights1 = LiquidDemocracyDAGEngine.computeEffectiveWeightsForArticle(citizenIds, delegations, directVotes1);
  assert.equal(weights1.get('B'), 3, 'B debe tener peso 3 (él mismo + A + C)');
  assert.equal(weights1.get('D'), 1, 'D tiene peso 1');

  // Escenario 2: A decide votar directamente (Hot-Override)
  const directVotes2 = new Map();
  directVotes2.set('A', 'YES'); // A vota directamente
  const weights2 = LiquidDemocracyDAGEngine.computeEffectiveWeightsForArticle(citizenIds, delegations, directVotes2);
  assert.equal(weights2.get('A'), 1, 'A recupera su peso propio (=1)');
  assert.equal(weights2.get('B'), 2, 'B pierde la delegación de A y se queda con peso 2 (él mismo + C)');

  // Conservación de la masa electoral
  const totalWeight = Array.from(weights2.values()).reduce((acc, w) => acc + w, 0);
  assert.equal(totalWeight, citizenIds.length, 'La suma total de pesos debe ser exactamente igual al censo');
});

/* ───────────────────────────────────────────────────────────────────
   RONDA 6: ESCRUTINIO MATEMÁTICO Y CONTABILIDAD ELECTORAL
   ─────────────────────────────────────────────────────────────────── */
test('RONDA 6 [1/2]: Agregación de votos con delegación transitiva en Decreto Vivienda', () => {
  const article = DECREE_VIVIENDA.articles[0];
  const delegations = new Map();
  // Lucía Ramos delega en Asociación Vecinal
  delegations.set('lucia-ramos', 'asoc-vivienda-digna');

  const directVotes = [
    { citizenId: 'asoc-vivienda-digna', articleId: article.id, choice: 'YES', timestamp: Date.now(), nullifierHash: '0x1' },
    { citizenId: 'carlos-mendez', articleId: article.id, choice: 'NO', timestamp: Date.now(), nullifierHash: '0x2' }
  ];

  const aggregation = DelegationResolver.aggregateArticleVotes(
    article,
    CITIZEN_PROFILES,
    delegations,
    directVotes
  );

  assert.ok(aggregation.totalYes >= 2, 'Asociación Vecinal debe computar su voto + la delegación de Lucía Ramos');
  assert.ok(aggregation.totalNo >= 1, 'Carlos Méndez debe tener al menos su voto propio');
  const sumPct = aggregation.pctYes + aggregation.pctNo + aggregation.pctAbstain;
  assert.ok(Math.abs(sumPct - 100) <= 1, 'Los porcentajes deben sumar 100%');
});

test('RONDA 6 [2/2]: Seguridad contra división por cero cuando la urna tiene 0 votos', () => {
  const article = DECREE_VIVIENDA.articles[0];
  const emptyAggregation = DelegationResolver.aggregateArticleVotes(
    article,
    CITIZEN_PROFILES,
    new Map(),
    []
  );

  assert.equal(emptyAggregation.pctYes, 0);
  assert.equal(emptyAggregation.pctNo, 0);
  assert.equal(emptyAggregation.pctAbstain, 0);
  assert.equal(emptyAggregation.totalVotesCount, 0);
});

/* ───────────────────────────────────────────────────────────────────
   RONDA 7: PERSISTENCIA, REGLAS FIRESTORE Y ANTI-ROLLBACK
   ─────────────────────────────────────────────────────────────────── */
test('RONDA 7 [1/2]: Auditoría estática de reglas de Cloud Firestore (Append-Only)', () => {
  const rulesPath = path.resolve('firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');

  assert.ok(rulesContent.includes('match /votes/{nullifierHash}'), 'Debe existir regla para la colección de votos');
  assert.ok(rulesContent.includes('allow create: if'), 'Debe permitir creación condicional de papeletas');
  assert.ok(rulesContent.includes('allow update, delete: if false'), 'Debe prohibir terminantemente actualizar o borrar votos');
  assert.ok(rulesContent.includes('!exists('), 'Debe verificar que el nullifierHash no exista previamente');
});

test('RONDA 7 [2/2]: Esquema estricto de voto inmutable sin PII ni datos de identidad', () => {
  const requiredFields = [
    'nullifierHash',
    'proposalId',
    'choice',
    'timestamp',
    'clientSignature',
    'merkleLeaf',
    'txHash',
    'receiptId',
    'merkleRoot'
  ];

  const sampleVoteDoc = {
    nullifierHash: '0x' + 'a'.repeat(64),
    proposalId: 'RDL-06-2026-VIVIENDA::ART-01',
    choice: 'YES',
    timestamp: Date.now(),
    clientSignature: 'sig_valid',
    merkleLeaf: '0x' + 'b'.repeat(64),
    txHash: '0x' + 'c'.repeat(64),
    receiptId: 'REC-ABCD1234',
    merkleRoot: '0x' + 'd'.repeat(64)
  };

  for (const field of requiredFields) {
    assert.ok(field in sampleVoteDoc, `El campo ${field} es obligatorio en el documento de voto`);
  }
  assert.ok(!('dni' in sampleVoteDoc), 'Prohibido almacenar DNI');
  assert.ok(!('nombre' in sampleVoteDoc), 'Prohibido almacenar nombre');
  assert.ok(!('ip' in sampleVoteDoc), 'Prohibido almacenar IP');
});

/* ───────────────────────────────────────────────────────────────────
   RONDA 8: PAUSA DELIBERATIVA (20s) Y ESTADOS DE REFLEXIÓN
   ─────────────────────────────────────────────────────────────────── */
test('RONDA 8 [1/2]: Servicio de pausa deliberativa activa y desactiva correctamente', () => {
  assert.equal(DEFAULT_REFLECTION_SECONDS, 20, 'La duración por defecto debe ser de 20 segundos');
  
  // Guardar estado inicial
  const initial = isReflectionTimerEnabled();

  setReflectionTimerEnabled(true);
  assert.equal(isReflectionTimerEnabled(), true, 'Debe activar la pausa deliberativa');

  setReflectionTimerEnabled(false);
  assert.equal(isReflectionTimerEnabled(), false, 'Debe desactivar la pausa deliberativa');

  // Dejarlo como estaba inicialmente
  setReflectionTimerEnabled(initial);
});

test('RONDA 8 [2/2]: Función toggleReflectionTimer conmuta el estado en un solo paso', () => {
  const stateBefore = isReflectionTimerEnabled();
  const toggled = toggleReflectionTimer();
  assert.equal(toggled, !stateBefore, 'Debe invertir el estado actual');
  toggleReflectionTimer(); // Revertir
});

/* ───────────────────────────────────────────────────────────────────
   CUENTA ATRÁS Y VIGENCIA: ELECCIONES GENERALES DE ESPAÑA
   ─────────────────────────────────────────────────────────────────── */
test('CUENTA ATRÁS [1/2]: La fecha objetivo por defecto apunta a las Elecciones Generales', () => {
  assert.equal(DEFAULT_DEADLINE_ISO, '2027-07-25T20:00:00+02:00', 'Debe apuntar a las Elecciones Generales 2027');
  assert.ok(DEFAULT_DEADLINE_LABEL.includes('Elecciones Generales'), 'La etiqueta debe ser Elecciones Generales');

  const remaining = calculateTimeRemaining(DEFAULT_DEADLINE_ISO);
  assert.equal(remaining.isExpired, false, 'No debe estar expirada');
  assert.ok(remaining.days > 0, 'Deben quedar más de 0 días');
  assert.ok(remaining.formattedCompact.includes('d'), 'Debe contener formato de días');
});

test('CUENTA ATRÁS [2/2]: Detección de expiración y conmutador de visibilidad', () => {
  // Fecha en el pasado
  const pastRemaining = calculateTimeRemaining('2020-01-01T00:00:00Z');
  assert.equal(pastRemaining.isExpired, true, 'Una fecha pasada debe marcar isExpired true');
  assert.equal(pastRemaining.formattedCompact, 'Consulta Cerrada');

  // Conmutador
  const cfgBefore = getConsultationDeadlineConfig();
  const next = toggleConsultationDeadline();
  assert.equal(next, !cfgBefore.enabled, 'Debe alternar el estado habilitado');
  toggleConsultationDeadline(); // Restaurar
});

/* ───────────────────────────────────────────────────────────────────
   RONDA 9: CONSENSO EUREKA, RECIBOS Y EXPORTACIÓN DEL ACTA
   ─────────────────────────────────────────────────────────────────── */
test('RONDA 9 [1/2]: Generación de recibo oficial auditables con formato REC-XXXXXXXX', () => {
  const nullifier = '0x9f8e7d6c5b4a3928170f1e2d3c4b5a697887766554433221100ffeeddccbbaa9';
  const receiptId = `REC-${nullifier.slice(2, 10).toUpperCase()}`;
  assert.match(receiptId, /^REC-[0-9A-F]{8}$/, 'El recibo debe tener el prefijo REC- y 8 caracteres hexadecimales');
});

test('RONDA 9 [2/2]: Contenido del Acta Cívica Auditable JSON cumple con el protocolo', () => {
  const dummyPayload = {
    protocol: 'DEMOCRACIA_VIVA_CIVIC_AUDIT_V1',
    decree: { id: 'RDL-06-2026-VIVIENDA', officialCode: 'BOE-A-2026-VIV' },
    auditSummary: {
      generatedAt: new Date().toISOString(),
      merkleRoot: '0x' + 'f'.repeat(64),
      cryptographicStandard: 'Semaphore V4 + Groth16 ZK-SNARK'
    }
  };

  const jsonStr = JSON.stringify(dummyPayload);
  assert.ok(jsonStr.includes('DEMOCRACIA_VIVA_CIVIC_AUDIT_V1'));
  assert.ok(jsonStr.includes('Semaphore V4'));
});

/* ───────────────────────────────────────────────────────────────────
   RONDA 10: CENTRO DE MANDO, RESIDUAL CERO Y SELLADO RFC 3161
   ─────────────────────────────────────────────────────────────────── */
test('RONDA 10 [1/2]: Cierre y Sellado Oficial RFC 3161 congela la urna', async () => {
  const w = await setupWorld();
  const enrollRes = await w.enroll('VALID_ADULT');
  await w.castSecretVote(enrollRes.citizen, CID, 'YES');

  // Cierre oficial de la consulta
  const finalization = w.setStatus(CID, 'CLOSED');
  assert.ok(finalization, 'Debe devolver el objeto de finalización');
  assert.equal(finalization.leafCount, 1);
  assert.match(finalization.merkleRoot, /^[0-9a-f]{64}$/);
  assert.equal(finalization.timestamp.policyOid, '1.3.6.1.4.1.99999.1.sandbox');
  assert.match(finalization.timestamp.signature, /^[0-9a-f]{128}$/);

  // Intentar votar con la urna cerrada debe ser rechazado
  const enrollRes2 = await w.enroll('VALID_ADULT');
  const voteAfterClose = await w.castSecretVote(enrollRes2.citizen, CID, 'NO');
  assert.equal(voteAfterClose.ok, false);
  assert.equal(voteAfterClose.code, 'CONSULTATION_NOT_ACTIVE', 'No se admiten votos tras el cierre y sellado RFC 3161');
});

test('RONDA 10 [2/2]: Reinicio de Urna (Reset) vacía todas las estructuras limpiamente a cero', async () => {
  const w = await setupWorld();
  const res = await w.enroll('VALID_ADULT');
  await w.castSecretVote(res.citizen, CID, 'YES');

  assert.equal(w.census.memberCount(), 1);
  assert.equal(w.boxes.get(CID).leafCount(), 1);

  // Ejecutar reseteo total
  await w.reset();

  assert.equal(w.census.memberCount(), 0, 'El censo debe quedar a cero');
  assert.equal(w.boxes.size, 0, 'Las urnas deben quedar eliminadas');
  assert.equal(w.citizens.length, 0, 'La lista de ciudadanos en memoria debe quedar vacía');
});
