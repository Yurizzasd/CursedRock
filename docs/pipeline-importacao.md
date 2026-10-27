# Pipeline automatizado de importação — MCPEDL → TeraBox → CursedRock

Sistema real, comprovado por teste ponta-a-ponta (`npm run imports:test`). Nenhum passo
usa "solução inventada": a API MCPEDL é o pacote oficial do repositório indicado
([terastudio-org/mcpedl](https://github.com/terastudio-org/mcpedl), embutido em
`scripts/vendor/mcpedl/` com 4 corretivos documentados); upload TeraBox usa a
ferramenta que já existia (`scripts/tb-api-upload.mjs`); cadastro usa o fluxo que já
existia (`npm run import` sobre `incoming/*.json`).

## Visão geral

```
mcpedl.org ──API──▶ imports/queue.json ──worker──▶ incoming/*.json ──npm run import──▶ src/data/addons.json
 (descoberta)        (fila persistente)   (valida + TeraBox SE autorizado)   (validação + sitemap)
```

- **Descoberta** (`imports:discover`): pagina a API (busca ou "downloading") e enche a fila,
  dedupando por id de origem. Nada baixa arquivo aqui.
- **Processamento** (`imports:run`): processa um lote da fila.
  - **Sem autorização** (padrão): coleta ficha + imagens + link oficial de download
    da página da origem. NADA sobe pra conta. `downloadProvider: "original"`.
  - **Com autorização** (`--authorized=<id>` ou `scripts/import-allowlist.json`):
    baixa o arquivo, valida ZIP `.mcaddon/.mcpack` + `manifest.json`
    (extrai versão e `min_engine_version` reais), envia via `tb-api-upload.mjs`,
    exige `SHARE_URL` válido (prova: HTTP 200 no link) e só então marca.
    Temporários em `imports/downloads/` são apagados ao terminar.
- **Publicação** (manual): os JSONs caem em `incoming/` para VOCÊ revisar; `npm run import`
  valida com o esquema existente, gera capa sob demanda e regenera o sitemap. Deploy no fluxo de sempre.

## Comandos

| Comando | Faz |
|---|---|
| `npm run imports:discover -- --latest --pages=2 --max=30` | coleta e adiciona à fila (mais recentes) |
| `npm run imports:discover -- --search="vein miner" --pages=3` | coleta por termo, paginando |
| `npm run imports:run` | processa lote (3 por padrão: `--jobs=N`) |
| `npm run imports:run -- --authorized=<postId>` | lote com autorização pontual |
| `npm run imports:run -- --retry-failed` | devolve falhadas pra fila |
| `npm run imports:panel` | painel local `http://127.0.0.1:8765` |
| `npm run imports:test` | teste ponta-a-ponta (rode antes de ampliar lotes) |

## Painel (localhost)

`npm run imports:panel` → abre só no PC (bind 127.0.0.1). Mostra: descobertos, pendentes,
prontos, uploads TeraBox validados, links originais, falhas, última execução/descoberta,
worker vivo. Ações: iniciar lote, pausar (grava `imports/control.json` e interrompe o
worker), retomar, reprocessar falhas. Visitantes do site público não têm acesso — o
painel não é servido pelo Cloudflare e não lê credenciais (ndus nunca passa por ele).

## Segurança e autorização (o portão)

1. **Nenhum arquivo de terceiros sobe sem autorização.** A regra é técnica, não opção:
   sem flag/allowlist o worker nem baixa o arquivo — só arma a ficha com o link original.
2. Autorizar um id da origem = editar `scripts/import-allowlist.json` (ver com o dono se
   o criador permite redistribuição) ou passar `--authorized=`.
3. Confirmação real: um upload só é "OK" com linha `SHARE_URL=...` da ferramenta E
   HTTP 200 na validação. Sem isso o job falha e não grava link.
4. Credenciais: `ndus` fica em `TB_NDUS` ou `%APPDATA%/CursedRock/tb-cookie.txt`
   (fluxo já existente). Nada disso entra no repo (`imports/` está no `.gitignore`).
5. Site é estático no Cloudflare Pages — pesos de download/upload rodam no PC (worker),
   nunca em edge function.

## Campos (esquema adaptado ao catálogo existente)

| Proposta do documento | Campo real (schema `src/types.ts`) | Origem |
|---|---|---|
| id | `id` (slug curto) | derivado do postId da origem (sufixos -mod-minecraft-pe removidos) |
| title | `name` | página da origem |
| description / longDescription | `description` / `longDescription` | texto da ficha |
| thumbnail | `thumbnail` + `screenshots` (até 3) | imagem da origem (hash dedupe) |
| creator | `author` + `authorDisplay` | `author` = "unknown" (mantém consistência), `authorDisplay` = nome da origem |
| category | `category` | mapa de palavras-chave → categorias do catálogo; sem match → `other` |
| version | `version` | `manifest.json` do arquivo (quando autorizado) OU início da faixa declarada na página |
| minecraftVersions | `minecraft_versions` | `min_engine_version` do manifest OU início da faixa da origem |
| publishedAt | `createdAt` | data da página |
| updatedAt | `updatedAt` | a página só expõe a data de publicação (documentado; sem inventar) |
| sourceUrl | `sourceUrl` | página da ficha no mcpedl.org (sempre preservada) |
| downloadUrl | `download_url` | TeraBox validado (se autorizado) OU link original |
| downloadProvider | `downloadProvider` | `terabox` / `original` |
| redistributionAuthorized | `redistributionAuthorized` | true só quando veio via porta autorizada |
| importedAt | `importedAt` | data da importação |

Campos opcionais novos; nada quebra os itens atuais. O modal de download mostra
"Verificado pelo CursedRock" só para itens hospedados por nós; itens `original`
mostram "Arquivo da fonte original".

## Estado em disco (gitignored)

```
imports/
  queue.json      ← fila persistente (status, tentativas, erro final, links)
  control.json    ← pausa/pid do worker (painel ⇄ worker)
  state.json      ← métricas acumuladas + log das últimas ações
  downloads/<chave>/*.bin|mcaddon  ← temporários, apagados no fim do job
```

Dedupe triplo: fila por `postId` de origem · worker bloqueia `sourceId` já no
catálogo · `import-addon.mjs` bloqueia `id` duplicado (fluxo já existente).

## Limites configuráveis do worker

`--jobs=N` tamanho do lote (default 3) · `--images=N` imagens por ficha (default 3) ·
`--max-file-mb=N` limite de upload (default 150) · `--dir=/CursedRock` pasta destino da conta.
Antes de ampliar lotes: rodar `npm run imports:test` — ele falha e interrompe o plano
se qualquer etapa (API→file→upload→link→cadastro→dev server→dedupe) não passar.

## Testes (o que cada etapa prova)

`npm run imports:test` executa, na ordem do documento de requisitos:
1. consulta real à API (busca "vein miner");
2. identificação completa (título, imagem, fileId resolve > 0);
3. ACESSO a arquivo da origem (só checa a URL, ranged GET — nada redistribuído);
4. upload de UM arquivo de TESTE NOSSO (micro .mcaddon com manifest próprio) na
   pasta `/CursedRock-teste` da conta;
5. validação do link TeraBox retornado (HTTP 200 + formato `/s/`);
6. cadastro de UM addon via fluxo real (`npm run import`);
7. o addon aparece no site (dev server local em `/addon/<id>` → 200);
8. dedupe: mesma origem reprocessada é bloqueada pelo worker sem rede e sem duplicar.
Ao final o addon de teste é removido (repo limpo). Falha em qualquer etapa ⇒ exit 1.

## Regras de validação de pacote (atualizado 2026-10-27)

Ajustes no validador do worker (`mcpedl-process.mjs`) depois do 1º lote real (8 addons):

- aceita `manifest.json` **OU** `pack_manifest.json` (alias de arquivos muito antigos
  do Bedrock — ex. Lucky Blocks, era 1.10);
- leitor ZIP (central directory) aceita o 1º arquivo com offset local `0` — antes,
  manifest na posição 0 do zip falhava com "sem manifest.json";
- `header.uuid` segue OBRIGATÓRIO: se o manifest só tem `pack_id`/`packs_version`
  (formato legado sem uuid), o arquivo provavelmente não importa no Minecraft atual
  ⇒ sem upload, ricochete pro link oficial da fonte (foi o caso do Lucky Hardcore,
  que ficou com downloadProvider `original`).

## O que está pendente por decisão/configuração EXTERNA

- **Autorização de redistribuição**: ninguém aqui decide isso por você — sem
  allowlist/flag, TODOS os itens entram como "link original". Levar em conta os
  termos de cada criador antes de republicar no TeraBox é responsabilidade do dono.
- **Custo/rate do mcpedl.org**: respeita o rate limit do pacote (1 req / 2 s) e
  intervalo entre tarefas; não contorna proteções.
- **uploads com nomes de pasta**: `/CursedRock` é o destino padrão; mude com `--dir=`.
- **Sessão do TeraBox**: se o upload falhar com "Sessão inválida", renove a sessão —
  login humano em `node scripts/tb-session.mjs --headed` e depois
  `node scripts/tb-session.mjs --export` (grava o jar completo em
  `%APPDATA%/CursedRock/tb-jar.txt`, que o `tb-api-upload.mjs` usa com prioridade ao
  ndus sozinho).
