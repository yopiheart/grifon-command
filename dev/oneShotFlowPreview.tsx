// DEV-ONLY visual harness for Fable 5's RECOVERED One-Shot "First Cut" review
// screen, mounted with MOCK data (previewMock.makePreviewRun) and NO orchestrator
// -> ZERO API spend. Served by Vite dev at /one-shot-flow-preview.html; NOT in the
// production rollup input, so it never ships.
//
// This is the preserved, no-API preview of Fable 5's original design (recovered from
// commit 91afea9 on the deleted feat/one-shot-ad-autopilot branch). The LIVE app uses
// a different One-Shot engine — see services/autopilotOrchestrator.ts for the note.
//
// Chrome is inline-styled (not Tailwind). The mounted FirstCutScreen uses real Tailwind
// classes, so one-shot-flow-preview.html replicates index.html's Tailwind CDN + config.
import { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { FirstCutScreen } from '../components/OneShotAd/FirstCutScreen';
import { makePreviewRun } from '../components/OneShotAd/previewMock';
import '../index.css';

const App = () => {
  const [reshooting, setReshooting] = useState<number | null>(null);
  const run = makePreviewRun('firstcut');

  return (
    <div style={{ minHeight: '100vh', background: '#09090b' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(9,9,11,0.9)',
          padding: '8px 16px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span style={{ fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFCC00' }}>
          Fable 5 First Cut (recovered)
        </span>
        <span style={{ fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#71717a' }}>
          · mock data · zero API
        </span>
      </div>

      <FirstCutScreen
        run={run}
        reshooting={reshooting}
        onReshoot={(i) => {
          setReshooting(i);
          window.setTimeout(() => setReshooting(null), 1200);
        }}
        onMakeAnother={() => window.alert('make another (mock)')}
      />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
