import React from 'react';
import { CTRL_H, R_CTRL, T_VALUE } from './wizardTokens';

// ===========================================================================
// Pill + SegButton — the wizard's toggle controls, on the h-11 floor.
//
// • Pill: one selectable button (active = gold border + tint + gold text).
//   The atom behind script-type / language / gender / strategy toggles.
// • SegButton: a horizontal group of equal-width Pills bound to a value.
//
// Extracted from the One-Shot composer's SegBtn/Segmented so toggle groups
// stop being re-styled inline per step.
//
// PRESENTATIONAL ONLY: callers keep owning the selected value + onChange.
// ===========================================================================

export const Pill: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
  className?: string;
}> = ({ active, onClick, children, disabled, title, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`flex-1 border px-3 ${CTRL_H} ${R_CTRL} ${T_VALUE} uppercase transition-all ${
      disabled
        ? 'cursor-not-allowed border-white/5 text-zinc-600'
        : active
          ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]'
          : 'border-white/10 text-zinc-400 hover:border-white/30 hover:text-white'
    } ${className}`}
  >
    {children}
  </button>
);

type Opt<T extends string> = T | { value: T; label: React.ReactNode; title?: string; disabled?: boolean };

export function SegButton<T extends string>({
  value,
  onChange,
  options,
  className = '',
}: {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<Opt<T>>;
  className?: string;
}) {
  return (
    <div className={`flex gap-2 ${className}`}>
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o as React.ReactNode } : o;
        return (
          <Pill
            key={opt.value}
            active={value === opt.value}
            disabled={'disabled' in opt ? opt.disabled : undefined}
            title={'title' in opt ? opt.title : undefined}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Pill>
        );
      })}
    </div>
  );
}

export default SegButton;
