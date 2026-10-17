/**
 * COMPONENTES DE INSTALACIÓN PWA (NO INVASIVOS)
 * 1. Banner flotante no invasivo (Gentle Banner): aparece sutilmente tras interactuar y se descarta con 1 clic.
 * 2. Modal explicativo para iOS Safari (Compartir -> Añadir a pantalla de inicio).
 */

import { pwaService } from '../../services/pwa-service.ts';
import { soundFx } from '../gamified/sound-fx.ts';

export function renderGentlePwaBanner(container: HTMLElement, onOpenIosGuide: () => void): void {
  // Si ya está instalada o el usuario decidió no verla, no renderizar nada
  if (pwaService.isInstalled() || pwaService.isPromptDismissed()) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <aside class="pwa-gentle-banner hud-pill-capsule" role="dialog" aria-label="Instalar Democracia Viva">
      <div class="pwa-banner-main">
        <div class="pwa-banner-icon-badge" aria-hidden="true">📲</div>
        <div class="pwa-banner-copy">
          <strong class="pwa-banner-title">Instala la App en tu dispositivo</strong>
          <span class="pwa-banner-desc">Acceso rápido a pantalla completa y firma biométrica directa.</span>
        </div>
      </div>
      <div class="pwa-banner-actions">
        <button type="button" class="pwa-btn-primary" id="btn-pwa-install-action">
          Instalar App
        </button>
        <button type="button" class="pwa-btn-dismiss" id="btn-pwa-dismiss-action" title="No mostrar de nuevo">
          Ahora no
        </button>
      </div>
    </aside>
  `;

  const banner = container.querySelector('.pwa-gentle-banner') as HTMLElement | null;

  // Acción de instalar
  container.querySelector('#btn-pwa-install-action')?.addEventListener('click', async () => {
    soundFx.playTap();
    const result = await pwaService.triggerInstall();
    if (result === 'ios') {
      onOpenIosGuide();
    }
    // Ocultar banner
    if (banner) {
      banner.classList.add('is-dismissing');
      setTimeout(() => { container.innerHTML = ''; }, 300);
    }
  });

  // Acción de descartar sin molestar más
  container.querySelector('#btn-pwa-dismiss-action')?.addEventListener('click', () => {
    soundFx.playTap();
    pwaService.dismissPrompt();
    if (banner) {
      banner.classList.add('is-dismissing');
      setTimeout(() => { container.innerHTML = ''; }, 300);
    }
  });
}

export function renderIosInstallModal(container: HTMLElement, onClose: () => void): void {
  container.innerHTML = `
    <div class="modal-backdrop-blur" id="ios-pwa-backdrop" role="dialog" aria-modal="true">
      <div class="modal-card pwa-ios-modal-card">
        <button class="modal-close-btn" id="btn-close-ios-modal" aria-label="Cerrar guía">×</button>

        <div class="pwa-ios-header">
          <div class="pwa-ios-icon-glow">📲</div>
          <h3 class="modal-title">Cómo instalar Democracia Viva en iPhone / iPad</h3>
          <p class="modal-subtitle">Safari no permite la instalación directa automática, pero puedes añadirla en 2 sencillos pasos:</p>
        </div>

        <div class="pwa-ios-steps">
          <div class="pwa-ios-step-item">
            <div class="pwa-step-number">1</div>
            <div class="pwa-step-content">
              <strong>Toca el botón "Compartir" en Safari</strong>
              <span>Es el icono cuadrado con la flecha hacia arriba situado en la barra inferior de tu navegador.</span>
            </div>
            <div class="pwa-step-badge">⎋</div>
          </div>

          <div class="pwa-ios-step-divider"></div>

          <div class="pwa-ios-step-item">
            <div class="pwa-step-number">2</div>
            <div class="pwa-step-content">
              <strong>Selecciona "Añadir a pantalla de inicio"</strong>
              <span>Desliza ligeramente hacia abajo en el menú de opciones y pulsa "Añadir".</span>
            </div>
            <div class="pwa-step-badge">＋</div>
          </div>
        </div>

        <div class="pwa-ios-features">
          <div class="pwa-feature-pill">⚡ Experiencia nativa a pantalla completa</div>
          <div class="pwa-feature-pill">🛡️ Acceso biométrico con TouchID / FaceID</div>
        </div>

        <div class="modal-actions-dual">
          <button type="button" class="btn btn-primary" id="btn-understood-ios" style="width: 100%;">
            ¡Entendido!
          </button>
        </div>
      </div>
    </div>
  `;

  const close = () => {
    soundFx.playTap();
    onClose();
  };

  container.querySelector('#btn-close-ios-modal')?.addEventListener('click', close);
  container.querySelector('#btn-understood-ios')?.addEventListener('click', close);
  container.querySelector('#ios-pwa-backdrop')?.addEventListener('click', (e) => {
    if (e.target === container.querySelector('#ios-pwa-backdrop')) close();
  });
}
