# 📥 Pasta de novos addons

Jogue aqui os arquivos JSON dos addons que você quer publicar. Depois é só me avisar
que eu rodo a importação (ou rode você mesmo: `npm run import`).

## Como funciona

1. Copie `incoming/_template.addon.json` para um arquivo novo, ex: `incoming/meu-addon.json`
   (qualquer nome `*.json` vale, exceto os que começam com `_`)
2. Preencha os campos seguindo o template
3. Rode `npm run import` (ou me chame)
4. O script **valida tudo**, gera a capa automaticamente se não houver, move o arquivo
   processado para `incoming/done/` e regenera o `sitemap.xml`
5. Confira com `npm run dev`, depois commit + push + deploy

## Regras

- `id`: slug único, minúsculo, só `a-z 0-9 -` (vira a URL `/addon/<id>`)
- `category`: deve ser um id existente em `src/data/categories.json`
  (adventure, weapons, mobs, technology, magic, survival, furniture, vehicles,
  optimization, utility, world, horror, anime, pvp, farming, lucky-block, other)
- `author`: deve ser um id existente em `src/data/creators.json`
  (hexforge, netherbit, grimmora, oakenspire, kitsune-labs, rustbucket, voidscribe, moss-and-moon)
- `minecraft_versions`: array não vazio, ex: `["1.21.1", "1.21.20"]`
- `thumbnail`: se o arquivo local não existir, uma capa no padrão do site é gerada
  automaticamente na cor da categoria (você pode substituir depois por arte própria)
- `screenshots`: opcional; arquivos locais devem existir em `public/images/showcase/`
- `download_url`: link direto do arquivo (externo, do criador)
- Datas no formato `AAAA-MM-DD`
