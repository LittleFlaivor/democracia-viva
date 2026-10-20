/**
 * COMPONENTE: EL PUENTE DE CONSENSO Y RESULTADOS ELECTORALES COMPLETOS
 * - Gráficas vivas de "Tu Voto vs. El País" para cada artículo del decreto.
 * - Gráfica del Punto de Encuentro (Inquilinos vs. Propietarios).
 * - Gráfica de Afinidad Política con los principales partidos de España (PSOE, PP, VOX, Sumar) y sus logos vectoriales.
 * - Sello Criptográfico ZK limpio con botón para inspeccionar el recibo verificable.
 */

import { GameStore, GameDecision } from '../../state/game-store.ts';
import { CivicAppStore } from '../../state/store.ts';
import { GAMIFIED_DECK } from '../../domain/data/gamified-deck.ts';
import { CONGRESS_PARTIES } from '../../domain/data/party-badges.ts';
import { soundFx } from './sound-fx.ts';
import { 
  getConsultationDeadlineConfig, 
  calculateTimeRemaining 
} from '../../services/consultation-deadline.ts';

// Estadísticas Dinámicas de Voto Social por Artículo
interface ArticleStats {
  totalVotes: number;
  yesVotes: number;
  nsncVotes: number;
  noVotes: number;
  yesPercent: number;
  nsncPercent: number;
  noPercent: number;
  statusLabel: string;
}

function computeDonutGradient(yesPct: number, nsncPct: number, noPct: number, totalVotes: number): string {
  if (totalVotes === 0 || (yesPct === 0 && nsncPct === 0 && noPct === 0)) {
    return 'conic-gradient(var(--border-card) 0deg 360deg)';
  }

  if (yesPct === 100) return 'conic-gradient(#10B981 0deg 360deg)';
  if (noPct === 100) return 'conic-gradient(#F43F5E 0deg 360deg)';
  if (nsncPct === 100) return 'conic-gradient(#F59E0B 0deg 360deg)';

  const segments: Array<{ color: string; deg: number }> = [];
  if (yesPct > 0) segments.push({ color: '#10B981', deg: (yesPct / 100) * 360 });
  if (nsncPct > 0) segments.push({ color: '#F59E0B', deg: (nsncPct / 100) * 360 });
  if (noPct > 0) segments.push({ color: '#F43F5E', deg: (noPct / 100) * 360 });

  if (segments.length === 1) {
    return `conic-gradient(${segments[0].color} 0deg 360deg)`;
  }

  const parts: string[] = [];
  let currentAngle = 0;
  const gap = 2;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const startAngle = currentAngle;
    const endAngle = i === segments.length - 1 ? 360 : currentAngle + seg.deg - gap;
    parts.push(`${seg.color} ${Math.round(startAngle)}deg ${Math.round(endAngle)}deg`);
    if (i < segments.length - 1) {
      parts.push(`var(--bg-surface) ${Math.round(endAngle)}deg ${Math.round(endAngle + gap)}deg`);
      currentAngle = endAngle + gap;
    }
  }

  return `conic-gradient(${parts.join(', ')})`;
}

