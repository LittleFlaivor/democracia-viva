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
            TEXTO LEGAL OFICIAL · BOE Y CONGRESO
          </span>
          <h3 class="font-display" style="font-size: 1.35rem; margin-top: 0.5rem; color: var(--text-primary); line-height: 1.3;">
            ${article.articleNumber}: ${article.title}
          </h3>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.3rem;">
            ${DECREE_VIVIENDA.officialCode} · Publicado en BOE el ${DECREE_VIVIENDA.publishedDate}
          </div>
        </div>

        <!-- Texto Literal del BOE -->
        <div style="margin-bottom: 1.5rem;">
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 750; letter-spacing: 0.04em; margin-bottom: 0.5rem;">
            Redacción Oficial Aprobada en Consejo de Ministros:
          </div>
          <div class="code-audit-block" style="white-space: pre-wrap; font-size: 0.86rem; line-height: 1.6; color: var(--text-primary); background: var(--bg-app-alt); border: 1px solid var(--border-card); border-radius: 12px; padding: 1rem 1.15rem;">
${article.boeFormalText}
          </div>
        </div>

        <!-- Registro del Congreso -->
        <div style="background: var(--bg-app-alt); border: 1px solid var(--border-card); border-radius: 12px; padding: 1rem 1.15rem; margin-bottom: 1.5rem;">
          <div style="font-size: 0.74rem; font-weight: 750; color: var(--accent-brass); text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 0.5rem;">
            Votación Oficial en el Congreso de los Diputados (350 Diputados):
          </div>
          <div style="display: flex; gap: 1rem; align-items: center; font-size: 0.88rem; flex-wrap: wrap;">
            <span style="color: ${article.congressVote.result === 'APROBADO' ? '#059669' : '#DC2626'}; font-weight: 750;">
              Resultado: ${article.congressVote.result}
            </span>
            <span style="color: var(--text-secondary); font-weight: 500;">
              (${article.congressVote.yes} Sí / ${article.congressVote.no} No / ${article.congressVote.abstain} Abstenciones)
            </span>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button class="btn-vote btn-vote-abstain" id="btn-close-boe-action" style="min-width: 160px; justify-content: center;">
            Volver a la Votación
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
