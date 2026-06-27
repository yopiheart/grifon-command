// DEV-ONLY visual harness for the Image Ads Gen composited cards. Imports the
// REAL NicheCalloutCard / SaasOfferCard + resolveAdTheme so the screenshots
// reflect production rendering, not a mock. Served by Vite dev at /ad-preview.html;
// NOT in the production rollup input, so it never ships. Used to re-smoke contrast
// for the v2 redesign (workflows/image_ads_design_system.md).
import React from 'react';
import ReactDOM from 'react-dom/client';
import { NicheCalloutCard } from '../components/imageads/NicheCalloutCard';
import { SaasOfferCard } from '../components/imageads/SaasOfferCard';
import { resolveAdTheme, AD_STYLE_PRESETS, type AdTheme } from '../utils/adTheme';
import type { AdVariant, AdComposition } from '../types';
import '../index.css';

const callout: AdComposition = {
  niche: 'coffee shop owner',
  qualifier: 'doing 100+ cups a day',
  leadMagnet: 'Barako Growth Playbook',
};

const saasVariants: AdVariant[] = [
  { id: 1, templateType: 'Guarantee Hero', headline: 'First ad live in 24h — or your month is free.', imagePrompt: '', caption: '', hookLogic: '', composition: { guarantee: '30-day money-back, no questions asked.', ctaLabel: 'Upgrade now', badge: '24H GUARANTEE' } },
  { id: 2, templateType: 'Ticket Compare', headline: 'CHOOSE YOUR LEVEL', imagePrompt: '', caption: '', hookLogic: '', composition: { tiers: [{ name: 'Free', lines: ['1 ad / day', 'Watermarked export'], highlight: false }, { name: 'Pro', lines: ['Unlimited ads', 'HD, no watermark', 'Priority render'], highlight: true }], ctaLabel: 'Go Pro' } },
  { id: 3, templateType: 'Offer Stack Checklist', headline: 'Everything you need to launch.', imagePrompt: '', caption: '', hookLogic: '', composition: { bullets: ['Ad script', 'Storyboard', 'Voiceover', 'Caption pack'], guarantee: 'Penny-back guarantee', ctaLabel: 'Upgrade' } },
];

interface Scenario { label: string; brand: string; theme: AdTheme; }
const scenarios: Scenario[] = [
  ...AD_STYLE_PRESETS.map((p) => ({ label: `PRESET · ${p.label}`, brand: p.label, theme: resolveAdTheme({ presetId: p.id }) })),
  { label: 'MY BRAND COLORS · DARK (Barako brown #3B2417)', brand: 'Kapeng Barako', theme: resolveAdTheme({ hexCodes: '#3B2417' }) },
  { label: 'MY BRAND COLORS · BRIGHT (sky #1FA9E0)', brand: 'AquaFresh', theme: resolveAdTheme({ hexCodes: '#1FA9E0' }) },
  { label: 'NO BRAND COLOR · clean default', brand: 'Generic Co', theme: resolveAdTheme({}) },
];

const S = 0.25; // scale 1080px cards down for the gallery
const Scaled: React.FC<{ w?: number; h?: number; children: React.ReactNode }> = ({ w = 1080, h = 1350, children }) => (
  <div style={{ width: w * S, height: h * S, overflow: 'hidden', borderRadius: 8, boxShadow: '0 0 0 1px rgba(255,255,255,0.15)' }}>
    <div style={{ transform: `scale(${S})`, transformOrigin: 'top left', width: w, height: h }}>{children}</div>
  </div>
);

const App = () => (
  <div style={{ background: '#52525b', minHeight: '100vh', padding: 24, fontFamily: 'Inter, system-ui, sans-serif', color: '#fff' }}>
    <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Image Ads Gen — v2 contrast re-smoke</h1>
    <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 24 }}>Each row: Niche Callout + SaaS-Upsell (Guarantee Hero / Ticket Compare / Offer Stack), 4:5. Proves contrast holds for presets, a DARK brand, a BRIGHT brand, and no-color default.</p>
    {scenarios.map((s) => (
      <div key={s.label} style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'monospace' }}>{s.label}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Scaled><NicheCalloutCard composition={callout} aspectRatio="4:5" theme={s.theme} brandName={s.brand} /></Scaled>
          {saasVariants.map((v) => (
            <Scaled key={v.id}><SaasOfferCard variant={v} aspectRatio="4:5" theme={s.theme} brandName={s.brand} /></Scaled>
          ))}
        </div>
      </div>
    ))}
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
