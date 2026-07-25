import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform, useMotionValueEvent } from 'motion/react';
import { Star, ArrowRight, Building2, UtensilsCrossed, ShoppingBag, ChevronsRight } from 'lucide-react';
import { GoldButton } from '../../ui/GoldButton';
import { SignatureScribble } from '../SignatureScribble';
import { BAND } from '../../ui/layoutTokens';

interface ReceiptsRailProps {
  onEnterApp: () => void;
}

// REAL early-user quotes only — never invent reviews (CMO hard rule: fake
// social proof is unrecoverable). New beta quotes slot into this array.
const QUOTES = [
  {
    quote: (
      <>
        Gumawa ako ng{' '}
        <SignatureScribble variant="underline" strokeWidth={2.5} delay={0.15}>
          5 video ads
        </SignatureScribble>{' '}
        sa isang hapon. Before, 1 lang ginagawa ko per week.
      </>
    ),
    name: 'Mark R.',
    role: 'Online Seller, Cebu',
    result: '5 ADS · ONE AFTERNOON',
  },
  {
    quote: (
      <>
        Yung Market Research niya, mas detailed pa sa agency na{' '}
        <SignatureScribble variant="circle" strokeWidth={2.5} delay={0.15}>
          ₱30K/month
        </SignatureScribble>{' '}
        ko before.
      </>
    ),
    name: 'Jessa L.',
    role: 'Food Business Owner, Manila',
    result: 'REPLACED A ₱30K/MO AGENCY',
  },
  {
    quote: <>Hindi ko kailangan mag-hire ng editor. Grifon does everything na.</>,
    name: 'Carlo D.',
    role: 'Freelance Marketer, Davao',
    result: '₱0 EDITOR FEES',
  },
];

// Clearly-labeled sample-ad receipts — illustrative sample creative, never user
// testimony and never campaign data. The stat states only the defensible
// product-speed claim (~30-min build), not fabricated ROAS.
const SAMPLES = [
  { label: 'REAL ESTATE', icon: Building2, hook: 'YOUR DREAM CONDO.', accent: 'Closer than you think.', stat: 'COMPLETE AD · ~30 MIN' },
  { label: 'F&B', icon: UtensilsCrossed, hook: 'LUTONG BAHAY.', accent: 'Delivered in 30.', stat: 'COMPLETE AD · ~30 MIN' },
  { label: 'E-COMMERCE', icon: ShoppingBag, hook: 'BIG SALE.', accent: 'Ends tonight.', stat: 'COMPLETE AD · ~30 MIN' },
];

// Interleave: quote, sample, quote, sample... then the reserved CTA card.
const CARDS: ({ kind: 'quote'; data: (typeof QUOTES)[number] } | { kind: 'sample'; data: (typeof SAMPLES)[number] })[] = [];
for (let i = 0; i < Math.max(QUOTES.length, SAMPLES.length); i++) {
  if (QUOTES[i]) CARDS.push({ kind: 'quote', data: QUOTES[i] });
  if (SAMPLES[i]) CARDS.push({ kind: 'sample', data: SAMPLES[i] });
}
const TOTAL_CARDS = CARDS.length + 1; // + the reserved CTA end-card

const CARD_W = 'w-[80vw] sm:w-[400px] md:w-[440px]';

const StubHeader: React.FC<{ left: string; right?: React.ReactNode; gold?: boolean }> = ({ left, right, gold = false }) => (
  <div className={`mb-6 flex items-center justify-between border-b border-dashed border-zinc-900/15 pb-4 text-[10px] font-mono uppercase tracking-widest ${gold ? 'text-[#B28F00]' : 'text-zinc-500'}`}>
    <span>{left}</span>
    {right}
  </div>
);

const Stars: React.FC = () => (
  <span className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} size={12} strokeWidth={0} fill="#FFCC00" />
    ))}
  </span>
);

