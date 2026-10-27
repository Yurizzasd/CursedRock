// Worker do pipeline: processa um lote da fila imports/queue.json.
// Uso:
//   node scripts/mcpedl-process.mjs [--jobs=3] [--authorized=<postId,postId2>] [--publish]
//   node scripts/mcpedl-process.mjs --only=<id,id2>  [com --authorized/--jobs]
//   node scripts/mcpedl-process.mjs --retry-failed   (reprocessa falhadas)
//
// --only restringe o lote a esses ids de origem: obrigatório quando a fila
// tem pendentes de VÁRIOS pools (2026: sem --only, --jobs=N pegava os N
// primeiros pendentes — nem sempre os autorizados do lote).
//
// Regras dadas pelo dono do projeto:
//  · Arquivo de TERCEIROS NÃO sobe para a nossa conta TeraBox sem autorização
//    explícita (--authorized=... ou scripts/import-allowlist.json). Autorizado →
//    baixa, valida o .mcaddon/.mcpack, sobe via tb-api-upload.mjs e valida o link.
//    Sem autorização → mantém o link oficial da origem (downloadProvider:"original").
//  · Nunca considera upload OK antes da confirmação real (SHARE_URL + resposta 200).
//  · Lote configurável, 1 arquivo por vez, intervalo entre chamadas, retentativas limitadas,
//    recupera de onde parou (fila persistente). Temporários são apagados ao terminar.
//  · Nada é publicado no site sozinho: o worker só escreve em incoming/*.json (fluxo
//    existente do npm run import); com --publish ele roda o import explicitamente.
//  · Pausável a qualquer momento: imports/control.json { paused: true } (painel escreve).
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpedlAPI } from './vendor/mcpedl/dist/index.cjs';
import { validarPacote } from './package-lib.mjs';
import {
  sleep, readQueue, writeQueue, readControl, readState, writeState, logState,
  UA, mapCategory, dedupeDouble, parseDataEn, parseRangeMin, takeId,
} from './imports-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lb = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const JOBS = Math.max(1, parseInt(lb('jobs', '3')) || 3);
const IMAGES = Math.max(1, parseInt(lb('images', '3')) || 3);
const MAX_FILE_MB = Math.max(1, parseInt(lb('max-file-mb', '150')) || 150);
const UPLOAD_DIR = lb('dir', '/CursedRock');
const PUBLISH = process.argv.includes('--publish');
const RETRY_FAILED = process.argv.includes('--retry-failed');
const AUTH = `${lb('authorized', '')}`.split(',').map((s) => s.trim()).filter(Boolean);
// 2026 fix (lote 4): --only=<ids> restringe o lote a esses ids — com a fila
// cheia de pendentes de vários pools, --jobs=N pegava "os primeiros N"
// (provavelmente NÃO autorizados). Com --only, o lote é exatamente o escolhido.
const ONLY = `${lb('only', '')}`.split(',').map((s) => s.trim()).filter(Boolean);

const queue = readQueue();
const control = readControl();

// allowlist persistente (declarada pelo dono; ids de origem autorizados)
const allowFile = join(root, 'scripts', 'import-allowlist.json');
let allowList = [];
if (existsSync(allowFile)) {
  try { allowList = JSON.parse(readFileSync(allowFile, 'utf8')); } catch { /* arquivo quebrado */ }
}
const isAuthorized = (job) =>
  AUTH.includes(job.postId) || allowList.includes(job.postId);

if (RETRY_FAILED) {
  const failed = queue.filter((j) => j.status === 'failed');
  for (const j of failed) { j.status = 'pending'; j.attempts = 0; }
  writeQueue(queue);
  console.log(`✓ ${failed.length} falhada(s) voltaram pra fila.`);
  if (failed.length > 0) console.log('Rode: npm run imports:run');
  process.exit(0);
}

if (control.paused) {
  console.log('⏸  pausado via imports/control.json — nada foi processado.');
  process.exit(0);
}

const addons = JSON.parse(readFileSync(join(root, 'src/data/addons.json'), 'utf8'));
const siteIds = new Set(addons.map((a) => a.id));
const sourceIds = new Set(addons.map((a) => a.sourceId).filter(Boolean));
const addedIds = [];

const mc = new McpedlAPI({ rateLimit: { minTime: 2000, maxConcurrent: 1 } });

// ─── utilitários ───────────────────────────────────────────────────────────
const tempDir = (key) => join(root, 'imports', 'downloads', key);

