/**
 * CASO REAL: REAL DECRETO-LEY 6/2026 EN MATERIA DE VIVIENDA Y ALQUILER
 * Desglose por artículos con comparativa BOE vs. Vida Real,
 * argumentos ponderados y votación oficial en el Congreso de los Diputados.
 */

import type { DecreeArticle } from '../types.ts';

export const DECREE_VIVIENDA: {
  id: string;
  officialCode: string;
  title: string;
  shortTitle: string;
  preamble: string;
  publishedDate: string;
  articles: DecreeArticle[];
} = {
  id: 'RDL-06-2026-VIVIENDA',
  officialCode: 'BOE-A-2026-4891',
  title: 'Real Decreto-ley 6/2026, de 14 de marzo, de medidas urgentes para la garantía del derecho a la vivienda y contención de rentas',
  shortTitle: 'Decreto de Urgencia en Materia de Vivienda y Alquiler',
  publishedDate: '15 de marzo de 2026',
  preamble: 'La emergencia habitacional producida por el desacople entre las rentas de arrendamiento y el poder adquisitivo ciudadano exige medidas extraordinarias de equilibrio entre la función social de la propiedad y la certidumbre económica de los propietarios.',
  articles: [
    {
      id: 'ART-01',
      decreeId: 'RDL-06-2026-VIVIENDA',
      articleNumber: 'Artículo 1',
      title: 'Topes de precios y contención de rentas en zonas tensionadas',
      boeFormalText: 'En los municipios declarados zonas de mercado residencial tensionado, la renta pactada al inicio de un nuevo contrato no podrá superar la última renta del contrato de arrendamiento que hubiese estado vigente en los últimos cinco años, ajustada únicamente por la variación porcentual del índice de contención de precios de referencia establecido por el Instituto Nacional de Estadística (INE), con un límite imperativo del 2.5% anual.',
      realLifeImpact: {
        nutshell: 'Si tu piso está en una ciudad como Madrid, Barcelona, Valencia o Málaga, el casero no puede subirte el alquiler un 20% o 30% al renovar.',
        tenantsEffect: 'Evita expulsiones indirectas de tu barrio y estabiliza tu presupuesto mensual.',
        landlordsEffect: 'Impide aumentar el margen a discreción, salvo mejoras de eficiencia energética demostrables.',
        financialMetric: 'Ahorro medio estimado: 185 €/mes por hogar inquilino en áreas metropolitanas.'
      },
      proArguments: [
        'Frena la especulación de precios y la expulsión de familias jóvenes trabajadoras de los centros urbanos.',
        'Alinea a España con legislaciones de éxito en Berlín, París y Viena.',
        'Permite a los inquilinos planificar su vida a medio y largo plazo sin incertidumbre.'
      ],
      conArguments: [
        'Riesgo de retirada de viviendas del mercado tradicional de alquiler hacia el alquiler turístico o de temporada.',
        'Desincentiva la inversión en mantenimiento y renovación del parque edificado.',
        'Experiencias previas muestran que puede reducir la oferta total de pisos disponibles si no hay incentivos.'
      ],
      congressVote: {
        yes: 178,
        no: 172,
        abstain: 0,
        result: 'APROBADO',
        date: '28 de marzo de 2026'
      },
      keyTopics: ['Alquiler', 'Topes de Precios', 'Zonas Tensionadas']
    },
    {
      id: 'ART-02',
      decreeId: 'RDL-06-2026-VIVIENDA',
      articleNumber: 'Artículo 2',
      title: 'Incentivos fiscales extraordinarios a pequeños arrendadores justos',
      boeFormalText: 'Se introduce una bonificación extraordinaria del 70% en el rendimiento neto del capital inmobiliario en el Impuesto sobre la Renta de las Personas Físicas (IRPF) para aquellos arrendadores personas físicas que formalicen contratos de vivienda habitual con una rebaja de al menos un 10% sobre el índice de referencia autonómico, acompañada de una garantía pública de cobertura de impago de hasta 6 mensualidades.',
      realLifeImpact: {
        nutshell: 'Si alquilas tu piso por debajo del precio máximo del mercado, Hacienda te perdona el 70% de los impuestos por ese alquiler y el Estado te cubre si hay impago.',
        tenantsEffect: 'Acceso a pisos con alquileres un 10% más baratos ofrecidos por propietarios particulares.',
        landlordsEffect: 'Mayor ganancia neta en la declaración de la renta y tranquilidad absoluta frente a morosidad.',
        financialMetric: 'Desgravación media: 1.420 € anuales para un propietario particular con renta media.'
      },
      proArguments: [
        'Premia la empatía y la moderación de precios sin criminalizar al pequeño ahorrador familiar.',
        'Aumenta voluntariamente la oferta de alquiler asequible mediante estímulo fiscal positivo.',
        'El fondo de garantía pública elimina el miedo al impago que paraliza a muchos propietarios.'
      ],
      conArguments: [
        'Supone una merma en los ingresos tributarios del Estado estimada en 850 millones de euros.',
        'Beneficia a propietarios de rentas altas que pueden permitirse rebajas marginales para tributar menos.',
        'No soluciona la falta estructural de vivienda si el parque total sigue siendo insuficiente.'
      ],
      congressVote: {
        yes: 165,
        no: 185,
        abstain: 0,
        result: 'RECHAZADO',
        date: '28 de marzo de 2026'
      },
      keyTopics: ['Fiscalidad', 'IRPF', 'Pequeños Propietarios', 'Garantía de Alquiler']
    },
    {
      id: 'ART-03',
      decreeId: 'RDL-06-2026-VIVIENDA',
      articleNumber: 'Artículo 3',
      title: 'Recargo del 150% en IBI a inmuebles vacíos de grandes tenedores',
      boeFormalText: 'Los ayuntamientos quedan facultados para aplicar un recargo de hasta el 150% en la cuota líquida del Impuesto sobre Bienes Inmuebles (IBI) a aquellos inmuebles de uso residencial que permanezcan desocupados con carácter permanente durante más de dos años sin causa justificada, cuando el titular sea persona jurídica titular de más de 5 inmuebles de uso residencial.',
      realLifeImpact: {
        nutshell: 'Bancos, fondos y grandes inmobiliarias con pisos cerrados durante más de 2 años tendrán que pagar más del doble de IBI si no los ponen en el mercado.',
        tenantsEffect: 'Miles de pisos retenidos por fondos de inversión saldrán al mercado en venta o alquiler, aumentando la oferta.',
        landlordsEffect: 'No afecta a familias ni a particulares con una o dos segundas residencias; sólo a personas jurídicas con más de 5 casas.',
        financialMetric: 'Se estima la movilización de más de 65.000 viviendas actualmente ociosas en toda España.'
      },
      proArguments: [
        'Combate el acaparamiento y la especulación de suelo por parte de fondos buitre.',
        'Genera recaudación municipal directa destinada a financiar vivienda pública municipal.',
        'Respeta plenamente la segunda vivienda de particulares y se enfoca en corporaciones.'
      ],
      conArguments: [
        'Puede motivar litigios judiciales prolongados sobre qué constituye "causa justificada de desocupación".',
        'Riesgo de que los grandes fondos trasladen costes a sus contratos activos en otros inmuebles.',
        'Complejidad técnica para que los ayuntamientos pequeños auditen censos de viviendas vacías.'
      ],
      congressVote: {
        yes: 176,
        no: 174,
        abstain: 0,
        result: 'APROBADO',
        date: '28 de marzo de 2026'
      },
      keyTopics: ['Grandes Tenedores', 'Viviendas Vacías', 'IBI', 'Fondos Inmobiliarios']
    },
    {
      id: 'ART-04',
      decreeId: 'RDL-06-2026-VIVIENDA',
      articleNumber: 'Artículo 4',
      title: 'Suspensión de desahucios por vulnerabilidad sin alternativa habitacional',
      boeFormalText: 'En todos los procedimientos de desahucio y lanzamientos que afecten a la vivienda habitual de personas o unidades de convivencia en situación de vulnerabilidad social acreditada por los servicios sociales competentes, el juez suspenderá el procedimiento con carácter preceptivo hasta que la administración autonómica o local acredite el realojo digno en vivienda social.',
      realLifeImpact: {
        nutshell: 'Nadie con menores a cargo o sin recursos podrá ser expulsado de su casa a la calle si los servicios sociales no le han proporcionado un techo digno alternativo primero.',
        tenantsEffect: 'Seguridad humana básica frente a la intemperie y desamparo en momentos de catástrofe económica.',
        landlordsEffect: 'Riesgo de paralización de procedimientos judiciales durante meses o años para el propietario afectado.',
        financialMetric: 'Protección para 22.000 hogares vulnerables al año frente al riesgo de exclusión severa.'
      },
      proArguments: [
        'Garantía incondicional de los Derechos Humanos y protección constitucional de la infancia.',
        'Obliga a las comunidades autónomas a crear con urgencia parques públicos de vivienda social de emergencia.',
        'Evita situaciones de alarma social y trauma infantil por lanzamientos policiales forzosos.'
      ],
      conArguments: [
        'Traspasa la responsabilidad asistencial del Estado a los propietarios particulares afectados.',
        'Inseguridad jurídica que desincentiva poner pisos en alquiler por miedo a la ocupación o parálisis procesal.',
        'Si la compensación económica al propietario no es inmediata, puede causar la ruina de pequeños arrendadores.'
      ],
      congressVote: {
        yes: 169,
        no: 181,
        abstain: 0,
        result: 'RECHAZADO',
        date: '28 de marzo de 2026'
      },
      keyTopics: ['Desahucios', 'Vulnerabilidad Social', 'Derechos Humanos', 'Seguridad Jurídica']
    }
  ]
};
