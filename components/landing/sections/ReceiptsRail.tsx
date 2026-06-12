import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, useMotionValueEvent } from 'motion/react';
import { Star, ArrowRight } from 'lucide-react';
import { GoldButton } from '../../ui/GoldButton';
import { SignatureScribble } from '../SignatureScribble';

interface ReceiptsRailProps {
  onEnterApp: () => void;
}

// Quotes moved verbatim from the old ProofBand grid. The RESULT chip on each
// card restates the quote's own number — no new claims are asserted here.
const RECEIPTS = [
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

const TOTAL_CARDS = RECEIPTS.length + 1; // + the reserved CTA end-card

const ReceiptCard: React.FC<{ index: number; children: React.ReactNode }> = ({ index, children }) => (
  <figure className="flex h-full w-[82vw] sm:w-[420px] md:w-[460px] shrink-0 flex-col rounded-3xl border border-white/10 bg-zinc-900/70 p-7 md:p-9">
    {/* Receipt stub header */}
    <div className="mb-6 flex items-center justify-between border-b border-dashed border-white/15 pb-4 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
      <span>RECEIPT #{String(index + 1).padStart(2, '0')}</span>
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} size={12} strokeWidth={0} fill="#FFCC00" />
        ))}
      </span>
    </div>
    {children}
  </figure>
);

/**
 * "The Receipts Rail" — scroll-pinned horizontal testimonial strip
 * (landonorris.com pattern): the section pins while vertical scroll drives the
 * cards right-to-left, so every scroll tick is one more piece of proof actually
 * consumed. The last card is a CTA, converting the momentum the rail builds.
 * Mobile and prefers-reduced-motion get a plain vertical stack — same content,
 * zero scroll-jacking.
 */
export const ReceiptsRail: React.FC<ReceiptsRailProps> = ({ onEnterApp }) => {
  const reduceMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(0);
  const [activeCard, setActiveCard] = useState(1);

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
  const x = useTransform(scrollYProgress, [0, 1], [0, -travel]);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setActiveCard(Math.min(TOTAL_CARDS, Math.max(1, Math.round(v * (TOTAL_CARDS - 1)) + 1)));
  });

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-4 text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">
          // WHAT EARLY USERS ARE SAYING
        </p>
        <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">
          TRUSTED BY FILIPINO BUSINESS OWNERS
        </h2>
      </div>
      {pinned && (
        <div className="flex items-center gap-3 pb-1">
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">
            {String(activeCard).padStart(2, '0')} / {String(TOTAL_CARDS).padStart(2, '0')}
          </span>
          <div className="h-px w-24 bg-white/10">
            <motion.div className="h-px origin-left bg-[#FFCC00]" style={{ scaleX: scrollYProgress }} />
          </div>
        </div>
      )}
    </div>
  );

  const cards = (
    <>
      {RECEIPTS.map((t, idx) => (
        <ReceiptCard key={idx} index={idx}>
          <blockquote className="flex-1 font-serif italic text-xl md:text-2xl leading-snug text-zinc-100">
            “{t.quote}”
          </blockquote>
          <figcaption className="mt-6">
            <div className="text-sm font-bold text-white">{t.name}</div>
            <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">{t.role}</div>
          </figcaption>
          <div className="mt-5 inline-flex w-fit items-center rounded-full border border-[#FFCC00]/30 bg-[#FFCC00]/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-[#FFCC00]">
            {t.result}
          </div>
        </ReceiptCard>
      ))}

      {/* The rail's job: convert the momentum it just built. */}
      <figure className="flex h-full w-[82vw] sm:w-[420px] md:w-[460px] shrink-0 flex-col rounded-3xl border border-dashed border-[#FFCC00]/40 bg-zinc-900/40 p-7 md:p-9">
        <div className="mb-6 flex items-center justify-between border-b border-dashed border-white/15 pb-4 text-[10px] font-mono uppercase tracking-widest text-[#FFCC00]">
          <span>RECEIPT #{String(TOTAL_CARDS).padStart(2, '0')}</span>
          <span>RESERVED</span>
        </div>
        <p className="flex-1 font-serif italic text-2xl md:text-3xl leading-snug text-zinc-100">
          Your ad could be{' '}
          <span className="text-[#FFCC00]">here.</span>
        </p>
        <div className="mt-6">
          <GoldButton onClick={onEnterApp} className="w-full text-sm px-8 py-3.5">
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

  if (!pinned) {
    // Mobile + reduced-motion: same proof, plain vertical flow.
    return (
      <section id="reviews" className="relative z-10 scroll-mt-28 border-b border-white/5 px-4 py-16 sm:px-6 md:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {header}
          <div className="mt-10 flex flex-col items-center gap-6 md:mt-14">{cards}</div>
        </div>
      </section>
    );
  }

  return (
    // Tall wrapper = the scroll budget the pin consumes (~2 viewports of travel).
    <section ref={sectionRef} id="reviews" className="relative z-10 h-[280vh] scroll-mt-28 border-b border-white/5">
      <div ref={viewportRef} className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">{header}</div>
        <motion.div ref={trackRef} style={{ x }} className="mt-10 flex items-stretch gap-6 pl-[max(1rem,calc((100vw-80rem)/2+1rem))] pr-16 md:mt-14">
          {cards}
        </motion.div>
      </div>
    </section>
  );
};
