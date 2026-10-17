/**
 * COMPONENTE: DOCK DE PERFIL CIUDADANO FLOTANTE Y SELECTOR DE TEMA (VIDEO-GAME HUD STYLE)
 * Diseño 100% integrado sin fondo blanco divisor, flotando orgánicamente sobre el escenario.
 * Incorpora el nuevo logotipo oficial de Democracia Viva.
 */

import { CivicAppStore } from '../../state/store.ts';
import { GameStore } from '../../state/game-store.ts';
import { renderBrandLogo } from './brand-logo.ts';
import { soundFx } from './sound-fx.ts';

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

export function renderProfileDock(container: HTMLElement) {
  const civicStore = CivicAppStore.getInstance();
  const activeCitizen = civicStore.getActiveCitizen();
  const currentTheme = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || getInitialTheme();

  container.innerHTML = `
    <nav class="profile-dock-bar hud-floating-menu" aria-label="Menú Principal Integrado">
      <!-- Izquierda: Logotipo Oficial Vectorial Integrado -->
      <div class="dock-left-group">
        <div class="dock-brand-mark">
          ${renderBrandLogo({ compact: false, showBadge: true })}
        </div>
        <span class="dock-alpha-tag" title="Entorno de Pruebas v0.5 Alpha">Alpha en Pruebas</span>

        <!-- Ficha de Identidad Ciudadana Única Soberana (Opción 1) -->
        <div class="dock-user-profile hud-pill-capsule" title="Identidad soberana verificada con DNIe y credencial ZK Semaphore">
          <span class="dock-user-avatar">${activeCitizen.avatar}</span>
          <span class="dock-user-name">${activeCitizen.name}</span>
          <span class="dock-user-badge">DNIe Verificado ✓</span>
        </div>
      </div>

      <!-- Derecha: Passkey Segura + Interruptor Dual Claro / Oscuro en Cápsulas Flotantes -->
      <div class="dock-right-group">
        <div class="dock-privacy-pill hud-pill-capsule" title="Identidad soberana ERC-4337 sobre L2 de Arbitrum">
          <span class="dock-pulse-green"></span>
          <span>Passkey Gasless · L2</span>
        </div>

        <!-- Interruptor de Sonido Gamer -->
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
          title="Alternar entre Modo Claro Editorial y Modo Oscuro"
          aria-label="Cambiar tema de color"
        >
          <span class="theme-icon">${currentTheme === 'dark' ? '☀️' : '🌙'}</span>
          <span class="theme-text">${currentTheme === 'dark' ? 'Claro' : 'Oscuro'}</span>
        </button>
      </div>
    </nav>
  `;



  // Listener para cambio de sonido
  container.querySelector('#btn-sound-toggle')?.addEventListener('click', () => {
    soundFx.toggleMute();
    renderProfileDock(container);
  });

  // Listener para cambio de tema
  container.querySelector('#btn-theme-toggle')?.addEventListener('click', () => {
    soundFx.playTap();
    const active = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = active === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    renderProfileDock(container);
  });
}
