/**
 * MOTOR DETERMINISTA DE DEMOCRACIA LÍQUIDA (GRAFO DAG)
 * Implementación en funciones puras de TypeScript estricto con:
 * 1. Detección y ruptura de delegaciones circulares (Anti-Cycle Engine)
 * 2. Cálculo exacto de peso electoral acumulado (Aritmética Entera Pura)
 * 3. Revocación instantánea en caliente (Hot-Override: Voto Directo > Delegación)
 */

import type { DelegationScope, VoteChoice } from '../types.ts';

export interface DirectedEdge {
  from: string; // ID del ciudadano delegador
  to: string;   // ID del delegado receptor
  scope: DelegationScope;
}

export interface DirectArticleVote {
  citizenId: string;
  articleId: string;
  choice: VoteChoice;
  timestamp: number;
}

export class LiquidDemocracyDAGEngine {
  /**
   * Comprueba si añadir una arista de delegación (from -> to) causaría un ciclo en el grafo.
   * Utiliza búsqueda en profundidad (DFS) para verificar si existe un camino desde 'to' hasta 'from'.
   * Si existe camino to -> ... -> from, añadir from -> to crearía un ciclo directed A -> ... -> A.
   */
  public static wouldCreateCycle(
    currentDelegations: Map<string, string>, // fromCitizenId -> toDelegateId
    fromCitizenId: string,
    toDelegateId: string
  ): boolean {
    if (fromCitizenId === toDelegateId) {
      return true; // Auto-delegación circular trivial
    }

    // Recorrido DFS partiendo desde 'toDelegateId'
    const visited = new Set<string>();
    const stack: string[] = [toDelegateId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === fromCitizenId) {
        return true; // Se encontró un ciclo
      }

      if (!visited.has(current)) {
        visited.add(current);
        const nextDelegate = currentDelegations.get(current);
        if (nextDelegate) {
          stack.push(nextDelegate);
        }
      }
    }

    return false;
  }

  /**
   * Intenta registrar una delegación en el mapa de delegaciones activas.
   * Si genera un ciclo, lanza un error tipado y mantiene el estado intacto.
   */
  public static setDelegation(
    delegations: Map<string, string>,
    fromCitizenId: string,
    toDelegateId: string | null
  ): { success: boolean; error?: string } {
    if (!toDelegateId) {
      // Revocación de delegación (voto propio no delegado)
      delegations.delete(fromCitizenId);
      return { success: true };
    }

    if (this.wouldCreateCycle(delegations, fromCitizenId, toDelegateId)) {
      return {
        success: false,
        error: 'ERROR_CIRCULAR_DELEGATION: La delegación solicitada generaría un bucle cerrado prohibido.'
      };
    }

    delegations.set(fromCitizenId, toDelegateId);
    return { success: true };
  }

  /**
   * Calcula el peso electoral acumulado para cada ciudadano o delegado
   * considerando una lista de ciudadanos, el mapa de delegaciones y
   * la lista de votos directos emitidos para un artículo específico (HOT-OVERRIDE).
   *
   * Invariante de Hot-Override:
   * Si el ciudadano U ha votado directamente en este artículo:
   *  - Su peso propio (=1) se asigna a su propio voto directo.
   *  - El peso transmitido hacia su delegado V para este artículo se anula (=0).
   *  - Los ciudadanos que delegaron en U (si no votaron directo) siguen acumulándose en U.
   */
  public static computeEffectiveWeightsForArticle(
    citizenIds: string[],
    delegations: Map<string, string>, // from -> to
    directVotesForArticle: Map<string, VoteChoice> // citizenId -> choice
  ): Map<string, number> {
    const weights = new Map<string, number>();

    // Inicializar cada ciudadano con su peso base discreto = 1 voto entero
    for (const id of citizenIds) {
      weights.set(id, 1);
    }

    // Mapa de delegación efectiva para este artículo concreto:
    // Si un ciudadano votó directamente, su arista saliente se corta para este artículo.
    const effectiveDelegations = new Map<string, string>();
    for (const [from, to] of delegations.entries()) {
      const hasVotedDirectly = directVotesForArticle.has(from);
      if (!hasVotedDirectly) {
        effectiveDelegations.set(from, to);
      }
      // Si votó directamente, su delegación queda anulada para este artículo
    }

    // Construcción del grafo DAG de delegación efectiva
    // Para asegurar el orden correcto sin recursión infinita,
    // realizamos ordenamiento topológico o propagación por niveles de hojas a raíces.
    const inDegree = new Map<string, number>();
    for (const id of citizenIds) {
      inDegree.set(id, 0);
    }

    for (const [, to] of effectiveDelegations.entries()) {
      inDegree.set(to, (inDegree.get(to) || 0) + 1);
    }

    // Identificar nodos que nadie delega en ellos (hojas del árbol inverso)
    const queue: string[] = [];
    for (const id of citizenIds) {
      if ((inDegree.get(id) || 0) === 0) {
        queue.push(id);
      }
    }

    // Propagar pesos en orden topológico (desde los que no reciben delegaciones hacia sus delegados)
    // Para que no se pierda transitividad en cadenas A -> B -> C
    const accumulatedContribution = new Map<string, number>();
    for (const id of citizenIds) {
      accumulatedContribution.set(id, 1); // 1 voto propio
    }

    // Enfoque determinista con resolución transitiva exacta:
    // Para cada ciudadano u que NO votó directo y delega en v:
    // Encontramos el delegado final en la cadena de delegaciones efectivas.
    // Si el delegado final votó directamente, recibe toda la acumulación de la cadena.
    const terminalDelegate = new Map<string, string>();
    for (const id of citizenIds) {
      let current = id;
      const visited = new Set<string>();

      while (effectiveDelegations.has(current) && !visited.has(current)) {
        visited.add(current);
        current = effectiveDelegations.get(current)!;
      }
      terminalDelegate.set(id, current);
    }

    // Reasignar pesos efectivos finales:
    // Quien vota (sea directamente un ciudadano o un delegado en el que se confió):
    // Recibe la suma de todos los ciudadanos cuyo terminalDelegate es él.
    const finalWeights = new Map<string, number>();
    for (const id of citizenIds) {
      finalWeights.set(id, 0);
    }

    for (const [citizenId, target] of terminalDelegate.entries()) {
      const currentTargetWeight = finalWeights.get(target) || 0;
      finalWeights.set(target, currentTargetWeight + 1);
    }

    return finalWeights;
  }
}
