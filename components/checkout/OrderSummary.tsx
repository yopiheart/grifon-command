import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, Tag } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';

interface OrderSummaryProps {
  planName: string;
  cycle: 'monthly' | 'annual';
  description: string;
  totalCentavos: number;
  subtotalCentavos: number;
  vatCentavos: number;
  monthlyEquivalentCentavos?: number;
  monthlyComparisonSavingsCentavos?: number;
  onBack: () => void;
}

const formatPHP = (centavos: number): string => {
  const pesos = centavos / 100;
  return `₱${pesos.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  planName,
  cycle,
  description,
  totalCentavos,
  subtotalCentavos,
  vatCentavos,
  monthlyEquivalentCentavos,
  monthlyComparisonSavingsCentavos,
  onBack,
}) => {
  const [vatOpen, setVatOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);

  return (
    <GlassPanel className="lg:sticky lg:top-8 self-start">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to plans
      </button>

      <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">Subscribe to</p>
      <h1 className="text-xl font-semibold text-white mb-6">
        {planName} <span className="text-zinc-500">— {cycle}</span>
      </h1>

      <div className="mb-6">
        <p className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500 leading-none">
          {formatPHP(totalCentavos)}
        </p>
        <p className="text-zinc-400 text-sm mt-2">
          per {cycle === 'monthly' ? 'month' : 'year'}
        </p>
        {cycle === 'monthly' && (
          <p className="text-zinc-500 text-xs mt-1">
            Just <span className="text-[#FFCC00]">₱{Math.floor(totalCentavos / 100 / 30)}/day</span> — less than your morning coffee.
          </p>
        )}
        {cycle === 'annual' && monthlyEquivalentCentavos !== undefined && (
          <p className="text-zinc-500 text-xs mt-1">
            {formatPHP(monthlyEquivalentCentavos)} / month, billed annually
            {monthlyComparisonSavingsCentavos !== undefined && monthlyComparisonSavingsCentavos > 0 && (
              <span className="text-[#FFCC00] ml-2">
                Save {formatPHP(monthlyComparisonSavingsCentavos)} vs monthly
              </span>
            )}
          </p>
        )}
      </div>

      <div className="border-t border-white/10 my-6" />

      <div className="flex justify-between text-sm">
        <div className="text-white pr-4">
          <p className="font-medium">{planName}</p>
          <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{description}</p>
        </div>
        <p className="text-white shrink-0">{formatPHP(totalCentavos)}</p>
      </div>

      <div className="border-t border-white/10 my-6" />

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-zinc-300">
          <span>Subtotal</span>
          <span>{formatPHP(totalCentavos)}</span>
        </div>

        <button
          type="button"
          onClick={() => setPromoOpen((v) => !v)}
          className="flex items-center gap-2 text-zinc-500 hover:text-white text-xs transition-colors"
        >
          <Tag className="w-3.5 h-3.5" />
          Have a promo code?
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${promoOpen ? 'rotate-180' : ''}`} />
        </button>
        {promoOpen && (
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="PROMO_CODE"
              className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]"
              disabled
            />
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-zinc-800 border border-white/10 text-zinc-300 text-sm hover:border-[#FFCC00] hover:text-[#FFCC00] transition-colors disabled:opacity-50"
              disabled
            >
              Apply
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 my-6" />

      <div className="flex justify-between items-baseline">
        <span className="text-white font-medium">Total due today</span>
        <span className="text-2xl font-bold text-white">
          <span className="text-[#FFCC00]">&#8369;</span>
          {(totalCentavos / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setVatOpen((v) => !v)}
        className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-xs mt-3 transition-colors"
      >
        View tax breakdown
        <ChevronDown className={`w-3 h-3 transition-transform ${vatOpen ? 'rotate-180' : ''}`} />
      </button>
      {vatOpen && (
        <div className="mt-3 pl-3 border-l border-white/10 space-y-1.5 text-xs text-zinc-400">
          <div className="flex justify-between">
            <span>Subtotal (VAT-exclusive)</span>
            <span>{formatPHP(subtotalCentavos)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT (12%)</span>
            <span>{formatPHP(vatCentavos)}</span>
          </div>
          <div className="flex justify-between text-zinc-300 pt-1.5 border-t border-white/10">
            <span>Total</span>
            <span>{formatPHP(totalCentavos)}</span>
          </div>
          <p className="text-zinc-500 text-[10px] pt-2 leading-relaxed">
            12% VAT included as required by BIR. Receipt with full breakdown will be emailed.
          </p>
        </div>
      )}
    </GlassPanel>
  );
};
