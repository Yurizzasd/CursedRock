import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CountUp } from '../components/chrome';
import { DownloadButton } from '../components/DownloadFavorite';
import {
  getAllAddons,
  getAllCreators,
  getTrendingAddons,
} from '../data/repository';
import { formatDownloads } from '../utils/format';
import { useDocumentTitle } from '../hooks/hooks';

function Showcase({ items }: { items: ReturnType<typeof getTrendingAddons> }) {
  const [main] = items;
  if (!main) return null;
  return (
    <div className="showcase" aria-label="Vitrine">
      <div className="showcase-main">
        <span className="stamp showcase-stamp">★ testado no jogo</span>
        <img src={main.thumbnail} alt={`Capa de ${main.name}`} />
        <div className="showcase-shade" />
        <div className="showcase-hover">
          <DownloadButton addon={main} />
        </div>
        <div className="showcase-info">
          <span className="eyebrow">Em alta</span>
          <h3>
            <Link to={`/addon/${main.id}`}>{main.name}</Link>
          </h3>
          <p>{main.description}</p>
          <Link to={`/addon/${main.id}`} className="showcase-more">
            Ver detalhes <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Home() {
  useDocumentTitle(
    'CursedRock — Addons para Minecraft Bedrock',
    'Catálogo underground de addons para Minecraft Bedrock: weapons, mobs, magic, horror e mais.',
  );
  const vitrine = useMemo(() => getTrendingAddons(4), []);
  const stats = useMemo(() => {
    const all = getAllAddons();
    return {
      addons: all.length,
      creators: getAllCreators().length,
      downloads: all.reduce((s, a) => s + a.downloads, 0),
    };
  }, []);

  return (
    <div>
      {/* HERO — tela única de entrada */}
      <section className="hero hero-landing">
        <div className="hero-backdrop" aria-hidden="true">
          CURSEDROCK
        </div>
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Minecraft Bedrock — Addons</span>
            <h1>
              <span className="solid">Desenterre</span>
              <br />
              <span className="solid">addons</span>
              <br />
              <span className="ember">cursed.</span>
            </h1>
            <p className="hero-sub">
              O catálogo underground de <strong>Minecraft Bedrock</strong>: weapons, mobs, magia,
              horror e máquinas — curadoria manual, downloads diretos dos criadores.
            </p>
            <div className="hero-actions">
              <Link to="/addons" className="btn btn-primary">
                Explorar catálogo <ArrowRight size={16} />
              </Link>
              <Link to="/categories" className="btn btn-ghost">
                Ver categorias
              </Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <b>
                  <CountUp value={stats.addons} />
                </b>
                <span>addons</span>
              </div>
              <div className="hero-stat">
                <b>
                  <CountUp value={stats.creators} />
                </b>
                <span>criadores</span>
              </div>
              <div className="hero-stat">
                <b>
                  <CountUp value={stats.downloads} format={(n) => formatDownloads(n)} />
                </b>
                <span>downloads</span>
              </div>
            </div>
          </div>
          <Showcase items={vitrine} />
        </div>
      </section>
    </div>
  );
}
