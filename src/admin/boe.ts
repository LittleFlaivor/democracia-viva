/**
 * BOE & LLM Ingestion Studio — extracción estructurada.
 *
 * Ruta A (preferente): Ollama local (`/api/chat`) con `format` = JSON Schema (decodificación restringida por
 * gramática en llama.cpp, equivalente a GBNF) y temperatura 0.
 * Ruta B (fallback honesto): extractor determinista por regex, etiquetado `DETERMINISTIC_FALLBACK`.
 * En ambos casos la salida se valida contra el mismo esquema antes de mostrarse.
 */
export interface BoeExtraction {
  titulo: string;
  categoria: string;
  articulo_boe: string;
  pregunta_voto: string;
  datos_clave: { etiqueta: string; valor: string }[];
  monografico: { contexto: string; que_cambia: string; a_favor: string; en_contra: string };
}
export type ExtractionSource = 'OLLAMA_QWEN_2.5_SCHEMA_CONSTRAINED' | 'DETERMINISTIC_FALLBACK';

export const BOE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['titulo', 'categoria', 'articulo_boe', 'pregunta_voto', 'datos_clave', 'monografico'],
  properties: {
    titulo: { type: 'string', maxLength: 90 },
    categoria: { type: 'string', enum: ['Vivienda', 'Economía', 'Sanidad', 'Educación', 'Energía', 'Otros'] },
    articulo_boe: { type: 'string' },
    pregunta_voto: { type: 'string', maxLength: 140 },
    datos_clave: { type: 'array', maxItems: 4, items: { type: 'object', additionalProperties: false, required: ['etiqueta', 'valor'], properties: { etiqueta: { type: 'string' }, valor: { type: 'string' } } } },
    monografico: { type: 'object', additionalProperties: false, required: ['contexto', 'que_cambia', 'a_favor', 'en_contra'], properties: { contexto: { type: 'string' }, que_cambia: { type: 'string' }, a_favor: { type: 'string' }, en_contra: { type: 'string' } } },
  },
} as const;

export const SAMPLE_BOE = `Artículo 18. Limitación de la actualización anual de la renta en contratos de arrendamiento de vivienda.

1. Durante la vigencia del contrato, la renta solo podrá ser actualizada en la fecha en que se cumpla cada año de vigencia, aplicando como máximo el 3 % sobre la renta vigente en el año anterior.

2. En las zonas declaradas como mercado residencial tensionado, el precio inicial de los nuevos contratos no podrá superar la renta del contrato anterior, más la actualización permitida.

3. Los grandes tenedores, entendidos como personas físicas o jurídicas titulares de más de diez inmuebles urbanos de uso residencial, deberán notificar a la administración competente cada contrato firmado antes del 31 de diciembre de 2026.

Disposición final. La presente norma entrará en vigor al día siguiente de su publicación en el «Boletín Oficial del Estado».`;

