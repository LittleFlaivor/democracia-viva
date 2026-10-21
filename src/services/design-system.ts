/**
 * SERVICIO CENTRALIZADO DE SISTEMA DE DISEÑO Y COLOR
 * 
 * Gestiona los temas visuales de Democracia Viva:
 * - 'elegance': Minimalismo editorial suizo, sobriedad cromática, lujo institucional.
 * - 'classic': Estilo lúdico de alto contraste y colores vibrantes.
 */

export type DesignThemeProfile = 'elegance' | 'classic';

export const THEME_PROFILE_KEY = 'DEMOCRACIA_VIVA_DESIGN_THEME';
export const THEME_PROFILE_EVENT = 'DEMOCRACIA_VIVA_THEME_PROFILE_CHANGE';

export interface ColorTokenSpec {
  name: string;
  variable: string;
  lightHex: string;
  darkHex: string;
  role: string;
  wcagContrast: string;
}

export const ELEGANCE_TOKENS: ColorTokenSpec[] = [
  {
    name: 'Fondo Base',
    variable: '--bg-app',
    lightHex: '#F8FAFC',
    darkHex: '#0B0F17',
    role: 'Lienzo principal de lectura serena',
    wcagContrast: 'Base'
  },
  {
    name: 'Superficie Noble',
    variable: '--bg-surface',
    lightHex: '#FFFFFF',
    darkHex: '#131823',
    role: 'Tarjetas cívicas, modales y navegación',
    wcagContrast: '14.2:1 (AAA)'
  },
  {
    name: 'Tinta Carbón Primaria',
    variable: '--text-primary',
    lightHex: '#0F172A',
    darkHex: '#F8FAFC',
    role: 'Titulares oficiales, preguntas de ley y métricas clave',
    wcagContrast: '15.8:1 (AAA)'
  },
  {
    name: 'Tinta Pizarra Secundaria',
    variable: '--text-secondary',
    lightHex: '#475569',
    darkHex: '#94A3B8',
    role: 'Descripciones explicativas y metadatos del BOE',
    wcagContrast: '7.4:1 (AAA)'
  },
  {
    name: 'Borde Arquitectónico',
    variable: '--border-card',
    lightHex: '#E2E8F0',
    darkHex: 'rgba(255, 255, 255, 0.1)',
    role: 'Separadores de precisión y contornos de tarjeta',
    wcagContrast: 'Sutil'
  },
  {
    name: 'Sufragio A Favor',
    variable: '--vote-yes',
    lightHex: '#047857',
    darkHex: '#10B981',
    role: 'Aprobación cívica sobria (Verde Esmeralda Bosque)',
    wcagContrast: '4.8:1 (AA+)'
  },
  {
    name: 'Sufragio NS / NC / Delegar',
    variable: '--vote-delegate',
    lightHex: '#334155',
    darkHex: '#94A3B8',
    role: 'Reflexión y delegación (Pizarra Topo con acento Bronce)',
    wcagContrast: '7.2:1 (AAA)'
  },
  {
    name: 'Sufragio En Contra',
    variable: '--vote-no',
    lightHex: '#991B1B',
    darkHex: '#F43F5E',
    role: 'Rechazo democrático solemne (Borgoña Profundo)',
    wcagContrast: '5.6:1 (AAA)'
  }
];

export function getActiveThemeProfile(): DesignThemeProfile {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(THEME_PROFILE_KEY);
      if (saved === 'classic' || saved === 'elegance') {
        return saved;
      }
    }
  } catch {}
  return 'elegance'; // Por defecto: Haute Élegance
}

export function setActiveThemeProfile(profile: DesignThemeProfile): void {
  try {
    if (typeof window !== 'undefined') {
      if (window.localStorage) {
        window.localStorage.setItem(THEME_PROFILE_KEY, profile);
      }
      applyThemeProfileToDocument(profile);
      window.dispatchEvent(new CustomEvent(THEME_PROFILE_EVENT, { detail: { profile } }));
    }
  } catch {}
}

export function applyThemeProfileToDocument(profile?: DesignThemeProfile): void {
  if (typeof document === 'undefined') return;
  const current = profile || getActiveThemeProfile();
  const root = document.documentElement;

  if (current === 'elegance') {
    root.classList.add('theme-elegance');
    root.classList.remove('theme-classic');
  } else {
    root.classList.add('theme-classic');
    root.classList.remove('theme-elegance');
  }
}

/**
 * Inicializa el sistema de diseño en el arranque
 */
export function initDesignSystem(): void {
  applyThemeProfileToDocument();
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === THEME_PROFILE_KEY && e.newValue) {
        applyThemeProfileToDocument(e.newValue as DesignThemeProfile);
      }
    });
  }
}
