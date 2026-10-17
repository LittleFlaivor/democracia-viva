/**
 * MODAL: DIVULGACIÓN PROGRESIVA CAPA 2 (EL DILEMA CÍVICO)
 * Formato visual estilo novela gráfica / cómic moderno con dos avatares enfrentados:
 * 'Lo que busca la ley' vs. 'El riesgo económico', sin tecnicismos legales.
 */

import { GamifiedCard } from '../../domain/data/gamified-deck.ts';
import { GameStore } from '../../state/game-store.ts';

export function renderDilemmaModal(container: HTMLElement, card: GamifiedCard) {
  const gameStore = GameStore.getInstance();

  container.innerHTML = `
    <div class="modal-overlay" id="dilemma-modal-overlay">
      <div class="modal-sheet dilemma-sheet">
        <button class="modal-close-btn" id="dilemma-close-btn">✕</button>

        <div style="margin-bottom: 1.5rem; text-align: center;">
          <span class="badge-mono" style="color: var(--accent-brass); border-color: var(--border-accent);">
            CAPA 2 · NOVELA GRÁFICA CÍVICA
          </span>
          <h2 class="font-display" style="font-size: 1.6rem; margin-top: 0.5rem; color: var(--text-main);">
            El Dilema: Las Dos Voces de la Calle
          </h2>
          <p style="font-size: 0.88rem; color: var(--color-muted); max-width: 580px; margin: 0.25rem auto 0;">
            ${card.headlineQuestion}
          </p>
        </div>

        <!-- Escenario de Avatares Enfrentados (Estilo Cómic Editorial) -->
        <div class="comic-faces-grid">
          <!-- Personaje A: La Promesa Social -->
          <div class="comic-bubble-card promise-side">
            <div class="comic-avatar-header">
              <div class="comic-avatar-badge">${card.dilemma.lawIntent.avatar}</div>
              <div>
                <div class="comic-avatar-name">${card.dilemma.lawIntent.speaker}</div>
                <div class="comic-avatar-role">${card.dilemma.lawIntent.role}</div>
              </div>
            </div>

            <div class="comic-bubble-text">
              <span class="bubble-tag" style="background: rgba(74, 157, 124, 0.2); color: #79D1AB;">
                ✓ LA PROMESA DE LA LEY
              </span>
              <p>"${card.dilemma.lawIntent.argument}"</p>
            </div>
          </div>

          <!-- Divisor VS Central -->
          <div class="comic-versus-badge font-display">VS</div>

          <!-- Personaje B: El Riesgo Económico -->
          <div class="comic-bubble-card risk-side">
            <div class="comic-avatar-header">
              <div class="comic-avatar-badge risk">${card.dilemma.economicRisk.avatar}</div>
              <div>
                <div class="comic-avatar-name">${card.dilemma.economicRisk.speaker}</div>
                <div class="comic-avatar-role">${card.dilemma.economicRisk.role}</div>
              </div>
            </div>

            <div class="comic-bubble-text">
              <span class="bubble-tag" style="background: rgba(200, 90, 83, 0.2); color: #E8837D;">
                ✕ EL RIESGO ECONÓMICO
              </span>
              <p>"${card.dilemma.economicRisk.argument}"</p>
            </div>
          </div>
        </div>

        <!-- Banner del Puente de Mediación Social -->
        <div class="mediation-bridge-banner">
          <div style="font-size: 0.76rem; font-weight: 700; color: var(--accent-brass); text-transform: uppercase; margin-bottom: 0.25rem;">
            💡 Hallazgo de Consenso Ciudadano:
          </div>
          <p style="font-size: 0.92rem; color: var(--accent-brass-light); line-height: 1.5; font-weight: 500;">
            "${card.dilemma.publicMediationSummary}"
          </p>
        </div>

        <!-- Botones de Acción Inmediata -->
        <div class="dilemma-action-buttons">
          <button class="btn-vote btn-vote-no" id="btn-modal-no">
            ✕ Votar En Contra
          </button>
          <button class="btn-delegate" id="btn-modal-delegate">
            ↑ Delegar en Experto
          </button>
          <button class="btn-vote btn-vote-yes" id="btn-modal-yes">
            ✓ Votar A Favor
          </button>
        </div>
      </div>
    </div>
  `;

  const overlay = container.querySelector('#dilemma-modal-overlay');
  const closeBtn = container.querySelector('#dilemma-close-btn');

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) gameStore.closeDilemmaModal();
  });
  closeBtn?.addEventListener('click', () => gameStore.closeDilemmaModal());

  container.querySelector('#btn-modal-yes')?.addEventListener('click', () => {
    gameStore.closeDilemmaModal();
    gameStore.playDecision('YES');
  });
  container.querySelector('#btn-modal-no')?.addEventListener('click', () => {
    gameStore.closeDilemmaModal();
    gameStore.playDecision('NO');
  });
  container.querySelector('#btn-modal-delegate')?.addEventListener('click', () => {
    gameStore.closeDilemmaModal();
    gameStore.playDecision('DELEGATE');
  });
}
