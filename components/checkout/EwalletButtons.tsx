import React from 'react';
import { ChevronRight } from 'lucide-react';
import { GLOSSY_GOLD_CLASS, ButtonSheen } from './glossyGoldButton';

export type EwalletMethod = 'gcash' | 'paymaya' | 'grab_pay';

interface EwalletButtonsProps {
  active: EwalletMethod;
  onContinue: () => void;
  isSubmitting: boolean;
  authorizationText: string;
  /** When true, the continue action is blocked (e.g. terms not yet agreed). */
  submitDisabled?: boolean;
  /** Rendered immediately above the continue button (e.g. the terms agreement checkbox). */
  termsSlot?: React.ReactNode;
}

const LABELS: Record<EwalletMethod, string> = {
  gcash: 'GCash',
  paymaya: 'Maya',
  grab_pay: 'GrabPay',
};

export const EwalletButtons: React.FC<EwalletButtonsProps> = ({ active, onContinue, isSubmitting, authorizationText, submitDisabled = false, termsSlot }) => {
  const label = LABELS[active];
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-zinc-950 p-6 text-center">
        <p className="text-zinc-300 text-sm mb-2">
          You'll be redirected to <span className="text-white font-semibold">{label}</span> to complete your payment.
        </p>
        <p className="text-zinc-500 text-xs leading-relaxed">
          Pay with your {label} balance. After payment, you'll return to Grifon Command.
        </p>
      </div>

      {termsSlot}

      <button
        type="button"
        onClick={onContinue}
        disabled={isSubmitting || submitDisabled}
        className={GLOSSY_GOLD_CLASS}
      >
        <ButtonSheen />
        <span className="relative z-10 inline-flex items-center justify-center gap-2">
          {isSubmitting ? (
            'Redirecting…'
          ) : (
            <>
              Continue with {label}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </span>
      </button>

      <p className="text-[11px] text-zinc-500 leading-relaxed">{authorizationText}</p>
    </div>
  );
};
