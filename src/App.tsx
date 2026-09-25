import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { EmberField } from './components/chrome';
import { BootIntro } from './components/BootIntro';
import { Home } from './pages/Home';
import { Addons } from './pages/Addons';
import { AddonDetail } from './pages/AddonDetail';
import { SearchPage } from './pages/Search';
import { Categories, CategoryDetail } from './pages/Categories';
import { Creators, CreatorDetail } from './pages/Creators';
import { Favorites } from './pages/Favorites';
import { NotFound } from './pages/NotFound';
import { useFavorites } from './hooks/useFavorites';

type VTDocument = Document & {
  startViewTransition?: (cb: () => void) => void;
};

// Transição de rota: a capa clicada morphs no banner da ficha (shared element)
// + crossfade/deslize do resto. Fallback: navegação normal.
function RouteTransitions() {
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = a.getAttribute('href') ?? '';
      if (!href.startsWith('/') || href.startsWith('//') || a.target === '_blank') return;
      const doc = document as VTDocument;
      if (!doc.startViewTransition) return; // sem suporte: Router resolve
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      e.preventDefault();
      // marca a capa clicada p/ morphar no banner da ficha
      const card = a.closest('.card, .addon-row, .showcase-main, .showcase-mini');
      card?.querySelector('img')?.style.setProperty('view-transition-name', 'addon-hero');
      doc.startViewTransition(() => navigate(href));
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [navigate]);

  return null;
}

export default function App() {
  const { favorites, toggle, clear } = useFavorites();

  return (
    <BrowserRouter>
      <BootIntro />
      <RouteTransitions />
      <EmberField />
      <Header favCount={favorites.length} />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home favorites={favorites} onToggleFavorite={toggle} />} />
          <Route path="/addons" element={<Addons favorites={favorites} onToggleFavorite={toggle} />} />
          <Route path="/addon/:slug" element={<AddonDetail favorites={favorites} onToggleFavorite={toggle} />} />
          <Route path="/search" element={<SearchPage favorites={favorites} onToggleFavorite={toggle} />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/category/:slug" element={<CategoryDetail favorites={favorites} onToggleFavorite={toggle} />} />
          <Route path="/creators" element={<Creators />} />
          <Route path="/creator/:slug" element={<CreatorDetail favorites={favorites} onToggleFavorite={toggle} />} />
          <Route path="/favorites" element={<Favorites favorites={favorites} onToggleFavorite={toggle} onClear={clear} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
