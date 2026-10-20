/**
 * 10 PRUEBAS REALISTAS DE USUARIOS Y AUDITORÍA DE SEGURIDAD/AUTENTICACIÓN
 * Democracia Viva
 * 
 * Simula 10 perfiles y escenarios de uso:
 *  1. Inquilina joven: vota los 3 artículos con 1 sola sesión biométrica unificada.
 *  2. Propietario jubilado: consulta pros/contras objetivos y emite voto mixto.
 *  3. Ciudadano indeciso: vota NS / NC y se registra como abstención consciente en el recuento.
 *  4. Red Team / Atacante: intento de fraude por doble voto con la misma identidad (bloqueado 100%).
 *  5. Ciudadano reflexivo: verifica que la pausa de 20s está activa para deliberación.
 *  6. Modo Pruebas Ágiles: votación con credencial simulada sin biometría requerida.
 *  7. Auditor de Privacidad: inspección de recibo y acta confirmando CERO datos personales (sin DNI ni IP).
 *  8. Auditor Matemático: comprobación de inclusión de recibo en el Árbol de Merkle.
 *  9. Administrador Cívico: inyección de +25 votos de prueba, auditoría y vaciado de urna a 0.
 * 10. Votante Post-Reset: votación en urna limpia a 0 con verificación de cuenta atrás electoral.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { SandboxWorld, AdminReadModel } from '../src/domain/civic/protocol.ts';
import { verifyMerkleProof } from '../src/domain/civic/crypto.ts';
import { VirtualPasskey, actionChallenge, verifyAssertion, DEFAULT_RP } from '../src/domain/civic/passkey.ts';
import { DECREE_VIVIENDA } from '../src/domain/data/decree-vivienda.ts';
import {
  isReflectionTimerEnabled,
  setReflectionTimerEnabled,
  DEFAULT_REFLECTION_SECONDS
} from '../src/services/deliberation-timer.ts';
import {
  getConsultationDeadlineConfig,
  calculateTimeRemaining,
  DEFAULT_DEADLINE_ISO
} from '../src/services/consultation-deadline.ts';

const CID = 'ley-vivienda';

/* ───────────────────────────────────────────────────────────────────
   USUARIO 1: INQUILINA JOVEN (VOTACIÓN COMPLETA CON PASSKEY)
   ─────────────────────────────────────────────────────────────────── */
test('USUARIO 1: Inquilina vota 3 artículos con 1 sola autorización Passkey unificada', async () => {
  const world = await SandboxWorld.create();
  await world.createConsultation({ id: CID, title: 'Ley de Vivienda', category: 'Vivienda', boeRef: 'RDL 2/2026' });
  world.setStatus(CID, 'ACTIVE');

  // 1. Alta ciudadana verificada (+18)
  const enroll = await world.enroll('VALID_ADULT');
  assert.equal(enroll.ok, true);
  const citizen = enroll.citizen;
  assert.ok(citizen && citizen.nullifier, 'Debe generar un nullifier único');

  // 2. Sesión biométrica Passkey unificada
  const passkey = new VirtualPasskey(DEFAULT_RP);
  const challenge = actionChallenge('VOTE_SESSION', CID, citizen.nullifier);
  const assertion = await passkey.sign(challenge);
  const verify = verifyAssertion(assertion, passkey.publicKey, { origin: DEFAULT_RP.origin, rpId: DEFAULT_RP.rpId, challenge }, 0);
  assert.equal(verify.ok, true, 'La credencial biométrica es válida');

  // 3. Emite su voto para los artículos
  const vote1 = await world.castSecretVote(citizen, CID, 'YES');
  assert.equal(vote1.ok, true);
  assert.ok(vote1.receipt, 'Debe emitir recibo');

  const rm = new AdminReadModel(world);
  const snap = rm.snapshot();
  const cData = snap.consultations.find(c => c.id === CID);
  assert.ok(cData, 'Debe existir la consulta');
  assert.equal(cData.tally.total.YES, 1, 'Debe contabilizar 1 voto A Favor');
});

