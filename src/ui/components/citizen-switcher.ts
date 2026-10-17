/**
 * COMPONENTE: SIMULADOR DE CIUDADANO (BARRA SUPERIOR PERSISTENTE)
 * Permite alternar en 1 clic entre perfiles preconfigurados y comprobar
 * en vivo el impacto del voto directo, la delegación y el bloqueo por doble voto.
 */

import { CivicAppStore } from '../../state/store.ts';

export function renderCitizenSwitcher(container: HTMLElement) {
  const store = CivicAppStore.getInstance();
  const activeCitizen = store.getActiveCitizen();
  const allCitizens = store.getAllCitizens();
  const activeDelegation = store.getActiveDelegationForActiveCitizen();

  container.innerHTML = `
    <div class="simulator-topbar">
      <div class="simulator-topbar-inner">
        <div style="display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: var(--accent-brass);">
              SIMULADOR CÍVICO
            </span>
            <span style="color: var(--text-muted); font-size: 0.75rem;">|</span>
            <span style="font-size: 0.75rem; color: var(--text-secondary);">Elige tu perfil activo:</span>
          </div>

          <div class="simulator-pills-row" style="display: flex; align-items: center; gap: 0.45rem; overflow-x: auto; max-width: 100%; -webkit-overflow-scrolling: touch; padding-bottom: 2px;">
            ${allCitizens
              .map(
                (c) => `
              <button 
                class="simulator-profile-pill ${c.id === activeCitizen.id ? 'active' : ''}" 
                data-citizen-id="${c.id}"
                title="${c.name} (${c.role}) - ${c.bio}"
              >
                <span class="pill-avatar">${c.avatar}</span>
                <span>${c.name}</span>
                ${c.isDelegate ? `<span style="font-size: 0.65rem; background: rgba(212,163,115,0.25); padding: 1px 5px; border-radius: 3px; color: var(--accent-brass-light);">DELEGADO</span>` : ''}
              </button>
            `
              )
              .join('')}
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap;">
          <div class="simulator-active-status">
            <span style="color: var(--text-muted); font-size: 0.78rem;">Delegación activa:</span>
            ${
              activeDelegation
                ? `<span class="delegation-status-tag active">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: #4A9D7C;"></span>
                    ${activeDelegation.name}
                   </span>`
                : `<span class="delegation-status-tag direct">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--accent-brass);"></span>
                    Voto Propio (Sin Delegar)
                   </span>`
            }
          </div>

          <button class="btn-reset-sim" id="btn-reset-simulation" title="Restablecer delegaciones y votos a los valores de fábrica">
            ↺ Reiniciar Simulación
          </button>
        </div>
      </div>
    </div>
  `;

  // Asignar manejadores de eventos
  container.querySelectorAll('.simulator-profile-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      const citizenId = btn.getAttribute('data-citizen-id');
      if (citizenId) {
        store.switchCitizen(citizenId);
      }
    });
  });

  const resetBtn = container.querySelector('#btn-reset-simulation');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('¿Deseas restablecer las delegaciones y votos simulados al estado inicial?')) {
        store.seedInitialEcosystem();
        window.location.reload();
      }
    });
  }
}
