/**
 * COMPONENTE: MONOGRÁFICO DE CONTEXTO CÍVICO (SMART BREVITY - FORMATO DUAL INTEGRADO)
 * Diseño editorial premium, riguroso, equilibrado e impecablemente integrado.
 * Presenta las dos realidades enfrentadas (Inquilinos vs. Pequeños Propietarios),
 * gráfica de doble impacto, benchmarks internacionales y auditoría oficial.
 */

import { GamifiedCard } from '../../domain/data/gamified-deck.ts';
import { GameStore } from '../../state/game-store.ts';
import { CIVIC_MONOGRAPHS, CivicMonograph } from '../../domain/data/monographs.ts';

function renderSvgChart(monograph: CivicMonograph): string {
  if (monograph.articleId === 'ART-01') {
    // Gráfica de Cuádruple Impacto: Alquiler vs Costes del Casero vs IPC vs Salarios
    return `
      <div class="monograph-chart-box">
        <div class="chart-box-header">
          <div>
            <h4 class="chart-heading">${monograph.chart.title}</h4>
            <p class="chart-caption">${monograph.chart.subtitle}</p>
          </div>
          <div class="chart-legend-grid">
            <span class="c-legend rent-legend"><span class="c-dot red-dot"></span> Alquiler (+74%)</span>
            <span class="c-legend landlord-legend"><span class="c-dot amber-dot"></span> Costes Casero (+42%)</span>
            <span class="c-legend cpi-legend"><span class="c-dot gray-dot"></span> Inflación IPC (+24%)</span>
            <span class="c-legend wage-legend"><span class="c-dot green-dot"></span> Salario Real (+18%)</span>
          </div>
        </div>

        <div class="chart-svg-container">
          <svg viewBox="0 0 760 250" class="editorial-chart-svg" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="chart-rent-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#EF4444" />
                <stop offset="100%" stop-color="#DC2626" />
              </linearGradient>
              <linearGradient id="chart-landlord-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#F59E0B" />
                <stop offset="100%" stop-color="#D97706" />
              </linearGradient>
              <linearGradient id="chart-wage-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#10B981" />
                <stop offset="100%" stop-color="#059669" />
              </linearGradient>
            </defs>

            <!-- Líneas de escala horizontal -->
            <line x1="50" y1="50" x2="720" y2="50" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3" />
            <text x="42" y="54" fill="currentColor" opacity="0.4" font-size="10" text-anchor="end">175</text>

            <line x1="50" y1="100" x2="720" y2="100" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3" />
            <text x="42" y="104" fill="currentColor" opacity="0.4" font-size="10" text-anchor="end">150</text>

            <line x1="50" y1="150" x2="720" y2="150" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3" />
            <text x="42" y="154" fill="currentColor" opacity="0.4" font-size="10" text-anchor="end">125</text>

            <line x1="50" y1="200" x2="720" y2="200" stroke="currentColor" stroke-opacity="0.2" />
            <text x="42" y="204" fill="currentColor" opacity="0.5" font-size="10" text-anchor="end">100</text>

            <!-- Curva 3: Inflación IPC (Gris discontinua) -->
            <polyline 
              points="60,200 170,192 280,186 390,176 500,158 610,152" 
              fill="none" 
              stroke="#94A3B8" 
              stroke-width="2" 
              stroke-dasharray="3,3"
            />

            <!-- Curva 4: Salarios Reales (Verde) -->
            <polyline 
              points="60,200 170,194 280,186 390,180 500,172 610,164" 
              fill="none" 
              stroke="url(#chart-wage-grad)" 
              stroke-width="3" 
              stroke-linecap="round"
            />

            <!-- Curva 2: Costes de Mantenimiento y Reformas del Casero (Ámbar) -->
            <polyline 
              points="60,200 170,188 280,172 390,156 500,132 610,116" 
              fill="none" 
              stroke="url(#chart-landlord-grad)" 
              stroke-width="3" 
              stroke-linecap="round"
            />

            <!-- Curva 1: Precio Alquiler (Roja) -->
            <polyline 
              points="60,200 170,164 280,128 390,116 500,84 610,52" 
              fill="none" 
              stroke="url(#chart-rent-grad)" 
              stroke-width="3.8" 
              stroke-linecap="round"
            />

            <!-- Nodos y Etiquetas de Cierre (2025) -->
            <circle cx="610" cy="52" r="5" fill="#EF4444" stroke="#FFF" stroke-width="2" />
            <text x="618" y="48" fill="#EF4444" font-weight="700" font-size="11">+74% Alquiler</text>

            <circle cx="610" cy="116" r="4.5" fill="#F59E0B" stroke="#FFF" stroke-width="1.8" />
            <text x="618" y="112" fill="#D97706" font-weight="700" font-size="11">+42% Gastos Casero</text>

            <circle cx="610" cy="164" r="4.5" fill="#10B981" stroke="#FFF" stroke-width="1.8" />
            <text x="618" y="166" fill="#059669" font-weight="700" font-size="11">+18% Salarios</text>

            <!-- Años Eje X -->
            <text x="60" y="222" fill="currentColor" opacity="0.6" font-size="11" text-anchor="middle">2015</text>
            <text x="170" y="222" fill="currentColor" opacity="0.6" font-size="11" text-anchor="middle">2017</text>
            <text x="280" y="222" fill="currentColor" opacity="0.6" font-size="11" text-anchor="middle">2019</text>
            <text x="390" y="222" fill="currentColor" opacity="0.6" font-size="11" text-anchor="middle">2021</text>
            <text x="500" y="222" fill="currentColor" opacity="0.6" font-size="11" text-anchor="middle">2023</text>
            <text x="610" y="222" fill="currentColor" opacity="0.8" font-weight="700" font-size="11" text-anchor="middle">2025</text>
          </svg>
        </div>

        <div class="chart-dual-takeaway">
          <span class="takeaway-badge">💡 CONCLUSIÓN EMPÍRICA</span>
          <p class="takeaway-p">${monograph.chart.takeaway}</p>
        </div>
      </div>
    `;
  }

  // Gráfica de Simulación de Bolsillo para ART-02
  if (monograph.articleId === 'ART-02') {
    return `
      <div class="monograph-chart-box">
        <div class="chart-box-header">
          <div>
            <h4 class="chart-heading">${monograph.chart.title}</h4>
            <p class="chart-caption">${monograph.chart.subtitle}</p>
          </div>
        </div>

        <div class="simulation-dual-grid">
          <div class="sim-dual-card tenant-side">
            <div class="sim-header">
              <span class="sim-actor-badge">👤 INQUILINO</span>
              <span class="sim-metric">-10% al mes</span>
            </div>
            <div class="sim-main-price">
              <span class="old-p">900€/mes</span> → <strong class="new-p">810€/mes</strong>
            </div>
            <div class="sim-benefit-tag">✓ Ahorro directo: <strong>1.080€ al año</strong></div>
            <p class="sim-caption">Reduce el esfuerzo salarial del 52% al 44% sin mudarse ni perder estabilidad.</p>
          </div>

          <div class="sim-dual-card landlord-side">
            <div class="sim-header">
              <span class="sim-actor-badge">🏠 PEQUEÑO CASERO</span>
              <span class="sim-metric">Bonificación 70% IRPF</span>
            </div>
            <div class="sim-main-price">
              <span class="old-p">540€ neto</span> → <strong class="new-p">600€ netos limpios</strong>
            </div>
            <div class="sim-benefit-tag">✓ Ganancia neta: <strong>+720€ al año</strong></div>
            <p class="sim-caption">Baja la renta bruta 90€, pero Hacienda le perdona 150€/mes en la declaración de IRPF.</p>
          </div>
        </div>

        <div class="chart-dual-takeaway">
          <span class="takeaway-badge">💡 CONCLUSIÓN EMPÍRICA</span>
          <p class="takeaway-p">${monograph.chart.takeaway}</p>
        </div>
      </div>
    `;
  }

  // Gráfica de Distribución de Vivienda Vacía para ART-03
  return `
    <div class="monograph-chart-box">
      <div class="chart-box-header">
        <div>
          <h4 class="chart-heading">${monograph.chart.title}</h4>
          <p class="chart-caption">${monograph.chart.subtitle}</p>
        </div>
      </div>

      <div class="meter-bar-container">
        <div class="meter-progress-track">
          <div class="seg-family" style="width: 82%;">82% Familias Particulares (100% Exentas)</div>
          <div class="seg-funds" style="width: 11%;">11% Fondos</div>
          <div class="seg-banks" style="width: 7%;">7% Banca</div>
        </div>
        <div class="meter-labels-row">
          <span class="label-exempt">✓ <strong>82% Exentas:</strong> Familias con segundas residencias, reformas y herencias.</span>
          <span class="label-penalized">✕ <strong>18% Penalizadas:</strong> Corporaciones con +10 pisos vacíos más de 2 años.</span>
        </div>
      </div>

      <div class="chart-dual-takeaway">
        <span class="takeaway-badge">💡 CONCLUSIÓN EMPÍRICA</span>
        <p class="takeaway-p">${monograph.chart.takeaway}</p>
      </div>
    </div>
  `;
}

