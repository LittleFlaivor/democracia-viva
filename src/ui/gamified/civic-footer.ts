/**
 * COMPONENTE: PIE DE PÁGINA INSTITUCIONAL PROFESIONAL (CIVIC FOOTER)
 * Incluye identidad, versión (v0.5 Alpha), garantías criptográficas,
 * enlaces a código abierto en GitHub y declaración de neutralidad cívica.
 */

export function renderCivicFooter(container: HTMLElement): void {
  container.innerHTML = `
    <div class="civic-footer-inner">
      <!-- Banner Destacado Institucional de Versión en Pruebas -->
      <div class="footer-alpha-notice-card">
        <div class="alpha-notice-header">
          <span class="alpha-notice-icon" aria-hidden="true">⚠️</span>
          <span class="alpha-notice-badge">AVISO DE VERSIÓN EN PRUEBAS · v0.5 ALPHA</span>
        </div>
        <p class="alpha-notice-text">
          <strong>Democracia Viva</strong> se encuentra actualmente en fase piloto de validación cívica, rendimiento de biometría Passkeys y resistencia criptográfica. Las deliberaciones y votos actuales forman parte de simulaciones ciudadanas abiertas sin vinculación jurídica oficial ante las Cortes Generales.
        </p>
      </div>

      <div class="footer-top-grid">
        <!-- Columna 1: Identidad y Versión -->
        <div class="footer-brand-col">
          <div class="footer-brand-header">
            <div class="footer-logo-mark" aria-hidden="true">
              <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" class="footer-svg-icon">
                <path d="M 8 36 L 8 20 C 8 12.268 14.268 6 22 6 C 29.732 6 36 12.268 36 20 L 36 36" stroke="#2563EB" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="5" y1="36" x2="39" y2="36" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
                <path d="M 14 22 L 20 28 L 34 14" stroke="#10B981" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span class="font-display footer-brand-title">Democracia Viva</span>
            <span class="footer-version-tag">v0.5 Alpha</span>
          </div>

          <p class="footer-lead-text">
            Plataforma cívica soberana de deliberación y consenso ciudadano basada en democracia líquida,
            pruebas de conocimiento cero (ZK-SNARKs) y criptografía de clave pública verificable.
          </p>

          <div class="footer-status-indicator test-mode">
            <span class="status-pulse-amber-dot" aria-hidden="true"></span>
            <span class="status-pulse-label">Entorno Piloto de Pruebas · Red Firestore Activa</span>
          </div>
        </div>

        <!-- Columna 2: Marco Legislativo y Consenso -->
        <div class="footer-nav-col">
          <h4 class="footer-col-heading">Gobernanza Cívica</h4>
          <ul class="footer-link-list">
            <li><span class="footer-link-item active-topic">RDL 2/2026 de Vivienda</span></li>
            <li><span class="footer-link-item">Monográficos de Neutralidad</span></li>
            <li><span class="footer-link-item">Metodología de Consenso Líquido</span></li>
            <li><span class="footer-link-item">Fuentes Oficiales del BOE</span></li>
          </ul>
        </div>

        <!-- Columna 3: Criptografía y Transparencia -->
        <div class="footer-nav-col">
          <h4 class="footer-col-heading">Criptografía y Auditoría</h4>
          <ul class="footer-link-list">
            <li><span class="footer-link-item">Árbol de Merkle (SHA-256)</span></li>
            <li><span class="footer-link-item">Pruebas ZK (Nullifier Único)</span></li>
            <li><span class="footer-link-item">Passkeys L2 sin Gas</span></li>
            <li>
              <a 
                href="https://github.com/LittleFlaivor/democracia-viva" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="footer-link-item github-link"
              >
                <span>Código Abierto en GitHub</span>
                <span class="external-arrow">↗</span>
              </a>
            </li>
          </ul>
        </div>

        <!-- Columna 4: Garantías del Ciudadano -->
        <div class="footer-nav-col">
          <h4 class="footer-col-heading">Garantías Constitucionales</h4>
          <ul class="footer-link-list">
            <li><span class="footer-link-item">Voto 100% Secreto y Libre</span></li>
            <li><span class="footer-link-item">Revocabilidad en Caliente</span></li>
            <li><span class="footer-link-item">Identidad Segura con DNIe</span></li>
            <li><span class="footer-link-item">Sin Cookies de Rastreo</span></li>
          </ul>
        </div>
      </div>

      <!-- Barra Inferior de Copyright y Auditoría -->
      <div class="footer-bottom-bar">
        <div class="footer-bottom-legal">
          <span>© 2026 Democracia Viva. Proyecto de tecnología cívica para el consenso social.</span>
          <span class="footer-separator">·</span>
          <span>Desarrollado bajo licencia abierta para la soberanía del ciudadano.</span>
        </div>
        <div class="footer-bottom-tech">
          <span class="badge-mono footer-mono-pill">v0.5-alpha · build.2026.10</span>
        </div>
      </div>
    </div>
  `;
}
