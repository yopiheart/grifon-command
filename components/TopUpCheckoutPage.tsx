import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Film, Loader2, Lock } from 'lucide-react';
import { GlassPanel } from './ui/GlassPanel';
import { GrifonMark } from './ui/GrifonMark';
import { GoldButton } from './ui/GoldButton';
import { PaymentMethodTabs, type PaymentMethod } from './checkout/PaymentMethodTabs';
import { CardForm, type CardFormData } from './checkout/CardForm';
import { EwalletButtons, type EwalletMethod } from './checkout/EwalletButtons';
import {
  fetchTopupIntent,
  formatPHP,
  processCardPayment,
  processEwalletPayment,
  type IntentResponse,
} from '../services/checkoutService';
import { TOPUPS, isTopUpId, type TopUpId } from '../config/topups';

interface TopUpCheckoutPageProps {
  email: string | null;
  /** Return to the app (dashboard / the render they came from). */
  onBack: () => void;
  onViewLegal?: (route: 'terms' | 'privacy') => void;
}

const parseTopupId = (): TopUpId | null => {
  const raw = new URLSearchParams(window.location.search).get('topup');
  return isTopUpId(raw) ? raw : null;
};

/**
 * Standalone top-up checkout (Slice 6c) — buys one-time finished-ad credits with
 * NO subscription. The ₱499 single-ad door for Free users and the overage door
 * for subscribers. Deliberately separate from CheckoutPage (the subscription
 * revenue path) so its plan/cycle/inclusions logic stays untouched; reuses the
 * shared card / e-wallet sub-components and the same checkoutService processors.
 */
