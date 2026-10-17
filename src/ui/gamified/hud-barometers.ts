/**
 * COMPONENTE: HUD DE CONSENSO Y MISIÓN CÍVICA (ELEMENTO ÚNICO INFORMADO)
 * Sustituye los indicadores dispersos por un único módulo de información claro,
 * sin distracciones, con botón de retroceso de ronda y el mismo ancho exacto que la carta (var(--game-col-width)).
 */

import { GameStore } from '../../state/game-store.ts';
import { soundFx } from './sound-fx.ts';

export function renderHudBarometers(container: HTMLElement) {
  const gameStore = GameStore.getInstance();
  const metrics = gameStore.getHudMetrics();
  const currentIndex = gameStore.getCardIndex();
  const totalCards = gameStore.getTotalCards();

  const deltaVal = metrics.lastDelta?.consensus;
  let deltaBadge = '';
  if (deltaVal && deltaVal !== 0) {
    const isPositive = deltaVal > 0;
    const sign = isPositive ? '+' : '';
    const colorClass = isPositive ? 'delta-up' : 'delta-down';
    deltaBadge = `<span class="hud-delta-pill ${colorClass}">${sign}${deltaVal}%</span>`;
  }

  container.innerHTML = `
    <div class="game-hud-capsule" role="region" aria-label="Estado de la Misión y Consenso">
      <!-- Izquierda: Misión y Ronda (Sin mando de consola, con opción de ir atrás) -->
      <div class="hud-mission-group">
        ${currentIndex > 0 ? `
          <button class="hud-btn-undo" id="btn-hud-undo" title="Volver a la ronda anterior [Tecla Z o Retroceso]" aria-label="Ronda anterior">
            <span class="undo-arrow">↶</span>
            <span class="undo-label">Anterior</span>
          </button>
        ` : `
          <div class="hud-mission-indicator" aria-hidden="true">
            <span class="mission-dot"></span>
          </div>
        `}
        <div class="hud-mission-info">
          <span class="hud-mission-title">${gameStore.isFinished() ? 'VOTACIÓN COMPLETADA' : `RONDA ${currentIndex + 1} DE ${totalCards}`}</span>
          <div class="hud-pips-row">
            ${Array.from({ length: totalCards }).map((_, i) => `
              <span class="hud-pip ${gameStore.isFinished() || i < currentIndex ? 'pip-done' : i === currentIndex ? 'pip-active' : ''}"></span>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Separador Vertical Sutil -->
      <div class="hud-v-divider"></div>

      <!-- Derecha: El Único Indicador Clave (Consenso Nacional en Vivo) -->
      <div class="hud-consensus-group" title="Consenso Nacional: Porcentaje de acuerdo colectivo alcanzado entre ciudadanos">
        <div class="hud-consensus-top">
          <span class="hud-consensus-label">
            <span class="pulse-indicator-dot"></span>
            Consenso Cívico
          </span>
          <div class="hud-metric-wrap">
            <span class="hud-consensus-value font-mono">${metrics.nationalConsensus}%</span>
            ${deltaBadge}
          </div>
        </div>

        <!-- Barra de Nivel Gamer con Relleno Suave -->
        <div class="hud-meter-track">
          <div class="hud-meter-fill" style="width: ${metrics.nationalConsensus}%;"></div>
        </div>
      </div>
    </div>
  `;

  // Listener para retroceder de ronda
  container.querySelector('#btn-hud-undo')?.addEventListener('click', () => {
    soundFx.playUndo();
    gameStore.undoDecision();
  });
}
