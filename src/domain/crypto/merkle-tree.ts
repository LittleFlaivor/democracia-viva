/**
 * MOTOR DE ÁRBOL DE MERKLE VERIFICABLE
 * Estructura criptográfica para almacenar votos de forma inmutable,
 * generar raíces de Merkle en tiempo real y emitir pruebas de inclusión auditables.
 */

import type { MerkleProof, MerkleSibling, VoteChoice } from '../types.ts';
import { hashStringSync } from './semaphore-zk.ts';

export class VerifiableMerkleTree {
  private leaves: string[] = [];

  constructor(initialLeaves: string[] = []) {
    this.leaves = [...initialLeaves];
  }

  /**
   * Calcula el hash canónico de una hoja de voto:
   * Leaf = Hash(NullifierHash || Choice || ScopeHash || Timestamp)
   */
  public static computeLeafHash(
    nullifierHash: string,
    choice: VoteChoice,
    scopeHash: string,
    timestamp: number
  ): string {
    return hashStringSync(`LEAF::${nullifierHash}::${choice}::${scopeHash}::${timestamp}`);
  }

  /**
   * Combina dos nodos hermanos de Merkle:
   * Parent = Hash(Left || Right)
   */
  public static combineHashes(left: string, right: string): string {
    return hashStringSync(`NODE::${left}::${right}`);
  }

  /**
   * Añade una hoja y recalcula la raíz. Retorna la raíz y el índice asignado.
   */
  public insertLeaf(leaf: string): { root: string; leafIndex: number } {
    const leafIndex = this.leaves.length;
    this.leaves.push(leaf);
    return {
      root: this.getRoot(),
      leafIndex
    };
  }

  /**
   * Retorna el número de hojas registradas.
   */
  public getLeafCount(): number {
    return this.leaves.length;
  }

  /**
   * Retorna todas las hojas registradas.
   */
  public getLeaves(): string[] {
    return [...this.leaves];
  }

  /**
   * Obtiene la raíz de Merkle actual.
   * Si no hay hojas, retorna un hash vacío estándar.
   */
  public getRoot(): string {
    if (this.leaves.length === 0) {
      return hashStringSync('EMPTY_MERKLE_ROOT');
    }

    let currentLevel = [...this.leaves];

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        // Si el número de nodos es impar, se duplica el último nodo
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        nextLevel.push(VerifiableMerkleTree.combineHashes(left, right));
      }
      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  /**
   * Genera la prueba de inclusión de Merkle para la hoja en el índice dado.
   */
  public generateProof(leafIndex: number): MerkleProof {
    if (leafIndex < 0 || leafIndex >= this.leaves.length) {
      throw new Error(`Índice de hoja fuera de rango: ${leafIndex}`);
    }

    const leaf = this.leaves[leafIndex];
    const siblings: MerkleSibling[] = [];

    let currentLevel = [...this.leaves];
    let currentIndex = leafIndex;

    while (currentLevel.length > 1) {
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < currentLevel.length) {
        siblings.push({
          hash: currentLevel[siblingIndex],
          position: isRightNode ? 'left' : 'right'
        });
      } else {
        // En caso de longitud impar, el hermano es el propio nodo
        siblings.push({
          hash: currentLevel[currentIndex],
          position: 'right'
        });
      }

      // Avanzar al siguiente nivel
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        nextLevel.push(VerifiableMerkleTree.combineHashes(left, right));
      }

      currentIndex = Math.floor(currentIndex / 2);
      currentLevel = nextLevel;
    }

    return {
      leaf,
      leafIndex,
      siblings,
      root: this.getRoot()
    };
  }

  /**
   * Función estática y pura para verificar una prueba de Merkle de forma independiente.
   * Cualquier ciudadano u observador independiente puede ejecutar esto sin confiar en el servidor.
   */
  public static verifyProof(proof: MerkleProof): boolean {
    let currentHash = proof.leaf;

    for (const sibling of proof.siblings) {
      if (sibling.position === 'left') {
        currentHash = VerifiableMerkleTree.combineHashes(sibling.hash, currentHash);
      } else {
        currentHash = VerifiableMerkleTree.combineHashes(currentHash, sibling.hash);
      }
    }

    return currentHash === proof.root;
  }
}
