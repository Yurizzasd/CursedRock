import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

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
