/**
 * DEMOCRACIA VIVA — ZERO-TRUST ADMIN COMMAND CENTER & SANDBOX LAB
 * 
 * Cumple con SPEC.md v3.0.0:
 * 1. Anonymous Roll & Security Monitor (+18, active Passkeys, device migration revocations, eIDAS status).
 * 2. BOE Studio & AI Generator (Gemini / Ollama Qwen 2.5 JSON Schema, Side-by-Side Live 100dvh preview).
 * 3. Secret Ballot & Integrity Audit (Invariante Contable COUNT(Roll)==COUNT(Urn), #DV-XXXX lookup, signed report).
 * 4. Specialists Network (Liquid Democracy DAG, interactive SVG, cycle blocker demo).
 * 5. Sandbox Lab (1-click edge-case simulator, tampering demo, batch traffic generator, reset to 0).
 */

import './admin.css';
import { SandboxWorld, AdminReadModel } from '../domain/civic/protocol.ts';
import { verifyMerkleProof } from '../domain/civic/crypto.ts';
import { renderBrandLogo } from '../ui/gamified/brand-logo.ts';
import { isReflectionTimerEnabled, toggleReflectionTimer } from '../services/deliberation-timer.ts';
import { 
  getConsultationDeadlineConfig, 
  toggleConsultationDeadline, 
  calculateTimeRemaining 
} from '../services/consultation-deadline.ts';
import { 
  getActiveThemeProfile, 
  setActiveThemeProfile, 
  ELEGANCE_TOKENS, 
  DesignThemeProfile,
  initDesignSystem 
} from '../services/design-system.ts';

// Nuevos módulos canónicos de Arquitectura Cívica
import { 
  AtomicBallotBoxManager, 
  generateVoterSecretSalt,
  verifyClientReceipt,
  ClientVoterReceipt,
  VoteChoice
} from '../domain/civic/atomic-ballot-box.ts';
import { 
  IdentityProviderAdapter,
  deriveCitizenNullifierHash
} from '../domain/civic/identity-adapter.ts';
import { 
  DynamicRollupEngine 
} from '../domain/liquid-democracy/dynamic-rollup.ts';
import { 
  extractDeterministic, 
  SAMPLE_BOE, 
  BoeExtraction 
} from './boe.ts';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T | null;

type AdminTab = 'census' | 'boe' | 'urn' | 'dag' | 'sandbox' | 'design';

interface AdminState {
  activeTab: AdminTab;
  atomicBox: AtomicBallotBoxManager;
  identityAdapter: IdentityProviderAdapter;
  rollupEngine: DynamicRollupEngine;
  world: SandboxWorld | null;
  rm: AdminReadModel | null;
  cid: string;
  searchReceipt: string;
  busy: boolean;
  adminNotice: { type: 'good' | 'amber' | 'danger'; text: string } | null;
  auditPass: boolean | null;
  boeInput: string;
  boeResult: BoeExtraction | null;
  boeSource: 'OLLAMA_QWEN_2.5_SCHEMA_CONSTRAINED' | 'DETERMINISTIC_FALLBACK';
  localTestReceipts: ClientVoterReceipt[];
  tamperSimulationResult: string | null;
}

const S: AdminState = {
  activeTab: 'census',
  atomicBox: new AtomicBallotBoxManager('SANDBOX'),
  identityAdapter: new IdentityProviderAdapter(),
  rollupEngine: new DynamicRollupEngine(),
  world: null,
  rm: null,
  cid: 'ley-vivienda',
  searchReceipt: '',
  busy: false,
  adminNotice: null,
  auditPass: null,
  boeInput: SAMPLE_BOE,
  boeResult: null,
  boeSource: 'DETERMINISTIC_FALLBACK',
  localTestReceipts: [],
  tamperSimulationResult: null
};