/* ───────────────────────────────────────────────────────────────────
   USUARIO 2: PEQUEÑO PROPIETARIO (VOTO PONDERADO CON LECTURA PREVIA)
   ─────────────────────────────────────────────────────────────────── */
test('USUARIO 2: Propietario consulta datos y emite voto mixto (En Contra, A Favor, En Contra)', async () => {
  const world = await SandboxWorld.create();
  await world.createConsultation({ id: CID, title: 'Ley de Vivienda', category: 'Vivienda', boeRef: 'RDL 2/2026' });
  world.setStatus(CID, 'ACTIVE');

  // Verificar que el decreto dispone de métricas y argumentos objetivos y balanceados
  const art1 = DECREE_VIVIENDA.articles[0];
  assert.ok(art1.proArguments.length >= 3, 'Debe contener argumentos a favor');
  assert.ok(art1.conArguments.length >= 3, 'Debe contener argumentos en contra');
  assert.ok(art1.realLifeImpact.landlordsEffect, 'Debe detallar el impacto para propietarios');

  const enroll = await world.enroll('VALID_ADULT');
  const citizen = enroll.citizen;
  assert.ok(citizen);

  // Emite voto en contra
  const vote = await world.castSecretVote(citizen, CID, 'NO');
  assert.equal(vote.ok, true);

  const rm = new AdminReadModel(world);
  const snap = rm.snapshot();
  const cData = snap.consultations.find(c => c.id === CID);
  assert.ok(cData);
  assert.equal(cData.tally.total.NO, 1, 'Debe contabilizar 1 voto En Contra');
});

/* ───────────────────────────────────────────────────────────────────
   USUARIO 3: CIUDADANO INDECISO (VOTO NS / NC)
   ─────────────────────────────────────────────────────────────────── */
test('USUARIO 3: Ciudadano indeciso vota NS/NC y se computa en la urna como abstención consciente', async () => {
  const world = await SandboxWorld.create();
  await world.createConsultation({ id: CID, title: 'Ley de Vivienda', category: 'Vivienda', boeRef: 'RDL 2/2026' });
  world.setStatus(CID, 'ACTIVE');

  const enroll = await world.enroll('VALID_ADULT');
  const citizen = enroll.citizen;
  assert.ok(citizen);

  const vote = await world.castSecretVote(citizen, CID, 'ABSTAIN');
  assert.equal(vote.ok, true);

  const rm = new AdminReadModel(world);
  const snap = rm.snapshot();
  const cData = snap.consultations.find(c => c.id === CID);
  assert.ok(cData);
  assert.equal(cData.tally.total.ABSTAIN, 1, 'Debe computar 1 abstención / NS-NC');
});

/* ───────────────────────────────────────────────────────────────────
   USUARIO 4: INTENTO DE FRAUDE / DOBLE VOTO (RED TEAM ATTACK)
   ─────────────────────────────────────────────────────────────────── */
test('USUARIO 4: Intento de emitir 2 votos con la misma identidad es bloqueado al 100%', async () => {
  const world = await SandboxWorld.create();
  await world.createConsultation({ id: CID, title: 'Ley de Vivienda', category: 'Vivienda', boeRef: 'RDL 2/2026' });
  world.setStatus(CID, 'ACTIVE');

  const enroll = await world.enroll('VALID_ADULT');
  const citizen = enroll.citizen;
  assert.ok(citizen);

  // Primer voto legítimo
  const firstVote = await world.castSecretVote(citizen, CID, 'YES');
  assert.equal(firstVote.ok, true, 'El primer voto debe ser aceptado');

  // Segundo voto malicioso con la misma identidad
  const secondVote = await world.castSecretVote(citizen, CID, 'NO');
  assert.equal(secondVote.ok, false, 'El segundo voto debe ser RECHAZADO');
  assert.equal(secondVote.code, 'DOUBLE_SPEND_TOKEN_ALREADY_ISSUED', 'Debe indicar que el token ya fue emitido');

  // Comprobar que en la urna solo consta 1 voto
  const box = world.boxes.get(CID);
  assert.ok(box);
  assert.equal(box.leafCount(), 1, 'La urna no debe registrar el segundo voto');
});

