/**
 * COMPONENTE: PIE DE PÁGINA ULTRA COMPACTO E INTEGRADO (CIVIC FOOTER)
 * Diseñado como una micro-barra minimalista integrada orgánicamente en el fondo ambiental,
 * extrayendo lo esencial: identidad cívica, versión v0.5 Alpha en pruebas,
 * contexto legislativo (RDL 2/2026 de Vivienda), código abierto en GitHub y garantías ciudadanas.
 */

import { pwaService } from '../../services/pwa-service.ts';
import { soundFx } from './sound-fx.ts';

export function renderCivicFooter(container: HTMLElement, onOpenIosGuide?: () => void): void {
  const isInstalled = pwaService.isInstalled();

  container.innerHTML = `
    <div class="civic-footer-bar" role="contentinfo" aria-label="Pie de Página Integrado">
      <!-- Izquierda: Marca Cívica Discreta -->
      <div class="footer-bar-left">
        <span class="footer-micro-name">Democracia Viva</span>
      </div>

      <!-- Centro: Contexto Legal Minimalista (Oculto en móvil) -->
      <div class="footer-bar-center">
        <span class="footer-meta-item highlight">RDL 2/2026 de Vivienda</span>
        <span class="footer-meta-sep" aria-hidden="true">·</span>
        <span class="footer-meta-item">Voto Inmutable (ZK)</span>
      </div>

      <!-- Derecha: Código Abierto, Instalar App y Copyright -->
      <div class="footer-bar-right">
        ${!isInstalled ? `
        <button type="button" class="footer-install-btn" id="btn-footer-install" title="Instalar aplicación en tu dispositivo">
          <svg class="footer-svg-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="5" y="2" width="10" height="16" rx="2" />
            <path d="M10 15h.01M8 8l2 2 2-2M10 5v5" />
          </svg>
          <span>Instalar</span>
        </button>
        <span class="footer-meta-sep" aria-hidden="true">·</span>
        ` : ''}
        <a 
          href="https://github.com/LittleFlaivor/democracia-viva" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="footer-github-link"
          title="Repositorio auditado en GitHub (Código Abierto)"
        >
          <span>Código Abierto ↗</span>
        </a>
        <span class="footer-meta-sep" aria-hidden="true">·</span>
        <span class="footer-copyright">© 2026</span>
      </div>
    </div>
  `;

  container.querySelector('#btn-footer-install')?.addEventListener('click', async () => {
    soundFx.playTap();
    const result = await pwaService.triggerInstall();
    if (result === 'ios') {
      onOpenIosGuide?.();
    }
  });
}


