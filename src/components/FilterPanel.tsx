import type { SortKey } from '../types';
import { getAllCategories, getAllMinecraftVersions, getAllTags } from '../data/repository';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'popular', label: 'Populares' },
  { key: 'recent', label: 'Recentes' },
  { key: 'updated', label: 'Atualizados' },
  { key: 'rating', label: 'Avaliados' },
  { key: 'name', label: 'A–Z' },
];

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

  return (
    <aside className="filters" aria-label="Filtros">
      <h3>Ordenar</h3>
      <div className="sort-pills" role="group" aria-label="Ordenação">
        {SORTS.map((s) => (
          <button
            key={s.key}
            className={`pill${filters.sort === s.key ? ' active' : ''}`}
            onClick={() => onChange({ ...filters, sort: s.key })}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="filter-group">
        <label htmlFor="f-cat">Categoria</label>
        <select
          id="f-cat"
          className="select"
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
        >
          <option value="all">Todas</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
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
