/**
 * SERVICIO DE CUENTA ATRÁS Y VIGENCIA DE LA CONSULTA CÍVICA
 * 
 * Gestiona el plazo oficial de vigencia de las votaciones en Democracia Viva.
 * Por defecto, la consulta permanece abierta hasta las próximas Elecciones Generales de España
 * (25 de julio de 2027 a las 20:00h, cierre oficial de colegios electorales).
 * 
 * El plazo y su visibilidad pueden configurarse en tiempo real desde el Panel de Administración (/admin).
 */

export const DEFAULT_DEADLINE_ISO = '2026-11-19T23:59:59+01:00';
export const DEFAULT_DEADLINE_LABEL = 'Duración';
export const DEADLINE_STORAGE_KEY = 'DEMOCRACIA_VIVA_CONSULTATION_DEADLINE';
export const DEADLINE_EVENT = 'DEMOCRACIA_VIVA_DEADLINE_CHANGE';

export interface ConsultationDeadlineConfig {
  enabled: boolean;
  targetIso: string;
  label: string;
}

export interface TimeRemaining {
  totalMs: number;
  isExpired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formattedCompact: string;
  formattedFull: string;
}

let memoryConfig: ConsultationDeadlineConfig = {
  enabled: true,
  targetIso: DEFAULT_DEADLINE_ISO,
  label: DEFAULT_DEADLINE_LABEL,
};

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Obtiene la configuración actual del plazo de la consulta.
 */
export function getConsultationDeadlineConfig(): ConsultationDeadlineConfig {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(DEADLINE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const isOldDefault = parsed.targetIso === '2027-07-25T20:00:00+02:00';
        return {
          enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
          targetIso: isOldDefault || !parsed.targetIso ? DEFAULT_DEADLINE_ISO : parsed.targetIso,
          label: isOldDefault || !parsed.label ? DEFAULT_DEADLINE_LABEL : parsed.label,
        };
      }
    }
  } catch {}
  return { ...memoryConfig };
}

/**
 * Actualiza la configuración y notifica a todos los componentes de la aplicación.
 */
export function setConsultationDeadlineConfig(cfg: Partial<ConsultationDeadlineConfig>): void {
  const current = getConsultationDeadlineConfig();
  const next: ConsultationDeadlineConfig = {
    enabled: typeof cfg.enabled === 'boolean' ? cfg.enabled : current.enabled,
    targetIso: cfg.targetIso || current.targetIso,
    label: cfg.label || current.label,
  };
  memoryConfig = next;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(DEADLINE_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(DEADLINE_EVENT, { detail: next }));
    }
  } catch {}
}

/**
 * Alterna la visibilidad de la cuenta atrás (activar/desactivar).
 */
export function toggleConsultationDeadline(): boolean {
  const current = getConsultationDeadlineConfig();
  const nextEnabled = !current.enabled;
  setConsultationDeadlineConfig({ enabled: nextEnabled });
  return nextEnabled;
}

/**
 * Calcula con precisión el tiempo restante hasta la fecha objetivo.
 */
export function calculateTimeRemaining(targetIso?: string): TimeRemaining {
  const targetDateStr = targetIso || getConsultationDeadlineConfig().targetIso;
  const targetTime = new Date(targetDateStr).getTime();
  const now = Date.now();
  const totalMs = targetTime - now;

  if (isNaN(totalMs) || totalMs <= 0) {
    return {
      totalMs: 0,
      isExpired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formattedCompact: 'Consulta Cerrada',
      formattedFull: 'Plazo finalizado para esta consulta',
    };
  }

  const seconds = Math.floor((totalMs / 1000) % 60);
  const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));

  return {
    totalMs,
    isExpired: false,
    days,
    hours,
    minutes,
    seconds,
    formattedCompact: `${days}d ${pad(hours)}h ${pad(minutes)}m`,
    formattedFull: `${days} días, ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`,
  };
}
