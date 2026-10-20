/**
 * COMPONENTE: DOCK DE PERFIL CIUDADANO FLOTANTE Y SELECTOR DE TEMA (VIDEO-GAME HUD STYLE)
 * Diseño 100% integrado sin fondo blanco divisor, flotando orgánicamente sobre el escenario.
 * Incorpora el nuevo logotipo oficial de Democracia Viva.
 */

import { CivicAppStore } from '../../state/store.ts';
import { GameStore } from '../../state/game-store.ts';
import { renderBrandLogo } from './brand-logo.ts';
import { soundFx } from './sound-fx.ts';
import { getLocalCitizenCredential, isTestBypassEnabled, setTestBypassEnabled } from '../../services/auth.ts';
import { pwaService } from '../../services/pwa-service.ts';

export function getInitialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('DEMOCRACIA_VIVA_THEME');
  if (saved === 'dark' || saved === 'light') return saved;
  return 'light'; // Por defecto: Light Editorial First
}

export function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('DEMOCRACIA_VIVA_THEME', theme);
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'dark' ? '#090A0F' : '#2563EB');
  }
}

export function renderProfileDock(
  container: HTMLElement, 
  onOpenIdentityModal?: () => void,
  onOpenIosGuide?: () => void
) {
  const localCred = getLocalCitizenCredential();
  const currentTheme = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || getInitialTheme();
  const bypassActive = isTestBypassEnabled();
  const isInstalled = pwaService.isInstalled();

  container.innerHTML = `
    <nav class="profile-dock-bar hud-floating-menu" aria-label="Menú Principal Integrado">
      <!-- Izquierda: Logotipo Oficial interactivo (Inicio y Actualización forzada) -->
      <div class="dock-left-group">
        <button 
          type="button" 
          class="dock-brand-btn" 
          id="btn-logo-home" 
          title="Democracia Viva: Ir al inicio y actualizar versión" 
          aria-label="Democracia Viva: Ir al inicio y actualizar"
        >
          <div class="dock-brand-mark">
            ${renderBrandLogo({ compact: true, showBadge: false })}
          </div>
        </button>
      </div>

      <!-- Derecha: TODOS los Iconos de Estado y Utilidad Apilados y Compactos con Iconografía Vectorial Monocromática (0 Emojis) -->
      <div class="dock-right-group">
        <!-- Ficha de Identidad Ciudadana / Passkey -->
        <button 
          type="button" 
          class="dock-user-profile hud-pill-capsule interactive" 
          id="btn-dock-identity" 
          title="Ver estado de identidad cívica y autenticación Passkey"
          aria-label="Identidad cívica Passkey"
        >
          <span class="dock-user-avatar">
            ${localCred ? `
              <svg class="dock-svg-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M10 2l6 3v5c0 4.5-2.5 7.5-6 8-3.5-.5-6-3.5-6-8V5l6-3z" />
                <path d="M7.5 10l2 2 3.5-3.5" />
              </svg>
            ` : `
              <svg class="dock-svg-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="7.5" cy="12.5" r="3.5" />
                <path d="M10 10l6.5-6.5M14 6l1.5 1.5M16 4l1 1" />
              </svg>
            `}
          </span>
          <span class="dock-user-name">${localCred ? 'Ciudadano' : 'Acceso'}</span>
          <span class="dock-user-badge ${localCred ? 'is-verified' : ''}">${localCred ? 'Passkey ✓' : 'Fricción 0'}</span>
        </button>

        <!-- Conmutador Discreto de Pruebas Ágiles -->
        <button 
          type="button" 
          class="dock-bypass-pill hud-pill-capsule ${bypassActive ? 'is-bypass-active' : ''}" 
          id="btn-dock-bypass" 
          title="${bypassActive ? 'Modo Pruebas ACTIVO: se omite la biometría. Clic para desactivar.' : 'Modo Pruebas INACTIVO: clic para omitir biometría en pruebas rápidas.'}"
          aria-label="Modo pruebas biometría"
        >
          <span class="bypass-lightning">
            <svg class="dock-svg-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M11 2L4 11h5l-1 7 7-9h-5l1-7z" />
            </svg>
          </span>
          <span class="bypass-label">${bypassActive ? 'Sin Biometría' : 'Modo Pruebas'}</span>
        </button>

        <!-- Acceso directo al Centro de Mando / Sandbox -->
        <a 
          href="/admin" 
          class="dock-bypass-pill hud-pill-capsule is-sandbox-badge" 
          id="btn-dock-sandbox" 
          title="Abrir Zero-Trust Command Center y Laboratorio Sandbox (/admin)"
          aria-label="Admin Sandbox"
        >
          <span class="bypass-lightning">
            <svg class="dock-svg-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10 2l6 3v5c0 4.5-2.5 7.5-6 8-3.5-.5-6-3.5-6-8V5l6-3z" />
            </svg>
          </span>
          <span class="bypass-label">SANDBOX</span>
        </a>

        ${!isInstalled ? `
        <!-- Botón de Instalación PWA Discreto -->
        <button 
          class="install-pwa-btn hud-pill-capsule" 
          id="btn-dock-install" 
          title="Instalar Democracia Viva en tu dispositivo"
          aria-label="Instalar app"
        >
          <span class="install-icon">
            <svg class="dock-svg-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="5" y="2" width="10" height="16" rx="2" />
              <path d="M10 15h.01M8 8l2 2 2-2M10 5v5" />
            </svg>
          </span>
        </button>
        ` : ''}

        <!-- Interruptor de Sonido -->
        <button 
          class="sound-toggle-btn hud-pill-capsule" 
          id="btn-sound-toggle" 
          title="Alternar efectos de sonido del juego"
          aria-label="Alternar audio"
        >
          <span class="sound-icon">
            ${soundFx.getIsMuted() ? `
              <svg class="dock-svg-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polygon points="9 4 5 7 2 7 2 13 5 13 9 16 9 4" />
                <line x1="13" y1="7" x2="17" y2="13" />
                <line x1="17" y1="7" x2="13" y2="13" />
              </svg>
            ` : `
              <svg class="dock-svg-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polygon points="9 4 5 7 2 7 2 13 5 13 9 16 9 4" />
                <path d="M13 7a4 4 0 0 1 0 6M15.5 4.5a7.5 7.5 0 0 1 0 11" />
              </svg>
            `}
          </span>
          <span class="sound-text">${soundFx.getIsMuted() ? 'Mudo' : 'Audio'}</span>
        </button>

        <!-- Interruptor de Tema (Sol / Luna) -->
        <button 
          class="theme-toggle-btn hud-pill-capsule" 
          id="btn-theme-toggle" 
          title="Alternar entre Modo Claro y Modo Oscuro"
          aria-label="Cambiar tema de color"
        >
          <span class="theme-icon">
            ${currentTheme === 'dark' ? `
              <svg class="dock-svg-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="10" cy="10" r="3.5" />
                <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.34 4.34l1.42 1.42M14.24 14.24l1.42 1.42M4.34 15.66l1.42-1.42M14.24 5.76l1.42-1.42" />
              </svg>
            ` : `
              <svg class="dock-svg-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M16.5 11.5A6.5 6.5 0 1 1 8.5 3.5a5 5 0 0 0 8 8z" />
              </svg>
            `}
          </span>
          <span class="theme-text">${currentTheme === 'dark' ? 'Claro' : 'Oscuro'}</span>
        </button>
      </div>
    </nav>
  `;

  // Listener para el logo: reiniciar al inicio (carta 1) y forzar actualización
  container.querySelector('#btn-logo-home')?.addEventListener('click', async () => {
    soundFx.playTap();
    await pwaService.forceUpdateAndReload();
  });

  // Escuchar si hay una nueva versión disponible para destacar el logo
  window.addEventListener('dv-pwa-update-available', () => {
    const brandBtn = container.querySelector('#btn-logo-home');
    if (brandBtn) {
      brandBtn.classList.add('has-pending-update');
      brandBtn.setAttribute('title', '¡Nueva versión disponible! Pulsa para actualizar ahora');
    }
  }, { once: true });

  // Listener para botón de instalación PWA
  container.querySelector('#btn-dock-install')?.addEventListener('click', async () => {
    soundFx.playTap();
    const result = await pwaService.triggerInstall();
    if (result === 'ios') {
      onOpenIosGuide?.();
    }
  });

  // Listener para abrir modal de identidad cívica / Passkey
  container.querySelector('#btn-dock-identity')?.addEventListener('click', () => {
    soundFx.playTap();
    onOpenIdentityModal?.();
  });

  // Listener para alternar modo pruebas rápidas sin biometría
  container.querySelector('#btn-dock-bypass')?.addEventListener('click', () => {
    soundFx.playTap();
    setTestBypassEnabled(!isTestBypassEnabled());
    renderProfileDock(container, onOpenIdentityModal, onOpenIosGuide);
  });

  // Listener para cambio de sonido
  container.querySelector('#btn-sound-toggle')?.addEventListener('click', () => {
    soundFx.toggleMute();
    renderProfileDock(container, onOpenIdentityModal, onOpenIosGuide);
  });

  // Listener para cambio de tema
  container.querySelector('#btn-theme-toggle')?.addEventListener('click', () => {
    soundFx.playTap();
    const active = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = active === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    renderProfileDock(container, onOpenIdentityModal, onOpenIosGuide);
  });
}

