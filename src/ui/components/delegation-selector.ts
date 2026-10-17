/**
 * COMPONENTE: SELECTOR DE DELEGACIÓN DE CONFIANZA (DEMOCRACIA LÍQUIDA)
 * Muestra delegados técnicos y colectivos vecinales verificados,
 * su historial de votos transparente y botón de 1 toque para delegar o revocar.
 */

import { CivicAppStore } from '../../state/store.ts';
import { DECREE_VIVIENDA } from '../../domain/data/decree-vivienda.ts';

export function renderDelegationSelector(container: HTMLElement) {
  const store = CivicAppStore.getInstance();
  const activeCitizen = store.getActiveCitizen();
  const verifiedDelegates = store.getVerifiedDelegates();
  const activeDelegation = store.getActiveDelegationForActiveCitizen();

  container.innerHTML = `
    <div class="delegation-selector-wrapper">
      <div style="margin-bottom: 1.25rem;">
        <div style="font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: var(--accent-brass); margin-bottom: 0.35rem;">
          DEMOCRACIA LÍQUIDA · ÁMBITO VIVIENDA
        </div>
        <h3 style="margin-bottom: 0.5rem;">Delegación de Confianza</h3>
        <p class="text-small">
          Si no tienes tiempo de estudiar cada ley al detalle, puedes confiar tu voto en especialistas o colectivos cívicos. Podrás revocar o sobreescribir tu voto en cualquier momento.
        </p>
      </div>

      <div class="delegates-list">
        ${verifiedDelegates
          .map((delegate) => {
            const isCurrentlyDelegated = activeDelegation?.id === delegate.id;
            const isSelf = activeCitizen.id === delegate.id;

            return `
            <div class="delegate-card ${isCurrentlyDelegated ? 'active-delegation' : ''}">
              <div class="delegate-header">
                <div class="delegate-meta">
                  <div class="delegate-avatar">${delegate.avatar}</div>
                  <div>
                    <h4 style="color: var(--text-primary); font-size: 0.95rem;">${delegate.name}</h4>
                    <span style="font-size: 0.76rem; color: var(--text-muted);">${delegate.role}</span>
                  </div>
                </div>

                ${
                  isSelf
                    ? `<span class="badge-mono" style="font-size: 0.72rem;">Eres Tú</span>`
                    : isCurrentlyDelegated
                    ? `<button class="btn-delegate revoke" data-delegate-id="${delegate.id}" data-action="revoke">
                        ✕ Revocar Delegación
                       </button>`
                    : `<button class="btn-delegate" data-delegate-id="${delegate.id}" data-action="delegate">
                        → Delegar en ${delegate.name.split(' ')[0]}
                       </button>`
                }
              </div>

              <!-- Filosofía y Track Record -->
              <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0.75rem 0; line-height: 1.45;">
                "${delegate.delegateTrackRecord?.declaredPhilosophy}"
              </p>

              <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.75rem;">
                <span class="badge-mono" style="font-size: 0.72rem;">
                  👥 ${delegate.delegateTrackRecord?.totalDelegatedCitizens.toLocaleString('es-ES')} ciudadanos representados
                </span>
                <span class="badge-mono" style="font-size: 0.72rem;">
                  📜 ${delegate.delegateTrackRecord?.votesDeliberated} leyes deliberadas
                </span>
              </div>

              <!-- Sentido de Voto Transparente del Delegado -->
              <div style="background: rgba(0,0,0,0.25); border-radius: var(--radius-xs); padding: 0.65rem 0.85rem; border: 1px solid var(--border-subtle);">
                <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 0.4rem; font-weight: 700;">
                  Postura del Delegado en este Decreto:
                </div>
                <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                  ${DECREE_VIVIENDA.articles
                    .map((art) => {
                      // Buscar voto del delegado
                      const delVote = store.getActiveCitizenDirectVoteForArticle(art.id);
                      // Voto predeterminado del delegado registrado en el sistema
                      let tagColor = '#82838D';
                      let tagText = art.articleNumber + ': ?';

                      if (delegate.id === 'dra-elena-miro') {
                        if (art.id === 'ART-01') { tagColor = '#79D1AB'; tagText = 'Art.1: SÍ'; }
                        if (art.id === 'ART-02') { tagColor = '#79D1AB'; tagText = 'Art.2: SÍ'; }
                        if (art.id === 'ART-03') { tagColor = '#79D1AB'; tagText = 'Art.3: SÍ'; }
                        if (art.id === 'ART-04') { tagColor = '#D4A373'; tagText = 'Art.4: ABS'; }
                      } else if (delegate.id === 'asoc-vivienda-digna') {
                        if (art.id === 'ART-01') { tagColor = '#79D1AB'; tagText = 'Art.1: SÍ'; }
                        if (art.id === 'ART-02') { tagColor = '#E8837D'; tagText = 'Art.2: NO'; }
                        if (art.id === 'ART-03') { tagColor = '#79D1AB'; tagText = 'Art.3: SÍ'; }
                        if (art.id === 'ART-04') { tagColor = '#79D1AB'; tagText = 'Art.4: SÍ'; }
                      }

                      return `<span style="font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; padding: 2px 6px; border-radius: 3px; background: rgba(255,255,255,0.05); color: ${tagColor}; border: 1px solid rgba(255,255,255,0.08); font-weight: 600;">
                        ${tagText}
                      </span>`;
                    })
                    .join('')}
                </div>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    </div>
  `;

  // Asignar manejadores de delegación y revocación
  container.querySelectorAll('.btn-delegate').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      const delegateId = btn.getAttribute('data-delegate-id');

      if (action === 'revoke') {
        store.setDelegation(null);
      } else if (delegateId) {
        const res = store.setDelegation(delegateId);
        if (!res.success && res.error) {
          alert(res.error);
        }
      }
    });
  });
}
