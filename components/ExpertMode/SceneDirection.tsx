import React, { useRef, useState } from 'react';
import { Sparkles, User, Film, Package, Users, ChevronDown, ImageUp, X, Wand2, AlertTriangle } from 'lucide-react';
import { StepShell } from '../ui/StepShell';
import { StepFooter } from '../ui/StepFooter';
import { TitledCard } from '../ui/TitledCard';
import { TextArea } from '../ui/TextField';
import { compressImageForUpload } from '../../utils/imageCompression';
import type { ShotIntent, SceneDirection } from './types';
import type { SceneBeat } from '../../utils/scriptGuardrails';

// ===========================================================================
// Expert Mode — Scene Direction (slice 5a). Per scene: read-only script line +
// a shot-type selector (Auto / Talking avatar / B-roll / Product / Avatar+product)
// + an optional plain-language direction + an optional "anchor your own photo".
// Auto is the gold default. PRESENTATIONAL — owns no global state, runs no calls.
// Generation wiring lands in 5b.
// ===========================================================================

const SHOTS: { id: Exclude<ShotIntent, 'auto'>; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'talking-avatar', label: 'Talking avatar', Icon: User },
  { id: 'b-roll', label: 'B-roll', Icon: Film },
  { id: 'product-highlight', label: 'Product', Icon: Package },
  { id: 'avatar-product', label: 'Avatar + product', Icon: Users },
];

const ShotPill: React.FC<{
  active: boolean;
  onClick: () => void;
  Icon: React.FC<{ className?: string }>;
  label: React.ReactNode;
  className?: string;
}> = ({ active, onClick, Icon, label, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold uppercase tracking-wide transition-all ${
      active
        ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]'
        : 'border-white/10 text-zinc-400 hover:border-white/30 hover:text-white'
    } ${className}`}
  >
    <Icon className="h-3.5 w-3.5 shrink-0" /> {label}
  </button>
);

const SceneCard: React.FC<{
  index: number;
  beat?: SceneBeat;
  scriptLine: string;
  dir: SceneDirection;
  setDir: (d: SceneDirection) => void;
}> = ({ index, beat, scriptLine, dir, setDir }) => {
  const [open, setOpen] = useState(dir.shotIntent !== 'auto' || !!dir.description || !!dir.manualUploadUrl);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const pickPhoto = async (file: File) => {
    try {
      const c = await compressImageForUpload(file);
      setDir({ ...dir, manualUploadUrl: c.dataUrl });
    } catch { /* ignore */ }
  };

  return (
    <TitledCard className="!p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              {index + 1}. {beat?.label ?? `Scene ${index + 1}`}
            </p>
            <p className="text-sm text-zinc-200">{scriptLine || <span className="text-zinc-600">—</span>}</p>
          </div>
        </div>

        {/* Shot type — Auto (recommended) + the 4 explicit shots in a 2x2 grid. */}
        <div className="flex flex-col gap-2">
          <ShotPill
            active={dir.shotIntent === 'auto'}
            onClick={() => setDir({ ...dir, shotIntent: 'auto' })}
            Icon={Sparkles}
            label={
              <span className="flex items-center gap-2">
                Auto
                <span className="rounded-lg border border-[#FFCC00]/40 bg-[#FFCC00]/10 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-widest text-[#FFCC00]">RECOMMENDED</span>
              </span>
            }
          />
          <div className="grid grid-cols-2 gap-2">
            {SHOTS.map((s) => (
              <ShotPill
                key={s.id}
                active={dir.shotIntent === s.id}
                onClick={() => setDir({ ...dir, shotIntent: s.id })}
                Icon={s.Icon}
                label={s.label}
              />
            ))}
          </div>
        </div>

        {/* Optional direction + anchor (progressive disclosure). */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-zinc-500 transition-colors hover:text-[#FFCC00]"
        >
          <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          Direct this scene (optional)
        </button>

        {open && (
          <div className="flex flex-col gap-3 border-t border-white/5 pt-3">
            <TextArea
              rows={2}
              placeholder="Describe what happens in this scene — Taglish or English. The Director optimizes it; your character & product stay locked."
              value={dir.description}
              onChange={(e) => setDir({ ...dir, description: e.target.value })}
            />
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
              {dir.manualUploadUrl ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-white/10">
                  <img src={dir.manualUploadUrl} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setDir({ ...dir, manualUploadUrl: undefined })}
                    className="absolute right-0.5 top-0.5 rounded-full bg-zinc-950/80 p-0.5 text-zinc-300 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-zinc-950 px-3 text-xs font-bold uppercase tracking-wide text-zinc-400 transition-colors hover:border-[#FFCC00]/50 hover:text-white"
                >
                  <ImageUp className="h-3.5 w-3.5 shrink-0" /> Anchor your own photo
                </button>
              )}
              <span className="text-xs text-zinc-500">If AI can't nail it, use your exact photo for this scene.</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) pickPhoto(f); e.target.value = ''; }}
              />
            </div>
            {(dir.description.trim() || dir.manualUploadUrl) && (
              <p className="flex items-start gap-1.5 text-[10px] text-amber-500/80">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                This scene uses your exact input — it may look different from the AI-styled scenes.
              </p>
            )}
          </div>
        )}
      </div>
    </TitledCard>
  );
};

export const SceneDirectionScreen: React.FC<{
  lines: string[];
  beats: SceneBeat[];
  directions: SceneDirection[];
  setDirection: (i: number, d: SceneDirection) => void;
  onBack: () => void;
  onGenerate: () => void;
  generating?: boolean;
}> = ({ lines, beats, directions, setDirection, onBack, onGenerate, generating }) => (
  <StepShell
    sublabel="DIRECTOR'S CUT · SCENE DIRECTION"
    title={<>Direct Your Scenes</>}
    panelClassName="max-w-4xl mx-auto"
  >
    <p className="mb-5 text-sm text-zinc-400">
      Every scene defaults to <span className="text-[#FFCC00]">Auto</span> — the AI Director picks the
      highest-converting shot. Override any scene, or direct it in your own words.
    </p>
    <div className="flex flex-col gap-4">
      {lines.map((line, i) => (
        <SceneCard
          key={i}
          index={i}
          beat={beats[i]}
          scriptLine={line}
          dir={directions[i] ?? { shotIntent: 'auto', description: '' }}
          setDir={(d) => setDirection(i, d)}
        />
      ))}
    </div>

    <StepFooter
      onBack={onBack}
      backLabel="BACK"
      onNext={onGenerate}
      nextDisabled={generating}
      nextLabel={generating ? 'GENERATING…' : 'GENERATE ALL'}
      nextIcon={<Wand2 className="h-4 w-4" />}
    />
  </StepShell>
);

export default SceneDirectionScreen;
