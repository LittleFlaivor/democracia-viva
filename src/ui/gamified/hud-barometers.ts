/**
 * COMPONENTE: HUD DE PROGRESIÓN LEGISLATIVA (BARÓMETRO DE DECRETO)
 * Muestra el avance claro por los artículos del decreto sin métricas confusas prematuras.
 * El consenso social se presenta de forma rigurosa al finalizar en la Pantalla Eureka.
 */

import { GameStore } from '../../state/game-store.ts';
import { soundFx } from './sound-fx.ts';

export function renderHudBarometers(container: HTMLElement) {
  const gameStore = GameStore.getInstance();
  const currentIndex = gameStore.getCardIndex();
  const totalCards = gameStore.getTotalCards();

  container.innerHTML = `
    <div class="game-hud-capsule hud-progress-clean" role="region" aria-label="Progreso de la Votación">
      <!-- Izquierda: Artículo y Ronda con Pips de Progreso -->
      <div class="hud-mission-group">
        ${currentIndex > 0 ? `
          <button class="hud-btn-undo" id="btn-hud-undo" title="Ver artículo anterior" aria-label="Artículo anterior">
            <span class="undo-arrow">↶</span>
            <span class="undo-label">Anterior</span>
          </button>
        ` : `
          <div class="hud-mission-indicator" aria-hidden="true">
            <span class="mission-dot"></span>
          </div>
        `}
        <div class="hud-mission-info">
          <span class="hud-mission-title">${gameStore.isFinished() ? 'VOTACIÓN COMPLETADA' : `ARTÍCULO ${currentIndex + 1} DE ${totalCards}`}</span>
          <div class="hud-pips-row">
            ${Array.from({ length: totalCards }).map((_, i) => `
              <span class="hud-pip ${gameStore.isFinished() || i < currentIndex ? 'pip-done' : i === currentIndex ? 'pip-active' : ''}"></span>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Derecha: Contexto Institucional del Decreto en Votación -->
      <div class="hud-decree-context">
        <span class="hud-decree-pill">
          <span class="decree-live-dot" aria-hidden="true"></span>
          <span>RDL 2/2026 de Vivienda</span>
        </span>
      </div>
    </div>
  `;

  // Listener para retroceder o inspeccionar ronda anterior
  container.querySelector('#btn-hud-undo')?.addEventListener('click', () => {
    soundFx.playTap();
    gameStore.viewPreviousCard();
  });
}