async function baixarArquivo(url, dest, referer) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: referer ?? 'https://mcpedl.org/' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar arquivo`);
  const ct = (res.headers.get('content-type') ?? '').toLowerCase();
  if (ct.startsWith('text/')) throw new Error(`resposta text (${ct}) — URL não é um arquivo`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 512) throw new Error(`arquivo pequeno demais (${buf.length}b)`);
  if (buf.length > MAX_FILE_MB * 1024 * 1024) throw new Error(`arquivo acima do limite (${MAX_FILE_MB}MB)`);
  if (!(buf[0] === 0x50 && buf[1] === 0x4b)) throw new Error('conteúdo não é ZIP (.mcaddon/.mcpack)');
  writeFileSync(dest, buf);
  return buf.length;
}

// leitor/validador de pacotes agora em scripts/package-lib.mjs (compartilhado
// com o migrador de variantes). Mesmas regras: manifest.json OU pack_manifest
// (alias antigo), packs aninhados, header.uuid obrigatório no principal.

// upload via ferramenta real (tb-api-upload.mjs) e validação do link
async function subirParaTeraBox(file) {
  const out = spawn(process.execPath, ['scripts/tb-api-upload.mjs', file, `--dir=${UPLOAD_DIR}`], {
    cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const chunks = [];
  out.stdout.on('data', (c) => { chunks.push(c); process.stdout.write('  [tb] ' + String(c)); });
  out.stderr.on('data', (c) => { chunks.push(c); process.stdout.write('  [tb!] ' + String(c)); });
  const share = await new Promise((resolve) => {
    const t = setTimeout(() => { out.kill(); resolve(null); }, 15 * 60 * 1000);
    out.on('close', (code) => {
      clearTimeout(t);
      const text = Buffer.concat(chunks).toString('utf8');
      const m = text.match(/SHARE_URL=(\S+)/);
      resolve(code === 0 && m ? m[1] : null);
    });
  });
  if (!share) return { ok: false, share: null };
  const cke = await fetch(share, { headers: { 'User-Agent': UA } }).catch(() => null);
  const ok = cke !== null && cke.status === 200;
  return { ok, share };
}

// baixa imagens da origem (capa + galeria) com dedupe por hash — igual scrape-source.mjs
async function baixarImagens(id, imgList, referer) {
  const dir = join(root, 'public', 'images', 'addons', id);
  mkdirSync(dir, { recursive: true });
  const seen = new Set();
  const saved = [];
  let i = 0;
  for (const src of imgList) {
    if (!src || !src.startsWith('http') || saved.length >= IMAGES) continue;
    if (src.includes('placeholder')) continue;
    try {
      const r = await fetch(src, { headers: { 'User-Agent': UA, Referer: referer ?? 'https://mcpedl.org/' } });
      const type = r.headers.get('content-type') ?? '';
      if (!r.ok || !type.startsWith('image/')) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 1024) continue;
      const h = createHash('sha256').update(buf).digest('hex');
      if (seen.has(h)) continue;
      seen.add(h);
      const ext = type.includes('png') ? 'png' : type.includes('jpeg') ? 'jpg' : type.includes('gif') ? 'gif' : type.includes('webp') ? 'webp' : 'img';
      const rel = `/images/addons/${id}/${id}-${++i}.${ext}`;
      writeFileSync(join(root, 'public', rel), buf);
      saved.push(rel);
    } catch { /* pula */ }
    await sleep(400);
  }
  return saved;
}

function descricaoLimpa(content, name) {
  let t = String(content ?? '').replace(/\n\s*\n/g, '\n').replace(/[ \t]{2,}/g, ' ').replace(/\u00a0/g, ' ').trim();
  t = t.replace(new RegExp(`^(?:Download|Baixar)\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^:]{0,60}:\\s*`, 'i'), '').trim();
  return t;
}

// ─── processamento de um job ───────────────────────────────────────────────
async function processar(job) {
  const autorizado = isAuthorized(job);
  console.log(`\n▶ ${job.postId}${autorizado ? ' [AUTORIZADO → TeraBox]' : ' [sem reupload — link da origem]'}`);
  const url = `https://mcpedl.org/${job.postId}/`;
  const d = await mc.detail(job.postId);
  if (!d?.list || d.list.length === 0) {
    const err = new Error('página sem tabela de arquivos (pode não ser addon baixável)');
    err.permanent = true;
    throw err;
  }
  // 2026 fix (lote 4): --principal-row=N (1-based) reordena a tabela — algumas
  // fichas têm a PRIMEIRA linha quebrada/legada e o addon de verdade só nas
  // últimas (Train Mod: linha 1 era .mcaddon de 10KB sem uuid). Padrão: linha 1.
  const PRINCIPAL_ROW = Math.max(1, parseInt(lb('principal-row', '0')) || 0);
  if (PRINCIPAL_ROW > 1) {
    if (!d.list[PRINCIPAL_ROW - 1]) throw new Error(`--principal-row=${PRINCIPAL_ROW} fora da tabela (${d.list.length} linhas)`);
    d.list = [d.list[PRINCIPAL_ROW - 1], ...d.list.slice(0, PRINCIPAL_ROW - 1), ...d.list.slice(PRINCIPAL_ROW)];
    console.log(`  · principal passou a ser a linha ${PRINCIPAL_ROW} da tabela (${d.list[0].name})`);
  }

  const nome = (d.title || job.name || '').replace(/\s+(for\s+)?Minecraft\s+(PE|Bedrock).*$/i, '').trim() || job.name || job.postId;
  const autorDisplay = dedupeDouble(d.info?.game_author || d.info?.author || '');
  const publicacao = parseDataEn(d.info?.postDate) || new Date().toISOString().slice(0, 10);
  const cat = mapCategory(d.info?.category);
  const slideImgs = [d.img, ...(d.gallery ?? []).filter((g) => g.type === 'image').map((g) => g.img)];

  const siteId = takeId(job.postId, siteIds, addedIds);
  const imgs = await baixarImagens(siteId, slideImgs, url);

  const texto = descricaoLimpa(d.content, nome);
  const desc = texto.slice(0, 240);
  const ldesc = texto.slice(0, 2800);

  const range = d.list[0]?.version ?? '';
  const minMc = parseRangeMin(range);

  const registro = {
    id: siteId,
    name: nome,
    author: 'unknown',
    ...(autorDisplay ? { authorDisplay: autorDisplay } : {}),
    description: desc || `${nome} — addon para Minecraft Bedrock.`,
    ...(ldesc ? { longDescription: ldesc } : {}),
    category: cat.cat,
    version: 'PLACEHOLDER-VERSION',
    minecraft_versions: [minMc || '1.21.0'],
    ...(range && range.includes('-') ? { requirements: [`Faixa de versões declarada na origem: ${range}`] } : {}),
    thumbnail: imgs[0] ?? `/images/addons/${siteId}.svg`,
    screenshots: imgs,
    tags: [...new Set([cat.cat === 'other' ? 'Bedrock' : cat.cat])].map((t) => t.replace(/^(.)/, (c) => c.toUpperCase())),
    featured: false,
    createdAt: publicacao,
    updatedAt: publicacao,
    sourceUrl: url,
    sourceId: job.postId,
    importedAt: new Date().toISOString().slice(0, 10),
  };

  const mensagens = [cat.log];
  const result = { downloadProvider: 'original', teraboxLinks: [] };

  // resolução dos arquivos da tabela
  const principal = d.list[0];
  const fileIdSel = principal.files?.[0]?.id ?? job.fileId ?? 0;

  if (autorizado && fileIdSel) {
    const dl = await mc.download(fileIdSel);
    mensagens.push(`URL direta da origem ok (${dl.url.split('/').pop()})`);
    mkdirSync(tempDir(job.key), { recursive: true });
    const temp = join(tempDir(job.key), 'pacote.zip');
    const bytes = await baixarArquivo(dl.url, temp, url);
    const estrutura = validarPacote(bufSync(temp), { aceitarLegado: true });
    // 2026 fix (lote 3): .mctemplate preservado do URL da origem (mundo pronto)
    const ext = /\.(mcaddon|mcpack|mctemplate)/i.exec(dl.url)?.[1]?.toLowerCase() ?? estrutura.ext;
    mensagens.push(`pacote validado: ${(bytes / 1048576).toFixed(1)} MB · ${estrutura.packs} manifest(s) · manifest ${estrutura.name || '?'} v${estrutura.version || '?'} · MC ${estrutura.minecraft || minMc || '?'}`);
    const finalName = `${siteId}-v${(estrutura.version || parseRangeMin(range) || '1.0.0').replace(/[^\w.-]+/g, '-')}${ext}`;
    const finalFile = join(tempDir(job.key), finalName);
    renameSync(temp, finalFile);

    const up = await subirParaTeraBox(finalFile);
    if (!up.ok || !up.share) throw new Error('upload TeraBox sem confirmação real (SHARE_URL ausente ou link invalidado)');
    mensagens.push(`link confirmado ao vivo: ${up.share}`);
    result.teraboxLinks.push(up.share);
    result.downloadProvider = 'terabox';
    registro.download_url = up.share;
    registro.fileSize = `${(bytes / 1048576).toFixed(1)} MB`;
    if (estrutura.minecraft) registro.minecraft_versions = [estrutura.minecraft];
    if (estrutura.version) registro.version = estrutura.version;

    // demais versões da tabela: 2026 (lote 4) — com autorização, as variantes
    // TAMBÉM sobem pro TeraBox (pedido do dono: "sempre garanta que leve ao
    // TeraBox"). Variante que falhar no download/upload/validação cai de volta
    // pro link oficial da origem (honesto), sem invalidar o registro.
    const extras = [];
    for (let fi = 1; fi < d.list.length; fi++) {
      const item = d.list[fi];
      const fid = item.files?.[0]?.id ?? 0;
      if (!fid) continue;
      let extra = null;
      try {
        const dl2 = await mc.download(fid);
        const label = item.name ?? `arquivo ${fi + 1}`;
        const vers = parseRangeMin(item.version) || '1.21.0';
        let subiu = null;
        try {
          mkdirSync(tempDir(job.key), { recursive: true });
          const extOk = /\.(mcaddon|mcpack|mctemplate)/i.exec(dl2.url)?.[1]?.toLowerCase() ?? '.mcaddon';
          const seg = `${siteId}-${String(label).toLowerCase().replace(/[^\w]+/g, '-')}-v${vers.replace(/[^\w.-]+/g, '-')}${extOk}`;
          const destT = join(tempDir(job.key), seg);
          const bytes2 = await baixarArquivo(dl2.url, destT, url);
          validarPacote(bufSync(destT), { exigirUuid: false, aceitarLegado: true });
          const up2 = await subirParaTeraBox(destT);
          if (!up2.ok || !up2.share) throw new Error('upload sem SHARE_URL validado');
          mensagens.push(`variante "${label}" no TeraBox: ${up2.share}`);
          subiu = { share: up2.share, bytes: bytes2 };
        } catch (e2) {
          mensagens.push(`variante "${label}" ficou no link da origem (${e2.message})`);
        }
        extra = subiu
          ? {
              label,
              version: vers,
              minecraft_versions: [vers],
              download_url: subiu.share,
              downloadProvider: 'terabox',
              fileSize: `${(subiu.bytes / 1048576).toFixed(1)} MB`,
            }
          : {
              label,
              version: vers,
              minecraft_versions: [vers],
              download_url: dl2.url,
              downloadProvider: 'original',
            };
      } catch { /* arquivo sem URL */ }
      if (extra) extras.push(extra);
      await sleep(1200);
    }
    if (extras.length > 0) registro.files = extras;
    rmSync(tempDir(job.key), { recursive: true, force: true });
  } else if (autorizado) {
    const err = new Error('marcado como autorizado, mas nenhum id de arquivo pra resolver');
    err.permanent = true;
    throw err;
  } else {
    // sem autorização: preserva o caminho oficial, nada sobe pra conta
    if (fileIdSel) {
      const dl = await mc.download(fileIdSel);
      registro.download_url = dl.url;
      mensagens.push('SEM autorização — download_url = link oficial da origem');
    } else {
      registro.download_url = url;
      mensagens.push('SEM autorização e sem arquivo direto — download_url = página da origem');
    }
    const extras = [];
    for (let fi = 1; fi < Math.min(d.list.length, 5); fi++) {
      const item = d.list[fi];
      const fid = item.files?.[0]?.id ?? 0;
      if (!fid) continue;
      try {
        const dl2 = await mc.download(fid);
        extras.push({
          label: item.name ?? `arquivo ${fi + 1}`,
          version: parseRangeMin(item.version) || '—',
          minecraft_versions: [parseRangeMin(item.version) || '1.21.0'],
          download_url: dl2.url,
          downloadProvider: 'original',
        });
      } catch { /* arquivo sem URL */ }
      await sleep(1200);
    }
    if (extras.length > 0) registro.files = extras;
  }

  if (registro.version === 'PLACEHOLDER-VERSION') registro.version = parseRangeMin(range) || '1.0.0';

  // escreve incoming/*.json (fluxo existente de importação)
  const outPath = join(root, 'incoming', `mcpedl-${siteId}.json`);
  writeFileSync(outPath, JSON.stringify(registro, null, 2) + '\n');

  return { registro, mensagens, result, outPath };
}

