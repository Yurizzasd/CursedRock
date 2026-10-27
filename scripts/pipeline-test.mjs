// Teste ponta-a-ponta OBRIGATÓRIO do pipeline antes de ampliar lotes.
// Uso: npm run imports:test
//
// Checa, na ordem exata do documento de requisitos:
//  1. consulta à API (busca real, ao vivo)
//  2. identificação de um addon (detail, com campos honestos)
//  3. acesso a um arquivo da origem (só resolve + checa a URL; nada é
//     redistribuído: HEAD/range curto, sem persistir arquivos de terceiros)
//  4. upload de UM arquivo de TESTE NOSSO (micro .mcaddon criado aqui, é nosso)
//     para /CursedRock-teste, via tb-api-upload.mjs (ferramenta real)
//  5. validação do link de compartilhamento retornado (HTTP 200 + formato /s/)
//  6. cadastro de um único addon no CursedRock (npm run import local)
//  7. o addon aparece corretamente no site (dev server local, página /addon/<id>)
//  8. dedupe: reprocessar o mesmo id de origem é bloqueado
// Depois de tudo: o addon de teste é REMOVIDO (repositório fica limpo).
// Sai com código 1 se qualquer etapa falhar — não amplie lotes até passar.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { McpedlAPI } from './vendor/mcpedl/dist/index.cjs';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TB_TEST_DIR = '/CursedRock-teste';
const TEST_ID = 'test-pipeline-cr';

const results = [];
const pass = (n, d) => { results.push({ n, ok: true, d }); console.log(`✓ ${n}${d ? ' — ' + d : ''}`); };
const fail = (n, d) => { results.push({ n, ok: false, d }); console.error(`✕ ${n}${d ? ' — ' + d : ''}`); };

// ═══════════════════════════════ 1. API ao vivo ═══════════════════════════════
let primeiraFicha = null;
{
  const mc = new McpedlAPI({ rateLimit: { minTime: 2000, maxConcurrent: 1 } });
  try {
    const s = await mc.search('vein miner', 1);
    if (s.list?.length >= 1 && s.list[0].id) pass('1. consulta à API', `${s.list.length} itens, primeiro: ${s.list[0].id}`);
    else fail('1. consulta à API', `retorno estranho: ${JSON.stringify(s).slice(0, 120)}`);
    const id0 = s.list[0].id;
    // ═══════════════════════════════ 2. identificação ═══════════════════════════════
    const d = await mc.detail(id0);
    const ok2 = !!d.title && !!d.img && Array.isArray(d.list) && d.list[0]?.files?.[0]?.id > 0;
    if (ok2) {
      primeiraFicha = { id: id0, titulo: d.title, versao: d.list[0].version, fileId: d.list[0].files[0].id };
      pass('2. identificação de addon', `"${d.title}" · faixa ${d.list[0].version} · fileId ${d.list[0].files[0].id}`);
    } else fail('2. identificação de addon', `campos ausentes: ${JSON.stringify({ title: d.title, files: d.list?.[0] }).slice(0, 160)}`);
    // ═══════════════════════════════ 3. acesso a arquivo ═══════════════════════════════
    const dl = await mc.download(d.list[0].files[0].id);
    const head = await fetch(dl.url, { method: 'GET', headers: { Range: 'bytes=0-63', 'User-Agent': 'Mozilla/5.0' } });
    if (head.status === 200 || head.status === 206) pass('3. acesso a arquivo da origem', `URL responde ${head.status} (não redistribuída, só testada)`);
    else fail('3. acesso a arquivo da origem', `HTTP ${head.status} em ${dl.url}`);
  } catch (e) {
    fail('1-3. API/identificação/arquivo', `${e.code ?? ''} ${e.message}`);
  }
}

