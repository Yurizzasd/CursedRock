import { useEffect, useRef, useState } from 'react';
import { LogoMark } from './Logo';

// Intro de entrada: LOADING 0→100% + revelação em íris + site nascendo junto.
// Toca 1x por carregamento; respeita reduced-motion e sai no clique.
export function BootIntro() {
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const [dead, setDead] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.body.classList.add('site-entered');
      setDead(true);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const DUR = 1200;
    const finish = () => {
      if (done.current) return;
      done.current = true;
      setProgress(100);
      setOpen(true);
      document.body.classList.add('site-entered');
      setTimeout(() => setDead(true), 1000);
    };
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / DUR);
      setProgress(Math.round(100 * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);
    (window as unknown as { __skipIntro?: () => void }).__skipIntro = finish;
    return () => {
      cancelAnimationFrame(raf);
      delete (window as unknown as { __skipIntro?: () => void }).__skipIntro;
    };
  }, []);

  if (dead) return null;

  const skip = () => {
    (window as unknown as { __skipIntro?: () => void }).__skipIntro?.();
  };

  return (
    <div className={`intro${open ? ' open' : ''}`} onClick={skip} aria-hidden="true">
      <div className="intro-core">
        <span className="intro-mark">
          <LogoMark />
        </span>
        <p className="intro-loading">LOADING</p>
        <p className="intro-pct">{progress}%</p>
        <div className="intro-bar">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
