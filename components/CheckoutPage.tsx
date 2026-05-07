import React, { useMemo, useState } from 'react';
import { GlassPanel } from './ui/GlassPanel';
import { OrderSummary } from './checkout/OrderSummary';
import { PaymentMethodTabs, type PaymentMethod } from './checkout/PaymentMethodTabs';
import { CardForm, type CardFormData } from './checkout/CardForm';
import { EwalletButtons, type EwalletMethod } from './checkout/EwalletButtons';

// Mirrors api/_lib/paymongo.ts PLAN_CATALOG. Server is the source of truth at intent-creation
// time; this is a fallback so the page can render before /api/billing/intent returns.
const PLAN_CATALOG = {
  creator: {
    name: 'Grifon Creator',
    description: '15 video workflows, 5 reports, 100 captions, 50 images.',
    monthly: 99_700,
    annual: 997_200,
  },
  pro: {
    name: 'Grifon Pro',
    description: '40 workflows, 15 reports, 300 captions, 150 images, 15 AI video ads.',
    monthly: 249_700,
    annual: 2_497_200,
  },
  business: {
    name: 'Grifon Business',
    description: '100 workflows, 40 reports, 500 captions, 300 images, 40 AI video ads.',
    monthly: 499_700,
    annual: 4_996_800,
  },
} as const;

type PlanId = keyof typeof PLAN_CATALOG;
type Cycle = 'monthly' | 'annual';

interface CheckoutPageProps {
  email: string | null;
  onBack: () => void;
}

const formatPHP = (centavos: number): string => {
  const pesos = centavos / 100;
  return `₱${pesos.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Inverse-VAT split: PLAN_CATALOG amounts are treated as VAT-inclusive going forward.
const splitVatInclusive = (totalCentavos: number) => {
  const subtotal = Math.round(totalCentavos / 1.12);
  const vat = totalCentavos - subtotal;
  return { subtotal, vat, total: totalCentavos };
};

const parseQuery = (): { planId: PlanId; cycle: Cycle } => {
  const params = new URLSearchParams(window.location.search);
  const rawPlan = params.get('plan');
  const rawCycle = params.get('cycle');
  const planId: PlanId = rawPlan === 'creator' || rawPlan === 'business' ? rawPlan : 'pro';
  const cycle: Cycle = rawCycle === 'annual' ? 'annual' : 'monthly';
  return { planId, cycle };
};

const CheckoutPage: React.FC<CheckoutPageProps> = ({ email, onBack }) => {
  const { planId, cycle } = useMemo(parseQuery, []);
  const plan = PLAN_CATALOG[planId];
  const total = cycle === 'annual' ? plan.annual : plan.monthly;
  const { subtotal, vat } = splitVatInclusive(total);
  const monthlyEquivalent = cycle === 'annual' ? Math.round(plan.annual / 12) : undefined;
  const monthlyComparisonSavings =
    cycle === 'annual' ? Math.max(0, plan.monthly * 12 - plan.annual) : undefined;

  const [activeMethod, setActiveMethod] = useState<PaymentMethod>('card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalLabel = `Pay ${formatPHP(total)}`;
  const cycleNoun = cycle === 'monthly' ? '30 days' : '1 year';
  const authorizationText = `By clicking Pay, you authorize Grifon Command to charge ${formatPHP(
    total
  )} to your selected payment method. This is a one-time payment for ${cycleNoun} of ${plan.name} access. We'll email you before renewal — your subscription does not auto-renew.`;

  const handleCardSubmit = (_data: CardFormData) => {
    setIsSubmitting(true);
    setError(null);
    setTimeout(() => {
      setIsSubmitting(false);
      setError(
        'Card processing is not yet wired — this is a visual preview. The next slice of the checkout redesign will activate live payment.'
      );
    }, 600);
  };

  const handleEwalletContinue = () => {
    setIsSubmitting(true);
    setError(null);
    setTimeout(() => {
      setIsSubmitting(false);
      setError(
        'E-wallet processing is not yet wired — this is a visual preview. The final slice of the redesign will activate GCash/Maya/GrabPay redirects.'
      );
    }, 600);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-8 lg:py-16 px-4 lg:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <OrderSummary
          planName={plan.name}
          cycle={cycle}
          description={plan.description}
          totalCentavos={total}
          subtotalCentavos={subtotal}
          vatCentavos={vat}
          monthlyEquivalentCentavos={monthlyEquivalent}
          monthlyComparisonSavingsCentavos={monthlyComparisonSavings}
          onBack={onBack}
        />

        <GlassPanel>
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">
            Contact information
          </p>
          <div className="bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 mb-6">
            <p className="text-zinc-300 text-sm">{email ?? 'Not signed in'}</p>
            <p className="text-[10px] text-zinc-500 mt-1">Receipt will be sent here</p>
          </div>

          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-3">
            Payment method
          </p>
          <div className="mb-6">
            <PaymentMethodTabs active={activeMethod} onChange={setActiveMethod} />
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs leading-relaxed">
              {error}
            </div>
          )}

          {activeMethod === 'card' ? (
            <CardForm
              onSubmit={handleCardSubmit}
              isSubmitting={isSubmitting}
              totalLabel={totalLabel}
              authorizationText={authorizationText}
            />
          ) : (
            <EwalletButtons
              active={activeMethod as EwalletMethod}
              onContinue={handleEwalletContinue}
              isSubmitting={isSubmitting}
              authorizationText={authorizationText}
            />
          )}
        </GlassPanel>
      </div>

      <p className="text-center text-zinc-600 text-xs mt-8">
        Powered by PayMongo &middot;{' '}
        <a href="/terms" className="hover:text-zinc-400 transition-colors">
          Terms
        </a>{' '}
        &middot;{' '}
        <a href="/privacy" className="hover:text-zinc-400 transition-colors">
          Privacy
        </a>
      </p>
    </div>
  );
};

export default CheckoutPage;
