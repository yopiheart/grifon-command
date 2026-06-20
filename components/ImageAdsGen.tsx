import React, { useState, useRef } from 'react';
import { BusinessInfo, Avatar, AdVariant, UplinkData, ClientDetails } from '../types';
import { generateAdCreatives, generateSceneImage } from '../services/geminiService';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import { RefreshCw, Check, Copy, Image as ImageIcon, ChevronLeft } from 'lucide-react';
import IntelligenceUplink from './IntelligenceUplink';
import { NicheCalloutCard } from './imageads/NicheCalloutCard';
import { captureToPng } from '../utils/captureToPng';
import JSZip from 'jszip';
import saveAs from 'file-saver';

interface ImageAdsGenProps {
  businessInfo: BusinessInfo;
  avatar: Avatar | null;
  clientDetails: ClientDetails;
  onBack: () => void;
}

// Text-composited callout creatives export as a placement-ready set: feed (4:5),
// square (1:1), story/reel (9:16) — safe-zone framed. See the Placement strategy
// in workflows/static_ad_swipe_file.md.
const PLACEMENT_RATIOS = ['4:5', '1:1', '9:16'] as const;
const PLACEMENT_LABELS: Record<string, string> = { '4:5': 'feed_4x5', '1:1': 'square_1x1', '9:16': 'story_9x16' };
// Preview uses the selected ratio when it's a supported placement, else feed 4:5.
const calloutPreviewRatio = (r: string): '4:5' | '1:1' | '9:16' =>
  (PLACEMENT_RATIOS as readonly string[]).includes(r) ? (r as '4:5' | '1:1' | '9:16') : '4:5';

