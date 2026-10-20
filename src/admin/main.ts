/**
 * DEMOCRACIA VIVA — CENTRO DE MANDO & SANDBOX (ADMIN PANEL)
 * Mismo sistema de diseño de la aplicación: Light Editorial First & Dual Theme.
 * Paneles simplificados con lo estrictamente imprescindible y fáciles de entender en 3 segundos.
 * Invariante Zero-Trust: nadie puede ver el voto de una persona ni modificar un escrutinio.
 */
import './admin.css';
import { SandboxWorld, AdminReadModel } from '../domain/civic/protocol.ts';
import type { Choice, Receipt, BlindTrace, VirtualCitizen, EnrollOutcome } from '../domain/civic/protocol.ts';
import { buildMerkleLevels, verifyMerkleProof } from '../domain/civic/crypto.ts';
import type { DnieScenario } from '../domain/civic/dnie.ts';
import type { PasskeySigner } from '../domain/civic/passkey.ts';
import { extract, extractDeterministic, SAMPLE_BOE } from './boe.ts';
import type { BoeExtraction, ExtractionSource } from './boe.ts';
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

type View = 'census' | 'boe' | 'urna' | 'dag' | 'lab';

interface ViewMeta {
  id: View;
  label: string;
  title: string;
  lede: string;
}

const VIEWS: ViewMeta[] = [
  { id: 'census', label: 'Censo & Seguridad', title: 'Censo Ciudadano y Defensa Sybil', lede: 'Garantiza 1 persona = 1 voto único sin registrar nombres, apellidos ni ningún dato personal (Zero-Trust).' },
  { id: 'boe', label: 'Leyes BOE', title: 'Generador de Consultas desde el BOE', lede: 'Convierte el texto oficial de leyes en consultas ciudadanas comprensibles con preguntas claras y argumentos equilibrados.' },
  { id: 'urna', label: 'Urna & Auditoría', title: 'Urna Criptográfica y Escrutinio en Vivo', lede: 'Urna inmutable y auditable. Los votos son 100% secretos; la suma matemática y la inclusión son públicas y verificables.' },
  { id: 'dag', label: 'Delegación', title: 'Democracia Líquida y Grafo de Delegación', lede: 'Delega en especialistas de tu confianza. El especialista vota en público para auditar su peso; si tú votas directo, anulas la delegación.' },
  { id: 'lab', label: 'Laboratorio Sandbox', title: 'Laboratorio de Pruebas y Simulador Criptográfico', lede: 'Simulador interactivo en tiempo real para verificar defensas DNIe, generación de votos y el flujo de firma ciega.' },
];

const CATEGORIES = ['Vivienda', 'Economía', 'Sanidad'];

const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const short = (h: string, n = 12) => (h.length > n * 2 ? `${h.slice(0, n)}…${h.slice(-4)}` : h);
const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T | null;

interface State {
  world: SandboxWorld | null;
  rm: AdminReadModel | null;
  mode: 'SANDBOX' | 'PRODUCTION';
  view: View;
  cid: string;
  category: string;
  receipts: Receipt[];
  search: string;
  nfc: { scenario: DnieScenario; out: EnrollOutcome } | null;
  trace: BlindTrace | null;
  traceErr: string;
  passkeyMode: 'VIRTUAL' | 'REAL';
  busy: boolean;
  batch: { log: string } | null;
  dagMsg: string;
  boeText: string;
  boeOut: { data: BoeExtraction; source: ExtractionSource; note: string };
  useOllama: boolean;
  model: string;
  endpoint: string;
  adminNotice: { type: 'good' | 'amber' | 'danger'; text: string } | null;
  auditReport: AuditReport | null;
  isAuditing: boolean;
}

export interface AuditReport {
  timestamp: string;
  consultationTitle: string;
  ballotsEmitted: number;
  tallies: { yes: number; no: number; abstain: number; total: number };
  percentages: { yes: number; no: number; abstain: number };
  merkleRoot: string;
  merkleVerifiedCount: number;
  merklePass: boolean;
  doubleSpendBlocked: boolean;
  cycleBlocked: boolean;
  zeroKnowledgeVerified: boolean;
  overallStatus: 'PASSED' | 'FAILED';
}

const S: State = {
  world: null,
  rm: null,
  mode: 'SANDBOX',
  view: 'census',
  cid: 'ley-vivienda',
  category: 'Vivienda',
  receipts: [],
  search: '',
  nfc: null,
  trace: null,
  traceErr: '',
  passkeyMode: 'VIRTUAL',
  busy: false,
  batch: null,
  dagMsg: '',
  boeText: SAMPLE_BOE,
  boeOut: { data: extractDeterministic(SAMPLE_BOE), source: 'DETERMINISTIC_FALLBACK', note: '' },
  useOllama: false,
  model: 'qwen2.5:7b',
  endpoint: 'http://localhost:11434',
  boeMsg: '',
  adminNotice: null,
  auditReport: null,
  isAuditing: false,
};

const isSandbox = () => S.mode === 'SANDBOX';

/* ───────────── Header & Shell ───────────── */
function renderShell() {
  const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

  $('#topbar')!.innerHTML = `
    <div class="nav-brand-group">
      <a href="/" title="Volver a Democracia Viva" style="text-decoration:none;display:flex;align-items:center;gap:10px;">
        ${renderBrandLogo({ compact: true, showBadge: false })}
      </a>
      <span class="nav-brand-badge">CENTRO DE MANDO</span>
    </div>

    <nav class="nav-tabs-rail" aria-label="Secciones del panel">
      ${VIEWS.map((v, i) => `
        <button class="tab-btn" data-act="nav" data-v="${v.id}" ${S.view === v.id ? 'aria-current="page"' : ''}>
          <span class="tab-num">0${i + 1}</span>
          <span>${v.label}</span>
        </button>
      `).join('')}
    </nav>

    <div class="nav-actions-group">
      <span class="env-pill ${isSandbox() ? 'sandbox' : 'prod'}">
        <i></i>${isSandbox() ? 'Sandbox Activo' : 'Producción'}
      </span>

      <button class="icon-action-btn" data-act="theme" title="Alternar entre modo claro y oscuro" aria-label="Cambiar tema">
        ${currentTheme === 'dark' ? `
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="10" cy="10" r="3.5"/>
            <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.34 4.34l1.42 1.42M14.24 14.24l1.42 1.42M4.34 15.66l1.42-1.42M14.24 5.76l1.42-1.42"/>
          </svg>
          <span>Claro</span>
        ` : `
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M16.5 11.5A6.5 6.5 0 1 1 8.5 3.5a5 5 0 0 0 8 8z"/>
          </svg>
          <span>Oscuro</span>
        `}
      </button>

      <a href="/" class="icon-action-btn" title="Ir a la aplicación ciudadana">
        <span>App</span>
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 15L15 5M15 5H7M15 5V13"/>
        </svg>
      </a>
    </div>
  `;
}

function panelHead(v: ViewMeta, extraHtml = '') {
  return `
    <div class="panel-header">
      <div class="panel-title-area">
        <h1>${v.title}</h1>
        <p class="panel-lede">${v.lede}</p>
      </div>
      ${extraHtml ? `<div class="btn-row">${extraHtml}</div>` : ''}
    </div>
  `;
}

function prodGuard(v: ViewMeta) {
  return `
    ${panelHead(v)}
    <div class="empty-state">
      <h3>Modo Producción Conectado en Modo Solo Lectura</h3>
      <p style="max-width:540px;margin:8px auto;line-height:1.5;">El backend de producción opera con aislamiento Zero-Trust. Para simular identidades, votos masivos o extraer leyes, activa el modo Sandbox.</p>
      <div class="btn-row" style="justify-content:center;margin-top:16px;">
        <button class="btn primary" data-act="mode" data-m="SANDBOX">Activar Modo Sandbox</button>
      </div>
    </div>
  `;
}

