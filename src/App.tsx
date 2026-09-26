import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
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

// Transição de lava entre seções: o magma sobe cobrindo a tela,
// navega no pico e desce revelando a nova página.
function RouteTransitions() {
  const navigate = useNavigate();
  const location = useLocation();
  const busy = useRef(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = a.getAttribute('href') ?? '';
      if (!href.startsWith('/') || href.startsWith('//') || a.target === '_blank') return;
      if (href === location.pathname + location.search) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // Router resolve
      e.preventDefault();
      if (busy.current) return;
      const veil = document.getElementById('lava-veil');
      if (!veil) {
        navigate(href);
        return;
      }
      busy.current = true;
      veil.classList.add('show', 'rise');
      window.setTimeout(() => {
        navigate(href);
        window.scrollTo({ top: 0 });
        veil.classList.remove('rise');
        veil.classList.add('fall');
        window.setTimeout(() => {
          veil.classList.remove('show', 'fall');
          busy.current = false;
        }, 540);
      }, 480);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [navigate, location.pathname, location.search]);

  return null;
}

function LavaVeil() {
  return (
    <div id="lava-veil" className="lava-veil" aria-hidden="true">
      <div className="veil-lava back" />
      <div className="veil-lava front" />
    </div>
  );
}

export default function App() {
  const { favorites, toggle, clear } = useFavorites();

  return (
    <BrowserRouter>
      <BootIntro />
      <LavaVeil />
      <RouteTransitions />
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
