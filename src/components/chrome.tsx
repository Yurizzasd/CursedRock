import { Link } from 'react-router-dom';
import { ArrowDownAZ, ArrowRight, ArrowUpDown, Flame, LayoutGrid, List, RefreshCw, Sparkles, Star } from 'lucide-react';
import { useMemo } from 'react';
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

export function AdSlot({ label = 'Espaço do anunciante — 970×250' }: { label?: string }) {
  // Placeholder para monetização futura (AdCash etc).
  // Renderiza um bloco discreto que NÃO cobre conteúdo nem botões.
  return <div className="ad-slot" aria-hidden="true">{label}</div>;
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
