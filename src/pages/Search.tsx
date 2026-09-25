import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { AddonGrid } from '../components/AddonCard';
import { EmptyState } from '../components/states';
import { SortBar, ViewToggle } from '../components/chrome';
import { filterAddons } from '../data/repository';
import type { SortKey } from '../types';
import { useDebounce, useDocumentTitle, useViewMode } from '../hooks/hooks';

export function SearchPage({
  favorites,
  onToggleFavorite,
}: {
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}) {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [input, setInput] = useState(q);
  const debounced = useDebounce(input, 250);
  const [sort, setSort] = useState<SortKey>('popular');
  const [view, setView] = useViewMode();

  useDocumentTitle(
    q ? `Busca por "${q}" — CursedRock` : 'Buscar addons — CursedRock',
    'Pesquise addons por nome, criador, categoria, tags ou versão do Minecraft.',
  );

  // sincroniza a URL enquanto digita (sem recarregar)
  const onType = (v: string) => {
    setInput(v);
    setParams(v ? { q: v } : {}, { replace: true });
  };

  const results = useMemo(
    () => filterAddons({ query: debounced || q, sort }),
    [debounced, q, sort],
  );

  const term = debounced || q;

  return (
    <div className="container page">
      <span className="eyebrow">Busca global</span>
      <h1 className="page-title">Pesquisar</h1>
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
          placeholder="Nome, criador, categoria, tag ou versão… ex: horror 1.21"
          aria-label="Buscar addons"
          value={input}
          onChange={(e) => onType(e.target.value)}
          autoFocus
        />
      </form>

      {term ? (
        <>
          <div className="toolbar">
            <span className="result-count">
              {results.length} resultado{results.length === 1 ? '' : 's'} para “{term}”
            </span>
            <span className="spacer" />
            <ViewToggle mode={view} onChange={setView} />
            <SortBar value={sort} onChange={setSort} />
          </div>
          {results.length === 0 ? (
            <EmptyState
              title={`Nada encontrado para “${term}”.`}
              sub="Tente outro nome, criador, categoria ou versão — ex: weapons, HexForge, 1.21."
              actionTo="/addons"
              actionLabel="Ver catálogo completo"
            />
          ) : (
            <AddonGrid addons={results} favorites={favorites} onToggleFavorite={onToggleFavorite} layout={view} />
          )}
        </>
      ) : (
        <div className="empty">
          <div className="empty-icon">
            <Search size={26} />
          </div>
          <h3>Busque no underground</h3>
          <p>
            Pesquise por <strong>nome</strong>, <strong>criador</strong>, <strong>categoria</strong>,{' '}
            <strong>tags</strong> ou <strong>versão</strong>. Ou comece por aqui:
          </p>
          <div className="tag-list" style={{ justifyContent: 'center' }}>
            {['horror', 'weapons', 'HexForge', 'anime', '1.21.20', 'furniture', 'vehicles'].map((s) => (
              <Link key={s} to={`/search?q=${encodeURIComponent(s)}`} className="tag" onClick={() => setInput(s)}>
                {s}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
