// Biblioteca compartilhada do pipeline de importação (fila + estado).
// Estado em imports/ (gitignored) — nunca entra no repositório.
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(root, 'imports');
const QUEUE = join(DIR, 'queue.json');
const CONTROL = join(DIR, 'control.json');
const STATE = join(DIR, 'state.json');

export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// ─── IO atômico (tmp + rename) ─────────────────────────────────────────────
export const ensureDir = () => { mkdirSync(DIR, { recursive: true }); mkdirSync(join(DIR, 'downloads'), { recursive: true }); };
export const ensure = (s) => ensureDir();
const atomicWrite = (file, data) => {
  const tmp = file + '.tmp';
  writeFileSync(tmp, data);
  renameSync(tmp, file);
};

// ─── Fila persistente ──────────────────────────────────────────────────────
export function readQueue() {
  ensureDir();
  if (!existsSync(QUEUE)) return [];
  if (existsSync(QUEUE + '.tmp2')) copyFileSync(QUEUE + '.tmp2', QUEUE);
  return JSON.parse(readFileSync(QUEUE, 'utf8'));
}
export function writeQueue(list) {
  ensureDir();
  atomicWrite(QUEUE, JSON.stringify(list, null, 1) + '\n');
}

// ─── Controles de execução (painel ⇄ worker) ───────────────────────────────
export function readControl() {
  ensureDir();
  if (existsSync(CONTROL)) {
    try { return JSON.parse(readFileSync(CONTROL, 'utf8')); } catch { /* arquivo corrompido */ }
  }
  return { paused: false };
}
export function writeControl(patch) {
  ensureDir();
  const cur = readControl();
  atomicWrite(CONTROL, JSON.stringify({ ...cur, ...patch }, null, 2) + '\n');
}

// ─── Estado geral (métricas da última execução) ────────────────────────────
export function readState() {
  ensureDir();
  const empty = { lastRun: null, totals: {}, log: [] };
  if (!existsSync(STATE)) return empty;
  try { return JSON.parse(readFileSync(STATE, 'utf8')); } catch { return empty; }
}
export function writeState(s) {
  ensureDir();
  atomicWrite(STATE, JSON.stringify(s, null, 2) + '\n');
}
export function logState(type, message) {
  const s = readState();
  s.log = [{ ts: new Date().toISOString(), type, message }, ...s.log].slice(0, 300);
  writeState(s);
}

// ─── id de site a partir do slug MCPEDL ────────────────────────────────────
// tira sufixos "mod-minecraft-pe" etc. → slug curto do catálogo;
// colisão com id existente → sufixo -m<hash4> determinístico.
const SLUFIXOS = /-(?:mod|addon|addons|resource|texture|map|mapa)?-?(?:mcpe-)?(?:minecraft-)?(?:pe|bedrock|edition)(?:-.*)?$/i;

export function takeId(slug, usedIds, addedIds) {
  const base = slug.toLowerCase().replace(SLUFIXOS, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'addon';
  let id = base;
  if ([...usedIds, ...addedIds].includes(id)) {
    id = `${base}-m${createHash('sha1').update(slug).digest('hex').slice(0, 4)}`;
  }
  addedIds.push(id);
  return id;
}

// ─── dados da origem → campos nossos ───────────────────────────────────────
// MCPEDL concatena os chips de categoria ("Download Cheats for …Utility Mods for …")
// — mapeamos por palavras-chave nas categorias do catálogo; sem match → other.
const CAT_KEYS = [
  [/horror|creepypasta|scary/i, 'horror'],
  [/lucky/i, 'lucky-block'],
  [/pvp|mini[- ]?game|arena|kit/i, 'pvp'],
  [/farm|drop|crop/i, 'farming'],
  [/mob|creature|entity|boss|animal|pet/i, 'mobs'],
  [/weapon|sword|gun|armor|armour| PvP /i, 'weapons'],
  [/magic|spell|wizard|potion/i, 'magic'],
  [/techno|redstone|machine|industrial|electric/i, 'technology'],
  [/optimization|fps|performance|shader|render/i, 'optimization'],
  [/furniture|decor|decoration/i, 'furniture'],
  [/vehicle|car|plane|truck|boat/i, 'vehicles'],
  [/world|map|structure|dimension|biome/i, 'world'],
  [/adventure|quest|rpg|dungeon|story/i, 'adventure'],
  [/survival|tool|utility|cheat|marketplace|resource|other/i, 'utility'],
  [/texture|pack|skin|cosmet/i, 'other'],
];

export function mapCategory(raw) {
  if (!raw) return { cat: 'other', log: 'categoria ausente na origem' };
  for (const [re, cat] of CAT_KEYS) {
    if (re.test(raw)) return { cat, log: `origem "${raw.slice(0, 60)}" → ${cat}` };
  }
  return { cat: 'other', log: `categoria da origem não mapeada: "${raw.slice(0, 60)}" → other` };
}

// "Brandon TaylorBrandon Taylor" → "Brandon Taylor" (duplicação do parser upstream)
export function dedupeDouble(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  if (s.length % 2 === 0) {
    const h1 = s.slice(0, s.length / 2);
    const h2 = s.slice(s.length / 2);
    if (h1 === h2) return h2;
  }
  return s;
}

// "5 July 2026" → "2026-07-05"; inválida → '' (não inventar)
const MESES = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
export function parseDataEn(raw) {
  if (!raw) return '';
  const m = String(raw).match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return '';
  const mes = MESES[m[2].toLowerCase()];
  if (!mes) return '';
  return `${m[3]}-${String(mes).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// "1.21.20 – 1.26.50" → mínimo honesto declarado pela fonte
export function parseRangeMin(raw) {
  const m = String(raw ?? '').match(/(\d+\.\d+\.\d+)/);
  return m ? m[1] : '';
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
