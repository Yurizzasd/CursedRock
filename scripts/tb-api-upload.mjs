// Upload para o TeraBox via API direta + criação do link de compartilhamento.
// Uso: TB_NDUS=<ndus> node scripts/tb-api-upload.mjs <arquivo> [--dir=/pasta]
// Imprime: SHARE_URL=https://1024terabox.com/s/<codigo>
// Sem navegador, sem janela. Cookie lido de (ordem): --cookie=, $TB_NDUS,
// %APPDATA%/CursedRock/tb-cookie.txt
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { homedir, tmpdir } from 'node:os';

const WHOST_DEFAULT = 'https://www.terabox.com';
const UHOST = 'https://c-all.terabox.com';
const UA = 'terabox;1.40.0.132;PC;PC-Windows;10.0.26100;WindowsTeraBox';
const APP = 'app_id=250528&web=1&channel=dubox&clienttype=0';
const CHUNK = 4 * 1024 * 1024;

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

// crc32 padrão (single table)
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
const md5 = (buf) => createHash('md5').update(buf).digest('hex');

async function api(path, form, method = 'POST') {
  const q = APP + (JSTOKEN ? `&jsToken=${encodeURIComponent(JSTOKEN)}` : '');
  const res = await fetch(`${WHOST}${path}?${q}`, {
    method,
    headers: { 'User-Agent': UA, Cookie: CK, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json.errno !== undefined && json.errno !== 0)) {
    throw new Error(`${path} → HTTP ${res.status} errno=${json.errno} ${json.errmsg ?? ''} ${json.show_msg ?? ''}`.trim());
  }
  return json;
}

let CK = '';
let WHOST = WHOST_DEFAULT;
let JSTOKEN = '';

function mergeCookies(setCookieHeaders) {
  if (!setCookieHeaders) return;
  const arr = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  const map = new Map(CK.split(';').map((s) => s.trim().split('=')));
  for (const h of arr) {
    const pair = h.split(';')[0];
    const eq = pair.indexOf('=');
    if (eq > 0) map.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
  CK = [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

// espelha updateAppData do terabox-api: segue redirect, mescla cookies, extrai jsToken
async function bootstrap() {
  let url = WHOST + '/main';
  for (let i = 0; i < 5; i++) {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': UA, Cookie: CK },
      redirect: 'manual',
    });
    const loc = res.headers.get('location');
    mergeCookies(res.headers.getSetCookie?.() ?? res.headers.get('set-cookie'));
    if (res.status >= 300 && res.status < 400 && loc) {
      if (loc === '/login' || loc.endsWith('/login')) throw new Error('Sessão inválida (redirecionou pro login). Renove o ndus.');
      url = loc.startsWith('http') ? loc : WHOST + loc;
      if (loc.startsWith('http')) WHOST = new URL(loc).origin;
      continue;
    }
    const html = await res.text();
    const m = html.match(/<script>var templateData = (.*);<\/script>/) || html.match(/var templateData = (\{.*?\});<\/script>/s);
    if (m) {
      try {
        const t = JSON.parse(m[1].split(';</script>')[0]);
        let js = t.jsToken || '';
        const jm = js.match(/%28%22(.*)%22%29/);
        JSTOKEN = jm ? jm[1] : js;
      } catch { /* sem jsToken */ }
    }
    if (!JSTOKEN) {
      const jm2 = html.match(/window\.jsToken%20%3D%20a%7D%3Bfn%28%22(.*?)%22%29/);
      if (jm2) JSTOKEN = jm2[1];
    }
    console.log('[tb] bootstrap: host=' + WHOST + ' jsToken=' + (JSTOKEN ? JSTOKEN.slice(0, 12) + '…' : '(ausente)'));
    return;
  }
  throw new Error('Redirects demais no bootstrap');
}
async function main() {
  CK = cookie();
  const file = process.argv[2];
  const dirArg = process.argv.find((a) => a.startsWith('--dir='))?.slice(6) ?? '/';
  if (!file || !existsSync(file)) {
    console.error('Uso: node scripts/tb-api-upload.mjs <arquivo> [--dir=/pasta]');
    process.exit(1);
  }
  const buf = readFileSync(file);
  const remoteDir = dirArg.endsWith('/') ? dirArg.slice(0, -1) || '/' : dirArg;
  const remotePath = (remoteDir === '/' ? '' : remoteDir) + '/' + basename(file);

  await bootstrap();

  // 1) precreate
  const chunks = [];
  for (let off = 0; off < buf.length; off += CHUNK) chunks.push(buf.subarray(off, off + CHUNK));
  const blockList = chunks.map((c) => md5(c));
  const slice = buf.subarray(0, Math.min(262144, buf.length));
  const pre = await api('/api/precreate', {
    path: remotePath,
    size: String(buf.length),
    autoinit: '1',
    rtype: '2',
    block_list: JSON.stringify(blockList),
    'content-md5': md5(buf),
    'slice-md5': md5(slice),
    'content-crc32': String(crc32(buf)),
  });
  console.log('[tb] precreate: return_type=' + pre.return_type + ' uploadid=' + (pre.uploadid ?? '-'));

  // 2) chunks (return_type 2 = precisa enviar; demais = rapid ok)
  if (pre.return_type === 2 || pre.uploadid) {
    for (let i = 0; i < chunks.length; i++) {
      const url = `${UHOST}/rest/2.0/pcs/superfile2?method=upload&${APP}&path=${encodeURIComponent(remotePath)}&uploadid=${encodeURIComponent(pre.uploadid)}&partseq=${i}`;
      const fd = new FormData();
      fd.append('file', new Blob([chunks[i]]), 'blob');
      const r = await fetch(url, { method: 'POST', headers: { 'User-Agent': UA, Cookie: CK }, body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || (j.errno !== undefined && j.errno !== 0 && j.error_code)) {
        throw new Error(`chunk ${i} → HTTP ${r.status} ${JSON.stringify(j).slice(0, 160)}`);
      }
      console.log(`[tb] chunk ${i + 1}/${chunks.length} ok`);
    }
  } else {
    console.log('[tb] rapid upload (arquivo já existe na nuvem)');
  }

  // 3) create/commit
  const created = await api('/api/create', {
    path: remotePath,
    size: String(buf.length),
    isdir: '0',
    rtype: '2',
    block_list: JSON.stringify(blockList),
    uploadid: pre.uploadid ?? '',
    'content-md5': md5(buf),
    'slice-md5': md5(slice),
    'content-crc32': String(crc32(buf)),
  }).catch(async (e) => {
    // se já existia (rapid), o create pode reclamar — localiza o fs_id na listagem
    if (/exist|already/i.test(e.message)) return null;
    throw e;
  });
  let fsId = created?.fs_id;
  console.log('[tb] create fs_id=' + (fsId ?? '(existente, buscando na lista)'));

  if (!fsId) {
    const list = await api('/api/list', { dir: remoteDir, order: 'name', desc: '0', num: '20000', page: '1', showempty: '0' });
    const hit = (list.list ?? []).find((f) => f.server_filename === basename(file) || f.path === remotePath);
    if (!hit) throw new Error('Arquivo não encontrado na listagem após upload');
    fsId = hit.fs_id;
  }

  // 4) share público permanente (path_list = CAMINHOS, não ids)
  const shareRes = await fetch(`${WHOST}/share/pset`, {
    method: 'POST',
    headers: { 'User-Agent': UA, Cookie: CK, 'Content-Type': 'application/x-www-form-urlencoded', Referer: WHOST },
    body: new URLSearchParams({ schannel: '0', channel_list: '[]', period: '0', path_list: JSON.stringify([remotePath]), pwd: '' }),
  });
  const share = await shareRes.json().catch(() => ({}));
  if (!shareRes.ok || (share.errno !== undefined && share.errno !== 0)) {
    throw new Error(`share → HTTP ${shareRes.status} ${JSON.stringify(share).slice(0, 200)}`);
  }
  const link = share.link || (share.shorturl ? `https://1024terabox.com/s/${String(share.shorturl).split('/s/').pop()}` : null);
  if (!link) throw new Error('share sem link: ' + JSON.stringify(share).slice(0, 200));
  console.log('SHARE_URL=' + link);
}

main().catch((e) => {
  console.error('[tb] ERRO:', e.message);
  process.exit(1);
});
