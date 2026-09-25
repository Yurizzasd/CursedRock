import { Link } from 'react-router-dom';
import { ArrowRight, LayoutGrid, List } from 'lucide-react';
import { useMemo } from 'react';
import type { ViewMode } from '../hooks/hooks';

export function SectionHeader({
  eyebrow,
  title,
  sub,
  linkTo,
  linkLabel = 'Ver todos',
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <div className="section-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
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

export function EmberField() {
  const embers = useMemo(
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
