import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, KeyRound, Loader2, Mail } from 'lucide-react';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import { GrifonMark } from './ui/GrifonMark';
import { DUR, EASE, SPRING, reducedMotion } from './ui/motionTokens';
import {
  redeemInvite,
  requestInvite,
  takeInviteFromUrl,
  WAITLIST_CONSENT_TEXT,
} from '../services/launchGate';

// ===========================================================================
// LAUNCH LOCK — the pre-launch curtain, shown IN PLACE OF the auth gateway.
//
// It is a door, not a wall: the marketing site stays open (App.tsx gates only
// login / app / checkout), so this is what a visitor meets the moment they try
// to sign in or sign up — and "back to the site" is always one click away.
//
// A sealed vault door in the Grifon world: zinc-950 canvas, a travelling gold
// searchlight, and one CHROME panel wearing the same gold HUD corners as the
// auth gateway it replaces (deliberate continuity — the screen a redeemed
// visitor lands on next should read as the same building).
//
// Two ways through, in priority order:
//   1. ACCESS CODE — matched server-side; on success the panel plays a short
//      unlock readout, then hands off to onUnlock().
//   2. REQUEST AN INVITE — waitlist capture that returns a REAL position in
//      line. Nothing on this screen is a fabricated number.
// ===========================================================================

interface LaunchLockProps {
  /** Called after a successful redemption + the unlock readout finishes. */
  onUnlock: () => void;
  /** Back to the (still fully open) marketing site. */
  onBackToSite: () => void;
  onNavigateLegal: (route: 'terms' | 'privacy') => void;
}

type CodeState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'rejected'; message: string }
  | { phase: 'granted' };

type ListState =
  | { phase: 'idle' }
  | { phase: 'sending' }
  | { phase: 'failed'; message: string }
  | { phase: 'joined'; email: string; position: number | null };

const REDEEM_MESSAGES: Record<string, string> = {
  invalid_code: "That code isn't on the list. Check the link in your invite.",
  rate_limited: 'Too many tries. Give it a minute, then try again.',
  gate_not_configured: 'The door is jammed on our side. Request an invite below and we will open it for you.',
  network: "Couldn't reach Grifon. Check your connection and try again.",
  unknown: 'Something went wrong. Try again in a moment.',
};

const WAITLIST_MESSAGES: Record<string, string> = {
  invalid_email: "That email doesn't look right.",
  rate_limited: 'Too many requests from this connection. Try again in a few minutes.',
  waitlist_unavailable: 'The list is offline right now. Email us at hello@grifon.ai and we will add you by hand.',
  network: "Couldn't reach Grifon. Check your connection and try again.",
  unknown: 'Something went wrong. Try again in a moment.',
};

/** Mono meta-label — the `//` control-panel register from DESIGN.md. */
const MetaLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <span className={`text-[10px] font-mono uppercase tracking-[0.25em] text-on-surface-sublabel ${className}`}>
    {children}
  </span>
);

