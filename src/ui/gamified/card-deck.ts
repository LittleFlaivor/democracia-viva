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
import { CitizenPasskeyCredential } from '../../services/auth.ts';

export function renderCardDeck(container: HTMLElement) {
  const gameStore = GameStore.getInstance();
  const currentCard = gameStore.getCurrentCard();
  const nextCards = gameStore.getNextCards();

  if (!currentCard) {
    container.innerHTML = '';
    return;
  }

  const isSealed = gameStore.isCardSealed(currentCard.id);
  const sealedRecord = isSealed ? gameStore.getSealedVoteForCard(currentCard.id) : null;

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

        <!-- CARTA ACTIVA INTERACTIVA (DRAGGABLE O SELLADA) -->
        <div class="game-card active-card arcade-glow-card ${isSealed ? 'card-sealed' : ''}" id="active-card" style="z-index: 20;">
          <!-- Sellos de Decisión Neón con Opacidad Reactiva (solo si no está sellada) -->
          ${!isSealed ? `
            <div class="stamp-overlay stamp-yes" id="stamp-yes">
              <span class="stamp-border">✓ A FAVOR</span>
            </div>
            <div class="stamp-overlay stamp-no" id="stamp-no">
              <span class="stamp-border">✕ EN CONTRA</span>
            </div>
            <div class="stamp-overlay stamp-delegate" id="stamp-delegate">
              <span class="stamp-border">? NS / NC</span>
            </div>
          ` : ''}

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

            ${isSealed ? `
              <!-- ESTADO DE INTERFAZ POST-VOTO: VOTO SELLADO E INMUTABLE -->
              <div class="sealed-banner">
                <span class="sealed-icon">🛡️</span>
                <div class="sealed-text-box">
                  <span class="sealed-title">Voto Sellado e Inmutable</span>
                  <span class="sealed-subtitle">Acción definitiva e irreversible registrada en Firestore</span>
                </div>
              </div>

              <!-- Recibo Criptográfico Desacoplado -->
              <div class="sealed-receipt-box">
                <div class="receipt-row">
                  <span class="receipt-label">Nullifier Hash:</span>
                  <span class="receipt-val">${sealedRecord ? sealedRecord.nullifierHash.slice(0, 16) + '...' : '0x7f4a...'}</span>
                </div>
                <div class="receipt-row">
                  <span class="receipt-label">Urna Cívica:</span>
                  <span class="receipt-val">Cloud Firestore (Append-Only)</span>
                </div>
                <div class="receipt-row">
                  <span class="receipt-label">Sentido de Voto:</span>
                  <span class="receipt-val" style="color: #059669; font-weight: 700;">
                    ${sealedRecord?.choice === 'YES' ? '✓ A FAVOR' : sealedRecord?.choice === 'NO' ? '✕ EN CONTRA' : '? NS / NC'}
                  </span>
                </div>
                <div class="receipt-row">
                  <span class="receipt-label">Fecha y Hora UTC:</span>
                  <span class="receipt-val">${sealedRecord ? new Date(sealedRecord.timestamp).toLocaleTimeString() : 'En urna'}</span>
                </div>
              </div>

              <!-- Botones de Acción Post-Voto -->
              <button class="btn-download-receipt" id="btn-download-receipt" title="Descargar acta criptográfica verificable en JSON">
                <span>📥 Descargar Recibo Criptográfico (.json)</span>
              </button>

              <button class="btn-action-pill" id="btn-advance-card" style="margin-top: 10px; width: 100%; justify-content: center; background: rgba(37, 99, 235, 0.08); border-color: rgba(37, 99, 235, 0.25); color: #2563eb; font-weight: 700;">
                <span>Continuar al siguiente artículo →</span>
              </button>
            ` : ''}
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

          <!-- Pistas Táctiles Inferiores (solo si no está sellada) -->
          ${!isSealed ? `
            <div class="card-swipe-hints">
              <span class="hint-red">← Desliza (En Contra)</span>
              <span class="hint-purple">↑ Arriba (NS / NC)</span>
              <span class="hint-green">Desliza (A Favor) →</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- BOTONES ARCADE TÁCTILES 3D CON TECLAS DE CONTROL -->
      <div class="deck-controls-magnetic arcade-controls-grid">
        <!-- Botón En Contra (Tecla A / Izquierda) -->
        <button 
          class="arcade-push-btn btn-arcade-no ${isSealed ? 'is-locked' : ''}" 
          id="btn-swipe-no" 
          ${isSealed ? 'disabled title="🔒 Voto ya sellado e inmutable para este artículo"' : 'title="Votar En Contra [Tecla A o ←]"'}
        >
          <div class="arcade-key-badge"><kbd>A</kbd></div>
          <span class="arcade-btn-icon">${isSealed ? '🔒' : '✕'}</span>
          <span class="arcade-btn-name">En Contra</span>
        </button>

        <!-- Botón NS / NC (Tecla W / Arriba) -->
        <button 
          class="arcade-push-btn btn-arcade-delegate ${isSealed ? 'is-locked' : ''}" 
          id="btn-swipe-delegate" 
          ${isSealed ? 'disabled title="🔒 Voto ya sellado e inmutable para este artículo"' : 'title="No sabe / No contesta [Tecla W o ↑]"'}
        >
          <div class="arcade-key-badge"><kbd>W</kbd></div>
          <span class="arcade-btn-icon">${isSealed ? '🔒' : '?'}</span>
          <span class="arcade-btn-name">NS / NC</span>
        </button>

        <!-- Botón A Favor (Tecla D / Derecha) -->
        <button 
          class="arcade-push-btn btn-arcade-yes ${isSealed ? 'is-locked' : ''}" 
          id="btn-swipe-yes" 
          ${isSealed ? 'disabled title="🔒 Voto ya sellado e inmutable para este artículo"' : 'title="Votar A Favor [Tecla D o →]"'}
        >
          <div class="arcade-key-badge"><kbd>D</kbd></div>
          <span class="arcade-btn-icon">${isSealed ? '🔒' : '✓'}</span>
          <span class="arcade-btn-name">A Favor</span>
        </button>
      </div>

      <!-- Barra Inferior de Atajos Gamer -->
      <div class="arcade-hints-bar">
        ${isSealed ? `
          <span class="arcade-hint-item" style="color: #10b981; font-weight: 700;">
            🔒 Voto Sellado e Inmutable (1 Ciudadano = 1 Voto)
          </span>
        ` : `
          <span class="arcade-hint-item">Controles: <kbd>A</kbd> Rechazar</span>
          <span class="arcade-hint-dot">·</span>
          <span class="arcade-hint-item"><kbd>W</kbd> NS/NC</span>
          <span class="arcade-hint-dot">·</span>
          <span class="arcade-hint-item"><kbd>D</kbd> Aprobar</span>
          ${gameStore.getCardIndex() > 0 && !gameStore.getSealedVoteForCard(currentCard.id) ? `
            <span class="arcade-hint-dot">·</span>
            <span class="arcade-hint-item"><kbd>Z</kbd> Deshacer</span>
          ` : ''}
        `}
      </div>

      <!-- Atajo Cívico al Pie de Página y Versión Alpha -->
      <div class="deck-footer-anchor-wrapper">
        <button 
          type="button" 
          id="btn-deck-scroll-footer" 
          class="deck-footer-scroll-link"
          title="Ver pie de página, garantías constitucionales, versión y auditoría de código abierto"
        >
          <span class="anchor-badge">v0.5 Alpha</span>
          <span class="anchor-label">Democracia Viva · Información Institucional y Auditoría</span>
          <span class="anchor-arrow" aria-hidden="true">↓</span>
        </button>
      </div>
    </div>
  `;

  // Listener para scroll suave hacia el pie de página
  container.querySelector('#btn-deck-scroll-footer')?.addEventListener('click', (e) => {
    e.preventDefault();
    const footer = document.getElementById('civic-footer-container');
    if (footer) {
      footer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      footer.setAttribute('tabindex', '-1');
      footer.focus({ preventScroll: true });
    }
  });

  // Asignar listeners del estado sellado
  if (isSealed) {
    container.querySelector('#btn-download-receipt')?.addEventListener('click', () => {
      soundFx.playTap();
      if (sealedRecord) {
        triggerReceiptDownload(sealedRecord);
      }
    });

    container.querySelector('#btn-advance-card')?.addEventListener('click', () => {
      soundFx.playTap();
      gameStore.advanceCard();
    });
  } else {
    // Solo activar física de arrastre si no está sellada
    setupCardDragPhysics(container);

    // Botones arcade con flujo Just-in-Time Passkey
    container.querySelector('#btn-swipe-no')?.addEventListener('click', () => {
      initiateVoteFlow('NO');
    });
    container.querySelector('#btn-swipe-yes')?.addEventListener('click', () => {
      initiateVoteFlow('YES');
    });
    container.querySelector('#btn-swipe-delegate')?.addEventListener('click', () => {
      initiateVoteFlow('DELEGATE');
    });
  }

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

  // Atajos de teclado para votación
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

    // Si la carta está sellada, no permitir votar ni deshacer
    if (isSealed) {
      if (key === 'enter' || key === 'arrowright') {
        gameStore.advanceCard();
      }
      return;
    }

    if (key === 'z' || key === 'backspace') {
      if (gameStore.getCardIndex() > 0) {
        const undone = gameStore.undoDecision();
        if (undone) soundFx.playUndo();
      }
      return;
    }

    if (key === 'arrowleft' || key === 'a') {
      initiateVoteFlow('NO');
    } else if (key === 'arrowright' || key === 'd') {
      initiateVoteFlow('YES');
    } else if (key === 'arrowup' || key === 'w') {
      initiateVoteFlow('DELEGATE');
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

    cardEl.classList.add('fly-off');
    if (decision === 'YES') {
      cardEl.style.transform = 'translate3d(115vw, 20px, 0) rotate(26deg)';
    } else if (decision === 'NO') {
      cardEl.style.transform = 'translate3d(-115vw, 20px, 0) rotate(-26deg)';
    } else {
      cardEl.style.transform = 'translate3d(0, -115vh, 0) rotate(0deg)';
    }

    setTimeout(async () => {
      await gameStore.playDecision(decision, credential);
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

      const threshold = 75;
      if (diffX > 15 && stampYes) {
        stampYes.style.opacity = String(Math.min(1, (diffX - 15) / threshold));
        if (stampNo) stampNo.style.opacity = '0';
        if (stampDelegate) stampDelegate.style.opacity = '0';
      } else if (diffX < -15 && stampNo) {
        stampNo.style.opacity = String(Math.min(1, (-diffX - 15) / threshold));
        if (stampYes) stampYes.style.opacity = '0';
        if (stampDelegate) stampDelegate.style.opacity = '0';
      } else if (diffY < -20 && Math.abs(diffX) < 45 && stampDelegate) {
        stampDelegate.style.opacity = String(Math.min(1, (-diffY - 20) / threshold));
        if (stampYes) stampYes.style.opacity = '0';
        if (stampNo) stampNo.style.opacity = '0';
      } else {
        if (stampYes) stampYes.style.opacity = '0';
        if (stampNo) stampNo.style.opacity = '0';
        if (stampDelegate) stampDelegate.style.opacity = '0';
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
        initiateVoteFlow('YES');
      } else if (diffX < -swipeThreshold) {
        initiateVoteFlow('NO');
      } else if (diffY < -swipeThreshold && Math.abs(diffX) < 65) {
        initiateVoteFlow('DELEGATE');
      } else {
        cardEl.style.transition = 'transform 0.38s cubic-bezier(0.16, 1, 0.3, 1)';
        cardEl.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
        if (stampYes) stampYes.style.opacity = '0';
        if (stampNo) stampNo.style.opacity = '0';
        if (stampDelegate) stampDelegate.style.opacity = '0';
      }
    };

    cardEl.addEventListener('pointerdown', onPointerDown);
    cardEl.addEventListener('pointermove', onPointerMove);
    cardEl.addEventListener('pointerup', onPointerUp);
    cardEl.addEventListener('pointercancel', onPointerUp);
  }
}
