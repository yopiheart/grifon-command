import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { GoldButton } from '../../ui/GoldButton';

interface HeroProps {
  onEnterApp: () => void;
  heroSentinelRef: React.RefObject<HTMLDivElement>;
}

/** Native scroll drives the reveal; no wheel interception or video request. */
export const Hero: React.FC<HeroProps> = ({ onEnterApp, heroSentinelRef }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const filmRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [copyHidden, setCopyHidden] = useState(false);
  const startY = useMotionValue(600);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  // Keep opacity on the same measured progress as the frame. The native
  // ViewTimeline path otherwise measures this sticky scene differently.
  const copyOpacity = useTransform(() => Math.max(0, 1 - scrollYProgress.get() / 0.32));
  const copyY = useTransform(scrollYProgress, [0, 0.36], [0, -90]);
  const copyScale = useTransform(scrollYProgress, [0, 0.36], [1, 0.96]);
  const filmProgress = useTransform(scrollYProgress, [0.12, 0.82], [0, 1]);
  const filmY = useTransform(() => startY.get() * (1 - filmProgress.get()));
  const filmScale = useTransform(filmProgress, [0, 1], [0.76, 1]);
  const filmRadius = useTransform(filmProgress, [0, 1], [32, 16]);

  useEffect(() => {
    const measure = () => {
      if (stageRef.current && filmRef.current) {
        startY.set((stageRef.current.clientHeight + filmRef.current.clientHeight) / 2 - 72);
      }
    };
    const observer = new ResizeObserver(measure);
    if (stageRef.current) observer.observe(stageRef.current);
    if (filmRef.current) observer.observe(filmRef.current);
    measure();
    return () => observer.disconnect();
  }, [startY]);

  useMotionValueEvent(scrollYProgress, 'change', progress => setCopyHidden(progress >= 0.32));
  useEffect(() => {
    // Invisible CTA controls must leave the keyboard order as well.
    if (copyRef.current) copyRef.current.inert = !reduce && copyHidden;
  }, [copyHidden, reduce]);

  const revealFilm = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (reduce) {
      filmRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
      return;
    }
    const section = sectionRef.current;
    if (!section) return;
    window.scrollTo({
      top: section.getBoundingClientRect().top + window.scrollY
        + Math.max(0, section.clientHeight - window.innerHeight),
      behavior: 'smooth',
    });
  };

  return (
    <section ref={sectionRef} className={`landing-hero ${reduce ? 'landing-hero-static' : ''}`} aria-labelledby="landing-headline">
      <div ref={stageRef} className="landing-hero-stage">
        <div className="landing-horizon" aria-hidden="true" />
        <motion.div ref={copyRef} className="landing-hero-copy"
          aria-hidden={!reduce && copyHidden ? true : undefined}
          style={reduce ? undefined : { opacity: copyOpacity, y: copyY, scale: copyScale }}>
          <p className="landing-eyebrow"><span className="landing-signal" /> The AI ad studio for Filipino businesses</p>
          <h1 id="landing-headline" className="landing-headline">
            <span>Your next ad.</span>
            <span className="font-serif italic normal-case tracking-normal landing-gold-type">Made to move.</span>
          </h1>
          <p className="landing-hero-description">
            From a business idea to a finished video ad.{' '}<br className="hidden sm:block" />
            Research, script, scenes, and captions. All in Grifon.
          </p>
          <div className="landing-hero-actions">
            <GoldButton glossy onClick={onEnterApp} className="landing-primary">
              <span>Start my first ad <ArrowUpRight size={18} aria-hidden="true" /></span>
            </GoldButton>
            <a href="#hero-film" onClick={revealFilm} className="landing-reveal-link">
              Explore the story <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
          <p className="landing-reassurance">Free to preview <span aria-hidden="true">·</span> No card needed</p>
        </motion.div>
        <motion.figure className="landing-film-wrap" style={reduce ? undefined : { y: filmY, scale: filmScale }}>
          <motion.div ref={filmRef} id="hero-film" className="landing-film"
            style={reduce ? undefined : { borderRadius: filmRadius }}
            role="img" aria-label="Blank frame reserved for the Grifon hero film" />
          <figcaption><span>Grifon / In motion</span><span>Hero film in development</span></figcaption>
        </motion.figure>
      </div>
      <div ref={heroSentinelRef} className="absolute bottom-0 h-px w-px" aria-hidden="true" />
    </section>
  );
};
