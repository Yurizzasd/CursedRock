import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2 } from 'lucide-react';
import { AddonGrid } from '../components/AddonCard';
import { getAddonById } from '../data/repository';
import { useDocumentTitle } from '../hooks/hooks';

export function Favorites({
  favorites,
  onToggleFavorite,
  onClear,
}: {
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onClear: () => void;
}) {
  useDocumentTitle('Favoritos — CursedRock', 'Seus addons favoritados, salvos neste dispositivo.');

  const addons = useMemo(
    () => favorites.map(getAddonById).filter((a): a is NonNullable<typeof a> => Boolean(a)),
    [favorites],
  );

  return (
    <div className="container page">
      <span className="eyebrow">Salvos neste dispositivo</span>
      <h1 className="page-title">Favoritos</h1>
      <p className="page-sub">
        {addons.length === 0
          ? 'Você ainda não favoritou nada. Toque no coração de qualquer addon para guardá-lo aqui.'
          : `${addons.length} addon${addons.length === 1 ? '' : 's'} guardados. Sem login — fica no seu navegador.`}
      </p>

      {addons.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <Heart size={26} />
          </div>
          <h3>Nenhum favorito ainda.</h3>
          <p>Explore o catálogo e salve os addons que você quer instalar depois.</p>
          <Link to="/addons" className="btn btn-primary">
            Explorar addons
          </Link>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <span className="result-count">{addons.length} salvos</span>
            <span className="spacer" />
            <button className="btn btn-ghost" onClick={onClear}>
              <Trash2 size={15} /> Limpar tudo
            </button>
          </div>
          <AddonGrid addons={addons} favorites={favorites} onToggleFavorite={onToggleFavorite} />
        </>
      )}
    </div>
  );
}
