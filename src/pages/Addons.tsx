import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { AddonGrid, CardSkeletons } from '../components/AddonCard';
import { FilterPanel, type FilterState } from '../components/FilterPanel';
import { EmptyState } from '../components/states';
import { SortBar, ViewToggle } from '../components/chrome';
import { filterAddons } from '../data/repository';
import type { SortKey } from '../types';
import { useDebounce, useDocumentTitle, useViewMode } from '../hooks/hooks';

const PAGE_SIZE = 12;

function validSort(s: string | null): SortKey {
  return s === 'recent' || s === 'popular' || s === 'updated' || s === 'name' || s === 'rating'
    ? s
    : 'popular';
}

export function Addons() {
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
  const [view, setView] = useViewMode();
  const [query, setQuery] = useState(() => params.get('q') ?? '');
  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    setFilters((f) => ({ ...f, sort: validSort(params.get('sort')) }));
    const q = params.get('q');
    if (q !== null) setQuery(q);
  }, [params]);

  useEffect(() => {
    setPage(1);
  }, [filters, debouncedQuery]);

  // skeleton simulado para demonstrar o estado de loading
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, [filters, debouncedQuery, page]);

  const results = useMemo(
    () =>
      filterAddons({
        query: debouncedQuery || undefined,
        sort: filters.sort,
        category: filters.category === 'all' ? undefined : filters.category,
        mcVersion: filters.mcVersion === 'all' ? undefined : filters.mcVersion,
        tag: filters.tag === 'all' ? undefined : filters.tag,
      }),
    [filters, debouncedQuery],
  );

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const start = (current - 1) * PAGE_SIZE;
  const visible = results.slice(start, start + PAGE_SIZE);

  const goTo = (p: number) => {
    const next = Math.min(Math.max(1, p), pages);
    if (next === current) return;
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pageList = (() => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1) as (number | 'gap')[];
    const nums = [...new Set([1, pages, current - 1, current, current + 1])]
      .filter((n) => n >= 1 && n <= pages)
      .sort((a, b) => a - b);
    const out: (number | 'gap')[] = [];
    nums.forEach((n, i) => {
      if (i > 0 && n - nums[i - 1] > 1) out.push('gap');
      out.push(n);
    });
    return out;
  })();

  return (
    <div className="container page">
      <span className="eyebrow">Catálogo</span>
      <h1 className="page-title">Todos os addons</h1>
      <p className="page-sub">
        {results.length} addon{results.length === 1 ? '' : 's'} no underground. Filtre por categoria,
        versão do Minecraft ou tag.
      </p>
      <form
        className="searchbar"
        style={{ maxWidth: 560, marginBottom: 18 }}
        onSubmit={(e) => e.preventDefault()}
        role="search"
      >
        <Search />
        <input
          type="search"
          style={{ width: '100%' }}
          placeholder="Filtrar por nome, criador, tag ou versão…"
          aria-label="Filtrar addons"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>
      <div className="layout-2col">
        <FilterPanel filters={filters} onChange={setFilters} />
        <div>
          <div className="toolbar">
            <span className="result-count">
              {results.length ? `Mostrando ${start + 1}–${Math.min(start + PAGE_SIZE, results.length)} de ${results.length}` : '0 resultados'}
              {' • '}pág. {current}/{pages}
            </span>
            <span className="spacer" />
            <ViewToggle mode={view} onChange={setView} />
            <SortBar value={filters.sort} onChange={(sort) => setFilters((f) => ({ ...f, sort }))} />
          </div>
          {loading ? (
            <CardSkeletons count={8} />
          ) : visible.length === 0 ? (
            <EmptyState actionTo="/addons" actionLabel="Limpar filtros" />
          ) : (
            <>
              <AddonGrid addons={visible} cols3={view === 'grid'} layout={view} />
              {pages > 1 && (
                <nav className="pager" aria-label="Paginação dos addons">
                  <button
                    type="button"
                    aria-label="Página anterior"
                    disabled={current <= 1}
                    onClick={() => goTo(current - 1)}
                  >
                    ←
                  </button>
                  {pageList.map((n, i) =>
                    n === 'gap' ? (
                      <span key={`gap-${i}`} className="pager-gap" aria-hidden="true">
                        …
                      </span>
                    ) : (
                      <button
                        type="button"
                        key={n}
                        className={current === n ? 'active' : ''}
                        aria-label={`Página ${n}`}
                        aria-current={current === n ? 'page' : undefined}
                        onClick={() => goTo(n)}
                      >
                        {n}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    aria-label="Próxima página"
                    disabled={current >= pages}
                    onClick={() => goTo(current + 1)}
                  >
                    →
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
