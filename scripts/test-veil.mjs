// Teste funcional da transição de lava (produção).
// Uso: node scripts/test-veil.mjs
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const DIR = join(tmpdir(), 'veil-test');
mkdirSync(DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });
  const page = await browser.newPage({ viewport: { width: 1360, height: 800 } });
  try {
    await page.goto('https://cursedrock.pages.dev/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000); // intro termina
    const hasVeil = await page.evaluate(() => !!document.getElementById('lava-veil'));
    console.log('veil no DOM:', hasVeil);
    await page.screenshot({ path: join(DIR, 't0-home.png') });

    await page.getByRole('link', { name: /explorar catálogo/i }).click();
    await page.waitForTimeout(260);
    const mid = await page.evaluate(() => {
      const v = document.getElementById('lava-veil');
      if (!v) return { missing: true };
      const cs = getComputedStyle(v);
      const lava = v.querySelector('.veil-lava.front');
      return {
        classes: v.className,
        visibility: cs.visibility,
        lavaHeight: lava ? getComputedStyle(lava).height : '?',
        url: location.href,
      };
    });
    console.log('meio da transição:', JSON.stringify(mid));
    await page.screenshot({ path: join(DIR, 't1-mid.png') });

    await page.waitForTimeout(1500);
    console.log('url final:', page.url());
    await page.screenshot({ path: join(DIR, 't2-catalog.png') });
  } catch (e) {
    console.error('[test] ERRO:', e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
