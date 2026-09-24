import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AddonGrid, CardSkeletons } from '../components/AddonCard';
import { FilterPanel, type FilterState } from '../components/FilterPanel';
import { EmptyState } from '../components/states';
import { filterAddons } from '../data/repository';
import type { SortKey } from '../types';
import { useDocumentTitle } from '../hooks/hooks';

const PAGE_SIZE = 12;

function validSort(s: string | null): SortKey {
  return s === 'recent' || s === 'popular' || s === 'updated' || s === 'name' || s === 'rating'
    ? s
    : 'popular';
}

export function Addons({
  favorites,
  onToggleFavorite,
}: {
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}) {
  useDocumentTitle('Addons — CursedRock', 'Todos os addons para Minecraft Bedrock: filtre por categoria, versão e popularidade.');
  const [params] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>({
    sort: validSort(params.get('sort')),
    category: 'all',
    mcVersion: 'all',
    tag: 'all',
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setFilters((f) => ({ ...f, sort: validSort(params.get('sort')) }));
  }, [params]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  // skeleton simulado para demonstrar o estado de loading
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, [filters, page]);

  const results = useMemo(
    () =>
      filterAddons({
        sort: filters.sort,
        category: filters.category === 'all' ? undefined : filters.category,
        mcVersion: filters.mcVersion === 'all' ? undefined : filters.mcVersion,
        tag: filters.tag === 'all' ? undefined : filters.tag,
      }),
    [filters],
  );

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = results.slice(0, current * PAGE_SIZE);

  return (
    <div className="container page">
      <span className="eyebrow">Catálogo</span>
      <h1 className="page-title">Todos os addons</h1>
      <p className="page-sub">
        {results.length} addon{results.length === 1 ? '' : 's'} no underground. Filtre por categoria,
        versão do Minecraft ou tag.
      </p>
      <div className="layout-2col">
        <FilterPanel filters={filters} onChange={setFilters} />
        <div>
          <div className="toolbar">
            <span className="result-count">
              {results.length} resultado{results.length === 1 ? '' : 's'} • pág. {current}/{pages}
            </span>
          </div>
          {loading ? (
            <CardSkeletons count={8} />
          ) : visible.length === 0 ? (
            <EmptyState actionTo="/addons" actionLabel="Limpar filtros" />
          ) : (
            <>
              <AddonGrid addons={visible} favorites={favorites} onToggleFavorite={onToggleFavorite} cols3 />
              {current < pages ? (
                <div className="load-more-wrap">
                  <button className="btn btn-ghost" onClick={() => setPage((p) => p + 1)}>
                    Carregar mais ({results.length - visible.length} restantes)
                  </button>
                </div>
              ) : (
                pages > 1 && (
                  <div className="pager">
                    <button disabled={current <= 1} onClick={() => setPage((p) => p - 1)}>
                      ←
                    </button>
                    {Array.from({ length: pages }).map((_, i) => (
                      <button key={i} className={current === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>
                        {i + 1}
                      </button>
                    ))}
                    <button disabled={current >= pages} onClick={() => setPage((p) => p + 1)}>
                      →
                    </button>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
