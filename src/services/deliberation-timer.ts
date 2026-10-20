/**
 * SERVICIO DE PAUSA DELIBERATIVA (TIEMPO DE REFLEXIÓN CÍVICA)
 * 
 * Permite configurar una espera de 20 segundos por voto para fomentar
 * la lectura meditada de datos oficiales, monográficos y visiones antes de emitir el sufragio.
 * Configurable y activable/desactivable en tiempo real desde el Panel de Administración (/admin).
 */

export const REFLECTION_STORAGE_KEY = 'DEMOCRACIA_VIVA_REFLECTION_TIMER_ENABLED';
export const REFLECTION_TIMER_EVENT = 'DEMOCRACIA_VIVA_REFLECTION_TIMER_CHANGE';
export const DEFAULT_REFLECTION_SECONDS = 20;

/**
 * Comprueba si la pausa deliberativa está activa en el sistema.
 */
export function isReflectionTimerEnabled(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(REFLECTION_STORAGE_KEY);
      if (val !== null) return val === 'true';
    }
  } catch {}
  return false;
}

/**
 * Activa o desactiva la pausa deliberativa y notifica a las pestañas y componentes.
 */
export function setReflectionTimerEnabled(enabled: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(REFLECTION_STORAGE_KEY, enabled ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent(REFLECTION_TIMER_EVENT, { detail: { enabled } }));
    }
  } catch {}
}

/**
 * Alterna el estado de la pausa deliberativa.
 */
export function toggleReflectionTimer(): boolean {
  const current = isReflectionTimerEnabled();
  const next = !current;
  setReflectionTimerEnabled(next);
  return next;
}
