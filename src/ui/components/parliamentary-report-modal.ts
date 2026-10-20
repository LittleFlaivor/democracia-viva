/**
 * MODAL: GENERADOR DE ACTA CÍVICA AUDITABLE Y REPORTE PARLAMENTARIO
 * Documento formal sellado criptográficamente con los resultados del escrutinio ciudadano,
 * listo para ser remitido a la Mesa del Congreso de los Diputados y grupos parlamentarios.
 */

import { CivicAppStore } from '../../state/store.ts';
import { DECREE_VIVIENDA } from '../../domain/data/decree-vivienda.ts';

export function renderParliamentaryReportModal(
  container: HTMLElement,
  onClose: () => void
) {
  const store = CivicAppStore.getInstance();
  const aggregations = store.getAllAggregations();
  const merkleRoot = store.getMerkleTreeRoot();
  const totalVotes = store.getTotalMerkleLeavesCount();
  const currentDate = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  container.innerHTML = `
    <div class="modal-overlay" id="modal-report-overlay">
      <div class="modal-sheet" style="max-width: 860px;">
        <button class="modal-close-btn" id="modal-report-close-btn">✕</button>

        <!-- Cabecera Oficial del Acta -->
        <div style="border-bottom: 2px solid var(--accent-brass); padding-bottom: 1.5rem; margin-bottom: 2rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
            <div>
              <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; color: var(--accent-brass); margin-bottom: 0.4rem;">
                PARTICIPACIÓN CIUDADANA TRANSPARENTE · CONGRESO DE LOS DIPUTADOS
              </div>
              <h2 style="font-size: 1.6rem; color: var(--text-primary); margin-bottom: 0.25rem;">
                ACTA CÍVICA PARLAMENTARIA Nº 2026/06-VIV
              </h2>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">
                Consulta Ciudadana Verificada sobre el Real Decreto-ley de Vivienda
              </div>
            </div>

            <div style="text-align: right;">
              <span class="badge-mono" style="font-size: 0.76rem; color: #79D1AB; border-color: var(--vote-yes);">
                ESTADO: RESULTADOS VERIFICADOS
              </span>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.4rem;">
                Fecha: ${currentDate}
              </div>
            </div>
          </div>
        </div>

        <!-- Metadatos de Integridad Criptográfica -->
        <div style="background: var(--bg-app-alt); border: 1px solid var(--border-card); border-radius: var(--radius-sm); padding: 1.25rem; margin-bottom: 2rem;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div>
              <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700;">TOTAL SUFRAGIOS CÍVICOS</div>
              <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">${totalVotes} ${totalVotes === 1 ? 'Voto Válido' : 'Votos Válidos'}</div>
            </div>
            <div>
              <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700;">REGISTRO AUDITABLE</div>
              <div style="font-size: 0.85rem; font-weight: 600; color: var(--color-primary);">Red Descentralizada Inmutable</div>
            </div>
            <div>
              <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700;">GARANTÍA DE PRIVACIDAD</div>
              <div style="font-size: 0.85rem; font-weight: 600; color: var(--vote-yes);">100% Anónimo (Cero Fuga)</div>
            </div>
          </div>

          <div>
            <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">
              Huella Digital Global de la Urna (Merkle Root):
            </div>
            <div class="font-mono" style="font-size: 0.75rem; color: var(--text-primary); word-break: break-all; font-weight: 600;">
              ${merkleRoot}
            </div>
          </div>
        </div>

        <!-- Tabla de Resultados por Artículo -->
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.3rem;">
          <h4 style="margin: 0;">1. Voluntad Ciudadana vs. Votación en el Congreso</h4>
          <span style="font-size: 0.7rem; color: var(--text-muted);">↔ Desliza la tabla horizontalmente</span>
        </div>
        <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 2rem; border-radius: 12px; border: 1px solid var(--border-card);">
          <table style="width: 100%; min-width: 520px; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-medium); color: var(--text-muted); background: var(--bg-app-alt);">
                <th style="padding: 0.75rem 0.5rem;">Artículo</th>
                <th style="padding: 0.75rem 0.5rem;">Voto Directo / Delegado</th>
                <th style="padding: 0.75rem 0.5rem;">Sentido Ciudadano</th>
                <th style="padding: 0.75rem 0.5rem;">Sentido Congreso</th>
                <th style="padding: 0.75rem 0.5rem;">Consenso</th>
              </tr>
            </thead>
            <tbody>
              ${aggregations
                .map((agg) => {
                  const art = DECREE_VIVIENDA.articles.find((a) => a.id === agg.articleId)!;
                  const hasVotes = agg.totalElectoralWeight > 0;
                  const isDivergent = agg.congressComparison.citizensApproved !== agg.congressComparison.congressApproved;

                  return `
                  <tr style="border-bottom: 1px solid var(--border-subtle);">
                    <td style="padding: 0.85rem 0.5rem; font-weight: 600; color: var(--text-primary);">
                      ${art.articleNumber}
                    </td>
                    <td style="padding: 0.85rem 0.5rem; font-family: 'JetBrains Mono', monospace; font-size: 0.78rem;">
                      ${agg.directWeightYes + agg.directWeightNo + agg.directWeightAbstain} dir / ${agg.delegatedWeightYes + agg.delegatedWeightNo + agg.delegatedWeightAbstain} del
                    </td>
                    <td style="padding: 0.85rem 0.5rem;">
                      <span style="color: ${hasVotes ? (agg.totalYes === agg.totalNo ? 'var(--text-secondary)' : agg.citizensApproved ? '#79D1AB' : '#E8837D') : 'var(--text-muted)'}; font-weight: 700;">
                        ${hasVotes ? `${agg.totalYes === agg.totalNo ? 'EMPATE' : agg.citizensApproved ? 'APRUEBA' : 'RECHAZA'} (${agg.pctYes}% SÍ)` : 'Pendiente (0 votos)'}
                      </span>
                    </td>
                    <td style="padding: 0.85rem 0.5rem;">
                      <span style="color: ${art.congressVote.result === 'APROBADO' ? '#79D1AB' : '#E8837D'}; font-weight: 700;">
                        ${art.congressVote.result}
                      </span>
                      ${hasVotes && isDivergent ? `<span style="color: #E8837D; font-size: 0.7rem; display: block;">⚡ DISCREPANCIA</span>` : ''}
                    </td>
                    <td style="padding: 0.85rem 0.5rem; font-family: 'JetBrains Mono', monospace;">
                      ${hasVotes ? `${agg.consensusIndex}%` : '–'}
                    </td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        </div>

        <!-- Escrito Formal de Remisión Parlamentaria -->
        <div style="background: var(--color-primary-subtle); border-left: 3px solid var(--color-primary); padding: 1.25rem 1.5rem; margin-bottom: 2rem; border-radius: 0 var(--radius-xs) var(--radius-xs) 0;">
          <h5 style="color: var(--color-primary); margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 700;">
            A la Mesa del Congreso de los Diputados y Grupos Parlamentarios:
          </h5>
          <p style="font-size: 0.84rem; line-height: 1.6; color: var(--text-secondary);">
            A través de la deliberación ciudadana en <b>Democracia Viva</b>, se traslada formalmente el resultado de la votación sobre las medidas del Real Decreto-ley de Vivienda. Este informe ofrece a los representantes públicos datos objetivos, auditables y transparentes sobre el sentir de la ciudadanía para enriquecer el debate parlamentario y buscar consensos equilibrados.
          </p>
        </div>

        <!-- Botones de Acción -->
        <div style="display: flex; justify-content: flex-end; gap: 1rem; flex-wrap: wrap;">
          <button class="btn-vote btn-vote-abstain" id="btn-print-acta">
            🖨 Imprimir / Guardar PDF
          </button>
          <button class="btn-export-acta" id="btn-download-acta-json" style="width: auto; padding: 0.75rem 1.5rem;">
            ⬇ Descargar Acta Oficial (.json)
          </button>
        </div>
      </div>
    </div>
  `;

  const overlay = container.querySelector('#modal-report-overlay');
  const closeBtn = container.querySelector('#modal-report-close-btn');

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) onClose();
  });
  closeBtn?.addEventListener('click', onClose);

  const printBtn = container.querySelector('#btn-print-acta');
  printBtn?.addEventListener('click', () => {
    window.print();
  });

  const downloadBtn = container.querySelector('#btn-download-acta-json');
  downloadBtn?.addEventListener('click', () => {
    const jsonStr = store.exportCivicActaJSON();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonStr);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `acta-civica-parlamentaria-rdl-06-2026.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });
}
