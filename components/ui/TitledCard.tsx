import React from 'react';
import { R_PANEL, T_LABEL } from './wizardTokens';

// ===========================================================================
// TitledCard — a labeled glass sub-panel for grouping related controls inside a
// StepShell. The "// TITLE" mono header + hairline-bordered zinc-950/50 fill is
// the wizard's group container; an optional `right` slot holds a secondary
// control/disclosure toggle. Replaces the ad-hoc p-4/p-6 sub-panels that drift
// per step.
// ===========================================================================

export const TitledCard: React.FC<{
  title?: string;
  /** Node pinned to the header's right (e.g. an optional-field disclosure toggle). */
  right?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, right, className = '', bodyClassName = '', children }) => (
  <section className={`border border-white/10 bg-zinc-950/50 ${R_PANEL} p-5 sm:p-6 ${className}`}>
    {(title || right) && (
      <div className="mb-5 flex items-center justify-between gap-3">
        {title ? <h3 className={`text-zinc-400 ${T_LABEL}`}>// {title}</h3> : <span />}
        {right}
      </div>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);

export default TitledCard;
