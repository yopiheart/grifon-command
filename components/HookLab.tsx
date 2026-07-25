import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { EASE, DUR } from './ui/motionTokens';
import { ArrowLeft, Sparkles, RefreshCw, Check, Copy } from 'lucide-react';
import { getModuleIdentity } from '../config/moduleIdentity';

// The module's own icon, from the registry — this header used to hardcode
// Aperture, which belonged to Cinema Command.
const HookLabIcon = getModuleIdentity('hook_lab').icon;
import { toast } from 'sonner';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import GeneratedFrameTile from './ui/GeneratedFrameTile';
import type { BusinessInfo } from '../types';
import { generateSurrealHooks, generateHookFrame, type HookVariant } from '../services/hookLabService';
import { recordRecentWork } from '../services/recentWorkService';
import { startJob, endJob } from '../services/activeJobsService';

interface HookLabProps {
  businessInfo?: BusinessInfo;
  onBack: () => void;
}

type FrameState = { url?: string; busy?: boolean };

const labelCaps = 'text-[10px] text-on-surface-sublabel font-mono uppercase tracking-widest';

// Build a short context string from whatever the wizard already knows — keeps the
// hooks sharp without making the user retype what Market Research / Director captured.
const deriveContext = (b?: BusinessInfo): string => {
  if (!b) return '';
  return [b.audience && `Audience: ${b.audience}`, b.painPoint && `Pain: ${b.painPoint}`, b.benefit && `Benefit: ${b.benefit}`]
    .filter(Boolean)
    .join(' · ');
};

