// Gera capas e showcases em SVG (sem dependências). Uso: node scripts/make-art.mjs
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ADDON_DIR = join(root, 'public', 'images', 'addons');
const SHOW_DIR = join(root, 'public', 'images', 'showcase');

const ADDONS = {
  'bloodmoon-arsenal': ['#e5322d', 'swords'],
  'forgotten-dungeons': ['#b78a3e', 'dungeon'],
  'dread-tide-horror': ['#7c1310', 'eye'],
  'arcanum-spellbound': ['#a855f7', 'rune'],
  'skyline-vehicles': ['#38bdf8', 'road'],
  'fps-obsidian': ['#22d3ee', 'bolt'],
  'netherite-tactical': ['#64748b', 'crosshair'],
  'cursed-entities': ['#dc2626', 'eye'],
  'redstone-machinery': ['#ef4444', 'circuit'],
  'ironhold-furniture': ['#f59e0b', 'chair'],
  'deep-dark-expansion': ['#0ea5e9', 'cave'],
  'starfall-powers': ['#f472b6', 'burst'],
  'katana-spirits': ['#e879f9', 'swords'],
  'lucky-nether-block': ['#fbbf24', 'dice'],
  'true-survival': ['#fb923c', 'sun'],
  'smart-inventory': ['#94a3b8', 'grid'],
  'cartographers-minimap': ['#4ade80', 'compass'],
  'verdant-farming': ['#84cc16', 'sprout'],
  'spirit-companions': ['#67e8f9', 'ghost'],
  'arena-pvp-kits': ['#f87171', 'trophy'],
  'cavernous-worldgen': ['#34d399', 'cave'],
  'apocalypse-rig': ['#d97706', 'road'],
  'twilight-decor': ['#c084fc', 'moon'],
  'hollow-depths': ['#312e81', 'eye'],
};

const SHOWCASES = {
  'combat-1': '#e5322d', 'combat-2': '#7c1310',
  'dungeon-1': '#b78a3e', 'dungeon-2': '#8b5cf6',
  'horror-1': '#7c1310', 'horror-2': '#1f1f28',
  'cave-1': '#0ea5e9', 'magic-1': '#a855f7', 'magic-2': '#67e8f9',
  'vehicle-1': '#38bdf8', 'vehicle-2': '#d97706', 'world-1': '#4ade80',
  'tech-1': '#22d3ee', 'tech-2': '#64748b',
  'decor-1': '#f59e0b', 'decor-2': '#c084fc',
  'anime-1': '#f472b6', 'arena-1': '#f87171',
  'fun-1': '#fbbf24', 'fun-2': '#84cc16',
  'farm-1': '#84cc16', 'farm-2': '#4ade80',
  'survival-1': '#fb923c',
};

function rng(seed, n) {
  let h = createHash('sha256').update(seed).digest();
  const out = [];
  let i = 0;
  while (out.length < n) {
    out.push(h[i % h.length]);
    i++;
    if (i % h.length === 0) h = createHash('sha256').update(h).digest();
  }
  return out;
}

function pixels(seed, count, w, h, size, color, opacity) {
  const r = rng(seed, count * 2);
  let s = '';
  for (let i = 0; i < count; i++) {
    const x = Math.round((r[2 * i] / 255) * w);
    const y = Math.round((r[2 * i + 1] / 255) * h);
    s += `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${color}" opacity="${opacity}"/>`;
  }
  return s;
}

function mountains(seed, baseY, color, peak = 120) {
  const r = rng('m' + seed, 12);
  const pts = ['0,450'];
  let x = 0;
  for (let i = 0; i < 6; i++) {
    x += 90 + (r[i] % 80);
    pts.push(`${x},${baseY - (r[6 + i] % peak)}`);
  }
  pts.push('800,450');
  return `<polygon points="${pts.join(' ')}" fill="${color}"/>`;
}

function ground(accent) {
  let s = '';
  for (let i = 0; i < 20; i++) {
    const x = i * 40;
    s += `<rect x="${x}" y="392" width="40" height="58" fill="${i % 2 === 0 ? '#17171e' : '#1e1e26'}"/>`;
    s += `<rect x="${x}" y="392" width="40" height="10" fill="#26262f"/>`;
    if (i % 3 === 0) s += `<rect x="${x + 14}" y="414" width="12" height="12" fill="${accent}" opacity="0.55"/>`;
  }
  return s;
}

