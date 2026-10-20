/**
 * COMPONENTE: BANNER INSTITUCIONAL DE ADVERTENCIA DE VERSIÓN EN PRUEBAS
 * Muestra de forma destacada y elegante el aviso de Versión 0.5 Alpha (Entorno de Pruebas),
 * permite alternar el modo rápido de omisión de biometría para pruebas ágiles,
 * y ofrece enlace directo para desplazarse suavemente al pie de página.
 */

import { isTestBypassEnabled, setTestBypassEnabled } from '../../services/auth.ts';
import { soundFx } from './sound-fx.ts';

export function renderTestBanner(container: HTMLElement): void {
  const bypassActive = isTestBypassEnabled();

  container.innerHTML = `
    <div class="civic-test-banner" role="region" aria-label="Aviso de Versión en Pruebas">
      <div class="test-banner-inner">
        <div class="test-banner-left">
          <span class="test-pill-indicator">
            <span class="test-amber-dot" aria-hidden="true"></span>
            <strong class="test-pill-title">VERSIÓN EN PRUEBAS</strong>
            <span class="test-pill-version">v0.5 Alpha</span>
          </span>
          <p class="test-banner-message">
            Versión preliminar en fase de pruebas públicas. Las votaciones actuales son simulaciones para evaluar la usabilidad y la seguridad del sistema.
          </p>
        </div>
        <div class="test-banner-right" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <!-- Botón de Alternancia Rápida para Pruebas Ágiles -->
          <button 
            type="button" 
            class="test-banner-btn-scroll ${bypassActive ? 'is-active-bypass' : ''}" 
            id="btn-toggle-bypass-banner"
            title="Alternar entre solicitar biometría o saltar verificación para pruebas rápidas"
            style="${bypassActive ? 'background: #059669; color: white; border-color: #047857;' : ''}"
          >
            <span>${bypassActive ? 'Modo Pruebas (Sin Biometría)' : 'Votar sin Biometría (Pruebas)'}</span>
          </button>

          <button 
            type="button" 
            class="test-banner-btn-scroll" 
            id="btn-banner-to-footer"
            title="Ir directamente al pie de página para ver auditoría, código abierto y versión"
          >
            <span>Ver Pie de Página</span>
            <span class="banner-down-arrow" aria-hidden="true">↓</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Listener para alternar modo omisión de biometría en pruebas
  container.querySelector('#btn-toggle-bypass-banner')?.addEventListener('click', () => {
    soundFx.playTap();
    const nextState = !isTestBypassEnabled();
    setTestBypassEnabled(nextState);
    renderTestBanner(container);
  });

  // Listener para scroll hacia el footer
  container.querySelector('#btn-banner-to-footer')?.addEventListener('click', (e) => {
    e.preventDefault();
    const footer = document.getElementById('civic-footer-container');
    if (footer) {
      footer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      footer.setAttribute('tabindex', '-1');
      footer.focus({ preventScroll: true });
    }
  });
}
