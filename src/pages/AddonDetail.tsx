import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BadgeCheck, Calendar, Check, ChevronLeft, ChevronRight, Cpu, Download, FileDown, Gamepad2, Info, Layers, Play, Star, Tag, User, X,
} from 'lucide-react';
import type { AddonFile, AddonVideo } from '../types';
import { AddonGrid } from '../components/AddonCard';
import { Reveal, ScrollProgress, SectionHeader } from '../components/chrome';
import { DownloadButton } from '../components/DownloadFavorite';
import { getAddonById, getAddonsByCreator, getCategoryById, getCreatorById, getRelatedAddons } from '../data/repository';
import { formatDate, formatDownloads, formatNumber, timeAgo } from '../utils/format';
import { useDocumentTitle } from '../hooks/hooks';
import { NotFound } from './NotFound';

function plin() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const t = ctx.currentTime;
    [[880, 0], [1318.5, 0.09]].forEach(([f, dt]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.16, t + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.5);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t + dt);
      o.stop(t + dt + 0.55);
    });
    window.setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    /* áudio indisponível — segue silencioso */
  }
}

function CreditModal({ addonName, creatorName, channelUrl }: { addonName: string; creatorName: string; channelUrl: string }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    plin();
  }, []);
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Aviso de crédito">
      <div className="modal credit-pop">
        <div className="modal-icon">
          <BadgeCheck />
        </div>
        <h3>Antes de continuar</h3>
        <p>
          <strong>{addonName}</strong> — como qualquer addon aqui — <strong>não é de posse da
          CursedRock</strong>. Ele foi criado por <strong>{creatorName}</strong>.
        </p>
        <p className="credit-note">
          “Vai até o criador dar uma moral ao trabalho incrível dele.” — CursedRock
        </p>
        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          <a className="btn btn-primary" href={channelUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} style={{ width: '100%' }}>
            Visitar canal de {creatorName}
          </a>
          <button className="btn btn-ghost" onClick={() => setOpen(false)} style={{ width: '100%' }}>
            Entendi, ir para o addon
          </button>
        </div>
      </div>
    </div>
  );
}

function VersionPicker({  files,
  render,
}: {
  files: AddonFile[];
  render: (file: AddonFile) => React.ReactNode;
}) {  const [sel, setSel] = useState(0);
  const file = files[Math.min(sel, files.length - 1)];
  return (
    <div>
      <div className="verpick" role="group" aria-label="Escolher versão">
        {files.map((f, i) => (
          <button
            key={f.label}
            className={`veropt${i === sel ? ' active' : ''}`}
            onClick={() => setSel(i)}
            aria-pressed={i === sel}
          >
            <b>{f.label}</b>
            <span>
              v{f.version} • {f.minecraft_versions.join(', ')}
              {f.fileSize ? ` • ${f.fileSize}` : ''}
            </span>
          </button>
        ))}
      </div>
      {render(file)}
    </div>
  );
}

export function AddonDetail() {
  const { slug } = useParams();
  const addon = slug ? getAddonById(slug) : undefined;
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const showCredit = Boolean(addon?.credit);
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
  const gallery = addon.screenshots.length > 0 ? addon.screenshots : [addon.thumbnail];

  const scrollRail = (dir: 1 | -1) => {
    railRef.current?.scrollBy({ left: dir * 420, behavior: 'smooth' });
  };

  return (
    <div className="container page">
      <ScrollProgress />
      {showCredit && addon.credit && (
        <CreditModal
          addonName={addon.name}
          creatorName={creator?.name ?? addon.authorDisplay ?? addon.author}
          channelUrl={addon.credit.channelUrl}
        />
      )}
      <nav className="breadcrumb" aria-label="Trilha">
        <Link to="/">Home</Link> / <Link to="/addons">Addons</Link> /{' '}
        <span>{category?.name ?? addon.category}</span> / <span>{addon.name}</span>
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
              por <strong>{creator?.name ?? addon.authorDisplay ?? addon.author}</strong>{' '}
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
                <Link key={t} to={`/addons?q=${encodeURIComponent(t)}`} className="tag">
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

          {addon.videos && addon.videos.length > 0 && (
            <section className="panel" style={{ marginTop: 16 }} aria-labelledby="videos">
              <h2 id="videos">
                <Play /> Vídeos
              </h2>
              <div className="video-grid">
                {addon.videos.map((v: AddonVideo) => (
                  <div key={v.youtubeId} className="video-card">
                    {playing === v.youtubeId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${v.youtubeId}?autoplay=1&rel=0`}
                        title={v.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <button onClick={() => setPlaying(v.youtubeId)} aria-label={`Assistir ${v.title}`}>
                        <img
                          src={`https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`}
                          alt={v.title}
                          loading="lazy"
                        />
                        <span className="video-play">
                          <Play />
                        </span>
                        <span className="video-title">{v.title}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

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
            {addon.files && addon.files.length > 1 ? (
              <VersionPicker
                files={addon.files}
                render={(file) => (
                  <>
                    <DownloadButton addon={{ ...addon, version: file.version, fileSize: file.fileSize, download_url: file.download_url, minecraft_versions: file.minecraft_versions }} />
                    <dl style={{ margin: '14px 0 0' }}>
                      <div className="kv">
                        <dt>Versão</dt>
                        <dd>v{file.version}</dd>
                      </div>
                      <div className="kv">
                        <dt>Minecraft</dt>
                        <dd>{file.minecraft_versions.join(', ')}</dd>
                      </div>
                      <div className="kv">
                        <dt>Tamanho</dt>
                        <dd>{file.fileSize ?? '—'}</dd>
                      </div>
                      <div className="kv">
                        <dt>Downloads</dt>
                        <dd>{formatDownloads(addon.downloads)}</dd>
                      </div>
                    </dl>
                  </>
                )}
              />
            ) : (
              <>
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
              </>
            )}
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
              <div className="creator-seal">
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
                    {creatorCount} addon{creatorCount === 1 ? '' : 's'} no catálogo
                  </small>
                </span>
              </div>
            </div>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <SectionHeader eyebrow="Continue descendo" title="Addons relacionados" />
          <AddonGrid addons={related} />
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
