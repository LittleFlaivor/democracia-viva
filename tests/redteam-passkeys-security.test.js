/**
 * SUITE DE AUDITORÍA ADVERSARIA: RED TEAM QA (ÁRBITRO 1)
 * Prueba de penetración y resistencia sobre el subsistema de Passkeys,
 * Nulificador Criptográfico e Inmutabilidad de Urna (Democracia Viva).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateDeterministicNullifier,
  registerPasskey,
  sha256Sync,
  clearLocalCitizenCredential
} from '../src/services/auth.ts';
import {
  commitImmutableVote,
  hasNullifierVoted,
  clearLocalSealedVotesCache
} from '../src/services/firestore-voting.ts';
import { GameStore } from '../src/state/game-store.ts';

test('RED TEAM [PASSKEY-1]: Prevención Estricta de Ataque de Repetición y Doble Voto', async () => {
  clearLocalSealedVotesCache();
  const credentialId = `test_cred_alice_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const proposalId = 'RDL-06-2026-VIVIENDA::ART-01';

  // 1. Primer cálculo de nullifier
  const nullifier1 = generateDeterministicNullifier(credentialId, proposalId);
  assert.ok(nullifier1.startsWith('0x'), 'El nullifier debe ser un hash hexadecimal seguro 0x...');

  // 2. Intento de calcular un segundo voto por el mismo ciudadano en la misma propuesta
  const nullifier2 = generateDeterministicNullifier(credentialId, proposalId);
  assert.equal(
    nullifier1,
    nullifier2,
    'El nullifier DEBE ser estrictamente determinista e idéntico para la misma credencial y propuesta'
  );

  // 3. Emisión del primer voto legítimo
  const votePayload1 = {
    nullifierHash: nullifier1,
    proposalId,
    choice: 'YES',
    timestamp: Date.now(),
    clientSignature: 'sig_hardware_enclave_01',
    merkleLeaf: 'leaf_01',
    txHash: 'tx_01',
    receiptId: 'REC-TEST-01',
    merkleRoot: 'root_01'
  };

  const res1 = await commitImmutableVote(votePayload1);
  assert.equal(res1.success, true, 'El primer voto debe ser aceptado y registrado en la urna');

  // 4. Intento de re-emisión / Replay Attack con idéntico payload
  const resReplay = await commitImmutableVote(votePayload1);
  assert.equal(resReplay.success, false, 'El ataque de repetición DEBE ser bloqueado');
  assert.match(
    resReplay.error || '',
    /ERROR_NULLIFIER_ALREADY_SPENT/,
    'Debe retornar el código formal de nulificador ya gastado'
  );

  // 5. Intento de cambio de voto (de YES a NO) con el mismo ciudadano
  const votePayloadDoubleVote = {
    ...votePayload1,
    choice: 'NO'
  };
  const resDoubleVote = await commitImmutableVote(votePayloadDoubleVote);
  assert.equal(resDoubleVote.success, false, 'El cambio de voto o voto doble DEBE ser bloqueado');
  assert.match(resDoubleVote.error || '', /ERROR_NULLIFIER_ALREADY_SPENT/);
});

test('RED TEAM [PASSKEY-2]: Incorrelacionabilidad Cruzada entre Propuestas Distintas', () => {
  const credentialId = `test_cred_charlie_${Date.now()}`;
  const proposalArt1 = 'RDL-06-2026-VIVIENDA::ART-01';
  const proposalArt2 = 'RDL-06-2026-VIVIENDA::ART-02';

  const nullifierArt1 = generateDeterministicNullifier(credentialId, proposalArt1);
  const nullifierArt2 = generateDeterministicNullifier(credentialId, proposalArt2);

  assert.notEqual(
    nullifierArt1,
    nullifierArt2,
    'Los nullifiers de diferentes artículos deben ser completamente dispares para el mismo ciudadano'
  );

  // Asegurar que no hay prefijos ni sufijos comunes que permitan correlacionar votos del mismo usuario
  const slice1 = nullifierArt1.slice(2, 18);
  const slice2 = nullifierArt2.slice(2, 18);
  assert.notEqual(slice1, slice2, 'Imposible perfilar o agrupar votos por coincidencia de fragmentos de hash');
});

test('RED TEAM [PASSKEY-3]: Blindaje Absoluto contra Rollback (Anti-Deshacer en GameStore)', async () => {
  clearLocalSealedVotesCache();
  clearLocalCitizenCredential();
  const gameStore = GameStore.getInstance();
  gameStore.resetGame();

  const currentCard = gameStore.getCurrentCard();
  assert.ok(currentCard, 'Debe haber una carta activa en el mazo');

  // Registrar voto con passkey
  const fakeCred = {
    credentialId: `cred_immutable_test_${Date.now()}`,
    publicKey: 'pubkey_immutable_999',
    algorithm: -7,
    createdAt: Date.now(),
    deviceType: 'Enclave Hardware Seguro',
    dnieVerified: true
  };

  const voteRes = await gameStore.playDecision('YES', fakeCred);
  assert.equal(voteRes.success, true);

  // Intentar ejecutar rollback / deshacer
  const undoResult = gameStore.undoDecision();
  assert.equal(
    undoResult,
    false,
    'CRÍTICO: undoDecision() DEBE retornar false cuando el voto ha sido sellado de forma inmutable'
  );

  // Verificar que la decisión sigue registrada y no ha sido borrada
  const decisions = gameStore.getDecisions();
  assert.equal(
    decisions[currentCard.id],
    'YES',
    'El voto en el almacén de estado NO puede ser borrado tras su emisión'
  );
});

test('RED TEAM [PASSKEY-4]: Validación Estricta del Esquema de Voto (Anti-Tampering)', async () => {
  // Caso A: Elección no válida
  const tamperedChoiceVote = {
    nullifierHash: `0xtampered_nullifier_${Date.now()}`,
    proposalId: 'RDL-06-2026-VIVIENDA::ART-01',
    choice: 'HACK_ELECTION',
    timestamp: Date.now()
  };
  const resChoice = await commitImmutableVote(tamperedChoiceVote);
  assert.equal(resChoice.success, false, 'Voto con opción arbitraria debe ser rechazado');

  // Caso B: Falta de nullifierHash
  const missingNullifierVote = {
    proposalId: 'RDL-06-2026-VIVIENDA::ART-01',
    choice: 'YES',
    timestamp: Date.now()
  };
  const resMissing = await commitImmutableVote(missingNullifierVote);
  assert.equal(resMissing.success, false, 'Voto sin nullifierHash debe ser rechazado');
});
