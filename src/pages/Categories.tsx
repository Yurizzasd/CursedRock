import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AddonGrid } from '../components/AddonCard';
import { CategoryCard } from '../components/CategoryCreator';
import { EmptyState } from '../components/states';
import { SortBar, ViewToggle } from '../components/chrome';
import { countByCategory, filterAddons, getAllCategories, getCategoryById } from '../data/repository';
import type { SortKey } from '../types';
import { useDocumentTitle, useViewMode } from '../hooks/hooks';
import { NotFound } from './NotFound';

export function Categories() {
  useDocumentTitle('Categorias — CursedRock', 'Explore addons por categoria: weapons, horror, magic, vehicles e mais.');
  const cats = useMemo(() => getAllCategories(), []);
  const counts = useMemo(() => countByCategory(), []);
  return (
    <div className="container page">
      <span className="eyebrow">Organize o caos</span>
      <h1 className="page-title">Categorias</h1>
      <p className="page-sub">{cats.length} categorias para navegar no underground.</p>
      <div className="cat-grid">
        {cats.map((c) => (
          <CategoryCard key={c.id} category={c} count={counts[c.id] ?? 0} />
        ))}
      </div>
    </div>
  );
}

export function CategoryDetail({
  favorites,
  onToggleFavorite,
}: {
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}) {
  const { slug } = useParams();
  const category = slug ? getCategoryById(slug) : undefined;
  const [sort, setSort] = useState<SortKey>('popular');
  const [view, setView] = useViewMode();

  useDocumentTitle(
    category ? `${category.name} — Addons | CursedRock` : 'Categoria não encontrada — CursedRock',
    category?.description,
  );

  const results = useMemo(
    () => (category ? filterAddons({ category: category.id, sort }) : []),
    [category, sort],
  );

  if (!category) return <NotFound />;

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Trilha">
        <Link to="/">Home</Link> / <Link to="/categories">Categorias</Link> / <span>{category.name}</span>
      </nav>
      <span className="eyebrow">Categoria</span>
      <h1 className="page-title">{category.name}</h1>
      <p className="page-sub">
        {category.description} — {results.length} addon{results.length === 1 ? '' : 's'}.
      </p>
      <div className="toolbar">
        <SortBar value={sort} onChange={setSort} />
        <span className="spacer" />
        <ViewToggle mode={view} onChange={setView} />
      </div>
      {results.length === 0 ? (
        <EmptyState
          title="Nenhum addon nesta categoria ainda."
          sub="O underground cresce rápido — volte em breve ou explore outra categoria."
          actionTo="/categories"
          actionLabel="Ver categorias"
        />
      ) : (
        <AddonGrid addons={results} favorites={favorites} onToggleFavorite={onToggleFavorite} layout={view} />
      )}
    </div>
  );
}