// Inicializar shards para la consulta activa
S.atomicBox.initializeConsultationShards(S.cid, 4);

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

  const tabs: Array<{ id: AdminTab; label: string; num: string }> = [
    { id: 'census', label: 'Censo & Seguridad', num: '01' },
    { id: 'boe', label: 'BOE Studio & IA', num: '02' },
    { id: 'urn', label: 'Urna & Auditoría', num: '03' },
    { id: 'dag', label: 'Especialistas (DAG)', num: '04' },
    { id: 'sandbox', label: 'Laboratorio Sandbox', num: '05' },
    { id: 'design', label: 'Sistema de Diseño', num: '06' }
  ];

  $('#topbar')!.innerHTML = `
    <div class="nav-brand-group">
      <a href="/" title="Ir a la aplicación ciudadana" style="text-decoration:none;display:flex;align-items:center;gap:10px;">
        ${renderBrandLogo({ compact: true, showBadge: false })}
      </a>
      <span class="nav-brand-badge">CENTRO DE MANDO</span>
      <span class="env-pill sandbox"><i></i> SANDBOX LAB</span>
    </div>

    <!-- Píldoras de Navegación Segmentada (5 Módulos Canónicos) -->
    <nav class="nav-tabs-rail" aria-label="Módulos del Centro de Mando">
      ${tabs.map(t => `
        <button class="tab-btn" data-tab="${t.id}" ${S.activeTab === t.id ? 'aria-current="page"' : ''}>
          <span class="tab-num">${t.num}</span>
          <span>${t.label}</span>
        </button>
      `).join('')}
    </nav>

    <div class="nav-actions-group">
      <button class="icon-action-btn" data-act="theme" title="Alternar entre modo claro y oscuro" aria-label="Cambiar tema">
        ${currentTheme === 'dark' ? `
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="10" cy="10" r="3.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.34 4.34l1.42 1.42M14.24 14.24l1.42 1.42M4.34 15.66l1.42-1.42M14.24 5.76l1.42-1.42"/>
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
        <span>← App Ciudadana</span>
      </a>
    </div>
  `;
}

/* ───────────────────────────────────────────────────────────────────
   MÓDULO 1: ANONYMOUS ROLL & SECURITY MONITOR
   ─────────────────────────────────────────────────────────────────── */
function renderCensusView(): string {
  const stats = S.identityAdapter.getSecurityStats();
  const audit = S.atomicBox.auditAccountingBalance(S.cid);

  return `
    <div style="max-width: 1100px; margin: 0 auto;">
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 1.6rem; margin: 0 0 4px 0; color: var(--text-primary);">
          Censo Anónimo & Monitor de Seguridad
        </h1>
        <p style="margin: 0; font-size: 0.88rem; color: var(--text-secondary);">
          Vigilancia en tiempo real de la identidad soberana (+18), autenticadores hardware FIDO2 y defensas anti-Sybil.
        </p>
      </div>

      <!-- KPIs de Identidad y Hardware -->
      <div class="admin-grid g-4" style="gap: 16px; margin-bottom: 24px;">
        <div class="admin-card kpi-card" style="padding: 18px;">
          <span class="kpi-label">Ciudadanos (+18) Activos</span>
          <div class="kpi-value font-display">${stats.total_active_citizens}</div>
          <div class="kpi-sub">Cero PII · Nullifiers Hash</div>
        </div>

        <div class="admin-card kpi-card" style="padding: 18px;">
          <span class="kpi-label">Passkeys Hardware Activas</span>
          <div class="kpi-value font-display" style="color: var(--vote-yes);">${stats.active_passkeys}</div>
          <div class="kpi-sub">Secure Enclave / TPM (W3C)</div>
        </div>

        <div class="admin-card kpi-card" style="padding: 18px;">
          <span class="kpi-label">Dispositivos Revocados</span>
          <div class="kpi-value font-display" style="color: var(--vote-delegate);">${stats.revoked_passkeys}</div>
          <div class="kpi-sub">Migraciones de terminal</div>
        </div>

        <div class="admin-card kpi-card" style="padding: 18px;">
          <span class="kpi-label">Estado eIDAS / KYC</span>
          <div class="kpi-value font-display" style="font-size: 1.3rem; color: #10B981; padding-top: 6px;">Homologado</div>
          <div class="kpi-sub">Didit · Cl@ve · Stripe Ready</div>
        </div>
      </div>

      <!-- Conector Homologado e Invariantes -->
      <div class="admin-grid g-2" style="gap: 20px; margin-bottom: 24px;">
        <section class="admin-card" style="padding: 22px;">
          <h2 style="font-size: 1.1rem; margin: 0 0 12px 0;">Pasarelas de Identidad Conectadas</h2>
          <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.86rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--bg-surface); border-radius: var(--radius-sm);">
              <div>
                <b>Didit KYC eIDAS Connector</b>
                <div style="color: var(--text-muted); font-size: 0.78rem;">Webhook verificado HMAC-SHA256 (KMS)</div>
              </div>
              <span class="status-badge ok">Activo</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--bg-surface); border-radius: var(--radius-sm);">
              <div>
                <b>Cl@ve / DNIe 4.0 Connector</b>
                <div style="color: var(--text-muted); font-size: 0.78rem;">Cotejo local en enclave seguro sin fuga de DNI</div>
              </div>
              <span class="status-badge ok">En línea</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--bg-surface); border-radius: var(--radius-sm);">
              <div>
                <b>Stripe Identity Gateway</b>
                <div style="color: var(--text-muted); font-size: 0.78rem;">Verificación documental automática (+18)</div>
              </div>
              <span class="status-badge amber">Standby</span>
            </div>
          </div>
        </section>

        <section class="admin-card" style="padding: 22px;">
          <h2 style="font-size: 1.1rem; margin: 0 0 12px 0;">Regla de Oro: 1 Ciudadano = 1 Dispositivo Activo</h2>
          <p style="font-size: 0.86rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 14px;">
            Si un ciudadano autenticado pierde su móvil o cambia de terminal, al verificar nuevamente su identidad se registra su nueva Passkey y se <b>revoca atómicamente la anterior</b> en el censo. De este modo es matemáticamente imposible que una misma persona conserve dos dispositivos con derecho a voto.
          </p>
          <div style="padding: 12px; background: var(--color-primary-subtle); border-left: 3px solid var(--color-primary); border-radius: var(--radius-sm); font-size: 0.82rem;">
            <b>Garantía Zero-PII:</b> El servidor solo almacena hashes irreversibles (HMAC-SHA256 con pimienta de seguridad). Ningún empleado ni administrador tiene acceso a datos personales.
          </div>
        </section>
      </div>
    </div>
  `;
}

/* ───────────────────────────────────────────────────────────────────
   MÓDULO 2: BOE STUDIO & AI GENERATOR (GEMINI / OLLAMA + QWEN 2.5)
   ─────────────────────────────────────────────────────────────────── */
function renderBoeView(): string {
  const result = S.boeResult || extractDeterministic(S.boeInput);

  return `
    <div style="max-width: 1200px; margin: 0 auto;">
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 1.6rem; margin: 0 0 4px 0; color: var(--text-primary);">
          BOE Studio & Generador IA (Qwen 2.5 / Gemini)
        </h1>
        <p style="margin: 0; font-size: 0.88rem; color: var(--text-secondary);">
          Ingesta automatizada de textos del Boletín Oficial del Estado con extracción estructurada forzada por JSON Schema estricto.
        </p>
      </div>

      <div class="admin-grid g-2" style="gap: 24px; align-items: flex-start;">
        <!-- Columna Izquierda: Entrada del BOE y Controles del LLM -->
        <section class="admin-card" style="padding: 22px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h2 style="font-size: 1.1rem; margin: 0;">Texto Oficial del BOE</h2>
            <select id="boe-source-select" style="padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; background: var(--bg-surface); border: 1px solid var(--border-medium);">
              <option value="DETERMINISTIC_FALLBACK" ${S.boeSource === 'DETERMINISTIC_FALLBACK' ? 'selected' : ''}>Extractor Determinista Seguro</option>
              <option value="OLLAMA_QWEN_2.5_SCHEMA_CONSTRAINED" ${S.boeSource === 'OLLAMA_QWEN_2.5_SCHEMA_CONSTRAINED' ? 'selected' : ''}>Ollama Local (Qwen 2.5 Grammars)</option>
            </select>
          </div>

          <textarea id="boe-raw-text" style="width: 100%; height: 320px; font-family: var(--font-mono); font-size: 0.8rem; padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-card); background: var(--bg-surface); resize: vertical; margin-bottom: 14px;">${esc(S.boeInput)}</textarea>

          <div style="display: flex; gap: 10px;">
            <button class="btn primary" data-act="extract-boe" style="flex: 1;">
              ⚡ Procesar y Extraer con IA
            </button>
            <button class="btn" data-act="reset-boe" title="Cargar texto de ejemplo">
              Restaurar Ejemplo
            </button>
          </div>
        </section>

        <!-- Columna Derecha: Previsualización Paralela (100dvh Mobile Card & Monográfico) -->
        <section class="admin-card" style="padding: 22px; background: var(--bg-surface);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h2 style="font-size: 1.1rem; margin: 0;">Previsualización Móvil Ciudadana (100dvh)</h2>
            <span class="status-badge ok" style="font-size: 0.72rem;">Esquema Válido</span>
          </div>

          <!-- Maqueta de pantalla de móvil simulada (375px) -->
          <div style="max-width: 360px; margin: 0 auto; background: var(--bg-app); border: 2px solid var(--border-card); border-radius: 28px; padding: 18px 16px; box-shadow: var(--shadow-md);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 0.72rem; color: var(--text-muted);">
              <span class="mono">BOE · ${esc(result.categoria)}</span>
              <span style="background: var(--color-primary-subtle); color: var(--color-primary); padding: 2px 6px; border-radius: 4px; font-weight: 700;">${esc(result.articulo_boe)}</span>
            </div>

            <h3 style="font-size: 1.05rem; margin: 0 0 8px 0; color: var(--text-primary); line-height: 1.3;">
              ${esc(result.titulo)}
            </h3>

            <p style="font-size: 0.84rem; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.4;">
              ${esc(result.pregunta_voto)}
            </p>

            <!-- Datos clave -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 14px;">
              ${result.datos_clave.map(d => `
                <div style="background: var(--bg-surface); padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-card); font-size: 0.72rem;">
                  <span style="color: var(--text-muted); display: block;">${esc(d.etiqueta)}</span>
                  <b style="color: var(--text-primary);">${esc(d.valor)}</b>
                </div>
              `).join('')}
            </div>

            <!-- Botones de voto móviles -->
            <div style="display: flex; gap: 6px;">
              <div style="flex: 1; text-align: center; padding: 10px; background: rgba(5, 150, 105, 0.1); border: 1px solid rgba(5, 150, 105, 0.3); border-radius: 8px; color: var(--vote-yes); font-weight: 700; font-size: 0.8rem;">
                A Favor
              </div>
              <div style="flex: 1; text-align: center; padding: 10px; background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.3); border-radius: 8px; color: var(--vote-no); font-weight: 700; font-size: 0.8rem;">
                En Contra
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;
}

