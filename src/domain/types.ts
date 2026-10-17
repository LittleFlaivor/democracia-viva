/**
 * DEMOCRACIA VIVA - TIPOS DE DOMINIO DEL PROTOCOLO
 * Definiciones formales para Identidad ZK, Abstracción ERC-4337,
 * Árbol de Merkle y Motor DAG de Democracia Líquida.
 */

export type VoteChoice = 'YES' | 'NO' | 'ABSTAIN';

export type DelegationScope = 'VIVIENDA_Y_URBANISMO' | 'ECONOMIA' | 'SANIDAD' | 'GENERAL';

export interface CitizenProfile {
  id: string;
  name: string;
  age: number;
  role: string;
  category: 'inquilino' | 'propietario' | 'experto' | 'colectivo' | 'ciudadano';
  avatar: string;
  bio: string;
  identitySecret: string; // Enclave seguro local (nunca sale del cliente)
  identityCommitment: string; // Hash público del compromiso de identidad
  isDelegate: boolean;
  delegateTrackRecord?: {
    totalDelegatedCitizens: number;
    votesDeliberated: number;
    declaredPhilosophy: string;
    speciality: string;
  };
}

export interface DecreeArticle {
  id: string;
  decreeId: string;
  articleNumber: string;
  title: string;
  boeFormalText: string;
  realLifeImpact: {
    nutshell: string;
    tenantsEffect: string;
    landlordsEffect: string;
    financialMetric: string;
  };
  proArguments: string[];
  conArguments: string[];
  congressVote: {
    yes: number;
    no: number;
    abstain: number;
    result: 'APROBADO' | 'RECHAZADO';
    date: string;
  };
  keyTopics: string[];
}

export interface ZkProofPayload {
  pi_a: [string, string];
  pi_b: [[string, string], [string, string]];
  pi_c: [string, string];
  protocol: 'groth16-semaphore-v4';
  publicSignals: string[];
}

export interface VoteReceipt {
  receiptId: string;
  nullifierHash: string;
  scopeHash: string;
  articleId: string;
  choice: VoteChoice;
  timestamp: number;
  txHash: string;
  merkleRoot: string;
  merkleProof: MerkleProof;
  isGaslessSponsored: boolean;
  zkProof: ZkProofPayload;
  // NOTA CRÍTICA DE PRIVACIDAD: Cero campos de identidad personal aquí.
}

export interface MerkleSibling {
  hash: string;
  position: 'left' | 'right';
}

export interface MerkleProof {
  leaf: string;
  leafIndex: number;
  siblings: MerkleSibling[];
  root: string;
}

export interface DelegationEdge {
  citizenId: string;
  delegateToId: string;
  scope: DelegationScope;
  timestamp: number;
}

export interface ArticleVoteAggregation {
  articleId: string;
  totalVotesCount: number;
  totalElectoralWeight: number;
  directWeightYes: number;
  directWeightNo: number;
  directWeightAbstain: number;
  delegatedWeightYes: number;
  delegatedWeightNo: number;
  delegatedWeightAbstain: number;
  totalYes: number;
  totalNo: number;
  totalAbstain: number;
  pctYes: number;
  pctNo: number;
  pctAbstain: number;
  consensusIndex: number; // 0 a 100
  citizensApproved: boolean;
  congressApproved: boolean;
  congressComparison: {
    citizensApproved: boolean;
    congressApproved: boolean;
    divergencePct: number;
  };
}
