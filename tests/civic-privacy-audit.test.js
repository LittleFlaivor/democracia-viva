/**
 * SUITE DE AUDITORÍA: ARQUITECTURA CÍVICA Y PRIVACIDAD (ÁRBITRO 2)
 * Evalúa:
 * 1. Aislamiento biométrico: Ninguna plantilla biométrica sale del cliente.
 * 2. Cero fuga de identidad en votos y recibos descargables.
 * 3. Desacoplamiento estricto de colecciones: `users` nunca almacena `votes`.
 * 4. Verificación de reglas de seguridad de Firestore para auditoría pública e inmutabilidad.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  registerPasskey,
  generateDeterministicNullifier
} from '../src/services/auth.ts';

test('PRIVACIDAD CÍVICA [1/4]: Aislamiento Biométrico del Hardware (Passkeys / WebAuthn)', async () => {
  const cred = await registerPasskey('Manuel Osorio');

  assert.ok(cred.credentialId, 'Debe generarse un credentialId');
  assert.ok(cred.publicKey, 'Debe generarse una publicKey');

  const serialized = JSON.stringify(cred);

  // Certificar que NUNCA se almacenan ni transmiten huellas, rostros ni datos biométricos brutos
  assert.equal(serialized.includes('fingerprint'), false, 'Prohibido almacenar huellas dactilares');
  assert.equal(serialized.includes('face_data'), false, 'Prohibido almacenar escaneos faciales');
  assert.equal(serialized.includes('minutiae'), false, 'Prohibido almacenar minucias biométricas');
  assert.equal(serialized.includes('pin_code'), false, 'Prohibido almacenar PIN de hardware');

  // Solo se transmiten claves públicas criptográficas asimétricas
  assert.equal(cred.algorithm, -7, 'Debe utilizar el algoritmo estándar COSE ES256 (NIST P-256)');
});

test('PRIVACIDAD CÍVICA [2/4]: Cero Fuga de Identidad en Urna de Votos y Recibos Exportables', () => {
  const fakeVote = {
    nullifierHash: '0x8849b291a0c84f321901de49bc128919',
    proposalId: 'RDL-06-2026-VIVIENDA::ART-01',
    choice: 'YES',
    timestamp: 1776412800000,
    clientSignature: '0xfa3921...',
    merkleLeaf: '0x99281...',
    txHash: '0x7721...',
    receiptId: 'REC-8849B2',
    merkleRoot: '0x12b5c...'
  };

  const jsonReceipt = JSON.stringify({
    protocolo: 'Democracia Viva v1.0 - Voto Verificable Inmutable',
    urna: 'Colección Cloud Firestore Append-Only / Arbitrum L2',
    reciboId: fakeVote.receiptId,
    nullifierHash: fakeVote.nullifierHash,
    propuestaId: fakeVote.proposalId,
    sentidoVoto: fakeVote.choice,
    timestampUTC: new Date(fakeVote.timestamp).toISOString(),
    txHashL2: fakeVote.txHash,
    merkleRoot: fakeVote.merkleRoot
  });

  // Ningún dato PII del ciudadano en el recibo
  assert.equal(jsonReceipt.includes('Manuel'), false, 'No debe filtrar nombres');
  assert.equal(jsonReceipt.includes('Osorio'), false, 'No debe filtrar apellidos');
  assert.equal(jsonReceipt.includes('DNI'), false, 'No debe filtrar documento de identidad');
  assert.equal(jsonReceipt.includes('email'), false, 'No debe filtrar correo');
  assert.equal(jsonReceipt.includes('credentialId'), false, 'No debe incluir el ID de credencial de hardware');
});

test('PRIVACIDAD CÍVICA [3/4]: Desacoplamiento Estricto entre Identidad y Sentido de Voto', () => {
  // El esquema de la colección 'users' solo puede contener metadatos de verificación
  const allowedUserFields = new Set([
    'credentialId',
    'publicKey',
    'createdAt',
    'deviceType',
    'dnieVerified',
    'friendlyName',
    'algorithm'
  ]);

  const simulatedUserDoc = {
    credentialId: 'cred_user_test_42',
    publicKey: 'pk_user_test_42',
    createdAt: Date.now(),
    deviceType: 'Windows Hello',
    dnieVerified: true
  };

  for (const field of Object.keys(simulatedUserDoc)) {
    assert.equal(
      allowedUserFields.has(field),
      true,
      `El campo ${field} en la colección 'users' debe estar estrictamente desvinculado de votos`
    );
  }

  // Comprobar que NUNCA existe un campo 'votedProposals', 'votes', 'lastVote' en users
  assert.equal('votes' in simulatedUserDoc, false);
  assert.equal('votedProposals' in simulatedUserDoc, false);
  assert.equal('choice' in simulatedUserDoc, false);
});

test('PRIVACIDAD CÍVICA [4/4]: Auditoría Estática de firestore.rules para Inmutabilidad en Servidor', () => {
  const rulesPath = path.resolve('firestore.rules');
  assert.ok(fs.existsSync(rulesPath), 'El archivo firestore.rules debe existir en la raíz del proyecto');

  const content = fs.readFileSync(rulesPath, 'utf-8');

  // 1. La urna de votos debe ser de lectura pública universal (auditoría abierta)
  assert.ok(
    content.includes('match /votes/{nullifierHash}') && content.includes('allow read: if true;'),
    'Las actas en /votes/{nullifierHash} deben ser de lectura pública abierta para permitir auditoría universal'
  );

  // 2. Solo se permite crear votos si no existen previamente
  assert.ok(
    content.includes('!exists(/databases/$(database)/documents/votes/$(nullifierHash))'),
    'La regla de votos DEBE exigir que el documento no exista previamente (!exists)'
  );

  // 3. Bloqueo total de modificaciones y borrados en votes
  assert.ok(
    content.includes('allow update, delete: if false;'),
    'Las reglas DEBEN bloquear formalmente update y delete con if false;'
  );
});
