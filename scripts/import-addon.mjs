// Importa addons de incoming/*.json para src/data/addons.json.
// Uso: npm run import
// - valida campos, categoria, autor e id único
// - gera capa automática se o thumbnail local não existir
// - move processados para incoming/done/ e regenera o sitemap
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const INCOMING = join(root, 'incoming');
const DONE = join(INCOMING, 'done');
const ADDONS_JSON = join(root, 'src/data/addons.json');

const REQUIRED = ['id', 'name', 'author', 'description', 'category', 'version', 'minecraft_versions', 'thumbnail', 'download_url', 'tags', 'downloads', 'createdAt', 'updatedAt'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-z0-9-]+$/;

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const categories = read(join(root, 'src/data/categories.json'));
const creators = read(join(root, 'src/data/creators.json'));
const catById = new Map(categories.map((c) => [c.id, c]));
const creatorIds = new Set(creators.map((c) => [c.id]).map(([id]) => id));

// ─── capa automática no padrão do site (cor da categoria) ───
function autoCover(seed, accent, title) {
  let h = createHash('sha256').update(seed).digest();
  let dots = '';
  for (let i = 0; i < 50; i++) {
    dots += `<rect x="${h[(2 * i) % h.length] % 800}" y="${h[(2 * i + 1) % h.length] % 300}" width="3" height="3" fill="#ffffff" opacity="0.25"/>`;
  }
  let blocks = '';
  for (let i = 0; i < 20; i++) {
    const x = i * 40;
    blocks += `<rect x="${x}" y="392" width="40" height="58" fill="${i % 2 ? '#1e1e26' : '#17171e'}"/><rect x="${x}" y="392" width="40" height="10" fill="#26262f"/>`;
    if (i % 3 === 0) blocks += `<rect x="${x + 14}" y="414" width="12" height="12" fill="${accent}" opacity="0.55"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><defs><radialGradient id="g" cx="50%" cy="38%" r="75%"><stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/><stop offset="55%" stop-color="#101016"/><stop offset="100%" stop-color="#08080b"/></radialGradient><linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="55%" stop-color="black" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity="0.55"/></linearGradient></defs><rect width="800" height="450" fill="url(#g)"/>${dots}<polygon points="0,450 120,260 240,340 360,230 480,330 620,250 800,360 800,450" fill="#14141b"/><circle cx="400" cy="195" r="90" fill="none" stroke="${accent}" stroke-width="5"/><rect x="388" y="130" width="24" height="130" fill="${accent}" opacity="0.85"/><rect x="335" y="183" width="130" height="24" fill="${accent}" opacity="0.85"/>${blocks}<rect width="800" height="450" fill="url(#v)"/><rect x="24" y="24" width="150" height="10" fill="${accent}" opacity="0.9"/><text x="36" y="418" font-family="monospace" font-size="26" font-weight="bold" fill="#f0f0f3" letter-spacing="3">${title.toUpperCase().slice(0, 20)}</text></svg>`;
}

function validate(a, file) {
  const errs = [];
  for (const f of REQUIRED) {
    if (a[f] === undefined || a[f] === null || a[f] === '') errs.push(`campo obrigatório ausente: ${f}`);
  }
  if (a.id && !ID_RE.test(a.id)) errs.push(`id inválido (use só a-z 0-9 -): ${a.id}`);
  if (a.category && !catById.has(a.category)) errs.push(`categoria inexistente: ${a.category}`);
  if (a.author && !creatorIds.has(a.author)) errs.push(`autor inexistente: ${a.author}`);
  if (a.minecraft_versions && (!Array.isArray(a.minecraft_versions) || a.minecraft_versions.length === 0)) errs.push('minecraft_versions deve ser um array não vazio');
  if (a.tags && !Array.isArray(a.tags)) errs.push('tags deve ser um array');
  if (a.downloads !== undefined && typeof a.downloads !== 'number') errs.push('downloads deve ser número');
  for (const d of ['createdAt', 'updatedAt']) {
    if (a[d] && !DATE_RE.test(a[d])) errs.push(`${d} deve ser AAAA-MM-DD`);
  }
  if (errs.length) throw new Error(`${file}:\n  - ${errs.join('\n  - ')}`);
}

function main() {
  mkdirSync(DONE, { recursive: true });
  const addons = read(ADDONS_JSON);
  const ids = new Set(addons.map((a) => a.id));
  const files = readdirSync(INCOMING).filter((f) => f.endsWith('.json') && !f.startsWith('_') && !f.startsWith('.'));

  if (files.length === 0) {
    console.log('Nada para importar: incoming/ está vazia (veja incoming/README.md).');
    return;
  }

  let ok = 0;
  for (const file of files) {
    const full = join(INCOMING, file);
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(full, 'utf8'));
    } catch {
      console.error(`✕ ${file}: JSON inválido`);
      continue;
    }
    const list = Array.isArray(parsed) ? parsed : [parsed];
    let fileOk = true;
    for (const a of list) {
      try {
        validate(a, file);
        if (ids.has(a.id)) throw new Error(`${file}: id duplicado (já existe): ${a.id}`);
        // capa automática se o thumbnail local não existir
        if (a.thumbnail.startsWith('/') && !existsSync(join(root, 'public', a.thumbnail))) {
          const cat = catById.get(a.category);
          const dest = join(root, 'public', a.thumbnail);
          mkdirSync(dirname(dest), { recursive: true });
          writeFileSync(dest, autoCover(a.id, cat.accent, a.name.replaceAll('-', ' ')));
          console.log(`  + capa gerada: ${a.thumbnail}`);
        }
        // screenshots locais precisam existir (só avisa)
        for (const s of a.screenshots ?? []) {
          if (s.startsWith('/') && !existsSync(join(root, 'public', s))) {
            console.warn(`  ! screenshot não encontrada (mantida mesmo assim): ${s}`);
          }
        }
        addons.push({
          featured: false,
          screenshots: [],
          ...a,
          longDescription: a.longDescription ?? a.description,
        });
        ids.add(a.id);
        console.log(`✓ ${a.id} (${a.name})`);
        ok++;
      } catch (e) {
        fileOk = false;
        console.error(`✕ ${e.message}`);
      }
    }
    if (fileOk) renameSync(full, join(DONE, file));
  }

  if (ok > 0) {
    writeFileSync(ADDONS_JSON, JSON.stringify(addons, null, 2) + '\n');
    execSync('node scripts/generate-sitemap.mjs', { cwd: root, stdio: 'inherit' });
    console.log(`\n${ok} addon(s) importados. Próximos passos: npm run dev (conferir) → commit → push → deploy.`);
  } else {
    console.log('\nNenhum addon importado — corrija os erros acima.');
    process.exitCode = 1;
  }
}

main();