function getLiveArticleStats(
  articleId: string,
  userChoice: GameDecision | undefined,
  civicStore: CivicAppStore
): ArticleStats {
  let agg;
  try {
    agg = civicStore.getArticleAggregation(articleId);
  } catch {
    agg = null;
  }

  let yesVotes = agg ? agg.totalYes : 0;
  let noVotes = agg ? agg.totalNo : 0;
  let nsncVotes = agg ? agg.totalAbstain : 0;
  let totalVotes = yesVotes + noVotes + nsncVotes;

  // Si por sincronización local agg no computa aún el voto pero el usuario ha votado:
  if (totalVotes === 0 && userChoice) {
    if (userChoice === 'YES') yesVotes = 1;
    else if (userChoice === 'NO') noVotes = 1;
    else nsncVotes = 1;
    totalVotes = 1;
  }

  let yesPercent = 0;
  let noPercent = 0;
  let nsncPercent = 0;

  if (totalVotes > 0) {
    yesPercent = Math.round((yesVotes / totalVotes) * 100);
    noPercent = Math.round((noVotes / totalVotes) * 100);
    nsncPercent = Math.round((nsncVotes / totalVotes) * 100);

    const sum = yesPercent + noPercent + nsncPercent;
    if (sum !== 100) {
      const diff = 100 - sum;
      if (yesPercent >= noPercent && yesPercent >= nsncPercent) {
        yesPercent += diff;
      } else if (noPercent >= yesPercent && noPercent >= nsncPercent) {
        noPercent += diff;
      } else {
        nsncPercent += diff;
      }
    }
  }

  const rawVoterCount = agg ? agg.totalVotesCount : (totalVotes > 0 ? 1 : 0);
  let statusLabel = 'Sin votos aún';
  if (totalVotes === 0) {
    statusLabel = 'Sin votos aún';
  } else if (rawVoterCount === 1) {
    if (yesVotes > 0) statusLabel = 'Aprobado (1er Voto)';
    else if (noVotes > 0) statusLabel = 'Rechazado (1er Voto)';
    else statusLabel = 'Abstención (1er Voto)';
  } else if (yesPercent === 50 && noPercent === 50) {
    statusLabel = 'Empate Técnico (50/50)';
  } else if (yesPercent >= 75) {
    statusLabel = yesPercent === 100 ? 'Consenso Unánime (100%)' : 'Consenso Rotundo';
  } else if (yesPercent > 50) {
    statusLabel = 'Mayoría Aprobatoria';
  } else if (noPercent >= 75) {
    statusLabel = noPercent === 100 ? 'Rechazo Unánime (100%)' : 'Rechazo Rotundo';
  } else if (noPercent > 50) {
    statusLabel = 'Mayoría de Rechazo';
  } else if (nsncPercent > 50) {
    statusLabel = 'Mayoría en Delegación';
  } else {
    statusLabel = 'Votación Dividida';
  }

  return {
    totalVotes,
    yesVotes,
    noVotes,
    nsncVotes,
    yesPercent,
    noPercent,
    nsncPercent,
    statusLabel
  };
}

function getSmartUserSubline(userVote: GameDecision, stats: ArticleStats): string {
  if (stats.totalVotes === 0) {
    return 'Voto sellado criptográficamente y anclado en la urna.';
  }
  if (stats.totalVotes === 1) {
    return 'Tu voto inaugura el escrutinio oficial de la urna activa.';
  }

  const mine =
    userVote === 'YES' ? stats.yesVotes : userVote === 'NO' ? stats.noVotes : stats.nsncVotes;
  const others =
    userVote === 'YES'
      ? [stats.noVotes, stats.nsncVotes]
      : userVote === 'NO'
        ? [stats.yesVotes, stats.nsncVotes]
        : [stats.yesVotes, stats.noVotes];
  const maxOther = Math.max(...others);

  if (mine * 2 > stats.totalVotes) {
    return 'En sintonía con la mayoría absoluta de la urna';
  }
  if (mine > maxOther) {
    return 'Tu opción es la más votada, aunque sin mayoría absoluta';
  }
  if (mine === maxOther && mine > 0) {
    return 'Tu opción empata en cabeza con otra postura';
  }
  return userVote === 'DELEGATE'
    ? 'Abstención cívica deliberada, sin posicionamiento partidista'
    : 'Postura de contrapeso frente a la opción más votada';
}

