/**
 * COMPONENTE: MODAL DE IDENTIDAD CÍVICA Y GESTIÓN DE PASSKEY
 * Explica al ciudadano cómo funciona el acceso biométrico soberano,
 * muestra si ya tiene una Passkey vinculada y le permite autenticarse previamente
 * o conocer por qué no es obligatorio iniciar sesión antes de deliberar.
 */

import {
  getLocalCitizenCredential,
  registerPasskey,
  requestBiometricAssertion,
  CitizenPasskeyCredential,
  clearLocalCitizenCredential
} from '../../services/auth.ts';
import { soundFx } from '../gamified/sound-fx.ts';

export function renderIdentityModal(container: HTMLElement, onClose: () => void, onUpdated?: () => void): void {
  const currentCred = getLocalCitizenCredential();

  container.innerHTML = `
    <div class="modal-overlay" id="identity-modal-overlay">
      <div class="modal-sheet" style="max-width: 580px;">
        <button class="modal-close-btn" id="btn-close-identity" aria-label="Cerrar modal">&times;</button>

        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="width: 58px; height: 58px; border-radius: 50%; background: rgba(37, 99, 235, 0.1); color: #2563eb; display: inline-flex; align-items: center; justify-content: center; font-size: 1.75rem; margin-bottom: 0.75rem;">
            ${currentCred ? '🛡️' : '🔑'}
          </div>
          <h2 class="font-display" style="font-size: 1.45rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.35rem;">
            ${currentCred ? 'Tu Identidad Cívica Soberana' : 'Acceso Ciudadano con Passkey'}
          </h2>
          <span style="font-size: 0.85rem; color: var(--text-secondary);">
            Estándar W3C WebAuthn · Cero contraseñas · Privacidad Criptográfica
          </span>
        </div>

        <!-- Explicación Didáctica -->
        <div style="background: var(--bg-app-alt); border: 1px solid var(--border-card); border-radius: 16px; padding: 1.15rem 1.35rem; margin-bottom: 1.5rem;">
          <h4 style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>ℹ️</span> ¿Es necesario iniciar sesión antes de votar?
          </h4>
          <p style="font-size: 0.84rem; line-height: 1.5; color: var(--text-secondary); margin: 0;">
            <strong>No es necesario.</strong> Democracia Viva opera bajo el principio de <em>fricción cero</em>: puedes explorar y deliberar libremente. En el momento en que pulses <em>A Favor</em>, <em>En Contra</em> o <em>NS/NC</em>, tu navegador solicitará tu huella, rostro o PIN para sellar tu voto de manera única e inmutable.
          </p>
        </div>

        ${currentCred ? `
          <!-- Estado: Passkey Ya Vinculada -->
          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 16px; padding: 1.15rem 1.35rem; margin-bottom: 1.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.65rem;">
              <span style="width: 9px; height: 9px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
              <strong style="font-size: 0.88rem; color: #065f46;">Passkey Activa en este Dispositivo</strong>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.35rem; font-family: 'JetBrains Mono', monospace;">
              <div><strong>ID:</strong> ${currentCred.credentialId.slice(0, 22)}...</div>
              <div><strong>Dispositivo:</strong> ${currentCred.deviceType || 'Autenticador de Plataforma'}</div>
              <div><strong>Fecha de Alta:</strong> ${new Date(currentCred.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; justify-content: flex-end; flex-wrap: wrap;">
            <button 
              type="button" 
              id="btn-test-passkey" 
              class="btn-action-pill" 
              style="background: var(--bg-surface); border: 1px solid var(--border-medium); font-size: 0.82rem; font-weight: 700;"
            >
              <span>Probar Verificación Biométrica</span>
            </button>
            <button 
              type="button" 
              id="btn-unlink-passkey" 
              class="btn-action-pill" 
              style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); color: #dc2626; font-size: 0.82rem; font-weight: 700;"
            >
              <span>Desvincular Dispositivo</span>
            </button>
          </div>
        ` : `
          <!-- Estado: Sin Passkey aún vinculada -->
          <div style="text-align: center; padding: 0.5rem 0 1rem;">
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
              Si lo prefieres, puedes vincular tu huella o reconocimiento facial ahora mismo para dejar tu entorno listo:
            </p>
            <button 
              type="button" 
              id="btn-create-passkey-now" 
              style="display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 700; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);"
            >
              <span>👆 Vincular mi Passkey Biométrica Ahora</span>
            </button>
          </div>
        `}

        <div id="identity-feedback-msg" style="margin-top: 1rem; text-align: center; font-size: 0.82rem; min-height: 20px;"></div>
      </div>
    </div>
  `;

  const overlay = container.querySelector('#identity-modal-overlay');
  const closeBtn = container.querySelector('#btn-close-identity');
  const feedbackEl = container.querySelector('#identity-feedback-msg') as HTMLElement;

  closeBtn?.addEventListener('click', () => {
    soundFx.playTap();
    onClose();
  });

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) {
      soundFx.playTap();
      onClose();
    }
  });

  // Listener: Crear passkey ahora
  container.querySelector('#btn-create-passkey-now')?.addEventListener('click', async () => {
    soundFx.playTap();
    if (feedbackEl) feedbackEl.innerHTML = '<span style="color: #2563eb;">Solicitando biometría al dispositivo...</span>';
    try {
      const cred = await registerPasskey('Ciudadano');
      if (feedbackEl) feedbackEl.innerHTML = '<span style="color: #10b981; font-weight: 700;">✓ Passkey vinculada con éxito</span>';
      setTimeout(() => {
        onUpdated?.();
        renderIdentityModal(container, onClose, onUpdated);
      }, 700);
    } catch (err: any) {
      if (feedbackEl) feedbackEl.innerHTML = `<span style="color: #dc2626;">Error: ${err.message || 'Proceso cancelado'}</span>`;
    }
  });

  // Listener: Probar verificación
  container.querySelector('#btn-test-passkey')?.addEventListener('click', async () => {
    soundFx.playTap();
    if (feedbackEl) feedbackEl.innerHTML = '<span style="color: #2563eb;">Pon tu huella o usa FaceID/Hello...</span>';
    try {
      await requestBiometricAssertion();
      if (feedbackEl) feedbackEl.innerHTML = '<span style="color: #10b981; font-weight: 700;">✓ Verificación biométrica correcta</span>';
    } catch (err: any) {
      if (feedbackEl) feedbackEl.innerHTML = `<span style="color: #dc2626;">Error: ${err.message || 'Verificación cancelada'}</span>`;
    }
  });

  // Listener: Desvincular
  container.querySelector('#btn-unlink-passkey')?.addEventListener('click', () => {
    soundFx.playTap();
    clearLocalCitizenCredential();
    if (feedbackEl) feedbackEl.innerHTML = '<span style="color: #64748b;">Dispositivo desvinculado.</span>';
    setTimeout(() => {
      onUpdated?.();
      renderIdentityModal(container, onClose, onUpdated);
    }, 500);
  });
}
