import React, { useState } from 'react';
import { Lock } from 'lucide-react';

export type CardFormData = {
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  cardholderName: string;
};

interface CardFormProps {
  onSubmit: (data: CardFormData) => void;
  isSubmitting: boolean;
  totalLabel: string;
  authorizationText: string;
  /** When true, the submit is blocked (e.g. terms not yet agreed). */
  submitDisabled?: boolean;
  /** Rendered immediately above the Pay button (e.g. the terms agreement checkbox). */
  termsSlot?: React.ReactNode;
}

const formatCardNumber = (v: string): string => {
  const digits = v.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
};

const formatExp = (v: string): string => {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
};

export const CardForm: React.FC<CardFormProps> = ({ onSubmit, isSubmitting, totalLabel, authorizationText, submitDisabled = false, termsSlot }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitDisabled || isSubmitting) return;
    const expDigits = exp.replace(/\D/g, '');
    const expMonth = expDigits.slice(0, 2);
    const expYearShort = expDigits.slice(2, 4);
    onSubmit({
      cardNumber: cardNumber.replace(/\s/g, ''),
      expMonth,
      expYear: expYearShort ? `20${expYearShort}` : '',
      cvc,
      cardholderName: name,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">
          Card information
        </label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="1234 1234 1234 1234"
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          maxLength={23}
          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]"
          required
        />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM / YY"
            value={exp}
            onChange={(e) => setExp(formatExp(e.target.value))}
            maxLength={7}
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]"
            required
          />
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="CVC"
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
            maxLength={4}
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">
          Cardholder name
        </label>
        <input
          type="text"
          autoComplete="cc-name"
          placeholder="Full name on card"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]"
          required
        />
      </div>

      <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
        <Lock className="w-3 h-3" /> Encrypted by PayMongo &middot; 256-bit TLS
      </p>

      {termsSlot}

      <button
        type="submit"
        disabled={isSubmitting || submitDisabled}
        className="w-full bg-[#FFCC00] text-black font-bold uppercase tracking-widest py-4 rounded-xl hover:shadow-[0_0_20px_rgba(255,204,0,0.4)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isSubmitting ? 'Processing…' : totalLabel}
      </button>

      <p className="text-[11px] text-zinc-500 leading-relaxed">{authorizationText}</p>
    </form>
  );
};
