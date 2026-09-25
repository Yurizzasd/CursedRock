import { useEffect, useState } from 'react';
import { Gem } from 'lucide-react';

// Intro de entrada: boot rápido + wipe de tinta revelando o site.
// Toca 1x por carregamento; respeita reduced-motion e sai no clique.
export function BootIntro() {
  const [gone, setGone] = useState(false);
  const [dead, setDead] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDead(true);
      return;
    }
    const t1 = setTimeout(() => setGone(true), 1750);
    const t2 = setTimeout(() => setDead(true), 2150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (dead) return null;

  const skip = () => {
    setGone(true);
    setTimeout(() => setDead(true), 250);
  };

  return (
    <div className={`intro${gone ? ' done' : ''}`} onClick={skip} aria-hidden="true">
      <div className="intro-core">
        <span className="intro-mark">
          <Gem />
        </span>
        <p className="intro-name">CURSEDROCK</p>
        <p className="intro-sub">INVOCANDO O UNDERGROUND…</p>
        <div className="intro-bar">
          <i />
        </div>
      </div>
      <span className="intro-wipe w1" />
      <span className="intro-wipe w2" />
      <span className="intro-wipe w3" />
      <span className="intro-wipe red" />
    </div>
  );
}
