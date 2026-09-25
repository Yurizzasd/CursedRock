import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, Calendar, Download, Globe, MapPin } from 'lucide-react';
import { AddonGrid } from '../components/AddonCard';
import { CreatorCard } from '../components/CategoryCreator';
import { Reveal, SectionHeader } from '../components/chrome';
import { getAddonsByCreator, getAllCreators, getCreatorById } from '../data/repository';
import { formatDate, formatDownloads, formatNumber } from '../utils/format';
import { useDocumentTitle } from '../hooks/hooks';
import { NotFound } from './NotFound';

function SocialIcon({ kind }: { kind: string }) {
  if (kind === 'website') return <Globe size={16} />;
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{kind.slice(0, 2).toUpperCase()}</span>;
}

export function Creators() {
  useDocumentTitle('Criadores — CursedRock', 'Conheça os criadores de addons para Minecraft Bedrock.');
  const creators = useMemo(() => getAllCreators(), []);
  return (
    <div className="container page">
      <span className="eyebrow">Comunidade</span>
      <h1 className="page-title">Criadores</h1>
      <p className="page-sub">
        Quem forja o underground. Siga, favorite e baixe direto de quem cria.
      </p>
      <Reveal className="creator-grid">
        {creators.map((c) => (
          <CreatorCard key={c.id} creator={c} />
        ))}
      </Reveal>
    </div>
  );
}

export function CreatorDetail({
  favorites,
  onToggleFavorite,
}: {
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}) {
  const { slug } = useParams();
  const creator = slug ? getCreatorById(slug) : undefined;

  useDocumentTitle(
    creator ? `${creator.name} — Criador | CursedRock` : 'Criador não encontrado — CursedRock',
    creator?.bio,
  );

  const addons = useMemo(() => (creator ? getAddonsByCreator(creator.id) : []), [creator]);
  const popular = useMemo(() => [...addons].sort((a, b) => b.downloads - a.downloads).slice(0, 4), [addons]);
  const totalDl = addons.reduce((s, a) => s + a.downloads, 0);

  if (!creator) return <NotFound />;

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Trilha">
        <Link to="/">Home</Link> / <Link to="/creators">Criadores</Link> / <span>{creator.name}</span>
      </nav>

      <div className="creator-hero">
        <span
          className="avatar"
          style={{ background: `linear-gradient(145deg, hsl(${creator.avatarHue} 45% 32%), hsl(${creator.avatarHue} 55% 16%))` }}
        >
          {creator.name.slice(0, 2).toUpperCase()}
        </span>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ fontSize: 'clamp(24px, 3.4vw, 34px)', display: 'flex', alignItems: 'center', gap: 10 }}>
            {creator.name}
            {creator.verified && <BadgeCheck style={{ color: 'var(--red-bright)' }} aria-label="Verificado" />}
          </h1>
          <p style={{ color: 'var(--muted)', margin: '8px 0 0', maxWidth: 600 }}>{creator.bio}</p>
          <div className="stat-row">
            <span className="stat-pill">
              <Download size={13} /> {formatDownloads(totalDl)} downloads
            </span>
            <span className="stat-pill">
              <Calendar size={13} /> desde {formatDate(creator.joinedAt)}
            </span>
            {creator.location && (
              <span className="stat-pill">
                <MapPin size={13} /> {creator.location}
              </span>
            )}
          </div>
          <div className="socials">
            {Object.entries(creator.socials).map(([kind, url]) =>
              url ? (
                <a key={kind} href={url} target="_blank" rel="noopener noreferrer" aria-label={`${creator.name} no ${kind}`}>
                  <SocialIcon kind={kind} />
                </a>
              ) : null,
            )}
          </div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 110 }}>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 34, display: 'block' }}>{addons.length}</b>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            addons
          </span>
        </div>
      </div>

      {popular.length > 0 && (
        <section>
          <SectionHeader eyebrow="Mais baixados" title={`Popular de ${creator.name}`} />
          <AddonGrid addons={popular} favorites={favorites} onToggleFavorite={onToggleFavorite} />
        </section>
      )}

      <section style={{ marginTop: 34 }}>
        <SectionHeader
          eyebrow="Catálogo completo"
          title={`Todos os addons (${formatNumber(addons.length)})`}
        />
        <AddonGrid addons={addons} favorites={favorites} onToggleFavorite={onToggleFavorite} />
      </section>
    </div>
  );
}
