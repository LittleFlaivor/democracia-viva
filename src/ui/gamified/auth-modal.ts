/**
 * COMPONENTE: MODAL DE AUTENTICACIÓN BIOMÉTRICA JUST-IN-TIME (PASSKEYS / WEBAUTHN)
 * Permite al ciudadano firmar su voto con TouchID, FaceID, Windows Hello o PIN
 * sin fricción, contraseñas ni extensiones de billetera.
 */

import {
  getLocalCitizenCredential,
  registerPasskey,
  requestBiometricAssertion,
  CitizenPasskeyCredential,
  createOrGetSimulatedTestCredential,
  setTestBypassEnabled
} from '../../services/auth.ts';
import { soundFx } from './sound-fx.ts';

export interface AuthPromptOptions {
  proposalTitle: string;
  articleId: string;
  decisionLabel: string;
  decisionChoice: 'YES' | 'NO' | 'DELEGATE';
}

export function promptJustInTimePasskey(
  options: AuthPromptOptions
): Promise<{ success: boolean; credential: CitizenPasskeyCredential; isNew: boolean }> {
  return new Promise((resolve, reject) => {
    const existingCred = getLocalCitizenCredential();
    const isNew = !existingCred;

    // Crear contenedor del modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-backdrop passkey-modal-backdrop';
    modalOverlay.style.zIndex = '9999';

    const decisionBadgeClass =
      options.decisionChoice === 'YES'
        ? 'badge-vote-yes'
        : options.decisionChoice === 'NO'
        ? 'badge-vote-no'
        : 'badge-vote-delegate';

    const decisionText =
      options.decisionChoice === 'YES'
        ? '✓ A FAVOR'
        : options.decisionChoice === 'NO'
        ? '✕ EN CONTRA'
        : '? NS / NC';

    modalOverlay.innerHTML = `
      <div class="modal-card passkey-modal-card" style="max-width: 480px; text-align: center; border-radius: 24px; padding: 32px 28px; position: relative;">
        <!-- Botón cerrar -->
        <button class="modal-close-btn" id="btn-close-passkey" aria-label="Cerrar modal">&times;</button>

        <!-- Icono Escáner Biométrico con Efecto Pulse -->
        <div class="passkey-icon-halo">
          <div class="passkey-pulse-ring"></div>
          <svg class="passkey-svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 11c0 3.5-1.5 6-3 7.5"></path>
            <path d="M12 7c-2.5 0-4.5 2-4.5 4.5 0 2.5 1 5 2.5 7"></path>
            <path d="M16 11c0-2.2-1.8-4-4-4"></path>
            <path d="M15.5 18c.5-.8 1-1.8 1-3 0-1.8-1.2-3.3-3-3.8"></path>
            <path d="M8 11a4 4 0 0 1 8 0c0 1.2-.5 2.3-1.3 3.1"></path>
            <path d="M12 2a10 10 0 0 0-7 17.1"></path>
            <path d="M19 19.1A10 10 0 0 0 12 2"></path>
          </svg>
        </div>

        <h3 class="font-display" style="font-size: 1.45rem; margin: 16px 0 6px 0; color: var(--text-primary, #0f172a);">
          ${isNew ? 'Identificación Digital Segura' : 'Confirmar Voto con tu Dispositivo'}
        </h3>
        
        <p style="font-size: 0.88rem; color: var(--text-secondary, #64748b); margin-bottom: 18px; line-height: 1.45;">
          ${
            isNew
              ? 'Autoriza tu votación de forma sencilla con la huella, el rostro o el PIN de tu propio móvil u ordenador. No necesitas contraseñas ni correos.'
              : 'Confirma con tu huella, rostro o PIN para emitir tu voto. Esta única autorización servirá para los 3 artículos del decreto.'
          }
        </p>

        <!-- Resumen de la Acción a Firmar -->
        <div class="passkey-action-preview" style="background: rgba(15, 23, 42, 0.04); border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 16px; padding: 14px 16px; margin-bottom: 22px; text-align: left;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary, #94a3b8);">${options.articleId}</span>
            <span class="badge ${decisionBadgeClass}" style="font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 99px;">${decisionText}</span>
          </div>
          <div style="font-size: 0.92rem; font-weight: 600; color: var(--text-primary, #0f172a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${options.proposalTitle}
          </div>
        </div>

        <!-- Garantías de Privacidad y Seguridad -->
        <div class="passkey-guarantees" style="text-align: left; margin-bottom: 24px; font-size: 0.8rem; color: var(--text-secondary, #64748b); display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #10b981; font-size: 0.95rem;">✔</span>
            <span><strong>Privacidad Total:</strong> Tus datos biométricos nunca salen de tu propio teléfono o PC.</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #3b82f6; font-size: 0.95rem;">✔</span>
            <span><strong>1 Persona = 1 Voto:</strong> Tu papeleta se custodia de forma matemática y 100% anónima.</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #8b5cf6; font-size: 0.95rem;">✔</span>
            <span><strong>Voto Inalterable:</strong> Una vez emitido, el registro no puede ser manipulado ni borrado.</span>
          </div>
        </div>

        <!-- Estado de carga / feedback dinámico -->
        <div id="passkey-feedback" style="display: none; font-size: 0.85rem; font-weight: 600; margin-bottom: 16px; color: #3b82f6;">
          Iniciando sensor biométrico del sistema...
        </div>

        <!-- Botones de Acción -->
        <div style="display: flex; gap: 12px; margin-bottom: 14px;">
          <button class="btn btn-secondary" id="btn-cancel-passkey" style="flex: 1; border-radius: 12px; padding: 12px 16px; font-weight: 600;">
            Cancelar
          </button>
          <button class="btn btn-primary" id="btn-confirm-passkey" style="flex: 2; border-radius: 12px; padding: 12px 18px; font-weight: 600; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; border: none; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>${isNew ? '👆 Activar con Huella / Face ID' : '👆 Confirmar con Huella o PIN'}</span>
          </button>
        </div>

        <!-- Opción Especial de Fase Alpha: Saltar Verificación de Identidad -->
        <div style="border-top: 1px dashed rgba(148, 163, 184, 0.35); padding-top: 14px; text-align: center;">
          <button 
            type="button" 
            id="btn-skip-passkey" 
            class="btn-action-pill" 
            style="width: 100%; justify-content: center; background: rgba(245, 158, 11, 0.12); border-color: rgba(245, 158, 11, 0.35); color: #b45309; font-weight: 700; font-size: 0.82rem; padding: 9px 14px; cursor: pointer;"
            title="Omitir el paso biométrico y sellar el voto con credencial simulada de prueba"
          >
            <span>Continuar en Modo Prueba (Sin Biometría)</span>
          </button>
          <label style="display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 0.74rem; color: var(--text-tertiary); cursor: pointer; user-select: none;">
            <input type="checkbox" id="chk-remember-skip" checked />
            <span>Recordar: omitir biometría durante toda esta sesión de prueba</span>
          </label>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    // Animación de entrada
    requestAnimationFrame(() => {
      modalOverlay.classList.add('active');
    });

    const cleanup = () => {
      modalOverlay.classList.remove('active');
      setTimeout(() => {
        if (modalOverlay.parentNode) {
          modalOverlay.parentNode.removeChild(modalOverlay);
        }
      }, 250);
    };

    // Saltar verificación biométrica en modo prueba
    modalOverlay.querySelector('#btn-skip-passkey')?.addEventListener('click', () => {
      soundFx.playTap();
      const rememberCheckbox = modalOverlay.querySelector('#chk-remember-skip') as HTMLInputElement | null;
      const remember = rememberCheckbox ? rememberCheckbox.checked : true;
      if (remember) {
        setTestBypassEnabled(true);
      }
      const testCred = createOrGetSimulatedTestCredential();
      cleanup();
      resolve({ success: true, credential: testCred, isNew: false });
    });

    modalOverlay.querySelector('#btn-close-passkey')?.addEventListener('click', () => {
      soundFx.playTap();
      cleanup();
      reject(new Error('USER_CANCELLED_AUTH'));
    });

    modalOverlay.querySelector('#btn-cancel-passkey')?.addEventListener('click', () => {
      soundFx.playTap();
      cleanup();
      reject(new Error('USER_CANCELLED_AUTH'));
    });

    modalOverlay.querySelector('#btn-confirm-passkey')?.addEventListener('click', async () => {
      const confirmBtn = modalOverlay.querySelector('#btn-confirm-passkey') as HTMLButtonElement;
      const feedbackEl = modalOverlay.querySelector('#passkey-feedback') as HTMLElement;

      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.6';
      feedbackEl.style.display = 'block';
      feedbackEl.textContent = 'Coloca tu dedo en el sensor o mira a la cámara...';
      soundFx.playTap();

      try {
        let cred: CitizenPasskeyCredential;
        if (isNew) {
          cred = await registerPasskey('Ciudadano Soberano');
        } else {
          cred = existingCred;
          const payload = `${options.articleId}:${options.decisionChoice}:${Date.now()}`;
          await requestBiometricAssertion(cred.credentialId, payload);
        }

        feedbackEl.style.color = '#10b981';
        feedbackEl.textContent = '✓ Verificación biométrica exitosa. Sellando voto...';
        soundFx.playVoteYes();

        setTimeout(() => {
          cleanup();
          resolve({ success: true, credential: cred, isNew });
        }, 500);
      } catch (err: any) {
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
        feedbackEl.style.color = '#ef4444';
        feedbackEl.textContent = `Error en autenticación: ${err?.message || 'Biometría cancelada'}`;
      }
    });
  });
}
