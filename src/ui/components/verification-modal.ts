/**
 * MODAL: INSPECTOR DE RECIBO CRIPTOGRÁFICO ZK Y PRUEBA DE MERKLE
 * Permite a cualquier ciudadano auditar su inclusión en el árbol,
 * verificar la ausencia de datos personales y descargar su prueba JSON.
 */

import { CivicAppStore } from '../../state/store.ts';

export function renderVerificationModal(
  container: HTMLElement,
  nullifierHash: string,
  onClose: () => void
) {
  const store = CivicAppStore.getInstance();
  const receipt = store.getReceiptByNullifier(nullifierHash);

  if (!receipt) {
    onClose();
    return;
  }

  container.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal-sheet">
        <button class="modal-close-btn" id="modal-close-btn">✕</button>

        <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.6rem; flex-wrap: wrap; padding-right: 2.5rem;">
          <span class="badge-mono" style="background: rgba(74, 157, 124, 0.2); color: #79D1AB; border-color: var(--vote-yes);">
            ✓ VOTO REGISTRADO Y CONTABILIZADO
          </span>
          <span style="font-size: 0.76rem; color: var(--text-muted); font-weight: 500;">Garantía Criptográfica de Privacidad</span>
        </div>

        <h3 style="margin-bottom: 0.4rem; font-size: 1.35rem;">Recibo Cívico Verificable</h3>
        <p style="font-size: 0.84rem; color: var(--text-secondary); margin-bottom: 1.25rem; line-height: 1.45;">
          Este recibo digital demuestra de forma matemática y pública que tu voto forma parte del escrutinio oficial del Decreto de Vivienda, sin revelar jamás tu identidad ni la opción que elegiste.
        </p>

        <!-- Datos Criptográficos Clave -->
        <div style="display: grid; grid-template-columns: 1fr; gap: 0.75rem; margin-bottom: 1.25rem;">
          <div style="background: var(--bg-app-alt); padding: 0.75rem 1rem; border-radius: var(--radius-xs); border: 1px solid var(--border-card);">
            <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">
              Identificador Anónimo de Voto (Nullifier):
            </div>
            <div style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Garantiza que nadie vote dos veces sin asociar la papeleta a tu persona.</div>
            <div class="font-mono" style="font-size: 0.8rem; color: var(--color-primary); word-break: break-all; font-weight: 600; line-height: 1.35;">
              ${receipt.nullifierHash}
            </div>
          </div>

          <div style="background: var(--bg-app-alt); padding: 0.75rem 1rem; border-radius: var(--radius-xs); border: 1px solid var(--border-card);">
            <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">
              Huella Digital de la Urna (Merkle Root):
            </div>
            <div style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Sello inalterable que certifica que ninguna papeleta ha sido manipulada ni borrada.</div>
            <div class="font-mono" style="font-size: 0.8rem; color: var(--vote-yes); word-break: break-all; font-weight: 600; line-height: 1.35;">
              ${receipt.merkleRoot}
            </div>
          </div>

          <div style="background: var(--bg-app-alt); padding: 0.75rem 1rem; border-radius: var(--radius-xs); border: 1px solid var(--border-card);">
            <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">
              Registro Público Criptográfico:
            </div>
            <div style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Identificador de la transacción en la red pública descentralizada.</div>
            <div class="font-mono" style="font-size: 0.8rem; color: var(--text-secondary); word-break: break-all; line-height: 1.35;">
              ${receipt.txHash}
            </div>
          </div>
        </div>

        <!-- Camino de Hermanos de Merkle (Merkle Path) -->
        <div style="margin: 1.25rem 0;">
          <h4 style="font-size: 0.88rem; margin-bottom: 0.2rem;">Ruta de Verificación en la Urna (${receipt.merkleProof.siblings.length} niveles):</h4>
          <p style="font-size: 0.74rem; color: var(--text-secondary); margin-bottom: 0.4rem;">Comprobación matemática que valida que tu papeleta está dentro del recuento total.</p>
          <div class="code-audit-block" style="font-size: 0.72rem; padding: 0.75rem;">
${receipt.merkleProof.siblings
  .map(
    (s, idx) =>
      `[Nivel ${idx}] Rama: ${s.position.toUpperCase()} | Hash de comprobación: ${s.hash.slice(0, 18)}...${s.hash.slice(-10)}`
  )
  .join('\n')}
          </div>
        </div>

        <!-- Acciones del Recibo -->
        <div style="display: flex; gap: 0.6rem; flex-wrap: wrap; justify-content: stretch; margin-top: 1.5rem;">
          <button class="btn-vote btn-vote-abstain" id="btn-copy-nullifier" style="flex: 1 1 140px; justify-content: center; text-align: center;">
            📋 Copiar Identificador de Voto
          </button>
          <button class="btn-delegate" id="btn-download-receipt-json" style="flex: 1 1 140px; justify-content: center; text-align: center;">
            ⬇ Descargar Recibo Oficial (.json)
          </button>
        </div>
      </div>
    </div>
  `;

  // Asignar listeners
  const overlay = container.querySelector('#modal-overlay');
  const closeBtn = container.querySelector('#modal-close-btn');

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) onClose();
  });
  closeBtn?.addEventListener('click', onClose);

  const copyBtn = container.querySelector('#btn-copy-nullifier');
  copyBtn?.addEventListener('click', () => {
    navigator.clipboard?.writeText(receipt.nullifierHash);
    copyBtn.textContent = '✓ Copiado';
    setTimeout(() => { copyBtn.textContent = '📋 Copiar Identificador de Voto'; }, 2000);
  });

  const downloadBtn = container.querySelector('#btn-download-receipt-json');
  downloadBtn?.addEventListener('click', () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(receipt, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `recibo-democracia-viva-${receipt.nullifierHash.slice(2, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });
}
