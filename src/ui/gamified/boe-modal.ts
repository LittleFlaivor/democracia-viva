/**
 * MODAL: DIVULGACIÓN PROGRESIVA CAPA 3 (MODO EXPERTO Y TEXTO BOE)
 * Muestra el artículo literal del Real Decreto-ley, el desglose de votación
 * en el Congreso de los Diputados y la formulación criptográfica.
 */

import { GamifiedCard } from '../../domain/data/gamified-deck.ts';
import { GameStore } from '../../state/game-store.ts';
import { DECREE_VIVIENDA } from '../../domain/data/decree-vivienda.ts';

export function renderBoeModal(container: HTMLElement, card: GamifiedCard) {
  const gameStore = GameStore.getInstance();
  const article = DECREE_VIVIENDA.articles.find((a) => a.id === card.articleId);

  if (!article) return;

  container.innerHTML = `
    <div class="modal-overlay" id="boe-modal-overlay">
      <div class="modal-sheet" style="max-width: 680px;">
        <button class="modal-close-btn" id="boe-close-btn">✕</button>

        <div style="margin-bottom: 1.25rem;">
          <span class="badge-mono" style="color: var(--accent-brass); border-color: var(--border-accent);">
            CAPA 3 · MODO AUDITOR BOE & CONGRESO
          </span>
          <h3 class="font-display" style="font-size: 1.4rem; margin-top: 0.4rem; color: var(--text-main);">
            ${article.articleNumber}: ${article.title}
          </h3>
          <div style="font-size: 0.78rem; color: var(--color-muted); margin-top: 0.2rem;">
            ${DECREE_VIVIENDA.officialCode} · Publicado en BOE el ${DECREE_VIVIENDA.publishedDate}
          </div>
        </div>

        <!-- Texto Literal del BOE -->
        <div style="margin-bottom: 1.5rem;">
          <div style="font-size: 0.72rem; color: var(--color-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.4rem;">
            Redacción Oficial Aprobada en Consejo de Ministros:
          </div>
          <div class="code-audit-block" style="white-space: pre-wrap; font-size: 0.82rem; line-height: 1.65; color: #E0E1E8;">
${article.boeFormalText}
          </div>
        </div>

        <!-- Registro del Congreso -->
        <div style="background: rgba(0,0,0,0.35); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
          <div style="font-size: 0.74rem; font-weight: 700; color: var(--accent-brass); text-transform: uppercase; margin-bottom: 0.35rem;">
            Votación Oficial en el Congreso de los Diputados (350 Diputados):
          </div>
          <div style="display: flex; gap: 1rem; align-items: center; font-size: 0.88rem;">
            <span style="color: ${article.congressVote.result === 'APROBADO' ? '#79D1AB' : '#E8837D'}; font-weight: 700;">
              Resultado: ${article.congressVote.result}
            </span>
            <span style="color: var(--color-muted);">
              (${article.congressVote.yes} Sí / ${article.congressVote.no} No / ${article.congressVote.abstain} Abs)
            </span>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button class="btn-vote btn-vote-abstain" id="btn-close-boe-action">
            Volver a la Carta de Juego
          </button>
        </div>
      </div>
    </div>
  `;

  const overlay = container.querySelector('#boe-modal-overlay');
  const closeBtn = container.querySelector('#boe-close-btn');
  const closeActionBtn = container.querySelector('#btn-close-boe-action');

  const close = () => gameStore.closeBoeModal();
  overlay?.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  closeBtn?.addEventListener('click', close);
  closeActionBtn?.addEventListener('click', close);
}
