/**
 * INSIGNIAS VECTORIALES OFICIALES DE LOS PARTIDOS DEL CONGRESO (XV LEGISLATURA)
 * 12 fuerzas políticas con representación parlamentaria en el Congreso de los Diputados.
 * Diseñadas para máxima nitidez (vectorial puro), contraste Awwwards y reconocimiento instantáneo.
 */

export interface PartyDefinition {
  id: string;
  name: string;
  shortName: string;
  seats: number;
  color: string;
  isMajor: boolean;
  stanceSummary: string;
  votes: Record<string, 'YES' | 'NO' | 'DELEGATE'>;
  badgeSvg: string;
}

export const CONGRESS_PARTIES: PartyDefinition[] = [
  {
    id: 'pp',
    name: 'Partido Popular',
    shortName: 'PP',
    seats: 137,
    color: '#0284C7',
    isMajor: true,
    stanceSummary: 'Contrario al control forzoso de precios; apoya incentivos fiscales en IRPF a propietarios y rechaza recargos de IBI.',
    votes: {
      'CARD-01': 'NO',
      'CARD-02': 'YES',
      'CARD-03': 'NO',
    },
    badgeSvg: `
      <svg viewBox="0 0 48 48" width="44" height="44" class="party-logo-badge">
        <rect width="48" height="48" rx="12" fill="#0284C7"/>
        <!-- Gaviota / Charrán del PP -->
        <path d="M12 21C16 16 21 18 24 20C27 18 32 16 36 21C33.5 19.5 28 19 24 22.5C20 19 14.5 19.5 12 21Z" fill="#FFFFFF"/>
        <!-- Tipografía PP -->
        <text x="24" y="36" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="14" fill="#FFFFFF" letter-spacing="0.5">PP</text>
      </svg>
    `
  },
  {
    id: 'psoe',
    name: 'Partido Socialista Obrero Español',
    shortName: 'PSOE',
    seats: 121,
    color: '#E11D48',
    isMajor: true,
    stanceSummary: 'Impulsor del tope en zonas tensionadas, deducción del 70% en IRPF a propietarios que rebajen rentas y recargo de IBI a fondos.',
    votes: {
      'CARD-01': 'YES',
      'CARD-02': 'YES',
      'CARD-03': 'YES',
    },
    badgeSvg: `
      <svg viewBox="0 0 48 48" width="44" height="44" class="party-logo-badge">
        <rect width="48" height="48" rx="12" fill="#E11D48"/>
        <!-- Rosa y Puño estilizado -->
        <circle cx="24" cy="19" r="6" fill="#FFFFFF"/>
        <path d="M21 19C21 17.5 22.5 16 24 16C25.5 16 27 17.5 27 19C27 20.5 25.5 22 24 22C22.5 22 21 20.5 21 19Z" fill="#E11D48"/>
        <!-- Siglas PSOE -->
        <text x="24" y="36" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="11" fill="#FFFFFF" letter-spacing="0.5">PSOE</text>
      </svg>
    `
  },
  {
    id: 'vox',
    name: 'VOX',
    shortName: 'VOX',
    seats: 33,
    color: '#5AC035',
    isMajor: true,
    stanceSummary: 'Oposición frontal a controles de precios e intervencionismo tributario; defensa de la propiedad privada y liberalización.',
    votes: {
      'CARD-01': 'NO',
      'CARD-02': 'NO',
      'CARD-03': 'NO',
    },
    badgeSvg: `
      <svg viewBox="0 0 48 48" width="44" height="44" class="party-logo-badge">
        <rect width="48" height="48" rx="12" fill="#5AC035"/>
        <text x="24" y="30" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="14" fill="#FFFFFF" letter-spacing="0.5">VOX</text>
      </svg>
    `
  },
  {
    id: 'sumar',
    name: 'Movimiento Sumar',
    shortName: 'Sumar',
    seats: 27,
    color: '#E61455',
    isMajor: true,
    stanceSummary: 'Apoyo firme al tope del 2.5% y recargo del 150% de IBI a fondos; reticente a perdonar IRPF a caseros sin contraprestaciones.',
    votes: {
      'CARD-01': 'YES',
      'CARD-02': 'NO',
      'CARD-03': 'YES',
    },
    badgeSvg: `
      <svg viewBox="0 0 48 48" width="44" height="44" class="party-logo-badge">
        <rect width="48" height="48" rx="12" fill="#E61455"/>
        <!-- Símbolo '+' de Sumar -->
        <path d="M24 12V22M19 17H29" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/>
        <text x="24" y="35" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="9.5" fill="#FFFFFF" letter-spacing="-0.2">sumar</text>
      </svg>
    `
  },
  {
    id: 'erc',
    name: 'Esquerra Republicana de Catalunya',
    shortName: 'ERC',
    seats: 7,
    color: '#F95838',
    isMajor: false,
    stanceSummary: 'Apoyo a la limitación obligatoria de alquileres y penalización a viviendas vacías; respaldo condicionado a medidas fiscales.',
    votes: {
      'CARD-01': 'YES',
      'CARD-02': 'YES',
      'CARD-03': 'YES',
    },
    badgeSvg: `
      <svg viewBox="0 0 48 48" width="44" height="44" class="party-logo-badge">
        <rect width="48" height="48" rx="12" fill="#F95838"/>
        <!-- Chevrons republicanos de ERC -->
        <path d="M16 14L24 22L32 14" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <text x="24" y="35" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="11" fill="#FFFFFF" letter-spacing="0.5">ERC</text>
      </svg>
    `
  },
  {
    id: 'junts',
    name: 'Junts per Catalunya',
    shortName: 'Junts',
    seats: 7,
    color: '#00C7AE',
    isMajor: false,
    stanceSummary: 'Rechaza la intervención obligatoria de precios y recargos fiscales; respalda incentivos tributarios y seguridad jurídica a caseros.',
    votes: {
      'CARD-01': 'NO',
      'CARD-02': 'YES',
      'CARD-03': 'NO',
    },
    badgeSvg: `
      <svg viewBox="0 0 48 48" width="44" height="44" class="party-logo-badge">
        <rect width="48" height="48" rx="12" fill="#00C7AE"/>
        <!-- Estrella estilizada de Junts -->
        <circle cx="24" cy="18" r="4.5" fill="#FFFFFF"/>
        <text x="24" y="34" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="9" fill="#FFFFFF" letter-spacing="0.3">JUNTS</text>
      </svg>
    `
  },
  {
    id: 'bildu',
    name: 'EH Bildu',
    shortName: 'EH Bildu',
    seats: 6,
    color: '#00A651',
    isMajor: false,
    stanceSummary: 'Co-negociador del límite del 2.5% y del recargo a fondos buitre; defiende la función social de la vivienda como derecho humano.',
    votes: {
      'CARD-01': 'YES',
      'CARD-02': 'YES',
      'CARD-03': 'YES',
    },
    badgeSvg: `
      <svg viewBox="0 0 48 48" width="44" height="44" class="party-logo-badge">
        <rect width="48" height="48" rx="12" fill="#00A651"/>
        <!-- Puente continuo de Bildu -->
        <path d="M15 22C15 17 21 17 24 21C27 17 33 17 33 22" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <text x="24" y="35" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="9" fill="#FFFFFF" letter-spacing="0.2">BILDU</text>
      </svg>
    `
  },
  {
    id: 'pnv',
    name: 'EAJ-PNV',
    shortName: 'EAJ-PNV',
    seats: 5,
    color: '#16A34A',
    isMajor: false,
    stanceSummary: 'Prioriza deducciones fiscales e incentivos público-privados; contrario a topes centralizados y penalizaciones forzosas.',
    votes: {
      'CARD-01': 'NO',
      'CARD-02': 'YES',
      'CARD-03': 'NO',
    },
    badgeSvg: `
      <svg viewBox="0 0 48 48" width="44" height="44" class="party-logo-badge">
        <rect width="48" height="48" rx="12" fill="#16A34A"/>
        <!-- Aldra / Cruz vasca estilizada -->
        <path d="M24 13V25M17 19H31" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M19 15L29 23M29 15L19 23" stroke="#DC2626" stroke-width="2" stroke-linecap="round"/>
        <text x="24" y="36" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="8.5" fill="#FFFFFF" letter-spacing="0.2">PNV</text>
      </svg>
    `
  },
  {
    id: 'podemos',
    name: 'Podemos',
    shortName: 'Podemos',
    seats: 4,
    color: '#7C3AED',
    isMajor: false,
    stanceSummary: 'Exige intervención drástica de rentas y sanciones máximas a grandes tenedores; rechazo absoluto a perdonar impuestos a caseros.',
    votes: {
      'CARD-01': 'YES',
      'CARD-02': 'NO',
      'CARD-03': 'YES',
    },
    badgeSvg: `
      <svg viewBox="0 0 48 48" width="44" height="44" class="party-logo-badge">
        <rect width="48" height="48" rx="12" fill="#7C3AED"/>
        <!-- Círculos de Podemos -->
        <circle cx="24" cy="18" r="6.5" fill="none" stroke="#FFFFFF" stroke-width="2.2"/>
        <circle cx="24" cy="18" r="3.2" fill="#FFFFFF"/>
        <text x="24" y="34" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="8.5" fill="#FFFFFF" letter-spacing="-0.2">podemos</text>
      </svg>
    `
  },
  {
    id: 'bng',
    name: 'Bloque Nacionalista Galego',
    shortName: 'BNG',
    seats: 1,
    color: '#0284C7',
    isMajor: false,
    stanceSummary: 'A favor del control riguroso de alquileres y gravamen a fondos; rechaza subvencionar a propietarios vía desgravaciones.',
    votes: {
      'CARD-01': 'YES',
      'CARD-02': 'NO',
      'CARD-03': 'YES',
    },
    badgeSvg: `
      <svg viewBox="0 0 48 48" width="44" height="44" class="party-logo-badge">
        <rect width="48" height="48" rx="12" fill="#0284C7"/>
        <!-- Franja azul celeste y estrella roja de Galiza -->
        <path d="M12 36L36 12" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
        <polygon points="24,14 25.5,18.5 30,18.5 26.5,21 28,25.5 24,23 20,25.5 21.5,21 18,18.5 22.5,18.5" fill="#EF4444"/>
        <text x="24" y="37" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="9" fill="#FFFFFF" letter-spacing="0.3">BNG</text>
      </svg>
    `
  },
  {
    id: 'cc',
    name: 'Coalición Canaria',
    shortName: 'CC',
    seats: 1,
    color: '#EAB308',
    isMajor: false,
    stanceSummary: 'Defiende incentivar a propietarios insulares mediante IRPF y avales públicos; opuesta a topes rígidos y recargos locales.',
    votes: {
      'CARD-01': 'NO',
      'CARD-02': 'YES',
      'CARD-03': 'NO',
    },
    badgeSvg: `
      <svg viewBox="0 0 48 48" width="44" height="44" class="party-logo-badge">
        <rect width="48" height="48" rx="12" fill="#EAB308"/>
        <!-- Estrellas / Identidad Canaria -->
        <polygon points="24,12 25.8,17.2 31.2,17.2 27,20.4 28.7,25.6 24,22.2 19.3,25.6 21,20.4 16.8,17.2 22.2,17.2" fill="#1E3A8A"/>
        <text x="24" y="36" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="12" fill="#1E3A8A" letter-spacing="0.5">CC</text>
      </svg>
    `
  },
  {
    id: 'upn',
    name: 'Unión del Pueblo Navarro',
    shortName: 'UPN',
    seats: 1,
    color: '#DC2626',
    isMajor: false,
    stanceSummary: 'Defensa de incentivos al arrendador privado y seguridad frente a impagos; en contra de recargos de IBI e intervencionismo.',
    votes: {
      'CARD-01': 'NO',
      'CARD-02': 'YES',
      'CARD-03': 'NO',
    },
    badgeSvg: `
      <svg viewBox="0 0 48 48" width="44" height="44" class="party-logo-badge">
        <rect width="48" height="48" rx="12" fill="#DC2626"/>
        <!-- Corona y escudo de UPN en azul y blanco -->
        <rect x="14" y="14" width="20" height="4" rx="2" fill="#1E40AF"/>
        <text x="24" y="33" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="10" fill="#FFFFFF" letter-spacing="0.4">UPN</text>
      </svg>
    `
  }
];