export function renderMonographModal(container: HTMLElement, card: GamifiedCard) {
  const gameStore = GameStore.getInstance();
  const monograph: CivicMonograph | undefined = CIVIC_MONOGRAPHS[card.articleId];

  if (!monograph) return;

  const [inquilino, propietario] = monograph.dualPerspectives;

  container.innerHTML = `
    <div class="modal-overlay" id="monograph-modal-overlay">
      <div class="modal-sheet monograph-sheet" role="dialog" aria-modal="true" aria-labelledby="monograph-title-text">
        
        <!-- Cabecera Sticky Integrada (Glassmorphism) -->
        <div class="monograph-sticky-nav">
          <div class="monograph-badge-row">
            <span class="badge-mono">📊 DATOS CLAVE Y CONTEXTO CÍVICO</span>
            <span class="monograph-readtime">⏱️ ${monograph.readTime}</span>
          </div>
          <button class="modal-close-btn monograph-close-action" id="monograph-close-btn" title="Cerrar datos clave">✕</button>
        </div>

        <!-- Portada del Monográfico -->
        <header class="monograph-title-block">
          <h2 class="font-display monograph-main-title" id="monograph-title-text">
            ${monograph.title}
          </h2>
          <p class="monograph-main-lead">
            ${monograph.executiveSummary}
          </p>
        </header>

        <!-- SECCIÓN 1: DOS REALIDADES COTIDIANAS (DUAL PERSPECTIVE) -->
        <section class="monograph-block">
          <div class="block-header">
            <span class="block-step-num">01</span>
            <h3 class="block-title">Dos Realidades Cotidianas</h3>
          </div>

          <div class="dual-perspectives-grid">
            <!-- Columna Inquilino -->
            <div class="perspective-column tenant-column">
              <div class="perspective-card-top">
                <span class="actor-badge badge-green">${inquilino.avatar} ${inquilino.actorBadge}</span>
                <h4 class="actor-card-title">${inquilino.actorTitle}</h4>
              </div>
              <p class="actor-situation-p">
                ${inquilino.dailyReality}
              </p>
              <div class="actor-risk-box risk-tenant">
                <strong>Mayor temor:</strong> ${inquilino.biggestRisk}
              </div>
              <div class="actor-official-stat">
                <span class="stat-number font-display text-green">${inquilino.officialStat.value}</span>
                <span class="stat-text">${inquilino.officialStat.label}</span>
                <span class="stat-source">🏛️ ${inquilino.officialStat.source}</span>
              </div>
            </div>

            <!-- Columna Propietario -->
            <div class="perspective-column landlord-column">
              <div class="perspective-card-top">
                <span class="actor-badge badge-amber">${propietario.avatar} ${propietario.actorBadge}</span>
                <h4 class="actor-card-title">${propietario.actorTitle}</h4>
              </div>
              <p class="actor-situation-p">
                ${propietario.dailyReality}
              </p>
              <div class="actor-risk-box risk-landlord">
                <strong>Mayor temor:</strong> ${propietario.biggestRisk}
              </div>
              <div class="actor-official-stat">
                <span class="stat-number font-display text-amber">${propietario.officialStat.value}</span>
                <span class="stat-text">${propietario.officialStat.label}</span>
                <span class="stat-source">🏛️ ${propietario.officialStat.source}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- SECCIÓN 2: LA BRECHA EMPÍRICA (GRÁFICA DUAL) -->
        <section class="monograph-block">
          <div class="block-header">
            <span class="block-step-num">02</span>
            <h3 class="block-title">La Evidencia en Datos: Evolución de Precios, Salarios y Costes</h3>
          </div>
          ${renderSvgChart(monograph)}
        </section>

        <!-- SECCIÓN 3: CÓMO OPERA LA MEDIDA EN LA PRÁCTICA -->
        <section class="monograph-block">
          <div class="block-header">
            <span class="block-step-num">03</span>
            <h3 class="block-title">Cómo Opera la Medida en la Práctica</h3>
          </div>
          <div class="pillars-clean-stack">
            ${monograph.contextPillars
              .map(
                (p) => `
              <div class="pillar-clean-row">
                <span class="pillar-step-badge">${p.number}</span>
                <div class="pillar-row-text">
                  <h4 class="pillar-row-title">${p.title}</h4>
                  <p class="pillar-row-desc">${p.description}</p>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </section>

        <!-- SECCIÓN 4: PRECEDENTES EN OTRAS CIUDADES -->
        <section class="monograph-block">
          <div class="block-header">
            <span class="block-step-num">04</span>
            <h3 class="block-title">¿Qué Ocurrió en Otras Ciudades?</h3>
          </div>
          <div class="benchmarks-clean-grid">
            ${monograph.internationalBenchmarks
              .map(
                (b) => `
              <div class="benchmark-clean-card">
                <div class="bm-header">
                  <span class="bm-flag">${b.flag}</span>
                  <span class="bm-city">${b.city}</span>
                </div>
                <div class="bm-measure"><strong>Medida:</strong> ${b.measure}</div>
                <div class="bm-pro"><strong>Efecto medido:</strong> ${b.outcome}</div>
                <div class="bm-con"><strong>Efecto colateral:</strong> ${b.sideEffect}</div>
              </div>
            `
              )
              .join('')}
          </div>
        </section>

        <!-- SECCIÓN 5: LA BALANZA EQUITATIVA (A FAVOR VS OBJECIONES) -->
        <section class="monograph-block">
          <div class="block-header">
            <span class="block-step-num">05</span>
            <h3 class="block-title">La Balanza: Razones para Apoyarlo vs. Riesgos</h3>
          </div>
          <div class="balance-symmetric-grid">
            <div class="balance-col pro-col">
              <div class="balance-col-header pro-h">
                <span>✓ Argumentos a Favor</span>
              </div>
              <ul class="clean-bullet-list">
                ${monograph.proArguments.map((a) => `<li>${a}</li>`).join('')}
              </ul>
            </div>

            <div class="balance-col con-col">
              <div class="balance-col-header con-h">
                <span>✕ Riesgos y Objeciones</span>
              </div>
              <ul class="clean-bullet-list">
                ${monograph.conArguments.map((a) => `<li>${a}</li>`).join('')}
              </ul>
            </div>
          </div>
        </section>

        <!-- SECCIÓN 6: DICTAMEN TÉCNICO INDEPENDIENTE -->
        <section class="monograph-block">
          <div class="block-header">
            <span class="block-step-num">06</span>
            <h3 class="block-title">Consenso de Expertos y Reguladores</h3>
          </div>
          <div class="expert-consensus-card">
            <div class="expert-meta-row">
              <span class="expert-tag">💡 DICTAMEN OFICIAL</span>
              <span class="expert-name">${monograph.expertConsensus.institution}</span>
            </div>
            <p class="expert-quote-text">
              "${monograph.expertConsensus.verdict}"
            </p>
          </div>
        </section>

        <!-- SECCIÓN 7: AUDITORÍA DE FUENTES OFICIALES (MÁXIMO RIGOR) -->
        <section class="monograph-block sources-block">
          <div class="block-header">
            <span class="block-step-num">07</span>
            <div class="sources-title-wrap">
              <h3 class="block-title">Auditoría de Fuentes Oficiales</h3>
              <span class="sources-shield-badge">✓ 100% Verificado</span>
            </div>
          </div>
          <p class="sources-note">
            Democracia Viva no emite juicios de valor: todos los indicadores provienen de publicaciones estadísticas oficiales auditables.
          </p>

          <div class="sources-compact-grid">
            ${monograph.verifiedSources
              .map(
                (src) => `
              <div class="source-item-card">
                <div class="source-top">
                  <span class="source-org">${src.institution}</span>
                  <span class="source-date">${src.yearOrEdition}</span>
                </div>
                <div class="source-title-text">"${src.documentTitle}"</div>
                <div class="source-section-text">${src.sectionOrTable}</div>
                <div class="source-highlight-box">
                  <strong>Dato contrastado:</strong> ${src.findingSummary}
                </div>
                <div class="source-bottom">
                  <code>Ref: ${src.officialReference}</code>
                  <span class="source-ok">✓ Documento público auditado</span>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </section>

        <!-- FOOTER: ACCIONES DIRECTAS DE VOTACIÓN IN-SITU -->
        <footer class="monograph-bottom-bar">
          <div class="bottom-prompt">
            ¿Tienes clara tu decisión tras consultar los datos oficiales?
          </div>
          <div class="bottom-actions-row">
            <button class="btn-vote btn-vote-no" id="btn-mono-no" title="Votar en contra">
              ✕ En Contra
            </button>
            <button class="btn-delegate" id="btn-mono-delegate" title="No sabe / No contesta o delegar">
              ? NS / NC
            </button>
            <button class="btn-vote btn-vote-yes" id="btn-mono-yes" title="Votar a favor">
              ✓ A Favor
            </button>
          </div>
        </footer>

      </div>
    </div>
  `;

  // Listeners de cierre
  const overlay = container.querySelector('#monograph-modal-overlay');
  const closeBtn = container.querySelector('#monograph-close-btn');

  const closeModal = () => {
    gameStore.closeMonographModal();
  };

  closeBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  // Listeners de votación directa
  container.querySelector('#btn-mono-yes')?.addEventListener('click', () => {
    closeModal();
    gameStore.playDecision('YES');
  });

  container.querySelector('#btn-mono-no')?.addEventListener('click', () => {
    closeModal();
    gameStore.playDecision('NO');
  });

  container.querySelector('#btn-mono-delegate')?.addEventListener('click', () => {
    closeModal();
    gameStore.playDecision('DELEGATE');
  });
}