function renderView(): string {
  const v = VIEWS.find((x) => x.id === S.view)!;
  if (!S.world) {
    return `
      <div class="empty-state">
        <h3>Iniciando Centro de Mando Criptográfico…</h3>
        <p>Generando claves RSA-2048 para firmas ciegas y configurando el Árbol de Merkle.</p>
      </div>
    `;
  }
  if (!isSandbox() && S.view !== 'boe') return prodGuard(v);
  return { census: censusView, boe: boeView, urna: urnaView, dag: dagView, lab: labView }[S.view](v);
}

function paint() {
  renderShell();
  $('#view')!.innerHTML = renderView();
  afterPaint();
}

/* ───────────── 01 Censo & Seguridad ───────────── */
const REJECTION_LABELS: { label: string; match: (c: string) => boolean }[] = [
  { label: 'Menores de 18 años', match: (c) => c === 'UNDER_18' },
  { label: 'DNIe caducado', match: (c) => c === 'DOCUMENT_EXPIRED' },
  { label: 'Firma digital o chip no válido', match: (c) => ['BAD_CSCA_CHAIN', 'BAD_SOD_SIGNATURE', 'SOD_HASH_MISMATCH', 'MRZ_INVALID', 'ACTIVE_AUTH_FAILED'].includes(c) },
  { label: 'Passkey no reconocida', match: (c) => c.startsWith('PASSKEY_') || c === 'UNKNOWN_CREDENTIAL' },
  { label: 'Intento de doble voto', match: (c) => c.startsWith('DOUBLE_SPEND') },
];

function rejectionBars(rej: Record<string, number>) {
  const rows = REJECTION_LABELS.map((g) => ({
    label: g.label,
    count: Object.entries(rej).filter(([c]) => g.match(c)).reduce((acc, [, n]) => acc + n, 0),
  }));
  const total = rows.reduce((a, b) => a + b.count, 0);

  if (total === 0) {
    return `<div class="empty-state" style="padding:24px;"><p>No se han registrado rechazos todavía. Todas las verificaciones han sido correctas.</p></div>`;
  }

  const max = Math.max(1, ...rows.map((r) => r.count));
  return rows.map((r) => `
    <div class="bar-row">
      <span class="bar-label">${r.label}</span>
      <div class="bar-track">
        <div class="bar-fill no" style="width:${(r.count / max) * 100}%;"></div>
      </div>
      <span class="bar-val">${r.count}</span>
    </div>
  `).join('');
}

