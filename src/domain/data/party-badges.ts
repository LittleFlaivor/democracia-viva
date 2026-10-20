/**
 * LOGOTIPOS VECTORIALES OFICIALES DE LOS PARTIDOS DEL CONGRESO (XV LEGISLATURA)
 * 12 fuerzas políticas con representación parlamentaria en el Congreso de los Diputados.
 * Conectadas con sus archivos vectoriales SVG oficiales en /parties/*.svg.
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
  logoUrl: string;
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
    logoUrl: '/parties/pp.svg',
    badgeSvg: `<img src="/parties/pp.svg" alt="PP" class="party-logo-img" loading="lazy" />`
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
    logoUrl: '/parties/psoe.svg',
    badgeSvg: `<img src="/parties/psoe.svg" alt="PSOE" class="party-logo-img" loading="lazy" />`
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
    logoUrl: '/parties/vox.svg',
    badgeSvg: `<img src="/parties/vox.svg" alt="VOX" class="party-logo-img" loading="lazy" />`
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
    logoUrl: '/parties/sumar.svg',
    badgeSvg: `<img src="/parties/sumar.svg" alt="Sumar" class="party-logo-img" loading="lazy" />`
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
    logoUrl: '/parties/erc.svg',
    badgeSvg: `<img src="/parties/erc.svg" alt="ERC" class="party-logo-img" loading="lazy" />`
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
    logoUrl: '/parties/junts.svg',
    badgeSvg: `<img src="/parties/junts.svg" alt="Junts" class="party-logo-img" loading="lazy" />`
  },
  {
    id: 'bildu',
    name: 'EH Bildu',
    shortName: 'EH Bildu',
    seats: 6,
    color: '#03CFB5',
    isMajor: false,
    stanceSummary: 'Co-negociador del límite del 2.5% y del recargo a fondos buitre; defiende la función social de la vivienda como derecho humano.',
    votes: {
      'CARD-01': 'YES',
      'CARD-02': 'YES',
      'CARD-03': 'YES',
    },
    logoUrl: '/parties/bildu.svg',
    badgeSvg: `<img src="/parties/bildu.svg" alt="EH Bildu" class="party-logo-img" loading="lazy" />`
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
    logoUrl: '/parties/pnv.svg',
    badgeSvg: `<img src="/parties/pnv.svg" alt="EAJ-PNV" class="party-logo-img" loading="lazy" />`
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
    logoUrl: '/parties/podemos.svg',
    badgeSvg: `<img src="/parties/podemos.svg" alt="Podemos" class="party-logo-img" loading="lazy" />`
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
    logoUrl: '/parties/bng.svg',
    badgeSvg: `<img src="/parties/bng.svg" alt="BNG" class="party-logo-img" loading="lazy" />`
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
    logoUrl: '/parties/cc.svg',
    badgeSvg: `<img src="/parties/cc.svg" alt="Coalición Canaria" class="party-logo-img" loading="lazy" />`
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
    logoUrl: '/parties/upn.svg',
    badgeSvg: `<img src="/parties/upn.svg" alt="UPN" class="party-logo-img" loading="lazy" />`
  }
];
