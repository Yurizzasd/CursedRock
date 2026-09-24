import { Link } from 'react-router-dom';
import { Download, Flame, Heart } from 'lucide-react';
import type { Addon } from '../types';
import { getCategoryById } from '../data/repository';
import { formatDownloads } from '../utils/format';

interface Props {
  addon: Addon;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  index?: number;
}

export function AddonCard({ addon, isFavorite, onToggleFavorite, index = 0 }: Props) {
  const cat = getCategoryById(addon.category);
  return (
    <article className="card" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
      <div className="card-thumb">
        <Link to={`/addon/${addon.id}`} aria-label={addon.name} tabIndex={-1}>
          <img src={addon.thumbnail} alt={`Capa de ${addon.name}`} loading="lazy" />
        </Link>
        <div className="card-flags">
          {addon.featured && (
            <span className="chip red">
              <Flame size={11} /> Destaque
            </span>
          )}
          <span className="chip mono">{addon.minecraft_versions[addon.minecraft_versions.length - 1]}</span>
        </div>
        <button
          className={`fav-btn${isFavorite ? ' active' : ''}`}
          onClick={() => onToggleFavorite(addon.id)}
          aria-label={isFavorite ? `Remover ${addon.name} dos favoritos` : `Favoritar ${addon.name}`}
          aria-pressed={isFavorite}
        >
          <Heart />
        </button>
      </div>
      <div className="card-body">
        <span className="card-cat">{cat?.name ?? addon.category}</span>
        <h3 className="card-title">
          <Link to={`/addon/${addon.id}`}>{addon.name}</Link>
        </h3>
        <span className="card-by">
          por <Link to={`/creator/${addon.author}`}>{addon.authorDisplay ?? addon.author}</Link>
        </span>
        <p className="card-desc">{addon.description}</p>
        <div className="card-foot">
          <span className="dl">
            <Download /> {formatDownloads(addon.downloads)}
          </span>
          <span>v{addon.version}</span>
        </div>
      </div>
    </article>
  );
}

export function AddonGrid({
  addons,
  favorites,
  onToggleFavorite,
  cols3 = false,
}: {
  addons: Addon[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  cols3?: boolean;
}) {
  const set = new Set(favorites);
  return (
    <div className={`addon-grid${cols3 ? ' cols-3' : ''}`}>
      {addons.map((a, i) => (
        <AddonCard key={a.id} addon={a} index={i} isFavorite={set.has(a.id)} onToggleFavorite={onToggleFavorite} />
      ))}
    </div>
  );
}

export function CardSkeletons({ count = 8 }: { count?: number }) {
  return (
    <div className="addon-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skel" key={i}>
          <div className="skel-thumb" />
          <div className="skel-line" />
          <div className="skel-line short" />
        </div>
      ))}
    </div>
  );
}