function bufSync(path) {
  return readFileSync(path);
}

// ─── main ──────────────────────────────────────────────────────────────────
const total = queue.length;
const candidatos = ONLY.length
  ? queue.filter((j) => j.status === 'pending' && ONLY.includes(j.key) === true)
  : queue.filter((j) => j.status === 'pending');
const lote = candidatos.slice(0, JOBS);

if (ONLY.length && lote.length < Math.min(JOBS, ONLY.length)) {
  const faltando = ONLY.filter((id) => !lote.some((j) => j.key === id));
  console.warn(`⚠ --only: não achei pendente(s): ${faltando.join(', ')}`);
}
const counters = { processed: 0, tb: 0, original: 0, failed: 0 };
console.log(`Fila: ${total} tarefas · lote de ${lote.length} (--jobs=${JOBS}) · #autorizados neste lote: ${lote.filter(isAuthorized).length}`);

for (const job of lote) {
  if (readControl().paused) { console.log('⏸  pausa detectada — encerrando o lote aqui'); break; }

  job.status = 'processing';
  writeQueue(queue);
  try {
    if (sourceIds.has(job.postId)) {
      const err = new Error('já está no catálogo (dedupe por id da fonte)');
      err.permanent = true;
      throw err;
    }
    const { registro, mensagens, result, outPath } = await processar(job);
    job.status = 'done';
    job.authorized = isAuthorized(job);
    job.siteId = registro.id;
    job.downloadProvider = result.downloadProvider;
    job.link = result.downloadProvider === 'terabox' ? result.teraboxLinks[0] : registro.download_url;
    job.incoming = outPath;
    job.processedAt = new Date().toISOString();
    job.lastError = null;
    counters.processed++;
    if (result.downloadProvider === 'terabox') counters.tb++; else counters.original++;
    siteIds.add(registro.id);
    sourceIds.add(job.postId);
    console.log(`✓ ${registro.id} → incoming/ (provider=${result.downloadProvider})`);
    for (const m of mensagens) console.log('   ·', m);
    if (result.downloadProvider === 'terabox') {
      console.log('   ⚠ conteúdo hospedado por nós — garante que o criador autorizou redistribuição.');
    }
    logState('job-done', `${job.postId} → ${registro.id} (${result.downloadProvider})`);
  } catch (e) {
    const err = e ?? {};
    const permanent = err.permanent === true;
    job.attempts = (job.attempts ?? 0) + 1;
    job.lastError = String(err.message ?? err);
    if (permanent || job.attempts >= 3) {
      job.status = 'failed';
      counters.failed++;
      console.log(`✕ ${job.postId}: ${job.lastError}${permanent ? ' (erro permanente)' : ` (${job.attempts} tentativas)`}`);
      logState('job-failed', `${job.postId}: ${job.lastError}`);
    } else {
      job.status = 'pending';
      console.log(`↻ ${job.postId}: ${job.lastError} — volta pra fila (tentativa ${job.attempts})`);
      logState('job-retry', `${job.postId}: ${job.lastError}`);
    }
  }
  writeQueue(queue);
  await sleep(2500);
}

