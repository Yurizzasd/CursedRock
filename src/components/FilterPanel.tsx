import type { SortKey } from '../types';
import { countByCategory, getAllCategories, getAllMinecraftVersions, getAllTags } from '../data/repository';
import { ICONS } from './CategoryCreator';
import { Package } from 'lucide-react';
import { SortBar } from './chrome';

const SORTS: SortKey[] = ['popular', 'recent', 'updated', 'rating', 'name'];

export interface FilterState {
  sort: SortKey;
  category: string;
  mcVersion: string;
  tag: string;
}

export function FilterPanel({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const categories = getAllCategories();
  const versions = getAllMinecraftVersions();
  const tags = getAllTags();
  const counts = countByCategory();

  return (
    <aside className="filters" aria-label="Filtros">
      <SortBar vertical value={filters.sort} onChange={(sort) => onChange({ ...filters, sort })} options={SORTS} />
      <div className="filter-group">
        <label id="f-cat-label">Categoria</label>
        <div className="catlist" role="group" aria-labelledby="f-cat-label">
          <button
            className={`catrow${filters.category === 'all' ? ' active' : ''}`}
            onClick={() => onChange({ ...filters, category: 'all' })}
          >
            <Package />
            Todas
          </button>
          {categories
            .filter((c) => (counts[c.id] ?? 0) > 0)
            .map((c) => {
              const Icon = ICONS[c.icon] ?? Package;
              return (
                <button
                  key={c.id}
                  className={`catrow${filters.category === c.id ? ' active' : ''}`}
                  onClick={() => onChange({ ...filters, category: c.id })}
                  title={c.description}
                >
                  <Icon />
                  {c.name}
                  <span className="count">{counts[c.id]}</span>
                </button>
              );
            })}
        </div>
      </div>
      <div className="filter-group">
        <label htmlFor="f-mc">Versão do Minecraft</label>
        <select
          id="f-mc"
          className="select"
          value={filters.mcVersion}
          onChange={(e) => onChange({ ...filters, mcVersion: e.target.value })}
        >
          <option value="all">Todas</option>
          {versions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label htmlFor="f-tag">Tag</label>
        <select
          id="f-tag"
          className="select"
          value={filters.tag}
          onChange={(e) => onChange({ ...filters, tag: e.target.value })}
        >
          <option value="all">Todas</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
}
