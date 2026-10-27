// Descobridor MCPEDL → preenche a fila persistente imports/queue.json.
// Uso:
//   node scripts/mcpedl-discover.mjs --search="vein miner" [--pages=2] [--max=30]
//   node scripts/mcpedl-discover.mjs --latest [--pages=1] [--max=30]
// Pagina de verdade e deduplica por id da fonte (nada é reprocessado à toa).
// API: vendor real (scripts/vendor/mcpedl) — McpedlAPI.search()/mclatest().
import { McpedlAPI } from './vendor/mcpedl/dist/index.cjs';
import { readQueue, writeQueue, readState, writeState, logState, sleep } from './imports-lib.mjs';

const flag = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const flagN = (n, d) => Math.max(1, parseInt(flag(n, String(d))) || d);
const isLatest = process.argv.includes('--latest');
const search = flag('search', '');
const pages = flagN('pages', 1);
const maxAdd = flagN('max', 30);

if (!isLatest && !search) {
  console.error('Uso: --search="<termo>" ou --latest (flag --pages/--max opcional)');
  process.exit(1);
}

const mc = new McpedlAPI({ rateLimit: { minTime: 2000, maxConcurrent: 1 } });
const queue = readQueue();
const known = new Set(queue.map((j) => j.postId));
let added = 0;

const pushJob = (name, postId, img, fileId = 0) => {
  if (!postId) return;
  if (known.has(postId)) return;
  known.add(postId);
  if (added >= maxAdd) return;
  queue.push({
    key: postId,
    postId,
    name: (name || '').trim(),
    img: img || '',
    fileId: fileId || 0, // pré-resolvido (quick download) ou 0 → resolve no processamento
    source: 'mcpedl',
    href: `https://mcpedl.org/${postId}/`,
    status: 'pending',
    attempts: 0,
    createdAt: new Date().toISOString(),
  });
  added++;
};

for (let p = 1; p <= pages; p++) {
  try {
    if (isLatest) {
      const r = await mc.mclatest(p);
      for (const q of r.quick ?? []) pushJob(q.name, q.id, '', q.file);
      for (const it of r.list ?? []) pushJob(it.name, it.id, it.img);
      console.log(`latest página ${p}: +${r.quick?.length ?? 0} arquivos diretos, +${r.list?.length ?? 0} fichas`);
    } else {
      const r = await mc.search(search, p);
      for (const it of r.list ?? []) pushJob(it.name, it.id, it.img);
      console.log(`busca "${search}" página ${p}: ${r.list?.length ?? 0} itens${r.hasNextPage ? ' (tem próxima página)' : ' (fim)'}`);
      if (!r.hasNextPage) break;
    }
  } catch (e) {
    console.error(`✕ página ${p}: ${e.code ?? 'ERRO'} ${e.message}`);
    logState('discover-erro', `${e.code ?? ''} ${e.message}`);
    break;
  }
  await sleep(1500);
}

writeQueue(queue);
const total = queue.length;
const pend = queue.filter((j) => j.status === 'pending').length;
const s = readState();
s.lastDiscover = { at: new Date().toISOString(), added, mode: isLatest ? 'latest' : `search:"${search}"`, pages, pendingTotal: pend };
writeState(s);
console.log(`\n✓ fila: +${added} novos (total ${total}, pendentes ${pend})`);
console.log('Próximo passo: npm run imports:run (processa em lote, sem publicar nada sozinho).');
