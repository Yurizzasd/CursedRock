import { McpedlAPI } from './vendor/mcpedl/dist/index.cjs';

console.log('carregado');
const mc = new McpedlAPI({ rateLimit: { minTime: 1500, maxConcurrent: 1 } });
console.log('instância ok');
const t0 = Date.now();
const weak = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout de segurança ' + ms + 'ms')), ms))]);

try {
  const d = await weak(mc.download(5522), 60000);
  console.log(`✓ download 5522 (${Date.now() - t0}ms): ${String(d.url).slice(0, 100)}`);
} catch (e) {
  console.log(`✕ download 5522 (${Date.now() - t0}ms):`, e.code ?? 'ERRO', e.message);
}
process.exit(0);
