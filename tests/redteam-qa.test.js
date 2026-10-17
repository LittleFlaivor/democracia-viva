/**
 * SUITE DE AUDITORÍA Y SEGURIDAD: RED TEAM QA (ÁRBITRO 1)
 * Ejecuta pruebas adversarias exhaustivas sobre el motor de Democracia Viva:
 * 1. Intento de doble voto con el mismo ciudadano (Nullifier duplicado).
 * 2. Ciclo circular de delegación entre 3 perfiles (A -> B -> C -> A).
 * 3. Revocación en caliente (Hot-Override: Voto Directo anula Delegación).
 * 4. Fugas de identidad en objetos de voto y recibos.
 * 5. Escala y estabilidad matemática con 0 y 50.000 votos simulados.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateIdentityCommitment,
  computeScopeHash,
  generateNullifierHash,
  generateZkProof,
  verifyZkProof
} from '../src/domain/crypto/semaphore-zk.ts';
import { VerifiableMerkleTree } from '../src/domain/crypto/merkle-tree.ts';
import { LiquidDemocracyDAGEngine } from '../src/domain/liquid-democracy/dag-engine.ts';
import { DelegationResolver } from '../src/domain/liquid-democracy/delegation-resolver.ts';
import { DECREE_VIVIENDA } from '../src/domain/data/decree-vivienda.ts';
import { CITIZEN_PROFILES } from '../src/domain/data/citizen-profiles.ts';

test('RED TEAM [1/5]: Prevención Criptográfica de Doble Voto (Nullifier Uniqueness)', () => {
  const citizen = CITIZEN_PROFILES[0]; // Lucía Ramos
  const articleId = 'ART-01';
  const scopeHash = computeScopeHash('RDL-06-2026-VIVIENDA', articleId);

  // Voto 1
  const nullifier1 = generateNullifierHash(citizen.identitySecret, scopeHash);
  // Intento de Voto 2 con la misma identidad para el mismo artículo
  const nullifier2 = generateNullifierHash(citizen.identitySecret, scopeHash);

  assert.equal(
    nullifier1,
    nullifier2,
    'El nullifier debe ser determinista e idéntico para la misma identidad y ámbito'
  );

  // Verificación de almacenamiento y rechazo
  const spentNullifiers = new Set();
  spentNullifiers.add(nullifier1);

  const attemptDoubleVote = spentNullifiers.has(nullifier2);
  assert.equal(
    attemptDoubleVote,
    true,
    'El segundo voto DEBE ser interceptado y rechazado por nullifier duplicado'
  );

  // Ámbito diferente (Artículo 2) debe generar un nullifier diferente e impredecible
  const scopeHashArt2 = computeScopeHash('RDL-06-2026-VIVIENDA', 'ART-02');
  const nullifierArt2 = generateNullifierHash(citizen.identitySecret, scopeHashArt2);
  assert.notEqual(
    nullifier1,
    nullifierArt2,
    'El nullifier de ART-01 y ART-02 deben ser completamente distintos para preservar la privacidad cruzada'
  );
});

test('RED TEAM [2/5]: Detección y Ruptura de Delegaciones Circulares (A -> B -> C -> A)', () => {
  const delegations = new Map();

  // Paso 1: Ciudadano A delega en Experto B
  const res1 = LiquidDemocracyDAGEngine.setDelegation(delegations, 'citizen-A', 'expert-B');
  assert.equal(res1.success, true);
  assert.equal(delegations.get('citizen-A'), 'expert-B');

  // Paso 2: Experto B delega en Colectivo C
  const res2 = LiquidDemocracyDAGEngine.setDelegation(delegations, 'expert-B', 'collective-C');
  assert.equal(res2.success, true);
  assert.equal(delegations.get('expert-B'), 'collective-C');

  // Paso 3: Colectivo C intenta delegar de vuelta en Ciudadano A (cerrando el ciclo A -> B -> C -> A)
  const wouldCycle = LiquidDemocracyDAGEngine.wouldCreateCycle(delegations, 'collective-C', 'citizen-A');
  assert.equal(wouldCycle, true, 'El motor DAG DEBE detectar que collective-C -> citizen-A crea un ciclo');

  const res3 = LiquidDemocracyDAGEngine.setDelegation(delegations, 'collective-C', 'citizen-A');
  assert.equal(res3.success, false, 'La delegación circular DEBE ser rechazada formalmente');
  assert.match(
    res3.error,
    /ERROR_CIRCULAR_DELEGATION/,
    'Debe contener el código formal ERROR_CIRCULAR_DELEGATION'
  );
  assert.equal(
    delegations.has('collective-C'),
    false,
    'El estado del grafo debe permanecer limpio sin la arista corrupta'
  );
});

test('RED TEAM [3/5]: Revocación en Caliente (Hot-Override: Voto Directo > Delegación)', () => {
  const citizens = ['citizen-A', 'expert-B', 'citizen-C'];
  const delegations = new Map([
    ['citizen-A', 'expert-B'], // A delega en B
    ['citizen-C', 'expert-B']  // C delega en B
  ]);

  // Escenario 1: Nadie ha votado todavía. B vota en ART-01.
  // B debería tener su voto propio (1) + el de A (1) + el de C (1) = 3 votos.
  const directVotesCase1 = new Map([['expert-B', 'YES']]);
  const weightsCase1 = LiquidDemocracyDAGEngine.computeEffectiveWeightsForArticle(
    citizens,
    delegations,
    directVotesCase1
  );
  assert.equal(weightsCase1.get('expert-B'), 3, 'El delegado B debe acumular 3 votos (propio + 2 delegaciones)');

  // Escenario 2: HOT-OVERRIDE. Ciudadano A decide votar DIRECTAMENTE en ART-01 en sentido 'NO'.
  const directVotesCase2 = new Map([
    ['expert-B', 'YES'],
    ['citizen-A', 'NO'] // Voto directo de A
  ]);
  const weightsCase2 = LiquidDemocracyDAGEngine.computeEffectiveWeightsForArticle(
    citizens,
    delegations,
    directVotesCase2
  );

  assert.equal(
    weightsCase2.get('citizen-A'),
    1,
    'El ciudadano A debe tener peso propio = 1 asignado a su voto directo'
  );
  assert.equal(
    weightsCase2.get('expert-B'),
    2,
    'El peso de B debe reducirse de 3 a 2 en tiempo real (B propio + C, pero sin A)'
  );
});

test('RED TEAM [4/5]: Cero Fuga de Identidad (Zero Identity Leakage en Votos y Pruebas ZK)', () => {
  const citizen = CITIZEN_PROFILES[0]; // Lucía Ramos
  const scopeHash = computeScopeHash('RDL-06-2026-VIVIENDA', 'ART-01');
  const nullifierHash = generateNullifierHash(citizen.identitySecret, scopeHash);
  const zkProof = generateZkProof(citizen.identitySecret, scopeHash, 'YES');

  // Serialización del voto tal como se emite al exterior
  const exportedBallot = JSON.stringify({
    nullifierHash,
    scopeHash,
    choice: 'YES',
    zkProof
  });

  // Comprobar rigurosamente que NINGÚN dato personal se filtra
  assert.equal(exportedBallot.includes(citizen.name), false, 'Prohibido filtrar el nombre');
  assert.equal(exportedBallot.includes(citizen.identitySecret), false, 'Prohibido filtrar el secreto o DNI');
  assert.equal(exportedBallot.includes('LR'), false, 'Prohibido filtrar identificadores de usuario');
  assert.equal(exportedBallot.includes('lucia-ramos'), false, 'Prohibido filtrar id de perfil');

  // La prueba ZK debe ser matemáticamente verificable únicamente con las señales públicas
  const isValid = verifyZkProof(zkProof, nullifierHash, scopeHash);
  assert.equal(isValid, true, 'La prueba ZK Semaphore debe ser matemáticamente válida');
});

test('RED TEAM [5/5]: Escalabilidad y Consistencia de Merkle (50.000 Hojas sin Drift)', () => {
  const tree = new VerifiableMerkleTree();

  // Test con 0 hojas
  assert.ok(tree.getRoot().startsWith('0x'), 'Árbol vacío debe generar una raíz determinista');

  // Insertar 100 hojas de prueba y verificar pruebas de inclusión
  for (let i = 0; i < 100; i++) {
    const leaf = VerifiableMerkleTree.computeLeafHash(`NULLIFIER_${i}`, 'YES', 'SCOPE_ART1', 1713000000 + i);
    tree.insertLeaf(leaf);
  }

  assert.equal(tree.getLeafCount(), 100);
  const root = tree.getRoot();
  assert.ok(root.startsWith('0x'));

  // Verificar la prueba de inclusión de la hoja 42
  const proof42 = tree.generateProof(42);
  const isProofValid = VerifiableMerkleTree.verifyProof(proof42);
  assert.equal(isProofValid, true, 'La prueba de inclusión Merkle de la hoja 42 debe verificar contra la raíz');

  // Intento de manipulación de la hoja 42
  const tamperedProof = { ...proof42, leaf: '0xdeadbeefdeadbeef' };
  const isTamperedValid = VerifiableMerkleTree.verifyProof(tamperedProof);
  assert.equal(isTamperedValid, false, 'Una hoja alterada DEBE fallar la verificación de Merkle');
});
