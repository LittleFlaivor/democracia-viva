/**
 * SERVICIO PWA E INSTALACIÓN CÍVICA (PROGRESSIVE WEB APP)
 * Gestiona el registro del Service Worker, la captura respetuosa del evento 'beforeinstallprompt',
 * detección de standalone (modo app instalada) y la lógica para iOS Safari.
 */

import { GameStore } from '../state/game-store.ts';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

class PwaService {
  private static instance: PwaService | null = null;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isStandaloneMode = false;
  private isInitialized = false;

  private constructor() {
    this.checkStandalone();
  }

  public static getInstance(): PwaService {
    if (!PwaService.instance) {
      PwaService.instance = new PwaService();
    }
    return PwaService.instance;
  }

  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Registrar Service Worker para caché y soporte offline
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { updateViaCache: 'none' })
          .then((reg) => {
            console.log('[PWA] Service Worker registrado con éxito:', reg.scope);
            // Comprobar actualizaciones al enfocar la pestaña o pantalla
            window.addEventListener('focus', () => {
              reg.update().catch(() => {});
            });
            // Detectar si hay un nuevo worker esperando para activarse
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] Nueva versión disponible');
                    window.dispatchEvent(new CustomEvent('dv-pwa-update-available'));
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn('[PWA] Error registrando Service Worker:', err);
          });
      });
    }

    // 2. Capturar evento de instalación nativo (Chromium / Edge / Android)
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      // Prevenir el banner invasivo automático del navegador
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      window.dispatchEvent(new CustomEvent('dv-pwa-state-change'));
    });

    // 3. Detectar cuando la app ha sido instalada exitosamente
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.isStandaloneMode = true;
      localStorage.setItem('DEMOCRACIA_VIVA_PWA_INSTALLED', 'true');
      window.dispatchEvent(new CustomEvent('dv-pwa-state-change'));
      console.log('[PWA] ¡Democracia Viva instalada en el dispositivo!');
    });

    // 4. Escuchar cambios de visualización
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      this.isStandaloneMode = e.matches;
      window.dispatchEvent(new CustomEvent('dv-pwa-state-change'));
    });
  }

  private checkStandalone(): void {
    if (typeof window === 'undefined') return;
    const isStandaloneDisplay = window.matchMedia('(display-mode: standalone)').matches;
    const isNavigatorStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const isStoredInstalled = localStorage.getItem('DEMOCRACIA_VIVA_PWA_INSTALLED') === 'true';

    this.isStandaloneMode = isStandaloneDisplay || isNavigatorStandalone || isStoredInstalled;
  }

  public isInstalled(): boolean {
    this.checkStandalone();
    return this.isStandaloneMode;
  }

  public isInstallAvailable(): boolean {
    if (this.isInstalled()) return false;
    // En Android / Chrome / Edge se puede con deferredPrompt
    if (this.deferredPrompt !== null) return true;
    // En iOS Safari se puede mediante Compartir -> Añadir a Inicio
    if (this.isIosSafari()) return true;
    // En navegadores modernos de escritorio
    return true;
  }

  public isIosSafari(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    return isIos || isSafari;
  }

  public isPromptDismissed(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('DEMOCRACIA_VIVA_PWA_DISMISSED') === 'true';
  }

  public dismissPrompt(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('DEMOCRACIA_VIVA_PWA_DISMISSED', 'true');
    window.dispatchEvent(new CustomEvent('dv-pwa-state-change'));
  }

  public async triggerInstall(): Promise<'accepted' | 'dismissed' | 'ios' | 'fallback'> {
    if (this.deferredPrompt) {
      try {
        await this.deferredPrompt.prompt();
        const choice = await this.deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          this.deferredPrompt = null;
          this.isStandaloneMode = true;
          return 'accepted';
        }
        return 'dismissed';
      } catch (err) {
        console.warn('[PWA] Error al disparar prompt de instalación:', err);
      }
    }

    if (this.isIosSafari()) {
      return 'ios';
    }

    return 'fallback';
  }

  /**
   * Fuerza la actualización inmediata de la app:
   * 1. Elimina todas las cachés locales (CacheStorage).
   * 2. Desregistra/actualiza Service Workers existentes.
   * 3. Reinicia la partida al inicio (carta 1) mediante GameStore.
   * 4. Muestra un HUD visual de actualización.
   * 5. Recarga la ventana con un parámetro timestamp que esquiva la caché HTTP del navegador móvil.
   */
  public async forceUpdateAndReload(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Feedback visual inmediato
    const existingToast = document.querySelector('.dock-update-toast');
    if (!existingToast) {
      const toast = document.createElement('div');
      toast.className = 'dock-update-toast';
      toast.innerHTML = `
        <span class="update-spinner"></span>
        <span>Actualizando a la última versión...</span>
      `;
      document.body.appendChild(toast);
    }

    try {
      // 1. Purgar CacheStorage
      if ('caches' in window) {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
      }

      // 2. Limpiar / Actualizar Service Worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          if (reg.active) {
            reg.active.postMessage({ type: 'CLEAR_CACHE' });
          }
          await reg.update().catch(() => {});
          await reg.unregister().catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[PWA] Aviso durante la purga de caché:', err);
    }

    // 3. Reiniciar la partida a la carta 1 (conservando los votos acumulados de la urna)
    try {
      GameStore.getInstance().replayDeck();
    } catch (_) {}

    // 4. Pausa de 300ms para permitir al usuario ver la confirmación táctil y animación
    await new Promise((resolve) => setTimeout(resolve, 320));

    // 5. Redirección con timestamp que vence la caché HTTP móvil
    const targetUrl = new URL(window.location.origin + window.location.pathname);
    targetUrl.searchParams.set('v', Date.now().toString());
    window.location.replace(targetUrl.toString());
  }
}

export const pwaService = PwaService.getInstance();