const RailCards: React.FC<{ onEnterApp: () => void; snap?: boolean }> = ({ onEnterApp, snap = false }) => {
  const snapClass = snap ? 'snap-center' : '';
  return (
    <>
      {CARDS.map((card, idx) =>
        card.kind === 'quote' ? (
          <figure key={idx} className={`flex h-auto ${CARD_W} shrink-0 flex-col rounded-3xl border border-zinc-900/10 bg-white p-7 shadow-[0_18px_40px_rgba(24,24,27,0.10)] md:p-9 ${snapClass}`}>
            <StubHeader left={`RECEIPT #${String(idx + 1).padStart(2, '0')}`} right={<Stars />} />
            <blockquote className="flex-1 font-serif italic text-xl leading-snug text-zinc-900 md:text-2xl">
              “{card.data.quote}”
            </blockquote>
            <figcaption className="mt-6">
              <div className="text-sm font-bold text-zinc-900">{card.data.name}</div>
              <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">{card.data.role}</div>
            </figcaption>
            <div className="mt-5 inline-flex w-fit items-center rounded-full border border-[#B28F00]/40 bg-[#B28F00]/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-[#B28F00]">
              {card.data.result}
            </div>
          </figure>
        ) : (
          <figure key={idx} className={`flex h-auto ${CARD_W} shrink-0 flex-col rounded-3xl border border-zinc-900/10 bg-zinc-950 p-7 shadow-[0_18px_40px_rgba(24,24,27,0.18)] md:p-9 ${snapClass}`}>
            <div className="mb-6 flex items-center justify-between border-b border-dashed border-white/15 pb-4 text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              <span>SAMPLE AD — {card.data.label}</span>
              <card.data.icon className="h-4 w-4 text-[#FFCC00]" />
            </div>
            <div className="flex-1">
              <div className="text-3xl font-black uppercase leading-[0.95] tracking-tighter text-white md:text-4xl">
                {card.data.hook}
                <span className="mt-1 block font-serif italic normal-case tracking-normal text-[#FFCC00] text-xl md:text-2xl">
                  {card.data.accent}
                </span>
              </div>
            </div>
            <div className="mt-6 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              Made with Director AI
            </div>
            <div className="mt-3 inline-flex w-fit items-center rounded-full border border-[#FFCC00]/30 bg-[#FFCC00]/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-[#FFCC00]">
              {card.data.stat}
            </div>
          </figure>
        )
      )}

      {/* The rail's job: convert the momentum it just built. */}
      <figure className={`flex h-auto ${CARD_W} shrink-0 flex-col rounded-3xl border border-dashed border-[#B28F00]/50 bg-white/60 p-7 md:p-9 ${snapClass}`}>
        <StubHeader left={`RECEIPT #${String(TOTAL_CARDS).padStart(2, '0')}`} right={<span>RESERVED</span>} gold />
        <p className="flex-1 font-serif italic text-2xl leading-snug text-zinc-900 md:text-3xl">
          Your ad could be <span className="text-[#B28F00]">here.</span>
        </p>
        <div className="mt-6">
          <GoldButton glossy onClick={onEnterApp} className="w-full px-8 py-3.5 text-sm">
            CREATE MY FIRST AD — FREE
            <ArrowRight className="ml-2 inline h-4 w-4" />
          </GoldButton>
          <p className="mt-3 text-center text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            ₱0 today · no card needed
          </p>
        </div>
      </figure>
    </>
  );
};

/**
 * "The Receipts Rail" — scroll-pinned horizontal proof strip. On arrival the
 * canvas flips dark → cream (landonorris section-flip) while the receipts
 * zoom up to full size; vertical scroll then drives the cards right-to-left
 * so proof is consumed sequentially. The last card is a CTA, converting the
 * momentum the rail builds. Real quotes + clearly-labeled sample-ad receipts
 * only — interleaved, never mixed up.
 *
 * Mobile: cream snap-carousel that auto-plays left→right on arrival (semi
 * speed), hands control to the user on first touch or at the end, then shows
 * a swipe hint. prefers-reduced-motion: static carousel, no auto-play.
 *
 * NOTE (DESIGN.md light-band rule): this section is contiguous with the
 * ProofBand cream band directly above it — together they form the page's
 * single light region.
 */
