/**
 * ZERO-TRUST COMMAND CENTER — capa de estado e interfaz (sin lógica criptográfica propia).
 * Todo dato proviene de `AdminReadModel` (agregados congelados) o de acciones explícitas del Sandbox.
 * Invariante: no existe ningún control para ver el voto de una persona ni para editar un escrutinio.
 */
import './admin.css';
import { SandboxWorld, AdminReadModel } from '../domain/civic/protocol.ts';
import type { Choice, Receipt, BlindTrace, VirtualCitizen, EnrollOutcome } from '../domain/civic/protocol.ts';
import { buildMerkleLevels, verifyMerkleProof } from '../domain/civic/crypto.ts';
import type { DnieScenario } from '../domain/civic/dnie.ts';
import type { PasskeySigner } from '../domain/civic/passkey.ts';
import { extract, extractDeterministic, SAMPLE_BOE } from './boe.ts';
import type { BoeExtraction, ExtractionSource } from './boe.ts';

type View = 'census' | 'boe' | 'urna' | 'dag' | 'lab';
const VIEWS: { id: View; label: string; title: string; lede: string }[] = [
  { id: 'census', label: 'Censo & Sybil', title: 'Censo y defensa Sybil', lede: 'Nullifiers activos, passkeys y cada intento de alta rechazado. Ningún dato personal llega a este panel.' },
  { id: 'boe', label: 'BOE & LLM Studio', title: 'Ingesta del BOE con LLM local', lede: 'Texto oficial a la izquierda, tarjeta móvil y monográfico a la derecha, extraídos con salida restringida por esquema.' },
  { id: 'urna', label: 'Urna & Merkle', title: 'Urna criptográfica y auditoría Merkle', lede: 'Ciclo de vida de consultas, escrutinio agregado, prueba de inclusión por recibo y sello RFC 3161.' },
  { id: 'dag', label: 'Delegación DAG', title: 'Grafo de democracia líquida', lede: 'Especialistas por área, pesos efectivos y prevención de bucles en un grafo acíclico dirigido.' },
  { id: 'lab', label: 'Sandbox Lab', title: 'Laboratorio Sandbox y Stress Lab', lede: 'Emulador de DNIe NFC, passkey virtual o real, simulador de votantes y traza del cegado criptográfico.' },
];
const CATEGORIES = ['Vivienda', 'Economía', 'Sanidad'];
const ICON = ['①', '②', '③', '④', '⑤'];

const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const short = (h: string, n = 12) => (h.length > n * 2 ? `${h.slice(0, n)}…${h.slice(-4)}` : h);
const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T | null;

interface State {
  world: SandboxWorld | null; rm: AdminReadModel | null; mode: 'SANDBOX' | 'PRODUCTION'; view: View; cid: string; category: string;
  receipts: Receipt[]; search: string; nfc: { scenario: DnieScenario; out: EnrollOutcome } | null; trace: BlindTrace | null; traceErr: string;
  passkeyMode: 'VIRTUAL' | 'REAL'; busy: boolean; batch: { log: string } | null; dagMsg: string;
  boeText: string; boeOut: { data: BoeExtraction; source: ExtractionSource; note: string }; useOllama: boolean; model: string; endpoint: string; boeMsg: string;
}
const S: State = {
  world: null, rm: null, mode: 'SANDBOX', view: 'census', cid: 'ley-vivienda', category: 'Vivienda',
  receipts: [], search: '', nfc: null, trace: null, traceErr: '', passkeyMode: 'VIRTUAL', busy: false, batch: null, dagMsg: '',
  boeText: SAMPLE_BOE, boeOut: { data: extractDeterministic(SAMPLE_BOE), source: 'DETERMINISTIC_FALLBACK', note: '' },
  useOllama: false, model: 'qwen2.5:7b', endpoint: 'http://localhost:11434', boeMsg: '',
};
const isSandbox = () => S.mode === 'SANDBOX';

