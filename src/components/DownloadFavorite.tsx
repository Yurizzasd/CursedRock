import { useEffect, useState } from 'react';
import { Check, Download, Heart, Loader2, ShieldCheck, X } from 'lucide-react';
import type { Addon } from '../types';

type Phase = 'steps' | 'ready';

const STEP_LABELS = ['Preparing download…', 'Checking addon…', 'Ready!'];

export function FavoriteButton({
  active,
  onToggle,
  label,
}: {
  active: boolean;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <button className={`btn btn-ghost${active ? ' active' : ''}`} onClick={onToggle} aria-pressed={active}>
      <Heart size={16} style={active ? { fill: 'currentColor', color: 'var(--red-bright)' } : undefined} />
      {label ?? (active ? 'Favoritado' : 'Favoritar')}
    </button>
  );
}

export function DownloadModal({ addon, onClose }: { addon: Addon; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>('steps');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const timers = [
      setTimeout(() => setStep(1), 700),
      setTimeout(() => setStep(2), 1500),
      setTimeout(() => setPhase('ready'), 2100),
    ];
    return () => {
      document.body.style.overflow = '';
      timers.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const progress = phase === 'ready' ? 100 : [18, 55, 88][step];

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Download de ${addon.name}`}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose} aria-label="Fechar" style={{ position: 'absolute' }}>
          <X size={18} />
        </button>
        <div className={`modal-icon${phase === 'steps' ? ' spin' : ''}`}>
          {phase === 'steps' ? <Loader2 /> : <ShieldCheck />}
        </div>
        <h3>{phase === 'steps' ? STEP_LABELS[step] : 'Seu download está pronto'}</h3>
        <p>
          {addon.name} v{addon.version} • {addon.fileSize ?? '—'} • Verificado pelo CursedRock
        </p>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="dl-steps">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className={`dl-step${i < step || phase === 'ready' ? ' done' : i === step ? ' doing' : ''}`}>
              {i < step || phase === 'ready' ? <Check /> : <Loader2 size={15} />}
              {label}
            </div>
          ))}
        </div>
        {phase === 'ready' ? (
          <a className="btn btn-primary btn-lg" href={addon.download_url} target="_blank" rel="noopener noreferrer" style={{ width: '100%' }}>
            <Download size={17} /> Download agora
          </a>
        ) : (
          <button className="btn btn-ghost" onClick={onClose} style={{ width: '100%' }}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

export function DownloadButton({ addon, big = false }: { addon: Addon; big?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={`btn btn-primary${big ? ' btn-lg' : ''}`} onClick={() => setOpen(true)}>
        <Download size={big ? 18 : 16} /> Download addon
      </button>
      {open && <DownloadModal addon={addon} onClose={() => setOpen(false)} />}
    </>
  );
}
