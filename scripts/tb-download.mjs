// Baixa arquivo de um link compartilhado TeraBox (/s/<codigo>) via navegador.
// Uso: node scripts/tb-download.mjs <url-/s/> [--out=pasta] [--headed]
// Imprime: FILE=<caminho> (<KB>)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const log = (...a) => console.log('[dl]', ...a);

async function main() {
  const url = process.argv[2];
  const out = process.argv.find((a) => a.startsWith('--out='))?.slice(6) ?? join(root, 'incoming', 'downloads');
  const headed = process.argv.includes('--headed');
  if (!url || !/\/s\//.test(url)) {
    console.error('Uso: node scripts/tb-download.mjs <url-/s/> [--out=pasta] [--headed]');
    process.exit(1);
  }
  mkdirSync(out, { recursive: true });
  // perfil com sessão (ndus) — sem login o TeraBox exige entrar antes de baixar
  const context = await chromium.launchPersistentContext(join(root, '.tb-profile'), {
    headless: !headed,
    acceptDownloads: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });
  const page = context.pages()[0] ?? (await context.newPage());
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(8000);
    // botão de download (vários idiomas/textos)
    const btn = page.getByRole('button', { name: /download|baixar/i })
      .or(page.getByText(/^(download|baixar)$/i))
      .or(page.locator('a[download]'))
      .first();
    await btn.waitFor({ state: 'visible', timeout: 30000 });
    log('botão achado, baixando…');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10 * 60 * 1000 }),
      btn.click(),
    ]);
    const dest = join(out, download.suggestedFilename());
    await download.saveAs(dest);
    const kb = Math.round((await download.failure()) ? 0 : 1);
    void kb;
    log('salvo:', dest);
    console.log('FILE=' + dest);
  } catch (e) {
    await page.screenshot({ path: join(root, 'incoming', 'downloads', 'ERRO.png') }).catch(() => {});
    console.error('[dl] ERRO:', e.message);
    process.exitCode = 1;
  } finally {
    await context.close();
  }
}

main();
