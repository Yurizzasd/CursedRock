// Repara galerias que ficaram com o poster genérico "Mods video" (vídeo de
// instalação do MCPEDL) no lugar do 2º screenshot. O parser do vendor passou a
// marcar esses itens como `video` (18/11/2026), mas os addons importados antes
// disso têm o arquivo salvo. Este script troca o placeholder por outra imagem
// real da galeria da página; se não houver, remove a entrada do catálogo.
//
// Uso: node scripts/fix-gallery-placeholder.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { McpedlAPI } = require('./vendor/mcpedl/dist/index.cjs');

const root = path.resolve(import.meta.dirname, '..');
const dry = process.argv.includes('--dry');
const PLACEHOLDER = 'd765dfa2fb12d0c5c1595e2c823ac48c'; // md5 do mods-video-600x400
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const md5 = (buf) => createHash('md5').update(buf).digest('hex');
const addonsPath = path.join(root, 'src', 'data', 'addons.json');
const addons = JSON.parse(fs.readFileSync(addonsPath, 'utf8'));
const byId = new Map(addons.map((a) => [a.id, a]));

const dirs = fs
  .readdirSync(path.join(root, 'public', 'images', 'addons'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const afetados = [];
for (const id of dirs) {
  const dir = path.join(root, 'public', 'images', 'addons', id);
  const files = fs.readdirSync(dir).filter((f) => f.startsWith(id + '-'));
  const has = files.find((f) => md5(fs.readFileSync(path.join(dir, f))) === PLACEHOLDER);
  if (has) afetados.push({ id, dir, file: has, files });
}
console.log(`${afetados.length} addon(s) com o poster genérico.`);

const api = new McpedlAPI({ rateLimit: { minTime: 1200, maxConcurrent: 1 } });
let trocados = 0;
let removidos = 0;

for (const { id, dir, file, files } of afetados) {
  const rec = byId.get(id);
  if (!rec?.sourceId) {
    console.log(`- ${id}: sem registro/sourceId no catálogo, pulando`);
    continue;
  }
  let d;
  try {
    d = await api.detail(rec.sourceId);
  } catch (e) {
    console.log(`- ${id}: falha ao abrir ${rec.sourceId} (${e.message})`);
    continue;
  }
  const hashes = new Set(files.map((f) => md5(fs.readFileSync(path.join(dir, f)))));
  const candidatos = (d.gallery ?? []).filter((g) => g.type === 'image' && g.img?.startsWith('http'));

  let novo = null;
  for (const g of candidatos) {
    try {
      const r = await fetch(g.img, { headers: { 'User-Agent': UA, Referer: `https://mcpedl.org/${rec.sourceId}/` } });
      const type = r.headers.get('content-type') ?? '';
      if (!r.ok || !type.startsWith('image/')) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 1024) continue;
      const h = md5(buf);
      if (h === PLACEHOLDER || hashes.has(h)) continue;
      novo = { buf, ext: type.includes('webp') ? 'webp' : type.includes('png') ? 'png' : 'jpg' };
      break;
    } catch { /* tenta o próximo */ }
    await sleep(400);
  }

  if (!novo) {
    console.log(`- ${id}: nenhuma imagem nova; removendo ${file} da galeria`);
    if (!dry) {
      fs.rmSync(path.join(dir, file));
      rec.screenshots = (rec.screenshots ?? []).filter((s) => !s.endsWith('/' + file));
      fs.writeFileSync(addonsPath, JSON.stringify(addons, null, 2) + '\n');
    }
    removidos++;
    continue;
  }

  const destino = path.join(dir, `${id}-2.${novo.ext}`);
  console.log(`+ ${id}: ${file} -> ${path.basename(destino)} (${(novo.buf.length / 1024).toFixed(0)} KB)`);
  if (!dry) {
    fs.rmSync(path.join(dir, file));
    fs.writeFileSync(destino, novo.buf);
    if (novo.ext !== 'webp') {
      rec.screenshots = (rec.screenshots ?? []).map((s) => s.endsWith('/' + file) ? `/images/addons/${id}/${id}-2.${novo.ext}` : s);
      fs.writeFileSync(addonsPath, JSON.stringify(addons, null, 2) + '\n');
    }
  }
  trocados++;
  await sleep(500);
}

console.log(`\nResumo: ${trocados} trocado(s), ${removidos} removido(s)${dry ? ' (dry-run)' : ''}.`);
