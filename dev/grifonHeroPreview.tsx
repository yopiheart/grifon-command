// DEV-ONLY harness for the HYBRID hero ad (Codex photo plate + real-font React
// overlay). Served by Vite at /grifon-hero-preview.html; not in the prod build.
//
// NOTE: the real no-text Codex plates were blocked by the daily Codex usage cap,
// so this demo points all three cards at assets/brand/zam-ref.jpg as a STAND-IN
// plate purely to prove the real-font overlay (wordmark/headline/CTA in true
// Inter + Instrument Serif). Swap `photoSrc` to the generated plates once the cap
// resets — the overlay is identical.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HeroAdCard, type HeadlineSegment } from '../components/grifon-ads/HeroAdCard';
import standInPlate from '../assets/brand/zam-ref.jpg';

const cards: { id: string; label: string; badge: string; headline: HeadlineSegment[]; cta: string }[] = [
  { id: 'hero-30min', label: 'First Ad In 30 Minutes (cold → Try It Free)', badge: 'START FREE', cta: 'Try It Free', headline: [{ t: 'First Ad In' }, { t: '30 Minutes', gold: true }] },
  { id: 'hero-agency', label: 'Fire Your Ad Agency (warm → Upgrade to Pro)', badge: 'AGENCY KILLER', cta: 'Upgrade to Pro', headline: [{ t: 'Fire Your' }, { t: 'Ad Agency', gold: true }] },
  { id: 'hero-autopilot', label: 'Marketing On Autopilot (invite → Apply)', badge: 'AUTOPILOT', cta: 'Apply for Autopilot', headline: [{ t: 'Marketing On' }, { t: 'Autopilot', gold: true, serif: true }] },
];

const App = () => (
  <div style={{ background: '#3f3f46', padding: 24, fontFamily: 'Inter, system-ui, sans-serif', color: '#fff' }}>
    <h1 style={{ fontSize: 16, marginBottom: 8 }}>Hybrid hero ads — REAL-font overlay proof (stand-in plate = zam-ref.jpg)</h1>
    <p style={{ fontSize: 12, opacity: 0.85, marginBottom: 20 }}>Typography is real Inter + Instrument Serif (identical every render). Swap photoSrc to the no-text Codex plates after the usage cap resets.</p>
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {cards.map((c) => (
        <div key={c.id}>
          <div style={{ fontSize: 12, fontFamily: 'monospace', marginBottom: 6, opacity: 0.85 }}>{`#shot-${c.id}`} — {c.label}</div>
          <div id={`shot-${c.id}`} style={{ display: 'block', width: 'fit-content', lineHeight: 0, fontSize: 0, overflow: 'hidden' }}>
            <HeroAdCard photoSrc={standInPlate} format="4:5" badge={c.badge} headline={c.headline} cta={c.cta} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
