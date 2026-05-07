
import React, { useState, useRef, useEffect } from 'react';
import { BusinessInfo, CinematicSpecConfig, Scene, VideoPrompt, CinematicNarrativeScene } from '../types';
import { generateCinematicSpec, generateCinematicNarrative, generateSinglePhase } from '../services/geminiService';
import { compressImageForUpload } from '../utils/imageCompression';
import { GoldButton } from './ui/GoldButton';
import { GlassPanel } from './ui/GlassPanel';
import Loader from './ui/Loader';
import { RefreshCcw, UploadCloud, Video, ChevronLeft, ChevronDown, Settings2, Image as ImageIcon, MonitorPlay, Download, Edit2 } from 'lucide-react';
import saveAs from 'file-saver';
import Step6VideoPrompts from './Step6VideoPrompts';

const GrifonLogo = ({ className = "h-8 w-auto" }: { className?: string }) => (
  <img src="/logo.png" alt="GRIFON Logo" className={`object-contain ${className}`} />
);

interface CinematicSpecStudioProps {
  onBack: () => void;
  onNavigate: (module: string) => void;
  businessInfo?: BusinessInfo;
  narrative: CinematicNarrativeScene[] | null;
  setNarrative: (n: CinematicNarrativeScene[] | null) => void;
  frameMap: Record<string, string>;
  setFrameMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  result: Scene[] | null;
  setResult: (r: Scene[] | null) => void;
}

const CAMERAS = ['ARRI ALEXA 35', 'RED V RAPTOR', 'SONY VENICE', 'IMAX 70MM', 'PANAVISION DXL2', 'ARRIFLEX 16SR'] as const;
const LENSES = ['Cooke S4', 'Lensbaby', 'Hawk V-Lite', 'Laowa Macro', 'Canon K-35', 'Panavision C-Series', 'Petzval', 'Helios', 'Zeiss Ultra Prime'] as const;
const RATIOS = ['9:16', '1:1', '16:9'] as const;
const QUALITIES = ['1K', '2K', '4K'] as const;

