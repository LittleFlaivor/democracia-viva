/**
 * MOTOR DE DEMOCRACIA LÍQUIDA SEGURA (DYNAMIC ROLLUP & DAG RESOLVER)
 * Democracia Viva (democraciaviva.es)
 * 
 * Cumple con SPEC.md:
 * 1. Delegación temática por categoría (Vivienda, Economía, Sanidad, etc.).
 * 2. Validación de Grafo Acíclico Dirigido (DAG): Prevención de bucles (DFS).
 * 3. Hot-Override: Si un ciudadano vota directo, se descuenta de forma inmediata
 *    del peso del especialista para esa consulta concreta.
 * 4. Cómputo en tiempo real del peso efectivo (effective_weight).
 */

export interface SpecialistProfile {
  nullifier_hash: string;
  name_alias: string;                      // Alias público o institución (ej. "Consejo General de la Abogacía")
  category: string;                        // "vivienda", "economia", "sanidad", etc.
  public_credential_id: string;
  is_verified: boolean;
  registered_at: number;
}

export interface DynamicSpecialistTally {
  specialist_nullifier: string;
  alias: string;
  category: string;
  public_vote?: 'YES' | 'NO' | 'ABSTAIN';
  base_weight: number;                     // 1 (su propio voto)
  effective_delegated_weight: number;      // Número de delegadores activos
  total_effective_weight: number;          // base_weight + effective_delegated_weight
  delegators_count_total: number;          // Total en el grafo
  discounted_direct_voters_count: number;  // Descontados por voto directo en esta consulta
}

export class DynamicRollupEngine {
  // Especialistas por categoría: key = category -> Set<nullifier>
  private specialists = new Map<string, Map<string, SpecialistProfile>>();
  // Grafo de delegaciones por categoría: key = category -> Map<fromNullifier, toNullifier>
  private delegations = new Map<string, Map<string, string>>();

  constructor() {
    this.registerSpecialist('vivienda', {
      nullifier_hash: '0x_spec_vivienda_colectivo',
      name_alias: 'Observatorio Cívico de la Vivienda',
      category: 'vivienda',
      public_credential_id: 'cred_spec_vivienda_01',
      is_verified: true,
      registered_at: Date.now()
    });
    this.registerSpecialist('economia', {
      nullifier_hash: '0x_spec_economia_colectivo',
      name_alias: 'Gabinete de Economistas Colegiados',
      category: 'economia',
      public_credential_id: 'cred_spec_economia_01',
      is_verified: true,
      registered_at: Date.now()
    });
  }

  registerSpecialist(category: string, profile: SpecialistProfile): void {
    if (!this.specialists.has(category)) {
      this.specialists.set(category, new Map());
    }
    this.specialists.get(category)!.set(profile.nullifier_hash, profile);
  }

  getSpecialistsByCategory(category: string): SpecialistProfile[] {
    return Array.from(this.specialists.get(category)?.values() || []);
  }

  /**
   * Comprueba si añadir la arista from -> to generaría un ciclo en el grafo (DFS)
   */
  wouldCreateCycle(category: string, fromNullifier: string, toNullifier: string): boolean {
    if (fromNullifier === toNullifier) return true;
    const edges = this.delegations.get(category);
    if (!edges) return false;

    // Recorrido DFS desde toNullifier para comprobar si alcanza fromNullifier
    let current: string | undefined = toNullifier;
    const visited = new Set<string>();

    while (current && !visited.has(current)) {
      if (current === fromNullifier) return true;
      visited.add(current);
      current = edges.get(current);
    }

    return false;
  }