const s = readState();
s.lastRun = { at: new Date().toISOString(), ...counters };
s.totals = {
  ...s.totals,
  discovered: Math.max(total, s.totals?.discovered ?? 0),
  uploadedTb: (s.totals?.uploadedTb ?? 0) + counters.tb,
  viaOriginal: (s.totals?.viaOriginal ?? 0) + counters.original,
  falhas: (s.totals?.falhas ?? 0) + counters.failed,
};
writeState(s);

const done = queue.filter((j) => j.status === 'done').length;
console.log(`\n✓ lote id: ${counters.processed} processados (TeraBox ${counters.tb} · origem ${counters.original}) · ${counters.failed} falha(s) · fila prontos: ${done}/${total}${queue.some((j) => j.status === 'pending') ? ' · pendentes restantes' : ''}`);
if (counters.processed > 0 && !PUBLISH) {
  console.log('Próximos passos (revise primeiro):');
  console.log('  1) confira os JSONs em incoming/');
  console.log('  2) npm run import — valida e publica no catálogo');
  console.log('  3) fluxo habitual: npm run build → commit → deploy');
}
if (PUBLISH && counters.processed > 0) {
  console.log('\n--publish: rodando npm run import…');
  spawn(process.execPath, ['scripts/import-addon.mjs'], { cwd: root, stdio: 'inherit' });
}