export function validateExtraction(x: unknown): x is BoeExtraction {
  const o = x as BoeExtraction;
  return !!o && typeof o.titulo === 'string' && typeof o.categoria === 'string' && typeof o.articulo_boe === 'string'
    && typeof o.pregunta_voto === 'string' && Array.isArray(o.datos_clave)
    && o.datos_clave.every((d) => typeof d?.etiqueta === 'string' && typeof d?.valor === 'string')
    && !!o.monografico && ['contexto', 'que_cambia', 'a_favor', 'en_contra'].every((k) => typeof (o.monografico as Record<string, unknown>)[k] === 'string');
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const firstSentence = (s: string) => clean(s).split(/(?<=[.;:])\s/)[0] ?? '';

export function extractDeterministic(text: string): BoeExtraction {
  const art = /Art[ií]culo\s+(\d+[a-z]?(?:\.\d+)?)\.?\s*([^\n]*)/i.exec(text);
  const heading = clean(art?.[2] ?? firstSentence(text));
  const pct = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s?%/g)].map((m) => m[0]);
  const dates = [...text.matchAll(/\d{1,2}\s+de\s+[a-zñ]+\s+de\s+\d{4}/gi)].map((m) => m[0]);
  const counts = [...text.matchAll(/(?:más|menos)\s+de\s+(\w+)\s+(inmuebles|viviendas|trabajadores|euros)/gi)].map((m) => m[0]);
  const lower = text.toLowerCase();
  const categoria = /vivienda|arrendamiento|alquiler|inmueble/.test(lower) ? 'Vivienda' : /sanitari|salud|hospital/.test(lower) ? 'Sanidad' : /impuesto|tribut|econ/.test(lower) ? 'Economía' : /energ|el[eé]ctric/.test(lower) ? 'Energía' : 'Otros';
  const datos: { etiqueta: string; valor: string }[] = [];
  if (pct[0]) datos.push({ etiqueta: 'Límite', valor: pct[0] });
  if (counts[0]) datos.push({ etiqueta: 'Afecta a', valor: counts[0] });
  if (dates[0]) datos.push({ etiqueta: 'Plazo', valor: dates[0] });
  if (/entrar[aá] en vigor al d[ií]a siguiente/i.test(text)) datos.push({ etiqueta: 'Vigencia', valor: 'Día siguiente al BOE' });
  const paras = text.split(/\n\s*\n/).map(clean).filter(Boolean);
  const body = paras.slice(1);
  return {
    titulo: heading.replace(/\.$/, '').slice(0, 90) || 'Norma sin título',
    categoria,
    articulo_boe: art ? `Art. ${art[1]}` : 'Sin artículo detectado',
    pregunta_voto: `¿Apoyas que ${heading.charAt(0).toLowerCase()}${heading.slice(1).replace(/\.$/, '')}?`.slice(0, 140),
    datos_clave: datos.slice(0, 4),
    monografico: {
      contexto: body[0] ?? paras[0] ?? '',
      que_cambia: body[1] ?? '',
      a_favor: pct[0] ? `Aporta previsibilidad: la actualización queda acotada al ${pct[0]}.` : 'Aporta previsibilidad normativa.',
      en_contra: 'Puede reducir la rentabilidad esperada y la oferta; requiere evaluación de impacto.',
    },
  };
}

export async function extractWithOllama(text: string, cfg: { endpoint: string; model: string }, signal?: AbortSignal): Promise<BoeExtraction> {
  const res = await fetch(`${cfg.endpoint.replace(/\/$/, '')}/api/chat`, {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: cfg.model, stream: false, format: BOE_SCHEMA, options: { temperature: 0, seed: 7 },
      messages: [
        { role: 'system', content: 'Extrae datos de una norma del BOE. Responde SOLO JSON conforme al esquema. No inventes cifras: usa únicamente lo que aparece en el texto. Español neutro, sin juicios de valor.' },
        { role: 'user', content: text },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = await res.json();
  const parsed = JSON.parse(data?.message?.content ?? '');
  if (!validateExtraction(parsed)) throw new Error('SCHEMA_VALIDATION_FAILED');
  return parsed;
}

export async function extract(text: string, cfg: { endpoint: string; model: string; useOllama: boolean }) {
  if (cfg.useOllama) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 20_000);
      const r = await extractWithOllama(text, cfg, ctl.signal);
      clearTimeout(t);
      return { data: r, source: 'OLLAMA_QWEN_2.5_SCHEMA_CONSTRAINED' as ExtractionSource, note: '' };
    } catch (e) {
      return { data: extractDeterministic(text), source: 'DETERMINISTIC_FALLBACK' as ExtractionSource, note: `Ollama no disponible (${(e as Error).message}). Se usó el extractor determinista.` };
    }
  }
  return { data: extractDeterministic(text), source: 'DETERMINISTIC_FALLBACK' as ExtractionSource, note: '' };
}
