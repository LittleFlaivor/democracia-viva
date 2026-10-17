/**
 * PUNTO DE ENTRADA PRINCIPAL: DEMOCRACIA VIVA V2 (GAMIFIED REIGNS STYLE)
 * Orquesta el Dock de Perfiles, los Barómetros HUD en tiempo real,
 * el Mazo 3D interactivo, los dilemas en novela gráfica y el Puente de Consenso.
 */

import { CivicAppStore } from './state/store.ts';
import { GameStore } from './state/game-store.ts';
import { renderProfileDock, applyTheme, getInitialTheme } from './ui/gamified/profile-dock.ts';
import { renderHudBarometers } from './ui/gamified/hud-barometers.ts';
import { renderCardDeck } from './ui/gamified/card-deck.ts';
import { renderConsensusEureka } from './ui/gamified/consensus-eureka.ts';
import { renderDilemmaModal } from './ui/gamified/dilemma-modal.ts';
import { renderBoeModal } from './ui/gamified/boe-modal.ts';
import { renderMonographModal } from './ui/gamified/monograph-modal.ts';
import { renderVerificationModal } from './ui/components/verification-modal.ts';
import { renderParliamentaryReportModal } from './ui/components/parliamentary-report-modal.ts';

let activeReceiptNullifier: string | null = null;
let isParliamentaryReportOpen = false;

