import addonsRaw from './addons.json';
import categoriesRaw from './categories.json';
import creatorsRaw from './creators.json';
import type { Addon, AddonFilters, Category, Creator, SortKey } from '../types';

// ─── Repositório de dados ────────────────────────────────────────────────────
// Hoje: JSON estático importado no bundle.
// Futuro: trocar o corpo destas funções por fetch('/api/addons') sem mudar
// nenhuma página/componente. Cache simples em memória para a sessão.

const addons = addonsRaw as Addon[];
const categories = categoriesRaw as Category[];
const creators = creatorsRaw as Creator[];

const creatorMap = new Map(creators.map((c) => [c.id, c]));
const categoryMap = new Map(categories.map((c) => [c.id, c]));
const addonMap = new Map(addons.map((a) => [a.id, a]));

export function getAllAddons(): Addon[] {
  return addons;
}

export function getAddonById(id: string): Addon | undefined {
  return addonMap.get(id);
}

export function getAllCategories(): Category[] {
  return categories;
}

export function getCategoryById(id: string): Category | undefined {
  return categoryMap.get(id);
}

export function getAllCreators(): Creator[] {
  return creators;
}

export function getCreatorById(id: string): Creator | undefined {
  return creatorMap.get(id);
}

export function getAddonsByCreator(creatorId: string): Addon[] {
  return addons.filter((a) => a.author === creatorId);
}

export function getAddonsByCategory(categoryId: string): Addon[] {
  return addons.filter((a) => a.category === categoryId);
}

export function getFeaturedAddons(): Addon[] {
  return addons.filter((a) => a.featured);
}

export function getTrendingAddons(limit = 8): Addon[] {
  // Trending = score ponderado downloads + atualização recente
  const now = Date.now();
  return [...addons]
    .map((a) => {
      const ageDays = Math.max(1, (now - new Date(a.updatedAt).getTime()) / 86400000);
      const score = a.downloads / Math.pow(ageDays, 0.6);
      return { a, score };
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((x) => x.a);
}

export function getPopularAddons(limit = 8): Addon[] {
  return [...addons].sort((a, b) => b.downloads - a.downloads).slice(0, limit);
}

export function getRecentAddons(limit = 8): Addon[] {
  return [...addons]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, limit);
}

export function getUpdatedAddons(limit = 8): Addon[] {
  return [...addons]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, limit);
}

export function getRelatedAddons(addon: Addon, limit = 4): Addon[] {
  const tagSet = new Set(addon.tags);
  return addons
    .filter((a) => a.id !== addon.id)
    .map((a) => {
      let score = 0;
      if (a.category === addon.category) score += 3;
      if (a.author === addon.author) score += 2;
      for (const t of a.tags) if (tagSet.has(t)) score += 1;
      return { a, score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || y.a.downloads - x.a.downloads)
    .slice(0, limit)
    .map((x) => x.a);
}

export function countByCategory(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of addons) out[a.category] = (out[a.category] ?? 0) + 1;
  return out;
}

export function getAllMinecraftVersions(): string[] {
  const set = new Set<string>();
  for (const a of addons) for (const v of a.minecraft_versions) set.add(v);
  return [...set].sort().reverse();
}

export function getAllTags(): string[] {
  const set = new Set<string>();
  for (const a of addons) for (const t of a.tags) set.add(t);
  return [...set].sort();
}

export function searchAddons(query: string, pool: Addon[] = addons): Addon[] {
  const q = query.trim().toLowerCase();
  if (!q) return pool;
  const terms = q.split(/\s+/);
  const scored = pool.map((a) => {
    const creator = creatorMap.get(a.author);
    const category = categoryMap.get(a.category);
    const hay = {
      name: a.name.toLowerCase(),
      author: `${a.author} ${creator?.name ?? ''} ${a.authorDisplay ?? ''}`.toLowerCase(),
      category: `${a.category} ${category?.name ?? ''}`.toLowerCase(),
      tags: a.tags.join(' ').toLowerCase(),
      version: `${a.version} ${a.minecraft_versions.join(' ')}`.toLowerCase(),
      desc: a.description.toLowerCase(),
    };
    let score = 0;
    for (const t of terms) {
      if (hay.name.includes(t)) score += 10;
      else if (hay.name.split(/\s+/).some((w) => w.startsWith(t))) score += 7;
      if (hay.author.includes(t)) score += 6;
      if (hay.category.includes(t)) score += 5;
      if (hay.tags.includes(t)) score += 4;
      if (hay.version.includes(t)) score += 4;
      if (hay.desc.includes(t)) score += 1;
    }
    return { a, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((x, y) => y.score - x.score || y.a.downloads - x.a.downloads)
    .map((s) => s.a);
}

export function filterAddons(filters: AddonFilters, pool: Addon[] = addons): Addon[] {
  let list = [...pool];
  if (filters.query) list = searchAddons(filters.query, list);
  if (filters.category && filters.category !== 'all') {
    list = list.filter((a) => a.category === filters.category);
  }
  if (filters.mcVersion && filters.mcVersion !== 'all') {
    list = list.filter((a) => a.minecraft_versions.includes(filters.mcVersion!));
  }
  if (filters.tag && filters.tag !== 'all') {
    list = list.filter((a) => a.tags.includes(filters.tag!));
  }
  const sort: SortKey = filters.sort ?? 'popular';
  switch (sort) {
    case 'recent':
      list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      break;
    case 'updated':
      list.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
      break;
    case 'name':
      list.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'rating':
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      break;
    case 'popular':
    default:
      list.sort((a, b) => b.downloads - a.downloads);
      break;
  }
  return list;
}
