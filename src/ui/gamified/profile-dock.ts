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
    metaTheme.setAttribute('content', theme === 'dark' ? '#090A0F' : '#F8F9FA');
  }
}

export function renderProfileDock(container: HTMLElement, onOpenIdentityModal?: () => void) {
  const localCred = getLocalCitizenCredential();
  const currentTheme = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || getInitialTheme();
  const bypassActive = isTestBypassEnabled();

  container.innerHTML = `
    <nav class="profile-dock-bar hud-floating-menu" aria-label="Menú Principal Integrado">
      <!-- Izquierda: Logotipo Compacto Oficial, Versión Alpha y Modo Pruebas -->
      <div class="dock-left-group">
        <div class="dock-brand-mark">
          ${renderBrandLogo({ compact: true, showBadge: false })}
        </div>
        <span class="dock-alpha-tag" title="Entorno piloto de pruebas v0.5 Alpha">v0.5 Alpha</span>

        <!-- Ficha de Identidad Ciudadana Soberana (Interactiva) -->
        <button 
          type="button" 
          class="dock-user-profile hud-pill-capsule interactive" 
          id="btn-dock-identity" 
          title="Ver estado de identidad cívica y autenticación Passkey"
        >
          <span class="dock-user-avatar">${localCred ? '🛡️' : '🔑'}</span>
          <span class="dock-user-name">${localCred ? 'Ciudadano' : 'Acceso'}</span>
          <span class="dock-user-badge ${localCred ? 'is-verified' : ''}">${localCred ? 'Passkey ✓' : 'Fricción 0'}</span>
        </button>

        <!-- Conmutador Discreto de Pruebas Ágiles -->
        <button 
          type="button" 
          class="dock-bypass-pill hud-pill-capsule ${bypassActive ? 'is-bypass-active' : ''}" 
          id="btn-dock-bypass" 
          title="${bypassActive ? 'Modo Pruebas ACTIVO: se omite la biometría. Clic para desactivar.' : 'Modo Pruebas INACTIVO: clic para omitir biometría en pruebas rápidas.'}"
        >
          <span class="bypass-lightning">⚡</span>
          <span class="bypass-label">${bypassActive ? 'Sin Biometría' : 'Modo Pruebas'}</span>
        </button>
      </div>

      <!-- Derecha: Interruptor de Sonido e Interruptor Dual Claro / Oscuro -->
      <div class="dock-right-group">
        <!-- Interruptor de Sonido -->
        <button 
          class="sound-toggle-btn hud-pill-capsule" 
          id="btn-sound-toggle" 
          title="Alternar efectos de sonido del juego"
          aria-label="Alternar audio"
        >
          <span class="sound-icon">${soundFx.getIsMuted() ? '🔇' : '🔊'}</span>
          <span class="sound-text">${soundFx.getIsMuted() ? 'Mudo' : 'Audio'}</span>
        </button>

        <button 
          class="theme-toggle-btn hud-pill-capsule" 
          id="btn-theme-toggle" 
          title="Alternar entre Modo Claro y Modo Oscuro"
          aria-label="Cambiar tema de color"
        >
          <span class="theme-icon">${currentTheme === 'dark' ? '☀️' : '🌙'}</span>
          <span class="theme-text">${currentTheme === 'dark' ? 'Claro' : 'Oscuro'}</span>
        </button>
      </div>
    </nav>
  `;

  // Listener para abrir modal de identidad cívica / Passkey
  container.querySelector('#btn-dock-identity')?.addEventListener('click', () => {
    soundFx.playTap();
    onOpenIdentityModal?.();
  });

  // Listener para alternar modo pruebas rápidas sin biometría
  container.querySelector('#btn-dock-bypass')?.addEventListener('click', () => {
    soundFx.playTap();
    setTestBypassEnabled(!isTestBypassEnabled());
    renderProfileDock(container, onOpenIdentityModal);
  });

  // Listener para cambio de sonido
  container.querySelector('#btn-sound-toggle')?.addEventListener('click', () => {
    soundFx.toggleMute();
    renderProfileDock(container, onOpenIdentityModal);
  });

  // Listener para cambio de tema
  container.querySelector('#btn-theme-toggle')?.addEventListener('click', () => {
    soundFx.playTap();
    const active = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = active === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    renderProfileDock(container, onOpenIdentityModal);
  });
}

