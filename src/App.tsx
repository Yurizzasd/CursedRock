import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BootIntro } from './components/BootIntro';
import { Home } from './pages/Home';
import { Addons } from './pages/Addons';
import { AddonDetail } from './pages/AddonDetail';
import { NotFound } from './pages/NotFound';

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
    // capture: roda ANTES do React Router (que dá preventDefault nos links)
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [navigate, location.pathname, location.search]);

  return null;
}

function LavaVeil() {
  const cols = Array.from({ length: 26 }, (_, i) => ({
    delay: ((i * 37) % 10) / 20,
    dur: 0.34 + ((i * 53) % 20) / 100,
  }));
  const embers = Array.from({ length: 10 }, (_, i) => ({
    left: (i * 47 + 9) % 100,
    size: 4 + ((i * 5) % 7),
    dur: 1.8 + ((i * 11) % 14) / 10,
    delay: -((i * 13) % 18) / 10,
  }));
  return (
    <div id="lava-veil" className="lava-veil" aria-hidden="true">
      <div className="fire-stage">
        <div className="fire-cols">
          {cols.map((c, i) => (
            <span
              key={i}
              className="fire-col"
              style={{ animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }}
            />
          ))}
        </div>
        <div className="fire-grid" />
        {embers.map((e, i) => (
          <span
            key={i}
            className="fire-ember"
            style={{
              left: `${e.left}%`,
              width: e.size,
              height: e.size,
              animationDuration: `${e.dur}s`,
              animationDelay: `${e.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <BootIntro />
      <LavaVeil />
      <RouteTransitions />
      <Header />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/addons" element={<Addons />} />
          <Route path="/addon/:slug" element={<AddonDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
