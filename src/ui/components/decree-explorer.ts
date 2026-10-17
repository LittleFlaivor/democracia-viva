/**
 * COMPONENTE: EXPLORADOR DEL REAL DECRETO DE VIVIENDA (DESGLOSE POR ARTÍCULOS)
 * Votación granular o en bloque, interruptor pedagógico en <3s (BOE vs. Bolsillo)
 * y revocación en caliente en tiempo real.
 */

import { DECREE_VIVIENDA } from '../../domain/data/decree-vivienda.ts';
import { CivicAppStore } from '../../state/store.ts';
import { VoteChoice } from '../../domain/types.ts';

export function renderDecreeExplorer(
  container: HTMLElement,
  onOpenReceiptModal: (receiptId: string) => void
) {
  const store = CivicAppStore.getInstance();
  const activeCitizen = store.getActiveCitizen();
  const activeDelegation = store.getActiveDelegationForActiveCitizen();

  container.innerHTML = `
    <div class="decree-explorer-wrapper">
      <!-- Banner de Contexto del Decreto -->
      <div style="background: var(--bg-card); border: 1px solid var(--border-medium); border-radius: var(--radius-lg); padding: 2rem; margin-bottom: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; flex-wrap: wrap;">
          <div>
            <div style="display: flex; gap: 0.6rem; align-items: center; margin-bottom: 0.5rem;">
              <span class="badge-mono">${DECREE_VIVIENDA.officialCode}</span>
              <span style="font-size: 0.78rem; color: var(--text-muted);">${DECREE_VIVIENDA.publishedDate}</span>
            </div>
            <h2 style="margin-bottom: 0.75rem;">${DECREE_VIVIENDA.shortTitle}</h2>
            <p style="max-width: 720px; font-size: 0.95rem;">${DECREE_VIVIENDA.preamble}</p>
          </div>

          <!-- Votación en Bloque -->
          <div style="background: rgba(11, 11, 13, 0.7); border: 1px solid var(--border-accent); border-radius: var(--radius-md); padding: 1.25rem 1.5rem; text-align: center; min-width: 260px;">
            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: var(--accent-brass); margin-bottom: 0.5rem;">
              VOTACIÓN EN BLOQUE
            </div>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.85rem;">
              Vota los 4 artículos de una vez:
            </p>
            <div style="display: flex; gap: 0.4rem; justify-content: center;">
              <button class="btn-vote btn-vote-yes" id="btn-block-yes" style="padding: 5px 12px; font-size: 0.8rem;">
                ✓ Sí a Todo
              </button>
              <button class="btn-vote btn-vote-no" id="btn-block-no" style="padding: 5px 12px; font-size: 0.8rem;">
                ✕ No a Todo
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Desglose por Artículos -->
      <div class="articles-list">
        ${DECREE_VIVIENDA.articles
          .map((article) => {
            const directVote = store.getActiveCitizenDirectVoteForArticle(article.id);
            const viewMode = store.getViewMode(article.id);
            const isVoted = Boolean(directVote);

            let cardVotedClass = '';
            if (directVote) {
              if (directVote.choice === 'YES') cardVotedClass = 'voted-yes';
              else if (directVote.choice === 'NO') cardVotedClass = 'voted-no';
              else cardVotedClass = 'voted-abstain';
            }

            return `
            <article class="article-card ${cardVotedClass}" id="card-${article.id}">
              <div class="article-header">
                <div>
                  <div class="article-number-badge">${article.articleNumber} · ${article.decreeId}</div>
                  <h3 style="color: var(--text-primary); margin-bottom: 0.35rem;">${article.title}</h3>
                  <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                    ${article.keyTopics
                      .map((t) => `<span class="badge-mono" style="font-size: 0.7rem;">${t}</span>`)
                      .join('')}
                  </div>
                </div>

                <!-- Interruptor Pedagógico <3s: BOE vs Vida Real -->
                <div class="pedagogy-toggle-container">
                  <button 
                    class="pedagogy-toggle-btn ${viewMode === 'POCKET' ? 'active' : ''}" 
                    data-toggle-mode="POCKET" 
                    data-article-id="${article.id}"
                  >
                    <span>💡 Vida Real / Bolsillo</span>
                  </button>
                  <button 
                    class="pedagogy-toggle-btn ${viewMode === 'BOE' ? 'active' : ''}" 
                    data-toggle-mode="BOE" 
                    data-article-id="${article.id}"
                  >
                    <span>📜 Texto BOE</span>
                  </button>
                </div>
              </div>

              <!-- Contenido Dinámico según Modo Pedagógico -->
              ${
                viewMode === 'POCKET'
                  ? `
                <div class="pedagogy-content-box">
                  <div class="impact-nutshell">"${article.realLifeImpact.nutshell}"</div>
                  <div class="impact-grid">
                    <div style="background: rgba(255,255,255,0.03); padding: 0.85rem 1rem; border-radius: var(--radius-xs);">
                      <div style="font-size: 0.74rem; font-weight: 700; color: #79D1AB; text-transform: uppercase; margin-bottom: 0.25rem;">
                        👤 Si eres Inquilino:
                      </div>
                      <div style="font-size: 0.88rem; color: var(--text-secondary);">${article.realLifeImpact.tenantsEffect}</div>
                    </div>

                    <div style="background: rgba(255,255,255,0.03); padding: 0.85rem 1rem; border-radius: var(--radius-xs);">
                      <div style="font-size: 0.74rem; font-weight: 700; color: var(--accent-brass-light); text-transform: uppercase; margin-bottom: 0.25rem;">
                        🏠 Si eres Propietario:
                      </div>
                      <div style="font-size: 0.88rem; color: var(--text-secondary);">${article.realLifeImpact.landlordsEffect}</div>
                    </div>
                  </div>

                  <div class="impact-metric-highlight">
                    📊 Impacto Económico Estimado: ${article.realLifeImpact.financialMetric}
                  </div>
                </div>
              `
                  : `
                <div class="pedagogy-content-box">
                  <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: var(--text-muted); margin-bottom: 0.5rem;">
                    TEXTO OFICIAL DEL BOE
                  </div>
                  <p class="font-mono" style="font-size: 0.86rem; line-height: 1.65; color: var(--text-primary); background: rgba(0,0,0,0.3); padding: 1rem; border-radius: var(--radius-xs); border-left: 3px solid var(--border-medium);">
                    ${article.boeFormalText}
                  </p>
                </div>
              `
              }

              <!-- Argumentos A Favor y En Contra -->
              <details class="arguments-disclosure">
                <summary style="cursor: pointer; font-size: 0.85rem; font-weight: 600; color: var(--accent-brass-light); user-select: none;">
                  ⚖ Ver Argumentos Ponderados (A Favor vs. En Contra)
                </summary>
                <div class="arguments-grid">
                  <div class="argument-card pro">
                    <h5>✓ Posturas A Favor</h5>
                    <ul class="argument-list">
                      ${article.proArguments.map((arg) => `<li>${arg}</li>`).join('')}
                    </ul>
                  </div>

                  <div class="argument-card con">
                    <h5>✕ Advertencias y Riesgos (En Contra)</h5>
                    <ul class="argument-list">
                      ${article.conArguments.map((arg) => `<li>${arg}</li>`).join('')}
                    </ul>
                  </div>
                </div>
              </details>

              <!-- Barra de Acciones de Votación -->
              <div class="voting-actions-bar">
                ${
                  isVoted
                    ? `
                  <div style="display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;">
                    <div class="voted-badge ${directVote?.choice}">
                      ✓ Tu Voto Directo: ${directVote?.choice === 'YES' ? 'A FAVOR' : directVote?.choice === 'NO' ? 'EN CONTRA' : 'ABSTENCIÓN'}
                    </div>
                    <span class="badge-mono" style="font-size: 0.74rem;">
                      Nullifier: ${directVote?.nullifierHash.slice(0, 10)}...${directVote?.nullifierHash.slice(-6)}
                    </span>
                  </div>

                  <button class="btn-view-receipt" data-nullifier="${directVote?.nullifierHash}">
                    🔍 Inspeccionar Recibo ZK & Merkle
                  </button>
                `
                    : `
                  <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                    <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">
                      Emite tu voto soberano:
                    </span>
                    ${
                      activeDelegation
                        ? `<span style="font-size: 0.78rem; color: #79D1AB;">
                            (Tienes delegación activa en <b>${activeDelegation.name}</b>. Votar aquí sobreescribirá su voto sólo para este artículo).
                           </span>`
                        : `<span style="font-size: 0.76rem; color: var(--text-muted);">
                            Firma biométrica con Passkey (Gasless · 0€ de coste · 100% Anónimo)
                           </span>`
                    }
                  </div>

                  <div class="vote-btn-group">
                    <button class="btn-vote btn-vote-yes" data-vote-choice="YES" data-article-id="${article.id}">
                      ✓ A Favor
                    </button>
                    <button class="btn-vote btn-vote-no" data-vote-choice="NO" data-article-id="${article.id}">
                      ✕ En Contra
                    </button>
                    <button class="btn-vote btn-vote-abstain" data-vote-choice="ABSTAIN" data-article-id="${article.id}">
                      ○ Abstención
                    </button>
                  </div>
                `
                }
              </div>
            </article>
          `;
          })
          .join('')}
      </div>
    </div>
  `;

  // Manejadores de eventos de toggle pedagógico (BOE vs Vida Real)
  container.querySelectorAll('.pedagogy-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const articleId = btn.getAttribute('data-article-id');
      if (articleId) {
        store.toggleViewMode(articleId);
      }
    });
  });

  // Manejadores de votación granular
  container.querySelectorAll('.btn-vote[data-vote-choice]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const articleId = target.getAttribute('data-article-id');
      const choice = target.getAttribute('data-vote-choice') as VoteChoice;

      if (!articleId || !choice) return;

      target.disabled = true;
      target.textContent = 'Firma Passkey...';

      const result = await store.castVote(articleId, choice);
      if (result.success && result.receipt) {
        onOpenReceiptModal(result.receipt.nullifierHash);
      } else if (result.error) {
        alert(result.error);
      }
    });
  });

  // Manejador de Votación en Bloque
  const blockYesBtn = container.querySelector('#btn-block-yes');
  const blockNoBtn = container.querySelector('#btn-block-no');

  blockYesBtn?.addEventListener('click', async () => {
    if (confirm('¿Deseas emitir tu voto A FAVOR de los 4 artículos del Decreto en bloque?')) {
      const res = await store.castBlockVote('YES');
      if (res.success && res.receipts[0]) {
        onOpenReceiptModal(res.receipts[0].nullifierHash);
      }
    }
  });

  blockNoBtn?.addEventListener('click', async () => {
    if (confirm('¿Deseas emitir tu voto EN CONTRA de los 4 artículos del Decreto en bloque?')) {
      const res = await store.castBlockVote('NO');
      if (res.success && res.receipts[0]) {
        onOpenReceiptModal(res.receipts[0].nullifierHash);
      }
    }
  });

  // Manejador para inspeccionar recibo ZK
  container.querySelectorAll('.btn-view-receipt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nullifier = btn.getAttribute('data-nullifier');
      if (nullifier) {
        onOpenReceiptModal(nullifier);
      }
    });
  });
}
