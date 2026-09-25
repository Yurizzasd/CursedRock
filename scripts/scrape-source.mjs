// Raspa a ficha de um addon no mineaddonsnews.online e gera o JSON de entrada.
// Uso: node scripts/scrape-source.mjs <url-da-ficha> --download=<link-terabox>
// Saída: incoming/scraped-<id>.json + imagens em public/images/addons/<id>/
// Depois: revise o JSON e rode `npm run import`.
// O link de download NÃO está na página estática (modal JS) — por isso vem via --download.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// categorias deles → nossas (sem match exato vira "other" p/ revisão)
const CAT_MAP = {
  adventure: 'adventure', weapons: 'weapons', mobs: 'mobs', technology: 'technology',
  magic: 'magic', survival: 'survival', furniture: 'furniture', vehicles: 'vehicles',
  optimization: 'optimization', utility: 'utility', world: 'world', horror: 'horror',
  anime: 'anime', pvp: 'pvp', farming: 'farming', 'lucky block': 'lucky-block',
};

const stripTags = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function parseTitle(raw) {
  const clean = raw.replace(/\s+[—–-]\s*(@ncmine|MineAddonsNews).*$/i, '').replace(/^Baixar\s+/i, '').trim();
  const m = clean.match(/^(.+?)\s+by\s+(.+?)(?:\s*\|\s*(.+))?$/i);
  if (m) return { name: m[1].trim(), authorDisplay: m[2].trim(), extra: (m[3] ?? '').trim() };
  return { name: clean, authorDisplay: '', extra: '' };
}

async function main() {
  const url = process.argv[2];
  const dlArg = process.argv.find((a) => a.startsWith('--download='));
  if (!url || !dlArg) {
    console.error('Uso: node scripts/scrape-source.mjs <url-da-ficha> --download=<link>');
    process.exit(1);
  }
  const download_url = dlArg.slice('--download='.length);

  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar a ficha`);
  const html = await res.text();

  // 1) JSON-LD ( fonte mais precisa: autor, versão, data, imagem, descrição )
  let ld = {};
  for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    try {
      const json = JSON.parse(m[1]);
      const top = Array.isArray(json) ? json : [json];
      const list = top.flatMap((x) => (x && Array.isArray(x['@graph']) ? x['@graph'] : [x]));
      const app = list.find((x) => x && (x.softwareVersion || x.applicationCategory));
      if (app) { ld = app; break; }
    } catch { /* ignora bloco inválido */ }
  }

  // 2) H1 → nome / autor / extra
  const h1 = stripTags(html.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1] ?? '');
  const { name, authorDisplay, extra } = parseTitle(h1);
  const author = (typeof ld.author === 'object' ? ld.author?.name : ld.author) || authorDisplay || '';

  // 3) chips → tags
  const chips = [...html.matchAll(/class="chip[^"]*">([^<]{2,30})</g)].map((m) => m[1].trim());
  const tags = [...new Set([extra, ...chips])].filter((t) => t && t.toLowerCase() !== 'miscellaneous').slice(0, 5);

  const version = ld.softwareVersion || html.match(/v(\d+\.\d+\.\d+)/)?.[1] || '1.0.0';
  const published = ld.datePublished || new Date().toISOString().slice(0, 10);
  const description = (ld.description || '').slice(0, 280);

  const slug = new URL(url).pathname.split('/').filter(Boolean).pop() ?? 'addon';
  const id = slug.replace(/-by-.+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'addon';

  const foundCat = chips.map((c) => c.toLowerCase()).find((c) => CAT_MAP[c] && !['miscellaneous', 'cosmetics', 'skins', 'realistic'].includes(c)) ?? 'other';

  // 4) imagens (JSON-LD + corpo ACIMA da seção de relacionados), máx 5.
  // Corta o HTML no marcador de "relacionados" p/ não puxar capas de outros addons.
  const cutAt = html.search(/gostou desse|olha esses|relacionad|tamb[eé]m/i);
  const bodyHtml = cutAt > 0 ? html.slice(0, cutAt) : html;
  const imgSet = new Set();
  if (typeof ld.image === 'string' && ld.image.startsWith('http')) imgSet.add(ld.image);
  for (const m of bodyHtml.matchAll(/https:\/\/(?:media\.forgecdn\.net|i\.imgur\.com|images\.bedrockexplorer\.com)[^"'\s<>]+/g)) {
    imgSet.add(m[0]);
    if (imgSet.size >= 8) break;
  }
  const dir = join(root, 'public', 'images', 'addons', id);
  mkdirSync(dir, { recursive: true });
  const local = [];
  const seenHashes = new Set();
  let n = 0;
  for (const src of imgSet) {
    try {
      const r = await fetch(src, { headers: { 'User-Agent': UA, Referer: url } });
      const type = r.headers.get('content-type') ?? '';
      if (!r.ok || !type.startsWith('image/')) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 1024) continue;
      const { createHash } = await import('node:crypto');
      const hash = createHash('sha256').update(buf).digest('hex');
      if (seenHashes.has(hash)) { console.log('  ~ imagem duplicada, ignorada'); continue; }
      seenHashes.add(hash);
      if (local.length >= 5) break;
      const ext = type.includes('svg') ? 'svg' : type.includes('png') ? 'png' : type.includes('jpeg') ? 'jpg' : type.includes('gif') ? 'gif' : type.includes('webp') ? 'webp' : 'img';
      const rel = `/images/addons/${id}/${id}-${++n}.${ext}`;
      writeFileSync(join(root, 'public', rel), buf);
      local.push(rel);
      console.log(`  + imagem: ${rel} (${(buf.length / 1024).toFixed(0)} KB)`);
    } catch { /* pula e tenta a próxima */ }
  }

  const out = {
    id,
    name,
    ...(authorDisplay || author ? { author: 'unknown', authorDisplay: authorDisplay || author } : { author: 'unknown' }),
    description: description || `${name} — addon para Minecraft Bedrock.`,
    category: CAT_MAP[foundCat] ?? 'other',
    version,
    minecraft_versions: ['1.21.0'],
    thumbnail: local[0] ?? `/images/addons/${id}.svg`,
    screenshots: local,
    download_url,
    tags: tags.length ? tags : ['Bedrock'],
    featured: false,
    createdAt: published,
    updatedAt: published,
  };
  const dest = join(root, 'incoming', `scraped-${id}.json`);
  writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');

  console.log(`\n✓ ficha raspada → ${dest}`);
  console.log(`  nome: ${name} | autor na origem: ${author || '?'} (importa como Desconhecido — me diga se criar a ficha dele)`);
  console.log(`  versão: ${version} | publicado em: ${published} | categoria sugerida: ${out.category} | MC: 1.21.0 (assumida)`);
  console.log('Revise o arquivo e rode: npm run import');
}

main().catch((e) => { console.error('✕', e.message); process.exit(1); });
