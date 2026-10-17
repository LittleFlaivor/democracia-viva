/**
 * COMPONENTE: LOGOTIPO OFICIAL DE DEMOCRACIA VIVA
 * Diseño vectorial amigable, elegante, geométrico y 100% entendible.
 * Simboliza el portal cívico de la asamblea y la chispa viva de la participación ciudadana.
 */

export function renderBrandLogo(options: { compact?: boolean; showBadge?: boolean } = {}): string {
  const { compact = false, showBadge = true } = options;

  return `
    <div class="brand-logo-container ${compact ? 'brand-compact' : ''}" role="banner" aria-label="Democracia Viva">
      <!-- Isotipo Vectorial Geométrico -->
      <div class="brand-logo-symbol" aria-hidden="true">
        <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" class="logo-svg-mark">
          <defs>
            <!-- Gradiente Principal: Azul Real a Cyan Vivo -->
            <linearGradient id="dv-logo-grad" x1="4" y1="4" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#2563EB" />
              <stop offset="50%" stop-color="#3B82F6" />
              <stop offset="100%" stop-color="#06B6D4" />
            </linearGradient>

            <!-- Gradiente de Acento Vivo -->
            <linearGradient id="dv-pulse-grad" x1="18" y1="14" x2="38" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#10B981" />
              <stop offset="100%" stop-color="#06B6D4" />
            </linearGradient>
            
            <!-- Sombra física sutil para dar volumen suave -->
            <filter id="dv-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#2563EB" flood-opacity="0.25" />
            </filter>
          </defs>

          <!-- 1. El Portal Cívico / Ágora: Arco protector con geometría pura y esquinas redondeadas -->
          <path 
            d="M 8 36 L 8 20 C 8 12.268 14.268 6 22 6 C 29.732 6 36 12.268 36 20 L 36 36" 
            stroke="url(#dv-logo-grad)" 
            stroke-width="3.5" 
            stroke-linecap="round"
            stroke-linejoin="round"
            class="logo-portal-path"
          />

          <!-- 2. La Columna y Base de Consenso: Línea de suelo institucional -->
          <line 
            x1="5" y1="36" x2="39" y2="36" 
            stroke="currentColor" 
            stroke-width="3.2" 
            stroke-linecap="round"
            class="logo-base-line"
          />

          <!-- 3. La Chispa / Voto Vivo en Movimiento: Checkmark ascendente orgánico -->
          <path 
            d="M 14 22 L 20 28 L 34 14" 
            stroke="url(#dv-pulse-grad)" 
            stroke-width="4.2" 
            stroke-linecap="round" 
            stroke-linejoin="round"
            filter="url(#dv-glow)"
            class="logo-check-path"
          />
        </svg>
      </div>

      <!-- Tipografía Principal: "Democracia Viva" con lectura inmediata -->
      <div class="brand-logo-text">
        <div class="brand-text-row">
          <span class="brand-word-democracia">Democracia</span>
          <span class="brand-word-viva">Viva</span>
          <span class="brand-pulse-status" title="Red ciudadana en vivo" aria-hidden="true"></span>
        </div>
        ${
          showBadge
            ? `
          <div class="brand-descriptor-row">
            <span class="brand-tagline">GOBERNANZA CÍVICA VERIFICABLE</span>
          </div>
        `
            : ''
        }
      </div>
    </div>
  `;
}