const LaunchLock: React.FC<LaunchLockProps> = ({ onUnlock, onBackToSite, onNavigateLegal }) => {
  const reduce = useReducedMotion();

  const [code, setCode] = useState('');
  const [codeState, setCodeState] = useState<CodeState>({ phase: 'idle' });
  const [email, setEmail] = useState('');
  const [listState, setListState] = useState<ListState>({ phase: 'idle' });

  // One shake per rejection — keyed so a repeat rejection re-fires the animation.
  const [shakeKey, setShakeKey] = useState(0);
  const unlockTimer = useRef<number | null>(null);

  const grantAccess = () => {
    setCodeState({ phase: 'granted' });
    // Let the readout land before the handoff. Reduced motion skips the beat.
    unlockTimer.current = window.setTimeout(onUnlock, reduce ? 0 : 1600);
  };

  const submitCode = async (raw: string) => {
    const candidate = raw.trim();
    if (!candidate || codeState.phase === 'checking' || codeState.phase === 'granted') return;
    setCodeState({ phase: 'checking' });
    const result = await redeemInvite(candidate);
    if (result.ok) {
      grantAccess();
      return;
    }
    setShakeKey((k) => k + 1);
    setCodeState({ phase: 'rejected', message: REDEEM_MESSAGES[result.error] ?? REDEEM_MESSAGES.unknown });
  };

  // An invite link (?invite=CODE or /i/CODE) redeems itself on arrival — the
  // invited visitor should never have to retype what the link already carried.
  useEffect(() => {
    const fromUrl = takeInviteFromUrl();
    if (!fromUrl) return;
    setCode(fromUrl);
    void submitCode(fromUrl);
    // Mount-only: the URL has already been scrubbed by takeInviteFromUrl().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (unlockTimer.current) window.clearTimeout(unlockTimer.current);
  }, []);

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (listState.phase === 'sending') return;
    setListState({ phase: 'sending' });
    const result = await requestInvite(email);
    if (result.ok) {
      setListState({ phase: 'joined', email: email.trim().toLowerCase(), position: result.position });
      return;
    }
    setListState({ phase: 'failed', message: WAITLIST_MESSAGES[result.error] ?? WAITLIST_MESSAGES.unknown });
  };

  const checking = codeState.phase === 'checking';
  const granted = codeState.phase === 'granted';
  const rejected = codeState.phase === 'rejected';

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-zinc-950 font-sans flex flex-col">
      {/* ---------------------------------------------------------------
          BACKDROP — the same cinematic stack as the auth gateway, one stop
          quieter, plus a searchlight that sweeps the sealed door.
          --------------------------------------------------------------- */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        {/* Primary gold glow — top-right, stationary */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 55% 45% at 82% 16%, rgba(255,204,0,0.17), transparent 65%)',
          }}
        />
        {/* Secondary gold glow — bottom-left, slow breathe */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 48% 38% at 14% 88%, rgba(255,204,0,0.12), transparent 65%)',
          }}
          animate={reduce ? undefined : { opacity: [0.55, 1, 0.55] }}
          transition={reducedMotion(reduce, {
            duration: DUR.ambient.breathe * 1.5,
            ease: EASE.inOut,
            repeat: Infinity,
          })}
        />
        {/* Searchlight — a wide raking beam that crosses the door. The one beat
            that says "someone is checking who you are" without a single word. */}
        <motion.div
          className="absolute -inset-y-1/2 w-[70%]"
          style={{
            background:
              'linear-gradient(100deg, transparent 0%, rgba(255,204,0,0.05) 42%, rgba(255,204,0,0.10) 50%, rgba(255,204,0,0.05) 58%, transparent 100%)',
            filter: 'blur(28px)',
          }}
          initial={{ x: '-60%' }}
          animate={reduce ? { x: '20%' } : { x: ['-60%', '150%'] }}
          transition={reducedMotion(reduce, {
            duration: DUR.ambient.slowDrift * 1.6,
            ease: EASE.inOut,
            repeat: Infinity,
            repeatType: 'reverse',
          })}
        />
        {/* Neural dot-grid */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(#FFCC00 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Scan lines — terminal/HUD signature */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            background:
              'repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)',
          }}
        />
        {/* Edge vignette — frames the panel */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/70 via-transparent to-zinc-950/85" />
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-10">
        {/* Wordmark */}
        <motion.div
          className="mb-5 flex items-center gap-2.5"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion(reduce, { duration: DUR.entrance, ease: EASE.expressive })}
        >
          <GrifonMark className="h-9 w-9 md:h-11 md:w-11" />
          <span className="text-xl md:text-2xl font-[900] italic uppercase tracking-tighter text-white">
            GRIFON
          </span>
        </motion.div>

        <motion.div
          key={shakeKey}
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 18 }}
          animate={
            rejected && !reduce
              ? { opacity: 1, y: 0, x: [0, -9, 8, -5, 0] }
              : { opacity: 1, y: 0, x: 0 }
          }
          transition={reducedMotion(reduce, rejected ? { duration: DUR.slow, ease: EASE.out } : SPRING.pop)}
        >
          {/* CHROME — this panel floats over a live searchlight, so it is one of
              the few surfaces in the app that genuinely earns the material. */}
          <GlassPanel tier="chrome" className="relative rounded-3xl p-6 md:p-8 overflow-hidden">
            {/* Gold HUD corners — the gateway's signature frame */}
            {[
              'top-0 left-0 w-3 h-px',
              'top-0 left-0 w-px h-3',
              'top-0 right-0 w-3 h-px',
              'top-0 right-0 w-px h-3',
              'bottom-0 left-0 w-3 h-px',
              'bottom-0 left-0 w-px h-3',
              'bottom-0 right-0 w-3 h-px',
              'bottom-0 right-0 w-px h-3',
            ].map((pos) => (
              <span
                key={pos}
                aria-hidden="true"
                className={`pointer-events-none absolute bg-[#FFCC00] transition-opacity duration-500 ${pos} ${
                  granted ? 'opacity-100' : 'opacity-60'
                }`}
              />
            ))}

            {granted ? (
              /* --- UNLOCK READOUT ------------------------------------- */
              <div className="py-8 text-center" role="status" aria-live="polite">
                <motion.div
                  className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#FFCC00]/40 bg-[#FFCC00]/10"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={reducedMotion(reduce, SPRING.overshoot)}
                >
                  <Check className="h-7 w-7 text-[#FFCC00]" strokeWidth={2.5} />
                </motion.div>
                <div className="space-y-1.5 font-mono text-[11px] uppercase tracking-[0.22em]">
                  <motion.p
                    className="text-[#FFCC00]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={reducedMotion(reduce, { duration: DUR.fast, delay: 0.15 })}
                  >
                    // ACCESS GRANTED
                  </motion.p>
                  <motion.p
                    className="text-on-surface-dim"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={reducedMotion(reduce, { duration: DUR.fast, delay: 0.75 })}
                  >
                    // OPENING GRIFON COMMAND
                    <span className="ml-1 inline-block h-3 w-1.5 translate-y-[1px] animate-pulse bg-[#FFCC00]" />
                  </motion.p>
                </div>
              </div>
            ) : (
              <>
                {/* --- STATUS STRIP ------------------------------------ */}
                <div className="mb-5 flex items-center justify-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFCC00] shadow-[0_0_6px_rgba(255,204,0,0.8)] animate-pulse"
                  />
                  <MetaLabel>// PRIVATE · FOUNDING COHORT</MetaLabel>
                </div>

                {/* --- HEADLINE ---------------------------------------- */}
                <h1 className="text-center text-[26px] leading-[1.05] md:text-[32px] font-bold uppercase tracking-tighter">
                  <span className="bg-gradient-to-b from-zinc-100 to-zinc-500 bg-clip-text text-transparent">
                    ACCOUNTS ARE{' '}
                  </span>
                  {/* nowrap: the hyphen is a legal break point, and letting it
                      break renders the accent word as "invite-" / "only" across
                      two lines — the one place in the headline that must read
                      as a single idea. */}
                  <span className="whitespace-nowrap font-serif italic normal-case tracking-normal text-[#FFCC00]">
                    invite-only
                  </span>
                  <span className="bg-gradient-to-b from-zinc-100 to-zinc-500 bg-clip-text text-transparent">
                    {' '}RIGHT NOW.
                  </span>
                </h1>

                <p className="mt-3 text-center text-sm leading-relaxed text-on-surface-dim">
                  We are opening seats to founding operators a few at a time, so every ad that ships
                  is one we can stand behind. Enter your access code, or get in line.
                </p>

                {/* --- ACCESS CODE ------------------------------------- */}
                <form
                  className="mt-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitCode(code);
                  }}
                >
                  <label htmlFor="grifon-invite-code" className="mb-2 block">
                    <MetaLabel>// ACCESS CODE</MetaLabel>
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="grifon-invite-code"
                      name="invite-code"
                      type="text"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      value={code}
                      disabled={checking}
                      onChange={(e) => {
                        setCode(e.target.value.toUpperCase());
                        if (rejected) setCodeState({ phase: 'idle' });
                      }}
                      placeholder="GRIFON-XXXX"
                      aria-invalid={rejected}
                      aria-describedby={rejected ? 'grifon-invite-error' : undefined}
                      className={`h-12 w-full rounded-xl border bg-zinc-950 px-4 text-center text-sm uppercase tracking-[0.3em] text-white placeholder:tracking-[0.2em] placeholder:text-on-surface-sublabel focus:outline-none focus:ring-1 disabled:opacity-60 ${
                        rejected
                          ? 'border-amber-500/70 focus:border-amber-500 focus:ring-amber-500'
                          : 'border-white/10 focus:border-[#FFCC00] focus:ring-[#FFCC00]'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={checking || !code.trim()}
                      aria-label="Unlock with access code"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-950 text-on-surface-dim transition-all hover:border-[#FFCC00] hover:text-[#FFCC00] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-on-surface-dim"
                    >
                      {checking ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <ArrowRight className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {rejected && (
                    <p
                      id="grifon-invite-error"
                      role="alert"
                      className="mt-2 flex items-start gap-1.5 text-xs text-amber-500"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="font-sans normal-case tracking-normal">{codeState.message}</span>
                    </p>
                  )}
                </form>

                {/* --- DIVIDER ----------------------------------------- */}
                <div className="my-6 flex items-center gap-3">
                  <span className="h-px flex-1 bg-white/10" />
                  <MetaLabel>// OR</MetaLabel>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                {/* --- WAITLIST ---------------------------------------- */}
                {listState.phase === 'joined' ? (
                  <motion.div
                    className="rounded-2xl border border-[#FFCC00]/25 bg-[#FFCC00]/[0.06] p-5 text-center"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={reducedMotion(reduce, SPRING.pop)}
                    role="status"
                    aria-live="polite"
                  >
                    <MetaLabel className="!text-[#FFCC00]">// YOU ARE ON THE LIST</MetaLabel>
                    {listState.position !== null && (
                      <p className="mt-2 font-mono text-4xl font-bold tracking-tight text-[#FFCC00]">
                        #{String(listState.position).padStart(3, '0')}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-on-surface-muted">
                      We will email <span className="text-white">{listState.email}</span> the moment a
                      seat opens. Your invite link unlocks this door on its own.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={submitEmail}>
                    <label htmlFor="grifon-invite-email" className="mb-2 block">
                      <MetaLabel>// REQUEST AN INVITE</MetaLabel>
                    </label>
                    <div className="relative">
                      <Mail
                        aria-hidden="true"
                        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-sublabel"
                      />
                      <input
                        id="grifon-invite-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        disabled={listState.phase === 'sending'}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (listState.phase === 'failed') setListState({ phase: 'idle' });
                        }}
                        placeholder="you@business.com"
                        className="h-12 w-full rounded-xl border border-white/10 bg-zinc-950 pl-11 pr-4 text-sm normal-case tracking-normal text-white placeholder:text-on-surface-sublabel focus:border-[#FFCC00] focus:outline-none focus:ring-1 focus:ring-[#FFCC00] disabled:opacity-60"
                      />
                    </div>

                    <GoldButton
                      glossy
                      type="submit"
                      disabled={listState.phase === 'sending'}
                      className="mt-3 w-full disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {listState.phase === 'sending' ? 'SENDING...' : 'REQUEST AN INVITE'}
                    </GoldButton>

                    {listState.phase === 'failed' && (
                      <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-amber-500">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="font-sans normal-case tracking-normal">{listState.message}</span>
                      </p>
                    )}

                    {/* Consent line — the VERBATIM text api/gate.ts stamps onto
                        the lead row. One constant, never two drifting copies. */}
                    <p className="mt-3 text-center text-[11px] leading-relaxed text-on-surface-sublabel">
                      {WAITLIST_CONSENT_TEXT}
                    </p>
                  </form>
                )}
              </>
            )}
          </GlassPanel>
        </motion.div>

        {/* --- FOOTER --------------------------------------------------- */}
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          {/* The site itself is still open — never strand a visitor at the door. */}
          <button
            type="button"
            onClick={onBackToSite}
            className="group flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-on-surface-dim transition-colors hover:text-[#FFCC00]"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back to grifon.ai
          </button>
          <p className="flex items-center gap-1.5">
            <KeyRound aria-hidden="true" className="h-3 w-3 text-on-surface-sublabel" />
            <MetaLabel>// GRIFON COMMAND · PRIVATE BETA</MetaLabel>
          </p>
          <p className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateLegal('terms')}
              className="text-[10px] font-mono uppercase tracking-[0.2em] text-on-surface-sublabel transition-colors hover:text-[#FFCC00]"
            >
              Terms
            </button>
            <span aria-hidden="true" className="h-2.5 w-px bg-white/10" />
            <button
              type="button"
              onClick={() => onNavigateLegal('privacy')}
              className="text-[10px] font-mono uppercase tracking-[0.2em] text-on-surface-sublabel transition-colors hover:text-[#FFCC00]"
            >
              Privacy
            </button>
          </p>
        </div>
      </main>
    </div>
  );
};

export default LaunchLock;
