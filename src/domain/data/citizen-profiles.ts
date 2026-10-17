/**
 * PERFILES CIUDADANOS PRECONFIGURADOS PARA SIMULACIÓN
 * Permiten comprobar en vivo el comportamiento de la democracia líquida,
 * los votos directos, las delegaciones y la prevención de doble voto.
 */

import type { CitizenProfile } from '../types.ts';
import { generateIdentityCommitment } from '../crypto/semaphore-zk.ts';

export const CITIZEN_PROFILES: CitizenProfile[] = [
  {
    id: 'lucia-ramos',
    name: 'Lucía Ramos',
    age: 24,
    role: 'Inquilina Joven & Diseñadora Gráfica',
    category: 'inquilino',
    avatar: 'LR',
    bio: 'Alquila un piso compartido en el barrio de Tetuán (Madrid). El alquiler absorbe el 58% de su salario neto mensual.',
    identitySecret: 'SECRET_LUCIA_RAMOS_DNI_48921763X_MADRID',
    identityCommitment: generateIdentityCommitment('SECRET_LUCIA_RAMOS_DNI_48921763X_MADRID'),
    isDelegate: false
  },
  {
    id: 'manuel-osorio',
    name: 'Manuel Osorio',
    age: 68,
    role: 'Pequeño Propietario Jubilado',
    category: 'propietario',
    avatar: 'MO',
    bio: 'Extrabajador metalúrgico en Valencia. Posee un segundo piso heredado que alquila para complementar su pensión de jubilación.',
    identitySecret: 'SECRET_MANUEL_OSORIO_DNI_19847261M_VALENCIA',
    identityCommitment: generateIdentityCommitment('SECRET_MANUEL_OSORIO_DNI_19847261M_VALENCIA'),
    isDelegate: false
  },
  {
    id: 'dra-elena-miro',
    name: 'Dra. Elena Miró',
    age: 45,
    role: 'Catedrática en Urbanismo & Arquitecta',
    category: 'experto',
    avatar: 'EM',
    bio: 'Investigadora en regeneración urbana y políticas de vivienda pública europea. Publica análisis técnicos con datos contrastados de cada artículo.',
    identitySecret: 'SECRET_ELENA_MIRO_DNI_38920184K_BARCELONA',
    identityCommitment: generateIdentityCommitment('SECRET_ELENA_MIRO_DNI_38920184K_BARCELONA'),
    isDelegate: true,
    delegateTrackRecord: {
      totalDelegatedCitizens: 1420,
      votesDeliberated: 38,
      declaredPhilosophy: 'Equilibrio técnico entre la ampliación urgente del parque público y la certeza regulatoria para pequeños propietarios.',
      speciality: 'Urbanismo, Eficiencia Energética y Política de Suelo'
    }
  },
  {
    id: 'asoc-vivienda-digna',
    name: 'Asociación Vecinal Vivienda Digna',
    age: 18,
    role: 'Colectivo Social Verificado (12.400 socios)',
    category: 'colectivo',
    avatar: 'VD',
    bio: 'Federación de asociaciones vecinales y plataformas de inquilinos de ámbito estatal. Defienden la vivienda como un derecho humano no mercantilizable.',
    identitySecret: 'SECRET_ASOC_VIVIENDA_DIGNA_CIF_G84920182',
    identityCommitment: generateIdentityCommitment('SECRET_ASOC_VIVIENDA_DIGNA_CIF_G84920182'),
    isDelegate: true,
    delegateTrackRecord: {
      totalDelegatedCitizens: 12450,
      votesDeliberated: 52,
      declaredPhilosophy: 'Prioridad absoluta a la función social de la vivienda, erradicación de desahucios y sanción severa al rentismo especulativo.',
      speciality: 'Derechos Civiles, Asistencia Antidesahucios y Vivienda Pública'
    }
  },
  {
    id: 'carlos-vega',
    name: 'Carlos Vega',
    age: 38,
    role: 'Ingeniero de Sistemas & Auditor Cívico',
    category: 'ciudadano',
    avatar: 'CV',
    bio: 'Partidario de la fiscalización ciudadana del Parlamento mediante criptografía verificable. Vota de forma individual e inspecciona los hashes de las actas.',
    identitySecret: 'SECRET_CARLOS_VEGA_DNI_71829384P_SEVILLA',
    identityCommitment: generateIdentityCommitment('SECRET_CARLOS_VEGA_DNI_71829384P_SEVILLA'),
    isDelegate: false
  }
];
