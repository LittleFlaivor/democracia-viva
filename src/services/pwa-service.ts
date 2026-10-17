/**
 * SERVICIO PWA E INSTALACIÓN CÍVICA (PROGRESSIVE WEB APP)
 * Gestiona el registro del Service Worker, la captura respetuosa del evento 'beforeinstallprompt',
 * detección de standalone (modo app instalada) y la lógica para iOS Safari.
 */

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
          .register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registrado con éxito:', reg.scope);
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
}

export const pwaService = PwaService.getInstance();
