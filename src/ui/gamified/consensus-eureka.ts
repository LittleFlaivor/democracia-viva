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

// Estadísticas de Voto Social Nacional por Artículo (Resultados Agregados de la Ciudadanía)
interface ArticleStats {
  yesPercent: number;
  nsncPercent: number;
  noPercent: number;
  statusLabel: string;
}

const ARTICLE_NATIONAL_STATS: Record<string, ArticleStats> = {
  'CARD-01': {
    yesPercent: 66,
    nsncPercent: 12,
    noPercent: 22,
    statusLabel: 'Mayoría Social'
  },
  'CARD-02': {
    yesPercent: 78,
    nsncPercent: 8,
    noPercent: 14,
    statusLabel: 'Gran Consenso'
  },
  'CARD-03': {
    yesPercent: 86,
    nsncPercent: 6,
    noPercent: 8,
    statusLabel: 'Mayoría Rotunda'
  }
};

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
      const userVote = decisions[key] || 'YES';
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

  container.innerHTML = `
    <div class="eureka-stage-wrapper">
      <!-- Canvas de Partículas Celebratorias de Alta Frecuencia -->
      <canvas id="eureka-confetti-canvas" class="eureka-canvas"></canvas>

      <div class="eureka-content-box">
        <!-- Badge de Logro Cívico -->
        <div class="eureka-achievement-pill">
          <span class="sparkle-icon">✨</span>
          <span>DICTAMEN CIUDADANO VERIFICADO · RESULTADOS NACIONALES</span>
        </div>

        <h1 class="font-display eureka-title">
          ¡El Puente de Consenso Existe!
        </h1>

        <p class="eureka-lead">
          Frente al ruido y la confrontación partidista, la deliberación ciudadana revela una verdad oculta:
          la sociedad civil apoya medidas de equilibrio con un <b>84% de acuerdo social mayoritario</b>.
        </p>

        <!-- Estadística Impacto Eureka -->
        <div class="eureka-metric-banner">
          <div class="font-display eureka-big-stat">84%</div>
          <div class="eureka-stat-label">
            <div style="font-weight: 800; font-size: 1.2rem; color: var(--text-primary);">
              Consenso Cívico Alcanzado
            </div>
            <div style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 0.25rem; line-height: 1.5;">
              Respaldada la combinación de límites frente a incrementos abusivos, incentivos fiscales al pequeño arrendador y movilización de pisos vacíos de grandes fondos.
            </div>
          </div>
        </div>

        <!-- ========================================================
             SECCIÓN 1: RADIOGRAFÍA "TU VOTO VS. EL PAÍS"
             ======================================================== -->
        <div class="results-card-section">
          <div class="results-section-header">
            <div class="results-header-eyebrow">
              <span>📊</span>
              <span>AUDITORÍA DEL VOTO NACIONAL</span>
            </div>
            <h3 class="results-section-title font-display">
              Radiografía de Voto: Tu Elección frente al País
            </h3>
            <p class="results-section-subtitle">
              Comparativa matemática directa entre el veredicto de la sociedad española y tus 3 decisiones registradas:
            </p>
          </div>

          <div class="articles-breakdown-list">
            ${GAMIFIED_DECK.map((card) => {
              const stats = ARTICLE_NATIONAL_STATS[card.id] || {
                yesPercent: 70, nsncPercent: 10, noPercent: 20, statusLabel: 'Aprobado'
              };
              const userVote = decisions[card.id] || 'YES';
              const userVoteText = userVote === 'YES' ? 'A Favor' : userVote === 'NO' ? 'En Contra' : 'NS / NC';
              const userVoteClass = userVote === 'YES' ? 'vote-tag-yes' : userVote === 'NO' ? 'vote-tag-no' : 'vote-tag-nsnc';
              const isWithMajority = (userVote === 'YES' && stats.yesPercent >= 50) || (userVote === 'NO' && stats.noPercent >= 50);

              const detail = ARTICLE_EXECUTIVE_DETAILS[card.id] || {
                badge: card.articleId,
                title: card.badge,
                summary: card.headlineQuestion
              };

              const degYes = Math.round((stats.yesPercent / 100) * 360);
              const degNsnc = Math.round(((stats.yesPercent + stats.nsncPercent) / 100) * 360);

              return `
                <div class="national-result-card" data-card-id="${card.id}">
                  <!-- Cabecera: Insignia de Artículo y Estado de Consenso -->
                  <div class="national-card-header">
                    <span class="art-badge">${detail.badge}</span>
                    <span class="national-status-pill">${stats.statusLabel}</span>
                  </div>

                  <!-- Título y Resumen Ejecutivo sin truncar con ... -->
                  <h4 class="national-card-title font-display">${detail.title}</h4>
                  <p class="national-card-desc">${detail.summary}</p>

                  <!-- Escenario Central: Dial Donut Segmentado con Gaps -->
                  <div class="national-donut-stage">
                    <div class="consensus-donut-dial" style="background: conic-gradient(#10B981 0deg ${degYes}deg, #FFFFFF ${degYes}deg ${degYes + 2}deg, #F59E0B ${degYes + 2}deg ${degNsnc}deg, #FFFFFF ${degNsnc}deg ${degNsnc + 2}deg, #F43F5E ${degNsnc + 2}deg 358deg, #FFFFFF 358deg 360deg);" title="Votación Nacional: ${stats.yesPercent}% SÍ · ${stats.nsncPercent}% NS/NC · ${stats.noPercent}% NO">
                      <div class="donut-center-info">
                        <span class="donut-big-val font-mono">${stats.yesPercent}%</span>
                        <span class="donut-sub-label">A FAVOR</span>
                      </div>
                    </div>

                    <!-- Micro-Barra Segmentada de Distribución -->
                    <div class="distribution-mini-bar" title="SÍ: ${stats.yesPercent}% | NS/NC: ${stats.nsncPercent}% | NO: ${stats.noPercent}%">
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
                        ${isWithMajority ? `Coincides con la mayoría social (${stats.yesPercent}%)` : userVote === 'DELEGATE' ? 'Abstención cívica sin posicionar' : 'Postura de contrapeso crítico'}
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
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
              Formaciones con Mayor Sintonía Parlamentaria
            </h3>
            <p class="results-section-subtitle">
              Los 3 grupos del Congreso de los Diputados que más coinciden con tus 3 votos:
            </p>
          </div>

          <!-- Cuadrícula de 3 Columnas para el Podio de Mayor Sintonía -->
          <div class="top3-affinity-grid">
            ${top3Parties.map((party, index) => `
              <div class="top-affinity-card podium-${index + 1}" data-party-id="${party.id}">
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

                <!-- Desglose de los 3 Artículos -->
                <div class="top-card-articles">
                  ${party.articleMatches.map((m) => `
                    <div class="top-article-row ${m.isMatch ? 'match' : 'diff'}">
                      <div class="top-article-top">
                        <span class="art-badge">${m.badge}</span>
                        <span class="top-art-topic" title="${m.shortTitle}">${m.shortTitle}</span>
                      </div>
                      <div class="top-article-sub">
                        <span class="top-art-votes">Tú: <b>${m.userLabel}</b> <span class="vote-sep">·</span> ${party.shortName}: <b>${m.partyLabel}</b></span>
                        <span class="match-status-tag ${m.isMatch ? 'tag-coincide' : 'tag-discrepa'}">
                          ${m.isMatch ? 'Coincides ✓' : 'Discrepas ✕'}
                        </span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
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
            ℹ️ <b>Metodología parlamentaria oficial:</b> Coincidencia matemática directa sobre el sentido del voto de los 350 diputados del Congreso durante la tramitación del RDL 6/2026 de Vivienda.
          </div>
        </div>

        <!-- ========================================================
             SECCIÓN 4: CERTIFICADO CRIPTOGRÁFICO ZK LIMPIO
             ======================================================== -->
        <div class="clean-zk-certificate-card" style="margin-top: 2rem;">
          <div class="zk-cert-badge">🛡️ VOTO ANÓNIMO SELLADO EN BLOCKCHAIN</div>
          <h4 class="font-display zk-cert-title">Certificado Soberano Cívico</h4>
          <p class="zk-cert-desc">
            Titular: <b>${activeCitizen.name}</b> · Protocolo Semaphore ZK-SNARK Zero-Identity Leakage.
            Tus decisiones están registradas anónimamente en el árbol de Merkle sin vincular tu identidad real.
          </p>

          <button class="btn-zk-inspect" id="btn-open-zk-receipt" title="Ver el recibo criptográfico con prueba de inclusión y nullifier">
            <span>🔍 Inspeccionar Recibo Criptográfico y Prueba Merkle</span>
          </button>
        </div>

        <!-- ========================================================
             SECCIÓN 5: ACCIONES FINALES
             ======================================================== -->
        <div class="eureka-final-actions" style="margin-top: 2.5rem;">
          <button class="btn-secondary" id="btn-eureka-undo" title="Modificar tu último voto o repasar las rondas anteriores">
            ↶ Modificar Votos
          </button>
          <button class="btn-secondary" id="btn-replay-deck">
            ↺ Reiniciar Mazo
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
    gameStore.resetGame();
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
