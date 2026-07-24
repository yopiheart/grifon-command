import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Clapperboard } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { DUR, EASE, SPRING, reducedMotion } from './motionTokens';

/**
 * FILM LEADER — the post-login boot beat. Grifon is a studio; logging in is the
 * camera taking its first frame, so the studio's clapperboard snaps shut and the
 * marquee greets the operator by name. Replaces the old fake-terminal "[ OK ]
 * ESTABLISHING_NEURAL_LINK" sequence (which read gamer/cyberpunk, off the
 * Hollywood-studio register). The gold sweep is INDETERMINATE on purpose — the
 * parent dismisses this when the session is genuinely ready, so there is no fake
 * percentage or fake stage list pretending work that isn't happening.
 *
 * Animates via the shared motion tokens (components/ui/motionTokens.ts) and
 * honours prefers-reduced-motion (static clapper + static bar when reduced).
 */

const prettyName = (email?: string | null): string => {
  if (!email) return '';
  const local = email.split('@')[0]?.replace(/[._+-]+/g, ' ').trim() ?? '';
  if (!local) return '';
  return local
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
};

interface BootScreenProps {
  /** Used to greet the operator by name; falls back to a generic welcome. */
  userEmail?: string | null;
}

export const BootScreen: React.FC<BootScreenProps> = ({ userEmail }) => {
  const reduce = useReducedMotion();
  const name = prettyName(userEmail);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reducedMotion(reduce, SPRING.pop)}
      className="relative z-20 w-full max-w-md"
    >
      {/* The loading beat, told in the material's own physics: a light source
          crossing BEHIND the pane. Because the panel is CHROME, its backdrop
          filter samples this — the glass brightens and its rim lenses as the
          light passes, so the indicator is the surface reacting rather than a
          widget bolted onto it. Sibling before the panel so it paints first;
          decorative only, and it stops dead under reduced motion. */}
      {!reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-0 h-48 w-48 -translate-y-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,204,0,0.55), transparent 70%)',
            filter: 'blur(30px)',
          }}
          animate={{ x: ['-60%', '320%'] }}
          transition={{ duration: DUR.ambient.pulse, repeat: Infinity, ease: EASE.inOut }}
        />
      )}
      {/* CHROME — this panel floats over the gateway reel, same as the sign-in
          card it replaces during boot. */}
      <GlassPanel tier="chrome" className="relative p-10 rounded-3xl">
        {/* Clapperboard — top stick snaps shut on entrance. */}
        <div className="mx-auto mb-8 w-44">
          <div className="relative h-12 w-full">
            <motion.div
              aria-hidden
              initial={reduce ? undefined : { rotate: -12 }}
              animate={{ rotate: 0 }}
              transition={reducedMotion(reduce, { ...SPRING.overshoot, delay: 0.15 })}
              style={{
                transformOrigin: 'left center',
                background:
                  'repeating-linear-gradient(115deg, #FFCC00 0 16px, #09090B 16px 32px)',
              }}
              className="absolute inset-x-0 top-0 z-10 h-4 w-full rounded-sm"
            />
            <div className="absolute inset-x-0 bottom-0 top-4 flex items-center justify-center rounded-b-md border border-white/10 bg-zinc-950">
              <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-500">
                SCENE 01 · TAKE 1
              </span>
            </div>
          </div>
        </div>

        {/* Greeting — sentence-case, calm (matches the dashboard pilot register). */}
        <div className="text-center">
          <h2 className="!normal-case text-2xl font-bold tracking-tight text-white">
            {name ? (
              <>
                Welcome back, <span className="text-[#FFCC00]">{name}</span>.
              </>
            ) : (
              <>Welcome to the studio.</>
            )}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">Rolling your studio…</p>
        </div>

        {/* Indeterminate gold sweep — honest "working" indicator (no fake %). */}
        <div className="mt-8 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
          {reduce ? (
            <div className="h-full w-1/3 rounded-full bg-[#FFCC00]" />
          ) : (
            <motion.div
              className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#FFCC00]/0 via-[#FFCC00] to-[#FFCC00]/0"
              animate={{ x: ['-100%', '400%'] }}
              transition={{ duration: DUR.ambient.pulse, repeat: Infinity, ease: EASE.inOut }}
            />
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-zinc-600">
          <Clapperboard className="h-3.5 w-3.5 shrink-0 text-[#FFCC00]/70" />
          Grifon Studio
        </div>
      </GlassPanel>
    </motion.div>
  );
};
