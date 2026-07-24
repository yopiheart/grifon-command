import React, { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CTRL_H, R_CTRL, T_VALUE } from './wizardTokens';
import { SPRING, reducedMotion } from './motionTokens';

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
        ? 'cursor-not-allowed border-white/5 text-on-surface-sublabel'
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
  variant = 'wizard',
}: {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<Opt<T>>;
  className?: string;
  /** 'wizard' (default, in-app h-11 Pills) or 'marketing' (rounded-full pill group
   *  with a sliding gold thumb — landing/pricing surfaces). */
  variant?: 'wizard' | 'marketing';
}) {
  const reduce = useReducedMotion();
  const thumbId = useId();

  if (variant === 'marketing') {
    return (
      <div className={`relative inline-flex gap-0 p-1 rounded-full bg-white/5 border border-white/10 ${className}`}>
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o as React.ReactNode } : o;
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              disabled={'disabled' in opt ? opt.disabled : undefined}
              title={'title' in opt ? opt.title : undefined}
              onClick={() => onChange(opt.value)}
              className={`relative overflow-visible isolate rounded-full px-6 py-2.5 text-[13px] font-bold uppercase tracking-wider transition-colors ${
                active ? 'text-black' : 'text-on-surface-sublabel hover:text-white'
              }`}
            >
              {active && (
                <motion.span
                  layoutId={thumbId}
                  transition={reducedMotion(reduce, SPRING.snappy)}
                  className="absolute inset-0 rounded-full bg-[#FFCC00] -z-[1]"
                />
              )}
              <span className="relative z-10">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

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
