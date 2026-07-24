import React from 'react';
import { GlassPanel } from './GlassPanel';

// ===========================================================================
// StepShell — the shared wizard-step chrome: a GlassPanel wrapping a
// standardized header (mono sublabel + gradient movie-title-card heading +
// hairline divider). Each step's body becomes just its unique controls.
//
// Escape hatches (Risk R4 — don't let the abstraction leak):
//  • headerRight  — node pinned to the header's right (e.g. a status chip).
//  • panelClassName — width/padding overrides (e.g. max-w-6xl steps).
//  • noPanel      — render header + children WITHOUT the GlassPanel, for steps
//                   that need a bespoke outer container.
//
// PRESENTATIONAL ONLY: this renders chrome; it owns no wizard state.
// ===========================================================================

export const StepShell: React.FC<{
  /** Mono sublabel, e.g. "STEP 2 · BUSINESS INFO". The "// " marker is added. */
  sublabel?: string;
  /** Heading. String or nodes (for <br/> in multi-line titles). */
  title: React.ReactNode;
  headerRight?: React.ReactNode;
  panelClassName?: string;
  noPanel?: boolean;
  children: React.ReactNode;
}> = ({ sublabel, title, headerRight, panelClassName = '', noPanel, children }) => {
  const header = (
    <div className="mb-8 flex items-start justify-between gap-4 border-b border-white/10 pb-6">
      <div className="min-w-0">
        {sublabel && (
          <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">// {sublabel}</p>
        )}
        <h2 className="text-2xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500">
          {title}
        </h2>
      </div>
      {headerRight && <div className="shrink-0">{headerRight}</div>}
    </div>
  );

  if (noPanel) {
    return (
      <div className={panelClassName}>
        {header}
        {children}
      </div>
    );
  }

  return (
    <GlassPanel className={panelClassName}>
      {header}
      {children}
    </GlassPanel>
  );
};

export default StepShell;
