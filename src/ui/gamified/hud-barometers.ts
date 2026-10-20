/**
 * COMPONENTE: HUD DE PROGRESIÓN LEGISLATIVA (BARÓMETRO DE DECRETO)
 * Muestra el avance claro por los artículos del decreto,
 * la cuenta atrás oficial hasta las Elecciones Generales y el contexto institucional.
 */

import { GameStore } from '../../state/game-store.ts';
import { soundFx } from './sound-fx.ts';
import { 
  getConsultationDeadlineConfig, 
  calculateTimeRemaining, 
  DEADLINE_EVENT 
} from '../../services/consultation-deadline.ts';

let activeDeadlineInterval: ReturnType<typeof setInterval> | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener(DEADLINE_EVENT, () => {
    const hudContainer = document.getElementById('hud-barometers-container');
    if (hudContainer) {
      renderHudBarometers(hudContainer);
    }
  });
}

export function renderHudBarometers(container: HTMLElement) {
  const gameStore = GameStore.getInstance();
  const currentIndex = gameStore.getCardIndex();
  const totalCards = gameStore.getTotalCards();
  const deadlineCfg = getConsultationDeadlineConfig();
  const remaining = calculateTimeRemaining(deadlineCfg.targetIso);

  if (activeDeadlineInterval) {
    clearInterval(activeDeadlineInterval);
    activeDeadlineInterval = null;
  }

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

      <!-- Derecha: Cuenta Atrás hasta Elecciones y Contexto Institucional -->
      <div class="hud-decree-context">
        ${deadlineCfg.enabled ? `
          <div class="hud-countdown-pill" id="hud-deadline-pill" title="Plazo de votación abierto hasta las ${deadlineCfg.label} (${new Date(deadlineCfg.targetIso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })})">
            <svg class="countdown-svg-clock" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span class="countdown-target-label">${deadlineCfg.label}:</span>
            <strong class="countdown-digits" id="hud-countdown-val">${remaining.formattedCompact}</strong>
          </div>
        ` : ''}

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

  // Temporizador en vivo para refrescar la cuenta atrás cada segundo
  if (deadlineCfg.enabled && !remaining.isExpired) {
    activeDeadlineInterval = setInterval(() => {
      const el = container.querySelector('#hud-countdown-val');
      if (el) {
        const cur = calculateTimeRemaining(deadlineCfg.targetIso);
        el.textContent = cur.formattedCompact;
      }
    }, 1000);
  }
}
