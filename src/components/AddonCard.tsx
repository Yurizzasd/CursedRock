import { Link } from 'react-router-dom';
import { Download, Flame } from 'lucide-react';
import type { Addon } from '../types';
import { getCategoryById } from '../data/repository';
import { formatDownloads } from '../utils/format';

interface Props {
  addon: Addon;
  index?: number;
}

export function AddonCard({ addon, index = 0 }: Props) {
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
      </div>
      <div className="card-body">
        <span className="card-cat">{cat?.name ?? addon.category}</span>
        <h3 className="card-title">
          <Link to={`/addon/${addon.id}`}>{addon.name}</Link>
        </h3>
        <span className="card-by">por {addon.authorDisplay ?? addon.author}</span>
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
  cols3 = false,
  layout = 'grid',
}: {
  addons: Addon[];
  cols3?: boolean;
  layout?: 'grid' | 'list';
}) {
  if (layout === 'list') {
    return (
      <div className="addon-list">
        {addons.map((a, i) => (
          <AddonRow key={a.id} addon={a} index={i} />
        ))}
      </div>
    );
  }
  return (
    <div className={`addon-grid${cols3 ? ' cols-3' : ''}`}>
      {addons.map((a, i) => (
        <AddonCard key={a.id} addon={a} index={i} />
      ))}
    </div>
  );
}

function AddonRow({ addon, index = 0 }: Props) {
  const cat = getCategoryById(addon.category);
  return (
    <article className="addon-row" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
      <Link to={`/addon/${addon.id}`} aria-label={addon.name} tabIndex={-1}>
        <img src={addon.thumbnail} alt="" loading="lazy" />
      </Link>
      <div className="row-main">
        <span className="card-cat">{cat?.name ?? addon.category}</span>
        <h3>
          <Link to={`/addon/${addon.id}`}>{addon.name}</Link>
        </h3>
        <span className="card-by">por {addon.authorDisplay ?? addon.author}</span>
        <p className="row-desc">{addon.description}</p>
      </div>
      <div className="row-side">
        <span>{addon.minecraft_versions[addon.minecraft_versions.length - 1]} • v{addon.version}</span>
        <span className="dl">
          <Download size={13} /> {formatDownloads(addon.downloads)}
        </span>
      </div>
    </article>
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