  /**
   * Establece una delegación temática con validación estricta de DAG
   */
  setDelegation(params: {
    category: string;
    fromNullifier: string;
    toNullifier: string | null; // null para revocar
  }): { ok: boolean; code?: string; error?: string } {
    const { category, fromNullifier, toNullifier } = params;

    if (!this.delegations.has(category)) {
      this.delegations.set(category, new Map());
    }
    const edges = this.delegations.get(category)!;

    // Caso revocación
    if (toNullifier === null) {
      edges.delete(fromNullifier);
      return { ok: true };
    }

    // Caso prevención de bucles
    if (this.wouldCreateCycle(category, fromNullifier, toNullifier)) {
      return {
        ok: false,
        code: 'CYCLE_DETECTED',
        error: 'Operación denegada: la delegación crearía un bucle circular cerrado en el grafo'
      };
    }

    edges.set(fromNullifier, toNullifier);
    return { ok: true };
  }

  /**
   * Resuelve el rollup dinámico de pesos para una consulta concreta.
   * Aplica Hot-Override: si el votante tiene status 'VOTED_DIRECT' en directVotersSet,
   * se le descuenta automáticamente del peso del especialista.
   */
  resolveDynamicRollup(params: {
    category: string;
    directVotersSet: Set<string>; // Nullifiers que votaron directo en la consulta
    specialistPublicVotes?: Map<string, 'YES' | 'NO' | 'ABSTAIN'>;
  }): {
    specialists: DynamicSpecialistTally[];
    delegatedVotesByCategory: { YES: number; NO: number; ABSTAIN: number; total: number };
    totalDiscountedOverrides: number;
  } {
    const { category, directVotersSet, specialistPublicVotes = new Map() } = params;
    const specsMap = this.specialists.get(category) || new Map();
    const edges = this.delegations.get(category) || new Map();

    const result: DynamicSpecialistTally[] = [];
    let totalDiscountedOverrides = 0;
    const delegatedVotes = { YES: 0, NO: 0, ABSTAIN: 0, total: 0 };

    for (const [specNullifier, profile] of specsMap.entries()) {
      const publicVote = specialistPublicVotes.get(specNullifier);
      let effectiveDelegated = 0;
      let totalDelegatorsInTree = 0;
      let discountedDirect = 0;

      // Buscar todos los delegadores cuyas cadenas convergen en este especialista
      for (const [from, _] of edges.entries()) {
        let curr: string | undefined = from;
        const chainVisited = new Set<string>();

        while (curr && !chainVisited.has(curr)) {
          chainVisited.add(curr);
          const next = edges.get(curr);
          if (next === specNullifier) {
            // Este ciudadano delega en este especialista
            totalDelegatorsInTree++;
            if (directVotersSet.has(from)) {
              // Hot-Override: Votó directo, se descuenta para esta consulta
              discountedDirect++;
              totalDiscountedOverrides++;
            } else {
              // Permanece en DELEGATED: suma su peso
              effectiveDelegated++;
            }
            break;
          }
          curr = next;
        }
      }

      const totalWeight = 1 + effectiveDelegated; // 1 (propio especialista) + delegados efectivos
      if (publicVote && delegatedVotes[publicVote] !== undefined) {
        delegatedVotes[publicVote] += totalWeight;
        delegatedVotes.total += totalWeight;
      }

      result.push({
        specialist_nullifier: specNullifier,
        alias: profile.name_alias,
        category,
        public_vote: publicVote,
        base_weight: 1,
        effective_delegated_weight: effectiveDelegated,
        total_effective_weight: totalWeight,
        delegators_count_total: totalDelegatorsInTree,
        discounted_direct_voters_count: discountedDirect
      });
    }

    return {
      specialists: result,
      delegatedVotesByCategory: delegatedVotes,
      totalDiscountedOverrides
    };
  }

  /**
   * Exporta las aristas del grafo para visualización SVG interactiva
   */
  getGraphEdges(category: string): Array<{ from: string; to: string }> {
    const edges = this.delegations.get(category);
    if (!edges) return [];
    return Array.from(edges.entries()).map(([from, to]) => ({
      from: from.slice(0, 10),
      to: to.slice(0, 10)
    }));
  }

  /**
   * Reset para Sandbox
   */
  resetSandbox(): void {
    this.delegations.clear();
  }
}
