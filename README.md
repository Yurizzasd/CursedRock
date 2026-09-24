# CursedRock — Catálogo de Addons para Minecraft Bedrock

Catálogo funcional completo: home dinâmica, catálogo com filtros, páginas individuais de addon,
busca global, categorias, criadores, favoritos (localStorage) e fluxo de download com verificação.

## Stack

- **React 18 + TypeScript + Vite 5** — SPA rápida, code-splitting por rota pronto para ativar com `React.lazy`
- **React Router 6** — rotas amigáveis (`/addon/:slug`, `/category/:slug`, `/creator/:slug`)
- **CSS moderno puro** (sem Bootstrap, sem Tailwind) — design system próprio em `src/styles/global.css`
- **Lucide Icons** — única dependência de UI

Por que não Next.js? O projeto é um catálogo estático com dados em JSON e deploy simples em qualquer
host estático. Quando houver backend (login, upload, avaliações), a camada `src/data/repository.ts`
já isola o acesso a dados: basta trocar o corpo das funções por `fetch('/api/...')`.

## Rodando

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/ + valida tipos
npm run sitemap  # regenera public/sitemap.xml
```

## Adicionar um addon

Edite `src/data/addons.json` — um objeto por addon:

```json
{
  "id": "meu-addon",
  "name": "Meu Addon",
  "author": "hexforge",
  "description": "Curta (card + SEO)",
  "longDescription": "Completa (página)",
  "category": "weapons",
  "version": "1.0.0",
  "minecraft_versions": ["1.21.1"],
  "thumbnail": "/images/addons/meu-addon.svg",
  "screenshots": [],
  "download_url": "https://...",
  "tags": ["Weapons"],
  "featured": false,
  "downloads": 0,
  "createdAt": "2026-09-24",
  "updatedAt": "2026-09-24"
}
```

Depois gere a capa: `python scripts/make-art.py` (ou adicione seu PNG em `public/images/addons/`),
rode `npm run sitemap` e pronto — home, catálogo, busca, categoria e criador atualizam sozinhos.

Categorias vivem em `src/data/categories.json`, criadores em `src/data/creators.json`.

## Estrutura

```
public/
  favicon.svg  robots.txt  sitemap.xml  images/addons/*.svg  images/showcase/*.svg
src/
  components/  (Header, Footer, AddonCard, FilterPanel, DownloadButton, ...)
  pages/       (Home, Addons, AddonDetail, Search, Categories, Creators, Favorites, NotFound)
  layouts/     → embutido no App (Header + main + Footer)
  data/        (addons.json, categories.json, creators.json, repository.ts)
  hooks/       (useFavorites, useDebounce, useDocumentTitle, useScrolled)
  utils/       (format.ts)
  styles/      (global.css — design system)
  types.ts
scripts/       (generate-sitemap.mjs, make-art.py)
```

## Futuro (preparado, não implementado)

- **Login/contas**: `useFavorites` tem API agnóstica (`toggle/isFavorite/clear`) — trocar o
  `localStorage` por chamadas à API sem mudar componentes.
- **Upload/painel admin**: `repository.ts` centraliza leitura; virar `fetch` + mutations.
- **Avaliações/comentários**: campo `rating` já existe; criar tabela por `addon.id`.
- **Anúncios (AdCash)**: componente `<AdSlot />` marca os espaços sem poluir UX.
- **SEO**: titles/descriptions por página, OG/Twitter base, canonical, sitemap, robots.