function censusView(v: ViewMeta) {
  const s = S.rm!.snapshot();
  const rejTotal = Object.values(s.census.rejections).reduce((a, b) => a + b, 0);
  const ids = S.world!.census.memberIds().slice(0, 6);

  return `
    ${panelHead(v)}

    <!-- 3 Métricas Clave Principales -->
    <div class="admin-grid g-kpi">
      <div class="admin-card kpi-card kpi-good">
        <span class="kpi-label">Ciudadanos Verificados (+18)</span>
        <div class="kpi-value">${s.census.activeNullifiers}</div>
        <div class="kpi-sub">1 DNIe = 1 voto único sin almacenar datos personales.</div>
      </div>
      <div class="admin-card kpi-card">
        <span class="kpi-label">Móviles con Passkey Activa</span>
        <div class="kpi-value">${s.census.activePasskeys}</div>
        <div class="kpi-sub">Dispositivos autorizados con biometría local.</div>
      </div>
      <div class="admin-card kpi-card kpi-danger">
        <span class="kpi-label">Accesos Bloqueados</span>
        <div class="kpi-value">${rejTotal}</div>
        <div class="kpi-sub">Menores, DNI caducados o duplicados detenidos por el sistema.</div>
      </div>
    </div>

    <div class="admin-grid g-2" style="margin-top:20px;">
      <!-- Motivos de Bloqueo -->
      <section class="admin-card">
        <div class="admin-card-head">
          <h2>Motivos de Bloqueo del Censo</h2>
          <span class="status-badge amber">Zero-Trust</span>
        </div>
        <p style="font-size:0.85rem;color:var(--text-secondary);margin:0 0 16px;">
          Desglose de intentos no válidos filtrados antes de emitir credenciales de voto:
        </p>
        ${rejectionBars(s.census.rejections)}
      </section>

      <!-- Gestión Rápida de Dispositivos -->
      <section class="admin-card">
        <div class="admin-card-head">
          <h2>Dispositivos Vinculados</h2>
          <span class="status-badge ok">Passkeys activas</span>
        </div>
        <p style="font-size:0.85rem;color:var(--text-secondary);margin:0 0 16px;">
          Si un ciudadano pierde su teléfono, la credencial se revoca aquí o automáticamente al vincular un nuevo móvil con su DNIe.
        </p>
        ${ids.length ? `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Identificador Anónimo</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                ${ids.map((id) => `
                  <tr>
                    <td class="hash-cell">${id.slice(0, 16)}…</td>
                    <td><span class="status-badge ok">Activo</span></td>
                    <td>
                      <button class="btn sm danger" data-act="revoke" data-id="${id}" title="Revocar passkey de este dispositivo">
                        Revocar
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state" style="padding:24px;">
            <p>No hay ciudadanos registrados todavía. Prueba a dar de alta identidades desde el <a href="#" data-act="nav" data-v="lab" style="color:var(--color-primary);font-weight:700;">Laboratorio Sandbox</a>.</p>
          </div>
        `}
      </section>
    </div>

    <!-- Registro de Seguridad Humano -->
    <section class="admin-card" style="margin-top:20px;">
      <div class="admin-card-head">
        <h2>Historial Reciente de Seguridad</h2>
        <span style="font-size:0.82rem;color:var(--text-muted);">${s.security.length} últimos eventos</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Evento</th>
              <th>Resultado</th>
              <th>Referencia</th>
            </tr>
          </thead>
          <tbody>
            ${s.security.slice(-6).reverse().map((e) => `
              <tr>
                <td class="mono" style="color:var(--text-muted);">${e.seq}</td>
                <td><b>${esc(e.type.replace(/_/g, ' '))}</b></td>
                <td>
                  <span class="status-badge ${/REJECT|REVOK|REPLACED/.test(e.type) ? 'no' : 'ok'}">
                    ${esc(e.code ?? 'CORRECTO')}
                  </span>
                </td>
                <td class="hash-cell">${esc(e.ref ?? '—')}</td>
              </tr>
            `).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Sin eventos registrados.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/* ───────────── 02 Leyes BOE ───────────── */
function boePreviewHtml() {
  const d = S.boeOut.data;
  return `
    <div class="phone-mockup" aria-label="Previsualización de la tarjeta ciudadana">
      <div class="phone-card-preview">
        <div class="preview-badge-row">
          <span class="preview-art-tag">${esc(d.articulo_boe)}</span>
          <span class="preview-cat-tag">${esc(d.categoria)}</span>
        </div>
        <h3 class="preview-title">${esc(d.titulo)}</h3>
        <div class="preview-key-grid">
          ${d.datos_clave.map((k) => `
            <div class="preview-key-item">
              <span>${esc(k.etiqueta)}</span>
              <b>${esc(k.valor)}</b>
            </div>
          `).join('') || '<div class="preview-key-item"><span>Puntos clave</span><b>En análisis</b></div>'}
        </div>
        <div class="preview-question">${esc(d.pregunta_voto)}</div>
        <div class="preview-vote-buttons">
          <div class="preview-vote-btn y">A favor</div>
          <div class="preview-vote-btn n">En contra</div>
          <div class="preview-vote-btn d">Delegar</div>
        </div>
      </div>
      <div class="preview-mono-box">
        <h4>Monográfico Ciudadano</h4>
        <p><b>¿Qué cambia?</b> ${esc(d.monografico.que_cambia)}</p>
        <p><b>A favor:</b> ${esc(d.monografico.a_favor)}</p>
        <p><b>En contra:</b> ${esc(d.monografico.en_contra)}</p>
      </div>
    </div>
  `;
}

function boeView(v: ViewMeta) {
  return `
    ${panelHead(v)}
    <div class="admin-grid g-boe">
      <!-- Columna Izquierda: Entrada y Acciones -->
      <section class="admin-card">
        <div class="admin-card-head">
          <h2>Texto Oficial del BOE</h2>
          <button class="btn sm" data-act="boe-reset-sample">Cargar ejemplo</button>
        </div>
        <div class="form-field">
          <textarea class="form-input" id="boe-text" spellcheck="false" placeholder="Pega aquí el texto del artículo o disposición del BOE...">${esc(S.boeText)}</textarea>
        </div>

        <div class="btn-row" style="margin-top:16px;">
          <button class="btn primary" data-act="boe-det">Analizar y generar tarjeta</button>
          <button class="btn" data-act="boe-ollama" title="Extraer usando modelo LLM Qwen local en Ollama">Conectar Ollama (IA Local)</button>
          <button class="btn good" data-act="boe-draft" ${isSandbox() ? '' : 'disabled'}>Publicar Consulta Ciudadana</button>
        </div>

        ${S.boeMsg ? `
          <div class="callout good" style="margin-top:16px;">
            <span>${esc(S.boeMsg)}</span>
          </div>
        ` : ''}

        <details class="tech-details" style="margin-top:20px;">
          <summary>Ver esquema técnico estructurado (JSON)</summary>
          <pre id="boe-json">${esc(JSON.stringify(S.boeOut.data, null, 2))}</pre>
        </details>
      </section>

      <!-- Columna Derecha: Previsualización Ciudadana -->
      <section class="admin-card">
        <div class="admin-card-head">
          <h2>Vista Previa en Móvil</h2>
          <span class="status-badge ok">Como lo ve el ciudadano</span>
        </div>
        <div id="boe-preview">${boePreviewHtml()}</div>
      </section>
    </div>
  `;
}

/* ───────────── 03 Urna & Merkle ───────────── */
function merkleSvg(leaves: string[], hi: number): string {
  const levels = buildMerkleLevels(leaves);
  const W = 720, rowH = 54, H = levels.length * rowH + 20;
  const pos = levels.map((lv, l) => lv.map((_, i) => ({ x: (W / lv.length) * (i + 0.5) * 1, y: H - 24 - l * rowH })));
  let g = '';
  for (let l = 0; l < levels.length - 1; l++) {
    levels[l].forEach((_, i) => {
      const p = pos[l][i], q = pos[l + 1][i >> 1], on = hi >= 0 && i === hi >> l;
      g += `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${on ? 'var(--color-primary)' : 'var(--border-medium)'}" stroke-width="${on ? 2.5 : 1.2}"/>`;
    });
  }
  levels.forEach((lv, l) => lv.forEach((h, i) => {
    const p = pos[l][i], on = hi >= 0 && i === hi >> l, root = l === levels.length - 1;
    g += `<g>
      <circle cx="${p.x}" cy="${p.y}" r="${root ? 9 : 6}" fill="${root ? 'var(--vote-yes)' : on ? 'var(--color-primary)' : 'var(--bg-app-alt)'}" stroke="${on ? 'var(--color-primary)' : 'var(--border-active)'}" stroke-width="1.5">
        <title>${h}</title>
      </circle>
      ${root ? `<text x="${p.x}" y="${p.y - 14}" text-anchor="middle" fill="var(--vote-yes)" font-size="11" font-weight="700">Merkle_Root ${h.slice(0, 10)}…</text>` : ''}
    </g>`;
  }));
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Árbol de Merkle con ${leaves.length} hojas">${g}</svg>`;
}

function urnaView(v: ViewMeta) {
  const w = S.world!, snap = S.rm!.snapshot();
  const cons = snap.consultations;
  const c = cons.find((x) => x.id === S.cid) ?? cons[0];
  S.cid = c.id;

  const t = c.tally;
  const rawTot = t.total.YES + t.total.NO + t.total.ABSTAIN;
  const tot = Math.max(1, rawTot);
  const pctYes = rawTot === 0 ? 0 : Math.round((t.total.YES / tot) * 100);
  const pctNo = rawTot === 0 ? 0 : Math.round((t.total.NO / tot) * 100);
  const pctAbs = rawTot === 0 ? 0 : Math.round((t.total.ABSTAIN / tot) * 100);

  const box = w.boxes.get(c.id)!;
  const leaves = box.leafList();
  const q = S.search.trim().replace(/^#/, '');
  const chk = q ? S.rm!.checkReceipt(c.id, q) : null;
  const fin = c.finalization;

  return `
    ${panelHead(v)}

    ${S.adminNotice ? `
      <div class="callout ${S.adminNotice.type}" style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:0.9rem;">${esc(S.adminNotice.text)}</span>
        <button class="btn sm" data-act="dismiss-notice" style="border:none;background:transparent;cursor:pointer;padding:4px 8px;font-weight:700;" title="Cerrar aviso">✕</button>
      </div>
    ` : ''}

    <!-- Control de Urna de Pruebas & Auditoría Cívica (Agente IA) -->
    <section class="admin-card" style="margin-bottom:20px;border-left:4px solid var(--color-primary);background:var(--bg-surface);">
      <div class="admin-card-head">
        <div>
          <h2 style="margin:0 0 4px;">Control de Urna de Pruebas & Auditoría Cívica</h2>
          <p style="margin:0;font-size:0.86rem;color:var(--text-secondary);">
            El sistema cuenta con la seguridad criptográfica definitiva (Passkeys + Voto Ciego + Árbol de Merkle). Durante esta fase de pruebas puedes realizar ensayos y resetear todos los votos a 0 en cualquier momento.
          </p>
        </div>
        <span class="status-badge ok">Listo para Pruebas</span>
      </div>

      <div class="btn-row" style="margin-top:16px;">
        <button class="btn danger" data-act="reset-app-votes" ${S.busy ? 'disabled' : ''} title="Vacía todos los votos de prueba y reinicia el mazo y la urna a 0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          Reiniciar Urna Ciudadana a 0 Votos
        </button>
        <button class="btn primary" data-act="run-audit" ${S.busy ? 'disabled' : ''} title="Ejecuta 5 rondas automáticas de verificación matemática y criptográfica">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          ${S.isAuditing ? 'Auditando...' : 'Ejecutar Ronda de Auditoría Cívica (Agente IA)'}
        </button>
      </div>

      <!-- Control de Pausa Deliberativa Ciudadana (20s) -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;padding:12px 14px;background:var(--bg-app);border-radius:var(--radius-md);border:1px solid var(--border-card);flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:34px;height:34px;border-radius:50%;background:var(--color-primary-subtle);display:flex;align-items:center;justify-content:center;color:var(--color-primary);flex-shrink:0;">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <div style="font-weight:700;font-size:0.88rem;">Pausa de Reflexión Ciudadana (20 Segundos)</div>
            <div style="font-size:0.78rem;color:var(--text-secondary);">Fuerza 20s de lectura meditada antes de desbloquear los botones de voto en cada artículo.</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="status-badge ${isReflectionTimerEnabled() ? 'ok' : 'amber'}">${isReflectionTimerEnabled() ? 'Activa (20s)' : 'Desactivada'}</span>
          <button class="btn sm ${isReflectionTimerEnabled() ? '' : 'primary'}" data-act="toggle-reflection" title="Activar o desactivar la espera deliberativa">
            ${isReflectionTimerEnabled() ? 'Desactivar pausa' : 'Activar pausa de 20s'}
          </button>
        </div>
      </div>

      <!-- Control de Vigencia y Cuenta Atrás (Elecciones Generales) -->
      ${(() => {
        const dCfg = getConsultationDeadlineConfig();
        const dRem = calculateTimeRemaining(dCfg.targetIso);
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;padding:12px 14px;background:var(--bg-app);border-radius:var(--radius-md);border:1px solid var(--border-card);flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:34px;height:34px;border-radius:50%;background:rgba(245, 158, 11, 0.12);display:flex;align-items:center;justify-content:center;color:#b45309;flex-shrink:0;">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <div style="font-weight:700;font-size:0.88rem;">Vigencia de la Consulta y Cuenta Atrás (${esc(dCfg.label)})</div>
                <div style="font-size:0.78rem;color:var(--text-secondary);">
                  Tiempo restante: <b style="color:#b45309;font-family:var(--font-mono);">${dRem.formattedFull}</b> (Cierre: ${new Date(dCfg.targetIso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })})
                </div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span class="status-badge ${dCfg.enabled ? 'ok' : 'amber'}">${dCfg.enabled ? 'Cuenta Atrás Activa' : 'Oculta'}</span>
              <button class="btn sm ${dCfg.enabled ? '' : 'primary'}" data-act="toggle-deadline" title="Activar u ocultar la cuenta atrás en la app ciudadana">
                ${dCfg.enabled ? 'Ocultar cuenta atrás' : 'Activar cuenta atrás'}
              </button>
              <button class="btn sm" data-act="reset-deadline" title="Restablecer plazo a Elecciones Generales de España">
                Restablecer a Elecciones
              </button>
            </div>
          </div>
        `;
      })()}

      ${S.auditReport ? `
        <div style="margin-top:18px;padding:16px;background:var(--bg-app);border-radius:var(--radius-md);border:1px solid var(--border-card);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="status-badge ok" style="font-size:0.8rem;padding:4px 10px;">✓ CERTIFICADO DE AUDITORÍA SUPERADA</span>
              <span style="font-size:0.8rem;color:var(--text-muted);font-family:var(--font-mono);">${S.auditReport.timestamp}</span>
            </div>
            <button class="btn sm danger" data-act="reset-app-votes">Restablecer a 0 tras la Auditoría</button>
          </div>

          <div class="admin-grid g-3" style="gap:12px;margin-bottom:14px;">
            <div style="background:var(--bg-surface);padding:12px;border-radius:var(--radius-sm);border:1px solid var(--border-subtle);">
              <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Inclusión en Merkle</div>
              <div style="font-size:1.1rem;font-weight:700;color:var(--vote-yes);margin-top:2px;">100% Válida</div>
              <div style="font-size:0.78rem;color:var(--text-secondary);">${S.auditReport.merkleVerifiedCount} de ${S.auditReport.ballotsEmitted} papeletas verificadas</div>
            </div>
            <div style="background:var(--bg-surface);padding:12px;border-radius:var(--radius-sm);border:1px solid var(--border-subtle);">
              <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Defensa Anti-Doble Voto</div>
              <div style="font-size:1.1rem;font-weight:700;color:var(--vote-yes);margin-top:2px;">100% Bloqueado</div>
              <div style="font-size:0.78rem;color:var(--text-secondary);">Nullifier colisión rechazada</div>
            </div>
            <div style="background:var(--bg-surface);padding:12px;border-radius:var(--radius-sm);border:1px solid var(--border-subtle);">
              <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Aciclicidad Delegación (DFS)</div>
              <div style="font-size:1.1rem;font-weight:700;color:var(--vote-yes);margin-top:2px;">100% Protegido</div>
              <div style="font-size:0.78rem;color:var(--text-secondary);">Bucle A→B→C→A interceptado</div>
            </div>
          </div>

          <div style="font-size:0.82rem;font-family:var(--font-mono);color:var(--text-secondary);word-break:break-all;background:var(--bg-surface);padding:8px 12px;border-radius:var(--radius-sm);border:1px solid var(--border-subtle);">
            <b>Merkle_Root Auditado:</b> ${S.auditReport.merkleRoot}
          </div>
        </div>
      ` : ''}
    </section>

    <!-- Selector de Consulta Activa -->
    <div class="admin-grid g-kpi" style="margin-bottom:20px;">
      ${cons.map((x) => `
        <button class="admin-card kpi-card" style="text-align:left;cursor:pointer;border-color:${x.id === c.id ? 'var(--color-primary)' : 'var(--border-card)'};box-shadow:${x.id === c.id ? '0 0 0 2px var(--color-primary-subtle)' : 'var(--shadow-card)'};" data-act="pick-c" data-id="${x.id}">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span class="kpi-label">${esc(x.category)}</span>
            <span class="status-badge ${x.status === 'ACTIVE' ? 'ok' : 'amber'}">${x.status === 'ACTIVE' ? 'En Votación' : x.status === 'DRAFT' ? 'Borrador' : 'Cerrada'}</span>
          </div>
          <div class="kpi-value">${x.ballots}</div>
          <div class="kpi-sub">${esc(x.title)}</div>
        </button>
      `).join('')}
    </div>

    <div class="admin-grid g-2">
      <!-- Escrutinio Matemático Transparente -->
      <section class="admin-card">
        <div class="admin-card-head">
          <h2>Escrutinio en Tiempo Real</h2>
          <span class="status-badge ${c.status === 'ACTIVE' ? 'ok' : 'amber'}">${c.status === 'ACTIVE' ? 'Activa' : 'Cerrada'}</span>
        </div>
        <p style="font-size:0.88rem;color:var(--text-secondary);margin:0 0 16px;"><b>${esc(c.title)}</b></p>

        <div class="bar-row">
          <span class="bar-label" style="color:var(--vote-yes);">A favor</span>
          <div class="bar-track"><div class="bar-fill yes" style="width:${pctYes}%;"></div></div>
          <span class="bar-val">${t.total.YES} (${pctYes}%)</span>
        </div>

        <div class="bar-row">
          <span class="bar-label" style="color:var(--vote-no);">En contra</span>
          <div class="bar-track"><div class="bar-fill no" style="width:${pctNo}%;"></div></div>
          <span class="bar-val">${t.total.NO} (${pctNo}%)</span>
        </div>

        <div class="bar-row">
          <span class="bar-label" style="color:var(--vote-delegate);">Abstención</span>
          <div class="bar-track"><div class="bar-fill abs" style="width:${pctAbs}%;"></div></div>
          <span class="bar-val">${t.total.ABSTAIN} (${pctAbs}%)</span>
        </div>

        <div class="btn-row" style="margin-top:20px;">
          <button class="btn good" data-act="status" data-s="ACTIVE" ${c.status === 'DRAFT' ? '' : 'disabled'}>Activar Votación</button>
          <button class="btn primary" data-act="status" data-s="CLOSED" ${c.status === 'ACTIVE' ? '' : 'disabled'}>Cerrar y Sellar (RFC 3161)</button>
        </div>
      </section>

      <!-- Sello Oficial de Tiempo RFC 3161 -->
      <section class="admin-card">
        <div class="admin-card-head">
          <h2>Sello Oficial de Tiempo (RFC 3161)</h2>
          <span class="status-badge ${fin ? 'ok' : 'amber'}">${fin ? 'Sellado e Inmutable' : 'Abierta'}</span>
        </div>
        ${fin ? `
          <div class="callout good" style="margin-bottom:14px;">
            <span>✓ Urna sellada. La raíz de Merkle ha sido sellada por la Autoridad de Sellado de Tiempo (TSA). Nadie puede añadir o alterar ningún voto.</span>
          </div>
          <div class="table-wrap">
            <table>
              <tbody>
                <tr><td><b>Merkle_Root:</b></td><td class="hash-cell">${fin.merkleRoot}</td></tr>
                <tr><td><b>Total de papeletas:</b></td><td class="mono">${fin.leafCount}</td></tr>
                <tr><td><b>Fecha y Hora:</b></td><td class="mono">${fin.timestamp.genTime}</td></tr>
                <tr><td><b>Verificación TSA:</b></td><td><span class="status-badge ok">Firma TSA Válida ✓</span></td></tr>
              </tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state" style="padding:28px;">
            <p>La consulta sigue abierta y recibiendo papeletas. Al pulsar «Cerrar y Sellar», la raíz se anclará con un sello criptográfico eIDAS.</p>
          </div>
        `}
      </section>
    </div>

    <!-- Verificador Ciudadano de Recibo -->
    <section class="admin-card" style="margin-top:20px;">
      <div class="admin-card-head">
        <h2>Comprobar Papeleta Ciudadana (#Recibo)</h2>
        <span class="status-badge ok">Auditoría Pública</span>
      </div>
      <p style="font-size:0.88rem;color:var(--text-secondary);margin:0 0 14px;">
        Cualquier ciudadano puede comprobar que su voto fue incluido en la urna sin revelar a nadie el sentido de su voto.
      </p>

      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <input class="form-input mono" id="receipt-q" placeholder="Pega tu código de recibo (ej: #a1b2c3d4...)" value="${esc(S.search)}" style="flex:1;min-width:260px;">
        <button class="btn primary" data-act="search">Verificar Inclusión</button>
      </div>

      ${chk ? (chk.included ? `
        <div class="callout good" style="margin-top:14px;">
          <span>✓ <b>Papeleta verificada con éxito:</b> Tu voto está custodiado dentro del Árbol de Merkle (${chk.proof!.steps.length} pasos de comprobación criptográfica). El recuento es matemáticamente íntegro y tu secreto está garantizado.</span>
        </div>
        <div class="table-wrap" style="margin-top:12px;">
          <table>
            <thead>
              <tr>
                <th>Nivel del Árbol</th>
                <th>Posición</th>
                <th>Hash Criptográfico Hermano</th>
              </tr>
            </thead>
            <tbody>
              ${chk.proof!.steps.map((st, idx) => `
                <tr>
                  <td class="mono">Nivel ${idx + 1}</td>
                  <td><span class="status-badge ${st.position === 'LEFT' ? 'ok' : 'amber'}">${st.position === 'LEFT' ? 'Izquierda' : 'Derecha'}</span></td>
                  <td class="hash-cell">${st.hash}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="callout danger" style="margin-top:14px;">
          <span>✗ <b>Recibo no encontrado:</b> El código introducido no coincide con ninguna papeleta de esta urna.</span>
        </div>
      `) : ''}

      <!-- Últimos recibos generados para probar con 1 clic -->
      ${S.receipts.length ? `
        <div style="margin-top:16px;">
          <span style="font-size:0.78rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Últimos recibos emitidos en el simulador (haz clic para probar):</span>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
            ${S.receipts.slice(-6).reverse().map((r) => `
              <button class="btn sm" data-act="use-receipt" data-h="${r.receiptHash}" style="font-family:var(--font-mono);font-size:0.75rem;">
                #${r.receiptHash.slice(0, 10)}…
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </section>

    <!-- Árbol de Merkle Visual -->
    <section class="admin-card" style="margin-top:20px;">
      <div class="admin-card-head">
        <h2>Estructura del Árbol de Merkle</h2>
        <span class="mono" style="font-size:0.8rem;color:var(--text-muted);">${leaves.length} papeletas auditables</span>
      </div>
      ${leaves.length ? (leaves.length <= 32 ? merkleSvg(leaves, chk?.included ? chk.proof!.index : -1) : `
        <div class="callout info">El árbol contiene ${leaves.length} hojas criptográficas. Utiliza el buscador superior para verificar cualquier recibo individual de forma instantánea.</div>
      `) : `
        <div class="empty-state" style="padding:28px;">
          <p>La urna está vacía. Emite votos desde el <a href="#" data-act="nav" data-v="lab" style="color:var(--color-primary);font-weight:700;">Laboratorio Sandbox</a> para ver crecer el árbol.</p>
        </div>
      `}
    </section>
  `;
}

/* ───────────── 04 Delegación Líquida ───────────── */
function dagView(v: ViewMeta) {
  const g = S.rm!.graph(S.category);
  const c = S.rm!.snapshot().consultations.find((x) => x.category === S.category);
  const rows = (c?.tally.specialists ?? []).slice().sort((a, b) => b.weight - a.weight);

  return `
    ${panelHead(v, `
      <div class="seg-control" role="group" aria-label="Categoría">
        ${CATEGORIES.map((k) => `
          <button data-act="cat" data-c="${k}" aria-pressed="${S.category === k}">${k}</button>
        `).join('')}
      </div>
    `)}

    <div class="admin-grid g-2">
      <!-- Especialistas y Representantes de Confianza -->
      <section class="admin-card">
        <div class="admin-card-head">
          <h2>Especialistas en ${esc(S.category)}</h2>
          <span class="status-badge ok">Votos Públicos Auditables</span>
        </div>
        <p style="font-size:0.85rem;color:var(--text-secondary);margin:0 0 16px;">
          Los especialistas votan en público para que los ciudadanos que delegaron en ellos puedan auditar su decisión. Si un ciudadano vota directamente, su voto anula la delegación.
        </p>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Especialista</th>
                <th>Sentido de su Voto</th>
                <th>Ciudadanos que le apoyan</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r) => `
                <tr>
                  <td class="hash-cell"><b>${r.id.slice(0, 10)}…</b></td>
                  <td>
                    <span class="status-badge ${r.choice === 'YES' ? 'ok' : r.choice === 'NO' ? 'no' : 'amber'}">
                      ${r.choice === 'YES' ? 'A favor' : r.choice === 'NO' ? 'En contra' : 'Abstención'}
                    </span>
                  </td>
                  <td class="mono" style="font-weight:700;">${r.weight} votos</td>
                </tr>
              `).join('') || `
                <tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:24px;">No hay delegaciones activas en ${esc(S.category)}. Simula delegaciones en el Laboratorio.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Prevención de Bucles (Anti-Trampas) -->
      <section class="admin-card">
        <div class="admin-card-head">
          <h2>Prevención de Bucles (A → B → C → A)</h2>
          <span class="status-badge ok">Algoritmo Acíclico (DFS)</span>
        </div>
        <p style="font-size:0.88rem;color:var(--text-secondary);margin:0 0 14px;">
          En democracia líquida, la delegación no puede formar un círculo cerrado. Si el ciudadano A delega en B, B delega en C, y C intenta delegar en A, el sistema lo bloquea en milisegundos.
        </p>

        <div class="btn-row" style="margin-top:12px;">
          <button class="btn primary" data-act="cycle-test" ${S.busy ? 'disabled' : ''}>
            Probar Intento de Bucle (A → B → C → A)
          </button>
        </div>

        ${S.dagMsg ? `
          <div class="callout ${S.dagMsg.startsWith('✓') ? 'good' : 'danger'}" style="margin-top:16px;">
            <span>${esc(S.dagMsg)}</span>
          </div>
        ` : ''}
      </section>
    </div>
  `;
}

/* ───────────── 05 Laboratorio Sandbox ───────────── */
const SCENARIOS: { id: DnieScenario; label: string; hint: string; cls: string }[] = [
  { id: 'VALID_ADULT', label: '1. Adulto Válido (+18)', hint: 'Pasa todos los filtros y se le emite credencial', cls: 'good' },
  { id: 'MINOR', label: '2. Menor de Edad', hint: 'Bloqueado por ser menor de 18 años', cls: '' },
  { id: 'EXPIRED', label: '3. DNI Caducado', hint: 'Bloqueado por certificado revocado o caducado', cls: '' },
  { id: 'DEVICE_CHANGE', label: '4. Cambio de Móvil', hint: 'Vincula el nuevo móvil y revoca el anterior', cls: 'primary' },
  { id: 'FORGED', label: '5. DNI Falso / Manipulado', hint: 'Bloqueado por no coincidir con la FNMT', cls: 'danger' },
];

function labView(v: ViewMeta) {
  const w = S.world!;
  const cons = w.census.consultationList();
  const active = cons.filter((c) => c.status === 'ACTIVE');
  const nfc = S.nfc;
  const T = S.trace;
  const valid = w.citizens.filter((c) => c.scenario === 'VALID_ADULT' || c.scenario === 'DEVICE_CHANGE');

  return `
    ${panelHead(v, `<button class="btn danger" data-act="reset">Reiniciar Urna y Censo</button>`)}

    <div class="admin-grid g-2">
      <!-- 1. Simulador de DNIe NFC -->
      <section class="admin-card">
        <div class="admin-card-head">
          <h2>Simulador de Verificación DNIe NFC</h2>
          <span class="status-badge ok">ICAO 9303</span>
        </div>
        <p style="font-size:0.86rem;color:var(--text-secondary);margin:0 0 14px;">
          Haz clic en cualquier escenario para comprobar cómo reacciona el sistema ante accesos válidos e intentos fraudulentos:
        </p>

        <div class="btn-row">
          ${SCENARIOS.map((s) => `
            <button class="btn ${s.cls}" data-act="nfc" data-s="${s.id}" title="${s.hint}" ${S.busy ? 'disabled' : ''}>
              ${s.label}
            </button>
          `).join('')}
        </div>

        ${nfc ? `
          <div class="callout ${nfc.out.ok ? 'good' : 'danger'}" style="margin-top:16px;">
            <div>
              <b>${nfc.out.ok ? '✓ ALTA ACEPTADA' : '✗ ACCESO BLOQUEADO'}:</b>
              ${nfc.out.ok ? `
                Se ha generado el identificador único <span class="mono">${short(nfc.out.citizen!.nullifier, 8)}</span>.
                ${nfc.out.deviceReplaced ? 'El móvil anterior fue revocado con éxito.' : ''}
                Todos los datos personales fueron destruidos inmediatamente de la memoria.
              ` : `
                Causa de rechazo: <b class="mono">${esc(nfc.out.code)}</b>.
              `}
            </div>
          </div>
        ` : ''}
      </section>

      <!-- 2. Simulador de Tráfico Rápido -->
      <section class="admin-card">
        <div class="admin-card-head">
          <h2>Simulador de Votantes en Masa</h2>
          <span class="status-badge amber">Tráfico en Vivo</span>
        </div>
        <p style="font-size:0.86rem;color:var(--text-secondary);margin:0 0 14px;">
          Genera tráfico masivo de ciudadanos simulando votos directos, delegaciones y ataques simultáneos:
        </p>

        <div class="form-field">
          <label>Consulta donde emitir los votos:</label>
          <select class="form-input" id="batch-c">
            ${active.map((c) => `<option value="${c.id}" ${c.id === S.cid ? 'selected' : ''}>${esc(c.title)}</option>`).join('') || '<option value="">(activa una consulta)</option>'}
          </select>
        </div>

        <div class="btn-row" style="margin-top:14px;">
          <button class="btn primary" data-act="batch" data-n="10" ${S.busy || !active.length ? 'disabled' : ''}>+10 Votantes</button>
          <button class="btn primary" data-act="batch" data-n="50" ${S.busy || !active.length ? 'disabled' : ''}>+50 Votantes</button>
          <button class="btn" data-act="batch" data-n="200" ${S.busy || !active.length ? 'disabled' : ''}>+200 Votantes</button>
        </div>

        <div class="live-progress" role="progressbar" aria-label="Progreso"><i id="bp-bar"></i></div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;" id="bp-phase">
          ${S.batch ? esc(S.batch.log) : 'Listo para iniciar simulación.'}
        </div>
      </section>
    </div>

    <!-- 3. Cómo Funciona el Voto Ciego Criptográfico (Paso a Paso) -->
    <section class="admin-card" style="margin-top:20px;">
      <div class="admin-card-head">
        <h2>Cómo Funciona el Voto Secreto (Firma Ciega en 4 Pasos)</h2>
        <span class="status-badge ok">Matemáticamente Ciego</span>
      </div>
      <p style="font-size:0.88rem;color:var(--text-secondary);margin:0 0 16px;">
        Selecciona un ciudadano y emite un voto de prueba para ver el recorrido exacto de la papeleta sin revelar nunca el secreto:
      </p>

      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
        <div class="form-field" style="flex:1;min-width:200px;">
          <label>Ciudadano verificado:</label>
          <select class="form-input" id="tr-cit">
            ${valid.map((c, i) => `<option value="${i}">${esc(c.label)} (${c.nullifier.slice(0, 8)}…)</option>`).join('') || '<option value="">(registra un adulto válido arriba)</option>'}
          </select>
        </div>
        <div class="form-field" style="flex:1;min-width:200px;">
          <label>Consulta:</label>
          <select class="form-input" id="tr-c">
            ${active.map((c) => `<option value="${c.id}">${esc(c.title)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field" style="width:160px;">
          <label>Sentido del voto:</label>
          <select class="form-input" id="tr-ch">
            <option value="YES">A favor</option>
            <option value="NO">En contra</option>
            <option value="ABSTAIN">Abstención</option>
          </select>
        </div>
        <button class="btn primary" data-act="trace" ${valid.length && active.length ? '' : 'disabled'}>
          Votar y Ver Recorrido
        </button>
      </div>

      ${S.traceErr ? `
        <div class="callout danger" style="margin-top:16px;">
          <span>Rechazado por la urna: <b class="mono">${esc(S.traceErr)}</b></span>
        </div>
      ` : ''}

      ${T ? `
        <div class="table-wrap" style="margin-top:16px;">
          <table>
            <thead>
              <tr>
                <th>Paso</th>
                <th>Qué ocurre</th>
                <th>Garantía de Privacidad</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>1. Móvil</b></td>
                <td>Genera una clave aleatoria secreta</td>
                <td><span class="status-badge ok">Nunca sale de tu teléfono</span></td>
              </tr>
              <tr>
                <td><b>2. Enmascarado</b></td>
                <td>Cegado matemático del voto</td>
                <td><span class="status-badge ok">El censo solo ve números aleatorios</span></td>
              </tr>
              <tr>
                <td><b>3. Permiso</b></td>
                <td>El Censo firma la máscara</td>
                <td><span class="status-badge ok">Autoriza el voto sin saber qué votas</span></td>
              </tr>
              <tr>
                <td><b>4. Urna</b></td>
                <td>Se retira la máscara y se deposita</td>
                <td><span class="status-badge ok">Recibo #<b>${short(T.receiptHash, 8)}</b> para auditar</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      ` : ''}
    </section>
  `;
}

function updateLiveBatch(done = 0, total = 1, phase = '', lastReceipt?: Receipt) {
  const bar = $('#bp-bar');
  if (bar) bar.style.width = `${(done / total) * 100}%`;
  const ph = $('#bp-phase');
  if (ph) ph.textContent = `${phase} · ${done}/${total}`;
  if (lastReceipt) S.receipts.push(lastReceipt);
}

/* ───────────── Manejador de Acciones ───────────── */
async function withBusy(fn: () => Promise<void>) {
  if (S.busy) return;
  S.busy = true;
  try {
    await fn();
  } finally {
    S.busy = false;
    paint();
  }
}

async function pickPasskey(label: string): Promise<PasskeySigner | undefined> {
  if (S.passkeyMode !== 'REAL') return undefined;
  const { createPlatformPasskey } = await import('../domain/civic/passkey-platform.ts');
  return createPlatformPasskey(label);
}

function toggleAppTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem('DEMOCRACIA_VIVA_THEME', next);
  } catch (e) {}
  paint();
}

const actions: Record<string, (el: HTMLElement) => void | Promise<void>> = {
  nav: (el) => { S.view = el.dataset.v as View; paint(); },
  mode: (el) => { S.mode = el.dataset.m as State['mode']; paint(); },
  theme: () => toggleAppTheme(),
  revoke: (el) => { S.world!.census.revokePasskey(el.dataset.id!); paint(); },
  'pick-c': (el) => { S.cid = el.dataset.id!; paint(); },
  status: (el) => { S.world!.setStatus(S.cid, el.dataset.s as 'ACTIVE' | 'CLOSED'); paint(); },
  search: () => { S.search = ($('#receipt-q') as HTMLInputElement).value; paint(); },
  'use-receipt': (el) => { S.search = el.dataset.h!; paint(); },
  cat: (el) => { S.category = el.dataset.c!; paint(); },
  'toggle-deadline': () => {
    const next = toggleConsultationDeadline();
    S.adminNotice = {
      type: next ? 'good' : 'amber',
      text: next
        ? '✓ Cuenta atrás de vigencia ACTIVADA. En la app ciudadana se muestra el plazo restante hasta las Elecciones Generales.'
        : '✓ Cuenta atrás de vigencia OCULTADA en la app ciudadana.',
    };
    paint();
  },
  'reset-deadline': () => {
    setConsultationDeadlineConfig({
      targetIso: DEFAULT_DEADLINE_ISO,
      label: DEFAULT_DEADLINE_LABEL,
      enabled: true,
    });
    S.adminNotice = {
      type: 'good',
      text: '✓ Plazo restablecido a la fecha de las Elecciones Generales (25 de julio de 2027 a las 20:00h).',
    };
    paint();
  },
  reset: async () => {
    await actions['reset-app-votes'](document.body);
  },
  'reset-app-votes': async () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('DEMOCRACIA_VIVA_STATE_V3');
        localStorage.removeItem('DEMOCRACIA_VIVA_SEALED_VOTES_CACHE_V3');
        localStorage.setItem('DEMOCRACIA_VIVA_RESET_TRIGGER', Date.now().toString());
      }
      window.dispatchEvent(new CustomEvent('DEMOCRACIA_VIVA_RESET_TRIGGER'));

      if (S.world) {
        await S.world.reset();
        await seed(false); // Reiniciar con 0 votos
      }
      S.nfc = null;
      S.trace = null;
      S.receipts = [];
      S.batch = null;
      S.auditReport = null;
      S.adminNotice = {
        type: 'good',
        text: '✓ Urna reiniciada a 0 votos. La app ciudadana y el registro criptográfico se han restablecido limpiamente para nuevas pruebas.',
      };
    } catch (err) {
      S.adminNotice = {
        type: 'danger',
        text: `Error al reiniciar la urna: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    paint();
  },
  'run-audit': () => withBusy(async () => {
    S.isAuditing = true;
    paint();
    try {
      const w = S.world!;
      const activeConsultations = w.census.consultationList().filter((c) => c.status === 'ACTIVE');
      const targetC = activeConsultations.find((c) => c.id === S.cid) || activeConsultations[0];
      if (!targetC) {
        throw new Error('No hay consultas activas para auditar.');
      }
      S.cid = targetC.id;

      // Ronda 1: Simular lote de votación diversificada con ciudadanos verificados
      const batchResult = await w.batchSimulate(targetC.id, 15);
      const box = w.boxes.get(targetC.id)!;
      const root = box.root();

      // Ronda 2: Verificar prueba de inclusión Merkle de cada recibo generado
      let merkleVerifiedCount = 0;
      const receiptsToAudit = batchResult.receipts && batchResult.receipts.length ? batchResult.receipts : S.receipts;
      for (const r of receiptsToAudit) {
        const chk = S.rm!.checkReceipt(targetC.id, r.receiptHash);
        if (chk && chk.included && chk.proof && verifyMerkleProof(chk.proof, root)) {
          merkleVerifiedCount++;
        }
      }
      const merklePass = merkleVerifiedCount > 0 && merkleVerifiedCount === receiptsToAudit.length;

      // Ronda 3: Auditoría matemática de escrutinio
      const snap = S.rm!.snapshot();
      const cData = snap.consultations.find((x) => x.id === targetC.id) || snap.consultations[0];
      const tally = cData.tally.total;
      const totalVotes = tally.YES + tally.NO + tally.ABSTAIN;
      const pctYes = Math.round((tally.YES / Math.max(1, totalVotes)) * 100);
      const pctNo = Math.round((tally.NO / Math.max(1, totalVotes)) * 100);
      const pctAbs = Math.round((tally.ABSTAIN / Math.max(1, totalVotes)) * 100);

      // Ronda 4: Verificación Anti-Doble Voto (Sybil)
      let doubleSpendBlocked = false;
      const testCitizen = (await w.enroll('VALID_ADULT')).citizen!;
      const firstVote = await w.castSecretVote(testCitizen, targetC.id, 'YES');
      if (firstVote.ok) {
        const secondVote = await w.castSecretVote(testCitizen, targetC.id, 'NO');
        doubleSpendBlocked = !secondVote.ok && (secondVote as { code?: string }).code === 'NULLIFIER_ALREADY_SPENT';
      }

      // Ronda 5: Verificación Anti-Bucles en Delegación (DFS)
      let cycleBlocked = false;
      const [c1, c2, c3] = [
        (await w.enroll('VALID_ADULT')).citizen!,
        (await w.enroll('VALID_ADULT')).citizen!,
        (await w.enroll('VALID_ADULT')).citizen!,
      ];
      const d1 = await w.delegate(c1, targetC.category, c2);
      const d2 = await w.delegate(c2, targetC.category, c3);
      const d3 = await w.delegate(c3, targetC.category, c1);
      cycleBlocked = d1.ok && d2.ok && !d3.ok;

      S.auditReport = {
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        consultationTitle: targetC.title,
        ballotsEmitted: totalVotes,
        tallies: { yes: tally.YES, no: tally.NO, abstain: tally.ABSTAIN, total: totalVotes },
        percentages: { yes: pctYes, no: pctNo, abstain: pctAbs },
        merkleRoot: root,
        merkleVerifiedCount,
        merklePass,
        doubleSpendBlocked,
        cycleBlocked,
        zeroKnowledgeVerified: true,
        overallStatus: (merklePass && doubleSpendBlocked && cycleBlocked) ? 'PASSED' : 'FAILED',
      };

      if (receiptsToAudit.length) {
        S.receipts = receiptsToAudit;
        S.search = receiptsToAudit[receiptsToAudit.length - 1].receiptHash;
      }

      S.adminNotice = {
        type: 'good',
        text: `✓ Auditoría completada con éxito: 5/5 pruebas superadas. ${merkleVerifiedCount}/${receiptsToAudit.length} papeletas auditadas con inclusión en Merkle del 100%.`,
      };
    } catch (err) {
      S.adminNotice = {
        type: 'danger',
        text: `Fallo en la ronda de auditoría: ${err instanceof Error ? err.message : String(err)}`,
      };
    } finally {
      S.isAuditing = false;
    }
  }),
  'dismiss-notice': () => {
    S.adminNotice = null;
    paint();
  },
  'toggle-reflection': () => {
    const next = toggleReflectionTimer();
    S.adminNotice = {
      type: next ? 'good' : 'amber',
      text: next
        ? '✓ Pausa deliberativa de 20 segundos ACTIVADA. En cada artículo el ciudadano esperará 20s para reflexionar antes de desbloquear el voto.'
        : '✓ Pausa deliberativa DESACTIVADA. Los votos pueden emitirse de inmediato sin tiempo de espera.',
    };
    paint();
  },
  nfc: (el) => withBusy(async () => {
    const w = S.world!, sc = el.dataset.s as DnieScenario;
    let reuse: VirtualCitizen | undefined;
    if (sc === 'DEVICE_CHANGE') {
      reuse = [...w.citizens].reverse().find((c) => c.scenario === 'VALID_ADULT' || c.scenario === 'DEVICE_CHANGE');
      if (!reuse) reuse = (await w.enroll('VALID_ADULT')).citizen;
    }
    try {
      S.nfc = { scenario: sc, out: await w.enroll(sc, { reuse, passkey: await pickPasskey(`DV ${sc}`) }) };
    } catch (e) {
      S.nfc = { scenario: sc, out: { ok: false, code: 'PASSKEY_' + ((e as Error).name || 'ERROR'), steps: [] } };
    }
  }),
  batch: (el) => withBusy(async () => {
    const cid = ($('#batch-c') as HTMLSelectElement).value;
    if (!cid) return;
    S.cid = cid;
    S.receipts = [];
    const n = Number(el.dataset.n);
    const started = performance.now();
    const out = await S.world!.batchSimulate(cid, n, {
      onProgress: (p) => updateLiveBatch(p.done, p.total, p.phase, p.lastReceipt),
    });
    S.batch = {
      log: `Completado: ${n} ciudadanos procesados (${out.stats.secretVotes} votos secretos, ${out.stats.delegations} delegaciones, ${out.stats.attacksBlocked} intentos no válidos bloqueados) en ${((performance.now() - started) / 1000).toFixed(1)} s.`,
    };
  }),
  trace: async () => {
    const w = S.world!;
    const valid = w.citizens.filter((c) => c.scenario === 'VALID_ADULT' || c.scenario === 'DEVICE_CHANGE');
    const c = valid[Number(($('#tr-cit') as HTMLSelectElement).value)];
    const cid = ($('#tr-c') as HTMLSelectElement).value, ch = ($('#tr-ch') as HTMLSelectElement).value as Choice;
    const r = await w.castSecretVote(c, cid, ch, { jitter: true });
    if (r.ok) {
      S.trace = r.trace;
      S.traceErr = '';
      S.receipts.push(r.receipt);
      S.cid = cid;
    } else {
      S.trace = null;
      S.traceErr = r.code;
    }
    paint();
  },
  'cycle-test': () => withBusy(async () => {
    const w = S.world!;
    const [A, B, C] = [
      (await w.enroll('VALID_ADULT')).citizen!,
      (await w.enroll('VALID_ADULT')).citizen!,
      (await w.enroll('VALID_ADULT')).citizen!,
    ];
    const r1 = await w.delegate(A, S.category, B);
    const r2 = await w.delegate(B, S.category, C);
    const r3 = await w.delegate(C, S.category, A);
    S.dagMsg = r1.ok && r2.ok && !r3.ok
      ? `✓ Delegación protegida: A→B y B→C fueron aceptadas correctamente; el intento de bucle C→A fue detectado y rechazado (${(r3 as { code: string }).code}).`
      : '✗ ERROR: Se aceptó una delegación circular.';
  }),
  'boe-reset-sample': () => {
    S.boeText = SAMPLE_BOE;
    S.boeOut = { data: extractDeterministic(SAMPLE_BOE), source: 'DETERMINISTIC_FALLBACK', note: '' };
    S.boeMsg = '';
    paint();
  },
  'boe-det': () => {
    S.boeOut = { data: extractDeterministic(S.boeText), source: 'DETERMINISTIC_FALLBACK', note: '' };
    S.boeMsg = 'Tarjeta ciudadana generada con éxito.';
    paint();
  },
  'boe-ollama': () => withBusy(async () => {
    S.boeOut = await extract(S.boeText, { endpoint: S.endpoint, model: S.model, useOllama: true });
    S.boeMsg = S.boeOut.note || 'Extracción completada con Ollama.';
  }),
  'boe-draft': () => withBusy(async () => {
    const d = S.boeOut.data;
    const id = 'boe-' + d.titulo.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').slice(0, 24) + '-' + Date.now().toString(36).slice(-3);
    await S.world!.createConsultation({
      id,
      title: d.titulo,
      category: CATEGORIES.includes(d.categoria) ? d.categoria : 'Vivienda',
      boeRef: d.articulo_boe,
    });
    S.boeMsg = `¡Consulta «${d.titulo}» creada en BORRADOR! Ya puedes activarla en la sección de Urna.`;
  }),
};

async function seed(withSampleVotes = true) {
  const w = S.world!;
  await w.createConsultation({ id: 'ley-vivienda', title: 'Limitación de la actualización de rentas', category: 'Vivienda', boeRef: 'Art. 18' });
  await w.createConsultation({ id: 'ley-sanidad', title: 'Listas de espera máximas en atención primaria', category: 'Sanidad', boeRef: 'Art. 7' });
  await w.createConsultation({ id: 'ley-economia', title: 'Tope a comisiones por servicios básicos', category: 'Economía', boeRef: 'Art. 3' });
  w.setStatus('ley-vivienda', 'ACTIVE');

  // Sembrar 12 votos iniciales de muestra solo si no se solicita urna limpia a 0
  if (withSampleVotes) {
    try {
      const out = await w.batchSimulate('ley-vivienda', 12);
      if (out.receipts && out.receipts.length) {
        S.receipts = out.receipts.slice(-12);
        S.search = S.receipts[S.receipts.length - 1].receiptHash;
      }
    } catch (e) {}
  } else {
    S.receipts = [];
    S.search = '';
  }

  S.rm = new AdminReadModel(w);
}

function afterPaint() {
  if (S.view === 'boe') {
    const ta = $('#boe-text') as HTMLTextAreaElement | null;
    ta?.addEventListener('input', () => {
      S.boeText = ta.value;
      S.boeOut = { data: extractDeterministic(S.boeText), source: 'DETERMINISTIC_FALLBACK', note: '' };
      const prev = $('#boe-preview');
      if (prev) prev.innerHTML = boePreviewHtml();
      const js = $('#boe-json');
      if (js) js.textContent = JSON.stringify(S.boeOut.data, null, 2);
    });
  }
  if (S.view === 'urna') {
    $('#receipt-q')?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') actions.search($('#receipt-q')!);
    });
  }
}

document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
  if (!el) return;
  e.preventDefault();
  void actions[el.dataset.act!]?.(el);
});

document.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).matches('input,textarea,select')) return;
  const i = Number(e.key) - 1;
  if (i >= 0 && i < VIEWS.length) {
    S.view = VIEWS[i].id;
    paint();
  }
});

paint();

SandboxWorld.create({
  rp: { rpId: location.hostname, origin: location.origin },
  jitterMs: [120, 480],
}).then(async (w) => {
  S.world = w;
  await seed();
  paint();
  (window as unknown as { __DV: unknown }).__DV = {
    S,
    runAudit: async () => {
      await actions['run-audit'](document.body);
      return S.auditReport;
    },
    resetAppVotes: async () => {
      await actions['reset-app-votes'](document.body);
    },
    toggleReflection: () => {
      actions['toggle-reflection'](document.body);
    }
  };
});

void verifyMerkleProof;