export function renderConsensusEureka(
  container: HTMLElement,
  onOpenParliamentaryActa: () => void,
  onOpenReceiptModal: (nullifier: string) => void
) {
  const gameStore = GameStore.getInstance();
  const civicStore = CivicAppStore.getInstance();
  const decisions = gameStore.getDecisions();
  const merkleRoot = civicStore.getMerkleTreeRoot();
  const activeCitizen = civicStore.getActiveCitizen();
  const totalAuditedVotes = civicStore.getTotalMerkleLeavesCount();

  // Cálculo del Consenso Cívico General del Paquete Normativo (3 Artículos)
  const totalArticles = GAMIFIED_DECK.length;
  let approvedCount = 0;
  let articlesWithVotes = 0;

  GAMIFIED_DECK.forEach((card) => {
    const stats = getLiveArticleStats(card.articleId, decisions[card.id], civicStore);
    if (stats.totalVotes > 0) articlesWithVotes++;
    if (stats.yesVotes > stats.noVotes) approvedCount++;
  });

  const calculatedConsensus = totalArticles > 0 ? Math.round((approvedCount / totalArticles) * 100) : 0;
  let calculatedConsensusTitle = 'Consenso Cívico Alcanzado';
  let calculatedConsensusText = 'Votación auditada sobre el paquete normativo del RDL 2/2026 de Vivienda.';

  if (calculatedConsensus === 100) {
    calculatedConsensusTitle = 'Consenso Pleno Ciudadano (100%)';
    calculatedConsensusText = 'Los 3 artículos del decreto han obtenido respaldo mayoritario favorable en la urna.';
  } else if (calculatedConsensus >= 66) {
    calculatedConsensusTitle = 'Mayoría Favorable al Decreto';
    calculatedConsensusText = `${approvedCount} de los ${totalArticles} artículos del decreto han sido respaldados por el voto ciudadano.`;
  } else if (calculatedConsensus > 0) {
    calculatedConsensusTitle = 'Respaldo Parcial con Matices';
    calculatedConsensusText = `${approvedCount} de los ${totalArticles} artículos han sido aprobados, mientras que la ciudadanía pide revisar los restantes.`;
  } else if (articlesWithVotes === 0) {
    calculatedConsensusTitle = 'Urna Abierta en Blanco';
    calculatedConsensusText = 'La urna de pruebas ha arrancado desde 0 votos. Registra sufragios para computar el primer consenso.';
  } else {
    calculatedConsensusTitle = 'Rechazo Mayoritario al Decreto';
    calculatedConsensusText = 'La ciudadanía considera mayoritariamente que las medidas deben replantearse o modificarse.';
  }

  // 1. Calcular Afinidades Políticas Matemáticas para los 12 Partidos
  const ARTICLE_SHORT_TITLES: Record<string, { badge: string; title: string }> = {
    'CARD-01': { badge: 'Art. 1', title: 'Tope alquiler 2.5%' },
    'CARD-02': { badge: 'Art. 2', title: 'Incentivos 70% IRPF' },
    'CARD-03': { badge: 'Art. 3', title: 'Recargo 150% IBI' },
  };

  const ARTICLE_EXECUTIVE_DETAILS: Record<string, { badge: string; title: string; summary: string }> = {
    'CARD-01': {
      badge: 'Art. 1',
      title: 'Tope alquiler 2.5%',
      summary: 'Límite obligatorio a subidas de alquiler en municipios tensionados.'
    },
    'CARD-02': {
      badge: 'Art. 2',
      title: 'Incentivos 70% IRPF',
      summary: 'Bonificación fiscal a caseros que reduzcan voluntariamente la renta.'
    },
    'CARD-03': {
      badge: 'Art. 3',
      title: 'Recargo 150% IBI',
      summary: 'Penalización fiscal a bancos y fondos con pisos vacíos más de 2 años.'
    },
  };

  const formatVoteLabel = (vote: string): string => {
    if (vote === 'YES') return 'SÍ';
    if (vote === 'NO') return 'NO';
    return 'NS/NC';
  };

  const partyRankings = CONGRESS_PARTIES.map((party) => {
    let score = 0;
    const cardKeys = ['CARD-01', 'CARD-02', 'CARD-03'];
    const articleMatches = cardKeys.map((key) => {
      const userVote = decisions[key] || 'DELEGATE';
      const partyVote = party.votes[key] || 'DELEGATE';
      const isMatch = userVote === partyVote;
      const isHalf = (userVote === 'DELEGATE' || partyVote === 'DELEGATE') && !isMatch;
      if (isMatch) {
        score += 1;
      } else if (isHalf) {
        score += 0.5;
      }

      return {
        cardId: key,
        badge: ARTICLE_SHORT_TITLES[key]?.badge || key,
        shortTitle: ARTICLE_SHORT_TITLES[key]?.title || key,
        userVote,
        partyVote,
        userLabel: formatVoteLabel(userVote),
        partyLabel: formatVoteLabel(partyVote),
        isMatch,
      };
    });

    const affinityPercent = Math.round((score / cardKeys.length) * 100);
    return { ...party, affinityPercent, articleMatches };
  }).sort((a, b) => b.affinityPercent - a.affinityPercent);

  const top3Parties = partyRankings.slice(0, 3);
  // Se considera ganador claro solo si el 1º puesto supera estrictamente en porcentaje al 2º (sin empates en cabeza)
  const hasClearWinner = top3Parties.length > 1 
    ? top3Parties[0].affinityPercent > top3Parties[1].affinityPercent 
    : (top3Parties.length === 1 && top3Parties[0].affinityPercent > 0);

  const deadlineCfg = getConsultationDeadlineConfig();
  const deadlineRemaining = calculateTimeRemaining(deadlineCfg.targetIso);

  container.innerHTML = `
    <div class="eureka-stage-wrapper">
      <!-- Canvas de Partículas Celebratorias de Alta Frecuencia -->
      <canvas id="eureka-confetti-canvas" class="eureka-canvas"></canvas>

      <div class="eureka-content-box">
        <!-- Badge de Logro Cívico -->
        <div class="eureka-achievement-pill">
          <span class="sparkle-icon">✨</span>
          <span>RESULTADOS OFICIALES · DELIBERACIÓN CÍVICA VERIFICADA</span>
        </div>

        <h1 class="font-display eureka-title">
          Veredicto Ciudadano y Consenso Cívico
        </h1>

        <p class="eureka-lead">
          ${totalAuditedVotes === 0
            ? 'La urna ciudadana está abierta y lista para registrar la deliberación en tiempo real de forma anónima y verificable.'
            : `Frente al debate político tradicional, la deliberación ciudadana muestra el punto de encuentro de la sociedad: un <b>${calculatedConsensus}% de respaldo medio</b> al conjunto de las medidas.`}
        </p>

        <!-- Estadística Impacto Eureka Dinámica -->
        <div class="eureka-metric-banner">
          <div class="font-display eureka-big-stat">${calculatedConsensus}%</div>
          <div class="eureka-stat-label">
            <div style="font-weight: 800; font-size: 1.2rem; color: var(--text-primary);">
              ${calculatedConsensusTitle}
            </div>
            <div style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 0.25rem; line-height: 1.5;">
              ${calculatedConsensusText}
            </div>
          </div>
        </div>

        <!-- ========================================================
             SECCIÓN 1: RADIOGRAFÍA "TU VOTO VS. EL PAÍS"
             ======================================================== -->
        <div class="results-card-section">
          <div class="results-section-header">
            <div class="results-header-top-meta">
              <div class="results-header-eyebrow">
                <span>📊</span>
                <span>RECUENTO EN VIVO</span>
              </div>
              <div class="census-transparency-pill" title="Recuento auditado de votos verificables en la urna de pruebas">
                <span class="census-pulse-dot"></span>
                <span class="census-pill-text font-mono"><b>${totalAuditedVotes.toLocaleString('es-ES')}</b> ${totalAuditedVotes === 1 ? 'voto auditado' : 'votos auditados'}</span>
                <span class="census-pill-tag">Cómputo en Tiempo Real</span>
              </div>
              ${deadlineCfg.enabled ? `
                <div class="deadline-status-pill" title="Plazo de votación abierto hasta ${deadlineCfg.label} (${new Date(deadlineCfg.targetIso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })})">
                  <span class="deadline-pulse-dot"></span>
                  <span>Cierre: <b>${deadlineRemaining.formattedCompact}</b> (${deadlineCfg.label})</span>
                </div>
              ` : ''}
            </div>
            <h3 class="results-section-title font-display">
              ¿Cómo ha votado la ciudadanía? Tu elección frente al total
            </h3>
            <p class="results-section-subtitle">
              ${totalAuditedVotes === 0
                ? 'Urna de pruebas abierta desde 0 votos. El escrutinio comenzará con los primeros votos registrados.'
                : `Resultados en tiempo real sobre los ${totalAuditedVotes.toLocaleString('es-ES')} ${totalAuditedVotes === 1 ? 'voto registrado' : 'votos registrados'} en la urna y el sentido de tus 3 decisiones:`}
            </p>
          </div>

          <div class="articles-breakdown-list">
            ${GAMIFIED_DECK.map((card) => {
              const stats = getLiveArticleStats(card.articleId, decisions[card.id], civicStore);
              const userVote = decisions[card.id] || 'YES';
              const userVoteText = userVote === 'YES' ? 'A Favor' : userVote === 'NO' ? 'En Contra' : 'NS / NC';
              const userVoteClass = userVote === 'YES' ? 'vote-tag-yes' : userVote === 'NO' ? 'vote-tag-no' : 'vote-tag-nsnc';

              const detail = ARTICLE_EXECUTIVE_DETAILS[card.id] || {
                badge: card.articleId,
                title: card.badge,
                summary: card.headlineQuestion
              };

              const donutGradient = computeDonutGradient(stats.yesPercent, stats.nsncPercent, stats.noPercent, stats.totalVotes);

              let donutBigVal = '0%';
              let donutSubLabel = 'SIN VOTOS';
              let donutWinnerKind: 'yes' | 'no' | 'nsnc' | 'neutral' = 'neutral';
              if (stats.totalVotes > 0) {
                const options: { pct: number; votes: number; label: string; kind: 'yes' | 'no' | 'nsnc' }[] = [
                  { pct: stats.yesPercent, votes: stats.yesVotes, label: 'A FAVOR', kind: 'yes' },
                  { pct: stats.noPercent, votes: stats.noVotes, label: 'EN CONTRA', kind: 'no' },
                  { pct: stats.nsncPercent, votes: stats.nsncVotes, label: 'NS / NC', kind: 'nsnc' },
                ];
                const maxVotes = Math.max(...options.map((o) => o.votes));
                const leaders = options.filter((o) => o.votes === maxVotes);
                donutBigVal = `${leaders.length > 1 ? Math.min(...leaders.map((l) => l.pct)) : leaders[0].pct}%`;
                donutSubLabel = leaders.length > 1 ? 'EMPATE' : leaders[0].label;
                donutWinnerKind = leaders.length > 1 ? 'neutral' : leaders[0].kind;
              }

              return `
                <div class="national-result-card" data-card-id="${card.id}">
                  <!-- Cabecera: Insignia de Artículo y Estado de Consenso -->
                  <div class="national-card-header">
                    <span class="art-badge">${detail.badge}</span>
                    <span class="national-status-pill status-pill-${donutWinnerKind}">${stats.statusLabel}</span>
                  </div>

                  <!-- Título y Resumen Ejecutivo sin truncar con ... -->
                  <h4 class="national-card-title font-display">${detail.title}</h4>
                  <p class="national-card-desc">${detail.summary}</p>

                  <!-- Escenario Central: Dial Donut Segmentado Dinámico -->
                  <div class="national-donut-stage">
                    <div class="consensus-donut-dial" style="background: ${donutGradient};" title="${stats.totalVotes === 0 ? 'Sin votos registrados aún' : `Votación: ${stats.yesPercent}% SÍ (${stats.yesVotes.toLocaleString('es-ES')}) · ${stats.nsncPercent}% NS/NC (${stats.nsncVotes.toLocaleString('es-ES')}) · ${stats.noPercent}% NO (${stats.noVotes.toLocaleString('es-ES')})`}">
                      <div class="donut-center-info">
                        <span class="donut-big-val font-mono donut-val-${donutWinnerKind}">${donutBigVal}</span>
                        <span class="donut-sub-label">${donutSubLabel}</span>
                      </div>
                    </div>

                    <!-- Micro-Barra Segmentada de Distribución -->
                    <div class="distribution-mini-bar" title="SÍ: ${stats.yesVotes.toLocaleString('es-ES')} (${stats.yesPercent}%) | NS/NC: ${stats.nsncVotes.toLocaleString('es-ES')} (${stats.nsncPercent}%) | NO: ${stats.noVotes.toLocaleString('es-ES')} (${stats.noPercent}%)">
                      <div class="dist-seg dist-yes" style="width: ${stats.yesPercent}%;"></div>
                      <div class="dist-seg dist-nsnc" style="width: ${stats.nsncPercent}%;"></div>
                      <div class="dist-seg dist-no" style="width: ${stats.noPercent}%;"></div>
                    </div>

                    <!-- Leyenda Táctil con Píldoras -->
                    <div class="donut-stats-legend">
                      <span class="stat-pill pill-yes"><span class="pill-dot"></span><b>${stats.yesPercent}%</b> SÍ</span>
                      <span class="stat-pill pill-nsnc"><span class="pill-dot"></span><b>${stats.nsncPercent}%</b> NS</span>
                      <span class="stat-pill pill-no"><span class="pill-dot"></span><b>${stats.noPercent}%</b> NO</span>
                    </div>

                    <!-- Recuento Exacto de Votos en Micro-Tipografía -->
                    <div class="donut-votes-breakdown font-mono" title="Recuento desglosado de votos en este artículo">
                      <span>${stats.yesVotes.toLocaleString('es-ES')} SÍ</span>
                      <span class="breakdown-sep">·</span>
                      <span>${stats.nsncVotes.toLocaleString('es-ES')} NS</span>
                      <span class="breakdown-sep">·</span>
                      <span>${stats.noVotes.toLocaleString('es-ES')} NO</span>
                    </div>
                  </div>

                  <!-- Pie de Tarjeta: Credencial de Voto Personal Verificado -->
                  <div class="national-card-user-vote ${userVoteClass}">
                    <div class="user-vote-emblem-wrap">
                      <span>${userVote === 'YES' ? '✓' : userVote === 'NO' ? '✕' : '–'}</span>
                    </div>
                    <div class="user-vote-details">
                      <div class="user-vote-headline">
                        Tu voto: <b>${userVoteText}</b>
                      </div>
                      <div class="user-vote-subline">
                        ${getSmartUserSubline(userVote, stats)}
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Nota al pie de Transparencia Censal -->
          <div class="census-transparency-footnote">
            <span>ℹ️ <b>Transparencia de la urna:</b> Cada voto se suma al escrutinio oficial en tiempo real. En esta fase de pruebas se permite votar varias veces para verificar el cómputo. El recuento se sella con firmas digitales (WebAuthn) y un registro inmutable (árbol de Merkle) que asegura la privacidad y la imposibilidad de manipular el resultado.</span>
          </div>
        </div>

        <!-- ========================================================
             SECCIÓN 2: TOP 3 MAYOR SINTONÍA PARLAMENTARIA (3 COLUMNAS)
             ======================================================== -->
        <div class="results-card-section" style="margin-top: 2rem;">
          <div class="results-section-header">
            <div class="results-header-eyebrow" style="color: #6366F1; background: rgba(99, 102, 241, 0.08); border-color: rgba(99, 102, 241, 0.2);">
              <span>🏛️</span>
              <span>CONGRESO DE LOS DIPUTADOS</span>
            </div>
            <h3 class="results-section-title font-display">
              Afinidad con las Fuerzas Parlamentarias
            </h3>
            <p class="results-section-subtitle">
              Los 3 grupos del Congreso de los Diputados que votaron de forma más parecida a ti en estas tres medidas:
            </p>
          </div>

          <!-- Cuadrícula de 3 Columnas para el Podio de Mayor Sintonía -->
          <div class="top3-affinity-grid">
            ${top3Parties.map((party, index) => {
              const isWinner = index === 0 && hasClearWinner;
              return `
              <div class="top-affinity-card ${isWinner ? 'is-winner' : ''}" data-party-id="${party.id}">
                <!-- Marca / Logo oficial + Nombres + Escaños -->
                <div class="top-card-identity">
                  <div class="party-logo-wrapper" title="${party.name}">
                    <img src="${party.logoUrl}" alt="${party.shortName}" class="party-logo-img" />
                  </div>
                  <div class="top-card-names">
                    <div class="top-card-name-row">
                      <span class="top-card-short-name font-display">${party.shortName}</span>
                      <span class="party-seats-pill">${party.seats} ${party.seats === 1 ? 'escaño' : 'escaños'}</span>
                    </div>
                    <span class="top-card-full-name" title="${party.name}">${party.name}</span>
                  </div>
                </div>

                <!-- Métrica de Coincidencia -->
                <div class="top-card-metric-block">
                  <div class="top-card-stat-row">
                    <span class="top-card-metric-label">coincidencia</span>
                    <span class="top-card-percent font-mono" style="color: ${party.color};">
                      ${party.affinityPercent}%
                    </span>
                  </div>
                  <div class="party-affinity-track">
                    <div class="party-affinity-fill" style="width: ${party.affinityPercent}%; background: ${party.color};"></div>
                  </div>
                </div>

                <!-- Posicionamiento Oficial del Partido -->
                <p class="top-card-stance">
                  ${party.stanceSummary}
                </p>

                <!-- Desglose Compacto de los 3 Artículos (1 línea por artículo) -->
                <div class="top-card-articles">
                  ${party.articleMatches.map((m) => `
                    <div class="top-article-row ${m.isMatch ? 'match' : 'diff'}" title="${m.shortTitle} — Tú: ${m.userLabel} · ${party.shortName}: ${m.partyLabel}">
                      <div class="top-article-left">
                        <span class="art-badge-mini">${m.badge}</span>
                        <span class="top-art-topic">${m.shortTitle}</span>
                      </div>
                      <span class="match-status-tag ${m.isMatch ? 'tag-coincide' : 'tag-discrepa'}">
                        ${m.isMatch ? `${m.userLabel} ✓` : `${m.userLabel} ≠ ${m.partyLabel} ✕`}
                      </span>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
            }).join('')}
          </div>

          <!-- Sección Desplegable para ver las 12 Fuerzas del Congreso -->
          <div class="all-parties-collapse-section">
            <button type="button" class="btn-toggle-all-parties" id="btn-toggle-all-parties" aria-expanded="false" title="Mostrar la lista completa con los 12 partidos">
              <span>🏛️ Ver las 12 fuerzas del Congreso</span>
              <span class="toggle-chevron">▾</span>
            </button>

            <div class="all-parties-dropdown-content" id="all-parties-dropdown" style="display: none;">
              <!-- Filtros de Partidos -->
              <div class="party-filter-tabs" role="tablist" style="margin-bottom: 0.85rem;">
                <button class="party-filter-btn active" data-filter="all">Todos (${partyRankings.length})</button>
                <button class="party-filter-btn" data-filter="major">Principales (4)</button>
                <button class="party-filter-btn" data-filter="high">Sintonía ≥66%</button>
              </div>

              <!-- Filas compactas -->
              <div class="parties-affinity-grid" id="parties-grid">
                ${partyRankings.map((party, index) => `
                  <div class="party-affinity-row" data-party-id="${party.id}" data-major="${party.isMajor}" data-affinity="${party.affinityPercent}">
                    <div class="party-row-header" role="button" tabindex="0" aria-expanded="false" title="Haz clic para ver el posicionamiento y los 3 votos">
                      <div class="party-row-left-cluster">
                        <span class="party-rank-badge ${index === 0 ? 'top-rank' : ''}">#${index + 1}</span>
                        <div class="party-logo-wrapper" title="${party.name}">
                          <img src="${party.logoUrl}" alt="${party.shortName}" class="party-logo-img" loading="lazy" />
                        </div>
                        <div class="party-identity-col">
                          <div class="party-name-row">
                            <span class="party-short-name font-display">${party.shortName}</span>
                            <span class="party-seats-pill">${party.seats} ${party.seats === 1 ? 'escaño' : 'escaños'}</span>
                            ${index === 0 ? '<span class="winner-tag">⭐ Top</span>' : ''}
                          </div>
                          <div class="party-full-name-compact" title="${party.name}">${party.name}</div>
                        </div>
                      </div>

                      <div class="party-vote-micro-dots" title="Coincidencias en los 3 artículos">
                        ${party.articleMatches.map((m) => `
                          <span class="micro-dot ${m.isMatch ? 'match' : 'diff'}" title="${m.shortTitle}: Tú ${m.userLabel}, ${party.shortName} ${m.partyLabel}">
                            ${m.isMatch ? '✓' : '✕'}
                          </span>
                        `).join('')}
                      </div>

                      <div class="party-affinity-metric-col">
                        <div class="party-affinity-val-wrap">
                          <span class="party-affinity-val font-mono" style="color: ${party.color};">
                            ${party.affinityPercent}%
                          </span>
                        </div>
                        <div class="party-affinity-mini-track">
                          <div class="party-affinity-mini-fill" style="width: ${party.affinityPercent}%; background: ${party.color};"></div>
                        </div>
                      </div>

                      <div class="party-expand-indicator" aria-hidden="true">
                        <span class="expand-chevron">▾</span>
                      </div>
                    </div>

                    <div class="party-row-accordion" style="display: none;">
                      <div class="party-stance-banner">
                        <span class="stance-badge">🏛️ Posición oficial en el Congreso:</span>
                        <p class="party-stance-full">${party.stanceSummary}</p>
                      </div>

                      <div class="party-articles-breakdown">
                        ${party.articleMatches.map((m) => `
                          <div class="article-match-pill ${m.isMatch ? 'match-pill' : 'diff-pill'}">
                            <div class="match-pill-left">
                              <span class="art-badge">${m.badge}</span>
                              <span class="match-pill-topic">${m.shortTitle}</span>
                            </div>
                            <div class="match-pill-right">
                              <div class="match-pill-votes">
                                <span>Tú: <b>${m.userLabel}</b></span>
                                <span class="vote-sep">·</span>
                                <span>${party.shortName}: <b>${m.partyLabel}</b></span>
                              </div>
                              <span class="match-status-tag ${m.isMatch ? 'tag-coincide' : 'tag-discrepa'}">
                                ${m.isMatch ? 'Coincides ✓' : 'Discrepas ✕'}
                              </span>
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="parties-methodology-note" style="margin-top: 1.25rem;">
            ℹ️ <b>Metodología objetiva:</b> Comparativa matemática directa y neutral entre tus 3 votos y las votaciones reales registradas por los 350 diputados del Congreso en este decreto.
          </div>
        </div>

        <!-- ========================================================
             SECCIÓN 4: CERTIFICADO CRIPTOGRÁFICO ZK COMPACTO
             ======================================================== -->
        <div class="compact-zk-strip" style="margin-top: 2rem;">
          <div class="zk-strip-left">
            <div class="zk-shield-badge">🛡️</div>
            <div class="zk-strip-text">
              <div class="zk-strip-heading">
                <span class="zk-strip-title font-display">Tu Voto: 100% Anónimo y Verificable</span>
                <span class="zk-pill-tag">Papeleta Anónima</span>
                <span class="zk-pill-tag tag-verified">Recibo Verificable</span>
              </div>
              <div class="zk-strip-sub">
                Tu decisión queda sellada de forma segura en la urna. Nadie puede saber qué votaste, pero tú puedes verificar que tu voto cuenta.
              </div>
            </div>
          </div>

          <button class="btn-zk-inspect-compact" id="btn-open-zk-receipt" title="Ver el recibo oficial con identificador anónimo y comprobación de urna">
            <span>🔍 Ver Recibo de Votación</span>
          </button>
        </div>

        <!-- ========================================================
             SECCIÓN 5: ACCIONES FINALES
             ======================================================== -->
        <div class="eureka-final-actions" style="margin-top: 2.5rem;">
          <button class="btn-secondary" id="btn-eureka-undo" title="Modificar tu último voto o repasar las rondas anteriores">
            ↶ Cambiar Voto
          </button>
          <button class="btn-secondary" id="btn-replay-deck" title="Volver al primer artículo conservando todos los votos ya contabilizados">
            ↺ Votar de Nuevo
          </button>
          <button class="btn-primary btn-primary-prominent" id="btn-open-acta-final">
            🏛️ Ver Dictamen y Acta Parlamentaria
          </button>
        </div>
      </div>
    </div>
  `;

  // Inicializar explosión de partículas en canvas
  startCelebratoryParticles();

  // Listeners de interacción
  container.querySelector('#btn-open-zk-receipt')?.addEventListener('click', () => {
    soundFx.playTap();
    onOpenReceiptModal(merkleRoot);
  });

  container.querySelector('#btn-eureka-undo')?.addEventListener('click', () => {
    soundFx.playUndo();
    gameStore.undoDecision();
  });

  container.querySelector('#btn-replay-deck')?.addEventListener('click', () => {
    soundFx.playTap();
    gameStore.replayDeck();
  });

  // Listeners para acordeón interactivo en cada fila de partido
  const partyRows = container.querySelectorAll<HTMLElement>('.party-affinity-row');
  partyRows.forEach((row) => {
    const header = row.querySelector<HTMLElement>('.party-row-header');
    const accordion = row.querySelector<HTMLElement>('.party-row-accordion');
    if (!header || !accordion) return;

    const toggleAccordion = () => {
      soundFx.playTap();
      const isExpanded = row.classList.toggle('expanded');
      header.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      accordion.style.display = isExpanded ? 'block' : 'none';
    };

    header.addEventListener('click', toggleAccordion);
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleAccordion();
      }
    });
  });

  // Listeners para los filtros de partidos
  const filterBtns = container.querySelectorAll<HTMLButtonElement>('.party-filter-btn');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      soundFx.playTap();
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const filterType = btn.getAttribute('data-filter') || 'all';

      partyRows.forEach((row) => {
        const isMajor = row.getAttribute('data-major') === 'true';
        const affinity = parseInt(row.getAttribute('data-affinity') || '0', 10);

        if (filterType === 'all') {
          row.style.display = '';
        } else if (filterType === 'major') {
          row.style.display = isMajor ? '' : 'none';
        } else if (filterType === 'high') {
          row.style.display = affinity >= 66 ? '' : 'none';
        }
      });
    });
  });

  // Listener para desplegable de las 12 fuerzas del Congreso
  const btnToggleAll = container.querySelector<HTMLButtonElement>('#btn-toggle-all-parties');
  const dropdownAll = container.querySelector<HTMLElement>('#all-parties-dropdown');
  if (btnToggleAll && dropdownAll) {
    btnToggleAll.addEventListener('click', () => {
      soundFx.playTap();
      const isOpen = btnToggleAll.classList.toggle('is-open');
      btnToggleAll.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      dropdownAll.style.display = isOpen ? 'block' : 'none';
      const chevron = btnToggleAll.querySelector('.toggle-chevron');
      if (chevron) {
        chevron.textContent = isOpen ? '▴' : '▾';
      }
    });
  }

  container.querySelector('#btn-open-acta-final')?.addEventListener('click', () => {
    soundFx.playTap();
    onOpenParliamentaryActa();
  });
}

function startCelebratoryParticles() {
  const canvas = document.getElementById('eureka-confetti-canvas') as HTMLCanvasElement;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
    rotation: number;
    vRot: number;
  }> = [];

  const palette = ['#1D4ED8', '#059669', '#F59E0B', '#8B5CF6', '#3B82F6', '#10B981'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.4 + (Math.random() - 0.5) * 100,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.9) * 18,
      size: Math.random() * 8 + 4,
      color: palette[Math.floor(Math.random() * palette.length)],
      alpha: 1,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
    });
  }

  let animationFrameId: number;
  let frameCount = 0;

  function render() {
    frameCount++;
    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.38; // Gravedad
      p.vx *= 0.98; // Resistencia al aire
      p.rotation += p.vRot;
      p.alpha -= 0.008;

      if (p.alpha > 0) {
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate((p.rotation * Math.PI) / 180);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = Math.max(0, p.alpha);
        ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx!.restore();
      }
    });

    if (frameCount < 160) {
      animationFrameId = requestAnimationFrame(render);
    }
  }

  animationFrameId = requestAnimationFrame(render);
}