const HookLab: React.FC<HookLabProps> = ({ businessInfo, onBack }) => {
  const reduce = useReducedMotion();
  const [product, setProduct] = useState(businessInfo?.product ?? '');
  const [language, setLanguage] = useState<'Taglish' | 'English'>('Taglish');
  const [variants, setVariants] = useState<HookVariant[]>([]);
  const [frames, setFrames] = useState<Record<string, FrameState>>({});
  const [generating, setGenerating] = useState(false);
  const [usedId, setUsedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!product.trim()) {
      toast.error('Describe your product first');
      return;
    }
    setGenerating(true);
    setUsedId(null);
    const jobId = `hooklab:${Date.now()}`;
    startJob({ id: jobId, label: 'Conjuring surreal hooks…', kind: 'generic' });
    try {
      const next = await generateSurrealHooks({
        product: product.trim(),
        context: deriveContext(businessInfo),
        language,
      });
      setVariants(next);
      setFrames({});
      recordRecentWork({ id: 'hook_lab:generated', moduleId: 'hook_lab', title: 'Hook Lab', kind: 'script' });
    } catch (e: any) {
      toast.error('Hook generation failed', { description: (e?.message ?? 'Unknown error').slice(0, 120) });
    } finally {
      endJob(jobId);
      setGenerating(false);
    }
  };

  const handleRenderFrame = async (variant: HookVariant) => {
    setFrames((f) => ({ ...f, [variant.id]: { ...f[variant.id], busy: true } }));
    try {
      const url = await generateHookFrame(variant);
      setFrames((f) => ({ ...f, [variant.id]: { url, busy: false } }));
    } catch (e: any) {
      setFrames((f) => ({ ...f, [variant.id]: { ...f[variant.id], busy: false } }));
      toast.error('Frame render failed', { description: (e?.message ?? 'Unknown error').slice(0, 120) });
    }
  };

  const handleUseThis = async (variant: HookVariant) => {
    try {
      await navigator.clipboard?.writeText(variant.hookLine);
      toast.success('Hook line copied', { description: 'Paste it into your ad script.' });
    } catch {
      toast.success('Hook selected');
    }
    setUsedId(variant.id);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Dreamlike ambient wash — anchored surreal: motion + faint gold glow, never off-brand color. */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.07]"
        style={{ background: 'radial-gradient(60% 50% at 50% 0%, #FFCC00 0%, transparent 70%)' }}
        animate={reduce ? undefined : { scale: [1, 1.08, 1], opacity: [0.05, 0.09, 0.05] }}
        transition={{ duration: DUR.ambient.slowDrift, repeat: Infinity, ease: EASE.inOut }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 lg:px-8 py-8">
        <button onClick={onBack} className={`flex items-center gap-2 ${labelCaps} hover:text-white transition-colors mb-6`}>
          <ArrowLeft className="w-3.5 h-3.5 shrink-0" /> Back
        </button>

        <div className="flex items-center gap-3 mb-2">
          <HookLabIcon className="w-6 h-6 text-[#FFCC00] shrink-0" />
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">
            Hook Lab
          </h1>
        </div>
        <p className={`${labelCaps} mb-8`}>Surreal scroll-stoppers — win the first 1.5 seconds</p>

        {/* Input panel */}
        <GlassPanel className="p-5 lg:p-6 mb-8">
          <label className={`${labelCaps} block mb-2`}>What are we hooking?</label>
          <textarea
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            rows={2}
            placeholder="e.g. milk tea shop in Cebu, buy-1-take-1 promo"
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-on-surface-sublabel outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-colors resize-none"
          />
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
            <div className="flex items-center gap-2">
              <span className={labelCaps}>Voice</span>
              {(['Taglish', 'English'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                    language === lang
                      ? 'bg-[#FFCC00] text-black border-[#FFCC00]'
                      : 'bg-zinc-950 text-zinc-400 border-white/10 hover:border-[#FFCC00]'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
            <div className="sm:ml-auto w-full sm:w-auto">
              <GoldButton className="w-full sm:w-auto" onClick={handleGenerate} disabled={generating}>
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className={`w-4 h-4 shrink-0 ${generating ? 'animate-pulse' : ''}`} />
                  {generating ? 'Conjuring…' : 'Generate Hooks'}
                </span>
              </GoldButton>
            </div>
          </div>
        </GlassPanel>

        {/* Variant gallery */}
        {variants.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {variants.map((v, i) => {
              const frame = frames[v.id] ?? {};
              const isUsed = usedId === v.id;
              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DUR.slow, delay: i * 0.06 }}
                >
                  <motion.div
                    animate={reduce ? undefined : { y: [0, -5, 0] }}
                    transition={{ duration: 6 + i, repeat: Infinity, ease: EASE.inOut }}
                  >
                    <GeneratedFrameTile
                      className="aspect-[9/16]"
                      imageUrl={frame.url}
                      busy={frame.busy && Boolean(frame.url)}
                      label={`Hook ${i + 1}`}
                      loadingMessage={frame.busy ? 'CONJURING FRAME…' : ''}
                      emptyState={
                        !frame.busy ? (
                          <button
                            onClick={() => handleRenderFrame(v)}
                            className="w-full h-full flex flex-col items-center justify-center gap-2 text-on-surface-sublabel hover:text-[#FFCC00] transition-colors"
                          >
                            <HookLabIcon className="w-7 h-7 shrink-0" />
                            <span className="text-[10px] font-mono uppercase tracking-widest">Render Frame</span>
                          </button>
                        ) : undefined
                      }
                      actions={
                        frame.url
                          ? [
                              { icon: RefreshCw, label: 'Regenerate', onClick: () => handleRenderFrame(v), busy: frame.busy },
                              { icon: Check, label: isUsed ? 'Selected' : 'Use This', onClick: () => handleUseThis(v), primary: true },
                            ]
                          : []
                      }
                    />
                  </motion.div>

                  {/* Domain chrome (kept with the caller, per GeneratedFrameTile's contract) */}
                  <div className={`mt-3 rounded-xl border p-3 transition-colors ${isUsed ? 'border-[#FFCC00]/40 bg-[#FFCC00]/5' : 'border-white/10 bg-zinc-900/40'}`}>
                    <p className="text-sm font-semibold text-white leading-snug">{v.hookLine}</p>
                    {v.surrealConcept && <p className="text-xs text-on-surface-sublabel mt-1 leading-snug">{v.surrealConcept}</p>}
                    <button
                      onClick={() => handleUseThis(v)}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-[#FFCC00] transition-colors"
                    >
                      <Copy className="w-3 h-3 shrink-0" /> Copy hook line
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {variants.length === 0 && !generating && (
          <p className="text-center text-sm text-on-surface-sublabel mt-12">
            Describe your product and generate surreal hooks na sasalo sa scroll.
          </p>
        )}
      </div>
    </div>
  );
};

export default HookLab;
