/**
 * COMPONENTE: MAZO DE CARTAS 3D INTERACTIVO (VIDEO-GAME ARCADE STYLE)
 * Integra:
 * 1. Firma Biométrica Just-in-Time con Passkeys nativas (W3C WebAuthn).
 * 2. Estado de Bloqueo Post-Voto ("Voto Sellado e Inmutable").
 * 3. Descarga de Recibo Criptográfico JSON y Bloqueo Total contra Rollback.
 */

import { GameStore, GameDecision } from '../../state/game-store.ts';
import { soundFx } from './sound-fx.ts';
import { promptJustInTimePasskey } from './auth-modal.ts';
import { triggerReceiptDownload } from '../../services/firestore-voting.ts';
import { CitizenPasskeyCredential, isTestBypassEnabled, createOrGetSimulatedTestCredential } from '../../services/auth.ts';

export function renderCardDeck(container: HTMLElement) {
  const gameStore = GameStore.getInstance();
  const currentCard = gameStore.getCurrentCard();
  const nextCards = gameStore.getNextCards();

  if (!currentCard) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="deck-stage-wrapper">
      <!-- Escenario 3D del Mazo con Bandeja Arcade -->
      <div class="deck-stage arcade-card-bay" id="deck-stage">
        <!-- Cartas de Fondo para Profundidad Táctil -->
        ${nextCards
          .slice(0, 2)
          .map((card, idx) => {
            const depthIndex = idx + 1;
            const scale = 1 - depthIndex * 0.04;
            const translateY = depthIndex * 12;
            return `
            <div 
              class="game-card card-depth" 
              style="transform: scale(${scale}) translateY(${translateY}px); z-index: ${10 - depthIndex}; opacity: ${0.88 - depthIndex * 0.2};"
            >
              <div class="card-header">
                <span class="card-category">${card.category}</span>
                <span class="badge-mono" style="font-size: 0.72rem;">${card.articleId}</span>
              </div>
              <div class="card-illustration-box mini-box">
                ${card.svgIllustration || ''}
              </div>
              <div class="card-body">
                <h3 class="card-question-depth font-display">${card.headlineQuestion}</h3>
              </div>
            </div>
          `;
          })
          .join('')}

        <!-- CARTA ACTIVA INTERACTIVA (DELIBERATIVA Y ACCESIBLE) -->
        <div class="game-card active-card arcade-glow-card" id="active-card" style="z-index: 20;">

          <!-- Contenido Superior de la Carta: Área Temática y Artículo Oficial -->
          <div class="card-header">
            <div class="card-topic-tag">
              <span class="topic-dot"></span>
              <span class="card-category">${currentCard.category}</span>
            </div>
            <span class="badge-mono" style="font-size: 0.74rem;">${currentCard.badge.split('·')[0].trim()}</span>
          </div>

          <!-- Micro-Ilustración Vectorial Editorial -->
          <div class="card-illustration-box">
            ${currentCard.svgIllustration || ''}
          </div>

          <!-- Cuerpo: Titular, Resumen Ejecutivo y Métricas Clave -->
          <div class="card-body">
            <div class="card-text-group">
              <h2 class="card-question font-display">${currentCard.headlineQuestion}</h2>
              <p class="card-subtitle-executive">${currentCard.subtitle}</p>
            </div>

            ${currentCard.metrics && currentCard.metrics.length > 0 ? `
              <!-- Micro-Banda de Métricas Clave de la Ley (Fácil Comprensión y Cero Vacío) -->
              <div class="card-metrics-strip" role="group" aria-label="Métricas del Decreto">
                ${currentCard.metrics.map(m => `
                  <div class="metric-chip">
                    <span class="metric-chip-label">${m.label}</span>
                    <span class="metric-chip-val">${m.value}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <!-- Píldoras de Consulta Rápida con Iconografía Vectorial Monocromática (0 Emojis) -->
            <div class="card-actions-quick">
              <button class="btn-action-pill btn-monograph-pill" id="btn-open-monograph" title="Datos oficiales, gráficos y contexto (2 min)">
                <svg class="pill-svg-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M4 16v-4M8 16V8M12 16v-6M16 16V4" />
                </svg>
                <span>Datos Clave</span>
              </button>
              <button class="btn-action-pill btn-dilemma-pill" id="btn-open-dilemma" title="Voces reales ciudadanas enfrentadas">
                <svg class="pill-svg-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M13 17v-1.5a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3V17" />
                  <circle cx="8" cy="6.5" r="2.5" />
                  <path d="M17 17v-1.5a3 3 0 0 0-2-2.83M12.5 4a2.5 2.5 0 0 1 0 5" />
                </svg>
                <span>2 Visiones</span>
              </button>
              <button class="btn-action-pill btn-boe-pill" id="btn-open-boe" title="Texto literal aprobado en el BOE">
                <svg class="pill-svg-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
                  <path d="M8 6h4M8 10h4M8 14h2" />
                </svg>
                <span>Ley BOE</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- BOTONES DE VOTACIÓN ERGONÓMICOS (AL ALCANCE DEL PULGAR) -->
      <div class="deck-controls-magnetic arcade-controls-grid">
        <!-- 1. Botón A Favor (IZQUIERDA) -->
        <button 
          class="arcade-push-btn btn-arcade-yes" 
          id="btn-swipe-yes" 
          title="Votar A Favor"
          aria-label="Votar A Favor"
        >
          <span class="arcade-btn-icon">✓</span>
          <span class="arcade-btn-name">A Favor</span>
          <span class="arcade-btn-sub">Aprobar</span>
        </button>

        <!-- 2. Botón NS / NC (CENTRO) -->
        <button 
          class="arcade-push-btn btn-arcade-delegate" 
          id="btn-swipe-delegate" 
          title="Delegar en expertos o abstenerse"
          aria-label="No sabe / No contesta o delegar"
        >
          <span class="arcade-btn-icon">?</span>
          <span class="arcade-btn-name">NS / NC</span>
          <span class="arcade-btn-sub">Duda / Delegar</span>
        </button>

        <!-- 3. Botón En Contra (DERECHA) -->
        <button 
          class="arcade-push-btn btn-arcade-no" 
          id="btn-swipe-no" 
          title="Votar En Contra"
          aria-label="Votar En Contra"
        >
          <span class="arcade-btn-icon">✕</span>
          <span class="arcade-btn-name">En Contra</span>
          <span class="arcade-btn-sub">Rechazar</span>
        </button>
      </div>
    </div>
  `;

  // Botones de votación interactivos siempre activos
  container.querySelector('#btn-swipe-yes')?.addEventListener('click', () => {
    initiateVoteFlow('YES');
  });
  container.querySelector('#btn-swipe-delegate')?.addEventListener('click', () => {
    initiateVoteFlow('DELEGATE');
  });
  container.querySelector('#btn-swipe-no')?.addEventListener('click', () => {
    initiateVoteFlow('NO');
  });

  // Modales de divulgación progresiva con sonido de apertura
  container.querySelector('#btn-open-monograph')?.addEventListener('click', () => {
    soundFx.playTap();
    gameStore.openMonographModal(currentCard);
  });
  container.querySelector('#btn-open-dilemma')?.addEventListener('click', () => {
    soundFx.playTap();
    gameStore.openDilemmaModal(currentCard);
  });
  container.querySelector('#btn-open-boe')?.addEventListener('click', () => {
    soundFx.playTap();
    gameStore.openBoeModal(currentCard);
  });

  // NOTA: Se ha eliminado la función de arrastrar/deslizar (swipe) la carta para votar
  // con el fin de evitar votos accidentales al tocar la pantalla.
  // La votación es 100% deliberada y se efectúa exclusivamente mediante los botones dedicados.

  // Limpieza de cualquier listener previo de atajos de teclado
  window.removeEventListener('keydown', (window as any)._cardKeyHandler);
  (window as any)._cardKeyHandler = null;

  /**
   * FLUJO JUST-IN-TIME WEBAUTHN PASSKEYS
   */
  async function initiateVoteFlow(decision: GameDecision) {
    if (!currentCard) return;

    // Si el usuario ha activado el Modo Prueba Rápido (sin biometría), sellar voto directamente
    if (isTestBypassEnabled()) {
      const testCred = createOrGetSimulatedTestCredential();
      triggerFlyOff(decision, testCred);
      return;
    }

    try {
      // 1. Solicitar autenticación biométrica Just-in-Time
      const authRes = await promptJustInTimePasskey({
        proposalTitle: currentCard.headlineQuestion,
        articleId: currentCard.articleId,
        decisionLabel: decision === 'YES' ? 'A Favor' : decision === 'NO' ? 'En Contra' : 'NS / NC',
        decisionChoice: decision
      });

      if (authRes.success) {
        triggerFlyOff(decision, authRes.credential);
      }
    } catch (err: any) {
      // Si el usuario cancela la biometría, restablecer estado visual de la carta
      const card = container.querySelector('#active-card') as HTMLElement;
      if (card) {
        card.classList.remove('decision-committing');
        card.style.transition = 'transform 0.28s ease, opacity 0.28s ease';
        card.style.transform = 'translate3d(0, 0, 0)';
        card.style.opacity = '1';
      }
    }
  }

  function triggerFlyOff(decision: GameDecision, credential?: CitizenPasskeyCredential) {
    const card = container.querySelector('#active-card') as HTMLElement;
    const depthCard = container.querySelector('.game-card.card-depth') as HTMLElement;

    if (!card) {
      gameStore.playDecision(decision, credential);
      return;
    }

    if (decision === 'YES') {
      soundFx.playVoteYes();
    } else if (decision === 'NO') {
      soundFx.playVoteNo();
    } else {
      soundFx.playTap();
    }

    // Salida direccional acelerada por GPU
    card.classList.add('decision-committing');
    card.style.transition = 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease-out';

    if (decision === 'YES') {
      card.style.transform = 'translate3d(-125vw, 20px, 0) rotate(-16deg)';
      card.style.opacity = '0';
    } else if (decision === 'NO') {
      card.style.transform = 'translate3d(125vw, 20px, 0) rotate(16deg)';
      card.style.opacity = '0';
    } else {
      card.style.transform = 'translate3d(0, -90vh, 0) scale(0.92)';
      card.style.opacity = '0';
    }

    // Promoción suave de la carta en segundo plano (profundidad 3D)
    if (depthCard) {
      depthCard.style.transition = 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease';
      depthCard.style.transform = 'scale(1) translateY(0)';
      depthCard.style.opacity = '1';
    }

    setTimeout(async () => {
      await gameStore.playDecision(decision, credential);
    }, 240);
  }
}
