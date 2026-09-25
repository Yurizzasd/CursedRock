import { Link } from 'react-router-dom';
import { ArrowDownAZ, ArrowRight, ArrowUpDown, Flame, LayoutGrid, List, RefreshCw, Sparkles, Star } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ViewMode } from '../hooks/hooks';
import type { SortKey } from '../types';

export function SectionHeader({
  eyebrow,
  title,
  sub,
  linkTo,
  linkLabel = 'Ver todos',
  num,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  linkTo?: string;
  linkLabel?: string;
  num?: string;
}) {
  return (
    <div className="section-head">
      <div>
        <span className="eyebrow">
          {num && <span className="secnum">{num}</span>}
          {eyebrow}
        </span>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {linkTo && (
        <Link to={linkTo} className="section-link">
          {linkLabel} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}

export function RuneDivider({ label = '◆ ◆ ◆' }: { label?: string }) {
  return (
    <div className="rune-divider" aria-hidden="true">
      <span>{label}</span>
    </div>
  );
}

// Reveal on scroll: acende ao entrar na tela (IntersectionObserver, 1x).
export function Reveal({
  children,
  className = '',
  style,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -36px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal${inView ? ' in' : ''}${className ? ` ${className}` : ''}`} style={style} {...rest}>
      {children}
    </div>
  );
}

// Filete de progresso de leitura (topo da ficha do addon).
export function ScrollProgress() {
  const [p, setP] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? Math.min(1, h.scrollTop / max) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return <div className="scroll-progress" style={{ transform: `scaleX(${p})` }} aria-hidden="true" />;
}

// Contador animado (hero stats).
export function CountUp({ value, format = (n: number) => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [disp, setDisp] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisp(value);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const DUR = 1300;
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / DUR);
          setDisp(value * (1 - Math.pow(1 - p, 3)));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return <span ref={ref}>{format(disp)}</span>;
}

export function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="view-toggle" role="group" aria-label="Modo de visualização">
      <button
        className={mode === 'grid' ? 'active' : ''}
        onClick={() => onChange('grid')}
        aria-label="Ver em grade"
        aria-pressed={mode === 'grid'}
      >
        <LayoutGrid />
      </button>
      <button
        className={mode === 'list' ? 'active' : ''}
        onClick={() => onChange('list')}
        aria-label="Ver em lista"
        aria-pressed={mode === 'list'}
      >
        <List />
      </button>
    </div>
  );
}

const SORT_META: Record<SortKey, { label: string; icon: typeof Flame }> = {
  popular: { label: 'Mais baixados', icon: Flame },
  recent: { label: 'Novidades', icon: Sparkles },
  updated: { label: 'Atualizados', icon: RefreshCw },
  rating: { label: 'Bem avaliados', icon: Star },
  name: { label: 'A–Z', icon: ArrowDownAZ },
};

export function SortBar({
  value,
  onChange,
  options = ['popular', 'recent', 'updated', 'name'],
  vertical = false,
}: {
  value: SortKey;
  onChange: (s: SortKey) => void;
  options?: SortKey[];
  vertical?: boolean;
}) {
  return (
    <div className={`sortbar${vertical ? ' vertical' : ''}`} role="group" aria-label="Ordenar por">
      <span className="sortbar-label">
        <ArrowUpDown /> Ordenar
      </span>
      <div className="sortbar-opts">
        {options.map((key) => {
          const { label, icon: Icon } = SORT_META[key];
          return (
            <button
              key={key}
              className={`sortopt${value === key ? ' active' : ''}`}
              onClick={() => onChange(key)}
              aria-pressed={value === key}
            >
              <Icon /> {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EmberField() {  const embers = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: (i * 61 + 7) % 100,
        size: 3 + ((i * 7) % 5),
        dur: 9 + ((i * 13) % 9),
        delay: -((i * 17) % 14),
      })),
    [],
  );
  return (
    <div className="embers" aria-hidden="true">
      {embers.map((e, i) => (
        <span
          key={i}
          className="ember"
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
  );
}
