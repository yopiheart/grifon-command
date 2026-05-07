import React from 'react';
import { ChevronRight } from 'lucide-react';

export type EwalletMethod = 'gcash' | 'paymaya' | 'grab_pay';

interface EwalletButtonsProps {
  active: EwalletMethod;
  onContinue: () => void;
  isSubmitting: boolean;
  authorizationText: string;
}

const LABELS: Record<EwalletMethod, string> = {
  gcash: 'GCash',
  paymaya: 'Maya',
  grab_pay: 'GrabPay',
};

export const EwalletButtons: React.FC<EwalletButtonsProps> = ({ active, onContinue, isSubmitting, authorizationText }) => {
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

      <button
        type="button"
        onClick={onContinue}
        disabled={isSubmitting}
        className="w-full bg-[#FFCC00] text-black font-bold uppercase tracking-widest py-4 rounded-xl hover:shadow-[0_0_20px_rgba(255,204,0,0.4)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          'Redirecting…'
        ) : (
          <>
            Continue with {label}
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-[11px] text-zinc-500 leading-relaxed">{authorizationText}</p>
    </div>
  );
};
