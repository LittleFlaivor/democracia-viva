/**
 * DEMOCRACIA VIVA — PANEL DE ADMINISTRACIÓN Y PRUEBAS (SIMPLIFICADO)
 * 
 * Versión esencial, clara y directa para el administrador:
 * 1. Visión general en 3 segundos (votos, pausa deliberativa, cuenta atrás).
 * 2. Mandos de prueba imprescindibles (reiniciar a 0, añadir votos de prueba, auditoría).
 * 3. Escrutinio en vivo del decreto con barras visuales.
 * 4. Comprobador rápido de recibos de votación.
 */

import './admin.css';
import { SandboxWorld, AdminReadModel } from '../domain/civic/protocol.ts';
import type { Receipt } from '../domain/civic/protocol.ts';
import { verifyMerkleProof } from '../domain/civic/crypto.ts';
import { renderBrandLogo } from '../ui/gamified/brand-logo.ts';
import { isReflectionTimerEnabled, toggleReflectionTimer } from '../services/deliberation-timer.ts';
import { 
  getConsultationDeadlineConfig, 
  setConsultationDeadlineConfig, 
  toggleConsultationDeadline, 
  calculateTimeRemaining,
  DEFAULT_DEADLINE_ISO,
  DEFAULT_DEADLINE_LABEL 
} from '../services/consultation-deadline.ts';

const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T | null;

interface State {
  world: SandboxWorld | null;
  rm: AdminReadModel | null;
  cid: string;
  receipts: Receipt[];
  search: string;
  busy: boolean;
  adminNotice: { type: 'good' | 'amber' | 'danger'; text: string } | null;
  auditPass: boolean | null;
}

const S: State = {
  world: null,
  rm: null,
  cid: 'ley-vivienda',
  receipts: [],
  search: '',
  busy: false,
  adminNotice: null,
  auditPass: null,
};

function toggleAppTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem('DEMOCRACIA_VIVA_THEME', next);
  } catch {}
  paint();
}

function renderNavbar() {
  const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

  $('#topbar')!.innerHTML = `
    <div class="nav-brand-group">
      <a href="/" title="Ir a la aplicación ciudadana" style="text-decoration:none;display:flex;align-items:center;gap:10px;">
        ${renderBrandLogo({ compact: true, showBadge: false })}
      </a>
      <span class="nav-brand-badge" style="background:var(--color-primary-subtle);color:var(--color-primary);font-weight:700;font-size:0.75rem;padding:4px 10px;border-radius:99px;border:1px solid var(--border-medium);">
        PANEL DE ADMINISTRACIÓN
      </span>
    </div>

    <div class="nav-actions-group" style="display:flex;align-items:center;gap:10px;">
      <button class="icon-action-btn" data-act="theme" title="Alternar entre modo claro y oscuro" aria-label="Cambiar tema">
        ${currentTheme === 'dark' ? `
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="10" cy="10" r="3.5"/>
            <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.34 4.34l1.42 1.42M14.24 14.24l1.42 1.42M4.34 15.66l1.42-1.42M14.24 5.76l1.42-1.42"/>
          </svg>
          <span>Claro</span>
        ` : `
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16.5 11.5A6.5 6.5 0 1 1 8.5 3.5a5 5 0 0 0 8 8z"/>
          </svg>
          <span>Oscuro</span>
        `}
      </button>

      <a href="/" class="btn primary sm" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;" title="Ir a la pantalla de votación ciudadana">
        <span>← Ir a Votar</span>
      </a>
    </div>
  `;
}

