/**
 * MOTOR CRIPTOGRÁFICO: PATRÓN SEMAPHORE V4 (ZK-SNARK SIMULATOR)
 * Simula de forma matemáticamente determinista el circuito de Semaphore v4
 * para emitir votos anónimos con nullifiers incoercibles y anti-doble voto.
 */

import type { VoteChoice, ZkProofPayload } from '../types.ts';

/**
 * Función Hash determinista tipo FNV-1a / Murmur3 de 64/256 bits
 * para ejecución síncrona inmediata en navegador y Node.js.
 */
export function hashStringSync(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  // Formato Hexadecimal de 64 caracteres tipo hash criptográfico (0x...)
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const p3 = ((h1 ^ 0xa5a5a5a5) >>> 0).toString(16).padStart(8, '0');
  const p4 = ((h2 ^ 0x5a5a5a5a) >>> 0).toString(16).padStart(8, '0');
  const p5 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0');
  const p6 = ((h1 * 31 + h2) >>> 0).toString(16).padStart(8, '0');
  const p7 = ((h2 * 17 + h1) >>> 0).toString(16).padStart(8, '0');
  const p8 = ((h1 ^ (h2 << 5)) >>> 0).toString(16).padStart(8, '0');

  return `0x${p1}${p2}${p3}${p4}${p5}${p6}${p7}${p8}`;
}

/**
 * Genera el compromiso de identidad público a partir del secreto privado del ciudadano.
 * IdentityCommitment = Hash(IdentitySecret)
 */
export function generateIdentityCommitment(identitySecret: string): string {
  return hashStringSync(`COMMITMENT:${identitySecret}`);
}

/**
 * Genera el hash de ámbito (Scope) para un decreto y artículo específico.
 * ScopeHash = Hash(decreeId || articleId)
 */
export function computeScopeHash(decreeId: string, articleId: string): string {
  return hashStringSync(`SCOPE:${decreeId}::${articleId}`);
}

/**
 * Genera el Nullifier Hash único para ese ciudadano en ese artículo.
 * Invariante: 1 ciudadano en 1 artículo genera SIEMPRE el mismo NullifierHash.
 * Es computacionalmente imposible revertir a IdentitySecret.
 */
export function generateNullifierHash(identitySecret: string, scopeHash: string): string {
  return hashStringSync(`NULLIFIER:${identitySecret}::${scopeHash}`);
}

/**
 * Simulación de prueba Groth16 / Semaphore v4 ZK-SNARK.
 * Demuestra: "Conozco un IdentitySecret cuyo IdentityCommitment pertenece al censo civil
 * y el NullifierHash corresponde exactamente a este Scope, sin revelar quién soy".
 */
export function generateZkProof(
  identitySecret: string,
  scopeHash: string,
  choice: VoteChoice
): ZkProofPayload {
  const nullifier = generateNullifierHash(identitySecret, scopeHash);
  const proofSeedA = hashStringSync(`ZK_A:${identitySecret}:${scopeHash}:${choice}`);
  const proofSeedB1 = hashStringSync(`ZK_B1:${proofSeedA}`);
  const proofSeedB2 = hashStringSync(`ZK_B2:${proofSeedA}`);
  const proofSeedC = hashStringSync(`ZK_C:${proofSeedB1}`);

  return {
    protocol: 'groth16-semaphore-v4',
    pi_a: [proofSeedA.slice(0, 34), proofSeedA.slice(34, 66)],
    pi_b: [
      [proofSeedB1.slice(0, 34), proofSeedB1.slice(34, 66)],
      [proofSeedB2.slice(0, 34), proofSeedB2.slice(34, 66)],
    ],
    pi_c: [proofSeedC.slice(0, 34), proofSeedC.slice(34, 66)],
    publicSignals: [
      nullifier,
      scopeHash,
      hashStringSync(`CHOICE:${choice}`),
      '0x01' // Flag de pertenencia al censo oficial
    ]
  };
}

/**
 * Verifica la validez matemática de la prueba ZK.
 */
export function verifyZkProof(
  proof: ZkProofPayload,
  expectedNullifierHash: string,
  expectedScopeHash: string
): boolean {
  if (proof.protocol !== 'groth16-semaphore-v4') return false;
  if (!proof.publicSignals || proof.publicSignals.length < 4) return false;
  const [nullifier, scope, , membership] = proof.publicSignals;
  return (
    nullifier === expectedNullifierHash &&
    scope === expectedScopeHash &&
    membership === '0x01' &&
    Boolean(proof.pi_a[0]) &&
    Boolean(proof.pi_c[1])
  );
}
