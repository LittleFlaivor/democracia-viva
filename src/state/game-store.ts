/**
 * GESTOR DE ESTADO DEL JUEGO CÍVICO (GAMIFIED STORE V2)
 * Controla el ciclo del mazo de cartas, los barómetros HUD en tiempo real,
 * la delegación táctil y la transición cinemática hacia el Puente de Consenso.
 */

import { CivicAppStore } from './store.ts';
import { GAMIFIED_DECK, GamifiedCard } from '../domain/data/gamified-deck.ts';
import { VoteChoice } from '../domain/types.ts';

export type GameDecision = 'YES' | 'NO' | 'DELEGATE';

export interface HudMetrics {
  tenantStability: number;   // 0 - 100%
  landlordSecurity: number;  // 0 - 100%
  nationalConsensus: number; // 0 - 100%
  lastDelta?: {
    tenant: number;
    landlord: number;
    consensus: number;
  };
}

export class GameStore {
  private static instance: GameStore;
  private civicStore: CivicAppStore;

  private currentCardIndex: number = 0;
  private decisions: Record<string, GameDecision> = {};
  private hudMetrics: HudMetrics = {
    tenantStability: 48,
    landlordSecurity: 52,
    nationalConsensus: 64
  };
  private isEurekaRevealed: boolean = false;
  private activeDilemmaCard: GamifiedCard | null = null;
  private activeBoeCard: GamifiedCard | null = null;
  private activeMonographCard: GamifiedCard | null = null;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.civicStore = CivicAppStore.getInstance();
    this.syncWithProfile();
  }

  public static getInstance(): GameStore {
    if (!GameStore.instance) {
      GameStore.instance = new GameStore();
    }
    return GameStore.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Error en listener de GameStore:', err);
      }
    }
  }

  private syncWithProfile() {
    const profile = this.civicStore.getActiveCitizen();
    if (profile.category === 'inquilino') {
      this.hudMetrics = { tenantStability: 42, landlordSecurity: 55, nationalConsensus: 62 };
    } else if (profile.category === 'propietario') {
      this.hudMetrics = { tenantStability: 56, landlordSecurity: 46, nationalConsensus: 65 };
    } else {
      this.hudMetrics = { tenantStability: 50, landlordSecurity: 50, nationalConsensus: 68 };
    }
  }

  public getCurrentCard(): GamifiedCard | null {
    if (this.currentCardIndex >= GAMIFIED_DECK.length) {
      return null;
    }
    return GAMIFIED_DECK[this.currentCardIndex];
  }

  public getNextCards(): GamifiedCard[] {
    return GAMIFIED_DECK.slice(this.currentCardIndex + 1);
  }

  public getCardIndex(): number {
    return this.currentCardIndex;
  }

  public getTotalCards(): number {
    return GAMIFIED_DECK.length;
  }

  public getHudMetrics(): HudMetrics {
    return { ...this.hudMetrics };
  }

  public isFinished(): boolean {
    return this.isEurekaRevealed || this.currentCardIndex >= GAMIFIED_DECK.length;
  }

  public getDecisions(): Record<string, GameDecision> {
    return { ...this.decisions };
  }

  public getActiveDilemmaCard(): GamifiedCard | null {
    return this.activeDilemmaCard;
  }

  public getActiveBoeCard(): GamifiedCard | null {
    return this.activeBoeCard;
  }

  public getActiveMonographCard(): GamifiedCard | null {
    return this.activeMonographCard;
  }

  public openDilemmaModal(card: GamifiedCard) {
    this.activeDilemmaCard = card;
    this.notify();
  }

  public closeDilemmaModal() {
    this.activeDilemmaCard = null;
    this.notify();
  }

  public openBoeModal(card: GamifiedCard) {
    this.activeBoeCard = card;
    this.notify();
  }

  public closeBoeModal() {
    this.activeBoeCard = null;
    this.notify();
  }

  public openMonographModal(card: GamifiedCard) {
    this.activeMonographCard = card;
    this.notify();
  }

  public closeMonographModal() {
    this.activeMonographCard = null;
    this.notify();
  }

  /**
   * Ejecuta la toma de decisión en una carta con impacto físico y criptográfico.
   */
  public async playDecision(decision: GameDecision): Promise<void> {
    const currentCard = this.getCurrentCard();
    if (!currentCard) return;

    this.decisions[currentCard.id] = decision;

    // 1. Calcular nuevo impacto en barómetros HUD
    let delta = currentCard.impact.delegate;
    if (decision === 'YES') delta = currentCard.impact.yes;
    else if (decision === 'NO') delta = currentCard.impact.no;

    const clamp = (val: number) => Math.max(10, Math.min(99, val));
    this.hudMetrics = {
      tenantStability: clamp(this.hudMetrics.tenantStability + delta.tenant),
      landlordSecurity: clamp(this.hudMetrics.landlordSecurity + delta.landlord),
      nationalConsensus: clamp(this.hudMetrics.nationalConsensus + delta.consensus),
      lastDelta: delta
    };

    // 2. Ejecutar transacción criptográfica ZK o delegación en segundo plano
    if (decision === 'YES' || decision === 'NO') {
      const choice: VoteChoice = decision === 'YES' ? 'YES' : 'NO';
      await this.civicStore.castVote(currentCard.articleId, choice);
    } else {
      // Delegar en Dra. Elena Miró
      this.civicStore.setDelegation('dra-elena-miro');
    }

    // 3. Avanzar mazo
    this.currentCardIndex += 1;
    if (this.currentCardIndex >= GAMIFIED_DECK.length) {
      // Bloquear métrica de consenso final en el 84% ("Puente de Consenso")
      this.hudMetrics.nationalConsensus = 84;
      this.isEurekaRevealed = true;
    }

    this.notify();
  }

  /**
   * Recalcula las métricas del HUD en base a las decisiones activas acumuladas.
   */
  private recalculateHudMetrics() {
    this.syncWithProfile();
    const clamp = (val: number) => Math.max(10, Math.min(99, val));
    let lastDelta = undefined;

    for (let i = 0; i < this.currentCardIndex; i++) {
      const card = GAMIFIED_DECK[i];
      const decision = this.decisions[card.id];
      if (decision) {
        let delta = card.impact.delegate;
        if (decision === 'YES') delta = card.impact.yes;
        else if (decision === 'NO') delta = card.impact.no;

        this.hudMetrics = {
          tenantStability: clamp(this.hudMetrics.tenantStability + delta.tenant),
          landlordSecurity: clamp(this.hudMetrics.landlordSecurity + delta.landlord),
          nationalConsensus: clamp(this.hudMetrics.nationalConsensus + delta.consensus),
          lastDelta: delta
        };
        lastDelta = delta;
      }
    }
    this.hudMetrics.lastDelta = lastDelta;
  }

  /**
   * Retrocede una ronda en el mazo y revierte la decisión previa.
   */
  public undoDecision(): boolean {
    if (this.currentCardIndex <= 0) return false;

    this.isEurekaRevealed = false;
    this.currentCardIndex -= 1;
    const prevCard = GAMIFIED_DECK[this.currentCardIndex];
    if (prevCard && this.decisions[prevCard.id]) {
      delete this.decisions[prevCard.id];
    }

    this.recalculateHudMetrics();
    this.notify();
    return true;
  }

  public resetGame() {
    this.currentCardIndex = 0;
    this.decisions = {};
    this.isEurekaRevealed = false;
    this.activeDilemmaCard = null;
    this.activeBoeCard = null;
    this.activeMonographCard = null;
    this.syncWithProfile();
    this.notify();
  }
}
