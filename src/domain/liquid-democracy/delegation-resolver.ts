/**
 * RESOLUTOR DE DELEGACIONES Y AGREGACIÓN ELECTORAL
 * Combina el motor DAG, los votos directos y las delegaciones activas
 * para computar la descomposición exacta (Voto Directo vs. Voto Delegado)
 * y el contraste contra el Congreso de los Diputados.
 */

import type { ArticleVoteAggregation, CitizenProfile, DecreeArticle, VoteChoice } from '../types.ts';
import { LiquidDemocracyDAGEngine } from './dag-engine.ts';

export interface RawVoteRecord {
  nullifierHash: string;
  citizenId: string; // Para resolución de simulación en cliente
  articleId: string;
  choice: VoteChoice;
  timestamp: number;
}

export class DelegationResolver {
  public static aggregateArticleVotes(
    article: DecreeArticle,
    citizens: CitizenProfile[],
    delegations: Map<string, string>,
    directVotes: RawVoteRecord[]
  ): ArticleVoteAggregation {
    const citizenIds = citizens.map((c) => c.id);
    const votesForArticle = directVotes.filter((v) => v.articleId === article.id);

    // Mapa de votos directos por ciudadano
    const directVoteMap = new Map<string, VoteChoice>();
    for (const v of votesForArticle) {
      directVoteMap.set(v.citizenId, v.choice);
    }

    // Calcular pesos efectivos considerando hot-override
    const effectiveWeights = LiquidDemocracyDAGEngine.computeEffectiveWeightsForArticle(
      citizenIds,
      delegations,
      directVoteMap
    );

    let directWeightYes = 0;
    let directWeightNo = 0;
    let directWeightAbstain = 0;

    let delegatedWeightYes = 0;
    let delegatedWeightNo = 0;
    let delegatedWeightAbstain = 0;

    let totalVotesCount = 0;

    // Procesar votos de cada ciudadano que haya emitido un voto directo
    for (const v of votesForArticle) {
      totalVotesCount += 1;
      const totalWeightOfVoter = effectiveWeights.get(v.citizenId) || 1;
      
      // Peso directo (el voto propio del ciudadano) = 1
      const directPart = 1;
      // Peso delegado (los ciudadanos que le transfirieron su voto y no votaron directo)
      const delegatedPart = Math.max(0, totalWeightOfVoter - 1);

      if (v.choice === 'YES') {
        directWeightYes += directPart;
        delegatedWeightYes += delegatedPart;
      } else if (v.choice === 'NO') {
        directWeightNo += directPart;
        delegatedWeightNo += delegatedPart;
      } else {
        directWeightAbstain += directPart;
        delegatedWeightAbstain += delegatedPart;
      }
    }

    const totalYes = directWeightYes + delegatedWeightYes;
    const totalNo = directWeightNo + delegatedWeightNo;
    const totalAbstain = directWeightAbstain + delegatedWeightAbstain;
    const totalElectoralWeight = totalYes + totalNo + totalAbstain;

    const pctYes = totalElectoralWeight > 0 ? Math.round((totalYes / totalElectoralWeight) * 100) : 0;
    const pctNo = totalElectoralWeight > 0 ? Math.round((totalNo / totalElectoralWeight) * 100) : 0;
    const pctAbstain = totalElectoralWeight > 0 ? Math.round((totalAbstain / totalElectoralWeight) * 100) : 0;

    // Cálculo del índice de consenso cívico (0 a 100)
    // Mayor cuando la mayoría cualificada es más amplia
    const maxShare = Math.max(pctYes, pctNo, pctAbstain);
    const consensusIndex = totalElectoralWeight > 0 ? Math.min(100, Math.round(maxShare * 1.1)) : 0;

    const citizensApproved = totalYes > totalNo;
    const congressApproved = article.congressVote.result === 'APROBADO';
    
    // Divergencia porcentual con respecto al parlamento
    const congressTotal = article.congressVote.yes + article.congressVote.no + article.congressVote.abstain;
    const congressPctYes = congressTotal > 0 ? Math.round((article.congressVote.yes / congressTotal) * 100) : 0;
    const divergencePct = Math.abs(pctYes - congressPctYes);

    return {
      articleId: article.id,
      totalVotesCount,
      totalElectoralWeight,
      directWeightYes,
      directWeightNo,
      directWeightAbstain,
      delegatedWeightYes,
      delegatedWeightNo,
      delegatedWeightAbstain,
      totalYes,
      totalNo,
      totalAbstain,
      pctYes,
      pctNo,
      pctAbstain,
      consensusIndex,
      citizensApproved,
      congressApproved,
      congressComparison: {
        citizensApproved,
        congressApproved,
        divergencePct
      }
    };
  }
}
