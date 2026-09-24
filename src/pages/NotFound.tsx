import { Link } from 'react-router-dom';
import { Skull } from 'lucide-react';
import { useDocumentTitle } from '../hooks/hooks';

export function NotFound() {
  useDocumentTitle('404 — Perdido no underground | CursedRock');
  return (
    <div className="container page" style={{ textAlign: 'center', paddingTop: 70, paddingBottom: 90 }}>
      <div className="empty-icon" style={{ width: 84, height: 84, color: 'var(--red-bright)' }}>
        <Skull size={38} />
      </div>
      <p className="eyebrow" style={{ justifyContent: 'center' }}>
        Erro 404
      </p>
      <h1 className="page-title" style={{ fontSize: 'clamp(34px, 6vw, 60px)' }}>
        Perdido no<br />underground
      </h1>
      <p className="page-sub" style={{ margin: '12px auto 26px', textAlign: 'center' }}>
        Esta página foi consumida pelo void. O addon, categoria ou criador que você procura não existe
        — ou foi selado.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/" className="btn btn-primary">
          Voltar ao início
        </Link>
        <Link to="/addons" className="btn btn-ghost">
          Explorar addons
        </Link>
      </div>
    </div>
  );
}
