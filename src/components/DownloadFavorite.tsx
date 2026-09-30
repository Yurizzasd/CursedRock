import { useEffect, useState } from 'react';
import { BookOpenCheck, Check, Download, Loader2, ShieldCheck, X } from 'lucide-react';
import type { Addon } from '../types';

type Phase = 'steps' | 'ready';

const STEP_LABELS = ['Preparing download…', 'Checking addon…', 'Ready!'];

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

  return createPortal(
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
        {addon.guide?.image && phase === 'steps' && (
          <img
            src={addon.guide.image}
            alt={`Como instalar ${addon.name}`}
            className="guide-img"
            loading="lazy"
          />
        )}
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
    </div>,
    document.body,
  );
}

export function DownloadButton({ addon, big = false }: { addon: Addon; big?: boolean }) {
  const [stage, setStage] = useState<'idle' | 'guide' | 'download'>('idle');
  return (
    <>
      <button
        className={`btn btn-primary${big ? ' btn-lg' : ''}`}
        onClick={() => setStage(addon.guide ? 'guide' : 'download')}
      >
        <Download size={big ? 18 : 16} /> Download addon
      </button>
      {stage === 'guide' && addon.guide && (
        <GuideModal addon={addon} onClose={() => setStage('idle')} onConfirm={() => setStage('download')} />
      )}
      {stage === 'download' && <DownloadModal addon={addon} onClose={() => setStage('idle')} />}
    </>
  );
}

function GuideModal({ addon, onClose, onConfirm }: { addon: Addon; onClose: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const steps = [
    'Baixe o arquivo (.mcaddon / .mcpack) pelo botão de download',
    'Abra o arquivo — o Minecraft importa o pacote sozinho',
    'No seu mundo, ative o pacote em Comportamento e em Recursos',
    'Ligue as alternâncias experimentais (Beta APIs) nas configurações do mundo',
    'Entre no mundo e confirme que o conteúdo apareceu',
  ];

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Como instalar ${addon.name}`}>
      <div className="modal modal-guide" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose} aria-label="Fechar" style={{ position: 'absolute' }}>
          <X size={18} />
        </button>
        {addon.guide?.image ? (
          <>
            <img
              src={addon.guide.image}
              alt="Onde ativar os experimentos no Minecraft"
              className="guide-img"
              style={{ marginTop: 10 }}
            />
            <button className="btn btn-primary btn-lg" onClick={onConfirm} style={{ width: '100%' }}>
              <Download size={17} /> Baixar agora
            </button>
          </>
        ) : (
          <>
            <div className="modal-icon">
              <BookOpenCheck />
            </div>
            <h3>Como instalar</h3>
            <p>
              {addon.name} v{addon.version} • Minecraft {addon.minecraft_versions.join(', ')}
            </p>
            <ol className="guide-steps">
              {steps.map((s, i) => (
                <li key={i}>
                  <span className="guide-num">{i + 1}</span> {s}
                </li>
              ))}
            </ol>
            {addon.requirements && addon.requirements.length > 0 && (
              <div className="tag-list" style={{ justifyContent: 'center', marginBottom: 18 }}>
                {addon.requirements.map((r) => (
                  <span key={r} className="tag">
                    {r}
                  </span>
                ))}
              </div>
            )}
            <button className="btn btn-primary btn-lg" onClick={onConfirm} style={{ width: '100%' }}>
              <Download size={17} /> Entendi, baixar agora
            </button>
            <button className="btn btn-ghost" onClick={onClose} style={{ width: '100%', marginTop: 8 }}>
              Voltar
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
