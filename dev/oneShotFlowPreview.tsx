// DEV-ONLY visual harness for Fable 5's RECOVERED One-Shot flow screens — the
// Running "building your ad" screen (live scene gallery) and the First Cut review
// screen — mounted with MOCK data (previewMock.makePreviewRun) and NO orchestrator
// -> ZERO API spend. Served by Vite dev at /one-shot-flow-preview.html; NOT in the
// production rollup input, so it never ships.
//
// These are the preserved, no-API preview of Fable 5's original design (recovered from
// commit 91afea9 on the deleted feat/one-shot-ad-producer branch). The LIVE app uses
// a different One-Shot engine — see services/producerOrchestrator.ts for the note.
// Fable 5's RunningScreen is preserved as RunningScreen.fable5.tsx so it doesn't clobber
// main's current live RunningScreen.tsx (a different, stages-based variant).
//
// Chrome is inline-styled (not Tailwind). The mounted screens use real Tailwind classes,
// so one-shot-flow-preview.html replicates index.html's Tailwind CDN + config.
import { useState, type CSSProperties } from 'react';
import ReactDOM from 'react-dom/client';
import { RunningScreen as Fable5RunningScreen } from '../components/OneShotAd/RunningScreen.fable5';
import { StoryboardGateScreen } from '../components/OneShotAd/StoryboardGateScreen';
import { FirstCutScreen } from '../components/OneShotAd/FirstCutScreen';
import { makePreviewRun } from '../components/OneShotAd/previewMock';
import '../index.css';

const TABS = ['running', 'gate', 'firstcut'] as const;
type Tab = (typeof TABS)[number];

const tabBtn = (active: boolean): CSSProperties => ({
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 10,
  fontFamily: 'monospace',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  cursor: 'pointer',
  background: active ? '#FFCC00' : 'transparent',
  color: active ? '#000' : '#a1a1aa',
  border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
});

const App = () => {
  const [tab, setTab] = useState<Tab>('running');
  const [reshooting, setReshooting] = useState<number | null>(null);

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
          Fable 5 One-Shot flow (recovered)
        </span>
        <span style={{ fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#71717a' }}>
          · mock data · zero API
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={tabBtn(tab === t)}>
              {t === 'running' ? 'Running' : t === 'gate' ? 'Storyboard Gate' : 'First Cut'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'running' ? (
        <Fable5RunningScreen run={makePreviewRun('running')} onMinimize={() => {}} />
      ) : tab === 'gate' ? (
        <StoryboardGateScreen
          run={makePreviewRun('gate')}
          regenerating={reshooting}
          onRegenScene={(i) => {
            setReshooting(i);
            window.setTimeout(() => setReshooting(null), 1200);
          }}
          onApprove={() => window.alert('approve → video render (mock)')}
        />
      ) : (
        <FirstCutScreen
          run={makePreviewRun('firstcut')}
          reshooting={reshooting}
          onReshoot={(i) => {
            setReshooting(i);
            window.setTimeout(() => setReshooting(null), 1200);
          }}
          onMakeAnother={() => window.alert('make another (mock)')}
        />
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
