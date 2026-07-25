import React, { useState } from 'react';
import { BusinessInfo, Avatar, ClientDetails, UplinkData, BatchCreative } from '../../types';
import { generateSceneImage, generateBatchHeadlines } from '../../services/geminiService';
import { renderCreative, loadImage, AspectRatio } from './compositor';
import { pickTemplate } from './templates';
import { GoldButton } from '../ui/GoldButton';
import { GlassPanel } from '../ui/GlassPanel';
import Loader from '../ui/Loader';
import GeneratedFrameTile from '../ui/GeneratedFrameTile';
import IntelligenceUplink from '../IntelligenceUplink';
import { ChevronLeft, Download, Sparkles, RefreshCw, Image as ImageIcon, LayoutGrid, Zap } from 'lucide-react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { MAT_CHROME } from '../ui/materialTokens';

interface BatchFanOutProps {
  businessInfo: BusinessInfo;
  avatar: Avatar | null;
  clientDetails: ClientDetails;
  onBack: () => void;
}

type Phase = 'idle' | 'hero' | 'headlines' | 'compositing' | 'done';
type HeroMode = 'ai' | 'upload';

const COUNTS = [25, 50, 100];

const BatchFanOut: React.FC<BatchFanOutProps> = ({ businessInfo, avatar, clientDetails, onBack }) => {
  const [uplinkData, setUplinkData] = useState<UplinkData | null>(null);
  const [count, setCount] = useState(100);
  const [heroMode, setHeroMode] = useState<HeroMode>('ai');
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [creatives, setCreatives] = useState<BatchCreative[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const productAsset = uplinkData?.productAssets?.[0] || businessInfo.productImageUrls?.[0];
  const brandColors = uplinkData?.hexCodes ? uplinkData.hexCodes.split(',').map((c) => c.trim()).filter(Boolean) : [];

  const buildHeroPrompt = (data: UplinkData) =>
    `Premium commercial hero photograph for "${data.brandIdentityName}". Subject: ${data.inventoryList || data.primaryBenefit}. ` +
    `Clean studio lighting, lifestyle context that evokes "${data.primaryBenefit}", central product, crisp focus, high detail. ` +
    `No overlaid text, no captions, no logos burned in — this is the clean base plate for ad copy.`;

  const runBatch = async (mode: HeroMode, n: number, reuseHero?: string) => {
    if (!uplinkData) return;
    setError(null);
    setCreatives([]);
    setProgress(0);

    try {
      // --- 1. Hero image (ONE AI call, or the uploaded product photo for $0) ---
      let hero = reuseHero || null;
      if (!hero) {
        setPhase('hero');
        if (mode === 'upload' && productAsset) {
          hero = productAsset;
        } else {
          hero = await generateSceneImage(
            buildHeroPrompt(uplinkData),
            uplinkData.aspectRatio,
            uplinkData.resolution,
            { productUrl: productAsset, avatarUrl: uplinkData.avatarAsset || avatar?.url },
            uplinkData.ethnicityProfile || avatar?.ethnicity,
            brandColors,
            'Ad Creative',
            uplinkData.inventoryList,
            uplinkData.brandIdentityName,
            7,
            productAsset ? 'product' : 'none'
          );
        }
      }
      setHeroUrl(hero);

      // --- 2. Headline angles (ONE text call) ---
      setPhase('headlines');
      const headlines = await generateBatchHeadlines(uplinkData, n);
      if (!headlines.length) throw new Error('No headlines returned');

      // --- 3. Local Canvas fan-out (no API — this is the free, fast part) ---
      setPhase('compositing');
      const heroImg = await loadImage(hero);
      const out: BatchCreative[] = [];
      for (let i = 0; i < headlines.length; i++) {
        const h = headlines[i];
        const preset = pickTemplate(i);
        const imageUrl = renderCreative({
          hero: heroImg,
          headline: h.headline,
          subhead: h.subhead,
          badge: h.badge,
          preset,
          brandColors,
          aspectRatio: uplinkData.aspectRatio as AspectRatio,
        });
        out.push({ id: i + 1, headline: h.headline, subhead: h.subhead, badge: h.badge, template: preset.id, imageUrl });
        // Yield to the UI every few tiles so the grid fills live and stays responsive.
        if (i % 8 === 0) {
          setCreatives([...out]);
          setProgress(i + 1);
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      setCreatives(out);
      setProgress(out.length);
      setPhase('done');
    } catch (e) {
      setError('BATCH_FAILED: ' + ((e as Error)?.message || 'unknown error'));
      setPhase('idle');
    }
  };

  const handleUplinkComplete = (data: UplinkData) => setUplinkData(data);

  const downloadAll = async () => {
    const zip = new JSZip();
    creatives.forEach((c) => {
      if (c.imageUrl) {
        zip.file(`creative_${String(c.id).padStart(3, '0')}.jpg`, c.imageUrl.split(',')[1], { base64: true });
      }
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${(uplinkData?.brandIdentityName || 'batch').replace(/\s+/g, '_')}_creatives.zip`);
  };

  const downloadOne = (c: BatchCreative) => {
    if (c.imageUrl) saveAs(c.imageUrl, `creative_${String(c.id).padStart(3, '0')}.jpg`);
  };

  // --- Gate 1: gather brand/product context (reuses the ADS uplink form) ---
  if (!uplinkData) {
    return (
      <div className="min-h-screen bg-zinc-950 p-8">
        <IntelligenceUplink
          onBack={onBack}
          onComplete={handleUplinkComplete}
          globalBusinessInfo={businessInfo}
          globalClientDetails={clientDetails}
          mode="ADS"
        />
      </div>
    );
  }

  const busy = phase === 'hero' || phase === 'headlines' || phase === 'compositing';
  const phaseLabel =
    phase === 'hero' ? 'RENDERING_HERO_PLATE...'
    : phase === 'headlines' ? 'WRITING_100_ANGLES...'
    : phase === 'compositing' ? `COMPOSITING_${progress}/${count}...`
    : '';

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white font-mono flex flex-col">
      <header className="flex flex-col items-start gap-4 mb-8 w-full border-b border-white/10 pb-8">
        <div className="flex items-center justify-between w-full">
          <button onClick={() => setUplinkData(null)} className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-on-surface-sublabel hover:text-white uppercase tracking-widest transition-colors">
            <ChevronLeft className="w-4 h-4" /> <span className="hidden md:inline">COMMAND CENTER</span><span className="md:hidden">BACK</span>
          </button>
          {phase === 'done' && (
            <GoldButton onClick={downloadAll} className="flex items-center gap-2 text-[10px] md:text-xs px-3 py-2 md:px-4 md:py-2">
              <Download className="w-4 h-4" /> <span className="hidden md:inline">DOWNLOAD ALL ({creatives.length})</span><span className="md:hidden">ZIP</span>
            </GoldButton>
          )}
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight leading-tight flex items-center gap-3">
            <LayoutGrid className="w-8 h-8 text-[#FFCC00]" /> Batch_Creative <span className="text-[#FFCC00]">/ FAN-OUT</span>
          </h1>
          <p className="text-[10px] text-on-surface-sublabel font-mono tracking-widest uppercase mt-2">
            // ONE_HERO_IMAGE → {count}_BRANDED_CREATIVES · ~$0 MARGINAL
          </p>
        </div>
      </header>

      {error && <p className="text-red-500 text-center mb-8 border border-red-900 bg-red-900/10 p-4 font-mono text-xs">{error}</p>}

      {/* --- Gate 2: configure the run --- */}
      {phase === 'idle' && (
        <GlassPanel className="max-w-2xl mx-auto w-full p-8 rounded-3xl mb-12">
          <p className="text-[10px] text-[#FFCC00] uppercase tracking-widest mb-6 font-bold">// CONFIGURE_BATCH</p>

          <label className="text-[10px] text-on-surface-sublabel uppercase tracking-widest">Batch Size</label>
          <div className="flex gap-3 mt-2 mb-8">
            {COUNTS.map((c) => (
              <button
                key={c}
                onClick={() => setCount(c)}
                className={`px-6 py-3 rounded-xl text-sm font-black transition-all border ${
                  count === c ? 'bg-[#FFCC00] text-black border-[#FFCC00]' : 'bg-zinc-950 text-zinc-400 border-white/10 hover:border-[#FFCC00]/50'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <label className="text-[10px] text-on-surface-sublabel uppercase tracking-widest">Hero Source</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 mb-8">
            <button
              onClick={() => setHeroMode('ai')}
              className={`p-4 rounded-xl text-left border transition-all ${heroMode === 'ai' ? 'border-[#FFCC00] bg-[#FFCC00]/5' : 'border-white/10 bg-zinc-950 hover:border-white/30'}`}
            >
              <div className="flex items-center gap-2 text-sm font-bold"><Sparkles className="w-4 h-4 shrink-0 text-[#FFCC00]" /> AI Hero</div>
              <p className="text-xs text-on-surface-sublabel mt-1 normal-case">Generate a fresh hero plate (1 image credit).</p>
            </button>
            <button
              onClick={() => setHeroMode('upload')}
              disabled={!productAsset}
              className={`p-4 rounded-xl text-left border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${heroMode === 'upload' ? 'border-[#FFCC00] bg-[#FFCC00]/5' : 'border-white/10 bg-zinc-950 hover:border-white/30'}`}
            >
              <div className="flex items-center gap-2 text-sm font-bold"><ImageIcon className="w-4 h-4 shrink-0 text-[#FFCC00]" /> My Photo</div>
              <p className="text-xs text-on-surface-sublabel mt-1 normal-case">{productAsset ? 'Use your product photo — truly $0.' : 'No product image uploaded.'}</p>
            </button>
          </div>

          <GoldButton onClick={() => runBatch(heroMode, count)} className="w-full flex items-center justify-center gap-2 py-4 text-sm">
            <Zap className="w-5 h-5" /> FAN OUT {count} CREATIVES
          </GoldButton>
        </GlassPanel>
      )}

      {/* --- Progress --- */}
      {busy && (
        <div className="mb-12">
          <Loader message={phaseLabel} />
          {phase === 'compositing' && (
            <div className="max-w-md mx-auto mt-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#FFCC00] transition-all duration-150" style={{ width: `${(progress / count) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {/* --- Grid --- */}
      {creatives.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-24">
          {creatives.map((c) => (
            <GeneratedFrameTile
              key={c.id}
              imageUrl={c.imageUrl}
              className="aspect-[4/5]"
              label={`#${String(c.id).padStart(3, '0')}`}
              actions={[{ icon: Download, label: 'Save', onClick: () => downloadOne(c), primary: true }]}
            />
          ))}
        </div>
      )}

      {/* --- Done action bar --- */}
      {phase === 'done' && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-4 ${MAT_CHROME} p-4 rounded-full border border-white/10 z-50`}>
          <button onClick={() => runBatch(heroMode, count, heroUrl || undefined)} className="rounded-full px-6 py-3 text-xs border border-[#FFCC00] text-[#FFCC00] hover:bg-[#FFCC00] hover:text-black flex items-center gap-2 font-bold uppercase tracking-widest transition-all">
            <RefreshCw className="w-4 h-4 shrink-0" /> NEW ANGLES
          </button>
          <button onClick={() => runBatch(heroMode, count)} className="rounded-full px-6 py-3 text-xs bg-zinc-950 border border-white/10 text-zinc-300 hover:border-[#FFCC00] hover:text-[#FFCC00] flex items-center gap-2 font-bold uppercase tracking-widest transition-all">
            <Sparkles className="w-4 h-4 shrink-0" /> NEW HERO
          </button>
          <GoldButton onClick={downloadAll} className="rounded-full px-6 py-3 text-xs flex items-center gap-2">
            <Download className="w-4 h-4" /> DOWNLOAD ALL
          </GoldButton>
        </div>
      )}
    </div>
  );
};

export default BatchFanOut;
