// Upload de arquivo para o TeraBox + geração do link de compartilhamento.
// Uso:
//   node scripts/terabox-upload.mjs <arquivo>            → headless (sessão salva)
//   node scripts/terabox-upload.mjs <arquivo> --headed    → janela visível (1º login manual)
// Imprime no final: SHARE_URL=<link>
// Sessão fica em .tb-profile/ (gitignored). Screenshots de debug em $TEMP/tb-debug/.
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEBUG = join(tmpdir(), 'tb-debug');
mkdirSync(DEBUG, { recursive: true });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const shot = (page, name) => page.screenshot({ path: join(DEBUG, `${Date.now()}-${name}.png`) }).catch(() => {});
const log = (...a) => console.log('[tb]', ...a);

const byText = async (page, texts, { timeout = 15000 } = {}) => {
  for (const t of texts) {
    const loc = page.getByText(t, { exact: false });
    try {
      await loc.first().waitFor({ state: 'visible', timeout });
      return loc.first();
    } catch { /* tenta próximo texto */ }
  }
  return null;
};

async function loggedIn(context) {
  const cookies = await context.cookies();
  return cookies.some((c) => /BDUSS|ndus/i.test(c.name));
}

async function diskReady(page) {
  try {
    if (!page.url().includes('/disk/')) return false;
    const n = await page.locator('input[type="file"], img.avatar, button:has-text("Upload")').first().count().catch(() => 0);
    if (n > 0) return true;
    const txt = await page.evaluate(() => document.body?.innerText ?? '').catch(() => '');
    return /sair|meu disco|my files|armazenamento/i.test(txt);
  } catch {
    return false;
  }
}

// polling multi-sinal: cookie BDUSS, URL /disk/ ou elementos logados
async function waitLogin(context, page, minutes = 10) {
  const end = Date.now() + minutes * 60 * 1000;
  let dbg = false;
  while (Date.now() < end) {
    try {
      const cookies = await context.cookies();
      if (!dbg) {
        log('cookies vistos:', cookies.map((c) => c.name).join(',') || '(nenhum)');
        dbg = true;
      }
      if (cookies.some((c) => /BDUSS/i.test(c.name))) return true;
      if (page.url().includes('/disk/')) {
        const n = await page.locator('input[type="file"], button:has-text("Upload"), img.avatar').first().count().catch(() => 0);
        if (n > 0) return true;
      }
    } catch { /* página fechando etc — tenta de novo */ }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return false;
}

async function main() {
  const file = process.argv[2];
  const headed = process.argv.includes('--headed');
  if (!file || !existsSync(file)) {
    console.error('Uso: node scripts/terabox-upload.mjs <arquivo> [--headed]');
    process.exit(1);
  }

  const launchOpts = {
    headless: !headed,
    viewport: { width: 1360, height: 860 },
    userAgent: UA,
    // Chrome de verdade (não o Chromium de teste): passa no login Google e no anti-bot
    channel: 'chrome',
  };
  let context;
  try {
    context = await chromium.launchPersistentContext(join(root, '.tb-profile'), launchOpts);
  } catch (e) {
    log('Chrome real indisponível, usando Chromium embutido:', e.message.split('\n')[0]);
    const { channel: _c, ...fallback } = launchOpts;
    void _c;
    context = await chromium.launchPersistentContext(join(root, '.tb-profile'), fallback);
  }
  const page = context.pages()[0] ?? (await context.newPage());

  try {
    await page.goto('https://www.terabox.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);

    // vai direto ao disco: se a sessão (ndus) vale, parte pro upload sem login
    // (a raiz /disk resolve a rota no cliente; /disk/home dá 404)
    await page.goto('https://www.terabox.com/disk', { waitUntil: 'commit', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(10000);
    await shot(page, 'disk-check');

    if (await diskReady(page)) {
      log('Sessão válida, partindo pro upload.');
    } else if (!(await loggedIn(context))) {
      if (!headed) throw new Error('Sem sessão. Rode uma vez com --headed e faça login na janela.');
      // leva direto ao formulário de login
      const loginBtn = await byText(page, ['Entrar', 'Login', 'Sign in', 'Log in'], { timeout: 8000 });
      if (loginBtn) await loginBtn.click().catch(() => {});
      await page.waitForTimeout(2000);
      await shot(page, 'login');
      log('FAÇA LOGIN NA JANELA ABERTA (conta certa, 2FA/captcha). Aguardando até 10 min…');
      if (!(await waitLogin(context, page))) throw new Error('Login não detectado a tempo.');
      log('Login detectado.');
    } else {
      log('Sessão válida encontrada.');
    }

    // garante que caiu no disco após login manual
    await page.goto('https://www.terabox.com/disk', { waitUntil: 'commit', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(10000);
    if (!(await diskReady(page))) throw new Error('Disco não abriu. Tente de novo com --headed.');
    await shot(page, 'home');

    // upload via input file (presente mesmo quando o botão é custom)
    let input = await page.$('input[type="file"]');
    if (!input) {
      const upBtn = await byText(page, ['Upload', '上传', 'Upload file']);
      if (!upBtn) throw new Error('Botão de upload não encontrado. Veja screenshot em ' + DEBUG);
      await upBtn.click();
      await page.waitForTimeout(1500);
      input = await page.$('input[type="file"]');
    }
    if (!input) throw new Error('input[type=file] não apareceu. Veja screenshot em ' + DEBUG);
    log('Enviando', basename(file));
    await input.setInputFiles(file);

    // aguarda concluir (barra some / aparece 100% / completed)
    await page.waitForFunction(
      () => /100\s?%|completed|concluído|完成/i.test(document.body.innerText),
      { timeout: 15 * 60 * 1000 },
    ).catch(() => {});
    await page.waitForTimeout(3000);
    await shot(page, 'uploaded');

    // seleciona o arquivo (checkbox da 1ª linha) e abre Share
    const row = page.locator('tr, [role="row"], .file-row, .list-item').first();
    await row.hover().catch(() => {});
    const check = page.locator('input[type="checkbox"]').first();
    if (await check.count()) await check.check({ force: true }).catch(() => {});
    const shareBtn = await byText(page, ['Share', '分享', 'Compartilhar']);
    if (!shareBtn) throw new Error('Botão Share não encontrado. Veja screenshot em ' + DEBUG);
    await shareBtn.click();
    await page.waitForTimeout(2500);
    await shot(page, 'share-dialog');

    // garante link público e copia
    const createBtn = await byText(page, ['Create', 'Copy link', 'Copy Link', '创建', '复制链接'], { timeout: 8000 });
    if (createBtn) await createBtn.click().catch(() => {});
    await page.waitForTimeout(2000);
    await shot(page, 'share-link');

    const html = await page.content();
    const m = html.match(/https:\/\/(?:1024terabox|terabox)\.com\/s\/[A-Za-z0-9_-]{5,40}/);
    if (!m) throw new Error('Link de compartilhamento não apareceu. Veja screenshots em ' + DEBUG);
    console.log('SHARE_URL=' + m[0]);
  } catch (e) {
    await shot(page, 'ERRO');
    console.error('[tb] ERRO:', e.message);
    process.exitCode = 1;
  } finally {
    await context.close();
  }
}

main();
