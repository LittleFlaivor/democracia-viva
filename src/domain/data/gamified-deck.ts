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
  fullDescription?: string;
  metrics?: Array<{ label: string; value: string }>;
  keyPoints?: {
    pro: string;
    con: string;
  };
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
    category: 'Vivienda y Alquiler',
    badge: 'Art. 1 BOE · Contención de Rentas',
    headlineQuestion: '¿Topar por ley las subidas del alquiler al 2.5% anual en ciudades tensionadas?',
    subtitle: 'Fija un límite máximo del 2,5% anual a las subidas del alquiler en zonas con precios disparados, protegiendo a las familias inquilinas frente a incrementos repentinos.',
    metrics: [
      { label: 'Tope Máximo', value: '2.5% anual' },
      { label: 'Protegidos', value: '3.5M hogares' },
      { label: 'Condición', value: '>30% ingresos' }
    ],
    fullDescription: `Esta disposición introduce un límite legal del 2,5% anual a las revisiones y renovaciones de contratos de alquiler en municipios declarados como zonas tensionadas. Esta declaración se aplica cuando las familias destinan de media más del 30% de sus ingresos al alquiler o cuando los precios hayan superado con creces la inflación en los últimos cinco años.

Por un lado, la medida protege el derecho a una vivienda digna y aporta estabilidad económica a más de 3,5 millones de hogares inquilinos, evitando incrementos imprevistos que fuercen a familias y jóvenes a marcharse de sus barrios habituales.

Por otro lado, propietarios y economistas advierten de que limitar precios sin incentivos suficientes puede provocar que algunos dueños retiren viviendas del mercado habitual, las destinen al alquiler turístico o temporal, o endurezcan los requisitos y fianzas para nuevos inquilinos.`,
    keyPoints: {
      pro: 'Evita subidas desproporcionadas y aporta estabilidad económica a las familias inquilinas',
      con: 'Riesgo de que propietarios retiren viviendas del alquiler tradicional o endurezcan requisitos'
    },
    svgIllustration: `
      <svg viewBox="0 0 400 160" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" class="card-svg-art" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="c1-bg" x1="0" y1="0" x2="400" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#EFF6FF" stop-opacity="0.95"/>
            <stop offset="50%" stop-color="#F0FDF4" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#ECFDF5" stop-opacity="0.95"/>
          </linearGradient>
          <linearGradient id="c1-bldg1" x1="70" y1="40" x2="140" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#3B82F6"/>
            <stop offset="100%" stop-color="#1D4ED8"/>
          </linearGradient>
          <linearGradient id="c1-bldg2" x1="140" y1="20" x2="210" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#60A5FA"/>
            <stop offset="100%" stop-color="#2563EB"/>
          </linearGradient>
          <linearGradient id="c1-badge" x1="260" y1="20" x2="370" y2="135" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#059669"/>
            <stop offset="100%" stop-color="#047857"/>
          </linearGradient>
          <filter id="c1-shadow" x="250" y="15" width="130" height="135" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#059669" flood-opacity="0.25"/>
          </filter>
        </defs>

        <!-- Fondo base suave -->
        <rect width="400" height="160" rx="16" fill="url(#c1-bg)"/>

        <!-- Halos de iluminación ambiental -->
        <circle cx="150" cy="80" r="70" fill="#3B82F6" opacity="0.08"/>
        <circle cx="315" cy="75" r="55" fill="#10B981" opacity="0.12"/>

        <!-- Ciudad / Edificios residenciales metropolitanos -->
        <rect x="40" y="70" width="35" height="70" rx="3" fill="#BFDBFE" opacity="0.6"/>
        <rect x="200" y="60" width="45" height="80" rx="3" fill="#A7F3D0" opacity="0.5"/>

        <!-- Edificio residencial 1 -->
        <rect x="65" y="48" width="60" height="92" rx="4" fill="url(#c1-bldg1)"/>
        <rect x="75" y="58" width="10" height="12" rx="2" fill="#FEF08A" opacity="0.9"/>
        <rect x="92" y="58" width="10" height="12" rx="2" fill="#FFFFFF" opacity="0.85"/>
        <rect x="109" y="58" width="10" height="12" rx="2" fill="#FEF08A" opacity="0.9"/>
        <rect x="75" y="78" width="10" height="12" rx="2" fill="#FFFFFF" opacity="0.85"/>
        <rect x="92" y="78" width="10" height="12" rx="2" fill="#FEF08A" opacity="0.9"/>
        <rect x="109" y="78" width="10" height="12" rx="2" fill="#FFFFFF" opacity="0.85"/>
        <rect x="75" y="98" width="10" height="12" rx="2" fill="#FEF08A" opacity="0.9"/>
        <rect x="92" y="98" width="10" height="12" rx="2" fill="#FFFFFF" opacity="0.85"/>
        <rect x="109" y="98" width="10" height="12" rx="2" fill="#FEF08A" opacity="0.9"/>
        <rect x="88" y="122" width="14" height="18" rx="2" fill="#1E3A8A"/>

        <!-- Edificio residencial 2 (Principal) -->
        <rect x="135" y="30" width="70" height="110" rx="4" fill="url(#c1-bldg2)"/>
        <path d="M135 30L170 14L205 30H135Z" fill="#1E40AF"/>
        <rect x="146" y="42" width="14" height="15" rx="2" fill="#FFFFFF" opacity="0.9"/>
        <rect x="180" y="42" width="14" height="15" rx="2" fill="#FEF08A" opacity="0.95"/>
        <rect x="146" y="66" width="14" height="15" rx="2" fill="#FEF08A" opacity="0.95"/>
        <rect x="180" y="66" width="14" height="15" rx="2" fill="#FFFFFF" opacity="0.9"/>
        <rect x="146" y="90" width="14" height="15" rx="2" fill="#FFFFFF" opacity="0.9"/>
        <rect x="180" y="90" width="14" height="15" rx="2" fill="#FEF08A" opacity="0.95"/>
        <rect x="162" y="118" width="16" height="22" rx="2" fill="#0F172A"/>

        <!-- Suelo y arbolado -->
        <line x1="30" y1="140" x2="370" y2="140" stroke="#CBD5E1" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="50" cy="132" r="8" fill="#10B981"/>
        <rect x="49" y="132" width="2" height="8" fill="#047857"/>
        <circle cx="225" cy="130" r="10" fill="#10B981"/>
        <rect x="224" y="130" width="2" height="10" fill="#047857"/>

        <!-- Escudo Oficial de Contención de Rentas: 2.5% MAX -->
        <g filter="url(#c1-shadow)">
          <rect x="265" y="24" width="105" height="102" rx="16" fill="url(#c1-badge)"/>
          <rect x="268" y="27" width="99" height="96" rx="14" fill="#FFFFFF" opacity="0.08"/>
          <!-- Icono de Candado / Protección -->
          <path d="M317 38C312 38 308 42 308 47V52H326V47C326 42 322 38 317 38ZM305 52C303.9 52 303 52.9 303 54V64C303 65.1 303.9 66 305 66H329C330.1 66 331 65.1 331 64V54C331 52.9 330.1 52 329 52H305Z" fill="#A7F3D0"/>
          <!-- Cifra y lemas -->
          <text x="317" y="85" text-anchor="middle" font-family="'Outfit', 'Plus Jakarta Sans', sans-serif" font-size="21" font-weight="900" fill="#FFFFFF" letter-spacing="-0.02em">2.5%</text>
          <text x="317" y="101" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="800" fill="#D1FAE5" letter-spacing="0.06em">TOPE ANUAL</text>
          <text x="317" y="114" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="7.5" font-weight="700" fill="#6EE7B7">IPC LEY BOE</text>
        </g>
      </svg>
    `,
    dilemma: {
      lawIntent: {
        avatar: 'LR',
        speaker: 'Lucía Ramos',
        role: 'Inquilina (24 años)',
        argument: 'Destino más de la mitad de mi sueldo al alquiler. Si me suben 250€ de golpe al renovar contrato, no podré pagarlo y tendré que marcharme de mi barrio.'
      },
      economicRisk: {
        avatar: 'MO',
        speaker: 'Manuel Osorio',
        role: 'Pequeño Propietario (68 años)',
        argument: 'Con la subida del coste de la vida, si no puedo ajustar la renta a los gastos reales del piso preferiré no alquilarlo o ponerlo a la venta.'
      },
      publicMediationSummary: 'Existe un amplio consenso en limitar subidas desmedidas siempre que se ofrezca seguridad jurídica y estímulos fiscales a los propietarios particulares.'
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
    category: 'Incentivos y Fiscalidad',
    badge: 'Art. 2 BOE · Bonificación IRPF',
    headlineQuestion: '¿Bonificar el 70% del IRPF a propietarios que rebajen voluntariamente el alquiler un 10%?',
    subtitle: 'Rebaja un 70% los impuestos del alquiler (IRPF) a los propietarios que reduzcan un 10% la renta a sus inquilinos, e incluye un aval público que garantiza el cobro ante impagos.',
    metrics: [
      { label: 'Ahorro Fiscal', value: '-70% IRPF' },
      { label: 'Rebaja Renta', value: '-10% precio' },
      { label: 'Seguridad', value: 'Aval impago' }
    ],
    fullDescription: `Este artículo establece un sistema de incentivos fiscales positivos dirigido a pequeños y medianos propietarios. Aquellos dueños que rebajen voluntariamente al menos un 10% el precio del alquiler respecto al contrato anterior en zonas tensionadas obtendrán una bonificación fiscal extraordinaria del 70% en el rendimiento del alquiler en su declaración del IRPF.

Para aportar tranquilidad a los propietarios, la medida incluye un Fondo Público de Cobertura que avala y adelanta las mensualidades en caso de impago por parte del inquilino, evitando situaciones de conflicto o procesos judiciales largos.

Quienes defienden la medida señalan que premiar la moderación de precios fomenta la colaboración entre caseros e inquilinos, siguiendo modelos que funcionan en otros países europeos. Por el contrario, quienes la cuestionan recuerdan que esta rebaja supone un coste anual estimado en 800 millones de euros que el Estado deja de recaudar y que podría destinarse a construir vivienda pública.`,
    keyPoints: {
      pro: 'Incentiva precios más asequibles premiando al propietario y garantizándole el cobro seguro de su renta',
      con: 'Supone un coste de fondos públicos que el Estado deja de ingresar para otros fines o vivienda social'
    },
    svgIllustration: `
      <svg viewBox="0 0 400 160" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" class="card-svg-art" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="c2-bg" x1="0" y1="0" x2="400" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FFFBEB" stop-opacity="0.95"/>
            <stop offset="50%" stop-color="#FEF3C7" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#ECFDF5" stop-opacity="0.95"/>
          </linearGradient>
          <linearGradient id="c2-home" x1="60" y1="30" x2="160" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#F59E0B"/>
            <stop offset="100%" stop-color="#D97706"/>
          </linearGradient>
          <linearGradient id="c2-badge" x1="255" y1="20" x2="375" y2="135" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#D97706"/>
            <stop offset="100%" stop-color="#B45309"/>
          </linearGradient>
          <filter id="c2-shadow" x="245" y="15" width="135" height="135" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#D97706" flood-opacity="0.25"/>
          </filter>
        </defs>

        <rect width="400" height="160" rx="16" fill="url(#c2-bg)"/>
        <circle cx="140" cy="80" r="70" fill="#F59E0B" opacity="0.08"/>
        <circle cx="315" cy="75" r="55" fill="#D97706" opacity="0.12"/>

        <!-- Hogar con Llave y Acuerdo Propietario-Inquilino -->
        <path d="M60 70L110 32L160 70V140H60V70Z" fill="url(#c2-home)"/>
        <path d="M55 70L110 26L165 70" stroke="#B45309" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Ventana circular acogedora -->
        <circle cx="110" cy="62" r="14" fill="#FEF3C7" stroke="#92400E" stroke-width="2"/>
        <line x1="110" y1="48" x2="110" y2="76" stroke="#92400E" stroke-width="2"/>
        <line x1="96" y1="62" x2="124" y2="62" stroke="#92400E" stroke-width="2"/>
        <!-- Puerta abierta con luz -->
        <rect x="96" y="96" width="28" height="44" rx="3" fill="#FFFBEB"/>
        <circle cx="118" cy="118" r="3" fill="#D97706"/>

        <!-- Llave Dorada de Confianza Mutua -->
        <g transform="translate(165, 62)">
          <circle cx="20" cy="20" r="16" fill="#FEF3C7" stroke="#D97706" stroke-width="3"/>
          <circle cx="20" cy="20" r="7" fill="#F59E0B"/>
          <path d="M36 20L68 20M54 20V30M64 20V28" stroke="#D97706" stroke-width="4" stroke-linecap="round"/>
        </g>

        <!-- Suelo y vegetación -->
        <line x1="30" y1="140" x2="370" y2="140" stroke="#CBD5E1" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="42" cy="132" r="8" fill="#10B981"/>
        <rect x="41" y="132" width="2" height="8" fill="#047857"/>

        <!-- Insignia Fiscal Extraordinaria: -70% IRPF -->
        <g filter="url(#c2-shadow)">
          <rect x="260" y="24" width="112" height="102" rx="16" fill="url(#c2-badge)"/>
          <rect x="263" y="27" width="106" height="96" rx="14" fill="#FFFFFF" opacity="0.08"/>
          <!-- Icono de Porcentaje -->
          <circle cx="316" cy="48" r="13" fill="#FEF3C7"/>
          <text x="316" y="53" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="900" fill="#92400E">%</text>
          <!-- Cifra destacada -->
          <text x="316" y="82" text-anchor="middle" font-family="'Outfit', 'Plus Jakarta Sans', sans-serif" font-size="23" font-weight="900" fill="#FFFFFF" letter-spacing="-0.02em">-70%</text>
          <text x="316" y="99" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="800" fill="#FEF3C7" letter-spacing="0.06em">EN TU IRPF</text>
          <text x="316" y="113" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="7.5" font-weight="700" fill="#FDE68A">+ AVAL PÚBLICO</text>
        </g>
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
    category: 'Vivienda Vacía y Fondos',
    badge: 'Art. 3 BOE · Recargo IBI Fondos',
    headlineQuestion: '¿Cobrar un 150% más de IBI a grandes fondos y bancos con pisos vacíos más de 2 años?',
    subtitle: 'Permite a los ayuntamientos duplicar con creces el IBI (hasta un +150%) a bancos y fondos con pisos vacíos más de 2 años, protegiendo siempre las segundas residencias de particulares.',
    metrics: [
      { label: 'Recargo IBI', value: '+150% máx' },
      { label: 'Tiempo Vacío', value: '>2 años' },
      { label: 'Destinatario', value: 'Bancos / Fondos' }
    ],
    fullDescription: `Esta medida faculta a los ayuntamientos a aplicar un recargo de hasta el 150% en el Impuesto sobre Bienes Inmuebles (IBI) a aquellas viviendas residenciales que permanezcan vacías de forma injustificada durante más de dos años seguidos. Se dirige de forma exclusiva a entidades bancarias, inmobiliarias y fondos de inversión titulares de cuatro o más inmuebles.

El objetivo es incentivar que las grandes corporaciones pongan en alquiler o venta los pisos que mantienen desocupados, ampliando la oferta disponible para la ciudadanía. La ley protege de forma explícita y excluye de cualquier recargo a las segundas residencias familiares, traslados temporales de trabajo o viviendas en obras o herencias.

Sus partidarios destacan que ayuda a desbloquear viviendas cerradas en zonas con gran demanda. Por su parte, expertos jurídicos señalan la dificultad técnica para comprobar de forma fiable que un piso está realmente desocupado y el riesgo de recursos judiciales por parte de los fondos.`,
    keyPoints: {
      pro: 'Presiona a las grandes corporaciones para sacar sus pisos al mercado y aumentar la oferta disponible',
      con: 'Exige una gestión municipal rigurosa para demostrar la desocupación continuada sin litigios en tribunales'
    },
    svgIllustration: `
      <svg viewBox="0 0 400 160" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" class="card-svg-art" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="c3-bg" x1="0" y1="0" x2="400" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#EFF6FF" stop-opacity="0.95"/>
            <stop offset="50%" stop-color="#EEF2FF" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#ECFDF5" stop-opacity="0.95"/>
          </linearGradient>
          <linearGradient id="c3-tower" x1="70" y1="20" x2="160" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#334155"/>
            <stop offset="100%" stop-color="#0F172A"/>
          </linearGradient>
          <linearGradient id="c3-badge" x1="255" y1="20" x2="375" y2="135" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#2563EB"/>
            <stop offset="100%" stop-color="#1D4ED8"/>
          </linearGradient>
          <filter id="c3-shadow" x="245" y="15" width="135" height="135" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#2563EB" flood-opacity="0.25"/>
          </filter>
        </defs>

        <rect width="400" height="160" rx="16" fill="url(#c3-bg)"/>
        <circle cx="120" cy="80" r="70" fill="#3B82F6" opacity="0.08"/>
        <circle cx="315" cy="75" r="55" fill="#2563EB" opacity="0.12"/>

        <!-- Rascacielos Corporativo de Fondo Desocupado -->
        <rect x="50" y="45" width="40" height="95" rx="3" fill="#64748B"/>
        <rect x="58" y="55" width="6" height="8" rx="1" fill="#94A3B8"/>
        <rect x="74" y="55" width="6" height="8" rx="1" fill="#94A3B8"/>
        <rect x="58" y="72" width="6" height="8" rx="1" fill="#94A3B8"/>
        <rect x="74" y="72" width="6" height="8" rx="1" fill="#94A3B8"/>
        <rect x="58" y="89" width="6" height="8" rx="1" fill="#94A3B8"/>
        <rect x="74" y="89" width="6" height="8" rx="1" fill="#94A3B8"/>

        <!-- Torre Corporativa Principal con Candado Abriéndose -->
        <rect x="100" y="24" width="70" height="116" rx="4" fill="url(#c3-tower)"/>
        <line x1="115" y1="38" x2="155" y2="38" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/>
        <line x1="115" y1="52" x2="155" y2="52" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/>
        <line x1="115" y1="66" x2="155" y2="66" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/>
        <line x1="115" y1="80" x2="155" y2="80" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/>
        <line x1="115" y1="94" x2="155" y2="94" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/>

        <!-- Candado Desbloqueado y Llave de Apertura Cívica -->
        <g transform="translate(178, 55)">
          <circle cx="22" cy="22" r="20" fill="#ECFDF5" stroke="#10B981" stroke-width="2.5"/>
          <path d="M15 22L20 27L30 16" stroke="#059669" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <text x="22" y="52" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="8" font-weight="800" fill="#059669">DISPONIBLE</text>
        </g>

        <line x1="30" y1="140" x2="370" y2="140" stroke="#CBD5E1" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="40" cy="132" r="8" fill="#10B981"/>
        <rect x="39" y="132" width="2" height="8" fill="#047857"/>

        <!-- Insignia Recargo IBI Fondos: +150% IBI -->
        <g filter="url(#c3-shadow)">
          <rect x="260" y="24" width="112" height="102" rx="16" fill="url(#c3-badge)"/>
          <rect x="263" y="27" width="106" height="96" rx="14" fill="#FFFFFF" opacity="0.08"/>
          <!-- Icono de Edificio / Ley -->
          <rect x="307" y="38" width="18" height="16" rx="2" fill="#DBEAFE"/>
          <path d="M305 38L316 30L327 38" stroke="#93C5FD" stroke-width="2" stroke-linecap="round"/>
          <!-- Cifra destacada -->
          <text x="316" y="82" text-anchor="middle" font-family="'Outfit', 'Plus Jakarta Sans', sans-serif" font-size="22" font-weight="900" fill="#FFFFFF" letter-spacing="-0.02em">+150%</text>
          <text x="316" y="99" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="800" fill="#DBEAFE" letter-spacing="0.06em">RECARGO IBI</text>
          <text x="316" y="113" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="7.5" font-weight="700" fill="#93C5FD">A FONDOS &gt;2 AÑOS</text>
        </g>
      </svg>
    `,
    dilemma: {
      lawIntent: {
        avatar: 'VD',
        speaker: 'Asociación Vecinal',
        role: 'Colectivo Social',
        argument: 'Es antisocial mantener bloques enteros cerrados por fondos de inversión esperando que suba el precio, mientras muchas familias no encuentran piso donde vivir.'
      },
      economicRisk: {
        avatar: 'EM',
        speaker: 'Dra. Elena Miró',
        role: 'Urbanista & Arquitecta',
        argument: 'Debe regularse con una precisión jurídica absoluta para evitar recursos ante los tribunales que dejen las viviendas bloqueadas durante años.'
      },
      publicMediationSummary: 'Coincidencia mayoritaria en penalizar la retención especulativa de inmuebles por grandes fondos, respetando siempre las propiedades familiares.'
    },
    impact: {
      yes: { tenant: 30, landlord: 2, consensus: 24 },
      no: { tenant: -25, landlord: 10, consensus: -12 },
      delegate: { tenant: 18, landlord: 8, consensus: 18 }
    }
  }
];