const CinematicSpecStudio: React.FC<CinematicSpecStudioProps> = ({ 
  onBack, 
  onNavigate, 
  businessInfo,
  narrative,
  setNarrative,
  frameMap,
  setFrameMap,
  result,
  setResult
}) => {
  const [activeTab, setActiveTab] = useState<'GEAR' | 'ASSETS' | 'VIEW'>('VIEW');
  const [config, setConfig] = useState<CinematicSpecConfig>({
    sideAsset: businessInfo?.productImageUrls?.[0] || '',
    frontAsset: businessInfo?.productImageUrls?.[1] || '',
    heroAsset: businessInfo?.productImageUrls?.[2] || '',
    macroAsset: businessInfo?.productImageUrls?.[3] || '',
    logoAsset: businessInfo?.logoImageUrl || '',
    camera: 'ARRI ALEXA 35',
    lens: 'Cooke S4',
    focalLength: '24mm',
    aspectRatio: '9:16',
    resolution: '1K',
    concept: '',
    subjectFilter: 'product'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVideoPrompts, setShowVideoPrompts] = useState(false);
  const [videoPrompts, setVideoPrompts] = useState<VideoPrompt[]>([]);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  
  const sideInputRef = useRef<HTMLInputElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const macroInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedMetadata = localStorage.getItem('Current_Odyssey_Metadata_V3');
    if (savedMetadata) {
      try {
        const metadata = JSON.parse(savedMetadata);
        if (metadata.config) setConfig(prev => ({ ...prev, ...metadata.config }));
        if (metadata.narrative && !narrative) setNarrative(metadata.narrative);
      } catch (e) {
        console.error("Failed to load odyssey metadata", e);
      }
    }
  }, []);

  useEffect(() => {
    const { sideAsset, frontAsset, heroAsset, macroAsset, logoAsset, ...safeSettings } = config;
    const liteMetadata = { config: safeSettings, narrative };
    try {
      localStorage.setItem('Current_Odyssey_Metadata_V3', JSON.stringify(liteMetadata));
    } catch (e) {
      console.error('Storage full, settings not saved.');
    }
  }, [config.camera, config.lens, config.focalLength, config.concept, config.aspectRatio, config.resolution, config.subjectFilter, narrative]);

  const handleGenerateNarrative = async () => {
    if (!config.sideAsset || !config.frontAsset || !config.heroAsset) {
      setError("REQUIRED_ASSETS_MISSING: Slots 1, 2, and 3 are mandatory.");
      return;
    }
    if (!config.concept.trim()) {
      setError("CONCEPT_REQUIRED: Describe the universe for the Director.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await generateCinematicNarrative(
        businessInfo?.product || "Commercial Product",
        businessInfo?.selectedTheme || { name: 'Neutral', vibe: 'Professional', texturePrompt: 'Smooth surface', colorPalette: '#fff', id: '0' },
        config.concept,
        { camera: config.camera, lens: config.lens, focalLength: config.focalLength }
      );
      setNarrative(data);
      setActiveTab('VIEW');
    } catch (err) {
      setError("NARRATIVE_SYNTHESIS_FAILED: System overload.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitializeSynthesis = async () => {
    if (!narrative) return;
    setIsLoading(true);
    setFrameMap({});
    setError(null);
    try {
      const response = await generateCinematicSpec(config, narrative, (updatedMap) => {
        setFrameMap(updatedMap);
      });
      setResult(response);
    } catch (err) {
      setError("VISUAL_SYNTHESIS_FAILED: Neural sync timed out.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegeneratePhase = async (index: number, key: string) => {
    if (!narrative || regeneratingIndex !== null) return;
    setRegeneratingIndex(index);
    try {
      const newUrl = await generateSinglePhase(index, config, narrative);
      setFrameMap(prev => ({ ...prev, [key]: newUrl }));
    } catch (err) {
      console.error("Selective Regeneration Failed", err);
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleResetStudio = () => {
    localStorage.removeItem('Current_Odyssey_Metadata_V3');
    setResult(null);
    setNarrative(null);
    setFrameMap({});
    setConfig(prev => ({
      ...prev,
      sideAsset: '',
      frontAsset: '',
      heroAsset: '',
      macroAsset: '',
      logoAsset: '',
      concept: ''
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, slot: 'side' | 'front' | 'hero' | 'macro' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { dataUrl } = await compressImageForUpload(file);
    setConfig(prev => ({ ...prev, [`${slot}Asset`]: dataUrl }));
  };

  const handlePreset = (type: string) => {
    let concept = '';
    switch (type) {
      case 'THE_ELEMENTAL': concept = "Elemental world of volcanic rock and obsidian glass."; break;
      case 'THE_SPEEDSTER': concept = "Hyper-kinetic urban race track with neon motion blur."; break;
      case 'THE_LUXURY': concept = "Minimalist studio with floating silk and liquid gold."; break;
      case 'THE_FRESH': concept = "Hyper-detailed water splash environment with daylight."; break;
    }
    setConfig(prev => ({ ...prev, concept: concept.toUpperCase() }));
  };

  const handleDownload = (imageUrl: string, key: string) => saveAs(imageUrl, `cinematic_${key}_${Date.now()}.png`);
  const handleEditInStudio = (imageUrl: string) => {
    localStorage.setItem('sharedImageToEdit', imageUrl);
    onNavigate('image_editor');
  };

  const phases = [
    { key: 'macro_tease', label: 'PHASE 01: MATERIAL' },
    { key: 'atmospheric_hook', label: 'PHASE 02: FORCE' },
    { key: 'kinetic_morph', label: 'PHASE 03: FORM' },
    { key: 'flight_action', label: 'PHASE 04: PROPULSION' },
    { key: 'hero_landing', label: 'PHASE 05: POWER' },
    { key: 'the_mark', label: 'PHASE 06: IDENTITY' }
  ];

  if (showVideoPrompts && result) {
    return (
      <div className="min-h-screen bg-zinc-950 p-8 font-sans">
        <button onClick={() => setShowVideoPrompts(false)} className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#FFCC00] border border-[#FFCC00]/20 px-4 py-2 rounded-full hover:bg-[#FFCC00]/10 transition-colors uppercase mb-8">
          <ChevronLeft className="w-4 h-4" /> BACK TO STUDIO
        </button>
        <Step6VideoPrompts 
          storyboard={result} 
          videoPrompts={videoPrompts} 
          setVideoPrompts={setVideoPrompts} 
          onNext={() => onBack()} 
          onBack={() => setShowVideoPrompts(false)} 
          businessInfo={businessInfo || { product: 'Unknown', scriptType: 'Cinematic' } as any}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col p-4 sm:p-8 selection:bg-[#FFCC00] selection:text-black">
      {/* HUD HEADER */}
      <header className="flex flex-col items-start gap-4 mb-8 w-full border-b border-white/10 pb-4">
        <div className="flex items-center justify-between w-full">
          <button onClick={onBack} className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">
            <ChevronLeft className="w-4 h-4" /> <span className="hidden md:inline">COMMAND CENTER</span><span className="md:hidden">BACK</span>
          </button>
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight break-words whitespace-normal leading-tight">
            CINEMATIC_STUDIO <span className="text-[#FFCC00] hidden sm:inline">// ODYSSEY</span>
          </h1>
          <div className="text-[10px] text-zinc-500 tracking-widest uppercase font-mono mt-2">
            // ODYSSEY_v6.0
          </div>
        </div>
      </header>

      {/* MOBILE TACTICAL TABS */}
      <div className="lg:hidden flex gap-2 mb-6 p-1 bg-zinc-900/80 rounded-full border border-white/10">
          {[
            { id: 'GEAR', label: 'GEAR', icon: Settings2 },
            { id: 'ASSETS', label: 'ASSETS', icon: ImageIcon },
            { id: 'VIEW', label: 'VIEW', icon: MonitorPlay }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-[10px] font-bold tracking-widest transition-all ${activeTab === tab.id ? 'bg-[#FFCC00] text-black' : 'text-zinc-500 hover:text-white'}`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden relative">
        
        {/* SIDEBAR: GEAR BOX (LEFT) */}
        <aside className={`w-full lg:w-80 flex flex-col shrink-0 lg:flex ${activeTab === 'GEAR' ? 'flex' : 'hidden'}`}>
          <GlassPanel className="h-full p-6 flex flex-col gap-6 overflow-hidden">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-widest">// HARDWARE_SPECS</h3>
            </div>
            
            <div className="space-y-6 flex-1 overflow-y-auto pb-48 md:pb-6 custom-scrollbar">
              <div>
                <label className="flex justify-between items-center text-[10px] font-mono text-zinc-500 uppercase mb-2">Camera_Body</label>
                <div className="relative">
                  <select value={config.camera} onChange={(e) => setConfig({...config, camera: e.target.value as any})} className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm md:text-base font-medium text-white focus:outline-none focus:border-[#FFCC00]/50 transition-colors appearance-none truncate pr-10">
                    {CAMERAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="flex justify-between items-center text-[10px] font-mono text-zinc-500 uppercase mb-2">Lens_Selection</label>
                <div className="relative">
                  <select value={config.lens} onChange={(e) => setConfig({...config, lens: e.target.value as any})} className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm md:text-base font-medium text-white focus:outline-none focus:border-[#FFCC00]/50 transition-colors appearance-none truncate pr-10">
                    {LENSES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 space-y-4">
                <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">// RENDER_CONFIG</h3>
                <div className="grid grid-cols-3 gap-2">
                    {RATIOS.map(r => (
                      <button key={r} onClick={() => setConfig({...config, aspectRatio: r})} className={`py-2 rounded-xl text-xs font-bold border transition-all ${config.aspectRatio === r ? 'bg-[#FFCC00] text-black border-[#FFCC00]' : 'bg-zinc-950 text-zinc-400 border-white/10 hover:border-white/20'}`}>{r}</button>
                    ))}
                </div>
                <div className="flex gap-2 bg-zinc-950 p-1 rounded-xl border border-white/10">
                    {QUALITIES.map(q => (
                        <button key={q} onClick={() => setConfig({...config, resolution: q as any})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${config.resolution === q ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>{q}</button>
                    ))}
                </div>
              </div>
            </div>
          </GlassPanel>
        </aside>

        {/* CENTER: VIEWPORT (PRO MONITOR) */}
        <div className={`flex-1 bg-zinc-950 relative overflow-hidden flex flex-col lg:flex ${activeTab === 'VIEW' ? 'flex' : 'hidden'}`}>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0">
             <GrifonLogo className="w-96 h-96 grayscale" />
          </div>
          
          {/* MONITOR HUD ELEMENTS */}
          <div className="absolute inset-0 pointer-events-none z-20">
              {/* Corner Brackets */}
              <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-white/10"></div>
              <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-white/10"></div>
              <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-white/10"></div>
              <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-white/10"></div>
              
              {/* REC Indicator */}
              <div className="absolute top-6 right-10 flex items-center gap-2 opacity-60">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_#EF4444]"></div>
                  <span className="text-[10px] font-bold text-red-500 font-mono tracking-widest">REC</span>
              </div>
          </div>

          <div className="flex-1 relative flex items-center justify-center bg-zinc-950/50">
            {narrative && !result && !isLoading && (
              <div className="w-full max-w-4xl p-6 sm:p-12 z-20 animate-in fade-in zoom-in-95 duration-700 h-full flex flex-col">
                 <div className="mb-8 text-center">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">DIRECTOR'S DRAFT LOADED</h2>
                    <p className="text-[10px] text-[#FFCC00] font-mono uppercase tracking-widest">// READY FOR PIXEL INTERPOLATION</p>
                 </div>
                 <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {narrative.map((scene, i) => (
                      <div key={i} className="p-5 bg-zinc-900/80 border border-white/10 rounded-2xl backdrop-blur-xl">
                         <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">{scene.phase}</span>
                            <span className="text-[10px] font-mono font-bold text-[#FFCC00] uppercase">{scene.emotion}</span>
                         </div>
                         <p className="text-sm text-zinc-300 leading-relaxed border-l-2 border-[#FFCC00]/40 pl-4">{scene.action}</p>
                      </div>
                    ))}
                 </div>
                 <div className="mt-8 flex justify-center gap-4">
                    <button onClick={() => setNarrative(null)} className="px-8 py-3 rounded-full border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 text-xs font-bold uppercase transition-all">
                      RE-DRAFT
                    </button>
                    <GoldButton onClick={handleInitializeSynthesis} className="px-10 py-3 text-xs">
                      INITIATE SYNTHESIS
                    </GoldButton>
                 </div>
              </div>
            )}

            {(Object.keys(frameMap).length > 0 || (isLoading && narrative)) && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full h-full relative z-10 p-6 sm:p-10">
                {phases.map((phase, idx) => (
                  <div key={phase.key} className={`relative group overflow-hidden border border-white/10 rounded-2xl bg-zinc-900 shadow-xl transition-all duration-500 ${!frameMap[phase.key] ? 'opacity-40 animate-pulse' : 'opacity-100'}`}>
                    {frameMap[phase.key] ? (
                      <>
                        <img src={frameMap[phase.key]} className={`w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105 ${regeneratingIndex === idx ? 'opacity-50 animate-pulse' : ''}`} />
                        <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3 p-6 z-20">
                             <button onClick={() => handleRegeneratePhase(idx, phase.key)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-white/20 text-white transition-all text-[10px] font-bold uppercase rounded-xl">
                                <RefreshCcw className={`w-3 h-3 ${regeneratingIndex === idx ? 'animate-spin' : ''}`} /> REGENERATE
                             </button>
                             <button onClick={() => handleDownload(frameMap[phase.key]!, phase.key)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-white/20 text-white transition-all text-[10px] font-bold uppercase rounded-xl">
                                <Download className="w-3 h-3" /> DOWNLOAD
                             </button>
                             <button onClick={() => handleEditInStudio(frameMap[phase.key]!)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FFCC00] hover:bg-[#FFCC00]/90 text-black transition-all text-[10px] font-bold uppercase rounded-xl">
                                <Edit2 className="w-3 h-3" /> EDIT
                             </button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        <Loader message="" size="sm" />
                        <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">// PIXEL_LOCKED</p>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-md text-[#FFCC00] text-[10px] font-mono px-3 py-1 rounded-lg uppercase tracking-widest z-10 border border-white/10">
                      {phase.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!narrative && !isLoading && !result && (
              <div className="text-center opacity-40 animate-pulse">
                <Video className="w-16 h-16 mx-auto mb-6 text-zinc-600" />
                <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 font-mono">// STANDBY: AWAITING_SYNTHESIS_INTENT</p>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR: ASSET BAY (RIGHT) */}
        <aside className={`w-full lg:w-80 flex flex-col shrink-0 lg:flex ${activeTab === 'ASSETS' ? 'flex' : 'hidden'}`}>
           <GlassPanel className="h-full p-6 flex flex-col gap-6 overflow-hidden">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-widest">// DATA_ANALYTICS</h3>
              </div>
              
              <div className="space-y-5 flex-1 overflow-y-auto pb-48 md:pb-6 custom-scrollbar">
                {[
                  { id: 'side', label: 'SLOT 1: SIDE_PROFILE', data: config.sideAsset, ref: sideInputRef },
                  { id: 'front', label: 'SLOT 2: FRONT_AXIS', data: config.frontAsset, ref: frontInputRef },
                  { id: 'hero', label: 'SLOT 3: HERO_FINALE', data: config.heroAsset, ref: heroInputRef },
                  { id: 'macro', label: 'SLOT 4: COLOR_DNA', data: config.macroAsset, ref: macroInputRef },
                  { id: 'logo', label: 'SLOT 5: BRAND_MARK', data: config.logoAsset, ref: logoInputRef }
                ].map(slot => (
                  <div key={slot.id} className="space-y-2">
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{slot.label}</label>
                    <div 
                      onClick={() => slot.ref.current?.click()}
                      className={`bg-zinc-950/50 border-2 border-dashed border-white/10 rounded-xl hover:border-[#FFCC00] hover:bg-zinc-800/80 transition-all cursor-pointer flex flex-col items-center justify-center p-6 min-h-[100px] ${slot.data ? 'border-[#FFCC00]/40 bg-[#FFCC00]/5 overflow-hidden p-0' : ''}`}
                    >
                      {slot.data ? <img src={slot.data} className="w-full h-full object-cover" /> : <UploadCloud className="w-6 h-6 text-zinc-600" />}
                      <input type="file" hidden ref={slot.ref} onChange={(e) => handleFileUpload(e, slot.id as any)} accept="image/*" />
                    </div>
                  </div>
                ))}
              </div>
           </GlassPanel>
        </aside>

      </div>

      {/* PRESETS */}
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-2 overflow-x-auto w-full hide-scrollbar pb-2 snap-x z-40 px-4">
        {['THE_ELEMENTAL', 'THE_SPEEDSTER', 'THE_LUXURY', 'THE_FRESH'].map(p => (
          <button key={p} onClick={() => handlePreset(p)} className="shrink-0 whitespace-nowrap text-[10px] font-bold text-zinc-400 hover:text-black hover:bg-[#FFCC00] bg-zinc-900/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full transition-all uppercase shadow-lg">
            {p.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* COMMAND CENTER FOOTER */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-full p-2 flex items-center gap-2 shadow-2xl z-50">
        <div className="flex-1 w-full min-w-[50%] relative">
          <input 
            type="text"
            className="bg-zinc-950 border border-white/10 rounded-full px-6 py-4 text-white focus:outline-none focus:border-[#FFCC00] w-full font-mono text-sm" 
            value={config.concept} 
            onChange={(e) => setConfig({...config, concept: e.target.value})} 
            placeholder="Enter Odyssey Directive..." 
          />
        </div>
        
        <div className="flex gap-2 shrink-0">
          <button onClick={handleResetStudio} className="px-4 py-3 md:px-6 md:py-4 border border-white/10 text-zinc-400 hover:text-white rounded-xl font-bold text-[10px] md:text-xs uppercase hover:bg-white/5 transition-all whitespace-nowrap">
            RESET
          </button>
          
          {!narrative && (
            <button onClick={handleGenerateNarrative} disabled={isLoading} className="shrink-0 bg-[#FFCC00] text-black font-black uppercase tracking-widest px-4 py-3 md:px-8 md:py-4 text-xs md:text-sm rounded-xl hover:shadow-[0_0_20px_rgba(255,204,0,0.4)] transition-all whitespace-nowrap">
              {isLoading ? 'DRAFTING...' : 'INITIATE DRAFT'}
            </button>
          )}

          {narrative && !result && (
            <button onClick={handleInitializeSynthesis} disabled={isLoading} className="shrink-0 bg-[#FFCC00] text-black font-black uppercase tracking-widest px-4 py-3 md:px-8 md:py-4 text-xs md:text-sm rounded-xl hover:shadow-[0_0_20px_rgba(255,204,0,0.4)] transition-all whitespace-nowrap">
              {isLoading ? 'WORKING...' : 'INITIALIZE RENDER'}
            </button>
          )}

          {result && (
            <button onClick={() => setShowVideoPrompts(true)} className="shrink-0 bg-[#FFCC00] text-black font-black uppercase tracking-widest px-4 py-3 md:px-8 md:py-4 text-xs md:text-sm rounded-xl hover:shadow-[0_0_20px_rgba(255,204,0,0.4)] transition-all whitespace-nowrap">
               DEPLOY PROMPTS
            </button>
          )}
        </div>
      </footer>
      {error && <p className="fixed bottom-2 left-1/2 -translate-x-1/2 text-red-500 text-center font-mono text-[10px] animate-pulse uppercase tracking-widest z-50">// ERROR: {error}</p>}
    </div>
  );
};

export default CinematicSpecStudio;

