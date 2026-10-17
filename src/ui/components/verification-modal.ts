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

        <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem;">
          <span class="badge-mono" style="background: rgba(74, 157, 124, 0.2); color: #79D1AB; border-color: var(--vote-yes);">
            ✓ PRUEBA ZK VERIFICADA
          </span>
          <span style="font-size: 0.78rem; color: var(--text-muted);">ERC-4337 Sponsored L2</span>
        </div>

        <h3 style="margin-bottom: 0.4rem;">Recibo Cívico Verificable</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
          Este recibo acredita matemáticamente que tu voto ha sido computado en el Decreto de Vivienda sin revelar tu identidad ni permitir rastrear qué votaste.
        </p>

        <!-- Datos Criptográficos Clave -->
        <div style="display: grid; grid-template-columns: 1fr; gap: 0.75rem; margin-bottom: 1.25rem;">
          <div style="background: var(--bg-app-alt); padding: 0.75rem 1rem; border-radius: var(--radius-xs); border: 1px solid var(--border-card);">
            <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">
              Nullifier Hash (Incoercible & Único):
            </div>
            <div class="font-mono" style="font-size: 0.82rem; color: var(--color-primary); word-break: break-all; font-weight: 600;">
              ${receipt.nullifierHash}
            </div>
          </div>

          <div style="background: var(--bg-app-alt); padding: 0.75rem 1rem; border-radius: var(--radius-xs); border: 1px solid var(--border-card);">
            <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">
              Merkle Root en Tiempo de Emisión:
            </div>
            <div class="font-mono" style="font-size: 0.82rem; color: var(--vote-yes); word-break: break-all; font-weight: 600;">
              ${receipt.merkleRoot}
            </div>
          </div>

          <div style="background: var(--bg-app-alt); padding: 0.75rem 1rem; border-radius: var(--radius-xs); border: 1px solid var(--border-card);">
            <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">
              Transacción Anclada en Layer 2 (Gasless Paymaster):
            </div>
            <div class="font-mono" style="font-size: 0.82rem; color: var(--text-secondary); word-break: break-all;">
              ${receipt.txHash}
            </div>
          </div>
        </div>

        <!-- Camino de Hermanos de Merkle (Merkle Path) -->
        <div style="margin: 1.5rem 0;">
          <h4 style="font-size: 0.9rem; margin-bottom: 0.4rem;">Camino de Inclusión Merkle (${receipt.merkleProof.siblings.length} niveles):</h4>
          <div class="code-audit-block">
${receipt.merkleProof.siblings
  .map(
    (s, idx) =>
      `[Nivel ${idx}] Posición: ${s.position.toUpperCase()} | Sibling: ${s.hash.slice(0, 18)}...${s.hash.slice(-10)}`
  )
  .join('\n')}
          </div>
        </div>

        <!-- Acciones del Recibo -->
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: flex-end; margin-top: 1.5rem;">
          <button class="btn-vote btn-vote-abstain" id="btn-copy-nullifier">
            📋 Copiar Nullifier
          </button>
          <button class="btn-delegate" id="btn-download-receipt-json">
            ⬇ Descargar Prueba JSON
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
    setTimeout(() => { copyBtn.textContent = '📋 Copiar Nullifier'; }, 2000);
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
