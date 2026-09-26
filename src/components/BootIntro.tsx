import { useEffect, useRef, useState } from 'react';
import { LogoMark } from './Logo';

// Intro de entrada: LOADING 0→100% + revelação em íris + site nascendo junto.
// Toca 1x por carregamento; respeita reduced-motion e sai no clique.
const LAVA_EMBERS = Array.from({ length: 12 }, (_, i) => ({
  left: (i * 53 + 11) % 100,
  size: 5 + ((i * 7) % 9),
  dur: 2.6 + ((i * 13) % 30) / 10,
  delay: -((i * 17) % 25) / 10,
}));

// gerador determinístico de células pixeladas p/ os patterns de lava
function lavaCells(seed: number, cols: number, rows: number, cell: number, palette: string[]) {
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const r = rnd();
      if (r < 0.28) continue; // falhas = crosta escura
      rects.push(
        <rect
          key={`${x}-${y}`}
          x={x * cell}
          y={y * cell}
          width={cell}
          height={cell}
          fill={palette[Math.floor(rnd() * palette.length)]}
        />,
      );
    }
  }
  return rects;
}

const LAVA_A = ['#e23c1f', '#e23c1f', '#ff7a2b', '#ff7a2b', '#ffd23f', '#a82812'];
const LAVA_B = ['#7a1f12', '#7a1f12', '#a82812', '#e23c1f', '#5c150c'];

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
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <pattern id="lavaTileA" width="120" height="40" patternUnits="userSpaceOnUse">
            <animateTransform
              attributeName="patternTransform"
              type="translate"
              from="0 0"
              to="120 0"
              dur="5s"
              repeatCount="indefinite"
            />
            {lavaCells(7, 10, 4, 12, LAVA_A)}
          </pattern>
          <pattern id="lavaTileB" width="120" height="40" patternUnits="userSpaceOnUse">
            <animateTransform
              attributeName="patternTransform"
              type="translate"
              from="120 0"
              to="0 0"
              dur="8s"
              repeatCount="indefinite"
            />
            {lavaCells(42, 10, 4, 12, LAVA_B)}
          </pattern>
        </defs>
      </svg>
      <div className="lava" aria-hidden="true">
        <div className="lava-glow" />
        {LAVA_EMBERS.map((e, i) => (
          <span
            key={i}
            className="lava-ember"
            style={{
              left: `${e.left}%`,
              width: e.size,
              height: e.size,
              animationDuration: `${e.dur}s`,
              animationDelay: `${e.delay}s`,
            }}
          />
        ))}
        <svg className="lava-waves back" viewBox="0 0 480 60" preserveAspectRatio="none">
          <path
            fill="url(#lavaTileB)"
            d="M0,32 Q30,12 60,32 T120,32 T180,32 T240,32 T300,32 T360,32 T420,32 T480,32 V60 H0 Z"
          />
        </svg>
        <svg className="lava-waves front" viewBox="0 0 480 60" preserveAspectRatio="none">
          <path
            fill="url(#lavaTileA)"
            d="M0,34 Q30,16 60,34 T120,34 T180,34 T240,34 T300,34 T360,34 T420,34 T480,34 V60 H0 Z"
          />
        </svg>
      </div>
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