const ImageAdsGen: React.FC<ImageAdsGenProps> = ({ businessInfo, avatar, clientDetails, onBack }) => {
  const [uplinkData, setUplinkData] = useState<UplinkData | null>(null);
  const [variants, setVariants] = useState<AdVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Off-screen DOM nodes for text-composited templates, keyed `${idx}:${ratio}`.
  const calloutRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleUplinkComplete = (data: UplinkData) => {
    setUplinkData(data);
    fetchVariants(data);
  };

  const fetchVariants = async (data: UplinkData) => {
    setLoading(true);
    setError(null);
    try {
      const adVariants = await generateAdCreatives(data);
      setVariants(adVariants);
    } catch (err) {
      setError("Strategic Analysis Failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSynthesize = async (idx: number) => {
    if (!uplinkData) return;

    const updated = [...variants];
    setLoading(true);
    try {
      // Text-composited families (GP-2 Niche Callout) render a branded React
      // card → PNG via html2canvas instead of the Gemini image model, which is
      // hard-blocked from rendering legible text (NO_TEXT_CONSTRAINT).
      if ((uplinkData.family ?? 'product') === 'callout') {
        const node = calloutRefs.current[`${idx}:${calloutPreviewRatio(uplinkData.aspectRatio)}`];
        if (!node) throw new Error('callout capture node not mounted');
        const png = await captureToPng(node, { scale: 2 });
        if (!png) throw new Error('callout capture failed');
        updated[idx].imageUrl = png;
        setVariants([...updated]);
        return;
      }
      updated[idx].imageUrl = await generateSceneImage(
        updated[idx].imagePrompt,
        uplinkData.aspectRatio,
        uplinkData.resolution,
        { 
          avatarUrl: uplinkData.avatarAsset || avatar?.url, 
          productUrl: uplinkData.productAssets?.[0] || businessInfo.productImageUrls?.[0] 
        },
        uplinkData.ethnicityProfile || avatar?.ethnicity,
        uplinkData.hexCodes ? uplinkData.hexCodes.split(',').map(c => c.trim()) : [],
        'Ad Creative',
        uplinkData.inventoryList,
        uplinkData.brandIdentityName,
        idx + 10 + Math.floor(Math.random() * 100)
      );
      setVariants([...updated]);
    } catch (e) {
      setError("VISUAL_CORE_ERROR: GEN_FAILED");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAsset = async (v: AdVariant) => {
    const zip = new JSZip();
    const folderName = `Ad_Variant_${v.id}_${v.templateType.replace(' ', '_')}`;

    const content = `HEADLINE: ${v.headline}\nTEMPLATE: ${v.templateType}\nCAPTION: ${v.caption}\nHOOK_LOGIC: ${v.hookLogic}`;
    zip.file(`${folderName}/ad_copy.txt`, content);

    // Callout family → export a placement-ready pack: feed (4:5), square (1:1),
    // and story/reel (9:16), each captured from its safe-zone-framed card.
    if ((uplinkData?.family ?? 'product') === 'callout') {
      const idx = variants.indexOf(v);
      for (const ratio of PLACEMENT_RATIOS) {
        const node = calloutRefs.current[`${idx}:${ratio}`];
        if (!node) continue;
        const png = await captureToPng(node, { scale: 2 });
        if (png) zip.file(`${folderName}/${PLACEMENT_LABELS[ratio]}.png`, png.split(',')[1], { base64: true });
      }
      const pack = await zip.generateAsync({ type: 'blob' });
      saveAs(pack, `${folderName}_placement_pack.zip`);
      return;
    }

    if (v.imageUrl) {
      const imgData = v.imageUrl.split(',')[1];
      zip.file(`${folderName}/ad_visual.png`, imgData, { base64: true });
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${folderName}.zip`);
  };

  if (!uplinkData) {
    return (
      <div className="min-h-screen bg-background-dark p-8">
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

  return (
    <div className="min-h-screen bg-[#050505] p-8 text-white font-mono flex flex-col">
        <header className="flex flex-col items-start gap-4 mb-8 w-full border-b border-white/10 pb-8">
            <div className="flex items-center justify-between w-full">
                <button onClick={() => setUplinkData(null)} className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"><ChevronLeft className="w-4 h-4" /> <span className="hidden md:inline">COMMAND CENTER</span><span className="md:hidden">BACK</span></button>
                <div className="flex gap-2 md:gap-4">
                  <button onClick={() => fetchVariants(uplinkData)} className="px-3 py-2 md:px-6 md:py-2 rounded-full border border-[#FFCC00]/40 text-[#FFCC00] hover:border-[#FFCC00] transition-all flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                      <RefreshCw className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">RE-AUDIT STRATEGY</span>
                  </button>
                  <GoldButton onClick={() => variants.forEach((_, i) => handleSynthesize(i))} className="flex items-center gap-2 text-[10px] md:text-xs px-3 py-2 md:px-4 md:py-2">
                      <ImageIcon className="w-4 h-4" /> <span className="hidden md:inline">SYNTHESIZE ALL</span>
                  </GoldButton>
                </div>
            </div>
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight break-words whitespace-normal leading-tight">Ad_Creatives <span className="text-[#FFCC00]">/ PRO</span></h1>
                <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
                  // STATIC_IMAGE_GENERATION
                </p>
            </div>
        </header>

        {loading && <div className="mb-12"><Loader message="OPTIMIZING_AD_HEURISTICS..." /></div>}
        {error && <p className="text-red-500 text-center mb-8 border border-red-900 bg-red-900/10 p-4 font-mono">{error}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-20">
            {variants.map((v, idx) => (
                <div key={idx} className="glass-morphism rounded-[3rem] p-10 border border-white/10 relative overflow-hidden group">
                    <div className="absolute top-8 right-10 bg-brand-yellow text-black text-[10px] font-black px-4 py-1.5 rounded-full z-10 shadow-neon-yellow font-mono">
                        THE {v.templateType.toUpperCase()} WRAPPER
                    </div>

                    <div className="flex flex-col md:flex-row gap-10">
                        <div className="w-full md:w-64 shrink-0 aspect-[4/5] bg-zinc-950 border border-white/10 rounded-2xl relative overflow-hidden flex items-center justify-center">
                            {v.imageUrl ? (
                                <>
                                  <img src={v.imageUrl} className="w-full h-full object-cover" />
                                  <button 
                                    onClick={() => handleSynthesize(idx)}
                                    className="absolute top-4 right-4 bg-zinc-950/60 hover:bg-[#FFCC00] hover:text-black p-2 rounded-full transition-all text-[#FFCC00]"
                                    title="Re-roll Visual"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </button>
                                </>
                            ) : (
                                <div className="text-center p-6 opacity-30">
                                    <p className="text-[10px] font-black uppercase font-mono tracking-widest mb-4">Awaiting_Render</p>
                                    <button onClick={() => handleSynthesize(idx)} className="text-[10px] py-2 px-4 whitespace-nowrap font-mono border border-[#FFCC00] text-[#FFCC00] rounded-full hover:bg-[#FFCC00]/10 transition-colors">SYNTHESIZE_VARIANT</button>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 space-y-6">
                            <div>
                                <span className="text-[9px] font-black text-brand-yellow/60 uppercase tracking-widest font-mono">PRIMARY_HEADLINE</span>
                                <h2 className="text-2xl font-black uppercase italic leading-tight">{v.headline}</h2>
                            </div>
                            <div>
                                <span className="text-[9px] font-black text-brand-yellow/60 uppercase tracking-widest font-mono">AD_COPY_PITCH</span>
                                <p className="text-xs text-gray-400 font-mono leading-relaxed mt-2">{v.caption}</p>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                <span className="text-[9px] font-black text-brand-yellow uppercase tracking-widest font-mono">HOOK_LOGIC</span>
                                <p className="text-[10px] text-brand-yellow/80 mt-1">{v.hookLogic}</p>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                              <button onClick={() => handleDownloadAsset(v)} className="w-full flex items-center justify-center gap-2 py-3 text-[10px] border border-white/10 hover:border-[#FFCC00] text-zinc-400 hover:text-[#FFCC00] rounded-xl transition-all font-bold uppercase tracking-widest">
                                <Copy className="w-4 h-4" /> {(uplinkData.family ?? 'product') === 'callout' ? 'PLACEMENT PACK (3)' : 'DOWNLOAD ASSET'}
                              </button>
                              <GoldButton className="w-full flex items-center justify-center gap-2 py-3 text-[10px] rounded-xl">
                                  <Check className="w-5 h-5" /> EXPORT TO FB
                              </GoldButton>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Hidden capture stage: each callout variant rendered off-screen at all
            three placement ratios so captureToPng() can rasterize the pack. */}
        {(uplinkData.family ?? 'product') === 'callout' && (
          <div aria-hidden style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none', opacity: 0 }}>
            {variants.map((v, idx) => PLACEMENT_RATIOS.map((ratio) => (
              <NicheCalloutCard
                key={`${idx}:${ratio}`}
                ref={(el) => { calloutRefs.current[`${idx}:${ratio}`] = el; }}
                composition={v.composition || {}}
                aspectRatio={ratio}
                hexCodes={uplinkData.hexCodes}
                brandName={uplinkData.brandIdentityName}
              />
            )))}
          </div>
        )}

        {variants.length > 0 && !loading && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4 bg-zinc-950/80 backdrop-blur-2xl p-4 rounded-full border border-white/10 shadow-2xl z-50 animate-in slide-in-from-bottom-10">
            <button onClick={() => fetchVariants(uplinkData)} className="rounded-full px-8 py-3 text-xs border border-[#FFCC00] text-[#FFCC00] hover:bg-[#FFCC00] hover:text-black flex items-center gap-2 font-bold uppercase tracking-widest transition-all">
              <RefreshCw className="w-4 h-4" /> REGENERATE ALL
            </button>
            <GoldButton onClick={() => setUplinkData(null)} className="rounded-full px-8 py-3 text-xs flex items-center gap-2">
              <span className="text-lg font-light leading-none">+</span> CREATE NEW BATCH
            </GoldButton>
          </div>
        )}
    </div>
  );
};

export default ImageAdsGen;