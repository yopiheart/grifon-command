// DEV-ONLY harness: renders Grifon self-promo React→PNG creatives (text-only
// niche callouts + old-way/new-way comparisons) at TRUE export resolution so a
// screenshotter can capture each card element pixel-perfect. Served by Vite dev
// at /grifon-ads-preview.html; not in the production build.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { CalloutCard } from '../components/grifon-ads/CalloutCard';
import { ComparisonCard } from '../components/grifon-ads/ComparisonCard';

// Old-way vs new-way bullets. Landing variant keeps prices (price is licensed on
// landing pages); paid-ad variant drops OUR price but keeps the ₱30K agency
// anchor + "99% cheaper" (no own-price in paid creatives — CMO rule).
const OLD_LANDING = ['₱5,000/video freelancer', '4-5 apps open at once', '6+ hours per ad creative', 'Generic ChatGPT scripts', 'No market research', 'No strategy, just guessing', '₱30K+/month agency'];
const NEW_LANDING = ['8 video ads/mo for ₱2,497', 'Everything in ONE app', '30 minutes per campaign', 'AI scripts, proven frameworks', 'Deep market research built in', 'Offer optimization + strategy calls', '99% cheaper than an agency'];
const OLD_AD = ['A freelancer per video', '4-5 apps open at once', '6+ hours per ad creative', 'Generic ChatGPT scripts', 'No market research', 'No strategy, just guessing', '₱30K+/month agency'];
const NEW_AD = ['8 finished ads a month', 'Everything in ONE app', '30 minutes per campaign', 'AI scripts, proven frameworks', 'Deep market research built in', 'Offer optimization + strategy calls', '99% cheaper than an agency'];

const shots: { id: string; label: string; node: React.ReactNode }[] = [
  { id: 'callout-ecom', label: 'Niche callout — ecom (4:5)', node: <CalloutCard format="4:5" badge="ECOM SELLERS" preLine="Para Sa" accentLine="Online Sellers" /> },
  { id: 'callout-beauty', label: 'Niche callout — beauty (4:5)', node: <CalloutCard format="4:5" badge="SKINCARE + BEAUTY" preLine="Para Sa" accentLine="Beauty Brands" /> },
  { id: 'callout-food', label: 'Niche callout — food (4:5)', node: <CalloutCard format="4:5" badge="FOOD + RESTO" preLine="Para Sa" accentLine="Food Business" /> },
  { id: 'compare-landing', label: 'Old vs New — LANDING variant, price in (1:1)', node: <ComparisonCard format="1:1" oldItems={OLD_LANDING} newItems={NEW_LANDING} cta="Try It Free" /> },
  { id: 'compare-ad', label: 'Old vs New — PAID-AD variant, own price out (1:1)', node: <ComparisonCard format="1:1" oldItems={OLD_AD} newItems={NEW_AD} cta="Try It Free" /> },
];

const App = () => (
  <div style={{ background: '#3f3f46', padding: 24, fontFamily: 'Inter, system-ui, sans-serif', color: '#fff' }}>
    <h1 style={{ fontSize: 16, marginBottom: 16 }}>Grifon self-promo React→PNG creatives — screenshot each #shot-&lt;id&gt; at full resolution</h1>
    {shots.map((s) => (
      <div key={s.id} style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontFamily: 'monospace', marginBottom: 6, opacity: 0.85 }}>{`#shot-${s.id}`} — {s.label}</div>
        <div id={`shot-${s.id}`} style={{ display: 'block', width: 'fit-content', lineHeight: 0, fontSize: 0, overflow: 'hidden' }}>{s.node}</div>
      </div>
    ))}
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
