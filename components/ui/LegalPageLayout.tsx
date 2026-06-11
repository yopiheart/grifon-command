import React, { useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';

type Props = {
  title: string;
  effectiveDate: string;
  onBack: () => void;
  /** Back-button text. Defaults to "Back"; e.g. "Back to checkout" when arriving from checkout. */
  backLabel?: string;
  children: React.ReactNode;
};

const LegalPageLayout: React.FC<Props> = ({ title, effectiveDate, onBack, backLabel = 'Back', children }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-all font-mono text-[11px] uppercase tracking-[0.2em]"
          >
            <ChevronLeft className="w-4 h-4" />
            {backLabel}
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="GRIFON Logo" className="h-7 w-auto object-contain" />
            <span className="text-white font-black italic text-lg tracking-tight">
              GRIFON
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <p className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-[0.25em] mb-3">
          // LEGAL
        </p>
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-3">
          {title}
        </h1>
        <p className="text-xs font-mono text-zinc-500 mb-10">
          Effective date: {effectiveDate}
        </p>

        <div className="legal-prose text-zinc-300 leading-relaxed space-y-6 text-[15px]">
          {children}
        </div>

        <footer className="mt-16 pt-8 border-t border-white/5 text-xs text-zinc-500 font-mono">
          <p>© 2026 Haste Enterprises — Grifon.AI</p>
          <p className="mt-1">Questions? Contact <a href="mailto:grifon.ai@gmail.com" className="text-[#FFCC00] hover:underline">grifon.ai@gmail.com</a></p>
        </footer>
      </main>
    </div>
  );
};

export default LegalPageLayout;
