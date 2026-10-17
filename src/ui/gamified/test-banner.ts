/**
 * COMPONENTE: BANNER INSTITUCIONAL DE ADVERTENCIA DE VERSIÓN EN PRUEBAS
 * Muestra de forma destacada y elegante el aviso de Versión 0.5 Alpha (Entorno de Pruebas),
 * con enlace directo para desplazarse suavemente al pie de página y ver la auditoría técnica.
 */

export function renderTestBanner(container: HTMLElement): void {
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
            Entorno experimental de validación cívica y biometría Passkeys (WebAuthn). Las votaciones y decretos actuales son simulaciones ciudadanas de prueba.
          </p>
        </div>
        <div class="test-banner-right">
          <button 
            type="button" 
            class="test-banner-btn-scroll" 
            id="btn-banner-to-footer"
            title="Ir directamente al pie de página para ver auditoría, código abierto y versión"
          >
            <span>Ver Pie de Página y Auditoría</span>
            <span class="banner-down-arrow" aria-hidden="true">↓</span>
          </button>
        </div>
      </div>
    </div>
  `;

  const scrollBtn = container.querySelector('#btn-banner-to-footer');
  if (scrollBtn) {
    scrollBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const footer = document.getElementById('civic-footer-container');
      if (footer) {
        footer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Foco accesible al footer
        footer.setAttribute('tabindex', '-1');
        footer.focus({ preventScroll: true });
      }
    });
  }
}