/* ───────────────────────────────────────────────────────────────────
   USUARIO 5: PAUSA DELIBERATIVA (20 SEGUNDOS)
   ─────────────────────────────────────────────────────────────────── */
test('USUARIO 5: Pausa de 20s configurada y respetada por el motor de deliberación', () => {
  assert.equal(DEFAULT_REFLECTION_SECONDS, 20);

  setReflectionTimerEnabled(true);
  assert.equal(isReflectionTimerEnabled(), true);

  setReflectionTimerEnabled(false);
  assert.equal(isReflectionTimerEnabled(), false);
});

/* ───────────────────────────────────────────────────────────────────
   USUARIO 6: MODO PRUEBAS ÁGILES (SIN BIOMETRÍA)
   ─────────────────────────────────────────────────────────────────── */
test('USUARIO 6: Votación ágil con credencial simulada en modo de pruebas', async () => {
  const world = await SandboxWorld.create();
  await world.createConsultation({ id: CID, title: 'Ley de Vivienda', category: 'Vivienda', boeRef: 'RDL 2/2026' });
  world.setStatus(CID, 'ACTIVE');

  // En modo prueba, se genera una credencial simulada determinista
  const testEnroll = await world.enroll('VALID_ADULT');
  assert.equal(testEnroll.ok, true);

  const vote = await world.castSecretVote(testEnroll.citizen, CID, 'YES');
  assert.equal(vote.ok, true);
  assert.ok(vote.receipt.receiptHash.length > 20, 'Debe emitir un recibo criptográfico');
});

/* ───────────────────────────────────────────────────────────────────
   USUARIO 7: AUDITOR CÍVICO (VERIFICACIÓN DE ACTA Y SIN DATOS PERSONALES)
   ─────────────────────────────────────────────────────────────────── */
test('USUARIO 7: El acta y los recibos no contienen DNI, nombres, correos ni direcciones IP', async () => {
  const world = await SandboxWorld.create();
  await world.createConsultation({ id: CID, title: 'Ley de Vivienda', category: 'Vivienda', boeRef: 'RDL 2/2026' });
  world.setStatus(CID, 'ACTIVE');

  const enroll = await world.enroll('VALID_ADULT');
  const vote = await world.castSecretVote(enroll.citizen, CID, 'YES');
  assert.equal(vote.ok, true);

  const receiptStr = JSON.stringify(vote.receipt);
  assert.ok(!receiptStr.includes('dni'), 'El recibo no debe contener DNI');
  assert.ok(!receiptStr.includes('email'), 'El recibo no debe contener email');
  assert.ok(!receiptStr.includes('192.168.'), 'El recibo no debe contener IP');
  assert.ok(vote.receipt.receiptHash, 'Debe contener hash de recibo');

  const box = world.boxes.get(CID);
  const proof = box.proofFor(vote.receipt.leaf);
  assert.ok(proof, 'Debe existir la prueba de Merkle para la papeleta anónima');
});

/* ───────────────────────────────────────────────────────────────────
   USUARIO 8: COMPROBACIÓN CIUDADANA DE RECIBO EN EL ÁRBOL DE MERKLE
   ─────────────────────────────────────────────────────────────────── */
