import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Volume2, VolumeX } from 'lucide-react';
import { useUiSound } from '../../services/uiSoundService';
import { GrifonMark } from './GrifonMark';

export interface SiteNavLink {
  label: string;
  /** In-page anchor (e.g. "#what-you-get"). Use onClick instead for routes. */
  href?: string;
  onClick?: () => void;
}

interface SiteHeaderProps {
  /** Target for the Start Free + Log in actions. */
  onEnterApp: () => void;
  /** Desktop + mobile-menu anchor links. */
  navLinks?: SiteNavLink[];
  /** Logo click — defaults to scrolling to top. */
  onLogoClick?: () => void;
  /** Show the LOG IN link (landing yes, pricing optional). */
  showLogin?: boolean;
  ctaLabel?: string;
  /** Href of the section currently in view — gets the gold squiggle-strike treatment. */
  activeHref?: string;
}

const SoundToggle: React.FC<{ className?: string; withLabel?: boolean }> = ({
  className = '',
  withLabel = false,
}) => {
  const { enabled, toggle } = useUiSound();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Mute interface sounds' : 'Enable interface sounds'}
      title={enabled ? 'Sound on' : 'Sound off'}
      className={`flex items-center gap-2 text-zinc-400 hover:text-[#FFCC00] transition-colors cursor-pointer ${className}`}
    >
      {enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      {withLabel && (
        <span className="text-[11px] font-mono uppercase tracking-[0.2em]">
          Sound {enabled ? 'on' : 'off'}
        </span>
      )}
    </button>
  );
};

// Hand-drawn squiggle underline for the active nav label (landonorris.com pattern,
// underline position — strike-through is reserved for dead prices on this site).
const ActiveSquiggle: React.FC = () => (
  <svg
    className="absolute -inset-x-1 -bottom-[0.45em] h-[0.5em] w-[calc(100%+0.5rem)] pointer-events-none"
    viewBox="0 0 100 20"
    preserveAspectRatio="none"
    fill="none"
    aria-hidden="true"
  >
    <motion.path
      d="M2 12 C 18 16, 38 6, 58 10 C 72 13, 88 8, 98 12"
      stroke="#FFCC00"
      strokeWidth={2.5}
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
    />
  </svg>
);

export const SiteHeader: React.FC<SiteHeaderProps> = ({
  onEnterApp,
  navLinks = [],
  onLogoClick,
  showLogin = true,
  ctaLabel = 'Sign up',
  activeHref,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogo = () => {
    if (onLogoClick) onLogoClick();
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNav = (link: SiteNavLink) => {
    setMenuOpen(false);
    if (link.onClick) link.onClick();
  };

  // Desktop nav item with an animated gold underline on hover; the in-view
  // section gets the squiggle-strike instead (keyed so it redraws on change).
  const renderNavLink = (link: SiteNavLink) => {
    const isActive = !!link.href && link.href === activeHref;
    const cls = `group relative text-[11px] font-mono uppercase tracking-[0.2em] transition-colors cursor-pointer ${
      isActive ? 'text-white' : 'text-zinc-400 hover:text-white'
    }`;
    const underline = isActive ? (
      <ActiveSquiggle key={link.href} />
    ) : (
      <span className="absolute -bottom-1.5 left-0 h-px w-full bg-[#FFCC00] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
    );
    return link.href ? (
      <a key={link.label} href={link.href} className={cls}>
        {link.label}
        {underline}
      </a>
    ) : (
      <button key={link.label} onClick={() => handleNav(link)} className={cls}>
        {link.label}
        {underline}
      </button>
    );
  };

  const Logo = (
    <div
      className="flex items-center gap-2.5 cursor-pointer"
      onClick={handleLogo}
    >
      <GrifonMark className="h-10 w-10" />
      <span className="font-black text-xl tracking-tighter text-white italic">
        GRIFON
      </span>
    </div>
  );

  return (
    <header className="backdrop-blur-xl bg-zinc-950/80 border-b border-white/10">
      <div className="relative flex items-center px-4 sm:px-6 lg:px-8 py-3 max-w-7xl mx-auto">
        {/* Left: logo */}
        <div className="flex-1 flex justify-start min-w-0">{Logo}</div>

        {/* Center: desktop nav */}
        <nav className="hidden md:flex flex-1 justify-center items-center gap-6 lg:gap-9">
          {navLinks.map((link) => renderNavLink(link))}
        </nav>

        {/* Right: desktop actions */}
        <div className="hidden md:flex flex-1 justify-end items-center gap-5 lg:gap-6">
          {showLogin && (
            <button
              onClick={onEnterApp}
              className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              LOG IN
            </button>
          )}
          <SoundToggle />
          <button
            onClick={onEnterApp}
            className="bg-transparent border border-[#FFCC00] text-[#FFCC00] text-[11px] font-black uppercase tracking-widest px-5 py-2 rounded-full hover:bg-[#FFCC00]/10 hover:shadow-[0_0_15px_rgba(255,204,0,0.3)] hover:scale-105 transition-all"
          >
            {ctaLabel}
          </button>
        </div>

        {/* Right: mobile actions */}
        <div className="flex md:hidden flex-1 justify-end items-center gap-2.5">
          <button
            onClick={onEnterApp}
            className="bg-transparent border border-[#FFCC00] text-[#FFCC00] text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full hover:bg-[#FFCC00]/10 transition-all"
          >
            {ctaLabel}
          </button>
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile overlay menu — portaled to <body> so `fixed` escapes the
          header's backdrop-filter containing block and covers the viewport. */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-zinc-950/95 backdrop-blur-xl md:hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              {Logo}
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <motion.nav
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="flex-1 flex flex-col justify-center gap-2 px-6"
            >
              {navLinks.map((link) =>
                link.href ? (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="py-3 text-lg font-mono uppercase tracking-[0.2em] text-zinc-300 hover:text-[#FFCC00] transition-colors border-b border-white/5"
                  >
                    <span className="relative inline-block">
                      {link.label}
                      {link.href === activeHref && <ActiveSquiggle />}
                    </span>
                  </a>
                ) : (
                  <button
                    key={link.label}
                    onClick={() => handleNav(link)}
                    className="py-3 text-left text-lg font-mono uppercase tracking-[0.2em] text-zinc-300 hover:text-[#FFCC00] transition-colors border-b border-white/5"
                  >
                    {link.label}
                  </button>
                )
              )}
              {showLogin && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEnterApp();
                  }}
                  className="py-3 text-left text-lg font-mono uppercase tracking-[0.2em] text-zinc-300 hover:text-[#FFCC00] transition-colors border-b border-white/5"
                >
                  Log in
                </button>
              )}

              <div className="mt-6 flex items-center justify-between">
                <SoundToggle withLabel />
              </div>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  onEnterApp();
                }}
                className="mt-6 w-full rounded-full bg-[#FFCC00] text-black font-black uppercase tracking-widest py-3.5 text-sm shadow-[0_0_20px_rgba(255,204,0,0.3)]"
              >
                {ctaLabel} — No Credit Card
              </button>
            </motion.nav>
          </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </header>
  );
};