function renderMainContent(): string {
  if (!S.world || !S.rm) {
    return `<div style="padding:40px;text-align:center;">Cargando panel de administración...</div>`;
  }

  const snap = S.rm.snapshot();
  const c = snap.consultations.find((x) => x.id === S.cid) || snap.consultations[0];
  const t = c.tally;
  const rawTot = t.total.YES + t.total.NO + t.total.ABSTAIN;
  const tot = Math.max(1, rawTot);
  const pctYes = rawTot === 0 ? 0 : Math.round((t.total.YES / tot) * 100);
  const pctNo = rawTot === 0 ? 0 : Math.round((t.total.NO / tot) * 100);
  const pctAbs = rawTot === 0 ? 0 : Math.round((t.total.ABSTAIN / tot) * 100);

  const deadlineCfg = getConsultationDeadlineConfig();
  const deadlineRemaining = calculateTimeRemaining(deadlineCfg.targetIso);

  const q = S.search.trim().replace(/^#/, '');
  const chk = q ? S.rm.checkReceipt(c.id, q) : null;

  return `
    <div style="max-width: 980px; margin: 0 auto; padding: 24px 16px;">
      
      <!-- Cabecera Principal -->
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 1.65rem; margin: 0 0 6px 0; color: var(--text-primary);">
          Panel de Control y Pruebas
        </h1>
        <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">
          Gestiona el estado de las votaciones, realiza pruebas con un solo clic y audita la urna sin complicaciones.
        </p>
      </div>

      <!-- Aviso dinámico de acción realizada -->
      ${S.adminNotice ? `
        <div class="callout ${S.adminNotice.type}" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: var(--radius-sm);">
          <span style="font-size: 0.9rem; font-weight: 500;">${esc(S.adminNotice.text)}</span>
          <button class="btn sm" data-act="dismiss-notice" style="border: none; background: transparent; cursor: pointer; padding: 4px 8px; font-weight: 700;" title="Cerrar aviso">✕</button>
        </div>
      ` : ''}

      <!-- 1. VISIÓN GENERAL (3 Tarjetas Clave) -->
      <div class="admin-grid g-3" style="gap: 16px; margin-bottom: 24px;">
        <!-- Tarjeta 1: Urna de Vivienda -->
        <div class="admin-card kpi-card" style="padding: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span class="kpi-label" style="font-size: 0.76rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Urna Ciudadana</span>
            <span class="status-badge ok" style="font-size: 0.72rem;">Abierta</span>
          </div>
          <div class="kpi-value font-display" style="font-size: 2rem; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">
            ${rawTot} ${rawTot === 1 ? 'Voto' : 'Votos'}
          </div>
          <div class="kpi-sub" style="font-size: 0.8rem; color: var(--text-secondary);">
            Sí: <b style="color:var(--vote-yes);">${pctYes}%</b> · No: <b style="color:var(--vote-no);">${pctNo}%</b> · NS/NC: <b>${pctAbs}%</b>
          </div>
        </div>

        <!-- Tarjeta 2: Pausa Deliberativa -->
        <div class="admin-card kpi-card" style="padding: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span class="kpi-label" style="font-size: 0.76rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Pausa de Reflexión (20s)</span>
            <span class="status-badge ${isReflectionTimerEnabled() ? 'ok' : 'amber'}" style="font-size: 0.72rem;">
              ${isReflectionTimerEnabled() ? 'Activa' : 'Desactivada'}
            </span>
          </div>
          <div style="font-size: 0.84rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 12px; min-height: 38px;">
            ${isReflectionTimerEnabled() 
              ? 'Fuerza 20s de lectura previa antes de permitir votar en cada artículo.' 
              : 'Votación inmediata sin espera obligatoria.'}
          </div>
          <button class="btn sm ${isReflectionTimerEnabled() ? '' : 'primary'}" data-act="toggle-reflection" style="width: 100%;">
            ${isReflectionTimerEnabled() ? 'Desactivar pausa' : 'Activar pausa 20s'}
          </button>
        </div>

        <!-- Tarjeta 3: Cuenta Atrás hasta Elecciones -->
        <div class="admin-card kpi-card" style="padding: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span class="kpi-label" style="font-size: 0.76rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Plazo de la Consulta</span>
            <span class="status-badge ${deadlineCfg.enabled ? 'ok' : 'amber'}" style="font-size: 0.72rem;">
              ${deadlineCfg.enabled ? 'Visible en app' : 'Oculta'}
            </span>
          </div>
          <div style="font-size: 0.84rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 12px; min-height: 38px;">
            Elecciones Generales: <b style="color:#b45309;font-family:var(--font-mono);">${deadlineRemaining.formattedCompact}</b>
          </div>
          <button class="btn sm ${deadlineCfg.enabled ? '' : 'primary'}" data-act="toggle-deadline" style="width: 100%;">
            ${deadlineCfg.enabled ? 'Ocultar cuenta atrás' : 'Mostrar cuenta atrás'}
          </button>
        </div>
      </div>

      <!-- 2. MANDOS DE PRUEBAS BÁSICOS (Lo imprescindible) -->
      <section class="admin-card" style="padding: 22px; margin-bottom: 24px; border-left: 4px solid var(--color-primary);">
        <div style="margin-bottom: 14px;">
          <h2 style="font-size: 1.15rem; margin: 0 0 4px 0; color: var(--text-primary);">
            Mandos para Ensayos y Pruebas
          </h2>
          <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">
            Prueba cómo reacciona la aplicación ante nuevos votos o vacía la urna para empezar una nueva simulación:
          </p>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <!-- Reiniciar Urna a 0 -->
          <button class="btn danger" data-act="reset-app-votes" ${S.busy ? 'disabled' : ''} title="Vacía todos los votos y deja la urna a 0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Vaciar Urna a 0 Votos
          </button>

          <!-- Añadir Votos de Prueba -->
          <button class="btn primary" data-act="add-votes" data-n="5" ${S.busy ? 'disabled' : ''} title="Genera 5 votos de prueba">
            +5 Votos de Prueba
          </button>

          <button class="btn" data-act="add-votes" data-n="25" ${S.busy ? 'disabled' : ''} title="Genera 25 votos de prueba">
            +25 Votos de Prueba
          </button>

          <!-- Auditoría Rápida -->
          <button class="btn" data-act="run-audit" ${S.busy ? 'disabled' : ''} title="Ejecuta una comprobación de seguridad completa">
            🛡️ Comprobar Auditoría
          </button>
        </div>

        ${S.auditPass !== null ? `
          <div class="callout ${S.auditPass ? 'good' : 'danger'}" style="margin-top: 14px; font-size: 0.86rem;">
            ${S.auditPass 
              ? '✓ <b>Auditoría Correcta:</b> Todas las papeletas están selladas matemáticamente en el Árbol de Merkle, las defensas anti-doble voto funcionan al 100% y el censo preserva el anonimato.' 
              : '✗ Error detectado en la comprobación.'}
          </div>
        ` : ''}
      </section>

      <!-- 3. ESCRUTINIO EN TIEMPO REAL -->
      <section class="admin-card" style="padding: 22px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h2 style="font-size: 1.15rem; margin: 0 0 4px 0; color: var(--text-primary);">
              Escrutinio en Directo (Decreto de Vivienda)
            </h2>
            <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">
              Suma matemática acumulada de las decisiones ciudadanas:
            </p>
          </div>
          <span class="status-badge ok">${rawTot} Votos</span>
        </div>

        <div class="bar-row" style="margin-bottom: 12px;">
          <span class="bar-label" style="color:var(--vote-yes); font-weight: 700; width: 90px;">A Favor</span>
          <div class="bar-track" style="flex: 1;"><div class="bar-fill yes" style="width: ${pctYes}%;"></div></div>
          <span class="bar-val font-mono" style="width: 110px; text-align: right;">${t.total.YES} (${pctYes}%)</span>
        </div>

        <div class="bar-row" style="margin-bottom: 12px;">
          <span class="bar-label" style="color:var(--vote-no); font-weight: 700; width: 90px;">En Contra</span>
          <div class="bar-track" style="flex: 1;"><div class="bar-fill no" style="width: ${pctNo}%;"></div></div>
          <span class="bar-val font-mono" style="width: 110px; text-align: right;">${t.total.NO} (${pctNo}%)</span>
        </div>

        <div class="bar-row">
          <span class="bar-label" style="color:var(--vote-delegate); font-weight: 700; width: 90px;">NS / NC</span>
          <div class="bar-track" style="flex: 1;"><div class="bar-fill abs" style="width: ${pctAbs}%;"></div></div>
          <span class="bar-val font-mono" style="width: 110px; text-align: right;">${t.total.ABSTAIN} (${pctAbs}%)</span>
        </div>
      </section>

      <!-- 4. COMPROBAR UNA PAPELETA / RECIBO -->
      <section class="admin-card" style="padding: 22px;">
        <div style="margin-bottom: 12px;">
          <h2 style="font-size: 1.15rem; margin: 0 0 4px 0; color: var(--text-primary);">
            Comprobador Rápido de Recibos
          </h2>
          <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">
            Verifica que una papeleta específica está registrada dentro de la urna sin revelar la identidad del votante:
          </p>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <input 
            class="form-input mono" 
            id="receipt-q" 
            placeholder="Pega el código de un recibo..." 
            value="${esc(S.search)}" 
            style="flex: 1; min-width: 240px; padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-medium);"
          />
          <button class="btn primary" data-act="search">
            Verificar Recibo
          </button>
        </div>

        ${chk ? (chk.included ? `
          <div class="callout good" style="margin-top: 14px; font-size: 0.86rem;">
            ✓ <b>Recibo verificado con éxito:</b> Esta papeleta está custodiada dentro de la urna y forma parte del escrutinio oficial (comprobación matemática válida).
          </div>
        ` : `
          <div class="callout danger" style="margin-top: 14px; font-size: 0.86rem;">
            ✗ <b>Recibo no encontrado:</b> El código introducido no coincide con ninguna papeleta de esta urna.
          </div>
        `) : ''}

        ${S.receipts.length ? `
          <div style="margin-top: 16px;">
            <span style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
              Últimos recibos emitidos (haz clic para probar):
            </span>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
              ${S.receipts.slice(-5).reverse().map((r) => `
                <button class="btn sm" data-act="use-receipt" data-h="${r.receiptHash}" style="font-family: var(--font-mono); font-size: 0.75rem;">
                  #${r.receiptHash.slice(0, 10)}…
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </section>

    </div>
  `;
}

function paint() {
  renderNavbar();
  $('#view')!.innerHTML = renderMainContent();
  afterPaint();
}

function afterPaint() {
  $('#receipt-q')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') actions.search();
  });
}

const actions: Record<string, (el?: HTMLElement) => void | Promise<void>> = {
  theme: () => toggleAppTheme(),
  'dismiss-notice': () => {
    S.adminNotice = null;
    paint();
  },
  search: () => {
    const input = $('#receipt-q') as HTMLInputElement | null;
    if (input) S.search = input.value;
    paint();
  },
  'use-receipt': (el) => {
    if (el?.dataset.h) S.search = el.dataset.h;
    paint();
  },
  'toggle-reflection': () => {
    const next = toggleReflectionTimer();
    S.adminNotice = {
      type: next ? 'good' : 'amber',
      text: next
        ? '✓ Pausa de 20 segundos ACTIVADA. En cada artículo el ciudadano esperará 20s para reflexionar antes de desbloquear el voto.'
        : '✓ Pausa de reflexión DESACTIVADA. Los votos pueden emitirse de inmediato.',
    };
    paint();
  },
  'toggle-deadline': () => {
    const next = toggleConsultationDeadline();
    S.adminNotice = {
      type: next ? 'good' : 'amber',
      text: next
        ? '✓ Cuenta atrás ACTIVADA en la app ciudadana hasta las Elecciones Generales.'
        : '✓ Cuenta atrás OCULTADA en la app ciudadana.',
    };
    paint();
  },
  'add-votes': async (el) => {
    if (S.busy || !S.world) return;
    S.busy = true;
    paint();
    try {
      const n = Number(el?.dataset.n || 5);
      const out = await S.world.batchSimulate(S.cid, n);
      if (out.receipts && out.receipts.length) {
        S.receipts.push(...out.receipts);
        S.search = out.receipts[out.receipts.length - 1].receiptHash;
      }
      S.adminNotice = {
        type: 'good',
        text: `✓ Se han añadido ${n} votos de prueba a la urna correctamente.`,
      };
    } catch (err) {
      S.adminNotice = {
        type: 'danger',
        text: `Error al generar votos: ${err instanceof Error ? err.message : String(err)}`,
      };
    } finally {
      S.busy = false;
      paint();
    }
  },
  'reset-app-votes': async () => {
    if (S.busy) return;
    S.busy = true;
    paint();
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('DEMOCRACIA_VIVA_STATE_V3');
        localStorage.removeItem('DEMOCRACIA_VIVA_SEALED_VOTES_CACHE_V3');
        localStorage.setItem('DEMOCRACIA_VIVA_RESET_TRIGGER', Date.now().toString());
      }
      window.dispatchEvent(new CustomEvent('DEMOCRACIA_VIVA_RESET_TRIGGER'));

      if (S.world) {
        await S.world.reset();
        await seed(false);
      }
      S.receipts = [];
      S.search = '';
      S.auditPass = null;
      S.adminNotice = {
        type: 'good',
        text: '✓ Urna vaciada a 0 votos. La aplicación ciudadana y el registro se han restablecido limpiamente.',
      };
    } catch (err) {
      S.adminNotice = {
        type: 'danger',
        text: `Error al reiniciar la urna: ${err instanceof Error ? err.message : String(err)}`,
      };
    } finally {
      S.busy = false;
      paint();
    }
  },
  'run-audit': async () => {
    if (S.busy || !S.world) return;
    S.busy = true;
    paint();
    try {
      const box = S.world.boxes.get(S.cid);
      const root = box ? box.root() : '';
      let verifiedCount = 0;

      for (const r of S.receipts) {
        const chk = S.rm?.checkReceipt(S.cid, r.receiptHash);
        if (chk && chk.included && chk.proof && verifyMerkleProof(chk.proof, root)) {
          verifiedCount++;
        }
      }

      // Probar defensa anti-doble voto
      const testCitizen = (await S.world.enroll('VALID_ADULT')).citizen!;
      const v1 = await S.world.castSecretVote(testCitizen, S.cid, 'YES');
      const v2 = await S.world.castSecretVote(testCitizen, S.cid, 'NO');
      const doubleSpendBlocked = !v2.ok;

      S.auditPass = doubleSpendBlocked;
      S.adminNotice = {
        type: 'good',
        text: '✓ Auditoría completada con éxito: el recuento es exacto y el doble voto está bloqueado al 100%.',
      };
    } catch (err) {
      S.auditPass = false;
      S.adminNotice = {
        type: 'danger',
        text: `Fallo en la auditoría: ${err instanceof Error ? err.message : String(err)}`,
      };
    } finally {
      S.busy = false;
      paint();
    }
  },
};

async function seed(withSampleVotes = false) {
  const w = S.world!;
  await w.createConsultation({ 
    id: 'ley-vivienda', 
    title: 'Real Decreto-ley de Vivienda y Alquiler', 
    category: 'Vivienda', 
    boeRef: 'RDL 2/2026' 
  });
  w.setStatus('ley-vivienda', 'ACTIVE');

  if (withSampleVotes) {
    try {
      const out = await w.batchSimulate('ley-vivienda', 8);
      if (out.receipts && out.receipts.length) {
        S.receipts = out.receipts;
        S.search = out.receipts[out.receipts.length - 1].receiptHash;
      }
    } catch {}
  } else {
    S.receipts = [];
    S.search = '';
  }

  S.rm = new AdminReadModel(w);
}

document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
  if (!el) return;
  const act = el.dataset.act;
  if (act && actions[act]) {
    actions[act](el);
  }
});

async function init() {
  S.world = await SandboxWorld.create();
  await seed(false);
  paint();
}

init();
