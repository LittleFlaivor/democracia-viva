/**
 * COMPONENTE: MAZO DE CARTAS 3D INTERACTIVO (VIDEO-GAME ARCADE STYLE)
 * Mismas dimensiones fijas (500px), física de arrastre táctil / ratón,
 * botones físicos arcade beveled, atajos de teclado [A] [W] [D] y efectos sonoros nativos.
 */

import { GameStore, GameDecision } from '../../state/game-store.ts';
import { soundFx } from './sound-fx.ts';

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

        <!-- CARTA ACTIVA INTERACTIVA (DRAGGABLE CON BISEL VIDEOJUEGO) -->
        <div class="game-card active-card arcade-glow-card" id="active-card" style="z-index: 20;">
          <!-- Sellos de Decisión Neón con Opacidad Reactiva -->
          <div class="stamp-overlay stamp-yes" id="stamp-yes">
            <span class="stamp-border">✓ A FAVOR</span>
          </div>
          <div class="stamp-overlay stamp-no" id="stamp-no">
            <span class="stamp-border">✕ EN CONTRA</span>
          </div>
          <div class="stamp-overlay stamp-delegate" id="stamp-delegate">
            <span class="stamp-border">? NS / NC</span>
          </div>

          <!-- Contenido Superior de la Carta -->
          <div class="card-header">
            <span class="card-category">${currentCard.category}</span>
            <span class="badge-mono" style="font-size: 0.72rem;">${currentCard.articleId}</span>
          </div>

          <!-- Micro-Ilustración Vectorial Editorial -->
          <div class="card-illustration-box">
            ${currentCard.svgIllustration || ''}
          </div>

          <div class="card-body">
            <h2 class="card-question font-display">${currentCard.headlineQuestion}</h2>
            <p class="card-subtitle">${currentCard.subtitle}</p>
          </div>

          <!-- Capas de Profundidad Progresiva -->
          <div class="card-actions-quick">
            <button class="btn-action-pill btn-monograph-pill" id="btn-open-monograph" title="Monográfico riguroso con datos de ambas partes (2 min)">
              <span>📊 Monográfico (2 min)</span>
            </button>
            <button class="btn-action-pill btn-dilemma-pill" id="btn-open-dilemma" title="Ver dilema visual con avatares enfrentados">
              <span>⚡ El Dilema</span>
            </button>
            <button class="btn-action-pill btn-boe-pill" id="btn-open-boe" title="Ver artículo oficial del BOE">
              <span>📜 Texto BOE</span>
            </button>
          </div>

          <!-- Pistas Táctiles Inferiores -->
          <div class="card-swipe-hints">
            <span class="hint-red">← Desliza (En Contra)</span>
            <span class="hint-purple">↑ Arriba (NS / NC)</span>
            <span class="hint-green">Desliza (A Favor) →</span>
          </div>
        </div>
      </div>

      <!-- BOTONES ARCADE TÁCTILES 3D CON TECLAS DE CONTROL -->
      <div class="deck-controls-magnetic arcade-controls-grid">
        <!-- Botón En Contra (Tecla A / Izquierda) -->
        <button class="arcade-push-btn btn-arcade-no" id="btn-swipe-no" title="Votar En Contra [Tecla A o ←]">
          <div class="arcade-key-badge"><kbd>A</kbd></div>
          <span class="arcade-btn-icon">✕</span>
          <span class="arcade-btn-name">En Contra</span>
        </button>

        <!-- Botón NS / NC (Tecla W / Arriba) -->
        <button class="arcade-push-btn btn-arcade-delegate" id="btn-swipe-delegate" title="No sabe / No contesta [Tecla W o ↑]">
          <div class="arcade-key-badge"><kbd>W</kbd></div>
          <span class="arcade-btn-icon">?</span>
          <span class="arcade-btn-name">NS / NC</span>
        </button>

        <!-- Botón A Favor (Tecla D / Derecha) -->
        <button class="arcade-push-btn btn-arcade-yes" id="btn-swipe-yes" title="Votar A Favor [Tecla D o →]">
          <div class="arcade-key-badge"><kbd>D</kbd></div>
          <span class="arcade-btn-icon">✓</span>
          <span class="arcade-btn-name">A Favor</span>
        </button>
      </div>

      <!-- Barra Inferior de Atajos Gamer -->
      <div class="arcade-hints-bar">
        <span class="arcade-hint-item">Controles: <kbd>A</kbd> Rechazar</span>
        <span class="arcade-hint-dot">·</span>
        <span class="arcade-hint-item"><kbd>W</kbd> NS/NC</span>
        <span class="arcade-hint-dot">·</span>
        <span class="arcade-hint-item"><kbd>D</kbd> Aprobar</span>
        ${gameStore.getCardIndex() > 0 ? `
          <span class="arcade-hint-dot">·</span>
          <span class="arcade-hint-item"><kbd>Z</kbd> Deshacer</span>
        ` : ''}
      </div>
    </div>
  `;

  // Asignar comportamiento de arrastre táctil y cinemático
  setupCardDragPhysics(container);

  // Asignar botones arcade con efectos sonoros
  container.querySelector('#btn-swipe-no')?.addEventListener('click', () => {
    soundFx.playVoteNo();
    triggerFlyOff('NO');
  });
  container.querySelector('#btn-swipe-yes')?.addEventListener('click', () => {
    soundFx.playVoteYes();
    triggerFlyOff('YES');
  });
  container.querySelector('#btn-swipe-delegate')?.addEventListener('click', () => {
    soundFx.playVoteDelegate();
    triggerFlyOff('DELEGATE');
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

  // Escuchar teclado gamer: A / W / D, Flechas o Z / Backspace para Deshacer
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
        soundFx.playUndo();
        gameStore.undoDecision();
      }
      return;
    }
    if (key === 'arrowleft' || key === 'a') {
      soundFx.playVoteNo();
      triggerFlyOff('NO');
    } else if (key === 'arrowright' || key === 'd') {
      soundFx.playVoteYes();
      triggerFlyOff('YES');
    } else if (key === 'arrowup' || key === 'w') {
      soundFx.playVoteDelegate();
      triggerFlyOff('DELEGATE');
    }
  };

  window.removeEventListener('keydown', (window as any)._cardKeyHandler);
  (window as any)._cardKeyHandler = handleKeydown;
  window.addEventListener('keydown', handleKeydown);

  function triggerFlyOff(decision: GameDecision) {
    const cardEl = container.querySelector('#active-card') as HTMLElement;
    if (!cardEl) {
      gameStore.playDecision(decision);
      return;
    }

    cardEl.classList.add('fly-off');
    if (decision === 'YES') {
      cardEl.style.transform = 'translate3d(115vw, 20px, 0) rotate(26deg)';
    } else if (decision === 'NO') {
      cardEl.style.transform = 'translate3d(-115vw, 20px, 0) rotate(-26deg)';
    } else {
      cardEl.style.transform = 'translate3d(0, -115vh, 0) rotate(0deg)';
    }

    setTimeout(() => {
      gameStore.playDecision(decision);
    }, 320);
  }

  function setupCardDragPhysics(parent: HTMLElement) {
    const cardEl = parent.querySelector('#active-card') as HTMLElement;
    if (!cardEl) return;

    const stampYes = parent.querySelector('#stamp-yes') as HTMLElement;
    const stampNo = parent.querySelector('#stamp-no') as HTMLElement;
    const stampDelegate = parent.querySelector('#stamp-delegate') as HTMLElement;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;

    const onPointerDown = (e: PointerEvent) => {
      // Ignorar si se pulsó sobre un botón interior
      if ((e.target as HTMLElement).closest('button')) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      cardEl.classList.add('is-dragging');
      try { cardEl.setPointerCapture(e.pointerId); } catch {}
      soundFx.playSwipe();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      currentX = e.clientX;
      currentY = e.clientY;

      const diffX = currentX - startX;
      const diffY = currentY - startY;
      const rotateDeg = diffX * 0.08;

      cardEl.style.transform = `translate3d(${diffX}px, ${diffY}px, 0) rotate(${rotateDeg}deg)`;

      // Opacidad de sellos según desplazamiento
      const threshold = 75;
      if (diffX > 15) {
        stampYes.style.opacity = String(Math.min(1, (diffX - 15) / threshold));
        stampNo.style.opacity = '0';
        stampDelegate.style.opacity = '0';
      } else if (diffX < -15) {
        stampNo.style.opacity = String(Math.min(1, (-diffX - 15) / threshold));
        stampYes.style.opacity = '0';
        stampDelegate.style.opacity = '0';
      } else if (diffY < -20 && Math.abs(diffX) < 45) {
        stampDelegate.style.opacity = String(Math.min(1, (-diffY - 20) / threshold));
        stampYes.style.opacity = '0';
        stampNo.style.opacity = '0';
      } else {
        stampYes.style.opacity = '0';
        stampNo.style.opacity = '0';
        stampDelegate.style.opacity = '0';
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      cardEl.classList.remove('is-dragging');
      try { cardEl.releasePointerCapture(e.pointerId); } catch {}

      const diffX = currentX - startX;
      const diffY = currentY - startY;
      const swipeThreshold = 90;

      if (diffX > swipeThreshold) {
        soundFx.playVoteYes();
        triggerFlyOff('YES');
      } else if (diffX < -swipeThreshold) {
        soundFx.playVoteNo();
        triggerFlyOff('NO');
      } else if (diffY < -swipeThreshold && Math.abs(diffX) < 65) {
        soundFx.playVoteDelegate();
        triggerFlyOff('DELEGATE');
      } else {
        // Regresar a posición neutral con física elástica suave y amortiguada
        cardEl.style.transition = 'transform 0.38s cubic-bezier(0.16, 1, 0.3, 1)';
        cardEl.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
        stampYes.style.opacity = '0';
        stampNo.style.opacity = '0';
        stampDelegate.style.opacity = '0';
      }
    };

    cardEl.addEventListener('pointerdown', onPointerDown);
    cardEl.addEventListener('pointermove', onPointerMove);
    cardEl.addEventListener('pointerup', onPointerUp);
    cardEl.addEventListener('pointercancel', onPointerUp);
  }
}
