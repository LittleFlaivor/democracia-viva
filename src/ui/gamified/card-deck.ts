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

          <!-- Badge Overlay de Intención Táctil Flotante -->
          <div class="card-swipe-badge-overlay" id="swipe-badge-overlay" aria-hidden="true"></div>

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

  // GESTIÓN TÁCTIL Y DE ARRASTRE DIRECTO (SWIPE FLUIDO DE LA CARTA)
  const cardEl = container.querySelector('#active-card') as HTMLElement;
  const overlayBadge = container.querySelector('#swipe-badge-overlay') as HTMLElement;

  if (cardEl) {
    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let deltaY = 0;
    let isDragging = false;
    let isCommitting = false;

    const onPointerDown = (e: PointerEvent) => {
      if (isCommitting) return;
      const target = e.target as HTMLElement;
      // No iniciar arrastre si se interactúa con botones de acción rápida
      if (target.closest('button, a, input, select, textarea, .btn-action-pill')) {
        return;
      }
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      deltaX = 0;
      deltaY = 0;

      try {
        cardEl.setPointerCapture(e.pointerId);
      } catch (_) {}

      cardEl.classList.add('is-dragging');
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || isCommitting) return;

      deltaX = e.clientX - startX;
      deltaY = e.clientY - startY;

      // Amortiguación vertical para priorizar intención deliberada horizontal
      const dampedY = deltaY * 0.45;
      const rotation = deltaX * 0.05;

      cardEl.style.transform = `translate3d(${deltaX}px, ${dampedY}px, 0) rotate(${rotation}deg)`;

      // Feedback visual reactivo de alta fidelidad
      const thresholdX = 35;
      const thresholdY = -35;

      if (deltaX < -thresholdX) {
        // Hacia la izquierda -> A Favor (Verde)
        cardEl.classList.add('intent-glow-yes');
        cardEl.classList.remove('intent-glow-no', 'intent-glow-delegate');
        if (overlayBadge) {
          overlayBadge.innerHTML = `<span class="swipe-pill swipe-pill-yes">✓ A Favor</span>`;
          overlayBadge.style.opacity = `${Math.min(1, Math.max(0, (Math.abs(deltaX) - 20) / 60))}`;
        }
      } else if (deltaX > thresholdX) {
        // Hacia la derecha -> En Contra (Rojo)
        cardEl.classList.add('intent-glow-no');
        cardEl.classList.remove('intent-glow-yes', 'intent-glow-delegate');
        if (overlayBadge) {
          overlayBadge.innerHTML = `<span class="swipe-pill swipe-pill-no">✕ En Contra</span>`;
          overlayBadge.style.opacity = `${Math.min(1, Math.max(0, (Math.abs(deltaX) - 20) / 60))}`;
        }
      } else if (deltaY < thresholdY && Math.abs(deltaX) < 35) {
        // Hacia arriba -> NS / NC (Ámbar)
        cardEl.classList.add('intent-glow-delegate');
        cardEl.classList.remove('intent-glow-yes', 'intent-glow-no');
        if (overlayBadge) {
          overlayBadge.innerHTML = `<span class="swipe-pill swipe-pill-delegate">? NS / NC</span>`;
          overlayBadge.style.opacity = `${Math.min(1, Math.max(0, (Math.abs(deltaY) - 20) / 60))}`;
        }
      } else {
        cardEl.classList.remove('intent-glow-yes', 'intent-glow-no', 'intent-glow-delegate');
        if (overlayBadge) {
          overlayBadge.style.opacity = '0';
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      cardEl.classList.remove('is-dragging');

      try {
        cardEl.releasePointerCapture(e.pointerId);
      } catch (_) {}

      const commitThresholdX = 65;
      const commitThresholdY = -60;

      if (deltaX < -commitThresholdX) {
        isCommitting = true;
        initiateVoteFlow('YES');
      } else if (deltaX > commitThresholdX) {
        isCommitting = true;
        initiateVoteFlow('NO');
      } else if (deltaY < commitThresholdY && Math.abs(deltaX) < 55) {
        isCommitting = true;
        initiateVoteFlow('DELEGATE');
      } else {
        // Snap-back elástico con física de muelle
        cardEl.style.transition = 'transform 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.25), box-shadow 0.28s ease, border-color 0.28s ease';
        cardEl.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
        cardEl.classList.remove('intent-glow-yes', 'intent-glow-no', 'intent-glow-delegate');
        if (overlayBadge) {
          overlayBadge.style.opacity = '0';
        }
        setTimeout(() => {
          if (!isDragging && !isCommitting && cardEl) {
            cardEl.style.transition = '';
          }
        }, 390);
      }
    };

    cardEl.addEventListener('pointerdown', onPointerDown);
    cardEl.addEventListener('pointermove', onPointerMove);
    cardEl.addEventListener('pointerup', onPointerUp);
    cardEl.addEventListener('pointercancel', onPointerUp);
  }

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
      const card = container.querySelector('#active-card') as HTMLElement;
      const overlay = container.querySelector('#swipe-badge-overlay') as HTMLElement;
      if (card) {
        card.classList.remove('decision-committing', 'intent-glow-yes', 'intent-glow-no', 'intent-glow-delegate');
        card.style.transition = 'transform 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.25)';
        card.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
        card.style.opacity = '1';
        if (overlay) overlay.style.opacity = '0';
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
