import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "./ui/SiteHeader";
import { SegButton } from "./ui/SegButton";
import { GlassPanel } from "./ui/GlassPanel";
import { GoldButton } from "./ui/GoldButton";
import { startCheckout, type PlanId, type BillingCycle } from "../services/billingService";
import { PLAN_FEATURES } from "../config/planFeatures";

type LegalRoute = 'terms' | 'privacy' | 'refund' | 'support';
const plans = [
  { id: 'free', name: 'Free', monthly: '0', annual: '0', annualTotal: '', description: 'See your ad take shape before you pay.', volume: '1 ad-plan preview a month' },
  { id: 'starter', name: 'Starter', monthly: '997', annual: '831', annualTotal: '9,972', description: 'Make your first finished video ad.', volume: '1 finished video ad a month' },
  { id: 'pro', name: 'Pro', monthly: '2,497', annual: '2,081', annualTotal: '24,972', description: 'Create more ads. Take more creative control.', volume: '8 finished video ads a month' },
  { id: 'business', name: 'Business', monthly: '4,997', annual: '4,164', annualTotal: '49,968', description: 'A higher output for a growing business.', volume: '15 finished video ads a month' },
] as const;
const faqs = [
  { q: 'What can I make for free?', a: 'Preview one ad plan each month: research, script, storyboard, avatar and thumbnail. No credit card is needed. Finished video creation is paid.' },
  { q: 'Which paid plan should I choose?', a: 'Starter includes one finished video ad a month. Pro includes eight, with the AI video editor and Director mode. Business includes fifteen and the additional capabilities listed above. Choose based on how many ads you need to create.' },
  { q: 'How does annual billing work?', a: 'Annual prices show the monthly equivalent. You pay the full annual amount shown on your card at checkout. Your video allowance is still monthly.' },
  { q: 'How do I pay?', a: 'Checkout supports cards, GCash, Maya and GrabPay through PayMongo. Review the full amount and payment terms before you pay.' },
];