function initApp() {
  // Aplicar tema inicial (Light Editorial por defecto)
  applyTheme(getInitialTheme());

  const civicStore = CivicAppStore.getInstance();
  const gameStore = GameStore.getInstance();

  const dockContainer = document.getElementById('profile-dock-container');
  const hudContainer = document.getElementById('hud-barometers-container');
  const stageContainer = document.getElementById('game-stage-container');
  const modalContainer = document.getElementById('modal-root-container');

  if (!dockContainer || !hudContainer || !stageContainer || !modalContainer) {
    console.error('Contenedores no encontrados en el DOM');
    return;
  }

  function openReceiptModal(nullifierHash: string) {
    activeReceiptNullifier = nullifierHash;
    renderModals();
  }

  function closeReceiptModal() {
    activeReceiptNullifier = null;
    renderModals();
  }

  function openParliamentaryReport() {
    isParliamentaryReportOpen = true;
    renderModals();
  }

  function closeParliamentaryReport() {
    isParliamentaryReportOpen = false;
    renderModals();
  }

  function renderModals() {
    modalContainer!.innerHTML = '';

    const monographCard = gameStore.getActiveMonographCard();
    const dilemmaCard = gameStore.getActiveDilemmaCard();
    const boeCard = gameStore.getActiveBoeCard();

    if (monographCard) {
      const wrapper = document.createElement('div');
      modalContainer!.appendChild(wrapper);
      renderMonographModal(wrapper, monographCard);
    } else if (dilemmaCard) {
      const wrapper = document.createElement('div');
      modalContainer!.appendChild(wrapper);
      renderDilemmaModal(wrapper, dilemmaCard);
    } else if (boeCard) {
      const wrapper = document.createElement('div');
      modalContainer!.appendChild(wrapper);
      renderBoeModal(wrapper, boeCard);
    } else if (activeReceiptNullifier) {
      const wrapper = document.createElement('div');
      modalContainer!.appendChild(wrapper);
      renderVerificationModal(wrapper, activeReceiptNullifier, closeReceiptModal);
    } else if (isParliamentaryReportOpen) {
      const wrapper = document.createElement('div');
      modalContainer!.appendChild(wrapper);
      renderParliamentaryReportModal(wrapper, closeParliamentaryReport);
    }
  }

  function renderAll() {
    renderProfileDock(dockContainer!);
    renderHudBarometers(hudContainer!);

    if (gameStore.isFinished()) {
      renderConsensusEureka(stageContainer!, openParliamentaryReport, openReceiptModal);
    } else {
      renderCardDeck(stageContainer!);
    }

    renderModals();
  }

  function initAmbientMotion() {
    const mesh = document.getElementById('ambient-mesh');
    if (!mesh) return;

    const layer1 = document.getElementById('layer-1');
    const layer2 = document.getElementById('layer-2');
    const layer3 = document.getElementById('layer-3');
    const layer4 = document.getElementById('layer-4');
    const layer5 = document.getElementById('layer-5');
    const layerCursor = document.getElementById('layer-cursor');

    let targetNormX = 0;
    let targetNormY = 0;
    let currentNormX = 0;
    let currentNormY = 0;

    let targetCursorX = window.innerWidth / 2;
    let targetCursorY = window.innerHeight / 2;
    let currentCursorX = window.innerWidth / 2;
    let currentCursorY = window.innerHeight / 2;
    let cursorActive = false;

    window.addEventListener('pointermove', (e) => {
      targetNormX = (e.clientX / window.innerWidth - 0.5) * 2; // Rango [-1, 1]
      targetNormY = (e.clientY / window.innerHeight - 0.5) * 2;
      targetCursorX = e.clientX;
      targetCursorY = e.clientY;
      if (!cursorActive && layerCursor) {
        cursorActive = true;
        layerCursor.style.opacity = '1';
      }
    }, { passive: true });

    window.addEventListener('pointerleave', () => {
      targetNormX = 0;
      targetNormY = 0;
      if (layerCursor) layerCursor.style.opacity = '0';
      cursorActive = false;
    });

    // Delegación para intención cívica en hover (A Favor, En Contra, NS/NC)
    document.addEventListener('mouseover', (e) => {
      const target = (e.target as HTMLElement).closest('#btn-swipe-yes, #btn-swipe-no, #btn-swipe-delegate, [data-intent]');
      if (!target) return;
      mesh.classList.remove('intent-yes', 'intent-no', 'intent-delegate');
      if (target.id === 'btn-swipe-yes' || target.getAttribute('data-intent') === 'yes') {
        mesh.classList.add('intent-yes');
      } else if (target.id === 'btn-swipe-no' || target.getAttribute('data-intent') === 'no') {
        mesh.classList.add('intent-no');
      } else if (target.id === 'btn-swipe-delegate' || target.getAttribute('data-intent') === 'delegate') {
        mesh.classList.add('intent-delegate');
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = (e.target as HTMLElement).closest('#btn-swipe-yes, #btn-swipe-no, #btn-swipe-delegate, [data-intent]');
      if (target) {
        mesh.classList.remove('intent-yes', 'intent-no', 'intent-delegate');
      }
    });

    function tick() {
      // Suave interpolación lerp con amortiguación física (60fps GPU)
      currentNormX += (targetNormX - currentNormX) * 0.055;
      currentNormY += (targetNormY - currentNormY) * 0.055;

      currentCursorX += (targetCursorX - currentCursorX) * 0.14;
      currentCursorY += (targetCursorY - currentCursorY) * 0.14;

      if (layer1) layer1.style.transform = `translate3d(${(currentNormX * 55).toFixed(2)}px, ${(currentNormY * 55).toFixed(2)}px, 0)`;
      if (layer2) layer2.style.transform = `translate3d(${(currentNormX * -50).toFixed(2)}px, ${(currentNormY * -50).toFixed(2)}px, 0)`;
      if (layer3) layer3.style.transform = `translate3d(${(currentNormX * 42).toFixed(2)}px, ${(currentNormY * -42).toFixed(2)}px, 0)`;
      if (layer4) layer4.style.transform = `translate3d(${(currentNormX * -58).toFixed(2)}px, ${(currentNormY * 46).toFixed(2)}px, 0)`;
      if (layer5) layer5.style.transform = `translate3d(${(currentNormX * 72).toFixed(2)}px, ${(currentNormY * 72).toFixed(2)}px, 0)`;
      if (layerCursor && cursorActive) {
        layerCursor.style.transform = `translate3d(${currentCursorX.toFixed(1)}px, ${currentCursorY.toFixed(1)}px, 0)`;
      }

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // Inicializar movimiento ambiental orgánico
  initAmbientMotion();

  // Suscripción al estado cívico y al ciclo del juego
  civicStore.subscribe(() => renderAll());
  gameStore.subscribe(() => renderAll());

  // Render inicial
  renderAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
