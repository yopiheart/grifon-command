import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { GlassPanel } from './ui/GlassPanel';
import { MessengerFloat } from './ui/MessengerFloat';
import { RecentActivityToast } from './ui/RecentActivityToast';
import { OrderSummary } from './checkout/OrderSummary';
import { PaymentMethodTabs, type PaymentMethod } from './checkout/PaymentMethodTabs';
import { CardForm, type CardFormData } from './checkout/CardForm';
import { EwalletButtons, type EwalletMethod } from './checkout/EwalletButtons';
import {
  fetchIntent,
  formatPHP,
  processCardPayment,
  processEwalletPayment,
  loadCheckoutDraft,
  saveCheckoutDraft,
  clearCheckoutDraft,
  type IntentResponse,
  type PlanId,
  type BillingCycle,
} from '../services/checkoutService';
import { ORDER_BUMP } from '../config/checkout';
import { PLAN_FEATURES } from '../config/planFeatures';

interface CheckoutPageProps {
  email: string | null;
  onBack: () => void;
  /** Open the Terms / Privacy page in-app, preserving checkout state for the return trip. */
  onViewLegal?: (route: 'terms' | 'privacy') => void;
}

const parseQuery = (): { planId: PlanId; cycle: BillingCycle } => {
  const params = new URLSearchParams(window.location.search);
  const rawPlan = params.get('plan');
  const rawCycle = params.get('cycle');
  const planId: PlanId =
    rawPlan === 'creator' || rawPlan === 'business' ? rawPlan : 'pro';
  const cycle: BillingCycle = rawCycle === 'annual' ? 'annual' : 'monthly';
  return { planId, cycle };
};