export default function GrifonPricing({ onEnterApp, onNavigateHome, onNavigateLegal }: { onEnterApp: () => void, onNavigateHome: () => void, onNavigateLegal: (page: LegalRoute) => void }) {
  const [billing, setBilling] = useState('monthly');
  const [isCheckingOut, setIsCheckingOut] = useState<PlanId | null>(null);
  const PLAN_IDS: Array<'free' | PlanId> = ['free', 'starter', 'pro', 'business'];
  const handleCtaClick = async (index: number) => {
    const planId = PLAN_IDS[index];
    if (planId === 'free') {
      onEnterApp();
      return;
    }
    const cycle: BillingCycle = billing === 'annual' ? 'annual' : 'monthly';
    setIsCheckingOut(planId);
    try {
      await startCheckout(planId, cycle);
    } catch (err: any) {
      if (err?.message === 'NOT_AUTHENTICATED') {
        toast.info('Sign in to continue', { description: 'We’ll resume your upgrade after you sign in.' });
        onEnterApp();
      } else {
        toast.error('Checkout failed', { description: err?.message ?? 'Please try again.' });
      }
    } finally {
      setIsCheckingOut(null);
    }
  };

  return (
    <div className="pricing-page public-purchase min-h-screen bg-zinc-950 text-white font-sans relative overflow-x-clip">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[700px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,204,0,0.08),transparent_65%)]" />
      <SiteHeader onEnterApp={onEnterApp} navLinks={[{ label: 'Home', onClick: onNavigateHome }]} onLogoClick={onNavigateHome} showLogin={false} ctaLabel="Build my free ad plan" />
      <main className="relative max-w-[1440px] mx-auto px-4 sm:px-8">
        <section className="py-16 md:py-24 text-center" aria-labelledby="pricing-title">
          <p className="text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel mb-6">Plans for your next ad</p>
          <h1 id="pricing-title" className="purchase-display bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500 text-4xl md:text-6xl leading-[1.08] tracking-tight mb-6">You run the business.<br />Make room for better ads.</h1>
          <p className="text-base md:text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">For Filipino owners doing their own marketing, or working with a small team. Start with a free ad-plan preview. Choose a paid plan when you need finished videos.</p>
        </section>
        <section aria-label="Compare plans" className="pb-16 md:pb-24">
          <div className="flex flex-col items-center gap-4 mb-10">
            <SegButton variant="marketing" value={billing} onChange={setBilling} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Annual' }]} />
            <p className="text-xs text-zinc-400 text-center">{billing === 'annual' ? 'Monthly equivalents below. Paid annually in one payment.' : 'Start free. Paid plans are priced in Philippine pesos.'}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 items-stretch">
            {plans.map((plan, index) => {
              const isPro = plan.id === 'pro';
              const features = plan.id === 'free' ? ['Research, script & storyboard', 'Avatar & thumbnail preview', 'No credit card needed', 'Finished video creation is paid'] : PLAN_FEATURES[plan.id].slice(1);
              const label = plan.id === 'free' ? 'Build my free ad plan' : 'Choose ' + plan.name;
              return (
                <GlassPanel key={plan.id} className={'p-6 lg:p-7 flex flex-col relative min-w-0 ' + (isPro ? 'border-[#FFCC00]/50 bg-[#FFCC00]/[0.04]' : '')}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                    <h2 className="text-xl text-white">{plan.name}</h2>
                    {isPro && <span className="text-xs text-[#FFCC00]">More creative control</span>}
                  </div>
                  <p className="text-4xl tracking-tight text-white tabular-nums font-semibold">₱{billing === 'annual' ? plan.annual : plan.monthly}<span className="text-sm font-normal text-zinc-400">{plan.id === 'free' ? '' : '/mo'}</span></p>
                  <p className="text-xs text-zinc-400 mt-2 min-h-5">{plan.id === 'free' ? 'Free, no card required' : billing === 'annual' ? '₱' + plan.annualTotal + ' billed annually' : 'Billed monthly'}</p>
                  <p className="text-sm leading-relaxed text-zinc-400 mt-5 mb-6 md:min-h-12">{plan.description}</p>
                  {isPro ? (
                    <GoldButton onClick={() => handleCtaClick(index)} disabled={isCheckingOut !== null} className="min-h-12 w-full mb-7 disabled:opacity-50">{isCheckingOut === plan.id ? 'Redirecting…' : label}</GoldButton>
                  ) : (
                    <button onClick={() => handleCtaClick(index)} disabled={isCheckingOut !== null} className="min-h-12 px-4 w-full mb-7 rounded-full bg-zinc-950 border border-white/10 text-zinc-300 hover:text-white hover:border-[#FFCC00] transition-colors disabled:opacity-50 text-sm">{isCheckingOut === plan.id ? 'Redirecting…' : label}</button>
                  )}
                  <div className="border-t border-white/10 pt-6">
                    <p className="text-sm text-white font-semibold mb-4">{plan.volume}</p>
                    <ul className="space-y-3">
                      {features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300 leading-relaxed"><Check aria-hidden="true" className="w-4 h-4 mt-0.5 shrink-0 text-[#FFCC00]" /><span>{feature}</span></li>)}
                    </ul>
                  </div>
                </GlassPanel>
              );
            })}
          </div>
        </section>
        <section className="max-w-3xl mx-auto pb-16 md:pb-24" aria-labelledby="pricing-faq">
          <h2 id="pricing-faq" className="text-3xl md:text-4xl tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">Before you choose.</h2>
          {faqs.map((faq) => (
            <details key={faq.q} className="group border-b border-white/10">
              <summary className="flex min-h-16 items-center justify-between gap-4 py-5 cursor-pointer list-none text-base text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFCC00]">{faq.q}<ChevronDown aria-hidden="true" className="w-4 h-4 shrink-0 text-[#FFCC00] transition-transform group-open:rotate-180" /></summary>
              <p className="pb-6 pr-6 text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
            </details>
          ))}
          <p className="mt-6 text-sm text-zinc-400">Need help deciding? <button onClick={() => onNavigateLegal('support')} className="inline-flex min-h-11 items-center text-zinc-200 underline underline-offset-4 hover:text-[#FFCC00]">Contact support</button>. Read our <button onClick={() => onNavigateLegal('refund')} className="inline-flex min-h-11 items-center text-zinc-200 underline underline-offset-4 hover:text-[#FFCC00]">refund policy</button> before purchasing.</p>
        </section>
        <section className="border-t border-white/10 py-16 md:py-24 text-center">
          <h2 className="text-3xl md:text-5xl tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500 mb-5">Start with your next ad.</h2>
          <p className="text-zinc-400 text-base mb-8">One ad-plan preview a month. No credit card. Finished videos are paid.</p>
          <GoldButton onClick={onEnterApp} className="min-h-12 px-8">Build my free ad plan</GoldButton>
        </section>
      </main>
      <footer className="relative border-t border-white/10 px-4 py-8 text-center text-xs text-zinc-400">
        <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-6 mb-3">{(['terms', 'privacy', 'refund', 'support'] as const).map((route) => <a key={route} href={'/' + route} onClick={(event) => { event.preventDefault(); onNavigateLegal(route); }} className="min-h-11 inline-flex items-center capitalize hover:text-[#FFCC00]">{route}</a>)}</nav>
        GRIFON AI © 2026 · Haste Enterprises · Built in the Philippines
      </footer>
    </div>
  );
}