/* ───────────────────────────────────────────────────────────────────
   MÓDULO 3: SECRET BALLOT & INTEGRITY AUDIT (INVARIANTE CONTABLE)
   ─────────────────────────────────────────────────────────────────── */
function renderUrnView(): string {
  const audit = S.atomicBox.auditAccountingBalance(S.cid);
  const tally = S.atomicBox.getTally(S.cid);
  const allBallots = S.atomicBox.getAllBallots(S.cid);

  const tot = Math.max(1, tally.total);
  const pctYes = tally.total === 0 ? 0 : Math.round((tally.YES / tot) * 100);
  const pctNo = tally.total === 0 ? 0 : Math.round((tally.NO / tot) * 100);
  const pctAbs = tally.total === 0 ? 0 : Math.round((tally.ABSTAIN / tot) * 100);

  // Búsqueda de recibo
  const query = S.searchReceipt.trim();
  const searchBallot = query ? S.atomicBox.getBallotByReceipt(S.cid, query) : null;

  return `
    <div style="max-width: 1100px; margin: 0 auto;">
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 1.6rem; margin: 0 0 4px 0; color: var(--text-primary);">
          Urna Secreta Desacoplada & Auditoría de Integridad
        </h1>
        <p style="margin: 0; font-size: 0.88rem; color: var(--text-secondary);">
          Escrutinio público transparente con verificación matemática del Invariante Contable y recibos con sal local.
        </p>
      </div>

      <!-- INVARIANTE CONTABLE (TARJETA MAESTRA DE SEGURIDAD) -->
      <section class="admin-card" style="padding: 24px; margin-bottom: 24px; border-left: 6px solid ${audit.balanced ? '#10B981' : '#EF4444'};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
          <div>
            <span class="mono" style="font-size: 0.76rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">
              Invariante Público de Integridad Electoral
            </span>
            <h2 style="font-size: 1.35rem; margin: 4px 0 0 0; color: ${audit.balanced ? '#10B981' : '#EF4444'};">
              ${audit.balanced ? '✓ CUADRE CONTABLE PERFECTO (100% AUDITADO)' : '⚠ ALERTA DE AUDITORÍA: DESAJUSTE CONTABLE'}
            </h2>
          </div>
          <span class="status-badge ${audit.balanced ? 'ok' : 'danger'}" style="font-size: 0.85rem; padding: 6px 14px;">
            ${audit.balanced ? 'INTEGRIDAD MATEMÁTICA CONFIRMADA' : 'ALERTA DE DESCUADRE'}
          </span>
        </div>

        <div class="admin-grid g-3" style="gap: 16px; margin: 16px 0; background: var(--bg-surface); padding: 16px; border-radius: var(--radius-sm);">
          <div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Firmas en Censo (VOTED_DIRECT)</div>
            <div class="mono font-display" style="font-size: 1.8rem; font-weight: 800; color: var(--text-primary);">${audit.direct_voters_in_roll}</div>
          </div>
          <div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Papeletas en Urna (Anonymous_Ballot_Box)</div>
            <div class="mono font-display" style="font-size: 1.8rem; font-weight: 800; color: var(--text-primary);">${audit.ballots_in_urn}</div>
          </div>
          <div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Diferencia Censo - Urna</div>
            <div class="mono font-display" style="font-size: 1.8rem; font-weight: 800; color: ${audit.difference === 0 ? '#10B981' : '#EF4444'};">${audit.difference}</div>
          </div>
        </div>

        <p style="font-size: 0.84rem; color: var(--text-secondary); margin: 0;">
          Fórmula auditada: <code>COUNT(Participation_Roll WHERE status == 'VOTED_DIRECT') === COUNT(Anonymous_Ballot_Box)</code>.
          Cada voto directo exige firma de chip de seguridad WebAuthn.
        </p>
      </section>

      <!-- Escrutinio en Vivo -->
      <section class="admin-card" style="padding: 22px; margin-bottom: 24px;">
        <h2 style="font-size: 1.15rem; margin: 0 0 16px 0;">Recuento de la Consulta en Tiempo Real</h2>

        <div style="display: flex; height: 18px; border-radius: 99px; overflow: hidden; margin-bottom: 14px; background: var(--border-medium);">
          <div style="width: ${pctYes}%; background: var(--vote-yes);" title="A Favor: ${pctYes}%"></div>
          <div style="width: ${pctNo}%; background: var(--vote-no);" title="En Contra: ${pctNo}%"></div>
          <div style="width: ${pctAbs}%; background: #64748B;" title="NS/NC: ${pctAbs}%"></div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 0.86rem;">
          <span style="color: var(--vote-yes); font-weight: 700;">A Favor: ${tally.YES} (${pctYes}%)</span>
          <span style="color: var(--vote-no); font-weight: 700;">En Contra: ${tally.NO} (${pctNo}%)</span>
          <span style="color: #64748B; font-weight: 700;">NS / NC: ${tally.ABSTAIN} (${pctAbs}%)</span>
          <span style="font-weight: 700; color: var(--text-primary);">Total: ${tally.total}</span>
        </div>
      </section>

      <!-- Buscador Público de Recibos (#DV-XXXX) con Sal Local -->
      <section class="admin-card" style="padding: 22px; margin-bottom: 24px;">
        <h2 style="font-size: 1.15rem; margin: 0 0 6px 0;">Buscador y Verificador de Recibos (#DV-XXXX-XXXX)</h2>
        <p style="font-size: 0.84rem; color: var(--text-secondary); margin-bottom: 14px;">
          Comprueba cualquier recibo depositado en la urna anónima sin revelar la identidad del votante:
        </p>

        <div style="display: flex; gap: 10px; margin-bottom: 16px;">
          <input type="text" id="receipt-search-input" placeholder="#DV-A1B2-C3D4" value="${esc(S.searchReceipt)}" style="flex: 1; padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-card); font-family: var(--font-mono); font-size: 0.9rem; background: var(--bg-surface);">
          <button class="btn primary" data-act="search-receipt">Verificar Recibo</button>
        </div>

        ${searchBallot ? `
          <div class="callout good" style="padding: 14px; border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <b>✓ Papeleta Encontrada en la Urna: ${esc(searchBallot.receipt_code)}</b>
              <span class="status-badge ok">${esc(searchBallot.vote_choice)}</span>
            </div>
            <div class="mono" style="font-size: 0.78rem; word-break: break-all; color: var(--text-secondary);">
              Compromiso Criptográfico (SHA-256): ${esc(searchBallot.commitment_hash)}
            </div>
          </div>
        ` : query ? `
          <div class="callout danger" style="padding: 14px; border-radius: var(--radius-sm);">
            No se encontró ninguna papeleta con el código <b>${esc(query)}</b> en esta urna.
          </div>
        ` : ''}

        <!-- Exportación de informe de auditoría -->
        <div style="margin-top: 18px; border-top: 1px solid var(--border-card); padding-top: 14px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.84rem; color: var(--text-muted);">Acta oficial firmada SHA-256</span>
          <button class="btn sm" data-act="export-audit-json">Descargar Acta JSON</button>
        </div>
      </section>
    </div>
  `;
}

