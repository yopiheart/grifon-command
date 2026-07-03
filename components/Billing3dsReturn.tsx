import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { GlassPanel } from './ui/GlassPanel';
import { fetchStatus } from '../services/checkoutService';
import { initPixel, trackPixel } from '../services/metaPixel';
import { getPixelConsent } from '../services/analyticsService';

interface Props {
  onContinue: () => void;
  onRetry: () => void;
}

type Phase = 'polling' | 'succeeded' | 'failed';

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 20;

const Billing3dsReturn: React.FC<Props> = ({ onContinue, onRetry }) => {
  const [phase, setPhase] = useState<Phase>('polling');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Top-up purchases carry &topup=1 — the success copy must not claim a
  // subscription was activated (a Free user's plan is unchanged; only credits land).
  const isTopup =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('topup') === '1';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const intent_id = params.get('intent');
    if (!intent_id) {
      setPhase('failed');
      setErrorMessage('Missing payment reference. Please start over.');
      return;
    }

    let cancelled = false;

    const poll = async () => {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (cancelled) return;
        try {
          const result = await fetchStatus(intent_id);
          if (cancelled) return;
          if (result.status === 'succeeded') {
            // The 3DS/e-wallet path never reaches billing_success, so fire the
            // browser Purchase here. eventId byte-identical to api/webhook.ts's
            // `purchase:${intentId}` for CAPI dedup; the sessionStorage guard is
            // load-bearing (the 3DS return URL keeps ?intent= across refreshes).
            const guardKey = `grifon_purchase_fired:${intent_id}`;
            let alreadyFired = false;
            try { alreadyFired = sessionStorage.getItem(guardKey) === '1'; } catch {}
            if (!alreadyFired && getPixelConsent()?.granted) {
              initPixel();
              trackPixel('Purchase', { value: result.amount / 100, currency: 'PHP' }, `purchase:${intent_id}`);
              try { sessionStorage.setItem(guardKey, '1'); } catch {}
            }
            setPhase('succeeded');
            return;
          }
          if (
            result.status === 'awaiting_payment_method' ||
            result.status === 'awaiting_next_action'
          ) {
            setPhase('failed');
            setErrorMessage(
              result.last_payment_error?.message ?? 'Payment was not completed.'
            );
            return;
          }
          // status: 'processing' — keep polling
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        } catch (err: any) {
          if (cancelled) return;
          setPhase('failed');
          setErrorMessage(err?.message ?? 'Unable to verify payment status.');
          return;
        }
      }
      if (!cancelled) {
        setPhase('failed');
        setErrorMessage(
          'Payment is still processing after 40 seconds. Check your email for a receipt or try again.'
        );
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <GlassPanel className="max-w-md w-full text-center">
        {phase === 'polling' && (
          <>
            <Loader2 className="w-10 h-10 text-[#FFCC00] animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Verifying payment…</h1>
            <p className="text-zinc-400 text-sm">Hang tight — confirming with your bank.</p>
          </>
        )}
        {phase === 'succeeded' && (
          <>
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Payment confirmed</h1>
            <p className="text-zinc-400 text-sm mb-6">
              {isTopup
                ? 'Your extra video-ad credits are ready. Render away.'
                : 'Your subscription is active. Welcome to Grifon.'}
            </p>
            <button
              onClick={onContinue}
              className="w-full bg-[#FFCC00] text-black font-bold uppercase tracking-widest py-3 rounded-xl hover:shadow-[0_0_20px_rgba(255,204,0,0.4)] transition-all"
            >
              {isTopup ? 'Back to my ads' : 'Continue to Dashboard'}
            </button>
          </>
        )}
        {phase === 'failed' && (
          <>
            <XCircle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Payment didn't complete</h1>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              {errorMessage ?? 'Please try again.'}
            </p>
            <button
              onClick={onRetry}
              className="w-full bg-[#FFCC00] text-black font-bold uppercase tracking-widest py-3 rounded-xl hover:shadow-[0_0_20px_rgba(255,204,0,0.4)] transition-all"
            >
              Try again
            </button>
          </>
        )}
      </GlassPanel>
    </div>
  );
};

export default Billing3dsReturn;
