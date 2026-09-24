// Gera public/sitemap.xml a partir dos dados (rode com `npm run sitemap`).
// Em deploy estático, o sitemap é gerado no build e servido como arquivo.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://cursedrock.gg';

const addons = JSON.parse(readFileSync(join(root, 'src/data/addons.json'), 'utf8'));
const categories = JSON.parse(readFileSync(join(root, 'src/data/categories.json'), 'utf8'));
const creators = JSON.parse(readFileSync(join(root, 'src/data/creators.json'), 'utf8'));

const urls = [
  { loc: `${BASE}/`, changefreq: 'daily', priority: '1.0' },
  { loc: `${BASE}/addons`, changefreq: 'daily', priority: '0.9' },
  { loc: `${BASE}/categories`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${BASE}/creators`, changefreq: 'weekly', priority: '0.7' },
  { loc: `${BASE}/favorites`, changefreq: 'monthly', priority: '0.3' },
  ...categories.map((c) => ({ loc: `${BASE}/category/${c.id}`, changefreq: 'weekly', priority: '0.8' })),
  ...creators.map((c) => ({ loc: `${BASE}/creator/${c.id}`, changefreq: 'weekly', priority: '0.6' })),
  ...addons.map((a) => ({ loc: `${BASE}/addon/${a.id}`, changefreq: 'weekly', priority: '0.9', lastmod: a.updatedAt })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map(
    (u) =>
      `  <url>\n    <loc>${u.loc}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ''}    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
  )
  .join('\n')}\n</urlset>\n`;

mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(join(root, 'public/sitemap.xml'), xml);
console.log(`sitemap.xml gerado com ${urls.length} URLs`);