/* ───────────── Shell ───────────── */
function renderShell() {
  $('#rail')!.innerHTML = `<div class="brand">Democracia Viva <small>ADMIN</small></div>` +
    VIEWS.map((v, i) => `<button class="nav-btn" data-act="nav" data-v="${v.id}" ${S.view === v.id ? 'aria-current="page"' : ''}><span class="idx">0${i + 1}</span><span>${v.label}</span><span class="kbd">${i + 1}</span></button>`).join('') +
    `<div class="rail-foot">Zero-Trust: este panel solo lee agregados. No puede revelar un voto individual ni modificar un recuento.</div>`;
  $('#topbar')!.className = `topbar ${isSandbox() ? 'sandbox' : ''}`;
  $('#topbar')!.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <span class="env-badge ${isSandbox() ? 'sandbox' : 'prod'}" id="env-badge"><i></i>${isSandbox() ? 'ENV: SANDBOX · SANDBOX SIMULATION ACTIVE' : 'ENV: PRODUCTION · SOLO LECTURA'}</span>
    </div>
    <div class="seg" role="group" aria-label="Entorno">
      <button data-act="mode" data-m="PRODUCTION" aria-pressed="${!isSandbox()}">Producción</button>
      <button data-act="mode" data-m="SANDBOX" aria-pressed="${isSandbox()}">Sandbox</button>
    </div>`;
}
function head(v: typeof VIEWS[number], extra = '') {
  return `<div class="page-head"><div><h1>${v.title}</h1><p class="lede">${v.lede}</p></div>${extra}</div>`;
}
function prodGuard(v: typeof VIEWS[number]) {
  return `${head(v)}<div class="empty"><h3>Backend de producción no conectado</h3>
    <p>Este despliegue no tiene backend de censo ni de urna. Para ver datos reales hay que conectar los servicios del §E de SPEC.md.</p>
    <p class="dim">Invariantes Zero-Trust activos: sin endpoint «¿qué votó X?», sin escritura sobre recuentos, sin mapa recibo → identidad.</p>
    <div class="btn-row" style="justify-content:center;margin-top:14px"><button class="btn primary" data-act="mode" data-m="SANDBOX">Cambiar a Sandbox</button></div></div>`;
}
function view(): string {
  const v = VIEWS.find((x) => x.id === S.view)!;
  if (!S.world) return `<div class="empty"><h3>Inicializando motor criptográfico…</h3><p>Generando claves RSA-2048 de firma ciega.</p></div>`;
  if (!isSandbox() && S.view !== 'boe') return prodGuard(v);
  return { census: censusView, boe: boeView, urna: urnaView, dag: dagView, lab: labView }[S.view](v);
}
function paint() {
  renderShell();
  $('#view')!.innerHTML = view();
  afterPaint();
}

/* ───────────── 01 Censo ───────────── */
const GROUPS: { label: string; match: (c: string) => boolean }[] = [
  { label: 'EF.SOD inválido', match: (c) => ['BAD_CSCA_CHAIN', 'BAD_SOD_SIGNATURE', 'SOD_HASH_MISMATCH', 'MRZ_INVALID'].includes(c) },
  { label: 'DG15 / replay', match: (c) => c === 'ACTIVE_AUTH_FAILED' || c.startsWith('NONCE_') },
  { label: 'Menores de 18', match: (c) => c === 'UNDER_18' },
  { label: 'DNI caducado', match: (c) => c === 'DOCUMENT_EXPIRED' },
  { label: 'Biometría', match: (c) => c === 'FACE_MISMATCH' },
  { label: 'Passkey', match: (c) => c.startsWith('PASSKEY_') || c.startsWith('ASSERTION_') || c === 'UNKNOWN_CREDENTIAL' },
  { label: 'Doble gasto', match: (c) => c.startsWith('DOUBLE_SPEND') },
  { label: 'Delegación', match: (c) => c === 'CYCLE_DETECTED' || c === 'UNKNOWN_DELEGATE' },
];
function rejectionChart(rej: Record<string, number>) {
  const rows = GROUPS.map((g) => ({ label: g.label, n: Object.entries(rej).filter(([c]) => g.match(c)).reduce((a, [, n]) => a + n, 0) }));
  const max = Math.max(1, ...rows.map((r) => r.n));
  const h = rows.length * 30 + 8;
  return `<svg viewBox="0 0 560 ${h}" width="100%" role="img" aria-label="Intentos de alta rechazados por causa">
    ${rows.map((r, i) => {
      const y = i * 30 + 4, w = Math.round((r.n / max) * 330);
      return `<text x="0" y="${y + 15}" fill="#a1a193" font-size="11">${esc(r.label)}</text>
      <rect x="140" y="${y + 4}" width="340" height="14" rx="3" fill="#23241f"/>
      <rect x="140" y="${y + 4}" width="${w}" height="14" rx="3" fill="${r.n ? '#eba43c' : '#23241f'}"><title>${r.n}</title></rect>
      <text x="492" y="${y + 15}" fill="${r.n ? '#efeee6' : '#77776c'}" font-size="12" font-weight="600">${r.n}</text>`;
    }).join('')}</svg>`;
}
function censusView(v: typeof VIEWS[number]) {
  const s = S.rm!.snapshot();
  const rejTotal = Object.values(s.census.rejections).reduce((a, b) => a + b, 0);
  const ids = S.world!.census.memberIds().slice(0, 8);
  return `${head(v)}
  <div class="grid g-kpi">
    <div class="card kpi good"><h2>Nullifiers activos (+18)</h2><div class="v">${s.census.activeNullifiers}</div><div class="s">1 DNI = 1 nullifier Argon2id</div></div>
    <div class="card kpi"><h2>Passkeys activas</h2><div class="v">${s.census.activePasskeys}</div><div class="s">invariante: = nullifiers</div></div>
    <div class="card kpi accent"><h2>Passkeys revocadas</h2><div class="v">${s.census.revokedPasskeys}</div><div class="s">cambios de dispositivo + admin</div></div>
    <div class="card kpi bad"><h2>Altas rechazadas</h2><div class="v">${rejTotal}</div><div class="s">PII destruida en ${s.census.lastWipeMs ? s.census.lastWipeMs.toFixed(1) : '—'} ms (objetivo &lt; 50)</div></div>
  </div>
  <div class="grid g-2" style="margin-top:14px">
    <section class="card"><div class="card-head"><h2>Rechazos por causa</h2><span class="tag am">ENV: SANDBOX</span></div>${rejectionChart(s.census.rejections)}</section>
    <section class="card"><div class="card-head"><h2>Gestión de revocaciones</h2></div>
      ${ids.length ? `<table><thead><tr><th>Nullifier</th><th>Estado</th><th></th></tr></thead><tbody>${ids.map((id) => `<tr><td class="hash">${id.slice(0, 16)}…</td><td><span class="tag ok">passkey activa</span></td><td><button class="btn sm danger" data-act="revoke" data-id="${id}">Revocar</button></td></tr>`).join('')}</tbody></table>` : `<div class="empty">Sin ciudadanos. Registra identidades desde el <a href="#" data-act="nav" data-v="lab" style="color:var(--amber)">Sandbox Lab</a>.</div>`}
    </section>
  </div>
  <section class="card" style="margin-top:14px"><div class="card-head"><h2>Registro de seguridad (sin PII)</h2><span class="dim" style="font-size:var(--fs-xs)">${s.security.length} últimos eventos</span></div>
    <div class="scroll"><table><thead><tr><th>#</th><th>Evento</th><th>Código</th><th>Ref.</th><th>Env</th></tr></thead><tbody>
    ${s.security.map((e) => `<tr><td class="mono dim">${e.seq}</td><td>${esc(e.type)}</td><td><span class="tag ${/REJECT|REVOK|REPLACED/.test(e.type) ? 'no' : 'ok'}">${esc(e.code ?? 'OK')}</span></td><td class="hash dim">${esc(e.ref ?? '—')}</td><td class="mono dim">${e.env}</td></tr>`).join('') || '<tr><td colspan="5" class="dim">Sin eventos todavía.</td></tr>'}
    </tbody></table></div></section>`;
}

/* ───────────── 02 BOE ───────────── */
function boePreview() {
  const d = S.boeOut.data;
  return `<div class="phone" aria-label="Previsualización de tarjeta móvil"><div class="pc">
      <span class="art">${esc(d.articulo_boe)}</span><h3>${esc(d.titulo)}</h3>
      <div class="kd">${d.datos_clave.map((k) => `<span>${esc(k.etiqueta)}</span><b>${esc(k.valor)}</b>`).join('') || '<span>Sin datos clave</span><b>—</b>'}</div>
      <div style="font-size:.78rem;font-weight:600">${esc(d.pregunta_voto)}</div></div>
    <div class="votes"><span class="y">A favor</span><span class="n">En contra</span><span class="d">Delegar</span></div></div>
    <div class="mono-box" style="margin-top:12px"><h4>Monográfico pedagógico · ${esc(d.categoria)}</h4>
      <p><b>Contexto.</b> ${esc(d.monografico.contexto)}</p><p><b>Qué cambia.</b> ${esc(d.monografico.que_cambia)}</p>
      <p><b>A favor.</b> ${esc(d.monografico.a_favor)}</p><p><b>En contra.</b> ${esc(d.monografico.en_contra)}</p></div>`;
}
function boeView(v: typeof VIEWS[number]) {
  return `${head(v)}
  <div class="grid g-3">
    <section class="card"><div class="card-head"><h2>Texto original BOE</h2><span class="tag">XML/PDF → texto</span></div>
      <label class="f"><span class="sr">Texto del BOE</span><textarea class="in" id="boe-text" spellcheck="false">${esc(S.boeText)}</textarea></label>
      <div class="grid" style="margin-top:10px;grid-template-columns:1fr 1fr">
        <label class="f">Endpoint Ollama<input class="in mono" id="boe-endpoint" value="${esc(S.endpoint)}"></label>
        <label class="f">Modelo<input class="in mono" id="boe-model" value="${esc(S.model)}"></label></div>
      <div class="btn-row" style="margin-top:10px">
        <button class="btn primary" data-act="boe-ollama">Extraer con Qwen 2.5 (Ollama)</button>
        <button class="btn" data-act="boe-det">Extractor determinista</button>
        <button class="btn good" data-act="boe-draft" ${isSandbox() ? '' : 'disabled'}>Crear consulta en borrador</button></div>
      <div id="boe-msg" style="margin-top:10px">${S.boeMsg ? `<div class="callout am">${esc(S.boeMsg)}</div>` : ''}</div></section>
    <section class="card"><div class="card-head"><h2>Salida estructurada</h2><span class="tag ${S.boeOut.source === 'DETERMINISTIC_FALLBACK' ? 'am' : 'ok'}" id="boe-src">${S.boeOut.source}</span></div>
      <pre class="in mono" id="boe-json" style="white-space:pre-wrap;margin:0;overflow:auto;max-height:520px">${esc(JSON.stringify(S.boeOut.data, null, 2))}</pre></section>
    <section class="card"><div class="card-head"><h2>Vista móvil en vivo</h2></div><div id="boe-preview">${boePreview()}</div></section>
  </div>`;
}

/* ───────────── 03 Urna ───────────── */
function merkleSvg(leaves: string[], hi: number): string {
  const levels = buildMerkleLevels(leaves);
  const W = 780, rowH = 62, H = levels.length * rowH + 20;
  const pos = levels.map((lv, l) => lv.map((_, i) => ({ x: (W / lv.length) * (i + 0.5) * 1, y: H - 28 - l * rowH })));
  let g = '';
  for (let l = 0; l < levels.length - 1; l++) levels[l].forEach((_, i) => {
    const p = pos[l][i], q = pos[l + 1][i >> 1], on = hi >= 0 && i === hi >> l;
    g += `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${on ? '#eba43c' : '#3c3d35'}" stroke-width="${on ? 2 : 1}"/>`;
  });
  levels.forEach((lv, l) => lv.forEach((h, i) => {
    const p = pos[l][i], on = hi >= 0 && i === hi >> l, root = l === levels.length - 1;
    g += `<g><circle cx="${p.x}" cy="${p.y}" r="${root ? 9 : 6}" fill="${root ? '#43c08f' : on ? '#eba43c' : '#23241f'}" stroke="${on ? '#eba43c' : '#55564c'}"><title>${h}</title></circle>${root ? `<text x="${p.x}" y="${p.y - 16}" text-anchor="middle" fill="#43c08f" font-size="11">Merkle_Root ${h.slice(0, 10)}…</text>` : ''}</g>`;
  }));
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Árbol de Merkle de ${leaves.length} hojas">${g}</svg>`;
}
function urnaView(v: typeof VIEWS[number]) {
  const w = S.world!, snap = S.rm!.snapshot();
  const cons = snap.consultations;
  const c = cons.find((x) => x.id === S.cid) ?? cons[0];
  S.cid = c.id;
  const t = c.tally, tot = Math.max(1, t.total.YES + t.total.NO + t.total.ABSTAIN);
  const box = w.boxes.get(c.id)!;
  const leaves = box.leafList();
  const q = S.search.trim().replace(/^#/, '');
  const chk = q ? S.rm!.checkReceipt(c.id, q) : null;
  let treeHtml: string;
  if (!leaves.length) treeHtml = `<div class="empty">Sin hojas. Emite votos desde el Sandbox Lab.</div>`;
  else if (leaves.length <= 32) treeHtml = merkleSvg(leaves, chk?.included ? chk.proof!.index : -1);
  else treeHtml = `<div class="callout am">Árbol de ${leaves.length} hojas — demasiado grande para dibujar completo. La prueba de inclusión (log₂ n = ${Math.ceil(Math.log2(leaves.length))} pasos) se muestra abajo al buscar un recibo.</div>`;
  const bar = (k: string, cls: string, n: number) => `<div class="bar"><span>${k}</span><div class="tr"><div class="fl ${cls}" style="width:${(n / tot) * 100}%"></div></div><b class="mono">${n}</b></div>`;
  const fin = c.finalization;
  return `${head(v)}
  <div class="grid g-kpi">${cons.map((x) => `<button class="card kpi ${x.id === c.id ? 'accent' : ''}" style="text-align:left;cursor:pointer" data-act="pick-c" data-id="${x.id}"><h2>${esc(x.category)} · <span style="color:${x.status === 'ACTIVE' ? 'var(--emerald)' : 'var(--mute)'}">${x.status === 'DRAFT' ? 'BORRADOR' : x.status === 'ACTIVE' ? 'ACTIVA' : 'CERRADA'}</span></h2><div class="v">${x.ballots}</div><div class="s">${esc(x.title)} · papeletas</div></button>`).join('')}</div>
  <div class="grid g-2" style="margin-top:14px">
    <section class="card"><div class="card-head"><h2>Escrutinio · ${esc(c.title)}</h2><span class="tag am">ENV: SANDBOX</span></div>
      ${bar('A favor', 'yes', t.total.YES)}${bar('En contra', 'no', t.total.NO)}${bar('Abstención', 'abs', t.total.ABSTAIN)}
      <p class="dim" style="font-size:var(--fs-xs);margin:10px 0">Secretos: ${t.secretBallots} · Delegados públicos (peso): ${t.publicWeight} · Peso perdido: ${t.lost} · Pendiente: ${t.pending} · Censo: ${t.census}</p>
      <div class="btn-row"><button class="btn good" data-act="status" data-s="ACTIVE" ${c.status === 'DRAFT' ? '' : 'disabled'}>Activar consulta</button>
      <button class="btn primary" data-act="status" data-s="CLOSED" ${c.status === 'ACTIVE' ? '' : 'disabled'}>Cerrar y sellar (RFC 3161)</button></div>
      <p class="dim" style="font-size:var(--fs-xs);margin:10px 0 0">No existe control para editar recuentos: el escrutinio solo se deriva de papeletas con firma ciega válida.</p></section>
    <section class="card"><div class="card-head"><h2>Sello de tiempo RFC 3161</h2>${fin ? '<span class="tag ok">ANCLADO</span>' : '<span class="tag">PENDIENTE</span>'}</div>
      ${fin ? `<table><tbody><tr><td class="dim">Merkle_Root</td><td class="hash">${fin.merkleRoot}</td></tr><tr><td class="dim">Hojas</td><td class="mono">${fin.leafCount}</td></tr><tr><td class="dim">genTime</td><td class="mono">${fin.timestamp.genTime}</td></tr><tr><td class="dim">Política</td><td class="mono">${fin.timestamp.policyOid}</td></tr><tr><td class="dim">Verificación</td><td><span class="tag ${w.tsa.verify(fin.timestamp, fin.merkleRoot) ? 'ok' : 'no'}">${w.tsa.verify(fin.timestamp, fin.merkleRoot) ? 'firma TSA válida' : 'INVÁLIDO'}</span></td></tr></tbody></table>
      <div class="callout am" style="margin-top:10px">TSA <b>simulada</b> con forma RFC 3161. En producción: TSA cualificada eIDAS detrás de la interfaz <span class="mono">TimestampAuthority</span>.</div>` : `<div class="empty" style="padding:24px">Se sella la raíz al cerrar la consulta.</div>`}</section>
  </div>
  <section class="card" style="margin-top:14px"><div class="card-head"><h2>Árbol de Merkle · raíz viva ${short(c.merkleRoot, 10)}</h2><span class="mono dim" style="font-size:var(--fs-xs)">${leaves.length} hojas</span></div>${treeHtml}</section>
  <section class="card" style="margin-top:14px"><div class="card-head"><h2>Verificar recibo #Receipt_Hash</h2></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><label class="f" style="flex:1;min-width:260px"><span class="sr">Recibo</span><input class="in mono" id="receipt-q" placeholder="#recibo (64 hex)" value="${esc(S.search)}"></label><button class="btn primary" data-act="search">Comprobar inclusión</button></div>
    ${chk ? (chk.included ? `<div class="callout ok" style="margin-top:10px">✓ Incluido en la raíz. Prueba de ${chk.proof!.steps.length} pasos verificada de forma independiente. No se revela el sentido del voto.</div>
      <table style="margin-top:8px"><thead><tr><th>Paso</th><th>Lado</th><th>Hash hermano</th></tr></thead><tbody>${chk.proof!.steps.map((s, i) => `<tr><td class="mono">${i + 1}</td><td class="mono">${s.position}</td><td class="hash">${s.hash}</td></tr>`).join('')}</tbody></table>` : `<div class="callout no" style="margin-top:10px">✗ Recibo no encontrado en esta urna.</div>`) : ''}
    <h2 style="margin:14px 0 6px">Últimos recibos (Sandbox)</h2><div class="scroll" style="max-height:140px">${S.receipts.slice(-12).reverse().map((r) => `<div class="hash" style="padding:2px 0"><a href="#" data-act="use-receipt" data-h="${r.receiptHash}" style="color:var(--paper)">#${r.receiptHash}</a></div>`).join('') || '<span class="dim">—</span>'}</div></section>`;
}

/* ───────────── 04 DAG ───────────── */
function dagSvg(edges: { from: string; to: string }[], specs: string[], weights: Map<string, number>) {
  const out = new Map(edges.map((e) => [e.from, e.to]));
  const nodes = new Set<string>([...specs, ...edges.flatMap((e) => [e.from, e.to])]);
  if (!nodes.size) return `<div class="empty">Sin delegaciones en «${esc(S.category)}». Lanza el Batch Simulator o una simulación de bucle.</div>`;
  const depth = new Map<string, number>();
  const d = (n: string, seen = new Set<string>()): number => { if (depth.has(n)) return depth.get(n)!; if (seen.has(n)) return 0; seen.add(n); const nx = out.get(n); const v = nx ? 1 + d(nx, seen) : 0; depth.set(n, v); return v; };
  nodes.forEach((n) => d(n));
  const maxD = Math.max(...depth.values());
  const cols: string[][] = Array.from({ length: maxD + 1 }, () => []);
  [...nodes].forEach((n) => cols[maxD - depth.get(n)!].push(n));
  const W = 860, rowH = 26, H = Math.max(180, Math.max(...cols.map((c) => c.length)) * rowH + 40);
  const P = new Map<string, { x: number; y: number }>();
  cols.forEach((c, ci) => c.sort().forEach((n, i) => P.set(n, { x: 50 + ci * ((W - 100) / Math.max(1, maxD)), y: 24 + i * ((H - 48) / Math.max(1, c.length - 1 || 1)) * (c.length > 1 ? 1 : 0) + (c.length === 1 ? (H - 48) / 2 : 0) })));
  const inc = new Map<string, number>(); edges.forEach((e) => inc.set(e.to, (inc.get(e.to) ?? 0) + 1));
  const lines = edges.map((e) => { const a = P.get(e.from)!, b = P.get(e.to)!; return `<path d="M${a.x},${a.y} C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x},${b.y}" fill="none" stroke="#55564c" stroke-width="1.2" opacity=".7"/>`; }).join('');
  const circles = [...nodes].map((n) => { const p = P.get(n)!, sp = specs.includes(n), r = sp ? 8 + Math.min(10, (inc.get(n) ?? 0)) : 5; return `<g><circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${sp ? '#eba43c' : '#23241f'}" stroke="${sp ? '#eba43c' : '#77776c'}"><title>${n}</title></circle>${sp ? `<text x="${p.x}" y="${p.y - r - 5}" text-anchor="middle" fill="#eba43c" font-size="10">${n.slice(0, 6)} · peso ${weights.get(n) ?? 1}</text>` : ''}</g>`; }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Grafo de delegación">${lines}${circles}</svg>`;
}
function dagView(v: typeof VIEWS[number]) {
  const g = S.rm!.graph(S.category);
  const c = S.rm!.snapshot().consultations.find((x) => x.category === S.category);
  const weights = new Map<string, number>();
  c?.tally.specialists.forEach((s) => weights.set(s.id.slice(0, 8), s.weight));
  const rows = (c?.tally.specialists ?? []).slice().sort((a, b) => b.weight - a.weight);
  return `${head(v, `<div class="seg" role="group" aria-label="Categoría">${CATEGORIES.map((k) => `<button data-act="cat" data-c="${k}" aria-pressed="${S.category === k}">${k}</button>`).join('')}</div>`)}
  <div class="grid g-2">
    <section class="card" style="grid-column:1/-1"><div class="card-head"><h2>Grafo · ${esc(S.category)} · ${g.edges.length} aristas</h2><span class="tag ok">DAG acíclico verificado por DFS</span></div>${dagSvg(g.edges, g.specialists, weights)}</section>
    <section class="card"><div class="card-head"><h2>Especialistas verificados</h2></div>
      <table><thead><tr><th>Especialista</th><th>Voto público</th><th>Peso</th></tr></thead><tbody>${rows.map((r) => `<tr><td class="hash">${r.id.slice(0, 10)}…</td><td><span class="tag ${r.choice === 'YES' ? 'ok' : r.choice === 'NO' ? 'no' : ''}">${r.choice}</span></td><td class="mono">${r.weight}</td></tr>`).join('') || `<tr><td colspan="3" class="dim">Sin votos públicos todavía.</td></tr>`}</tbody></table>
      <p class="dim" style="font-size:var(--fs-xs)">Los especialistas votan en público (su peso debe ser auditable); los ciudadanos, en secreto con firma ciega.</p></section>
    <section class="card"><div class="card-head"><h2>Prueba de bucle</h2></div>
      <p class="dim" style="font-size:var(--fs-xs);margin-top:0">Crea tres identidades y delegaciones A→B, B→C, C→A: la última debe rechazarse.</p>
      <div class="btn-row"><button class="btn primary" data-act="cycle-test" ${S.busy ? 'disabled' : ''}>Probar A → B → C → A</button></div>
      ${S.dagMsg ? `<div class="callout ${S.dagMsg.startsWith('✓') ? 'ok' : 'no'}" style="margin-top:10px">${esc(S.dagMsg)}</div>` : ''}</section>
  </div>`;
}

/* ───────────── 05 Lab ───────────── */
const SCENARIOS: { id: DnieScenario; label: string; hint: string; cls: string }[] = [
  { id: 'VALID_ADULT', label: 'Adulto válido (+18)', hint: 'Debe entrar', cls: 'good' },
  { id: 'MINOR', label: 'Menor de edad', hint: 'UNDER_18', cls: '' },
  { id: 'EXPIRED', label: 'DNI caducado', hint: 'DOCUMENT_EXPIRED', cls: '' },
  { id: 'DEVICE_CHANGE', label: 'Cambio de móvil', hint: 'Revoca el anterior', cls: '' },
  { id: 'FORGED', label: 'Firma falsa', hint: 'SOD_HASH_MISMATCH', cls: 'danger' },
  { id: 'REPLAY', label: 'Replay de AA', hint: 'ACTIVE_AUTH_FAILED', cls: 'danger' },
];
function labView(v: typeof VIEWS[number]) {
  const w = S.world!, cons = w.census.consultationList();
  const active = cons.filter((c) => c.status === 'ACTIVE');
  const nfc = S.nfc;
  const T = S.trace;
  const valid = w.citizens.filter((c) => c.scenario === 'VALID_ADULT' || c.scenario === 'DEVICE_CHANGE');
  return `${head(v, `<button class="btn danger" data-act="reset">Reset Sandbox State</button>`)}
  <div class="callout am" style="margin-bottom:14px">SANDBOX SIMULATION ACTIVE · todo registro lleva <span class="mono">ENV: SANDBOX</span>. Este mundo vive en la memoria de esta pestaña y es independiente del de la app ciudadana.</div>
  <div class="grid g-2">
    <section class="card"><div class="card-head"><h2>Emulador DNIe NFC (ICAO 9303)</h2><span class="tag">firmado con TEST_CSCA</span></div>
      <div class="btn-row">${SCENARIOS.map((s) => `<button class="btn ${s.cls}" data-act="nfc" data-s="${s.id}" title="${s.hint}" ${S.busy ? 'disabled' : ''}>${s.label}</button>`).join('')}</div>
      <div class="seg" style="margin-top:12px" role="group" aria-label="Passkey"><button data-act="pk" data-m="VIRTUAL" aria-pressed="${S.passkeyMode === 'VIRTUAL'}">Passkey virtual</button><button data-act="pk" data-m="REAL" aria-pressed="${S.passkeyMode === 'REAL'}">Biometría real</button></div>
      ${nfc ? `<h2 style="margin:16px 0 8px">Resultado · ${nfc.scenario}</h2><div class="callout ${nfc.out.ok ? 'ok' : 'no'}">${nfc.out.ok ? `✓ Alta aceptada${nfc.out.deviceReplaced ? ' · passkey anterior REVOCADA' : ''} · nullifier <span class="mono">${short(nfc.out.citizen!.nullifier, 8)}</span> · PII destruida en ${nfc.out.wipeMs!.toFixed(1)} ms` : `✗ Rechazado: <b class="mono">${nfc.out.code}</b>`}</div>
      ${nfc.out.steps.length ? `<ul class="steps" style="margin-top:10px">${nfc.out.steps.map((s) => `<li class="${s.ok ? 'ok' : 'no'}"><span class="mk">${s.ok ? '✓' : '✗'}</span><span>${esc(s.step)}</span></li>`).join('')}</ul>` : ''}` : ''}
    </section>
    <section class="card"><div class="card-head"><h2>Batch Vote Simulator</h2><span class="tag am">tráfico en vivo</span></div>
      <label class="f">Consulta<select class="in" id="batch-c">${active.map((c) => `<option value="${c.id}" ${c.id === S.cid ? 'selected' : ''}>${esc(c.title)}</option>`).join('') || '<option value="">(activa una consulta)</option>'}</select></label>
      <div class="btn-row" style="margin-top:10px">${[10, 50, 200].map((n) => `<button class="btn primary" data-act="batch" data-n="${n}" ${S.busy || !active.length ? 'disabled' : ''}>${n} votantes</button>`).join('')}</div>
      <div class="progress" style="margin-top:12px" role="progressbar" aria-label="Progreso"><i id="bp-bar"></i></div>
      <div class="dim" style="font-size:var(--fs-xs);margin:6px 0" id="bp-phase">${S.batch ? esc(S.batch.log) : 'Listo.'}</div>
      <div id="bp-live"></div></section>
    <section class="card" style="grid-column:1/-1"><div class="card-head"><h2>Inspector de firma ciega · paso a paso</h2></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end">
        <label class="f">Ciudadano<select class="in" id="tr-cit">${valid.map((c, i) => `<option value="${i}">${esc(c.label)} · ${c.nullifier.slice(0, 8)}</option>`).join('') || '<option value="">(registra un adulto válido)</option>'}</select></label>
        <label class="f">Consulta<select class="in" id="tr-c">${active.map((c) => `<option value="${c.id}">${esc(c.title)}</option>`).join('')}</select></label>
        <label class="f">Voto<select class="in" id="tr-ch"><option value="YES">A favor</option><option value="NO">En contra</option><option value="ABSTAIN">Abstención</option></select></label>
        <button class="btn primary" data-act="trace" ${valid.length && active.length ? '' : 'disabled'}>Votar y trazar</button></div>
      ${S.traceErr ? `<div class="callout no" style="margin-top:10px">Rechazado: <b class="mono">${esc(S.traceErr)}</b></div>` : ''}
      ${T ? `<table style="margin-top:12px"><tbody>
        <tr><td class="mono dim">1 · Cliente</td><td>Genera <b>serial</b> aleatorio (nunca sale del móvil en claro hacia el Censo)</td><td class="hash">${short(T.serial, 16)}</td></tr>
        <tr><td class="mono dim">2 · Cegado</td><td>m·rᵉ mod n con factor secreto <b>r</b> → el Censo no puede ver m</td><td class="hash">${short(T.blinded, 16)}</td></tr>
        <tr><td class="mono dim">3 · Censo firma</td><td>Estado previo <span class="tag am">${T.stateBefore}</span> · firma el valor cegado tras la passkey</td><td class="hash">${short(T.blindSignature, 16)}</td></tr>
        <tr><td class="mono dim">4 · Desenmascarado</td><td>s = s′·r⁻¹ mod n</td><td class="hash">${short(T.unblinded, 16)}</td></tr>
        <tr><td class="mono dim">5 · Verificación</td><td>sᵉ ≡ FDH(serial) mod n</td><td><span class="tag ${T.verified ? 'ok' : 'no'}">${T.verified ? 'válida' : 'inválida'}</span></td></tr>
        <tr><td class="mono dim">6 · Jitter</td><td>Retardo aleatorio antes de depositar</td><td class="mono">${T.jitterMs} ms</td></tr>
        <tr><td class="mono dim">7 · Hoja Merkle</td><td>H(consulta ‖ H(salt ‖ voto))</td><td class="hash">${short(T.leaf, 16)}</td></tr>
        <tr><td class="mono dim">8 · Recibo</td><td>Guárdalo: demuestra inclusión sin revelar el voto</td><td class="hash">#${short(T.receiptHash, 16)}</td></tr></tbody></table>` : ''}</section>
  </div>`;
}
function liveBatch(done = 0, total = 1, phase = '', lastReceipt?: Receipt) {
  const bar = $('#bp-bar'); if (bar) bar.style.width = `${(done / total) * 100}%`;
  const ph = $('#bp-phase'); if (ph) ph.textContent = `${phase} · ${done}/${total}`;
  const live = $('#bp-live'); if (!live || !S.world) return;
  const t = S.world.tally(S.cid), tot = Math.max(1, t.total.YES + t.total.NO + t.total.ABSTAIN);
  const bar2 = (k: string, cls: string, n: number) => `<div class="bar"><span>${k}</span><div class="tr"><div class="fl ${cls}" style="width:${(n / tot) * 100}%"></div></div><b class="mono">${n}</b></div>`;
  const root = S.world.boxes.get(S.cid)!.root();
  if (lastReceipt) S.receipts.push(lastReceipt);
  live.innerHTML = `${bar2('A favor', 'yes', t.total.YES)}${bar2('En contra', 'no', t.total.NO)}${bar2('Abst.', 'abs', t.total.ABSTAIN)}
    <div class="hash dim" style="margin-top:6px">hojas ${t.secretBallots} · Merkle_Root ${short(root, 14)}</div>
    <div class="hash" style="margin-top:4px">${S.receipts.slice(-3).reverse().map((r) => `#${short(r.receiptHash, 14)}`).join('<br>')}</div>`;
}

/* ───────────── Acciones ───────────── */
async function withBusy(fn: () => Promise<void>) { if (S.busy) return; S.busy = true; try { await fn(); } finally { S.busy = false; paint(); } }
async function pickPasskey(label: string): Promise<PasskeySigner | undefined> {
  if (S.passkeyMode !== 'REAL') return undefined;
  const { createPlatformPasskey } = await import('../domain/civic/passkey-platform.ts');
  return createPlatformPasskey(label);
}
const actions: Record<string, (el: HTMLElement) => void | Promise<void>> = {
  nav: (el) => { S.view = el.dataset.v as View; paint(); },
  mode: (el) => { S.mode = el.dataset.m as State['mode']; paint(); },
  revoke: (el) => { S.world!.census.revokePasskey(el.dataset.id!); paint(); },
  'pick-c': (el) => { S.cid = el.dataset.id!; paint(); },
  status: (el) => { S.world!.setStatus(S.cid, el.dataset.s as 'ACTIVE' | 'CLOSED'); paint(); },
  search: () => { S.search = ($('#receipt-q') as HTMLInputElement).value; paint(); },
  'use-receipt': (el) => { S.search = el.dataset.h!; paint(); },
  cat: (el) => { S.category = el.dataset.c!; paint(); },
  pk: (el) => { S.passkeyMode = el.dataset.m as State['passkeyMode']; paint(); },
  reset: async () => { await S.world!.reset(); await seed(); S.nfc = null; S.trace = null; S.receipts = []; S.batch = null; paint(); },
  nfc: (el) => withBusy(async () => {
    const w = S.world!, sc = el.dataset.s as DnieScenario;
    let reuse: VirtualCitizen | undefined;
    if (sc === 'DEVICE_CHANGE') {
      reuse = [...w.citizens].reverse().find((c) => c.scenario === 'VALID_ADULT' || c.scenario === 'DEVICE_CHANGE');
      if (!reuse) reuse = (await w.enroll('VALID_ADULT')).citizen;
    }
    try { S.nfc = { scenario: sc, out: await w.enroll(sc, { reuse, passkey: await pickPasskey(`DV ${sc}`) }) }; }
    catch (e) { S.nfc = { scenario: sc, out: { ok: false, code: 'PASSKEY_' + ((e as Error).name || 'ERROR'), steps: [] } }; }
  }),
  batch: (el) => withBusy(async () => {
    const cid = ($('#batch-c') as HTMLSelectElement).value; if (!cid) return;
    S.cid = cid; S.receipts = [];
    const n = Number(el.dataset.n);
    const started = performance.now();
    const out = await S.world!.batchSimulate(cid, n, { onProgress: (p) => liveBatch(p.done, p.total, p.phase, p.lastReceipt) });
    S.batch = { log: `${n} ciudadanos · ${out.stats.secretVotes} secretos · ${out.stats.delegations} delegaciones · ${out.stats.overrides} overrides · ${out.stats.publicVotes} públicos · ${out.stats.attacksBlocked} ataques bloqueados · ${((performance.now() - started) / 1000).toFixed(1)} s` };
  }),
  trace: async () => {
    const w = S.world!;
    const valid = w.citizens.filter((c) => c.scenario === 'VALID_ADULT' || c.scenario === 'DEVICE_CHANGE');
    const c = valid[Number(($('#tr-cit') as HTMLSelectElement).value)];
    const cid = ($('#tr-c') as HTMLSelectElement).value, ch = ($('#tr-ch') as HTMLSelectElement).value as Choice;
    const r = await w.castSecretVote(c, cid, ch, { jitter: true });
    if (r.ok) { S.trace = r.trace; S.traceErr = ''; S.receipts.push(r.receipt); S.cid = cid; } else { S.trace = null; S.traceErr = r.code; }
    paint();
  },
  'cycle-test': () => withBusy(async () => {
    const w = S.world!;
    const [A, B, C] = [(await w.enroll('VALID_ADULT')).citizen!, (await w.enroll('VALID_ADULT')).citizen!, (await w.enroll('VALID_ADULT')).citizen!];
    const r1 = await w.delegate(A, S.category, B), r2 = await w.delegate(B, S.category, C), r3 = await w.delegate(C, S.category, A);
    S.dagMsg = r1.ok && r2.ok && !r3.ok ? `✓ A→B y B→C aceptadas; C→A rechazada: ${(r3 as { code: string }).code}.` : '✗ FALLO: se aceptó un ciclo.';
  }),
  'boe-det': () => { S.boeOut = { data: extractDeterministic(S.boeText), source: 'DETERMINISTIC_FALLBACK', note: '' }; S.boeMsg = ''; paint(); },
  'boe-ollama': () => withBusy(async () => {
    S.endpoint = ($('#boe-endpoint') as HTMLInputElement).value; S.model = ($('#boe-model') as HTMLInputElement).value;
    S.boeOut = await extract(S.boeText, { endpoint: S.endpoint, model: S.model, useOllama: true });
    S.boeMsg = S.boeOut.note;
  }),
  'boe-draft': () => withBusy(async () => {
    const d = S.boeOut.data;
    const id = 'boe-' + d.titulo.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').slice(0, 24) + '-' + Date.now().toString(36).slice(-3);
    await S.world!.createConsultation({ id, title: d.titulo, category: CATEGORIES.includes(d.categoria) ? d.categoria : 'Vivienda', boeRef: d.articulo_boe });
    S.boeMsg = `Consulta «${d.titulo}» creada en BORRADOR. Actívala en Urna & Merkle.`;
  }),
};

async function seed() {
  const w = S.world!;
  await w.createConsultation({ id: 'ley-vivienda', title: 'Limitación de la actualización de rentas', category: 'Vivienda', boeRef: 'Art. 18' });
  await w.createConsultation({ id: 'ley-sanidad', title: 'Listas de espera máximas en atención primaria', category: 'Sanidad', boeRef: 'Art. 7' });
  await w.createConsultation({ id: 'ley-economia', title: 'Tope a comisiones por servicios básicos', category: 'Economía', boeRef: 'Art. 3' });
  w.setStatus('ley-vivienda', 'ACTIVE');
  S.rm = new AdminReadModel(w);
}
function afterPaint() {
  if (S.view === 'boe') {
    const ta = $('#boe-text') as HTMLTextAreaElement | null;
    ta?.addEventListener('input', () => {
      S.boeText = ta.value;
      S.boeOut = { data: extractDeterministic(S.boeText), source: 'DETERMINISTIC_FALLBACK', note: '' };
      $('#boe-preview')!.innerHTML = boePreview();
      $('#boe-json')!.textContent = JSON.stringify(S.boeOut.data, null, 2);
      const src = $('#boe-src'); if (src) { src.textContent = S.boeOut.source; src.className = 'tag am'; }
    });
  }
  if (S.view === 'lab' && S.world && S.world.boxes.has(S.cid)) liveBatch(S.batch ? 1 : 0, 1, S.batch ? 'Última simulación' : 'Listo');
  if (S.view === 'urna') $('#receipt-q')?.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') actions.search($('#receipt-q')!); });
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
  if (i >= 0 && i < VIEWS.length) { S.view = VIEWS[i].id; paint(); }
});

paint();
SandboxWorld.create({ rp: { rpId: location.hostname, origin: location.origin }, jitterMs: [120, 480] }).then(async (w) => { S.world = w; await seed(); paint(); (window as unknown as { __DV: unknown }).__DV = { S }; });
void verifyMerkleProof; void ICON;
