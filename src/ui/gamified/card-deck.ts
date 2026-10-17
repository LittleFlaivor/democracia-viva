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
          title="Votar A Favor [Tecla A o ←]"
          aria-label="Votar A Favor"
        >
          <div class="arcade-key-badge"><kbd>A</kbd></div>
          <span class="arcade-btn-icon">✓</span>
          <span class="arcade-btn-name">A Favor</span>
          <span class="arcade-btn-sub">Aprobar</span>
        </button>

        <!-- 2. Botón NS / NC (CENTRO) -->
        <button 
          class="arcade-push-btn btn-arcade-delegate" 
          id="btn-swipe-delegate" 
          title="Delegar en expertos o abstenerse [Tecla W o ↑]"
          aria-label="No sabe / No contesta o delegar"
        >
          <div class="arcade-key-badge"><kbd>W</kbd></div>
          <span class="arcade-btn-icon">?</span>
          <span class="arcade-btn-name">NS / NC</span>
          <span class="arcade-btn-sub">Duda / Delegar</span>
        </button>

        <!-- 3. Botón En Contra (DERECHA) -->
        <button 
          class="arcade-push-btn btn-arcade-no" 
          id="btn-swipe-no" 
          title="Votar En Contra [Tecla D o →]"
          aria-label="Votar En Contra"
        >
          <div class="arcade-key-badge"><kbd>D</kbd></div>
          <span class="arcade-btn-icon">✕</span>
          <span class="arcade-btn-name">En Contra</span>
          <span class="arcade-btn-sub">Rechazar</span>
        </button>
      </div>

      <!-- Barra Inferior de Atajos Accesibles -->
      <div class="arcade-hints-bar">
        <span class="arcade-hint-item">Atajos: <kbd>A</kbd> A Favor</span>
        <span class="arcade-hint-dot">·</span>
        <span class="arcade-hint-item"><kbd>W</kbd> NS/NC</span>
        <span class="arcade-hint-dot">·</span>
        <span class="arcade-hint-item"><kbd>D</kbd> En Contra</span>
        ${gameStore.getCardIndex() > 0 ? `
          <span class="arcade-hint-dot">·</span>
          <span class="arcade-hint-item"><kbd>Z</kbd> Deshacer</span>
        ` : ''}
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

  // Atajos de teclado para votación accesible (A = A Favor / Izquierda, W = NS/NC, D = En Contra / Derecha)
  const handleKeydown = (e: KeyboardEvent) => {
    if (
      gameStore.getActiveMonographCard() ||
      gameStore.getActiveDilemmaCard() ||
      gameStore.getActiveBoeCard() ||
      gameStore.isFinished()
    ) {
      return;
    }
    const key = e.key.toLowerCase();

    if (key === 'z' || key === 'backspace') {
      if (gameStore.getCardIndex() > 0) {
        const undone = gameStore.undoDecision();
        if (undone) soundFx.playUndo();
      }
      return;
    }

    if (key === 'arrowleft' || key === 'a') {
      initiateVoteFlow('YES');
    } else if (key === 'arrowup' || key === 'w') {
      initiateVoteFlow('DELEGATE');
    } else if (key === 'arrowright' || key === 'd') {
      initiateVoteFlow('NO');
    }
  };

  window.removeEventListener('keydown', (window as any)._cardKeyHandler);
  (window as any)._cardKeyHandler = handleKeydown;
  window.addEventListener('keydown', handleKeydown);

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
      // Si el usuario cancela la biometría, devolver carta al centro suavemente
      const cardEl = container.querySelector('#active-card') as HTMLElement;
      if (cardEl) {
        cardEl.style.transition = 'transform 0.38s cubic-bezier(0.16, 1, 0.3, 1)';
        cardEl.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
      }
    }
  }

  function triggerFlyOff(decision: GameDecision, credential?: CitizenPasskeyCredential) {
    const cardEl = container.querySelector('#active-card') as HTMLElement;
    if (!cardEl) {
      gameStore.playDecision(decision, credential);
      return;
    }

    // Animación sobria de confirmación cívica (sin deslizamiento de casino/dating)
    cardEl.classList.add('decision-committing');
    cardEl.style.transition = 'all 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
    cardEl.style.opacity = '0.75';
    cardEl.style.transform = 'scale(0.98)';

    setTimeout(async () => {
      await gameStore.playDecision(decision, credential);
    }, 220);
  }
}