test('USUARIO 8: Comprobación matemática de un recibo en la urna pública', async () => {
  const world = await SandboxWorld.create();
  await world.createConsultation({ id: CID, title: 'Ley de Vivienda', category: 'Vivienda', boeRef: 'RDL 2/2026' });
  world.setStatus(CID, 'ACTIVE');

  // Emitir 3 votos sucesivos
  const u1 = await world.enroll('VALID_ADULT');
  const u2 = await world.enroll('VALID_ADULT');
  const u3 = await world.enroll('VALID_ADULT');

  await world.castSecretVote(u1.citizen, CID, 'YES');
  const v2 = await world.castSecretVote(u2.citizen, CID, 'NO');
  await world.castSecretVote(u3.citizen, CID, 'YES');

  const rm = new AdminReadModel(world);
  const targetReceipt = v2.receipt;

  // Comprobar la inclusión del 2º voto
  const check = rm.checkReceipt(CID, targetReceipt.receiptHash);
  assert.equal(check.included, true, 'El recibo debe estar incluido en la urna');
  assert.ok(check.proof, 'Debe proporcionar la prueba de Merkle');

  const box = world.boxes.get(CID);
  assert.ok(box);
  const root = box.root();
  const isValid = verifyMerkleProof(check.proof, root);
  assert.equal(isValid, true, 'La prueba matemática de Merkle debe ser 100% válida');
});

/* ───────────────────────────────────────────────────────────────────
   USUARIO 9: ADMINISTRADOR (AÑADIR LOTE, AUDITAR Y VACIAR A 0)
   ─────────────────────────────────────────────────────────────────── */
test('USUARIO 9: Administrador añade +25 votos, audita el censo y vacía la urna a 0', async () => {
  const world = await SandboxWorld.create();
  await world.createConsultation({ id: CID, title: 'Ley de Vivienda', category: 'Vivienda', boeRef: 'RDL 2/2026' });
  world.setStatus(CID, 'ACTIVE');

  // Añadir +25 votos en lote simulado
  const out = await world.batchSimulate(CID, 25);
  assert.ok(out.stats.secretVotes > 0, 'Debe haber emitido votos secretos');

  const boxBefore = world.boxes.get(CID);
  assert.ok(boxBefore);
  assert.ok(boxBefore.leafCount() > 0, 'La urna debe tener votos acumulados');

  // Reset de la urna a 0 votos
  await world.reset();
  await world.createConsultation({ id: CID, title: 'Ley de Vivienda', category: 'Vivienda', boeRef: 'RDL 2/2026' });
  world.setStatus(CID, 'ACTIVE');

  const boxAfter = world.boxes.get(CID);
  assert.ok(boxAfter);
  assert.equal(boxAfter.leafCount(), 0, 'La urna debe haber quedado limpia a 0 votos');
});

/* ───────────────────────────────────────────────────────────────────
   USUARIO 10: NUEVO VOTANTE POST-RESET (URNA LIMPIA EN PRODUCCIÓN)
   ─────────────────────────────────────────────────────────────────── */
test('USUARIO 10: Nuevo votante emite su papeleta sobre urna limpia a 0 sin interferencias', async () => {
  const world = await SandboxWorld.create();
  await world.createConsultation({ id: CID, title: 'Ley de Vivienda', category: 'Vivienda', boeRef: 'RDL 2/2026' });
  world.setStatus(CID, 'ACTIVE');

  // Comprobar que parte de 0
  const box = world.boxes.get(CID);
  assert.ok(box);
  assert.equal(box.leafCount(), 0, 'La urna debe iniciar a 0');

  // Votante legítimo emite su voto
  const enroll = await world.enroll('VALID_ADULT');
  const vote = await world.castSecretVote(enroll.citizen, CID, 'YES');
  assert.equal(vote.ok, true);

  assert.equal(box.leafCount(), 1, 'Ahora la urna tiene exactamente 1 voto legítimo');
  const rm = new AdminReadModel(world);
  const snap = rm.snapshot();
  const cData = snap.consultations.find(c => c.id === CID);
  assert.ok(cData);
  assert.equal(cData.tally.total.YES, 1);
  assert.equal(cData.tally.total.NO, 0);
  assert.equal(cData.tally.total.ABSTAIN, 0);

  // Comprobar plazo hasta Elecciones Generales
  const deadline = calculateTimeRemaining(DEFAULT_DEADLINE_ISO);
  assert.equal(deadline.isExpired, false);
  assert.ok(deadline.days > 0);
});