function motif(kind, a) {
  switch (kind) {
    case 'eye':
      return `<ellipse cx="400" cy="195" rx="120" ry="62" fill="none" stroke="${a}" stroke-width="6"/><circle cx="400" cy="195" r="30" fill="${a}"/><circle cx="400" cy="195" r="52" fill="none" stroke="${a}" stroke-width="2" opacity="0.5"/>`;
    case 'swords':
      return `<rect x="360" y="90" width="14" height="200" rx="3" fill="${a}" transform="rotate(24 367 190)"/><rect x="420" y="90" width="14" height="200" rx="3" fill="#d4d4d8" transform="rotate(-24 427 190)"/><rect x="330" y="270" width="140" height="12" rx="3" fill="#3a3a44"/>`;
    case 'rune':
      return `<circle cx="400" cy="195" r="95" fill="none" stroke="${a}" stroke-width="5"/><circle cx="400" cy="195" r="70" fill="none" stroke="${a}" stroke-width="2" opacity="0.6"/><rect x="388" y="130" width="24" height="130" fill="${a}" opacity="0.85"/><rect x="335" y="183" width="130" height="24" fill="${a}" opacity="0.85"/>`;
    case 'circuit':
      return `<rect x="280" y="150" width="240" height="90" fill="none" stroke="${a}" stroke-width="5"/><circle cx="300" cy="195" r="14" fill="${a}"/><circle cx="500" cy="195" r="14" fill="${a}"/><rect x="340" y="120" width="10" height="150" fill="${a}" opacity="0.7"/><rect x="450" y="120" width="10" height="150" fill="${a}" opacity="0.7"/>`;
    case 'bolt':
      return `<polygon points="420,80 340,210 390,210 370,310 470,180 415,180" fill="${a}"/>`;
    case 'moon':
      return `<circle cx="400" cy="190" r="70" fill="${a}" opacity="0.9"/><circle cx="425" cy="170" r="60" fill="#0b0b10" opacity="0.85"/>`;
    case 'sun': {
      let rays = '';
      for (let k = 0; k < 6; k++) rays += `<rect x="395" y="60" width="10" height="260" fill="${a}" opacity="0.3" transform="rotate(${k * 30} 400 190)"/>`;
      return `<circle cx="400" cy="190" r="60" fill="${a}"/>` + rays;
    }
    case 'dice':
      return `<rect x="330" y="120" width="140" height="140" rx="22" fill="${a}"/><circle cx="365" cy="155" r="14" fill="#0b0b10"/><circle cx="435" cy="155" r="14" fill="#0b0b10"/><circle cx="400" cy="190" r="14" fill="#0b0b10"/><circle cx="365" cy="225" r="14" fill="#0b0b10"/><circle cx="435" cy="225" r="14" fill="#0b0b10"/>`;
    case 'ghost':
      return `<rect x="350" y="120" width="100" height="120" rx="46" fill="${a}" opacity="0.9"/><circle cx="380" cy="170" r="10" fill="#0b0b10"/><circle cx="420" cy="170" r="10" fill="#0b0b10"/>`;
    case 'compass':
      return `<circle cx="400" cy="195" r="80" fill="none" stroke="${a}" stroke-width="6"/><polygon points="400,130 418,195 400,260 382,195" fill="${a}"/>`;
    case 'trophy':
      return `<rect x="375" y="120" width="50" height="70" fill="${a}"/><rect x="365" y="190" width="70" height="14" fill="${a}"/><rect x="380" y="204" width="40" height="40" fill="${a}" opacity="0.7"/><rect x="360" y="244" width="80" height="12" fill="#3a3a44"/>`;
    case 'crosshair':
      return `<circle cx="400" cy="195" r="70" fill="none" stroke="${a}" stroke-width="6"/><rect x="396" y="105" width="8" height="180" fill="${a}"/><rect x="310" y="191" width="180" height="8" fill="${a}"/>`;
    case 'grid': {
      let s = '';
      for (let ix = 0; ix < 4; ix++) for (let iy = 0; iy < 3; iy++)
        s += `<rect x="${330 + ix * 38}" y="${120 + iy * 38}" width="30" height="30" rx="4" fill="${(ix + iy) % 3 === 0 ? a : '#2a2a34'}"/>`;
      return s;
    }
    case 'sprout':
      return `<rect x="396" y="150" width="8" height="110" fill="${a}"/><ellipse cx="370" cy="190" rx="34" ry="16" fill="${a}" transform="rotate(-30 370 190)"/><ellipse cx="430" cy="170" rx="34" ry="16" fill="${a}" transform="rotate(30 430 170)" opacity="0.7"/>`;
    case 'burst': {
      const pts = [];
      for (let k = 0; k < 12; k++) {
        const ang = (k * Math.PI) / 6;
        const rr = k % 2 === 0 ? 100 : 45;
        pts.push(`${Math.round(400 + rr * Math.cos(ang))},${Math.round(195 + rr * Math.sin(ang))}`);
      }
      return `<polygon points="${pts.join(' ')}" fill="${a}" opacity="0.9"/>`;
    }
    case 'dungeon':
      return `<rect x="340" y="140" width="120" height="130" fill="none" stroke="${a}" stroke-width="8"/><rect x="375" y="190" width="50" height="80" fill="${a}"/><rect x="330" y="120" width="140" height="18" fill="${a}" opacity="0.6"/>`;
    case 'chair':
      return `<rect x="340" y="160" width="120" height="26" fill="${a}"/><rect x="340" y="100" width="26" height="90" fill="${a}" opacity="0.7"/><rect x="350" y="186" width="14" height="80" fill="#3a3a44"/><rect x="436" y="186" width="14" height="80" fill="#3a3a44"/>`;
    case 'road': {
      let dashes = '';
      for (let i = 0; i < 4; i++) dashes += `<rect x="395" y="${280 + i * 24}" width="10" height="14" fill="${a}"/>`;
      return `<polygon points="370,270 430,270 480,392 320,392" fill="#2a2a34"/>` + dashes;
    }
    default:
      return `<polygon points="300,270 350,150 400,220 450,130 500,270" fill="none" stroke="${a}" stroke-width="6"/><circle cx="400" cy="240" r="16" fill="${a}"/>`;
  }
}