export const ReceiptsRail: React.FC<ReceiptsRailProps> = ({ onEnterApp }) => {
  const reduceMotion = useReducedMotion();
  // Initialized from matchMedia so the first render already picks the right
  // branch — a mount-then-swap would leave useScroll bound to a stale section.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  );
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(0);
  const [activeCard, setActiveCard] = useState(1);
  const [swipeReady, setSwipeReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const pinned = isDesktop && !reduceMotion;

  // Measure exactly how far the track overflows the sticky viewport so the
  // rail ends flush — no guessed percentages that drift across screen widths.
  useEffect(() => {
    if (!pinned) return;
    const measure = () => {
      const track = trackRef.current;
      const viewport = viewportRef.current;
      if (!track || !viewport) return;
      setTravel(Math.max(0, track.scrollWidth - viewport.clientWidth));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [pinned]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  // Lando section-flip: canvas + heading morph dark → cream as the pin engages,
  // while the whole track zooms up from 92% — the "receipts enlarge" arrival.
  const bg = useTransform(scrollYProgress, [0, 0.1], ['#09090b', '#F2F1EA']);
  const headingColor = useTransform(scrollYProgress, [0, 0.1], ['#f4f4f5', '#18181b']);
  const trackScale = useTransform(scrollYProgress, [0, 0.12], [0.92, 1]);
  const x = useTransform(scrollYProgress, [0.1, 1], [0, -travel]);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const t = Math.min(1, Math.max(0, (v - 0.1) / 0.9)); // card progress rides the travel range
    setActiveCard(Math.min(TOTAL_CARDS, Math.max(1, Math.round(t * (TOTAL_CARDS - 1)) + 1)));
  });

  // Mobile auto-play: glide the carousel left→right at semi speed once it's on
  // screen; first touch (or reaching the end) hands control back and arms the
  // swipe hint so earlier receipts can be re-read.
  useEffect(() => {
    if (pinned || reduceMotion) return;
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    let started = false;
    let stopped = false;
    // Mandatory snap rejects programmatic fractional scrolls (snaps straight
    // back to 0) — suspend it for the glide, restore on hand-off so the user's
    // swipe snaps to the nearest card again.
    const step = () => {
      if (stopped) return;
      el.scrollLeft += 2.4;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        stopped = true;
        el.style.scrollSnapType = '';
        setSwipeReady(true);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    const stop = () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(raf);
      el.style.scrollSnapType = '';
      setSwipeReady(true);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started && !stopped) {
          started = true;
          el.style.scrollSnapType = 'none';
          raf = requestAnimationFrame(step);
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    el.addEventListener('pointerdown', stop, { passive: true });
    el.addEventListener('touchstart', stop, { passive: true });
    el.addEventListener('wheel', stop, { passive: true });
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      el.style.scrollSnapType = '';
      io.disconnect();
      el.removeEventListener('pointerdown', stop);
      el.removeEventListener('touchstart', stop);
      el.removeEventListener('wheel', stop);
    };
  }, [pinned, reduceMotion]);

  const label = (
    <p className="mb-4 text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">
      // WHAT EARLY USERS ARE SAYING
    </p>
  );

  if (!pinned) {
    // Mobile + reduced-motion: cream band, auto-playing snap carousel.
    return (
      <section id="reviews" className={`relative z-10 scroll-mt-28 bg-[#F2F1EA] ${BAND}`}>
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          {label}
          <h2 className="text-3xl font-bold uppercase tracking-tight text-zinc-900 md:text-5xl">
            TRUSTED BY FILIPINO BUSINESS OWNERS
          </h2>
        </div>
        <div
          ref={scrollerRef}
          className="proof-scroll mt-10 flex snap-x snap-mandatory items-stretch gap-5 overflow-x-auto px-4 pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          <style>{`.proof-scroll::-webkit-scrollbar { display: none; }`}</style>
          <RailCards onEnterApp={onEnterApp} snap />
        </div>
        <AnimatePresence>
          {swipeReady && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-zinc-500"
            >
              <ChevronsRight className="h-3.5 w-3.5 rotate-180 text-[#B28F00]" />
              Swipe to re-read
              <ChevronsRight className="h-3.5 w-3.5 text-[#B28F00]" />
            </motion.p>
          )}
        </AnimatePresence>
      </section>
    );
  }

  return (
    // Tall wrapper = the scroll budget the pin consumes.
    <section ref={sectionRef} id="reviews" className="relative z-10 h-[340vh] scroll-mt-28">
      <motion.div
        ref={viewportRef}
        style={{ backgroundColor: bg }}
        className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden"
      >
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              {label}
              <motion.h2 style={{ color: headingColor }} className="text-3xl font-bold uppercase tracking-tight md:text-5xl">
                TRUSTED BY FILIPINO BUSINESS OWNERS
              </motion.h2>
            </div>
            <div className="flex items-center gap-3 pb-1">
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">
                {String(activeCard).padStart(2, '0')} / {String(TOTAL_CARDS).padStart(2, '0')}
              </span>
              <div className="h-px w-24 bg-zinc-500/30">
                <motion.div className="h-px origin-left bg-[#B28F00]" style={{ scaleX: scrollYProgress }} />
              </div>
            </div>
          </div>
        </div>
        <motion.div
          ref={trackRef}
          style={{ x, scale: trackScale }}
          className="mt-10 flex items-stretch gap-6 pl-[max(1rem,calc((100vw-80rem)/2+1rem))] pr-16 md:mt-14"
        >
          <RailCards onEnterApp={onEnterApp} />
        </motion.div>
      </motion.div>
    </section>
  );
};
