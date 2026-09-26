// Captura o link de download (TeraBox) da ficha, clicando como um visitante.
// Uso: node scripts/fetch-source-link.mjs <url-da-ficha> [--headed]
// Imprime: SOURCE_URL=<link>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(tmpdir(), 'tb-debug'), { recursive: true });
const log = (...a) => console.log('[src]', ...a);

async function main() {
  const url = process.argv[2];
  const headed = process.argv.includes('--headed');
  if (!url) {
    console.error('Uso: node scripts/fetch-source-link.mjs <url-da-ficha> [--headed]');
    process.exit(1);
  }
  let context;
  try {
    context = await chromium.launchPersistentContext(join(root, '.src-profile'), {
      headless: !headed,
      channel: 'chrome',
      viewport: { width: 1360, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    });
  } catch {
    context = await chromium.launchPersistentContext(join(root, '.src-profile'), { headless: !headed });
  }
  const page = context.pages()[0] ?? (await context.newPage());
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(6000);

    // acha o botão de baixar
    const btn = page.getByRole('button', { name: /baixar agora/i })
      .or(page.getByText(/baixar agora/i));
    await btn.first().waitFor({ state: 'visible', timeout: 25000 });
    log('botão achado, clicando…');

    // captura popup OU link do modal
    const popupP = context.waitForEvent('page', { timeout: 20000 }).catch(() => null);
    await btn.first().click();
    // countdown do modal (alguns segundos)
    await page.waitForTimeout(9000);
    await page.screenshot({ path: join(tmpdir(), 'tb-debug', `${Date.now()}-modal.png`) }).catch(() => {});

    const popup = await popupP;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      const u = popup.url();
      log('popup:', u);
      if (/terabox/i.test(u)) {
        console.log('SOURCE_URL=' + u);
        return;
      }
    }
    // procura link terabox no modal/página
    const links = await page.evaluate(() => {
      const out = new Set();
      document.querySelectorAll('a[href]').forEach((a) => {
        const h = a.href;
        if (/terabox\.com\/s\/|terabox\.app\/s\//i.test(h)) out.add(h);
      });
      const m = document.body.innerText.match(/https:\/\/(?:1024terabox\.com|terabox\.app)\/s\/[A-Za-z0-9_-]{5,40}/g);
      if (m) m.forEach((x) => out.add(x));
      return [...out];
    });
    if (links.length) {
      log('link no modal:', links[0]);
      console.log('SOURCE_URL=' + links[0]);
      return;
    }
    throw new Error('Link não apareceu. Veja screenshot em $TEMP/tb-debug.');
  } catch (e) {
    await page.screenshot({ path: join(tmpdir(), 'tb-debug', `${Date.now()}-ERRO.png`) }).catch(() => {});
    console.error('[src] ERRO:', e.message);
    process.exitCode = 1;
  } finally {
    await context.close();
  }
}

main();
