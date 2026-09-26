// Transfere arquivo de um link compartilhado (/s/<codigo>) para o seu TeraBox
// e gera SEU link público. Sem navegador, sem download.
// Uso: node scripts/tb-transfer.mjs <codigo-ou-url> [--dir=/CursedRock-inbox]
// Imprime: SHARE_URL=https://1024terabox.com/s/<codigo>
// Cookie: --cookie= / $TB_NDUS / %APPDATA%/CursedRock/tb-cookie.txt
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const UA = 'terabox;1.40.0.132;PC;PC-Windows;10.0.26100;WindowsTeraBox';
const APP = 'app_id=250528&web=1&channel=dubox&clienttype=0';
const WHOST = 'https://www.terabox.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cookie() {
  const arg = process.argv.find((a) => a.startsWith('--cookie='))?.slice(9);
  if (arg) return arg.startsWith('ndus=') ? arg : `ndus=${arg}`;
  if (process.env.TB_NDUS) {
    const v = process.env.TB_NDUS;
    return v.startsWith('ndus=') ? v : `ndus=${v}`;
  }
  const f = join(homedir(), 'AppData', 'Roaming', 'CursedRock', 'tb-cookie.txt');
  if (existsSync(f)) {
    const v = readFileSync(f, 'utf8').trim();
    return v.startsWith('ndus=') ? v : `ndus=${v}`;
  }
  console.error('Sem cookie. Passe --cookie=<ndus>, $TB_NDUS ou salve em %APPDATA%/CursedRock/tb-cookie.txt');
  process.exit(1);
}

const CK_RAW = cookie();
const CK = CK_RAW + '; browserid=' + randomBytes(22).toString('base64');
const H = { 'User-Agent': UA, Cookie: CK, 'Content-Type': 'application/x-www-form-urlencoded', Referer: WHOST };
// transferência e demais escritas usam cookie PURO (browserid aleatório quebra o verify)
const H_PLAIN = { 'User-Agent': UA, Cookie: CK_RAW, 'Content-Type': 'application/x-www-form-urlencoded', Referer: WHOST };

async function req(url, opts = {}, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      return await fetch(url, { ...opts, signal: AbortSignal.timeout(45000) });
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(3000 * (i + 1));
    }
  }
}
const post = (p, f, plain = false) => req(`${WHOST}${p}?${APP}`, { method: 'POST', headers: plain ? H_PLAIN : H, body: new URLSearchParams(f) }).then((r) => r.json());

async function bootstrap() {
  const html = await (await req(`${WHOST}/main`, { headers: { 'User-Agent': UA, Cookie: CK } })).text();
  const m = html.match(/var templateData = (\{.*?\});<\/script>/s);
  let js = '', bd = '', logid = '';
  if (m) {
    try {
      const t = JSON.parse(m[1]);
      const jm = (t.jsToken || '').match(/%28%22(.*)%22%29/);
      js = jm ? jm[1] : t.jsToken;
      bd = t.bdstoken || '';
    } catch { /* sem tokens */ }
  }
  const probe = await req(`${WHOST}/api/quota?checkexpire=1`, { headers: { 'User-Agent': UA, Cookie: CK } });
  logid = probe.headers.get('logid') || '';
  return { js, bd, logid };
}

async function main() {
  const raw = process.argv[2];
  const dir = process.argv.find((a) => a.startsWith('--dir='))?.slice(6) ?? '/CursedRock-inbox';
  if (!raw) {
    console.error('Uso: node scripts/tb-transfer.mjs <codigo-ou-url> [--dir=/pasta]');
    process.exit(1);
  }
  const code = raw.split('/s/').pop().split('?')[0];

  // 1) info do link alheio
  const info = await (await req(`${WHOST}/api/shorturlinfo?shorturl=${code}&root=1`, { headers: { 'User-Agent': UA, Cookie: CK } })).json();
  if (info.errno !== 0 || !info.list?.length) throw new Error('Link inválido ou vazio: ' + JSON.stringify(info).slice(0, 160));
  const f = info.list[0];
  console.log(`[tb] origem: ${f.server_filename} (${(f.size / 1024).toFixed(0)} KB)`);

  // 3) transfere (com retry: errno 2 costuma ser transitório)
  let tr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const b = await bootstrap();
    const qq = `dp-logid=${encodeURIComponent(b.logid)}&jsToken=${encodeURIComponent(b.js)}${b.bd ? `&bdstoken=${encodeURIComponent(b.bd)}` : ''}`;
    tr = await post(`/share/transfer?${qq}&ondup=newcopy&async=1&shareid=${info.shareid}&from=${info.uk}`, {
      fsidlist: JSON.stringify([f.fs_id]),
      path: dir,
    }, true);
    if (tr.errno === 0) break;
    console.log(`[tb] transfer tentativa ${attempt} → errno=${tr.errno}, tentando de novo…`);
    await sleep(8000);
  }
  if (tr.errno !== 0) throw new Error('transfer falhou: ' + JSON.stringify(tr).slice(0, 200));
  console.log('[tb] transferência aceita, aguardando chegada…');

  // 4) aguarda o arquivo
  let mine = null;
  for (let i = 0; i < 12 && !mine; i++) {
    const l = await post('/api/list', { dir, order: 'name', desc: '0', num: '100', page: '1', showempty: '0' }, true);
    mine = (l.list ?? []).find((x) => x.server_filename === f.server_filename);
    if (!mine) await sleep(5000);
  }
  if (!mine) throw new Error('Arquivo não chegou ao seu drive');
  console.log('[tb] no seu drive: ' + mine.path);

  // 5) seu link público
  const s = await post('/share/pset', { schannel: '0', channel_list: '[]', period: '0', path_list: JSON.stringify([mine.path]), pwd: '' }, true);
  if (s.errno !== 0 || !s.link) throw new Error('share falhou: ' + JSON.stringify(s).slice(0, 200));
  console.log('SHARE_URL=' + s.link);
}

main().catch((e) => {
  console.error('[tb] ERRO:', e.message);
  process.exit(1);
});