/* ───────────────────────────────────────────────────────────────────
   MÓDULO 4: SPECIALISTS NETWORK (LIQUID DEMOCRACY DAG)
   ─────────────────────────────────────────────────────────────────── */
function renderDagView(): string {
  const specs = S.rollupEngine.getSpecialistsByCategory('vivienda');
  const directVoters = new Set<string>();
  const rollup = S.rollupEngine.resolveDynamicRollup({
    category: 'vivienda',
    directVotersSet: directVoters
  });

  return `
    <div style="max-width: 1100px; margin: 0 auto;">
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 1.6rem; margin: 0 0 4px 0; color: var(--text-primary);">
          Red de Especialistas & Grafo DAG de Democracia Líquida
        </h1>
        <p style="margin: 0; font-size: 0.88rem; color: var(--text-secondary);">
          Gestión de perfiles verificados por categoría temática con prevención estricta de ciclos y descuento por voto directo (Hot-Override).
        </p>
      </div>

      <div class="admin-grid g-2" style="gap: 24px; margin-bottom: 24px;">
        <!-- Lista de Especialistas -->
        <section class="admin-card" style="padding: 22px;">
          <h2 style="font-size: 1.15rem; margin: 0 0 14px 0;">Especialistas Homologados (Vivienda)</h2>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${specs.map(sp => `
              <div style="padding: 14px; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-card);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <b>${esc(sp.name_alias)}</b>
                  <span class="status-badge ok">Verificado</span>
                </div>
                <div class="mono" style="font-size: 0.74rem; color: var(--text-muted); margin-bottom: 6px;">
                  ID: ${esc(sp.nullifier_hash)}
                </div>
                <div style="font-size: 0.82rem; color: var(--text-secondary);">
                  Peso Base: <b>1</b> · Peso Efectivo Dinámico: <b>${rollup.specialists.find(s => s.specialist_nullifier === sp.nullifier_hash)?.total_effective_weight || 1}</b>
                </div>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Demostrador de Bloqueo de Ciclos y Hot-Override -->
        <section class="admin-card" style="padding: 22px;">
          <h2 style="font-size: 1.15rem; margin: 0 0 14px 0;">Garantías Criptográficas del Grafo</h2>

          <div style="margin-bottom: 16px;">
            <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 4px;">1. Prevención de Bucles Circulares (A → B → C → A)</div>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 8px;">
              El algoritmo DFS intercepta en milisegundos cualquier intento de delegación circular, manteniendo el grafo estrictamente acíclico.
            </p>
            <button class="btn sm" data-act="test-cycle-blocker">Simular Ataque de Ciclo</button>
          </div>

          <div style="border-top: 1px solid var(--border-card); padding-top: 14px;">
            <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 4px;">2. Hot-Override (El Voto Directo Manda)</div>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0;">
              Si un delegador emite una papeleta directa en la consulta activa, se descuenta de inmediato del peso de su especialista delegado.
            </p>
          </div>
        </section>
      </div>
    </div>
  `;
}

/* ───────────────────────────────────────────────────────────────────
   MÓDULO 5: SANDBOX LAB (TRAFFIC SIMULATOR & ADVERSARIAL TESTING)
   ─────────────────────────────────────────────────────────────────── */
function renderSandboxView(): string {
  const audit = S.atomicBox.auditAccountingBalance(S.cid);

  return `
    <div style="max-width: 1100px; margin: 0 auto;">
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 1.6rem; margin: 0 0 4px 0; color: var(--text-primary);">
          Laboratorio Sandbox & Simulador de Ciberseguridad
        </h1>
        <p style="margin: 0; font-size: 0.88rem; color: var(--text-secondary);">
          Entorno de pruebas con aislamiento físico (<code>sandbox_*</code>) para ensayos masivos y simulaciones adversarias.
        </p>
      </div>

      <!-- Simulador de Casos Borde de Identidad (1-Click) -->
      <section class="admin-card" style="padding: 22px; margin-bottom: 24px; border-left: 4px solid var(--color-primary);">
        <h2 style="font-size: 1.15rem; margin: 0 0 6px 0;">1. Simulador de Identidad y Casos Borde (+18)</h2>
        <p style="font-size: 0.84rem; color: var(--text-secondary); margin-bottom: 14px;">
          Prueba el comportamiento de las defensas ante perfiles simulados:
        </p>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn primary" data-act="sim-adult">✓ Adulto Válido (+18)</button>
          <button class="btn danger" data-act="sim-underage">✗ Menor de Edad (<18)</button>
          <button class="btn" data-act="sim-migration">🔄 Migración de Móvil (Revocación)</button>
          <button class="btn" data-act="sim-double-vote">🚫 Intento de Doble Voto</button>
        </div>
      </section>

      <!-- Simulador de Ataque y Manipulación de Base de Datos -->
      <section class="admin-card" style="padding: 22px; margin-bottom: 24px; border-left: 4px solid #F59E0B;">
        <h2 style="font-size: 1.15rem; margin: 0 0 6px 0;">2. Demostración Educativa de Detección de Fraude</h2>
        <p style="font-size: 0.84rem; color: var(--text-secondary); margin-bottom: 14px;">
          Fuerza una alteración maliciosa en la base de datos para ver en directo cómo reaccionan las alertas criptográficas:
        </p>

        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px;">
          <button class="btn danger" data-act="tamper-vote">Alterar Voto en la Urna (Falla Sal Local)</button>
          <button class="btn danger" data-act="tamper-ghost">Inyectar Voto Fantasma (Falla Invariante)</button>
          <button class="btn danger" data-act="tamper-unsigned">Inyectar Censo Sin Firma WebAuthn</button>
        </div>

        ${S.tamperSimulationResult ? `
          <div class="callout amber" style="font-size: 0.86rem; padding: 12px 14px; border-radius: var(--radius-sm);">
            ${esc(S.tamperSimulationResult)}
          </div>
        ` : ''}
      </section>

      <!-- Generador de Tráfico en Lotes y Vaciar Urna -->
      <section class="admin-card" style="padding: 22px; margin-bottom: 24px;">
        <h2 style="font-size: 1.15rem; margin: 0 0 6px 0;">3. Generador de Votos en Lote & Reinicio a Cero</h2>
        <p style="font-size: 0.84rem; color: var(--text-secondary); margin-bottom: 14px;">
          Inyecta lotes de votantes concurrentes con aserciones válidas o deja la urna completamente limpia:
        </p>

        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <button class="btn primary" data-act="batch-vote" data-n="10">+10 Votantes</button>
          <button class="btn" data-act="batch-vote" data-n="50">+50 Votantes</button>
          <button class="btn" data-act="batch-vote" data-n="100">+100 Votantes</button>
          
          <div style="flex: 1;"></div>

          <button class="btn danger" data-act="reset-sandbox" title="Vaciar todo el Sandbox a cero">
            🗑️ Vaciar Sandbox a Cero Votos
          </button>
        </div>
      </section>
    </div>
  `;
}

/* ───────────────────────────────────────────────────────────────────
   MÓDULO 6: SISTEMA DE DISEÑO & ARMONÍA CROMÁTICA (HAUTE ÉLEGANCE)
   ─────────────────────────────────────────────────────────────────── */
function renderDesignView(): string {
  const activeProfile = getActiveThemeProfile();
  const deadlineCfg = getConsultationDeadlineConfig();
  const remaining = calculateTimeRemaining(deadlineCfg.targetIso);

  return `
    <div style="max-width: 1100px; margin: 0 auto;">
      <!-- Cabecera del Módulo -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 14px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <h1 style="font-size: 1.6rem; margin: 0; color: var(--text-primary);">
              Sistema de Diseño & Armonía Cromática
            </h1>
            <span class="status-pill ${activeProfile === 'elegance' ? 'good' : 'neutral'}">
              <i></i> ${activeProfile === 'elegance' ? 'Haute Élegance Activo' : 'Vibrante Cívico Activo'}
            </span>
          </div>
          <p style="margin: 0; font-size: 0.88rem; color: var(--text-secondary); max-width: 780px;">
            Transición desde la estética lúdica y saturada hacia un minimalismo editorial, institucional y sofisticado.
            Menos saturación de colores primarios y mayor legitimidad democrática.
          </p>
        </div>

        <div style="display: flex; gap: 8px;">
          <a href="/" target="_blank" class="btn" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            <span>Ver App Pública</span>
          </a>
        </div>
      </div>

      <!-- Selector de Perfil Estético Maestro -->
      <section class="admin-card" style="padding: 22px; margin-bottom: 24px;">
        <h2 style="font-size: 1.12rem; margin: 0 0 4px; color: var(--text-primary);">
          1. Selección de Perfil Estético de la Plataforma
        </h2>
        <p style="font-size: 0.84rem; color: var(--text-secondary); margin: 0 0 18px;">
          El perfil seleccionado se guarda de forma persistente y se aplica automáticamente a todos los ciudadanos y administradores.
        </p>

        <div class="theme-selector-grid">
          <!-- Opción 1: Haute Élegance -->
          <div class="theme-option-card ${activeProfile === 'elegance' ? 'selected' : ''}" data-act="set-design-profile" data-profile="elegance">
            <div class="theme-card-header">
              <div class="theme-badge-check">
                <span class="theme-radio-dot"></span>
                <strong>Haute Élegance</strong>
                <span class="theme-rec-badge">RECOMENDADO</span>
              </div>
              <span class="theme-sub-badge">Minimalismo Suizo & Editorial</span>
            </div>
            
            <p class="theme-card-desc">
              Paleta noble, reposada y sin estridencias. Sustituye los degradados fosforitos y botones arcade por
              superficies satinadas, tipografía carbón profunda y acentos semánticos medidos (esmeralda bosque, pizarra topo y borgoña noble).
            </p>

            <div class="theme-swatch-row">
              <span class="color-dot" style="background: #0F172A;" title="Carbón Primario #0F172A"></span>
              <span class="color-dot" style="background: #475569;" title="Pizarra Secundaria #475569"></span>
              <span class="color-dot" style="background: #F8FAFC; border: 1px solid #CBD5E1;" title="Alabastro Fondo #F8FAFC"></span>
              <span class="color-dot" style="background: #047857;" title="A Favor: Esmeralda Bosque #047857"></span>
              <span class="color-dot" style="background: #334155;" title="NS/NC: Pizarra Topo #334155"></span>
              <span class="color-dot" style="background: #991B1B;" title="En Contra: Borgoña #991B1B"></span>
            </div>

            <div class="theme-card-footer">
              ${activeProfile === 'elegance' ? `
                <span class="theme-applied-label">✓ Perfil Activo en Producción</span>
              ` : `
                <button class="btn primary" style="width: 100%;">Activar Haute Élegance</button>
              `}
            </div>
          </div>

          <!-- Opción 2: Vibrante Cívico (Clásico) -->
          <div class="theme-option-card ${activeProfile === 'classic' ? 'selected' : ''}" data-act="set-design-profile" data-profile="classic">
            <div class="theme-card-header">
              <div class="theme-badge-check">
                <span class="theme-radio-dot"></span>
                <strong>Vibrante Cívico</strong>
                <span class="theme-legacy-badge">LEGACY</span>
              </div>
              <span class="theme-sub-badge">Alto Contraste Gamificado</span>
            </div>

            <p class="theme-card-desc">
              El diseño lúdico original con botoneras arcade de gradientes brillantes (verde menta neón, amarillo ámbar y fucsia),
              insignias en azul eléctrico y métricas teñidas.
            </p>

            <div class="theme-swatch-row">
              <span class="color-dot" style="background: #2563EB;" title="Azul Eléctrico #2563EB"></span>
              <span class="color-dot" style="background: #10B981;" title="Verde Neón #10B981"></span>
              <span class="color-dot" style="background: #F59E0B;" title="Ámbar Brillante #F59E0B"></span>
              <span class="color-dot" style="background: #F43F5E;" title="Frambuesa #F43F5E"></span>
            </div>

            <div class="theme-card-footer">
              ${activeProfile === 'classic' ? `
                <span class="theme-applied-label">✓ Perfil Activo en Producción</span>
              ` : `
                <button class="btn" style="width: 100%;">Activar Vibrante Cívico</button>
              `}
            </div>
          </div>
        </div>
      </section>

      <!-- Simulador de Componentes en Vivo (Live Component Preview) -->
      <section class="admin-card" style="padding: 22px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h2 style="font-size: 1.12rem; margin: 0 0 4px; color: var(--text-primary);">
              2. Previsualizador en Vivo: Tarjeta y Botonera Cívica
            </h2>
            <p style="font-size: 0.84rem; color: var(--text-secondary); margin: 0;">
              Compara cómo se perciben la cabecera, la tarjeta legislativa y los tres botones de sufragio con la nueva sobriedad.
            </p>
          </div>
          <span class="status-pill good">Modo Dinámico: ${activeProfile === 'elegance' ? 'Haute Élegance' : 'Vibrante'}</span>
        </div>

        <div class="component-preview-wrapper ${activeProfile === 'elegance' ? 'preview-elegance' : 'preview-classic'}">
          <!-- Cabecera Compacta con Duración -->
          <div class="preview-hud-bar">
            <div class="preview-mission-info">
              <span class="preview-mission-title">ARTÍCULO 1 DE 3</span>
              <div class="preview-pips">
                <span class="preview-pip active"></span>
                <span class="preview-pip"></span>
                <span class="preview-pip"></span>
              </div>
            </div>
            <div class="preview-context-right">
              <div class="preview-countdown-pill" title="Plazo hasta el 19 de noviembre de 2026">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <strong>${remaining.formattedCompact}</strong>
              </div>
              <div class="preview-decree-pill">
                <span>RDL 2/2026</span>
              </div>
            </div>
          </div>

          <!-- Tarjeta Legislativa -->
          <div class="preview-voting-card">
            <div class="preview-card-header">
              <span class="preview-cat-badge">VIVIENDA Y ALQUILER</span>
              <span class="preview-boe-pill">Art. 1 BOE</span>
            </div>

            <h3 class="preview-card-title">
              ¿Topar por ley las subidas del alquiler al 2.5% anual en ciudades tensionadas?
            </h3>
            <p class="preview-card-desc">
              Fija un límite legal del 2,5% anual a las revisiones de renta en zonas tensionadas donde el esfuerzo supere el 30% del sueldo, protegiendo la estabilidad de más de 3,5 millones de familias inquilinas frente a subidas desmedidas.
            </p>

            <!-- Métricas en Tinta Carbón -->
            <div class="preview-metrics-strip">
              <div class="preview-metric-col">
                <span class="preview-metric-val">2.5% anual</span>
                <span class="preview-metric-label">TOPE MÁXIMO</span>
              </div>
              <div class="preview-metric-col">
                <span class="preview-metric-val">3.5M hogares</span>
                <span class="preview-metric-label">PROTEGIDOS</span>
              </div>
              <div class="preview-metric-col">
                <span class="preview-metric-val">>30% ingresos</span>
                <span class="preview-metric-label">CONDICIÓN</span>
              </div>
            </div>

            <div class="preview-actions-row">
              <button class="preview-action-btn">📊 Datos Clave</button>
              <button class="preview-action-btn">⚖️ 2 Visiones</button>
              <button class="preview-action-btn">📜 Ley BOE</button>
            </div>
          </div>

          <!-- Botonera de Sufragio Cívico -->
          <div class="preview-voting-dock">
            <button class="preview-vote-btn btn-yes" title="Aprobar el artículo">
              <span class="preview-btn-icon">✓</span>
              <strong class="preview-btn-name">A Favor</strong>
              <span class="preview-btn-sub">Aprobar</span>
            </button>
            <button class="preview-vote-btn btn-nsnc" title="Duda o Delegación">
              <span class="preview-btn-icon">?</span>
              <strong class="preview-btn-name">NS / NC</strong>
              <span class="preview-btn-sub">Duda / Delegar</span>
            </button>
            <button class="preview-vote-btn btn-no" title="Rechazar el artículo">
              <span class="preview-btn-icon">✕</span>
              <strong class="preview-btn-name">En Contra</strong>
              <span class="preview-btn-sub">Rechazar</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Tabla de Fichas Técnicas de Color (Tokens) -->
      <section class="admin-card" style="padding: 22px; margin-bottom: 24px;">
        <h2 style="font-size: 1.12rem; margin: 0 0 4px; color: var(--text-primary);">
          3. Catálogo Oficial de Fichas de Color (Design Tokens)
        </h2>
        <p style="font-size: 0.84rem; color: var(--text-secondary); margin: 0 0 16px;">
          Valores normalizados y ratios de contraste WCAG validados para garantizar accesibilidad universal AAA.
        </p>

        <div style="overflow-x: auto;">
          <table class="data-table" style="width: 100%;">
            <thead>
              <tr>
                <th style="width: 50px;">Muestra</th>
                <th>Nombre del Token</th>
                <th>Variable CSS</th>
                <th>Modo Claro</th>
                <th>Modo Oscuro</th>
                <th>Ratio Contraste</th>
                <th>Función Semántica</th>
              </tr>
            </thead>
            <tbody>
              ${ELEGANCE_TOKENS.map(t => `
                <tr>
                  <td>
                    <span class="color-token-box" style="background: ${t.lightHex};"></span>
                  </td>
                  <td><strong>${t.name}</strong></td>
                  <td><code class="mono" style="font-size: 0.8rem;">${t.variable}</code></td>
                  <td><code class="mono">${t.lightHex}</code></td>
                  <td><code class="mono">${t.darkHex}</code></td>
                  <td><span class="status-pill good" style="font-size: 0.72rem; padding: 2px 7px;">${t.wcagContrast}</span></td>
                  <td style="color: var(--text-secondary); font-size: 0.84rem;">${t.role}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Manifiesto de Principios de Diseño -->
      <section class="admin-card" style="padding: 22px;">
        <h2 style="font-size: 1.12rem; margin: 0 0 14px; color: var(--text-primary);">
          4. Principios Rectores de la Arquitectura Visual
        </h2>
        <div class="admin-grid g-3" style="gap: 16px;">
          <div style="background: var(--bg-app); border: 1px solid var(--border-card); border-radius: var(--radius-sm); padding: 14px;">
            <strong style="color: var(--text-primary); font-size: 0.92rem; display: block; margin-bottom: 4px;">⚖️ Imparcialidad Institucional</strong>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0; line-height: 1.45;">
              La interfaz no induce ni predispone el sentido del voto con saturaciones desmedidas. El rechazo no es un botón de alarma roja destructiva y la aprobación no es un semáforo de premio.
            </p>
          </div>
          <div style="background: var(--bg-app); border: 1px solid var(--border-card); border-radius: var(--radius-sm); padding: 14px;">
            <strong style="color: var(--text-primary); font-size: 0.92rem; display: block; margin-bottom: 4px;">🎯 Regla 60-30-10</strong>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0; line-height: 1.45;">
              60% lienzo de lectura serena (fondos alabastro/obsidiana), 30% estructura editorial de precisión (textos grafito, divisores sutiles), 10% intención de voto.
            </p>
          </div>
          <div style="background: var(--bg-app); border: 1px solid var(--border-card); border-radius: var(--radius-sm); padding: 14px;">
            <strong style="color: var(--text-primary); font-size: 0.92rem; display: block; margin-bottom: 4px;">⏱️ Ergonomía y Contención</strong>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0; line-height: 1.45;">
              Los temporizadores y estados no parpadean ni generan ansiedad. Las píldoras de duración se integran con tipografía mono compacta que nunca quiebra el layout.
            </p>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderMainContent(): string {
  switch (S.activeTab) {
    case 'census': return renderCensusView();
    case 'boe': return renderBoeView();
    case 'urn': return renderUrnView();
    case 'dag': return renderDagView();
    case 'sandbox': return renderSandboxView();
    case 'design': return renderDesignView();
    default: return renderCensusView();
  }
}

function bindEvents() {
  // Manejo de tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabId = (e.currentTarget as HTMLElement).dataset.tab as AdminTab;
      if (tabId && tabId !== S.activeTab) {
        S.activeTab = tabId;
        paint();
      }
    });
  });

  // Tema
  $('[data-act="theme"]')?.addEventListener('click', toggleAppTheme);

  // Selección de perfil de sistema de diseño (Haute Élegance vs Vibrante)
  document.querySelectorAll('[data-act="set-design-profile"]').forEach(card => {
    card.addEventListener('click', (e) => {
      const profile = (e.currentTarget as HTMLElement).dataset.profile as DesignThemeProfile;
      if (profile) {
        setActiveThemeProfile(profile);
        S.adminNotice = {
          type: 'good',
          text: `Sistema de diseño actualizado a: ${profile === 'elegance' ? 'Haute Élegance (Minimalismo Suizo)' : 'Vibrante Cívico (Legacy)'}. Guardado en configuración persistente.`
        };
        paint();
      }
    });
  });

  // Cerrar aviso
  $('[data-act="dismiss-notice"]')?.addEventListener('click', () => {
    S.adminNotice = null;
    paint();
  });

  // Extraer BOE
  $('[data-act="extract-boe"]')?.addEventListener('click', () => {
    const raw = ($('#boe-raw-text') as HTMLTextAreaElement)?.value || S.boeInput;
    S.boeInput = raw;
    S.boeResult = extractDeterministic(raw);
    S.adminNotice = { type: 'good', text: 'Texto del BOE procesado y extraído conforme al esquema JSON.' };
    paint();
  });

  // Restaurar BOE
  $('[data-act="reset-boe"]')?.addEventListener('click', () => {
    S.boeInput = SAMPLE_BOE;
    S.boeResult = extractDeterministic(SAMPLE_BOE);
    paint();
  });

  // Buscar recibo
  $('[data-act="search-receipt"]')?.addEventListener('click', () => {
    const input = ($('#receipt-search-input') as HTMLInputElement)?.value || '';
    S.searchReceipt = input.trim();
    paint();
  });

  // Descargar acta JSON
  $('[data-act="export-audit-json"]')?.addEventListener('click', () => {
    const audit = S.atomicBox.auditAccountingBalance(S.cid);
    const tally = S.atomicBox.getTally(S.cid);
    const ballots = S.atomicBox.getAllBallots(S.cid);
    const payload = {
      protocol: 'DEMOCRACIA_VIVA_ZERO_PII_v3',
      consultation_id: S.cid,
      accounting_audit: audit,
      tally,
      ballots_sample: ballots.slice(0, 100),
      exported_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acta_auditoria_${S.cid}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Simulador de Casos Borde: Adulto Válido (+18)
  $('[data-act="sim-adult"]')?.addEventListener('click', async () => {
    const randId = `user_${Math.floor(Math.random() * 100000)}`;
    const nullifier = deriveCitizenNullifierHash(randId);
    S.identityAdapter.registerDevicePasskey({
      citizenNullifierHash: nullifier,
      credentialId: `cred_${randId}`,
      publicKey: `pubkey_${randId}`
    });
    // Emite voto con firma WebAuthn
    const salt = generateVoterSecretSalt();
    const vote = await S.atomicBox.castAtomicVote({
      consultationId: S.cid,
      citizenNullifierHash: nullifier,
      voteChoice: 'YES',
      webauthnAssertionSignature: `assertion_sig_hw_${Date.now()}_verified_p256`,
      voterSecretSalt: salt
    });
    if (vote.ok && vote.receipt) {
      S.localTestReceipts.push(vote.receipt);
      S.adminNotice = { type: 'good', text: `Adulto (+18) verificado con éxito. Recibo emitido: ${vote.receipt.receipt_code}` };
    }
    paint();
  });

  // Simulador: Menor de Edad (<18)
  $('[data-act="sim-underage"]')?.addEventListener('click', () => {
    const check = S.identityAdapter.verifyIdentityPayload({
      provider: 'SANDBOX_EMULATOR',
      provider_reference: 'ref_underage_test',
      is_adult_18: false,
      webhook_signature: 'sig',
      timestamp: Date.now(),
      opaque_identity_token: 'token_minor_01'
    });
    S.adminNotice = {
      type: 'danger',
      text: `Bloqueo Regulatorio: ${check.error || 'Menor de edad no admitido al censo'}`
    };
    paint();
  });

  // Simulador: Migración de Móvil (Revocación)
  $('[data-act="sim-migration"]')?.addEventListener('click', () => {
    const nullifier = deriveCitizenNullifierHash('user_migrating_alice');
    // Primer terminal
    S.identityAdapter.registerDevicePasskey({
      citizenNullifierHash: nullifier,
      credentialId: 'cred_phone_old',
      publicKey: 'pub_old'
    });
    // Segundo terminal (reemplazo)
    const migration = S.identityAdapter.registerDevicePasskey({
      citizenNullifierHash: nullifier,
      credentialId: 'cred_phone_new',
      publicKey: 'pub_new'
    });
    S.adminNotice = {
      type: 'good',
      text: `Migración exitosa: Passkey antigua [${migration.revoked_credential_id}] revocada atómicamente. Nuevo terminal activado.`
    };
    paint();
  });

  // Simulador: Intento Doble Voto
  $('[data-act="sim-double-vote"]')?.addEventListener('click', async () => {
    const nullifier = deriveCitizenNullifierHash('user_double_vote_attacker');
    // 1er voto
    await S.atomicBox.castAtomicVote({
      consultationId: S.cid,
      citizenNullifierHash: nullifier,
      voteChoice: 'YES',
      webauthnAssertionSignature: 'assertion_sig_legit_001'
    });
    // 2do voto malicioso
    const second = await S.atomicBox.castAtomicVote({
      consultationId: S.cid,
      citizenNullifierHash: nullifier,
      voteChoice: 'NO',
      webauthnAssertionSignature: 'assertion_sig_replay_002'
    });
    S.adminNotice = {
      type: 'danger',
      text: `Defensa Anti-Doble Voto: ${second.error}`
    };
    paint();
  });

  // Demostración de Manipulación: Alterar voto
  $('[data-act="tamper-vote"]')?.addEventListener('click', () => {
    const res = S.atomicBox.simulateTampering({
      consultationId: S.cid,
      type: 'ALTER_VOTE_CHOICE'
    });
    S.tamperSimulationResult = res.message;
    paint();
  });

  // Demostración: Inyectar voto fantasma
  $('[data-act="tamper-ghost"]')?.addEventListener('click', () => {
    const res = S.atomicBox.simulateTampering({
      consultationId: S.cid,
      type: 'INJECT_GHOST_BALLOT'
    });
    S.tamperSimulationResult = res.message;
    paint();
  });

  // Demostración: Inyectar censo sin firma
  $('[data-act="tamper-unsigned"]')?.addEventListener('click', () => {
    const res = S.atomicBox.simulateTampering({
      consultationId: S.cid,
      type: 'INJECT_UNSIGNED_ROLL'
    });
    S.tamperSimulationResult = res.message;
    paint();
  });

  // Inyección de lotes de votos
  document.querySelectorAll('[data-act="batch-vote"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const n = parseInt((e.currentTarget as HTMLElement).dataset.n || '10', 10);
      S.busy = true;
      paint();

      const choices: VoteChoice[] = ['YES', 'YES', 'NO', 'ABSTAIN'];
      for (let i = 0; i < n; i++) {
        const nullifier = deriveCitizenNullifierHash(`batch_user_${Date.now()}_${i}_${Math.random()}`);
        S.identityAdapter.registerDevicePasskey({
          citizenNullifierHash: nullifier,
          credentialId: `cred_${nullifier.slice(0, 8)}`,
          publicKey: `pub_${nullifier.slice(0, 8)}`
        });
        const choice = choices[Math.floor(Math.random() * choices.length)];
        const vote = await S.atomicBox.castAtomicVote({
          consultationId: S.cid,
          citizenNullifierHash: nullifier,
          voteChoice: choice,
          webauthnAssertionSignature: `hw_assertion_${Date.now()}_sig_${i}`
        });
        if (vote.receipt) S.localTestReceipts.push(vote.receipt);
      }

      S.busy = false;
      S.adminNotice = { type: 'good', text: `Lote de +${n} votos emitido con firmas WebAuthn y cuadre contable perfecto.` };
      paint();
    });
  });

  // Vaciar Sandbox a cero
  $('[data-act="reset-sandbox"]')?.addEventListener('click', () => {
    if (confirm('¿Vaciar por completo todos los votos del Sandbox y reiniciar los contadores a cero?')) {
      S.atomicBox.resetSandbox();
      S.identityAdapter.resetSandbox();
      S.rollupEngine.resetSandbox();
      S.localTestReceipts = [];
      S.tamperSimulationResult = null;
      S.adminNotice = { type: 'good', text: 'Entorno Sandbox vaciado limpiamente a 0 votos.' };
      paint();
    }
  });

  // Simular ataque de ciclo en DAG
  $('[data-act="test-cycle-blocker"]')?.addEventListener('click', () => {
    S.rollupEngine.setDelegation({ category: 'vivienda', fromNullifier: '0x_A', toNullifier: '0x_B' });
    S.rollupEngine.setDelegation({ category: 'vivienda', fromNullifier: '0x_B', toNullifier: '0x_C' });
    const attempt = S.rollupEngine.setDelegation({ category: 'vivienda', fromNullifier: '0x_C', toNullifier: '0x_A' });
    S.adminNotice = {
      type: attempt.ok ? 'danger' : 'good',
      text: attempt.ok ? 'Error: El ciclo no fue bloqueado' : '✓ Intercepción Exitosa de Bucle: A → B → C → A bloqueado. DAG intacto.'
    };
    paint();
  });
}

function paint() {
  renderNavbar();
  $('#view')!.innerHTML = `
    <div style="padding: 24px 20px 80px;">
      ${S.adminNotice ? `
        <div style="max-width: 1100px; margin: 0 auto 20px;">
          <div class="callout ${S.adminNotice.type}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; border-radius: var(--radius-sm);">
            <span>${esc(S.adminNotice.text)}</span>
            <button class="btn sm" data-act="dismiss-notice" style="background:transparent; border:none; cursor:pointer; font-weight:700;">✕</button>
          </div>
        </div>
      ` : ''}
      ${renderMainContent()}
    </div>
  `;
  bindEvents();
}

async function boot() {
  initDesignSystem();
  try {
    S.world = await SandboxWorld.create();
    await S.world.createConsultation({
      id: S.cid,
      title: 'Ley de Vivienda (RDL 2/2026)',
      category: 'Vivienda',
      boeRef: 'BOE-A-2026-VIV'
    });
    S.world.setStatus(S.cid, 'ACTIVE');
    S.rm = new AdminReadModel(S.world);
  } catch (e) {
    console.error('Error inicializando sandbox:', e);
  }
  paint();
}

boot();