const CheckoutPage: React.FC<CheckoutPageProps> = ({ email, onBack, onViewLegal }) => {
  const { planId, cycle: initialCycle } = useMemo(parseQuery, []);
  // Restore any draft so a trip to Terms / Privacy (or a refresh) doesn't wipe entries.
  const draft = useMemo(loadCheckoutDraft, []);
  // Cycle is lifted into state so the in-checkout monthly↔annual toggle can re-fetch the intent.
  const [cycle, setCycle] = useState<BillingCycle>(draft?.cycle ?? initialCycle);
  const [intent, setIntent] = useState<IntentResponse | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>('card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phone, setPhone] = useState(draft?.phone ?? '');
  const [agreedToTerms, setAgreedToTerms] = useState(draft?.agreedToTerms ?? false);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(draft?.selectedAddOns ?? []);

  // Persist non-sensitive selections so "Back to checkout" restores them. Card data is never stored.
  useEffect(() => {
    saveCheckoutDraft({ phone, agreedToTerms, selectedAddOns, cycle });
  }, [phone, agreedToTerms, selectedAddOns, cycle]);

  const toggleAddOn = () =>
    setSelectedAddOns((prev) =>
      prev.includes(ORDER_BUMP.id) ? prev.filter((id) => id !== ORDER_BUMP.id) : [...prev, ORDER_BUMP.id]
    );

  // Gate on terms agreed + a contact number entered (basic PH length check).
  const canSubmit = agreedToTerms && phone.replace(/\D/g, '').length >= 10;

  // Intents cached per cycle+add-ons so the monthly↔annual toggle swaps prices instantly
  // instead of waiting on a fresh server round-trip. Math stays server-authoritative —
  // every cached entry is a real server-issued intent for exactly that combination.
  const intentCache = useRef<Map<string, IntentResponse>>(new Map());
  const intentKey = (c: BillingCycle, addOns: string[]) => `${c}|${[...addOns].sort().join(',')}`;

  useEffect(() => {
    let cancelled = false;
    setIntentError(null);
    const key = intentKey(cycle, selectedAddOns);
    const cached = intentCache.current.get(key);
    if (cached) {
      setIntent(cached);
    } else {
      fetchIntent(planId, cycle, selectedAddOns)
        .then((res) => {
          intentCache.current.set(key, res);
          if (!cancelled) setIntent(res);
        })
        .catch((err: Error) => {
          if (cancelled) return;
          if (err.message === 'NOT_AUTHENTICATED') {
            setIntentError('You need to sign in before checking out.');
          } else {
            setIntentError(err.message ?? 'Could not start your checkout. Please try again.');
          }
        });
    }
    // Warm the opposite cycle in the background so the first toggle is also instant.
    // A miss here is non-fatal — the toggle just falls back to a live fetch.
    const otherCycle: BillingCycle = cycle === 'monthly' ? 'annual' : 'monthly';
    const otherKey = intentKey(otherCycle, selectedAddOns);
    if (!intentCache.current.has(otherKey)) {
      fetchIntent(planId, otherCycle, selectedAddOns)
        .then((res) => {
          intentCache.current.set(otherKey, res);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [planId, cycle, selectedAddOns]);

  const handleCardSubmit = async (data: CardFormData) => {
    if (!intent) return;
    if (!email) {
      setSubmitError('You need to sign in before checking out.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await processCardPayment(intent, {
        card_number: data.cardNumber,
        exp_month: parseInt(data.expMonth, 10),
        exp_year: parseInt(data.expYear, 10),
        cvc: data.cvc,
        cardholder_name: data.cardholderName,
        email,
        phone: phone.trim() || undefined,
      });

      if (result.next_action?.redirect?.url) {
        window.location.href = result.next_action.redirect.url;
        return;
      }

      if (result.status === 'succeeded') {
        clearCheckoutDraft();
        window.location.href = '/billing/success';
        return;
      }

      setSubmitError(
        result.last_payment_error?.message ??
          'Payment could not be completed. Try again or pick a different method — no charge has been made.'
      );
    } catch (err: any) {
      setSubmitError(
        err?.message ??
          'Payment could not be completed. Try again or pick a different method — no charge has been made.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEwalletContinue = async () => {
    if (!intent) return;
    if (activeMethod === 'card') return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await processEwalletPayment(intent, activeMethod);
      if (result.next_action?.redirect?.url) {
        window.location.href = result.next_action.redirect.url;
        return;
      }
      if (result.status === 'succeeded') {
        clearCheckoutDraft();
        window.location.href = '/billing/success';
        return;
      }
      setSubmitError(
        result.last_payment_error?.message ??
          'E-wallet payment could not start. Try again or pick a different method — no charge has been made.'
      );
    } catch (err: any) {
      setSubmitError(
        err?.message ??
          'E-wallet payment could not start. Try again or pick a different method — no charge has been made.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (intentError) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <GlassPanel className="max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-white mb-3">Checkout couldn't start</h1>
          <p className="text-zinc-400 text-sm mb-6">{intentError}</p>
          <button
            onClick={onBack}
            className="w-full bg-[#FFCC00] text-black font-bold uppercase tracking-widest py-3 rounded-xl hover:shadow-[0_0_20px_rgba(255,204,0,0.4)] transition-all"
          >
            Back to plans
          </button>
        </GlassPanel>
      </div>
    );
  }

  if (!intent) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader2 className="w-5 h-5 text-[#FFCC00] animate-spin" />
          <span className="text-sm">Preparing your checkout…</span>
        </div>
      </div>
    );
  }

  const { breakdown } = intent;
  const totalLabel = `Unlock ${intent.plan.name} — ${formatPHP(breakdown.total_centavos)}`;
  const cycleNoun = cycle === 'monthly' ? '30 days' : '1 year';
  const outcomeCycle = cycle === 'monthly' ? 'an entire month' : 'an entire year';
  const outcomeDescription = `Replaces your marketing agency. End-to-end: research, offer, scripts, AI video ads, captions, and images — for ${outcomeCycle}. Walang ₱30K agency, walang freelancer.`;
  const authorizationText = `By clicking the button above, you authorize Grifon Command to charge ${formatPHP(
    breakdown.total_centavos
  )} to your selected payment method. This is a one-time payment for ${cycleNoun} of ${intent.plan.name} access. We'll email you before renewal — your subscription does not auto-renew.`;

  // Rendered directly above the Pay button (in both card + e-wallet modes) so the tick stays in view.
  // Legal links open in-app (onViewLegal) so the buyer returns to a fully-restored checkout.
  const termsCheckbox = (
    <label className="terms-consent flex items-start gap-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={agreedToTerms}
        onChange={(e) => setAgreedToTerms(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-zinc-950 accent-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]"
      />
      <span className="text-xs text-zinc-400 leading-relaxed">
        I agree to the{' '}
        <button type="button" onClick={() => onViewLegal?.('terms')} className="text-[#FFCC00] hover:underline align-baseline">Terms of Service</button>{' '}
        and have read the{' '}
        <button type="button" onClick={() => onViewLegal?.('privacy')} className="text-[#FFCC00] hover:underline align-baseline">Privacy Policy</button>.
      </span>
    </label>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-6 lg:py-10 px-4 lg:px-8 relative">
      {/* Command-environment backdrop — same family as the auth gateway */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(#FFCC00 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FFCC00]/70 to-transparent shadow-[0_0_18px_2px_rgba(255,204,0,0.25)]" />
      </div>

      {/* Secure-checkout masthead — brand + trust at the anxiety moment */}
      <div className="relative max-w-6xl mx-auto flex items-center justify-between mb-6 lg:mb-10">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="GRIFON Logo" className="h-7 w-auto object-contain" />
          <span className="text-white font-black italic text-lg tracking-tight">GRIFON</span>
        </div>
        <p className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">
          <Lock className="w-3.5 h-3.5 shrink-0 text-[#FFCC00]" />
          Secure checkout
        </p>
      </div>

      <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <OrderSummary
          planName={intent.plan.name}
          cycle={cycle}
          description={outcomeDescription}
          inclusions={PLAN_FEATURES[planId]}
          totalCentavos={breakdown.total_centavos}
          subtotalCentavos={breakdown.subtotal_centavos}
          vatCentavos={breakdown.vat_centavos}
          monthlyEquivalentCentavos={breakdown.monthly_equivalent_centavos ?? undefined}
          monthlyComparisonSavingsCentavos={breakdown.annual_savings_centavos ?? undefined}
          onCycleChange={setCycle}
          reservationKey={`${planId}`}
          addOnSelected={selectedAddOns.includes(ORDER_BUMP.id)}
          addOnCentavos={breakdown.add_on_centavos}
          onToggleAddOn={toggleAddOn}
          onBack={onBack}
        />

        <GlassPanel>
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">
            Contact information
          </p>
          <div className="bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 mb-4">
            <p className="text-zinc-300 text-sm">{email ?? 'Not signed in'}</p>
            <p className="text-[10px] text-zinc-500 mt-1">Receipt will be sent here</p>
          </div>

          <div className="mb-6">
            <label htmlFor="checkout-phone" className="block text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">
              Contact number
            </label>
            <input
              id="checkout-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="09XX XXX XXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]"
              required
            />
            <p className="text-[10px] text-zinc-500 mt-1.5">For order updates and support via Viber / SMS.</p>
          </div>

          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-3">
            Payment method
          </p>
          <div className="mb-6">
            <PaymentMethodTabs active={activeMethod} onChange={setActiveMethod} />
          </div>

          {submitError && (
            <div className="mb-4 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs leading-relaxed">
              {submitError}
            </div>
          )}

          {activeMethod === 'card' ? (
            <CardForm
              onSubmit={handleCardSubmit}
              isSubmitting={isSubmitting}
              totalLabel={totalLabel}
              authorizationText={authorizationText}
              submitDisabled={!canSubmit}
              termsSlot={termsCheckbox}
            />
          ) : (
            <EwalletButtons
              active={activeMethod as EwalletMethod}
              onContinue={handleEwalletContinue}
              isSubmitting={isSubmitting}
              authorizationText={authorizationText}
              submitDisabled={!canSubmit}
              termsSlot={termsCheckbox}
            />
          )}
        </GlassPanel>
      </div>

      {/* Payment trust strip — every badge is a real capability, no fake marks */}
      <div className="relative max-w-6xl mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
        <span className="flex items-center gap-1.5"><Lock className="w-3 h-3 shrink-0 text-[#FFCC00]" /> 256-bit SSL</span>
        <span className="text-zinc-700">·</span>
        <span>Powered by PayMongo</span>
        <span className="text-zinc-700">·</span>
        <span>GCash</span>
        <span className="text-zinc-700">·</span>
        <span>Maya</span>
        <span className="text-zinc-700">·</span>
        <span>Visa</span>
        <span className="text-zinc-700">·</span>
        <span>Mastercard</span>
      </div>
      <p className="relative text-center text-zinc-600 text-xs mt-3">
        <button type="button" onClick={() => onViewLegal?.('terms')} className="hover:text-zinc-400 transition-colors">
          Terms
        </button>{' '}
        &middot;{' '}
        <button type="button" onClick={() => onViewLegal?.('privacy')} className="hover:text-zinc-400 transition-colors">
          Privacy
        </button>
      </p>

      <RecentActivityToast />
      <MessengerFloat side="right" />
    </div>
  );
};

export default CheckoutPage;
