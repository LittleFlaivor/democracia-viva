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
      <!-- Izquierda: Marca, Isotipo y Versión Alpha -->
      <div class="footer-bar-left">
        <div class="footer-micro-brand">
          <span class="footer-micro-logo" aria-hidden="true">
            <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" class="footer-svg-icon">
              <path d="M 8 36 L 8 20 C 8 12.268 14.268 6 22 6 C 29.732 6 36 12.268 36 20 L 36 36" stroke="#2563EB" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="5" y1="36" x2="39" y2="36" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
              <path d="M 14 22 L 20 28 L 34 14" stroke="#10B981" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <span class="footer-micro-name">Democracia Viva</span>
          <span class="footer-alpha-micro-pill" title="Entorno de validación cívica y biometría Passkeys">
            <span class="footer-pulse-dot" aria-hidden="true"></span>
            v0.5 Alpha
          </span>
        </div>
      </div>

      <!-- Centro: Iniciativa Legislativa y Garantías Criptográficas -->
      <div class="footer-bar-center">
        <span class="footer-meta-item highlight">RDL 2/2026 de Vivienda</span>
        <span class="footer-meta-sep" aria-hidden="true">·</span>
        <span class="footer-meta-item">Voto Inmutable (Pruebas ZK)</span>
        <span class="footer-meta-sep" aria-hidden="true">·</span>
        <span class="footer-meta-item">Sin Cookies de Rastreo</span>
      </div>

      <!-- Derecha: Código Abierto en GitHub, Instalar App y Copyright -->
      <div class="footer-bar-right">
        ${!isInstalled ? `
        <button type="button" class="footer-install-btn" id="btn-footer-install" title="Instalar aplicación en tu móvil u ordenador">
          <span>📲 Instalar</span>
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
          <span>Código Abierto</span>
          <span class="footer-ext-arrow" aria-hidden="true">↗</span>
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


