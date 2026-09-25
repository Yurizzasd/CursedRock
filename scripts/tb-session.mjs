// Diagnóstico + importação de sessão para o perfil .tb-profile.
// Uso:
//   node scripts/tb-session.mjs <arquivo.json>   → importa cookies e testa o disco
//   node scripts/tb-session.mjs --headed          → só testa (janela visível)
// O JSON é um array: [{ "name": "ndus", "value": "..." }]
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(tmpdir(), 'tb-debug'), { recursive: true });

async function main() {
  const file = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
  let context;
  try {
    context = await chromium.launchPersistentContext(join(root, '.tb-profile'), {
      headless: !process.argv.includes('--headed'),
      channel: 'chrome',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    });
  } catch {
    context = await chromium.launchPersistentContext(join(root, '.tb-profile'), {
      headless: !process.argv.includes('--headed'),
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    });
  }
  try {
    if (file) {
      const list = JSON.parse(readFileSync(file, 'utf8'));
      await context.addCookies(
        list.map((c) => ({
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'None',
          ...c,
          domain: c.domain ?? '.terabox.com',
        })),
      );
      console.log('cookies importados:', list.length);
    }
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto('https://www.terabox.com/disk', { waitUntil: 'commit', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(10000);
    console.log('cookies agora:', (await context.cookies()).map((c) => c.name).join(',') || '(nenhum)');
    console.log('url:', page.url());
    console.log('titulo:', await page.title().catch(() => '(?)'));
    try {
      const info = await page.evaluate(() => ({
        len: document.body ? document.body.innerText.length : 0,
        upload: document.querySelectorAll('input[type="file"], button').length,
        sample: document.body ? document.body.innerText.slice(0, 160).replace(/\s+/g, ' ') : '',
      }));
      console.log('dom:', JSON.stringify(info));
    } catch (e) {
      console.log('dom falhou:', e.message);
    }
    try {
      await page.screenshot({ path: join(tmpdir(), 'tb-debug', `${Date.now()}-session.png`), timeout: 15000, animations: 'disabled' });
      console.log('screenshot ok');
    } catch {
      console.log('screenshot falhou (segue o jogo)');
    }
  } finally {
    await context.close();
  }
}

main().catch((e) => { console.error('[tb] ERRO:', e.message); process.exit(1); });