const TopUpCheckoutPage: React.FC<TopUpCheckoutPageProps> = ({ email, onBack, onViewLegal }) => {
  const topupId = useMemo(parseTopupId, []);
  const display = topupId ? TOPUPS[topupId] : null;

  const [intent, setIntent] = useState<IntentResponse | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>('card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  useEffect(() => {
    if (!topupId) {
      setIntentError('That top-up is no longer available.');
      return;
    }
    let cancelled = false;
    fetchTopupIntent([topupId])
      .then((res) => {
        if (!cancelled) setIntent(res);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setIntentError(
          err.message === 'NOT_AUTHENTICATED'
            ? 'You need to sign in before buying credits.'
            : err.message ?? 'Could not start your purchase. Please try again.'
        );
      });
    return () => {
      cancelled = true;
    };
  }, [topupId]);

  const canSubmit = agreedToTerms && !!email;

  const handleCardSubmit = async (data: CardFormData) => {
    if (!intent || !email) {
      setSubmitError('You need to sign in before buying credits.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await processCardPayment(
        intent,
        {
          card_number: data.cardNumber,
          exp_month: parseInt(data.expMonth, 10),
          exp_year: parseInt(data.expYear, 10),
          cvc: data.cvc,
          cardholder_name: data.cardholderName,
          email,
        },
        { topup: true }
      );
      if (result.next_action?.redirect?.url) {
        window.location.href = result.next_action.redirect.url;
        return;
      }
      if (result.status === 'succeeded') {
        setSucceeded(true);
        return;
      }
      setSubmitError(
        result.last_payment_error?.message ??
          'Payment could not be completed. Try again or pick a different method — no charge has been made.'
      );
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Payment could not be completed. No charge has been made.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEwalletContinue = async () => {
    if (!intent || activeMethod === 'card') return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await processEwalletPayment(intent, activeMethod, { topup: true });
      if (result.next_action?.redirect?.url) {
        window.location.href = result.next_action.redirect.url;
        return;
      }
      if (result.status === 'succeeded') {
        setSucceeded(true);
        return;
      }
      setSubmitError(
        result.last_payment_error?.message ??
          'E-wallet payment could not start. Try again or pick a different method — no charge has been made.'
      );
    } catch (err: any) {
      setSubmitError(err?.message ?? 'E-wallet payment could not start. No charge has been made.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (intentError) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <GlassPanel className="max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-white mb-3">Couldn't start your purchase</h1>
          <p className="text-zinc-400 text-sm mb-6">{intentError}</p>
          <GoldButton onClick={onBack} className="w-full justify-center py-3">
            Back to my ads
          </GoldButton>
        </GlassPanel>
      </div>
    );
  }

  if (succeeded && display) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <GlassPanel className="max-w-md w-full text-center p-10">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Credits added</h1>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            {display.credits} extra finished-ad {display.credits === 1 ? 'credit is' : 'credits are'} now on
            your account. Render away.
          </p>
          <GoldButton onClick={onBack} className="w-full justify-center py-3" glossy>
            Back to my ads
          </GoldButton>
          {email && <p className="text-[10px] text-zinc-600 mt-4">Receipt sent to {email}</p>}
        </GlassPanel>
      </div>
    );
  }

  if (!intent || !display) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader2 className="w-5 h-5 text-[#FFCC00] animate-spin" />
          <span className="text-sm">Preparing your top-up…</span>
        </div>
      </div>
    );
  }

  const { breakdown } = intent;
  const totalLabel = `Pay ${formatPHP(breakdown.total_centavos)}`;
  const authorizationText = `By clicking the button above, you authorize Grifon Command to charge ${formatPHP(
    breakdown.total_centavos
  )} to your selected payment method. This is a one-time purchase of ${display.credits} finished-ad ${
    display.credits === 1 ? 'credit' : 'credits'
  } — not a subscription. Credits don't expire.`;

  const termsCheckbox = (
    <label className="flex items-start gap-2.5 cursor-pointer select-none">
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
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(#FFCC00 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FFCC00]/70 to-transparent shadow-[0_0_18px_2px_rgba(255,204,0,0.25)]" />
      </div>

      <div className="relative max-w-6xl mx-auto flex items-center justify-between mb-6 lg:mb-10">
        <div className="flex items-center gap-2">
          <GrifonMark className="h-9 w-9" />
          <span className="text-white font-black italic text-lg tracking-tight">GRIFON</span>
        </div>
        <p className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500">
          <Lock className="w-3.5 h-3.5 shrink-0 text-[#FFCC00]" />
          Secure checkout
        </p>
      </div>

      <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Compact top-up summary — no plan, no cycle, no inclusions. */}
        <GlassPanel className="lg:sticky lg:top-8 self-start">
          <button onClick={onBack} className="text-zinc-500 hover:text-white transition-colors mb-6 text-sm">
            ← Back to my ads
          </button>
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">One-time top-up</p>
          <h1 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Film className="w-5 h-5 text-[#FFCC00] shrink-0" /> {display.name}
          </h1>
          <p className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500 leading-none mb-2">
            {formatPHP(breakdown.total_centavos)}
          </p>
          <p className="text-zinc-400 text-sm mb-6">{display.blurb}</p>

          <div className="border-t border-white/10 my-6" />
          <div className="flex items-center gap-2 rounded-lg border border-[#FFCC00]/25 bg-[#FFCC00]/5 px-3 py-2.5 text-sm text-zinc-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#FFCC00]" />
            <span>
              Adds <span className="font-semibold text-[#FFCC00]">{display.credits}</span> finished-ad{' '}
              {display.credits === 1 ? 'credit' : 'credits'} — used automatically once your monthly ads run out.
            </span>
          </div>

          <div className="border-t border-dashed border-white/25 my-6" />
          <div className="flex justify-between items-baseline font-mono">
            <span className="text-[11px] text-zinc-300 uppercase tracking-[0.2em]">Total due today</span>
            <span className="text-2xl font-bold text-white tracking-tight">
              <span className="text-[#FFCC00]">&#8369;</span>
              {(breakdown.total_centavos / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-2 text-right text-[10px] font-mono uppercase tracking-widest text-zinc-600">
            // One-time payment · 12% VAT included
          </p>
        </GlassPanel>

        <GlassPanel>
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">Contact information</p>
          <div className="bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 mb-6">
            <p className="text-zinc-300 text-sm">{email ?? 'Not signed in'}</p>
            <p className="text-[10px] text-zinc-500 mt-1">Receipt will be sent here</p>
          </div>

          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-3">Payment method</p>
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
    </div>
  );
};

export default TopUpCheckoutPage;
