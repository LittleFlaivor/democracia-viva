/**
 * DATOS DEL MAZO LÚDICO: DEMOCRACIA VIVA (AWWWARDS SOTD LIGHT EDITORIAL)
 * Incorpora micro-ilustraciones vectoriales SVG limpias de arquitectura cívica,
 * dilemas en novela gráfica y deltas dinámicos de impacto en el HUD.
 */

export interface GamifiedCard {
  id: string;
  articleId: string;
  order: number;
  category: string;
  badge: string;
  headlineQuestion: string;
  subtitle: string;
  svgIllustration: string;
  dilemma: {
    lawIntent: {
      avatar: string;
      speaker: string;
      role: string;
      argument: string;
    };
    economicRisk: {
      avatar: string;
      speaker: string;
      role: string;
      argument: string;
    };
    publicMediationSummary: string;
  };
  impact: {
    yes: { tenant: number; landlord: number; consensus: number };
    no: { tenant: number; landlord: number; consensus: number };
    delegate: { tenant: number; landlord: number; consensus: number };
  };
}

export const GAMIFIED_DECK: GamifiedCard[] = [
  {
    id: 'CARD-01',
    articleId: 'ART-01',
    order: 1,
    category: 'DILEMA 1 DE 3 · PRECIOS DE ALQUILER',
    badge: 'Art. 1 BOE · Contención de Rentas',
    headlineQuestion: '¿Topar por ley las subidas del alquiler al 2.5% anual en ciudades tensionadas?',
    subtitle: 'Fija un límite obligatorio a las subidas en contratos vigentes para blindar a las familias frente a subidas abusivas del 30%, frente al riesgo de que arrendadores retiren oferta de alquiler residencial tradicional.',
    svgIllustration: `
      <svg viewBox="0 0 400 160" width="100%" height="160" fill="none" xmlns="http://www.w3.org/2000/svg" class="card-svg-art">
        <rect width="400" height="160" rx="12" fill="var(--svg-card-bg)" />
        <!-- Fondo geométrico sutil -->
        <circle cx="200" cy="80" r="65" stroke="var(--color-primary-subtle)" stroke-width="30" opacity="0.6"/>
        
        <!-- Edificios Residenciales Metropolitanos -->
        <path d="M70 140V75L105 50L140 75V140H70Z" fill="var(--svg-accent-subtle)" stroke="var(--color-primary)" stroke-width="2"/>
        <rect x="85" y="80" width="12" height="16" rx="2" fill="var(--bg-surface)" stroke="var(--color-primary)" stroke-width="1.5"/>
        <rect x="110" y="80" width="12" height="16" rx="2" fill="var(--bg-surface)" stroke="var(--color-primary)" stroke-width="1.5"/>
        <rect x="85" y="105" width="12" height="16" rx="2" fill="var(--bg-surface)" stroke="var(--color-primary)" stroke-width="1.5"/>
        <rect x="110" y="105" width="12" height="16" rx="2" fill="var(--bg-surface)" stroke="var(--color-primary)" stroke-width="1.5"/>

        <path d="M140 140V40H210V140H140Z" fill="var(--bg-surface)" stroke="var(--color-primary)" stroke-width="2"/>
        <line x1="160" y1="55" x2="190" y2="55" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"/>
        <line x1="160" y1="75" x2="190" y2="75" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"/>
        <line x1="160" y1="95" x2="190" y2="95" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"/>
        <line x1="160" y1="115" x2="190" y2="115" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"/>

        <path d="M210 140V65H270V140H210Z" fill="var(--svg-accent-subtle)" stroke="var(--color-primary)" stroke-width="2"/>
        <rect x="225" y="80" width="14" height="18" rx="2" fill="var(--bg-surface)" stroke="var(--color-primary)" stroke-width="1.5"/>
        <rect x="245" y="80" width="14" height="18" rx="2" fill="var(--bg-surface)" stroke="var(--color-primary)" stroke-width="1.5"/>

        <!-- Escudo / Límite de Tope del 2.5% -->
        <g transform="translate(285, 45)">
          <rect width="90" height="70" rx="14" fill="var(--bg-surface)" stroke="#059669" stroke-width="2" filter="drop-shadow(0 8px 16px rgba(5,150,105,0.18))"/>
          <path d="M30 18L45 12L60 18V32C60 42 45 48 45 48C45 48 30 42 30 32V18Z" fill="#ECFDF5" stroke="#059669" stroke-width="2"/>
          <text x="45" y="34" text-anchor="middle" font-family="JetBrains Mono" font-size="11" font-weight="700" fill="#059669">2.5%</text>
          <text x="45" y="58" text-anchor="middle" font-family="Plus Jakarta Sans" font-size="9" font-weight="700" fill="#059669">TOPE IPC</text>
        </g>
        
        <line x1="40" y1="140" x2="360" y2="140" stroke="var(--border-subtle)" stroke-width="2"/>
      </svg>
    `,
    dilemma: {
      lawIntent: {
        avatar: 'LR',
        speaker: 'Lucía Ramos',
        role: 'Inquilina (24 años)',
        argument: 'Destino el 58% de mi sueldo al alquiler. Si me suben 250€ de golpe al renovar contrato, me expulsan de mi barrio y de mi proyecto de vida.'
      },
      economicRisk: {
        avatar: 'MO',
        speaker: 'Manuel Osorio',
        role: 'Pequeño Propietario (68 años)',
        argument: 'Con la inflación y el IBI al alza, si no puedo ajustar la renta al coste real preferiré retirar el piso del mercado tradicional o venderlo.'
      },
      publicMediationSummary: 'El 82% de la ciudadanía apoya topes razonables al alquiler siempre que se garantice seguridad jurídica y desgravaciones al casero.'
    },
    impact: {
      yes: { tenant: 25, landlord: -15, consensus: 8 },
      no: { tenant: -20, landlord: 22, consensus: -4 },
      delegate: { tenant: 14, landlord: 10, consensus: 16 }
    }
  },
  {
    id: 'CARD-02',
    articleId: 'ART-02',
    order: 2,
    category: 'DILEMA 2 DE 3 · ALIANZA FISCAL',
    badge: 'Art. 2 BOE · Bonificación IRPF',
    headlineQuestion: '¿Perdonar el 70% del IRPF a propietarios que rebajen su alquiler un 10%?',
    subtitle: 'Recompensa a propietarios que abaraten rentas con deducciones fiscales del 70% en el IRPF y un fondo público de cobertura de impagos, equilibrando el incentivo privado frente al coste para las cuentas del Estado.',
    svgIllustration: `
      <svg viewBox="0 0 400 160" width="100%" height="160" fill="none" xmlns="http://www.w3.org/2000/svg" class="card-svg-art">
        <rect width="400" height="160" rx="12" fill="var(--svg-card-bg)" />
        <circle cx="200" cy="80" r="60" stroke="var(--color-primary-subtle)" stroke-width="24" opacity="0.5"/>

        <!-- Balanza de Confianza y Llave de Hogar -->
        <g transform="translate(65, 40)">
          <!-- Casa con Llave -->
          <path d="M35 85V45L65 20L95 45V85H35Z" fill="var(--bg-surface)" stroke="var(--color-primary)" stroke-width="2"/>
          <path d="M55 85V60H75V85" stroke="var(--color-primary)" stroke-width="2"/>
          <circle cx="65" cy="40" r="8" fill="#FEF3C7" stroke="#D97706" stroke-width="1.5"/>
          <!-- Llave dorada -->
          <path d="M105 50L135 50M125 50V60M135 50V58" stroke="#D97706" stroke-width="2.5" stroke-linecap="round"/>
        </g>

        <!-- Sello de Desgravación 70% IRPF -->
        <g transform="translate(235, 38)">
          <rect width="115" height="84" rx="14" fill="var(--bg-surface)" stroke="#D97706" stroke-width="2" filter="drop-shadow(0 8px 16px rgba(217,119,6,0.18))"/>
          <circle cx="57" cy="35" r="22" fill="#FEF3C7"/>
          <text x="57" y="42" text-anchor="middle" font-family="JetBrains Mono" font-size="16" font-weight="800" fill="#B45309">-70%</text>
          <text x="57" y="68" text-anchor="middle" font-family="Plus Jakarta Sans" font-size="9.5" font-weight="700" fill="#92400E">IRPF REBAJADO</text>
        </g>

        <line x1="40" y1="140" x2="360" y2="140" stroke="var(--border-subtle)" stroke-width="2"/>
      </svg>
    `,
    dilemma: {
      lawIntent: {
        avatar: 'EM',
        speaker: 'Dra. Elena Miró',
        role: 'Urbanista & Arquitecta',
        argument: 'Es el modelo que triunfa en Viena: premiar la moderación de precios mediante rebajas fiscales masivas alinea los intereses del inquilino y del casero sin conflicto.'
      },
      economicRisk: {
        avatar: 'CV',
        speaker: 'Carlos Vega',
        role: 'Auditor Cívico',
        argument: 'El coste para Hacienda es de 850M€ anuales. Ese dinero público podría invertirse directamente en levantar miles de pisos de vivienda pública protegida.'
      },
      publicMediationSummary: 'Tanto arrendadores como arrendatarios coinciden en que eliminar el miedo al impago mediante avales públicos activa el alquiler asequible.'
    },
    impact: {
      yes: { tenant: 18, landlord: 30, consensus: 22 },
      no: { tenant: -8, landlord: -24, consensus: -10 },
      delegate: { tenant: 14, landlord: 18, consensus: 18 }
    }
  },
  {
    id: 'CARD-03',
    articleId: 'ART-03',
    order: 3,
    category: 'DILEMA 3 DE 3 · FUNCIÓN SOCIAL DEL SUELO',
    badge: 'Art. 3 BOE · Recargo IBI Fondos',
    headlineQuestion: '¿Cobrar un 150% más de IBI a grandes fondos y bancos con pisos vacíos más de 2 años?',
    subtitle: 'Grava con un recargo extraordinario a corporaciones y entidades financieras que acaparan pisos desocupados para especular, impulsando su salida inmediata al mercado sin penalizar segundas residencias de particulares.',
    svgIllustration: `
      <svg viewBox="0 0 400 160" width="100%" height="160" fill="none" xmlns="http://www.w3.org/2000/svg" class="card-svg-art">
        <rect width="400" height="160" rx="12" fill="var(--svg-card-bg)" />
        <circle cx="200" cy="80" r="60" stroke="var(--color-primary-subtle)" stroke-width="24" opacity="0.5"/>

        <!-- Fondos / Corporación vs Desbloqueo -->
        <g transform="translate(60, 35)">
          <!-- Torre corporativa -->
          <rect x="20" y="20" width="55" height="85" rx="3" fill="var(--bg-surface)" stroke="var(--color-primary)" stroke-width="2"/>
          <line x1="35" y1="35" x2="60" y2="35" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"/>
          <line x1="35" y1="50" x2="60" y2="50" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"/>
          <line x1="35" y1="65" x2="60" y2="65" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"/>
          <line x1="35" y1="80" x2="60" y2="80" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"/>
          
          <!-- Candado roto / Apertura -->
          <circle cx="105" cy="55" r="18" fill="#ECFDF5" stroke="#059669" stroke-width="2"/>
          <path d="M100 55L104 59L112 51" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </g>

        <!-- Sello de Recargo 150% IBI -->
        <g transform="translate(230, 38)">
          <rect width="120" height="84" rx="14" fill="var(--bg-surface)" stroke="#2563EB" stroke-width="2" filter="drop-shadow(0 8px 16px rgba(37,99,235,0.18))"/>
          <circle cx="60" cy="35" r="22" fill="var(--color-primary-subtle)"/>
          <text x="60" y="42" text-anchor="middle" font-family="JetBrains Mono" font-size="16" font-weight="800" fill="#1D4ED8">+150%</text>
          <text x="60" y="68" text-anchor="middle" font-family="Plus Jakarta Sans" font-size="9.5" font-weight="700" fill="#1E40AF">RECARGO IBI</text>
        </g>

        <line x1="40" y1="140" x2="360" y2="140" stroke="var(--border-subtle)" stroke-width="2"/>
      </svg>
    `,
    dilemma: {
      lawIntent: {
        avatar: 'VD',
        speaker: 'Asociación Vecinal',
        role: 'Colectivo Social',
        argument: 'Es antisocial mantener bloques enteros cerrados a cal y canto por fondos de inversión esperando que suba el precio, mientras las familias jóvenes no tienen techo.'
      },
      economicRisk: {
        avatar: 'EM',
        speaker: 'Dra. Elena Miró',
        role: 'Urbanista & Arquitecta',
        argument: 'Debe regularse con quirúrgica precisión jurídica para evitar recursos ante el Tribunal Constitucional que congelen los inmuebles durante años.'
      },
      publicMediationSummary: 'El 89% de la población respalda penalizar la especulación de entidades corporativas sin gravar segundas viviendas de familias.'
    },
    impact: {
      yes: { tenant: 30, landlord: 2, consensus: 24 },
      no: { tenant: -25, landlord: 10, consensus: -12 },
      delegate: { tenant: 18, landlord: 8, consensus: 18 }
    }
  }
];
