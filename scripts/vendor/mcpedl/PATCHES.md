# Patch do vendor — mcpedl (improved-mcpedl-api)

Fonte upstream MIT: https://github.com/terastudio-org/mcpedl (commit 2026-10, tag main).

## Por que vendored?
1. O build upstream quebra com o `cheerio` atual (2 erros de TS) — corrigidos aqui em 2 linhas.
2. O `mc.download(id)` upstream aponta para o fluxo antigo do site (`GET /dw_file.php`), que
   não existe mais. O site atual usa `POST /show_file.php` com `file_id`. O método foi
   consertado mantendo a MESMA assinatura documentada (`download(id:number) → {url}`).
3. O parser de busca/listas procurava `h2 a` (markup antigo); o site agora usa
   `.entry-title a` — corrigido para `search()` e `mclatest()`.
4. O parser da tabela de downloads não lia o `input[name="file_id"]` oculto (devolvia id 0).

## Conteúdo
- `src/index.ts` — fonte upstream com os 4 patches acima (marcados com comentários `2026 fix`).
- `dist/index.js`, `dist/index.d.ts` — compilados (tsc, CJS) do fonte acima.
- `LICENSE` — MIT do projeto original, preservado.

## Uso nos scripts
```js
import { McpedlAPI } from '../vendor/mcpedl/dist/index.js';
const mc = new McpedlAPI({ rateLimit: { minTime: 2000, maxConcurrent: 1 } });
```

Deps de runtime (instaladas no package.json raiz): `axios`, `cheerio`, `bottleneck`, `p-retry`.
