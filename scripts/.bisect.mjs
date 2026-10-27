import { McpedlAPI } from './vendor/mcpedl/dist/index.cjs';
import axios from 'axios';

console.log('carregado');
const mc = new McpedlAPI({ rateLimit: { minTime: 100, maxConcurrent: 1 } });
console.log('instância ok');

// 1) limiter
const r0 = await mc.limiter.schedule(async () => 'limiter-ok');
console.log('limiter:', r0);

// 2) client axios do vendor
try {
  const r1 = await mc.client.post('/show_file.php', 'file_id=5522', { timeout: 20000 });
  const html = String(r1.data);
  console.log('vendor client OK len:', html.length, '| tem .mcaddon no html:', /\.mcaddon/.test(html));
} catch (e) {
  console.log('vendor client FALHA:', e.message);
}

// 3) p-retry puro
const { default: pRetry } = await import('p-retry');
const r2 = await pRetry(() => Promise.resolve('pretry-ok'), { retries: 2 });
console.log('p-retry:', r2);

// 4) download completo com race (se resolver em 60s vale)
const weak = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('race ' + ms)), ms))]);
try {
  const d = await weak(mc.download(5522), 60000);
  console.log('download OK:', String(d.url).slice(0, 90));
} catch (e) {
  console.log('download FALHA:', e.code ?? e.message);
}
process.exit(0);
