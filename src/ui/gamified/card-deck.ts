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

        <!-- CARTA ACTIVA INTERACTIVA (DELIBERATIVA Y ACCESIBLE) -->
        <div class="game-card active-card arcade-glow-card ${isSealed ? 'card-sealed' : ''}" id="active-card" style="z-index: 20;">

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
              <!-- ESTADO DE INTERFAZ POST-VOTO COMPACTO -->
              <div class="sealed-compact-card">
                <div class="sealed-status-line">
                  <span class="sealed-badge-choice ${sealedRecord?.choice === 'YES' ? 'is-yes' : sealedRecord?.choice === 'NO' ? 'is-no' : 'is-delegate'}">
                    ${sealedRecord?.choice === 'YES' ? '✓ Voto: A FAVOR' : sealedRecord?.choice === 'NO' ? '✕ Voto: EN CONTRA' : '? Voto: NS / NC'}
                  </span>
                  <span class="sealed-hash-tag" title="Nullifier Hash: ${sealedRecord?.nullifierHash || ''}">
                    🔒 ${sealedRecord ? sealedRecord.nullifierHash.slice(0, 14) + '...' : 'En Urna'}
                  </span>
                </div>

                <div class="sealed-actions-row">
                  <button class="btn-sealed-download" id="btn-download-receipt" title="Descargar acta criptográfica verificable en JSON">
                    <span>📥 Recibo (.json)</span>
                  </button>
                  <button class="btn-sealed-advance" id="btn-advance-card" title="Avanzar al siguiente artículo del decreto">
                    <span>Continuar al siguiente artículo →</span>
                  </button>
                </div>
              </div>
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

          <!-- Orientación de Voto Deliberativo Consciente (sin arrastre) -->
          ${!isSealed ? `
            <div class="card-deliberation-footer">
              <span class="deliberation-hint-text">Emite tu postura pulsando un botón inferior</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- BOTONES DE VOTACIÓN CONSCIENTES Y ACCESIBLES -->
      <div class="deck-controls-magnetic arcade-controls-grid">
        <!-- 1. Botón A Favor (IZQUIERDA - Tecla A o ←) -->
        <button 
          class="arcade-push-btn btn-arcade-yes ${isSealed ? 'is-locked' : ''}" 
          id="btn-swipe-yes" 
          ${isSealed ? 'disabled title="🔒 Voto ya sellado e inmutable para este artículo"' : 'title="Votar A Favor [Tecla A o ←]"'}
        >
          <div class="arcade-key-badge"><kbd>A</kbd></div>
          <span class="arcade-btn-icon">${isSealed ? '🔒' : '✓'}</span>
          <span class="arcade-btn-name">A Favor</span>
        </button>

        <!-- 2. Botón NS / NC (CENTRO - Tecla W o ↑) -->
        <button 
          class="arcade-push-btn btn-arcade-delegate ${isSealed ? 'is-locked' : ''}" 
          id="btn-swipe-delegate" 
          ${isSealed ? 'disabled title="🔒 Voto ya sellado e inmutable para este artículo"' : 'title="No sabe / No contesta [Tecla W o ↑]"'}
        >
          <div class="arcade-key-badge"><kbd>W</kbd></div>
          <span class="arcade-btn-icon">${isSealed ? '🔒' : '?'}</span>
          <span class="arcade-btn-name">NS / NC</span>
        </button>

        <!-- 3. Botón En Contra (DERECHA - Tecla D o →) -->
        <button 
          class="arcade-push-btn btn-arcade-no ${isSealed ? 'is-locked' : ''}" 
          id="btn-swipe-no" 
          ${isSealed ? 'disabled title="🔒 Voto ya sellado e inmutable para este artículo"' : 'title="Votar En Contra [Tecla D o →]"'}
        >
          <div class="arcade-key-badge"><kbd>D</kbd></div>
          <span class="arcade-btn-icon">${isSealed ? '🔒' : '✕'}</span>
          <span class="arcade-btn-name">En Contra</span>
        </button>
      </div>

      <!-- Barra Inferior de Atajos Accesibles -->
      <div class="arcade-hints-bar">
        ${isSealed ? `
          <span class="arcade-hint-item" style="color: #10b981; font-weight: 700;">
            🔒 Voto Sellado e Inmutable (1 Ciudadano = 1 Voto)
          </span>
        ` : `
          <span class="arcade-hint-item">Atajos: <kbd>A</kbd> A Favor</span>
          <span class="arcade-hint-dot">·</span>
          <span class="arcade-hint-item"><kbd>W</kbd> NS/NC</span>
          <span class="arcade-hint-dot">·</span>
          <span class="arcade-hint-item"><kbd>D</kbd> En Contra</span>
          ${gameStore.getCardIndex() > 0 && !gameStore.getSealedVoteForCard(currentCard.id) ? `
            <span class="arcade-hint-dot">·</span>
            <span class="arcade-hint-item"><kbd>Z</kbd> Deshacer</span>
          ` : ''}
        `}
      </div>

      </div>
    </div>
  `;

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
    // Botones de votación con flujo Just-in-Time Passkey
    container.querySelector('#btn-swipe-yes')?.addEventListener('click', () => {
      initiateVoteFlow('YES');
    });
    container.querySelector('#btn-swipe-delegate')?.addEventListener('click', () => {
      initiateVoteFlow('DELEGATE');
    });
    container.querySelector('#btn-swipe-no')?.addEventListener('click', () => {
      initiateVoteFlow('NO');
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

    // Si la carta está sellada, no permitir votar ni deshacer
    if (isSealed) {
      if (key === 'enter' || key === 'arrowright' || key === 'd') {
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
