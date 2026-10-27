// Painel de controle da importação — servidor LOCAL (127.0.0.1), nunca faz
// parte do site. Visitantes da internet não têm acesso: ele roda apenas na sua
// máquina e não é publicado no deploy do Cloudflare. Credenciais do TeraBox
// (ndus) NUNCA são lidas nem mostradas por este painel.
// Uso: npm run imports:panel → http://127.0.0.1:8765
// Mostra: totais, links validados, falhas, última execução, progresso da fila.
// Ações: iniciar lote, pausar, retomar, reprocessar falhas.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readQueue, writeQueue, readControl, writeControl, readState } from './imports-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = parseInt(process.argv.find((a) => a.startsWith('--port='))?.slice(7) ?? '8765') || 8765;

const readQueueSafe = () => { try { return readQueue(); } catch { return []; } };
const readStateSafe = () => { try { return readState(); } catch { return { totals: {}, log: [] }; } };

function workerVivo() {
  try {
    const pid = parseInt(readControl().workerPid ?? '0');
    if (!pid) return null;
    process.kill(pid, 0); // sinal 0 = só checa existência
    return pid;
  } catch { return null; }
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function paginaHtml() {
  const q = readQueueSafe();
  const s = readStateSafe();
  const pid = workerVivo();
  const cont = readControl();
  const pendentes = q.filter((j) => j.status === 'pending').length;
  const prontos = q.filter((j) => j.status === 'done').length;
  const falhas = q.filter((j) => j.status === 'failed').length;
  const tb = q.filter((j) => j.downloadProvider === 'terabox').length;
  const origem = q.filter((j) => j.downloadProvider === 'original').length;

  const linhas = [...q].reverse().slice(0, 120).map((j) => `
    <tr>
      <td>${esc(j.postId)}</td>
      <td>${esc(j.name ?? '')}</td>
      <td class="${esc(j.status)}">${esc(j.status)}</td>
      <td>${j.attempts ?? 0}</td>
      <td class="err">${esc(j.lastError ?? '')}</td>
      <td>${esc(j.downloadProvider ?? '')}</td>
      <td>${j.downloadProvider === 'terabox' ? `<a href="${esc(j.link ?? '')}" target="_blank" rel="noopener">terabox</a>` : (j.link ? `<a href="${esc(j.link)}" target="_blank" rel="noopener">origem</a>` : '')}</td>
    </tr>`).join('\n');

  const logLinhas = (s.log ?? []).slice(0, 40).map((l) =>
    `<li><span class="ts">${esc(l.ts.replace('T', ' ').slice(0, 19))}</span> <b>${esc(l.type)}</b> ${esc(l.message)}</li>`).join('');

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>CursedRock · Painel de importação</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{background:#050507;color:#e8e8ee;font-family:system-ui,sans-serif;margin:0;padding:24px}
h1{font-size:20px;margin:0 0 2px}.sub{color:#8a8a97;font-size:12.5px;margin-bottom:16px}
h3{font-size:14px;color:#cfcfd8;margin:22px 0 6px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:10px;margin:0 0 18px}
.k{background:#14141a;border:1px solid #26262f;border-radius:10px;padding:12px}.k b{font-size:20px;display:block}.k span{color:#8a8a97;font-size:10.5px;text-transform:uppercase;letter-spacing:1px}
button{background:#d40f28;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-weight:600;cursor:pointer;margin:0 8px 8px 0}
button.sec{background:#26262f}button:disabled{opacity:.4;cursor:not-allowed}
table{width:100%;border-collapse:collapse;font-size:12.5px}th{color:#8a8a97;text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:1px}
td,th{padding:6px 8px;border-bottom:1px solid #1d1d24;vertical-align:top}.err{color:#b58b8b}
.done{color:#7ddc93}.pending{color:#e6c64b}.failed{color:#ff6b6b}.processing{color:#5db3ff}a{color:#ff5c74}
ul{font-size:12px;color:#9a9aa5;list-style:none;padding-left:0}.ts{color:#666}
</style></head><body>
<h1>Painel de importação — CursedRock</h1>
<div class="sub">✕ roda SÓ no seu PC (127.0.0.1) — visitantes do site público não têm nada disso · ndus nunca aparece aqui</div>

<div class="grid">
  <div class="k"><b>${q.length}</b><span>descobertos</span></div>
  <div class="k"><b>${pendentes}</b><span>pendentes</span></div>
  <div class="k"><b>${prontos}</b><span>prontos</span></div>
  <div class="k"><b>${tb}</b><span>upload TeraBox</span></div>
  <div class="k"><b>${origem}</b><span>link original</span></div>
  <div class="k"><b>${falhas}</b><span>falhas</span></div>
  <div class="k"><b>${s.lastRun?.at ? new Date(s.lastRun.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</b><span>última execução</span></div>
  <div class="k"><b>${s.lastDiscover?.at ? new Date(s.lastDiscover.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}</b><span>última descoberta</span></div>
  <div class="k"><b>${pid ? 'ativo' : 'parado'}</b><span>worker${pid ? ` (pid ${pid})` : ''}${cont.paused ? ' · pausado' : ''}</span></div>
</div>

<div>
  <button id="go" ${pid ? 'disabled' : ''}>▶ Iniciar lote</button>
  <button id="pause" class="sec">${pid || cont.paused ? '▶ Retomar (despausa)' : '⏸ Pausar próximos'}</button>
  <button id="retry" class="sec" ${falhas === 0 ? 'disabled' : ''}>↻ Reprocessar ${falhas} falha(s)</button>
  <button onclick="location.reload()" class="sec">Atualizar</button>
</div>

${s.log && s.log.length ? `<h3>Log recente</h3><ul>${logLinhas}</ul>` : ''}

<h3>Fila (mais recentes primeiro)</h3>
${q.length === 0 ? '<p class="sub">Fila vazia — rode <code>npm run imports:discover -- --latest</code> ou <code>--search="termo"</code></p>' : `
<table>
<tr><th>id de origem</th><th>nome</th><th>status</th><th>tents</th><th>erro</th><th>download</th><th>link</th></tr>
${linhas}
</table>`}

<script>
const post = (u, msg) => fetch(u, { method: 'POST' }).then(r => r.text()).then(t => { alert(t); location.reload(); });
document.getElementById('go').onclick = () => post('/start?jobs=3');
document.getElementById('pause').onclick = () => post('/pause');
document.getElementById('retry').onclick = () => post('/retry');
</script>
</body></html>`;
}

const server = createServer((req, res) => {
  const method = req.method ?? 'GET';
  const url = req.url ?? '/';

  if (method === 'GET' && (url === '/' || url.startsWith('/index'))) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(paginaHtml());
    return;
  }

  if (method === 'POST' && url.startsWith('/pause')) {
    const cont = readControl();
    const nova = cont.paused !== true;
    writeControl({ paused: nova });
    // quem está rodando checa control.json entre tarefas; pausa agora tb mata worker ativo
    const pid = workerVivo();
    if (nova && pid) {
      try { process.kill(pid); } catch { /* já saiu */ }
      writeControl({ paused: true, workerPid: null, lastPause: new Date().toISOString() });
      res.writeHead(200);
      res.end(`⏸ Pausado (worker pid ${pid} interrompido; estado da fila salvo).`);
    } else {
      res.writeHead(200);
      res.end(nova ? '⏸ Paused — próximos lotes não começam até retomar.' : '▶ Despausado — clique em Iniciar lote.');
    }
    return;
  }

  if (method === 'POST' && url.startsWith('/start')) {
    if (workerVivo()) { res.writeHead(409); res.end('worker já está rodando.'); return; }
    const jobs = Math.min(20, Math.max(1, parseInt(new URL(url, 'http://x').searchParams.get('jobs') ?? '3') || 3));
    writeControl({ paused: false });
    const child = spawn(process.execPath, ['scripts/mcpedl-process.mjs', `--jobs=${jobs}`], { cwd: root, detached: true, stdio: 'ignore' });
    child.unref();
    writeControl({ workerPid: child.pid, startedAt: new Date().toISOString() });
    res.writeHead(200);
    res.end(`✓ Lote em execução (jobs=${jobs}). Atualize em uns instantes.`);
    return;
  }

  if (method === 'POST' && url.startsWith('/retry')) {
    const q = readQueueSafe();
    const failed = q.filter((j) => j.status === 'failed');
    for (const j of failed) { j.status = 'pending'; j.attempts = 0; }
    writeQueue(q);
    res.writeHead(200);
    res.end(`${failed.length} falhada(s) de volta pra fila — Inicie um lote.`);
    return;
  }

  res.writeHead(404);
  res.end('só GET / e os POSTs de ação');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Painel local: http://127.0.0.1:${PORT}`);
  console.log('Não fecha? Ctrl+C encerra. Nada disso vai pro site público.');
});
