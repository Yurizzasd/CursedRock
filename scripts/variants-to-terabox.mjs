// Migra TODOS os links "original" (mcpedl) dos registros para TeraBox.
// Uso: node scripts/variants-to-terabox.mjs [--audit]
//  · entra em src/data/addons.json (fonte da verdade) e espelha em
//    incoming/done/mcpedl-<id>.json quando existir
//  · baixa o arquivo da origem, valida o pacote (regras compartilhadas do
//    package-lib; exigirUuid=false pra variantes legadas), sobe via
//    tb-api-upload.mjs pra /CursedRock e só troca o link depois de
//    SHARE_URL + resposta 200 ao vivo
//  · arquivo que falhar (404/zip quebrado/limite) mantém o link original
//    com aviso — nada quebra silenciosamente
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { validarPacote } from './package-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT_ONLY = process.argv.includes('--audit');
const UPLOAD_DIR = '/CursedRock';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0';
const MAX_FILE_MB = 150;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function subirParaTeraBox(file) {
  const out = spawn(process.execPath, ['scripts/tb-api-upload.mjs', file, `--dir=${UPLOAD_DIR}`], {
    cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const chunks = [];
  out.stdout.on('data', (c) => chunks.push(c));
  out.stderr.on('data', (c) => process.stderr.write('  [tb!] ' + String(c)));
  return new Promise((resolve) => {
    const t = setTimeout(() => { out.kill(); resolve({ ok: false, share: null, log: 'timeout' }); }, 15 * 60 * 1000);
    out.on('close', (code) => {
      clearTimeout(t);
      const text = Buffer.concat(chunks).toString('utf8');
      const m = text.match(/SHARE_URL=(\S+)/);
      if (!(code === 0 && m)) {
        // 2026: log do subprocesso visível na falha (sem adivinhar onde quebrou)
        process.stderr.write('  [tb log] ' + text.split(/\r?\n/).filter(Boolean).slice(-6).join(' · ') + '\n');
      }
      resolve(code === 0 && m ? { ok: true, share: m[1] } : { ok: false, share: null });
    });
  });
}

async function baixar(url, dest) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Referer: 'https://mcpedl.org/' },
    redirect: 'follow',
  });
  if (!(res.ok || res.status === 206)) throw new Error(`HTTP ${res.status} ao baixar`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 512) throw new Error(`arquivo pequeno demais (${buf.length}b)`);
  if (buf.length > MAX_FILE_MB * 1024 * 1024) throw new Error(`acima do limite (${MAX_FILE_MB}MB)`);
  if (!(buf[0] === 0x50 && buf[1] === 0x4b)) throw new Error('não é ZIP');
  writeFileSync(dest, buf);
  return buf.length;
}

const extOf = (u) => /\.(mcaddon|mcpack|mctemplate|zip)/i.exec(u)?.[1]?.toLowerCase() ?? '.mcaddon';
const slug = (s) => String(s).toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const t0base = join(tmpdir(), 'opencode', 'variants-migra');
mkdirSync(t0base, { recursive: true });

const ADDONS_JSON = join(root, 'src/data/addons.json');
const addons = JSON.parse(readFileSync(ADDONS_JSON, 'utf8'));

if (AUDIT_ONLY) {
  let primT = 0, primO = 0, varT = 0, varO = 0;
  for (const r of addons) {
    const primTer = String(r.download_url).includes('terabox');
    primTer ? primT++ : primO++;
    for (const f of r.files ?? []) {
      String(f.download_url).includes('terabox') ? varT++ : varO++;
    }
  }
  console.log(`[audit] principais: ${primT} terabox / ${primO} original · variantes: ${varT} terabox / ${varO} original`);
  process.exit(0);
}

let migrados = 0, mantidos = 0;
for (const r of addons) {
  const jobs = [];
  // (limpeza de temporários no fim do main — ver rmSync antes do snapshot)
  if (!String(r.download_url).includes('terabox')) {
    jobs.push({ kind: 'principal', ref: r, url: r.download_url, label: 'principal' });
  }
  for (const f of r.files ?? []) {
    if (!String(f.download_url).includes('terabox')) {
      jobs.push({ kind: 'variante', ref: f, url: f.download_url, label: f.label });
    }
  }
  if (jobs.length === 0) continue;
  let mudou = false;
  for (const job of jobs) {
    const ext = extOf(job.url);
    const vers = job.kind === 'principal' ? r.version : (job.ref.version ?? '1.0.0');
    const seg = job.kind === 'principal'
      ? `${r.id}-v${slug(vers)}${ext}`
      : `${r.id}-${slug(job.label)}-v${slug(vers)}${ext}`;
    const dest = join(t0base, `${r.id}-${createHash('sha1').update(job.url).digest('hex').slice(0, 8)}-${seg}`);
    try {
      const bytes = await baixar(job.url, dest);
      const estrutura = validarPacote(bufOf(dest), { exigirUuid: false });
      const up = await subirParaTeraBox(dest);
      if (!up.ok || !up.share) throw new Error('upload sem SHARE_URL validado');
      const cke = await fetch(up.share, { headers: { 'User-Agent': UA } }).catch(() => null);
      if (!cke || cke.status !== 200) throw new Error(`link novo não respondeu 200 (${cke?.status ?? 'sem resposta'})`);
      job.ref.download_url = up.share;
      job.ref.downloadProvider = 'terabox';
      job.ref.fileSize = `${(bytes / 1048576).toFixed(1)} MB`;
      mudou = true;
      migrados++;
      console.log(`✓ ${r.id} / ${job.label}: ${up.share} (${estrutura.packs} manifest(s), ${(bytes / 1048576).toFixed(1)} MB)`);
    } catch (e) {
      mantidos++;
      console.warn(`✕ ${r.id} / ${job.label}: ${e.message} — mantém link original`);
    }
    await sleep(1000);
  }
  if (mudou || jobs.every((j) => j.ref.download_url?.includes('terabox'))) mudou = true;
  if (mudou) {
    // espelho nos arquivos incoming/done quando existem (mesma transformação)
    const doneFile = join(root, 'incoming/done', `mcpedl-${r.id}.json`);
    if (existsSync(doneFile)) {
      try {
        const done = JSON.parse(readFileSync(doneFile, 'utf8'));
        done.download_url = r.download_url;
        done.downloadProvider = r.downloadProvider;
        done.fileSize = r.fileSize;
        if (Array.isArray(done.files)) {
          for (const f of done.files) {
            const g = (r.files ?? []).find((x) => x.label === f.label);
            if (g) { f.download_url = g.download_url; f.downloadProvider = g.downloadProvider; f.fileSize = g.fileSize; }
          }
        }
        writeFileSync(doneFile, JSON.stringify(done, null, 2) + '\n');
      } catch (e) {
        console.warn(`! espelho incoming/done/mcpedl-${r.id}.json falhou: ${e.message}`);
      }
    }
  }
}
writeFileSync(ADDONS_JSON, JSON.stringify(addons, null, 2) + '\n');
console.log(`\n[migra] ${migrados} link(s) em TeraBox · ${mantidos} mantido(s) na origem`);
console.log('[migra] auditoria: rode node scripts/variants-to-terabox.mjs --audit');

// temporários fora da conta de disco do usuário (2026: Dungeons Content usava
// ~143 MB por tentativa — sem limpeza acumulava)
rmSync(t0base, { recursive: true, force: true });

function bufOf(p) {
  return readFileSync(p);
}
