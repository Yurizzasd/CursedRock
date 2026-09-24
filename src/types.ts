// ─── CursedRock domain types ────────────────────────────────────────────────
// Estrutura pensada para migrar facilmente para API/DB no futuro.
// Hoje os dados vivem em JSON estático; amanhã podem vir de fetch() sem
// quebrar os componentes (ver src/data/repository.ts).

export interface Addon {
  id: string; // slug, ex: "bloodmoon-weapons"
  name: string;
  author: string; // slug do criador (creators.json)
  authorDisplay?: string;
  description: string;
  longDescription?: string;
  category: string; // slug da categoria
  version: string; // versão do addon, ex: "2.4.0"
  minecraft_versions: string[];
  thumbnail: string;
  screenshots: string[];
  download_url: string;
  fileSize?: string;
  tags: string[];
  featured?: boolean;
  downloads: number;
  rating?: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  changelog?: string[];
  requirements?: string[];
}

export interface Category {
  id: string; // slug
  name: string;
  description: string;
  icon: string; // nome do ícone lucide
  accent: string; // cor hexadecimal de destaque do card
  pattern: 'grid' | 'dots' | 'diagonal' | 'runes';
}

export interface Creator {
  id: string; // slug
  name: string;
  avatar: string; // iniciais geradas via CSS se não houver imagem
  avatarHue: number;
  bio: string;
  location?: string;
  joinedAt: string;
  socials: {
    youtube?: string;
    twitter?: string;
    discord?: string;
    website?: string;
  };
  verified?: boolean;
}

export type SortKey = 'recent' | 'popular' | 'updated' | 'name' | 'rating';

export interface AddonFilters {
  query?: string;
  category?: string;
  mcVersion?: string;
  tag?: string;
  sort?: SortKey;
}