function cover(seed, accent, kind, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
<defs>
<radialGradient id="g" cx="50%" cy="38%" r="75%">
<stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/>
<stop offset="55%" stop-color="#101016" stop-opacity="1"/>
<stop offset="100%" stop-color="#08080b" stop-opacity="1"/>
</radialGradient>
<linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
<stop offset="55%" stop-color="black" stop-opacity="0"/>
<stop offset="100%" stop-color="black" stop-opacity="0.55"/>
</linearGradient>
</defs>
<rect width="800" height="450" fill="url(#g)"/>
${pixels(seed + 'stars', 60, 800, 300, 3, '#ffffff', 0.25)}
${mountains(seed, 330, '#14141b', 130)}
${mountains(seed + '2', 370, '#1b1b23', 90)}
${motif(kind, accent)}
${ground(accent)}
<rect width="800" height="450" fill="url(#v)"/>
<rect x="24" y="24" width="150" height="10" fill="${accent}" opacity="0.9"/>
<rect x="24" y="40" width="90" height="6" fill="#3a3a44"/>
<text x="36" y="418" font-family="monospace" font-size="26" font-weight="bold" fill="#f0f0f3" letter-spacing="3">${title.toUpperCase()}</text>
</svg>`;
}

mkdirSync(ADDON_DIR, { recursive: true });
mkdirSync(SHOW_DIR, { recursive: true });
for (const [id, [accent, kind]] of Object.entries(ADDONS)) {
  writeFileSync(join(ADDON_DIR, `${id}.svg`), cover(id, accent, kind, id.replaceAll('-', ' ').slice(0, 18)));
}
for (const [scene, accent] of Object.entries(SHOWCASES)) {
  writeFileSync(join(SHOW_DIR, `${scene}.svg`), cover(scene, accent, 'cave', scene.replaceAll('-', ' ')));
}
console.log(`OK: ${Object.keys(ADDONS).length} capas + ${Object.keys(SHOWCASES).length} showcases`);
