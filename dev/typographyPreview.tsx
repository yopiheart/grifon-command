// DEV ONLY: render real shared primitives, without auth, wizard state, or providers.
import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import Button from '../components/ui/Button';
import { GoldButton } from '../components/ui/GoldButton';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import { FieldLabel } from '../components/ui/FieldLabel';
import Card from '../components/ui/Card';
import { StepShell } from '../components/ui/StepShell';
import { SegButton } from '../components/ui/SegButton';
import { TextField, TextArea } from '../components/ui/TextField';
import { GlassPanel } from '../components/ui/GlassPanel';
import { SaasOfferCard } from '../components/imageads/SaasOfferCard';
import { AD_RATIO_DIMENSIONS } from '../utils/captureToPng';
import '../index.css';
import '../components/landing/landing.css';

function ArtworkSample() {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const native = AD_RATIO_DIMENSIONS['1:1'];
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return (
    <GlassPanel className="space-y-4 p-6">
      <h2 data-type="heading" className="text-2xl">Exported artwork</h2>
      <div ref={host} data-testid="artwork-sample" className="relative w-full overflow-hidden" style={{ height: width * native.h / native.w }}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${width / native.w})` }}>
          <SaasOfferCard aspectRatio="1:1" brandName="North Coffee" hexCodes="#FFCC00" variant={{
            id: 1, headline: 'Fresh coffee every morning', templateType: 'Guarantee Hero',
            composition: { badge: 'Ready to go', guarantee: 'A brighter start to your day', ctaLabel: 'See the offer' },
            imagePrompt: '', caption: '', hookLogic: '',
          }} />
        </div>
      </div>
    </GlassPanel>
  );
}

function Fixture() {
  const [format, setFormat] = useState<'Portrait' | 'Landscape'>('Portrait');
  return (
    <main data-testid="typography-fixture" className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <header className="space-y-3">
        <h1 data-type="heading" className="text-3xl">Your next ad plan</h1>
        <p data-type="body">Write a clear brief, then review the result with your team.</p>
        <p data-testid="medium-utility" className="font-medium">A medium utility weight remains available.</p>
      </header>

      <GlassPanel className="space-y-6 p-6">
        <h2 data-type="heading" className="text-2xl">Normal controls</h2>
        <div className="space-y-2">
          <label data-type="normal-label" htmlFor="plain-input">Project name</label>
          <input data-type="input" id="plain-input" defaultValue="North Coffee" className="h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 text-white focus:border-[#FFCC00] focus:outline-none focus:ring-1 focus:ring-[#FFCC00]" />
        </div>
        <div className="space-y-2">
          <label data-type="normal-label" htmlFor="plain-select">Aspect ratio</label>
          <select data-type="input" id="plain-select" className="h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 text-white focus:border-[#FFCC00] focus:outline-none focus:ring-1 focus:ring-[#FFCC00]" defaultValue="portrait">
            <option value="portrait">Portrait 9:16</option><option value="landscape">Landscape 16:9</option>
          </select>
        </div>
        <div className="space-y-2">
          <label data-type="normal-label" htmlFor="legacy-select" className="font-mono text-[10px] uppercase tracking-widest">Language</label>
          <select data-type="input" id="legacy-select" className="font-mono font-medium h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 text-[10px] uppercase tracking-widest text-white focus:border-[#FFCC00] focus:outline-none focus:ring-1 focus:ring-[#FFCC00]" defaultValue="english">
            <option value="english">English</option><option value="filipino">Filipino</option>
          </select>
          <input data-type="input" aria-label="Legacy ordinary text field" className="font-mono font-medium h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 text-xs uppercase tracking-widest text-white" defaultValue="An ordinary brief" />
          <textarea data-type="input" aria-label="Legacy ordinary text area" className="font-mono font-semibold min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 text-xs uppercase tracking-widest text-white" defaultValue="Keep this easy to read." />
        </div>
        <Input data-type="input" id="shared-input" label="Client details" defaultValue="A short product description" />
        <Textarea data-type="input" id="shared-textarea" label="Business info" defaultValue="Coffee for busy mornings. Keep the offer easy to read." rows={3} />
        <TextField data-type="input" id="text-field" label="Offer" defaultValue="Two bottles for 199" />
        <TextArea data-type="input" id="text-area" label="Audience" defaultValue="People who want coffee ready to go." />
        <FieldLabel data-type="field-label" htmlFor="shared-input">Client details</FieldLabel>
        <div className="flex flex-wrap items-center gap-4">
          <Button data-type="button" variant="secondary">Review brief</Button>
          <Button data-type="button" variant="ghost" disabled>Unavailable</Button>
          <GoldButton data-type="button">Save draft</GoldButton>
          <button data-type="button" className="font-mono h-11 px-4">Another regular action</button>
        </div>
        <div data-testid="segmented-control"><SegButton value={format} onChange={setFormat} options={['Portrait', 'Landscape']} /></div>
      </GlassPanel>

      <div data-testid="shared-card"><Card title="Review your draft" description="Draft metadata"><p data-type="body">Check the brief before continuing.</p></Card></div>
      <div data-testid="shared-step"><StepShell title="Business info" sublabel="Step metadata" panelClassName="p-6"><p data-type="body">Describe what you sell in one clear sentence.</p></StepShell></div>
      <GlassPanel className="space-y-4 p-6">
        <h3 data-type="heading" className="text-xl">Useful details</h3><h4 data-type="heading">Small section title</h4><h5 data-type="heading">Supporting title</h5><h6 data-type="heading">Final title</h6>
        <h3 data-type="mono" className="font-mono text-sm">Job status 200</h3>
        <h4 data-type="mono" className="tech-data text-sm">Job details 001</h4>
        <p data-type="mono" className="font-mono text-xs">job_id: preview_001</p>
        <p data-type="mono" className="tech-data text-xs">render_time: 00:14</p>
        <pre data-type="mono" className="text-xs"><code data-type="mono">const ready = true;</code></pre>
        <p>Press <kbd data-type="mono" className="text-xs">Ctrl K</kbd> to search.</p>
        <label data-type="mono" className="tech-data font-mono text-xs" htmlFor="technical-input">Technical value</label>
        <input data-type="mono" id="technical-input" className="tech-data font-mono h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 text-xs" defaultValue="preview_001" />
        <button data-type="mono" className="tech-data h-11 rounded-xl border border-white/10 px-4 text-xs">job_001</button>
      </GlassPanel>
      <GlassPanel className="landing-page space-y-4 p-6">
        <h2 data-testid="marketing-title" className="text-2xl">Ready to create.</h2>
        <p data-testid="marketing-serif" className="font-serif italic text-2xl text-[#FFCC00]">Made to move.</p>
      </GlassPanel>
      <GlassPanel className="public-purchase space-y-4 p-6">
        <h2 data-testid="purchase-title" className="purchase-display text-2xl">Find your plan.</h2>
        <p data-testid="purchase-serif" className="font-serif italic text-2xl text-[#FFCC00]">Create more.</p>
      </GlassPanel>
      <ArtworkSample />
    </main>
  );
}

async function mount() {
  if (!(import.meta as ImportMeta & { env: { DEV: boolean } }).env.DEV) return;
  // Read the served production entry point. No copied typography rules can drift
  // from the real app, and no script from its head is executed here.
  const response = await fetch('/index.html', { cache: 'no-store' });
  if (!response.ok) throw new Error('Typography fixture could not read the app entry point.');
  const entry = new DOMParser().parseFromString(await response.text(), 'text/html');
  const stylesReady: Promise<void>[] = [];
  for (const element of entry.head.querySelectorAll('style, link[rel="stylesheet"], link[rel="preconnect"]')) {
    const copy = element.cloneNode(true) as HTMLElement;
    copy.dataset.typographySource = 'index.html';
    if (copy instanceof HTMLLinkElement && copy.rel === 'stylesheet') {
      stylesReady.push(new Promise((resolve, reject) => {
        copy.onload = () => resolve();
        copy.onerror = () => reject(new Error('Typography fixture font stylesheet did not load.'));
      }));
    }
    document.head.append(copy);
  }
  await Promise.all(stylesReady);
  ReactDOM.createRoot(document.getElementById('root')!).render(<Fixture />);
}

void mount();
