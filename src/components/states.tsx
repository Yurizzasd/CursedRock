import { Link } from 'react-router-dom';
import { PackageSearch, TriangleAlert } from 'lucide-react';

export function EmptyState({
  title = 'Nenhum addon encontrado.',
  sub = 'Tente pesquisar por outro nome ou categoria.',
  actionTo,
  actionLabel,
}: {
  title?: string;
  sub?: string;
  actionTo?: string;
  actionLabel?: string;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <PackageSearch size={28} />
      </div>
      <h3>{title}</h3>
      <p>{sub}</p>
      {actionTo && (
        <Link to={actionTo} className="btn btn-ghost">
          {actionLabel ?? 'Explorar catálogo'}
        </Link>
      )}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <TriangleAlert size={28} />
      </div>
      <h3>Algo deu errado no underground.</h3>
      <p>Não foi possível carregar este conteúdo. Verifique sua conexão e tente novamente.</p>
      {onRetry && (
        <button className="btn btn-ghost" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
