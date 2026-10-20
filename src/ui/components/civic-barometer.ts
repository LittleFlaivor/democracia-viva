/**
 * COMPONENTE: BARÓMETRO CÍVICO Y COMPARATIVA PARLAMENTARIA
 * Muestra el escrutinio en vivo (Voto Directo vs. Voto Delegado),
 * la discrepancia frente al Congreso de los Diputados y botón para emitir el Acta Cívica.
 */

import { CivicAppStore } from '../../state/store.ts';
import { DECREE_VIVIENDA } from '../../domain/data/decree-vivienda.ts';

export function renderCivicBarometer(
  container: HTMLElement,
  onOpenReportModal: () => void
) {
  const store = CivicAppStore.getInstance();
  const aggregations = store.getAllAggregations();
  const totalVotes = store.getTotalMerkleLeavesCount();
  const merkleRoot = store.getMerkleTreeRoot();

  container.innerHTML = `
    <div class="barometer-card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <div style="font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: var(--accent-brass); margin-bottom: 0.3rem;">
            ESCRUTINIO EN TIEMPO REAL
          </div>
          <h3 style="margin-bottom: 0.25rem;">Barómetro Cívico</h3>
        </div>
        <span class="badge-mono" style="font-size: 0.72rem;">
          ${totalVotes} ${totalVotes === 1 ? 'voto anclado' : 'votos anclados'}
        </span>
      </div>

      <!-- Resumen de Raíz de Merkle en Vivo -->
      <div style="background: rgba(0,0,0,0.35); border: 1px solid var(--border-subtle); border-radius: var(--radius-xs); padding: 0.65rem 0.85rem; margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
          <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">
            Merkle Root (Integridad Global):
          </span>
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #4A9D7C;"></span>
        </div>
        <div class="font-mono" style="font-size: 0.72rem; color: var(--accent-brass-light); word-break: break-all;">
          ${merkleRoot}
        </div>
      </div>

      <!-- Escrutinio por Artículos -->
      <div style="display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem;">
        ${aggregations
          .map((agg) => {
            const article = DECREE_VIVIENDA.articles.find((a) => a.id === agg.articleId)!;
            const hasVotes = agg.totalElectoralWeight > 0;
            const isDivergent = agg.congressComparison.citizensApproved !== agg.congressComparison.congressApproved;

            return `
            <div style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">
                  ${article.articleNumber}: ${article.title.slice(0, 38)}...
                </span>
                <span class="badge-mono" style="font-size: 0.72rem;">
                  Consenso: ${hasVotes ? `${agg.consensusIndex}%` : '–'}
                </span>
              </div>

              <!-- Barra de Distribución Electoral -->
              <div class="ratio-bar-container">
                <div class="ratio-bar-segment yes" style="width: ${agg.pctYes}%;" title="A favor: ${agg.pctYes}% (${agg.totalYes} votos)"></div>
                <div class="ratio-bar-segment no" style="width: ${agg.pctNo}%;" title="En contra: ${agg.pctNo}% (${agg.totalNo} votos)"></div>
                <div class="ratio-bar-segment abstain" style="width: ${agg.pctAbstain}%;" title="Abstención: ${agg.pctAbstain}% (${agg.totalAbstain} votos)"></div>
              </div>

              <!-- Cifras Directo vs Delegado -->
              <div style="display: flex; justify-content: space-between; font-size: 0.76rem; color: var(--text-muted); margin-bottom: 0.65rem;">
                <span style="color: #79D1AB;">✓ Sí: ${agg.pctYes}% (${agg.directWeightYes} dir / ${agg.delegatedWeightYes} del)</span>
                <span style="color: #E8837D;">✕ No: ${agg.pctNo}% (${agg.directWeightNo} dir / ${agg.delegatedWeightNo} del)</span>
                <span>○ Abs: ${agg.pctAbstain}%</span>
              </div>

              <!-- Comparativa con Congreso de los Diputados -->
              <div class="congress-comparison-box">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem;">
                  <div>
                    <span style="color: var(--text-muted);">Congreso: </span>
                    <span style="font-weight: 700; color: ${article.congressVote.result === 'APROBADO' ? '#79D1AB' : '#E8837D'};">
                      ${article.congressVote.result} (${article.congressVote.yes} Sí / ${article.congressVote.no} No)
                    </span>
                  </div>
                  <div>
                    <span style="color: var(--text-muted);">Ciudadanía: </span>
                    <span style="font-weight: 700; color: ${hasVotes ? (agg.totalYes === agg.totalNo ? 'var(--text-secondary)' : agg.citizensApproved ? '#79D1AB' : '#E8837D') : 'var(--text-muted)'};">
                      ${hasVotes ? (agg.totalYes === agg.totalNo ? 'EMPATE' : agg.citizensApproved ? 'APRUEBA' : 'RECHAZA') : 'Sin votos'}
                    </span>
                  </div>
                </div>

                ${
                  hasVotes
                    ? (isDivergent
                        ? `<div style="margin-top: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
                            <span class="divergence-pill high">⚡ DISCREPANCIA PARLAMENTARIA (${agg.congressComparison.divergencePct}% brecha)</span>
                           </div>`
                        : `<div style="margin-top: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
                            <span class="divergence-pill aligned">✓ Sintonía con el Congreso</span>
                           </div>`)
                    : `<div style="margin-top: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
                        <span class="divergence-pill" style="opacity: 0.8; background: var(--bg-surface); border: 1px dashed var(--border-medium); color: var(--text-muted);">⏳ Pendiente de votos cívicos</span>
                       </div>`
                }
              </div>
            </div>
          `;
          })
          .join('')}
      </div>

      <!-- Botón de Exportar Acta Cívica Auditable -->
      <button class="btn-export-acta" id="btn-open-parliamentary-report">
        <span>🏛 Generar Acta Cívica Auditable</span>
      </button>
    </div>
  `;

  // Asignar manejador de apertura de acta
  const reportBtn = container.querySelector('#btn-open-parliamentary-report');
  reportBtn?.addEventListener('click', onOpenReportModal);
}
