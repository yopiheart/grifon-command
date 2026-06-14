import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, Loader2, Share2, ArrowRight } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import { FOUNDING_OFFER } from '../config/foundingOffer';

type Props = {
  onContinue: () => void;
  /** Buyer's email — printed on the membership card (real data only). */
  email?: string | null;
};

/**
 * Post-payment success: the ceremony moment. A shareable Founding Creator card
 * (real plan / date / email / founding-seat claim — no invented member numbers),
 * pointer tilt on desktop, native share via html2canvas (already a dependency).
 * The activation CTA sends the buyer straight to their first ad.
 */
const BillingSuccess: React.FC<Props> = ({ onContinue, email }) => {
  const { plan_id, status, loading } = useSubscription();
  const activated = !loading && status === 'active' && plan_id !== 'free';
  const reduceMotion = useReducedMotion();

  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [sharing, setSharing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Strip query string so refresh doesn't re-enter this screen forever.
    if (window.history.replaceState) {
      window.history.replaceState({}, '', '/billing/success');
    }
  }, []);

  const handleTilt = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -10, y: px * 12 });
  };

  const handleShare = async () => {
    if (!cardRef.current || sharing) return;
    setSharing(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      await document.fonts.ready; // exact mono metrics before measuring text
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#09090B',
        scale: 3,
        // html2canvas draws text a touch lower than the browser inside
        // overflow-hidden boxes, so `truncate` lines come out half-clipped in
        // the PNG. Un-clip them in the capture clone only (screen unaffected).
        onclone: (doc) => {
          doc.querySelectorAll('.truncate').forEach((el) => {
            el.classList.remove('truncate');
            (el as HTMLElement).style.overflow = 'visible';
            (el as HTMLElement).style.whiteSpace = 'nowrap';
          });
          // html2canvas paints this text run ~7px lower than the browser does
          // (NOT an italic/font-loading issue — measured via card-repro harness,
          // 2026-06-13: -7px nudge → -0.2px residual). Clone-only correction.
          const wm = doc.querySelector('[data-capture-nudge]') as HTMLElement | null;
          if (wm) {
            wm.style.position = 'relative';
            wm.style.top = '-7px';
          }
        },
      });
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;
      const file = new File([blob], 'grifon-founding-creator.png', { type: 'image/png' });

      // Native share sheet — touch devices only. Desktop Chrome reports
      // canShare=true but the html2canvas render outlives the click's user
      // activation (~5s), so share() rejects with NotAllowedError and the
      // sheet never opens. Desktop goes straight to download instead.
      const canNativeShare =
        navigator.maxTouchPoints > 0 &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });
      if (canNativeShare) {
        try {
          await navigator.share({
            files: [file],
            text: 'Officially in. My ads are now made by Grifon. 🦅',
          });
          return; // shared successfully
        } catch (err) {
          // User dismissed the sheet → done. Any other error → download instead.
          if (err instanceof DOMException && err.name === 'AbortError') return;
        }
      }

      // Desktop / no-share fallback: download the PNG. The anchor MUST be in the
      // DOM before click() or Firefox silently ignores it.
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'grifon-founding-creator.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch {
      /* card render failed — nothing to recover */
    } finally {
      setSharing(false);
    }
  };

  const planLabel = (plan_id ?? 'creator').toUpperCase();
  const founding = FOUNDING_OFFER.enabled;
  const estDate = new Date().toLocaleDateString('en-PH', { month: 'short', year: 'numeric' }).toUpperCase();

  if (!activated) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans flex items-center justify-center p-6">
        <GlassPanel className="w-full max-w-md p-10 text-center">
          <div className="mx-auto mb-6 w-14 h-14 rounded-full bg-[#FFCC00]/10 border border-[#FFCC00]/30 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-[#FFCC00] animate-spin" />
          </div>
          <p className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-[0.25em] mb-3">// ACTIVATING</p>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-3">Activating your plan…</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            This usually takes a few seconds. Hang tight — we're waiting for PayMongo to confirm.
          </p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col items-center justify-center p-5 relative overflow-hidden">
      {/* Gold ambience behind the ceremony */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(#FFCC00 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-[#FFCC00]/10 blur-[120px]" />
      </div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-md flex flex-col items-center text-center"
      >
        {/* Confirmation badge */}
        <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FFCC00]/30 bg-[#FFCC00]/10 text-[10px] font-mono text-[#FFCC00] uppercase tracking-[0.25em] mb-6">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          Payment confirmed{founding ? ' — Founding Creator' : ''}
        </p>

        <h1 className="text-5xl sm:text-6xl font-black uppercase tracking-tighter leading-none mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">You're</span>{' '}
          <span className="font-serif italic normal-case tracking-normal text-[#FFCC00]">in.</span>
        </h1>

        <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-8 max-w-sm">
          Walang agency. Walang freelancer.{' '}
          <span className="text-white font-bold">Ikaw na ang studio.</span>
        </p>

        {/* THE CARD — shareable artifact, real data only */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.9, rotateX: 18 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          style={{ perspective: 800 }}
          className="w-full mb-3"
        >
          <div
            ref={cardRef}
            onPointerMove={handleTilt}
            onPointerLeave={() => setTilt({ x: 0, y: 0 })}
            style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
            className="relative mx-auto w-full max-w-[360px] aspect-[1.6/1] rounded-2xl border border-[#FFCC00]/40 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 p-5 text-left transition-transform duration-150 ease-out shadow-[0_0_45px_rgba(255,204,0,0.25)] overflow-hidden"
          >
            {/* Foil sheen */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#FFCC00]/[0.07] to-transparent" aria-hidden="true" />
            {/* logo.png is 745×997 — explicit true-aspect dims everywhere in this
                card: html2canvas ignores object-fit and stretches the bitmap to
                fill the box, fattening the griffin in the captured PNG. */}
            <div className="absolute -right-8 -bottom-10 opacity-[0.08]" aria-hidden="true">
              <img src="/logo.png" alt="" className="h-44 w-[132px]" />
            </div>

            <div className="relative h-full flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="" width={18} height={24} className="h-6 w-[18px]" />
                  <span data-capture-nudge className="font-bold text-sm tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-400">GRIFON</span>
                </div>
                <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-[#FFCC00]">
                  {founding ? 'Founding Creator' : 'Creator'}
                </span>
              </div>

              <div>
                <p className="text-[8px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-1">Plan</p>
                <p className="text-2xl font-black uppercase tracking-tighter text-white leading-none">
                  {planLabel}
                </p>
                {founding && (
                  <p className="text-[8px] font-mono uppercase tracking-[0.25em] text-[#FFCC00] mt-1.5">
                    Founding seat — 1 of {FOUNDING_OFFER.seatCap}
                  </p>
                )}
              </div>

              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[8px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-0.5">Member</p>
                  <p className="text-[10px] font-mono text-zinc-300 truncate">{email ?? '—'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[8px] font-mono uppercase tracking-[0.3em] text-zinc-500 mb-0.5">Est.</p>
                  <p className="text-[10px] font-mono text-[#FFCC00]">{estDate}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-zinc-600 mb-8 hidden lg:block">
          Move cursor to tilt
        </p>

        {/* Activation first, bragging second */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="w-full flex flex-col gap-3 mt-4 lg:mt-0"
        >
          <GoldButton onClick={onContinue} className="w-full justify-center py-4 text-sm">
            <span className="inline-flex items-center justify-center gap-2.5">
              CREATE MY FIRST AD
              <ArrowRight className="w-4 h-4 shrink-0" />
            </span>
          </GoldButton>
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full bg-zinc-950 border border-white/15 text-zinc-300 text-xs font-bold uppercase tracking-widest hover:border-[#FFCC00] hover:text-white transition-all disabled:opacity-50"
          >
            <Share2 className="w-4 h-4 shrink-0" />
            {sharing ? 'Preparing card…' : saved ? 'Card saved — check Downloads' : 'Share my card'}
          </button>
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 mt-1">
            // Your first ad in 30 minutes — starting now
          </p>
          {email && (
            <p className="text-[10px] text-zinc-600">Receipt sent to {email}</p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default BillingSuccess;
