import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, HeartHandshake, TrendingUp } from 'lucide-react';
import { AddonGrid } from '../components/AddonCard';
import { CategoryCard } from '../components/CategoryCreator';
import { AdSlot, RuneDivider, SectionHeader } from '../components/chrome';
import { DownloadButton } from '../components/DownloadFavorite';
import {
  countByCategory,
  getAllAddons,
  getAllCategories,
  getAllCreators,
  getFeaturedAddons,
  getPopularAddons,
  getRecentAddons,
  getTrendingAddons,
  getUpdatedAddons,
} from '../data/repository';
import { formatDownloads } from '../utils/format';
import { useDocumentTitle } from '../hooks/hooks';

type Tab = 'trending' | 'popular' | 'new' | 'updated';

function Showcase() {
  const items = useMemo(() => getTrendingAddons(4), []);
  const [main, ...rest] = items;
  if (!main) return null;
  return (
    <div className="showcase" aria-label="Vitrine">
      <div className="showcase-main">
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
        </div>
      </div>
      <div className="showcase-list">
        {rest.map((a) => (
          <Link key={a.id} to={`/addon/${a.id}`} className="showcase-mini">
            <img src={a.thumbnail} alt="" loading="lazy" />
            <span style={{ minWidth: 0 }}>
              <b>{a.name}</b>
              <span>v{a.version}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Home({
  favorites,
  onToggleFavorite,
}: {
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}) {
  useDocumentTitle(
    'CursedRock — Addons para Minecraft Bedrock',
    'Catálogo underground de addons para Minecraft Bedrock: weapons, mobs, magic, horror e mais.',
  );
  const [tab, setTab] = useState<Tab>('trending');

  const featured = useMemo(() => getFeaturedAddons().slice(0, 4), []);
  const tabAddons = useMemo(() => {
    switch (tab) {
      case 'popular':
        return getPopularAddons(8);
      case 'new':
        return getRecentAddons(8);
      case 'updated':
        return getUpdatedAddons(8);
      default:
        return getTrendingAddons(8);
    }
  }, [tab]);
  const recent = useMemo(() => getRecentAddons(4), []);
  const counts = useMemo(() => countByCategory(), []);
  const cats = useMemo(() => getAllCategories().slice(0, 8), []);
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
      {/* HERO */}
      <section className="hero">
        <div className="hero-backdrop" aria-hidden="true">
          CURSEDROCK
        </div>
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Minecraft Bedrock — Addons</span>
            <h1>
              <span className="stroke">Desenterre</span>
              <br />
              <span className="solid">addons cursed.</span>
            </h1>
            <p className="hero-sub">
              O catálogo underground de <strong>Minecraft Bedrock</strong>: weapons, mobs, magic,
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
                <b>{stats.addons}</b>
                <span>addons</span>
              </div>
              <div className="hero-stat">
                <b>{stats.creators}</b>
                <span>criadores</span>
              </div>
              <div className="hero-stat">
                <b>{formatDownloads(stats.downloads)}</b>
                <span>downloads</span>
              </div>
            </div>
          </div>
          <Showcase />
        </div>
      </section>

      <div className="container">
        {/* DESTAQUES — só aparece quando há addons marcados como featured */}
        {featured.length > 0 && (
          <section className="home-section">
            <SectionHeader
              eyebrow="Curadoria CursedRock"
              title="Destaques da semana"
              sub="Escolhidos a dedo. Instala, joga, sobrevive — se conseguir."
              linkTo="/addons?sort=popular"
            />
            <AddonGrid addons={featured} favorites={favorites} onToggleFavorite={onToggleFavorite} />
          </section>
        )}

        <AdSlot label="Espaço do anunciante — leaderboard" />

        {/* TABS */}
        <section className="home-section">
          <SectionHeader eyebrow="Catálogo vivo" title="Explore por movimento" />
          <div className="tabs" role="tablist">
            {(
              [
                ['trending', 'Trending'],
                ['popular', 'Popular'],
                ['new', 'New'],
                ['updated', 'Updated'],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                className={tab === key ? 'active' : ''}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <AddonGrid addons={tabAddons} favorites={favorites} onToggleFavorite={onToggleFavorite} />
        </section>

        <RuneDivider label="■ ◆ ■" />

        {/* CATEGORIAS */}
        <section className="home-section">
          <SectionHeader
            eyebrow="Organize o caos"
            title="Categorias"
            linkTo="/categories"
            linkLabel="Todas as categorias"
          />
          <div className="cat-grid">
            {cats.map((c) => (
              <CategoryCard key={c.id} category={c} count={counts[c.id] ?? 0} />
            ))}
          </div>
        </section>

        {/* RECENTES */}
        <section className="home-section">
          <SectionHeader
            eyebrow="Acabou de sair do forno"
            title="Adicionados recentemente"
            linkTo="/addons?sort=recent"
          />
          <AddonGrid addons={recent} favorites={favorites} onToggleFavorite={onToggleFavorite} />
        </section>

        {/* CTA CRIADORES */}
        <section className="home-section">
          <div className="cta-band">
            <div>
              <span className="eyebrow">Para criadores</span>
              <h2>
                Publica no <span style={{ color: 'var(--red-bright)' }}>CursedRock</span>
              </h2>
              <p>
                Página própria, estatísticas de downloads e uma comunidade que realmente joga Bedrock.
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
                  <HeartHandshake size={15} /> <TrendingUp size={15} /> <Flame size={15} />
                </span>
              </p>
            </div>
            <Link to="/creators" className="btn btn-primary btn-lg">
              Conhecer criadores <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
