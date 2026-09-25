import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BadgeCheck, Calendar, Check, ChevronLeft, ChevronRight, Cpu, Download, FileDown, Gamepad2, Info, Layers, Star, Tag, User, X,
} from 'lucide-react';
import { AddonGrid } from '../components/AddonCard';
import { Reveal, ScrollProgress, SectionHeader } from '../components/chrome';
import { DownloadButton, FavoriteButton } from '../components/DownloadFavorite';
import { getAddonById, getAddonsByCreator, getCategoryById, getCreatorById, getRelatedAddons } from '../data/repository';
import { formatDate, formatDownloads, formatNumber, timeAgo } from '../utils/format';
import { useDocumentTitle } from '../hooks/hooks';
import { NotFound } from './NotFound';

export function AddonDetail({
  favorites,
  onToggleFavorite,
}: {
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}) {
  const { slug } = useParams();
  const addon = slug ? getAddonById(slug) : undefined;
  const [lightbox, setLightbox] = useState<string | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  // SEO por addon: title + description dinâmicos
  useDocumentTitle(
    addon ? `${addon.name} — Download para Minecraft Bedrock | CursedRock` : 'Addon não encontrado — CursedRock',
    addon?.description,
  );

  if (!addon) return <NotFound />;

  const category = getCategoryById(addon.category);
  const creator = getCreatorById(addon.author);
  const related = getRelatedAddons(addon);
  const creatorCount = creator ? getAddonsByCreator(creator.id).length : 0;
  const power = Math.min(100, Math.round(22 * Math.log10(addon.downloads + 1)));
  const fav = favorites.includes(addon.id);
  const gallery = addon.screenshots.length > 0 ? addon.screenshots : [addon.thumbnail];

  const scrollRail = (dir: 1 | -1) => {
    railRef.current?.scrollBy({ left: dir * 420, behavior: 'smooth' });
  };

  return (
    <div className="container page">
      <ScrollProgress />
      <nav className="breadcrumb" aria-label="Trilha">
        <Link to="/">Home</Link> / <Link to="/addons">Addons</Link> /{' '}
        <Link to={`/category/${addon.category}`}>{category?.name ?? addon.category}</Link> /{' '}
        <span>{addon.name}</span>
      </nav>

      <div className="detail-hero">
        <div className="detail-banner">
          <img src={addon.thumbnail} alt={`Banner de ${addon.name}`} />
        </div>
        <div className="detail-bar">
          <span className="detail-icon">
            <img src={addon.thumbnail} alt={`Ícone de ${addon.name}`} />
          </span>
          <div className="detail-titleblock">
            <span className="eyebrow">{category?.name}</span>
            <h1>{addon.name}</h1>
            <p className="detail-by">
              por{' '}
              <Link to={`/creator/${addon.author}`}>
                {creator?.name ?? addon.authorDisplay ?? addon.author}
              </Link>{' '}
              {creator?.verified && (
                <BadgeCheck size={14} style={{ display: 'inline', verticalAlign: -2, color: 'var(--red-bright)' }} />
              )}{' '}
              • atualizado {timeAgo(addon.updatedAt)}
            </p>
          </div>
          <div className="detail-actions">
            <div className="dl-cta">
              <DownloadButton addon={addon} big />
              <span>{formatNumber(addon.downloads)} downloads</span>
            </div>
            <FavoriteButton active={fav} onToggle={() => onToggleFavorite(addon.id)} />
          </div>
        </div>
      </div>

      <div className="stat-row" style={{ marginBottom: 24 }}>
        <span className="stat-pill">
          <Download /> {formatNumber(addon.downloads)} downloads
        </span>
        {addon.rating && (
          <span className="stat-pill">
            <Star /> {addon.rating.toFixed(1)} / 5
          </span>
        )}
        <span className="stat-pill">
          <Gamepad2 /> {addon.minecraft_versions.join(' • ')}
        </span>
        <span className="stat-pill">
          <Calendar /> {formatDate(addon.updatedAt)}
        </span>
      </div>

      <div className="detail-cols">
        <div className="detail-main">
          <Reveal className="panel" aria-labelledby="about">
            <h2 id="about">
              <Info /> Sobre este addon
            </h2>
            <p>{addon.longDescription ?? addon.description}</p>
            <div className="tag-list" style={{ marginTop: 12 }}>
              {addon.tags.map((t) => (
                <Link key={t} to={`/search?q=${encodeURIComponent(t)}`} className="tag">
                  #{t}
                </Link>
              ))}
            </div>
          </Reveal>

          <Reveal className="panel" style={{ marginTop: 16 }} aria-labelledby="shots">
            <h2 id="shots">
              <Layers /> Screenshots
            </h2>
            <div className="carousel" ref={railRef}>
              {gallery.map((src, i) => (
                <button key={i} onClick={() => setLightbox(src)} aria-label={`Ampliar screenshot ${i + 1}`}>
                  <img src={src} alt={`${addon.name} — screenshot ${i + 1}`} loading="lazy" />
                </button>
              ))}
            </div>
            {gallery.length > 1 && (
              <div className="carousel-nav">
                <button onClick={() => scrollRail(-1)} aria-label="Anterior">
                  <ChevronLeft size={17} />
                </button>
                <button onClick={() => scrollRail(1)} aria-label="Próxima">
                  <ChevronRight size={17} />
                </button>
              </div>
            )}
          </Reveal>

          {addon.changelog && addon.changelog.length > 0 && (
            <Reveal className="panel" style={{ marginTop: 16 }} aria-labelledby="changelog">
              <h2 id="changelog">
                <Check /> O que mudou na v{addon.version}
              </h2>
              <ul className="changelog">
                {addon.changelog.map((c) => (
                  <li key={c}>
                    <Check /> {c}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </div>

        <aside className="detail-side">
          <div className="panel dl">
            <h3>
              <FileDown /> Download
            </h3>
            <div className="power" aria-label={`Nível de poder ${power} de 100`}>
              <div className="power-top">
                <span>Nível de poder</span>
                <b>{power}/100</b>
              </div>
              <div className="power-track">
                <div className="power-fill" style={{ width: `${power}%` }} />
              </div>
            </div>
            <p>
              Arquivo externo hospedado pelo criador. O CursedRock verifica o link antes de liberar.
            </p>
            <DownloadButton addon={addon} />
            <dl style={{ margin: '14px 0 0' }}>
              <div className="kv">
                <dt>Versão</dt>
                <dd>v{addon.version}</dd>
              </div>
              <div className="kv">
                <dt>Tamanho</dt>
                <dd>{addon.fileSize ?? '—'}</dd>
              </div>
              <div className="kv">
                <dt>Downloads</dt>
                <dd>{formatDownloads(addon.downloads)}</dd>
              </div>
            </dl>
          </div>

          <div className="panel">
            <h3>
              <Cpu /> Compatibilidade
            </h3>
            <dl style={{ margin: 0 }}>
              <div className="kv">
                <dt>Minecraft</dt>
                <dd>{addon.minecraft_versions.join(', ')}</dd>
              </div>
              <div className="kv">
                <dt>Categoria</dt>
                <dd>{category?.name}</dd>
              </div>
              <div className="kv">
                <dt>Publicado em</dt>
                <dd>{formatDate(addon.createdAt)}</dd>
              </div>
              <div className="kv">
                <dt>Atualizado em</dt>
                <dd>{formatDate(addon.updatedAt)}</dd>
              </div>
            </dl>
            {addon.requirements && (
              <div style={{ marginTop: 12 }}>
                {addon.requirements.map((r) => (
                  <span key={r} className="tag" style={{ marginRight: 6, marginBottom: 6, display: 'inline-block' }}>
                    <Tag size={11} style={{ display: 'inline', verticalAlign: -1 }} /> {r}
                  </span>
                ))}
              </div>
            )}
          </div>

          {creator && (
            <div className="panel">
              <h3>
                <User /> Criador
              </h3>
              <Link to={`/creator/${creator.id}`} className="creator-seal">
                <span
                  className="avatar"
                  style={{
                    background: `hsl(${creator.avatarHue} 38% 24%)`,
                  }}
                >
                  {creator.name.slice(0, 2).toUpperCase()}
                </span>
                <span>
                  <b>
                    {creator.name}
                    {creator.verified && <BadgeCheck aria-label="Verificado" />}
                  </b>
                  <br />
                  <small>
                    {creatorCount} addon{creatorCount === 1 ? '' : 's'} • ver perfil →
                  </small>
                </span>
              </Link>
            </div>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <SectionHeader eyebrow="Continue descendo" title="Addons relacionados" />
          <AddonGrid addons={related} favorites={favorites} onToggleFavorite={onToggleFavorite} />
        </section>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)} role="dialog" aria-modal="true" aria-label="Screenshot ampliada">
          <button className="lightbox-close" onClick={() => setLightbox(null)} aria-label="Fechar">
            <X size={18} />
          </button>
          <img src={lightbox} alt={`${addon.name} ampliado`} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