// ═══════════════════════════════ 4. upload de arquivo NOSSO ═══════════════════════════════
let linkTeste = null;
{
  let tmpZip;
  try {
    // micro .mcaddon: manifest.json válido + pack_icon.png de 8x8 (criado por nós)
    tmpZip = join(root, 'imports', 'downloads', 'test-pipeline', 'test-pipeline.mcaddon');
    mkdirSync(dirname(tmpZip), { recursive: true });
    const manifest = JSON.stringify({
      format_version: 2,
      header: { name: 'CursedRock Pipeline Test', description: 'upload de teste', uuid: 'f8fe5f7d-841d-4b36-8c1e-b7c111111111', version: [1, 0, 0], min_engine_version: [1, 21, 0] },
      modules: [{ type: 'data', uuid: 'f8fe5f7d-841d-4b36-8c1e-b7c222222222', version: [1, 0, 0] }],
    }, null, 2);
    // PNG 1x1 vermelho (bytes conhecidos)
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000001d4944415478da63fcffff3f0304000000010103000000004907ff59652fb2d3', 'hex');
    // zip pelo PowerShell (nativa do Windows): pasta temporária → Compress-Archive
    const tmpDir = dirname(tmpZip);
    writeFileSync(`${tmpDir}/manifest.json`, manifest);
    writeFileSync(`${tmpDir}/pack_icon.png`, png);
    const zipRes = spawnSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path "${tmpDir}\\*" -DestinationPath "${tmpDir}\\out.zip" -Force`]);
    if (zipRes.status !== 0 || !existsSync(`${tmpDir}/out.zip`)) throw new Error('zip de teste falhou');
    rmSync(`${tmpDir}/manifest.json`); rmSync(`${tmpDir}/pack_icon.png`);
    renameSafe(`${tmpDir}/out.zip`, tmpZip);
    pass('4. arquivo de teste criado', 'micro .mcaddon nosso (1 manifest, pack_icon)');
    // upload real via tb-api-upload.mjs
    const up = spawnSync(process.execPath, ['scripts/tb-api-upload.mjs', tmpZip, `--dir=${TB_TEST_DIR}`], { encoding: 'utf8', timeout: 15 * 60 * 1000 });
    const m = (up.stdout ?? '').match(/SHARE_URL=(\S+)/);
    if (up.status === 0 && m) { linkTeste = m[1]; pass('4. upload TeraBox (pasta de teste)', `${TB_TEST_DIR} → ${linkTeste}`); }
    else fail('4. upload TeraBox', `exit ${up.status} ${(up.stderr ?? '').slice(0, 140)}`);
  } catch (e) { fail('4. upload de teste', e.message); }
}

// ═══════════════════════════════ 5. validação do link ═══════════════════════════════
if (linkTeste) {
  let ok5 = false, detalhe5 = '';
  for (let tent = 1; tent <= 3 && !ok5; tent++) {
    try {
      const r = await fetch(linkTeste, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36' } });
      const urlFinal = r.url ?? '';
      detalhe5 = `HTTP ${r.status} → ${urlFinal.slice(0, 70)}`;
      // válido: 200 E deu pra chegar à página de compartilhamento (/s/ ou sharing/link?surl=)
      ok5 = r.status === 200 && (/\/s\/[A-Za-z0-9]+/.test(linkTeste) || /sharing\/link\?surl=/.test(urlFinal));
    } catch (e) {
      detalhe5 = e.message + (e.cause ? ` (${e.cause.code ?? e.cause.message})` : '');
    }
    if (!ok5 && tent < 3) await new Promise((r) => setTimeout(r, 2000));
  }
  ok5 ? pass('5. link de compartilhamento validado', detalhe5) : fail('5. validação do link', `${linkTeste} — ${detalhe5}`);
} else fail('5. validação do link', 'sem link da etapa 4');
// ═══════════════════════════════ 6. cadastro único + 8. dedupe ═══════════════════════════════
const addonsPath = join(root, 'src/data/addons.json');
if (linkTeste) {
  try {
    const registro = {
      id: TEST_ID, name: 'Pipeline Test ( remover )', author: 'unknown',
      description: 'Registro de TESTE do pipeline — não é um addon real.', category: 'other',
      version: '1.0.0', minecraft_versions: ['1.21.0'],
      thumbnail: '/images/addons/test-pipeline/test.svg', screenshots: [],
      download_url: linkTeste, downloadProvider: 'terabox', redistributionAuthorized: true,
      tags: ['Test'], featured: false, createdAt: '2026-01-01', updatedAt: '2026-01-01',
      sourceUrl: 'https://example.com/test', sourceId: 'test-pipeline', importedAt: new Date().toISOString().slice(0, 10),
    };
    mkdirSync(join(root, 'public/images/addons/test-pipeline'), { recursive: true });
    writeFileSync(join(root, 'public/images/addons/test-pipeline/test.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#d40f28"/></svg>');
    writeFileSync(join(root, 'incoming', 'test-pipeline.json'), JSON.stringify(registro, null, 2));
    const imp = spawnSync(process.execPath, ['scripts/import-addon.mjs'], { encoding: 'utf8' });
    const addons = JSON.parse(readFileSync(addonsPath, 'utf8'));
    const achou = addons.find((a) => a.id === TEST_ID);
    if (imp.status === 0 && achou && achou.download_url === linkTeste) {
      pass('6. cadastro único no CursedRock', `${TEST_ID} em src/data/addons.json com link validado`);
    } else fail('6. cadastro único', `import exit ${imp.status}; achou: ${!!achou}`);
    // ═══════════════════════════════ 7. aparece no site (dev server) ═══════════════════════════════
    const dev = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port=5199', '--strictPort'], { cwd: root, stdio: 'ignore' });
    let ok7 = false, detalhe7 = '';
    for (let tent = 1; tent <= 20 && !ok7; tent++) {
      await new Promise((r) => setTimeout(r, 800));
      try {
        const page = await fetch('http://localhost:5199/addon/test-pipeline-cr');
        detalhe7 = `HTTP ${page.status}`;
        ok7 = page.status === 200;
      } catch (e) {
        detalhe7 = e.message + (e.cause ? ` (${e.cause.code ?? e.cause.message})` : '');
      }
    }
    dev.kill();
    ok7 ? pass('7. addon aparece no site', `GET /addon/test-pipeline-cr → 200 (dev server)`) : fail('7. aparece no site', detalhe7);
    // ═══════════════════════════════ 8. dedupe no worker ═══════════════════════════════
    // aprova um job com o MESMO id de origem já cadastrado → o worker deve
    // bloquear SEM rede (dedupe por sourceId), status "failed (perm.)".
    const queuePath = join(root, 'imports', 'queue.json');
    const bakQ = existsSync(queuePath) ? readFileSync(queuePath) : null;
    const statePath = join(root, 'imports', 'state.json');
    const bakS = existsSync(statePath) ? readFileSync(statePath) : null;
    try {
      writeFileSync(queuePath, JSON.stringify([{
        key: 'test-pipeline', postId: 'test-pipeline', name: 'dedupe-test',
        img: '', fileId: 0, source: 'mcpedl', href: 'https://mcpedl.org/test-pipeline/',
        status: 'pending', attempts: 0, createdAt: new Date().toISOString(),
      }]));
      spawnSync(process.execPath, ['scripts/mcpedl-process.mjs', '--jobs=1'], { encoding: 'utf8' });
      const q = JSON.parse(readFileSync(queuePath, 'utf8'));
      const t = q[0];
      const bloqueado = t.status === 'failed' && /já está no catálogo/.test(t.lastError ?? '');
      if (bloqueado) pass('8. dedupe: é bloqueado sem rede e sem duplicar', `status=${t.status} · "${t.lastError}"`);
      else fail('8. dedupe por id da fonte', `status=${t.status} erro="${t.lastError}"`);
    } finally {
      if (bakQ) writeFileSync(queuePath, bakQ);
      else rmSync(queuePath, { force: true });
      if (bakS) writeFileSync(statePath, bakS);
      else rmSync(statePath, { force: true });
    }
  } catch (e) { fail('6-8. cadastro/site/dedupe', e.message); }
} else fail('6-8', 'dependem da etapa 4 (upload)');

// ─── limpeza: repo volta limpo ────────────────────────────────────────────
try {
  rmSync(join(root, 'incoming', 'test-pipeline.json'), { force: true });
  rmSync(join(root, 'incoming', 'done', 'test-pipeline.json'), { force: true });
  const addons = JSON.parse(readFileSync(addonsPath, 'utf8'));
  writeFileSync(addonsPath, JSON.stringify(addons.filter((a) => a.id !== TEST_ID), null, 2) + '\n');
  rmSync(join(root, 'public/images/addons/test-pipeline'), { recursive: true, force: true });
  rmSync(join(root, 'imports/downloads/test-pipeline'), { recursive: true, force: true });
  spawnSync(process.execPath, ['scripts/generate-sitemap.mjs'], { stdio: 'ignore' });
  console.log('limpeza: addon de teste removido, sitemap regenerado');
} catch (e) { console.error('limpeza:', e.message); }

const ok = results.every((r) => r.ok);
console.log(`\n${ok ? '✅ TUDO PASSOU — lotes podem ser ampliados gradualmente (--jobs=N).' : '🛑 HÁ FALHAS — não rode importação em massa ainda.'}`);
if (!ok) process.exit(1);

function renameSafe(from, to) {
  try { rmSync(to); } catch { /* inexistente */ }
  renameSync(from, to);
}
