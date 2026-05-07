import React, { useState, useRef, useEffect, useMemo } from 'react';
import { InfluencerConfig, InfluencerStrategicInput, Scene, InfluencerScriptResponse, OdysseyState } from '../types';
import { generateInfluencerAvatar, generateInfluencerScript, generateInfluencerStoryboard, parseMarketResearchFile, generateVideoPrompts, generateSceneImage, generateThumbnail } from '../services/geminiService';
import { compressImageForUpload } from '../utils/imageCompression';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import { Sparkles, UploadCloud, Camera, RefreshCw, Check, Trash2, Image as ImageIcon, Activity, ChevronLeft, ChevronDown } from 'lucide-react';
import saveAs from 'file-saver';

interface InfluencerForgeProps {
  onBack: () => void;
  ethnicity?: string;
}

type ForgeViewMode = 'PERSONA' | 'MISSION_HUB' | 'MISSION_MAP' | 'SCRIPT_REVIEW' | 'SCENARIO_OUTPUT' | 'THUMBNAIL_DRAFT' | 'VIDEO_DIRECTIVES';
type TacticalFolder = 'BIOMETRIC_DNA' | 'SCENE_CONTEXT' | 'VISUAL_STYLING' | 'OPTIC_TARGET' | null;

const CAMERAS = ['IPHONE_15_PRO', 'SONY_A7IV', 'RED_KOMODO'] as const;
const LENSES = ['35MM_VLOG', '50MM_PRIME', '85MM_CINEMATIC'] as const;
const ENVIRONMENTS = [
  { id: 'OUTDOOR', label: '🌳 OUTDOOR' },
  { id: 'OFFICE', label: '🏢 OFFICE' },
  { id: 'INDOOR', label: '🏠 INDOOR' },
  { id: 'MATCH_UPLOAD', label: '🧬 MATCH' }
] as const;

const ETHNICITIES = ['Filipino/Asian', 'Caucasian', 'Latino', 'African', 'European'] as const;
const GENDERS = ['MALE', 'FEMALE', 'ANY'] as const;
const WARDROBES = ['PROFESSIONAL', 'CASUAL', 'STREETWEAR', 'ELEGANT', 'MINIMALIST'] as const;

const LIGHTING_PRESETS = [
  { id: 'AUTHORITY', label: '🏆 AUTHORITY', icon: '👑' },
  { id: 'NEON_VLOG', label: '⚡ NEON', icon: '🌈' },
  { id: 'NATURAL_STUDIO', label: '🌿 NATURAL', icon: '☀️' },
  { id: 'DARK_MINIMALIST', label: '🌑 DARK', icon: '💎' }
] as const;

const GAMES = [
  { 
    id: 'MEDIA_GAME', 
    label: '🎭 ATTENTION_STORY', 
    desc: 'Viral Reach // Climax-Start Hook', 
    icon: '🎬' 
  },
  { 
    id: 'COMMODITY_VIBE', 
    label: '✨ DESIRE_DEMO', 
    desc: 'Product Aesthetic // Result-First Flow', 
    icon: '🛋️' 
  },
  { 
    id: 'PRODUCT_EDUCATION', 
    label: '💡 REVENUE_TUTORIAL', 
    desc: 'The Gap Strategy // 3-Step Bridge', 
    icon: '🧪' 
  },
  { 
    id: 'B2B_AUTHORITY', 
    label: '🏛️ TRUST_DOMINANCE', 
    desc: 'Consulting // Negative-Hook Pattern', 
    icon: '💼' 
  }
] as const;

const SCENE_LABELS = [
  "[ ATTENTION_HOOK ]",
  "[ AUTHORITY_BRIDGE ]",
  "[ PROOF_INJECTION ]",
  "[ VALUE_STACK ]",
  "[ DESIRE_AMPLIFIER ]",
  "[ SOCIAL_EVIDENCE ]",
  "[ CONVERSION_PITCH ]",
  "[ EXIT_CTA ]"
];

const LightBox: React.FC<{ imageUrl: string, onClose: () => void, title: string, onNext?: () => void, onPrev?: () => void }> = ({ imageUrl, onClose, title, onNext, onPrev }) => (
  <div className="fixed inset-0 z-[500] bg-[#050505] flex flex-col items-center justify-center animate-in fade-in duration-300">
    <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-[510]">
      <div className="flex items-center gap-4">
        <span className="text-[10px] font-black text-[#FFCC00] font-mono tracking-[0.4em] uppercase">VIEW_MODE // SCENE_INSPECTOR</span>
        <h3 className="text-xl font-black italic uppercase text-white">{title}</h3>
      </div>
      <button onClick={onClose} className="p-4 bg-white/5 border border-white/10 rounded-full text-white hover:bg-white/10 transition-all font-black text-xl">&times;</button>
    </div>
    
    <div className="relative group w-full max-w-5xl h-[70vh] flex items-center justify-center px-20">
      <img src={imageUrl} className="max-w-full max-h-full object-contain rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/10" alt="Preview" />
      
      {onPrev && (
        <button onClick={onPrev} className="absolute left-4 p-6 text-white/20 hover:text-[#FFCC00] transition-all text-6xl font-thin">&lt;</button>
      )}
      {onNext && (
        <button onClick={onNext} className="absolute right-4 p-6 text-white/20 hover:text-[#FFCC00] transition-all text-6xl font-thin">&gt;</button>
      )}
    </div>

    <div className="mt-12 flex gap-4">
      <button onClick={() => saveAs(imageUrl, 'forge-scene.png')} className="px-8 py-3 bg-[#FFCC00] text-black font-black uppercase rounded-full text-[10px] shadow-[0_0_15px_rgba(255,204,0,0.5)]">DOWNLOAD_ASSET</button>
      <button onClick={onClose} className="px-8 py-3 bg-white/5 border border-white/10 text-white font-black uppercase rounded-full text-[10px]">EXIT_VIEW</button>
    </div>
  </div>
);

const InfluencerForge: React.FC<InfluencerForgeProps> = ({ onBack, ethnicity: globalEthnicity }) => {
  const [viewMode, setViewMode] = useState<ForgeViewMode>('PERSONA');
  const [openFolder, setOpenFolder] = useState<TacticalFolder>('BIOMETRIC_DNA');
  const [config, setConfig] = useState<InfluencerConfig>({
    sourceType: 'NEURAL_GEN',
    gender: 'FEMALE',
    ethnicity: (globalEthnicity as any) || 'Filipino/Asian',
    ageRange: '25',
    wardrobe: 'CASUAL',
    brandColor: '#00F2FF',
    environment: 'OUTDOOR',
    lightingPreset: 'AUTHORITY',
    studioColor: '#00F2FF',
    camera: 'SONY_A7IV',
    lens: '85MM_CINEMATIC',
    aspectRatio: '9:16',
    quality: '1K',
    language: 'TAGLISH',
    archetype: 'AUTHORITY',
    format: 'SHORT_FORM',
    monetizationGame: 'B2B_AUTHORITY'
  });

  const [strategicInput, setStrategicInput] = useState<InfluencerStrategicInput>({
    subject: '', offer: '', dreamCustomer: '', bleedingNeck: '', deepFear: '', magicGenie: '', rawEvidence: '', contrarianTruth: ''
  });

  const [odyssey, setOdyssey] = useState<OdysseyState>({
    currentDay: 1,
    game: 'B2B_AUTHORITY',
    seriesContext: '',
    history: Array.from({ length: 30 }, (_, i) => ({
      dayNumber: i + 1,
      mission: i < 7 ? 'TRUST_FOUNDATION' : i < 21 ? 'VALUE_DENSITY' : 'THE_BRIDGE',
      status: 'LOCKED'
    }))
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loadingScenes, setLoadingScenes] = useState<number[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; description: string } | null>(null);
  const [scriptResult, setScriptResult] = useState<InfluencerScriptResponse | null>(null);
  const [storyboardResult, setStoryboardResult] = useState<{ scenes: Scene[]; directorNote: string } | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [promptsResult, setPromptsResult] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeLightbox, setActiveLightbox] = useState<{ index: number, frame: 'start' | 'end' } | null>(null);
  
  const personaFileRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);

  const readyPercentage = useMemo(() => {
    const fields = [
      strategicInput.subject,
      strategicInput.offer,
      strategicInput.dreamCustomer,
      strategicInput.magicGenie,
      strategicInput.rawEvidence,
      strategicInput.bleedingNeck,
      strategicInput.contrarianTruth
    ];
    const filledCount = fields.filter(f => f && f.trim().length > 0).length;
    return Math.round((filledCount / fields.length) * 100);
  }, [strategicInput]);

  useEffect(() => {
    const saved = localStorage.getItem('INFLUENCER_ODYSSEY_v1');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        setOdyssey(parsed);
      } catch (e) { console.error("Restore Failed"); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('INFLUENCER_ODYSSEY_v1', JSON.stringify(odyssey));
  }, [odyssey]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { dataUrl } = await compressImageForUpload(file);
    setConfig(prev => ({ ...prev, uploadedPhoto: dataUrl, sourceType: 'UPLOAD' }));
  };

  const injectMarketMind = () => {
    const savedReport = localStorage.getItem('marketMindReport');
    if (savedReport) {
      setIsExtracting(true);
      parseMarketResearchFile(savedReport).then(data => {
        setStrategicInput(prev => ({ ...prev, ...data }));
        setIsExtracting(false);
        setSuccessMsg("MARKET_INTELLIGENCE_INJECTED");
      }).catch(() => {
        setError("MARKETMIND_SYNC_FAILED");
        setIsExtracting(false);
      });
    } else {
      setError("NO_REPORT_FOUND: Run MarketMind module first.");
    }
  };

  const injectOfferStack = () => {
    const savedStack = localStorage.getItem('offerOptimizerBlueprint');
    if (savedStack) {
      setStrategicInput(prev => ({ ...prev, offer: savedStack.substring(0, 500) }));
      setSuccessMsg("OFFER_STACK_INJECTED");
    } else {
      setError("NO_OFFER_FOUND: Run OfferOptimizer first.");
    }
  };

  const onForge = async () => {
    setIsLoading(true); setError(null);
    try {
      const persona = await generateInfluencerAvatar(config);
      setResult(persona);
      setSuccessMsg("PERSONA_SYNTHESIS_COMPLETE");
    } catch (err) { setError("NEURAL_FORGE_FAILED"); } finally { setIsLoading(false); }
  };

  const onSynthesizeDay = async (dayNum: number) => {
    setIsLoading(true); setError(null);
    try {
      const script = await generateInfluencerScript(config, strategicInput, dayNum, odyssey.seriesContext);
      setScriptResult(script);
      setSuccessMsg(`DAY_0${dayNum}_SIGNAL_GENERATED`);
      setViewMode('SCRIPT_REVIEW');
    } catch (err) { setError("ODYSSEY_SYNTHESIS_FAILED"); } finally { setIsLoading(false); }
  };

  const onGenerateStoryboard = async () => {
    if (!scriptResult) return;
    setIsLoading(true);
    try {
      const data = await generateInfluencerStoryboard(config, scriptResult);
      setStoryboardResult(data);
      setSuccessMsg("STORYBOARD_SYNTHESIS_COMPLETE");
      setViewMode('SCENARIO_OUTPUT');
    } catch (e) { setError("STORYBOARD_FAILED"); } finally { setIsLoading(false); }
  };

  /**
   * Surgical Refactor: Added Dual-Frame logic for SCENE_01.
   * Replaced global loading with card-level loading.
   */
  const onSynthesizeSingleScene = async (index: number) => {
    if (!storyboardResult || !result) return;
    setLoadingScenes(prev => [...prev, index]);
    try {
      const scene = storyboardResult.scenes[index];
      const ethnicity = config.ethnicity;
      const brandColors = [config.brandColor];
      
      if (index === 0) {
        // Dual-Frame Hook Generation
        const [startUrl, endUrl] = await Promise.all([
          generateSceneImage(
            `BELIEF CHALLENGE: ${scene.sceneDescription}`,
            config.aspectRatio as any,
            config.quality as any,
            { avatarUrl: result.url },
            ethnicity, brandColors, 'MrBeast', undefined, undefined, index, scene.referenceImage
          ),
          generateSceneImage(
            `SHOCKING RESULT PAYOFF: ${scene.sceneDescription}`,
            config.aspectRatio as any,
            config.quality as any,
            { avatarUrl: result.url },
            ethnicity, brandColors, 'MrBeast', undefined, undefined, index + 10, scene.referenceImage
          )
        ]);
        const updatedScenes = [...storyboardResult.scenes];
        updatedScenes[index] = { ...scene, imageUrl: startUrl, endFrameImageUrl: endUrl };
        setStoryboardResult({ ...storyboardResult, scenes: updatedScenes });
      } else {
        // Standard Single Frame
        const imgUrl = await generateSceneImage(
          scene.sceneDescription,
          config.aspectRatio as any,
          config.quality as any,
          { avatarUrl: result.url },
          ethnicity, brandColors, 'MrBeast', undefined, undefined, index, scene.referenceImage
        );
        const updatedScenes = [...storyboardResult.scenes];
        updatedScenes[index] = { ...scene, imageUrl: imgUrl };
        setStoryboardResult({ ...storyboardResult, scenes: updatedScenes });
      }
      
      // Haptic Feedback for synthesis complete
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      
    } catch (e) {
      console.error("SCENE_GEN_FAILED", e);
      setError("SCENE_GEN_FAILED");
    } finally {
      setLoadingScenes(prev => prev.filter(i => i !== index));
    }
  };

  const onGenerateThumbnail = async () => {
    if (!result || !scriptResult) return;
    setIsLoading(true);
    setError(null);
    try {
      const url = await generateThumbnail(
        [scriptResult.hook, ...scriptResult.body],
        result.description,
        { product: strategicInput.subject } as any,
        config.aspectRatio === '16:9' ? '16:9' : '9:16',
        result.url,
        config.quality === '4K' ? '2K' : '1K' as any,
        [config.brandColor]
      );
      setThumbnailUrl(url);
      setViewMode('THUMBNAIL_DRAFT');
    } catch (e) {
      setError("THUMBNAIL_GEN_FAILED");
    } finally {
      setIsLoading(false);
    }
  };

  const onGeneratePrompts = async () => {
    if (!storyboardResult) return;
    setIsLoading(true);
    try {
        const prompts = await generateVideoPrompts(storyboardResult.scenes, { product: strategicInput.subject, scriptType: 'Custom' } as any);
        setPromptsResult(prompts);
        setSuccessMsg("TECHNICAL_DIRECTIVES_GENERATED");
        setViewMode('VIDEO_DIRECTIVES');
    } catch (e) { setError("PROMPT_GEN_FAILED"); } finally { setIsLoading(false); }
  };

  const onCompleteMission = () => {
    if (!scriptResult || !storyboardResult) return;
    
    const newHistory = [...odyssey.history];
    newHistory[odyssey.currentDay - 1] = {
      ...newHistory[odyssey.currentDay - 1],
      status: 'SYNTHESIZED',
      script: scriptResult,
      storyboard: storyboardResult.scenes
    };

    setOdyssey({
      ...odyssey,
      currentDay: Math.min(odyssey.currentDay + 1, 30),
      seriesContext: odyssey.seriesContext + " " + (scriptResult.daySummary || ""),
      history: newHistory
    });
    
    setSuccessMsg(`ODYSSEY_MISSION_DAY_0${odyssey.currentDay}_COMPLETE`);
    setViewMode('MISSION_MAP');
  };

  const UnifiedTerminalHeader = (
    <header className="flex flex-col items-start gap-4 mb-8 w-full border-b border-white/10 pb-6 relative z-20 shrink-0">
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">
                    <ChevronLeft className="w-4 h-4" /> <span className="hidden md:inline">COMMAND CENTER</span><span className="md:hidden">BACK</span>
                </button>
                {viewMode !== 'PERSONA' && (
                    <button 
                      onClick={() => {
                        if (viewMode === 'MISSION_HUB') setViewMode('PERSONA');
                        else if (viewMode === 'MISSION_MAP') setViewMode('MISSION_HUB');
                        else if (viewMode === 'SCRIPT_REVIEW') setViewMode('MISSION_MAP');
                        else if (viewMode === 'SCENARIO_OUTPUT') setViewMode('SCRIPT_REVIEW');
                        else if (viewMode === 'THUMBNAIL_DRAFT') setViewMode('SCENARIO_OUTPUT');
                        else if (viewMode === 'VIDEO_DIRECTIVES') setViewMode('SCENARIO_OUTPUT');
                      }}
                      className="text-[9px] font-black text-gray-500 border border-white/10 px-4 py-2 rounded-full hover:text-white transition-all uppercase tracking-widest"
                    >
                        [ BACK ]
                    </button>
                )}
            </div>
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight break-words whitespace-normal leading-tight">
              Influencer Forge
          </h1>
          <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
              // DIGITAL_PERSONA_SYNTHESIS
          </p>
        </div>
    </header>
  );

  const TacticalFolderHeader: React.FC<{ id: TacticalFolder, label: string, isOpen: boolean }> = ({ id, label, isOpen }) => (
    <button 
      onClick={() => setOpenFolder(isOpen ? null : id)}
      className={`w-full flex justify-between items-center px-6 py-5 border-b border-white/10 transition-all group ${isOpen ? 'bg-white/[0.02]' : 'hover:bg-white/[0.02]'}`}
    >
      <span className={`text-[10px] font-black tracking-[0.3em] font-mono transition-colors ${isOpen ? 'text-zinc-300' : 'text-gray-500 group-hover:text-white'}`}>
        [ {label} ]
      </span>
      <div className={`w-1.5 h-1.5 rounded-full transition-all ${isOpen ? 'bg-[#FFCC00] shadow-[0_0_10px_#FFCC00]' : 'bg-gray-800'}`}></div>
    </button>
  );

  const isForgeDisabled = useMemo(() => {
    return isLoading || !config.ageRange || !config.ethnicity || (config.sourceType === 'UPLOAD' && !config.uploadedPhoto);
  }, [isLoading, config.ageRange, config.ethnicity, config.sourceType, config.uploadedPhoto]);

  // --- PHASE RENDERS ---

  if (viewMode === 'VIDEO_DIRECTIVES' && promptsResult) {
    return (
        <div className="h-screen bg-[#050505] text-white font-mono flex flex-col p-4 sm:p-8 overflow-hidden relative">
            {UnifiedTerminalHeader}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20 space-y-6 relative">
                <div className="grid grid-cols-1 gap-6">
                    {promptsResult.map((p, i) => (
                        <div key={i} className="p-8 glass-morphism border border-white/10 rounded-[2.5rem] bg-zinc-950/40 group">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-black text-[#FFCC00]">PROMPT_SEQUENCE_0{i+1} [ {p.type?.toUpperCase()} ]</span>
                                <button onClick={() => { navigator.clipboard.writeText(p.prompt); }} className="text-[9px] font-black text-white/40 hover:text-[#FFCC00] transition-colors uppercase">[ COPY_PROMPT ]</button>
                            </div>
                            <pre className="text-xs text-gray-400 whitespace-pre-wrap leading-relaxed font-mono bg-zinc-950/40 p-6 rounded-2xl border border-white/10 italic">
                                {p.prompt}
                            </pre>
                        </div>
                    ))}
                </div>
            </div>
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-4 bg-zinc-950/80 backdrop-blur-2xl p-4 rounded-full border border-white/10 shadow-2xl">
                <GoldButton onClick={onCompleteMission} className="rounded-full px-12 py-3 text-xs bg-[#FFCC00] text-black shadow-[0_0_15px_rgba(255,204,0,0.5)] font-black uppercase tracking-widest">
                    COMPLETE_DAILY_MISSION
                </GoldButton>
            </div>
        </div>
    );
  }

  if (viewMode === 'THUMBNAIL_DRAFT') {
    return (
      <div className="h-screen bg-[#050505] text-white font-mono flex flex-col p-4 sm:p-8 overflow-hidden relative">
        {UnifiedTerminalHeader}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20 flex flex-col items-center justify-center relative">
           {isLoading && (
              <div className="absolute inset-0 z-[100] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center">
                  <Loader message="RENDERING_THUMBNAIL_V2..." />
              </div>
           )}
           {thumbnailUrl ? (
             <div className="w-full max-w-2xl animate-in zoom-in-95 duration-700">
               <div className="relative border-4 border-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.5)] rounded-[2.5rem] overflow-hidden group">
                  <img src={thumbnailUrl} className="w-full h-auto object-contain" alt="Viral Thumbnail" />
                  <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                      <button onClick={onGenerateThumbnail} className="p-4 bg-[#FFCC00] text-black rounded-full hover:scale-110 transition-all"><RefreshCw className="w-8 h-8" /></button>
                      <button onClick={() => saveAs(thumbnailUrl, 'viral-thumbnail.png')} className="p-4 bg-white text-black rounded-full hover:scale-110 transition-all"><UploadCloud className="w-8 h-8" /></button>
                  </div>
               </div>
               <div className="flex gap-4 mt-8 justify-center">
                  <GoldButton onClick={onGenerateThumbnail} className="rounded-full px-8 border-[#FFCC00] text-[#FFCC00]">REGENERATE_THUMBNAIL</GoldButton>
                  <GoldButton onClick={() => saveAs(thumbnailUrl, 'viral-thumbnail.png')} className="rounded-full px-8 bg-[#FFCC00] text-black">DOWNLOAD_THUMBNAIL</GoldButton>
               </div>
             </div>
           ) : (
             <div className="text-center space-y-6">
                <div className="w-48 h-48 bg-white/5 border border-dashed border-white/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                   <ImageIcon className="w-16 h-16 text-gray-700" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-widest text-white/40">THUMBNAIL_ENGINE_STANDBY</h3>
                <GoldButton onClick={onGenerateThumbnail} className="rounded-full px-12 py-4 bg-[#FFCC00] text-black font-black uppercase shadow-[0_0_15px_rgba(255,204,0,0.5)]">GENERATE_THUMBNAIL</GoldButton>
             </div>
           )}
        </div>
      </div>
    );
  }

  if (viewMode === 'SCENARIO_OUTPUT' && storyboardResult) {
    return (
      <div className="h-screen bg-[#050505] text-white font-mono flex flex-col p-4 sm:p-8 overflow-hidden relative">
        {UnifiedTerminalHeader}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20 space-y-6 relative">
           
           {activeLightbox && (
              <LightBox 
                imageUrl={activeLightbox.frame === 'start' ? storyboardResult.scenes[activeLightbox.index].imageUrl! : storyboardResult.scenes[activeLightbox.index].endFrameImageUrl!} 
                title={SCENE_LABELS[activeLightbox.index] || `SCENE_0${activeLightbox.index + 1}`}
                onClose={() => setActiveLightbox(null)}
                onNext={activeLightbox.index < storyboardResult.scenes.length - 1 ? () => setActiveLightbox({ ...activeLightbox, index: activeLightbox.index + 1 }) : undefined}
                onPrev={activeLightbox.index > 0 ? () => setActiveLightbox({ ...activeLightbox, index: activeLightbox.index - 1 }) : undefined}
              />
           )}

           <div className="p-8 bg-[#FFCC00]/5 border border-[#FFCC00]/20 rounded-[2.5rem] relative">
              <span className="absolute top-0 left-0 bg-brand-yellow text-black text-[9px] px-3 py-1 font-black">[ DIRECTOR_STRATEGY ]</span>
              <p className="text-sm italic text-gray-300">"{storyboardResult.directorNote || "Visual rhythm optimized for 30/70 conversion ratio."}"</p>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {storyboardResult.scenes.map((s, i) => (
                <div key={i} className="glass-morphism border border-white/10 rounded-3xl hover:border-[#FFCC00]/40 transition-all flex flex-col group overflow-hidden bg-zinc-950/40 relative">
                   
                   {loadingScenes.includes(i) && (
                      <div className="absolute inset-0 z-30 bg-zinc-950/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                         <div className="w-12 h-12 border-4 border-[#FFCC00]/20 border-t-[#FFCC00] rounded-full animate-spin"></div>
                         <p className="text-[8px] font-black uppercase tracking-widest text-[#FFCC00] animate-pulse">SYNTHESIZING...</p>
                      </div>
                   )}

                   <div className="aspect-[9/16] bg-zinc-950/60 relative group flex items-center justify-center">
                      {s.imageUrl ? (
                        <>
                          <img 
                            src={s.imageUrl} 
                            onClick={() => setActiveLightbox({ index: i, frame: 'start' })}
                            className="w-full h-full object-cover cursor-zoom-in" 
                            alt={`Scene ${i+1}`} 
                          />
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                             <button onClick={() => onSynthesizeSingleScene(i)} className="p-2 bg-zinc-950/80 rounded-full text-[#FFCC00] hover:scale-110 transition-all border border-white/10"><RefreshCw className="w-4 h-4" /></button>
                             {s.endFrameImageUrl && (
                               <button onClick={() => setActiveLightbox({ index: i, frame: 'end' })} className="p-2 bg-zinc-950/80 rounded-full text-brand-yellow hover:scale-110 transition-all border border-white/10" title="View End Frame"><Activity className="w-4 h-4" /></button>
                             )}
                          </div>
                        </>
                      ) : (
                        <button 
                          onClick={() => onSynthesizeSingleScene(i)}
                          disabled={loadingScenes.includes(i)}
                          className="flex flex-col items-center gap-3 text-[10px] font-black text-[#FFCC00]/40 group-hover:text-[#FFCC00] transition-all disabled:opacity-0"
                        >
                           <Sparkles className="w-8 h-8" />
                           [ RENDER ]
                        </button>
                      )}
                      
                      <div className="absolute top-3 left-3 flex flex-col gap-1 z-10 pointer-events-none">
                         <span className="bg-zinc-950/80 text-[#FFCC00] text-[7px] px-2 py-0.5 rounded font-black tracking-tighter uppercase border border-[#FFCC00]/20">SCENE_0{i+1}</span>
                         <span className="bg-brand-yellow text-black text-[6px] px-2 py-0.5 rounded font-black uppercase tracking-tighter">{SCENE_LABELS[i] || '[ CONTENT ]'}</span>
                         {i === 0 && <span className="bg-white/10 backdrop-blur-md text-white text-[5px] px-2 py-0.5 rounded font-black uppercase tracking-tighter border border-white/10">[ DUAL_FRAME_HOOK ]</span>}
                      </div>
                   </div>
                   
                   <div className="p-4 pt-3 flex-1 flex flex-col justify-between">
                      <p className="text-[10px] font-black italic line-clamp-2 text-white/80 leading-tight">"{s.scriptLine}"</p>
                      <div className="mt-3 p-2 bg-white/[0.02] rounded-lg border border-white/10">
                          <p className="text-[7px] text-gray-500 leading-tight italic uppercase tracking-tighter">{s.sceneDescription}</p>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-4 bg-zinc-950/80 backdrop-blur-2xl p-4 rounded-full border border-white/10 shadow-2xl">
          <GoldButton onClick={onGenerateThumbnail} disabled={isLoading} className="rounded-full px-10 py-3 text-xs font-black uppercase bg-brand-yellow text-black shadow-neon-yellow">GENERATE_THUMBNAIL</GoldButton>
          <GoldButton 
            onClick={onGeneratePrompts} 
            disabled={isLoading || loadingScenes.length > 0} 
            className={`rounded-full px-12 py-3 text-xs font-black uppercase transition-all duration-300 ${isLoading ? 'opacity-50 cursor-not-allowed bg-gray-600' : 'bg-[#FFCC00] text-black shadow-[0_0_15px_rgba(255,204,0,0.5)]'}`}
          >
            {isLoading ? <><RefreshCw className="w-4 h-4 animate-spin inline-block mr-2" /> [ WORKING... ]</> : 'GENERATE_TECHNICAL_DIRECTIVES'}
          </GoldButton>
        </div>
      </div>
    );
  }

  if (viewMode === 'SCRIPT_REVIEW' && scriptResult) {
    return (
      <div className="h-screen bg-[#050505] text-white font-mono flex flex-col p-4 sm:p-8 overflow-hidden relative">
        {UnifiedTerminalHeader}
        <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 z-[100] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center rounded-[3rem]">
                <Loader message="MODULATING_SIGNAL..." />
            </div>
          )}
          <main className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-4">
             <div className="p-6 bg-[#FFCC00]/5 border border-[#FFCC00]/20 rounded-3xl mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#FFCC00] animate-pulse"></div>
                <p className="text-xs text-brand-yellow font-black uppercase mb-2">[ STRATEGIC_AUDIT ]</p>
                <p className="text-sm text-gray-300 italic">"{scriptResult.strategicAudit}"</p>
             </div>
             <div className="p-6 bg-zinc-950 border border-white/10 rounded-3xl">
                <label className="text-[9px] font-black text-[#FFCC00] uppercase mb-3 block">HOOK [ 3s MAX ]</label>
                <textarea className="w-full bg-transparent border-none text-xl font-black text-white italic h-16 resize-none focus:ring-0 text-sm" value={scriptResult.hook} onChange={(e) => setScriptResult({...scriptResult, hook: e.target.value})} />
             </div>
             {scriptResult.body.map((l, i) => (
               <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-2xl group hover:border-[#FFCC00]/20 transition-all">
                  <label className="text-[7px] text-gray-600 uppercase font-black mb-1 block">LINE_0{i+1}</label>
                  <textarea className="w-full bg-transparent border-none text-sm text-gray-400 h-10 resize-none focus:ring-0" value={l} onChange={(e) => {
                    const nb = [...scriptResult.body]; nb[i] = e.target.value; setScriptResult({...scriptResult, body: nb});
                  }} />
               </div>
             ))}
          </main>
          <aside className="w-full lg:w-80 glass-morphism p-8 rounded-[3rem] flex flex-col justify-between border border-white/10 relative h-full">
             <div className="space-y-6">
                <h3 className="text-[10px] font-black text-[#FFCC00] border-b border-white/10 pb-2">MISSION_DETAILS</h3>
                <div className="p-6 bg-[#FFCC00]/10 rounded-[2rem] border border-[#FFCC00]/20 text-center">
                   <p className="text-[9px] font-black uppercase text-white/60 mb-1">CURRENT_DAY</p>
                   <p className="text-4xl font-black text-[#FFCC00] italic">0{odyssey.currentDay}</p>
                </div>
                <div className="space-y-2">
                    <p className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">PHASE_TARGET</p>
                    <p className="text-[10px] text-white font-black uppercase tracking-tighter bg-white/5 px-4 py-2 rounded-lg">{odyssey.history[odyssey.currentDay-1].mission}</p>
                </div>
             </div>
              <GoldButton 
                onClick={onGenerateStoryboard} 
                disabled={isLoading} 
                className={`w-full py-6 rounded-full font-black uppercase tracking-widest transition-all duration-300 ${isLoading ? 'opacity-50 cursor-not-allowed bg-gray-600' : 'bg-[#FFCC00] text-black shadow-[0_0_15px_rgba(255,204,0,0.5)]'}`}
             >
                {isLoading ? <><RefreshCw className="w-4 h-4 animate-spin inline-block mr-2" /> [ WORKING... ]</> : 'INITIATE_SCENARIO'}
             </GoldButton>
          </aside>
        </div>
      </div>
    );
  }

  if (viewMode === 'MISSION_MAP') {
    return (
      <div className="h-screen bg-[#050505] text-white font-mono flex flex-col p-4 sm:p-8 overflow-hidden relative">
        {UnifiedTerminalHeader}
        <div className="flex-1 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-4 overflow-y-auto pr-2 custom-scrollbar p-1 relative">
          {isLoading && (
            <div className="absolute inset-0 z-[100] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center rounded-[3rem]">
                <Loader message="QUERYING_MISSION_MAP..." />
            </div>
          )}
          {odyssey.history.map((day) => (
            <div 
              key={day.dayNumber}
              className={`
                aspect-square rounded-[1.2rem] border flex flex-col items-center justify-center relative group transition-all duration-500
                ${day.status === 'SYNTHESIZED' ? 'bg-[#FFCC00]/10 border-[#FFCC00]/40 shadow-[0_0_15px_rgba(255,204,0,0.2)] cursor-pointer hover:scale-105' : 
                  day.dayNumber === odyssey.currentDay ? 'bg-[#FFCC00]/5 border-[#FFCC00] border-2 shadow-[0_0_15px_rgba(255,204,0,0.2)] animate-pulse cursor-pointer hover:scale-110' : 
                  'bg-white/[0.02] border-white/10 opacity-30'}
              `}
              onClick={() => {
                if (day.status === 'SYNTHESIZED') { 
                    setScriptResult(day.script!); 
                    setStoryboardResult({scenes: day.storyboard!, directorNote: ""}); 
                    setViewMode('SCENARIO_OUTPUT'); 
                }
                else if (day.dayNumber === odyssey.currentDay) onSynthesizeDay(day.dayNumber);
              }}
            >
              <span className={`text-xl font-black italic ${day.dayNumber === odyssey.currentDay ? 'text-[#FFCC00]' : 'text-white'}`}>{day.dayNumber}</span>
              <span className="text-[6px] text-gray-500 mt-1 uppercase font-mono tracking-widest">{day.status}</span>
              {day.status === 'SYNTHESIZED' && <div className="absolute top-2 right-2 w-2 h-2 bg-[#FFCC00] rounded-full shadow-[0_0_8px_rgba(255,204,0,0.5)]"></div>}
            </div>
          ))}
        </div>

        <div className="mt-12 p-10 glass-morphism border-2 border-[#FFCC00]/30 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-10 bg-zinc-950/40 relative overflow-hidden shrink-0">
           <div className="absolute top-0 right-0 p-4 opacity-5"><Activity className="w-32 h-32 text-[#FFCC00]" /></div>
           <div className="flex items-center gap-8 relative z-10">
              <div className="w-20 h-20 rounded-full bg-[#FFCC00]/20 border-2 border-[#FFCC00]/40 flex items-center justify-center">
                 <Sparkles className="w-10 h-10 text-[#FFCC00] animate-pulse" />
              </div>
              <div className="space-y-1">
                 <p className="text-[11px] font-black text-[#FFCC00] uppercase tracking-widest">ACTIVE_PHASE_PROTOCOL</p>
                 <h2 className="text-3xl font-black uppercase italic leading-none">DAY_{odyssey.currentDay}: {odyssey.history[odyssey.currentDay-1].mission}</h2>
              </div>
           </div>
           <GoldButton 
            onClick={() => onSynthesizeDay(odyssey.currentDay)} 
            disabled={isLoading}
            className={`rounded-full px-16 py-6 font-black text-sm uppercase tracking-widest group relative z-10 transition-all hover:scale-105 active:scale-95 duration-300 ${isLoading ? 'opacity-50 cursor-not-allowed bg-gray-600' : 'bg-[#FFCC00] text-black shadow-[0_0_15px_rgba(255,204,0,0.5)]'}`}
           >
             {isLoading ? <><RefreshCw className="w-4 h-4 animate-spin inline-block mr-2" /> [ WORKING... ]</> : <>INITIATE_DAY_0{odyssey.currentDay}_SIGNAL <span className="inline-block group-hover:translate-x-2 transition-transform ml-2"> &gt;&gt; </span></>}
           </GoldButton>
        </div>
      </div>
    );
  }

  if (viewMode === 'MISSION_HUB') {
    return (
      <div className="h-screen bg-[#050505] text-white font-mono flex flex-col p-4 sm:p-8 overflow-hidden relative">
        {UnifiedTerminalHeader}
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 gap-8 overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 z-[100] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center rounded-[3rem]">
                <Loader message="OPTIMIZING_STRATEGIC_UPLINK..." />
            </div>
          )}
          <div className="order-1 lg:order-1 glass-morphism border border-white/10 rounded-[3rem] p-8 flex flex-col items-center justify-center bg-zinc-950/40 relative group overflow-hidden h-64 lg:h-full shrink-0">
             {result ? (
                <div className="w-full h-full flex flex-col items-center justify-center relative">
                    <img src={result.url} className="w-auto h-auto max-w-full max-h-[90%] object-contain rounded-[2rem] shadow-2xl transition-transform duration-700 group-hover:scale-105" alt="Identity" />
                    
                    <div className="absolute bottom-6 flex gap-3 z-30">
                        {config.sourceType === 'NEURAL_GEN' && (
                            <button 
                                onClick={onForge}
                                disabled={isLoading}
                                className={`bg-zinc-950/60 backdrop-blur-xl border border-white/20 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all text-white flex items-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> [ REGENERATE_DNA ]
                            </button>
                        )}
                        <button 
                            onClick={() => saveAs(result.url, 'persona-dna-8k.png')}
                            className="bg-[#FFCC00] border border-[#FFCC00] px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-black shadow-[0_0_15px_rgba(255,204,0,0.5)] hover:scale-105 transition-all"
                        >
                            DOWNLOAD_DNA
                        </button>
                    </div>
                </div>
             ) : config.uploadedPhoto && (
                 <div className="w-full h-full flex flex-col items-center justify-center relative">
                    <img src={config.uploadedPhoto} className="w-auto h-auto max-w-full max-h-[90%] object-contain rounded-[2rem] shadow-2xl opacity-60" alt="Identity" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Check className="w-12 h-12 text-[#FFCC00] mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">SOURCE_DNA_LOCKED</p>
                    </div>
                 </div>
             )}
          </div>

          <div className="order-2 lg:order-2 glass-morphism border border-white/10 rounded-[3rem] p-8 lg:p-10 flex flex-col gap-6 overflow-y-auto custom-scrollbar bg-[#080808] h-full">
             <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h3 className="text-[11px] font-black text-[#FFCC00] uppercase tracking-widest">[ STRATEGIC_UPLINK ]</h3>
                <div className="flex gap-2">
                    <button 
                    onClick={injectOfferStack}
                    className="text-[9px] font-black text-brand-yellow border-2 border-brand-yellow shadow-[0_0_15_rgba(255,204,0,0.2)] px-4 py-2 rounded-full hover:bg-brand-yellow hover:text-black transition-all uppercase font-mono"
                    >
                    [ INJECT_OFFERSTACK ]
                    </button>
                    <button 
                    onClick={injectMarketMind}
                    className="text-[9px] font-black text-brand-yellow border-2 border-brand-yellow shadow-[0_0_15_rgba(255,204,0,0.2)] px-4 py-2 rounded-full hover:bg-brand-yellow hover:text-black transition-all uppercase font-mono"
                    >
                    [ INJECT_MARKETMIND_REPORT ]
                    </button>
                </div>
             </div>

             <div className="space-y-6">
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-brand-yellow uppercase tracking-widest">SELECT_MONETIZATION_GAME</label>
                        <div className="bg-[#FFCC00] text-black text-[9px] font-black px-3 py-1 font-mono tracking-widest uppercase shadow-lg">
                            [ DIRECTOR_AUDIT ]
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {GAMES.map(g => (
                            <button 
                                key={g.id}
                                onClick={() => setConfig({...config, monetizationGame: g.id as any})}
                                className={`p-4 rounded-2xl border-2 text-left transition-all ${config.monetizationGame === g.id ? 'bg-[#FFCC00]/10 border-[#FFCC00]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className="text-xl">{g.icon}</span>
                                    {config.monetizationGame === g.id && <div className="w-1.5 h-1.5 bg-[#FFCC00] rounded-full shadow-[0_0_15px_rgba(255,204,0,0.5)]"></div>}
                                </div>
                                <p className="text-[9px] font-black uppercase text-white">{g.label}</p>
                                <p className="text-[7px] text-gray-500 font-mono leading-tight mt-1">{g.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white uppercase tracking-widest">PRIMARY_TOPIC / NICHE</label>
                      <input 
                        className="w-full bg-zinc-950/40 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-mono text-white placeholder-gray-700 focus:border-[#FFCC00] outline-none transition-all text-sm"
                        value={strategicInput.subject} 
                        onChange={(e) => setStrategicInput({...strategicInput, subject: e.target.value})} 
                        placeholder="> e.g., Vertical AI for Agencies" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white uppercase tracking-widest">WINNING_OFFER</label>
                      <input 
                        className="w-full bg-zinc-950/40 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-mono text-white placeholder-gray-700 focus:border-[#FFCC00] outline-none transition-all text-sm"
                        value={strategicInput.offer} 
                        onChange={(e) => setStrategicInput({...strategicInput, offer: e.target.value})} 
                        placeholder="> e.g., $10k/mo Retention System" 
                      />
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-black text-brand-yellow uppercase tracking-widest">DEEP_INTEL_MATRIX</label>
                        {isExtracting && <span className="text-[8px] text-brand-yellow animate-pulse font-mono uppercase">SYNCING_DATA...</span>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-white uppercase tracking-widest">DREAM_AVATAR</label>
                           <input 
                              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-mono text-white placeholder-gray-700 focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] outline-none text-sm"
                              value={strategicInput.dreamCustomer}
                              onChange={(e) => setStrategicInput({...strategicInput, dreamCustomer: e.target.value})}
                              placeholder="> Name, Age, Occupation..."
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-white uppercase tracking-widest">MAGIC_GENIE_WISH</label>
                           <input 
                              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-mono text-white placeholder-gray-700 focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] outline-none text-sm"
                              value={strategicInput.magicGenie}
                              onChange={(e) => setStrategicInput({...strategicInput, magicGenie: e.target.value})}
                              placeholder="> Ultimate desired outcome..."
                           />
                        </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-white uppercase tracking-widest">RAW_EVIDENCE_PROOFS</label>
                       <textarea 
                          className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-4 text-[10px] font-mono text-white placeholder-gray-700 focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] outline-none resize-none h-16 text-sm"
                          value={strategicInput.rawEvidence}
                          onChange={(e) => setStrategicInput({...strategicInput, rawEvidence: e.target.value})}
                          placeholder="> Key case study or proof point data..."
                       />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-white uppercase tracking-widest">THE_BLEEDING_NECK</label>
                      <textarea 
                        className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-4 text-[10px] font-mono text-white placeholder-gray-700 focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] outline-none resize-none h-16 text-sm"
                        value={strategicInput.bleedingNeck} 
                        onChange={(e) => setStrategicInput({...strategicInput, bleedingNeck: e.target.value})} 
                        placeholder="> #1 Urgent daily frustration..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-white uppercase tracking-widest">CONTRARIAN_TRUTH</label>
                      <textarea 
                        className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-4 text-[10px] font-mono text-white placeholder-gray-700 focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] outline-none resize-none h-16 text-sm"
                        value={strategicInput.contrarianTruth} 
                        onChange={(e) => setStrategicInput({...strategicInput, contrarianTruth: e.target.value})} 
                        placeholder="> Pattern interrupt or surprising angle..."
                      />
                    </div>
                </div>
             </div>

             <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                <div className={`shrink-0 px-4 py-2 border rounded-full font-black font-mono text-[9px] uppercase transition-all duration-1000 ${readyPercentage === 100 ? 'border-[#FFCC00] text-[#FFCC00] shadow-[0_0_10px_rgba(255,204,0,0.5)]' : 'border-white/10 text-gray-500'}`}>
                    [ {readyPercentage}%_MISSION_READY ]
                </div>
                <GoldButton 
                    onClick={() => setViewMode('MISSION_MAP')} 
                    disabled={isLoading || !strategicInput.subject || !strategicInput.offer}
                    className={`flex-1 py-6 rounded-full font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 ${readyPercentage === 100 && !isLoading ? 'bg-[#FFCC00] text-black shadow-[0_0_15px_rgba(255,204,0,0.5)]' : 'bg-white/10 text-white/40 cursor-not-allowed opacity-50'}`}
                >
                    {isLoading ? <><RefreshCw className="w-4 h-4 animate-spin inline-block mr-2" /> [ WORKING... ]</> : 'DEPLOY_ODYSSEY_PROTOCOL'}
                </GoldButton>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // --- PHASE 1: PERSONA DNA ---
  return (
    <div className="h-screen bg-[#050505] text-white font-mono flex flex-col p-4 sm:p-8 overflow-hidden relative">
      <div className="fixed top-0 right-0 w-1/2 h-full bg-[#FFCC00] opacity-[0.02] blur-[150px] pointer-events-none -z-10"></div>

      {UnifiedTerminalHeader}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 font-mono text-sm">
          [ERROR]: {error}
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden relative z-10">
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950/50 rounded-2xl relative overflow-hidden">
           {isLoading ? (
             <div className="absolute inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md rounded-[3rem]">
                <Loader message="SEQUENCING_DNA_STREAM..." />
             </div>
           ) : config.uploadedPhoto && config.sourceType === 'UPLOAD' && !result ? (
             <div className="relative w-full h-full flex items-center justify-center animate-in fade-in duration-700">
               <div className="relative group p-12 flex items-center justify-center w-full h-full">
                  <img src={config.uploadedPhoto} className="w-auto h-auto max-w-full max-h-[90%] object-contain rounded-[2rem] shadow-2xl border-2 border-[#FFCC00]/20" alt="Raw DNA" />
                  
                  {/* TECH OVERLAY */}
                  <div className="absolute inset-0 pointer-events-none opacity-20">
                     <div className="w-full h-[1px] bg-[#FFCC00] absolute top-1/2 animate-pulse" />
                  </div>

                  <div className="absolute top-10 left-10 flex items-center gap-2 px-4 py-2 bg-[#FFCC00] text-black rounded-full font-black text-[8px] uppercase tracking-widest animate-pulse">
                     <Check className="w-3 h-3" />
                     [ RAW_DNA_PREVIEW: READY_FOR_SYNTHESIS ]
                  </div>

                  <button 
                    onClick={() => setConfig(prev => ({ ...prev, uploadedPhoto: undefined, sourceType: 'NEURAL_GEN' }))}
                    className="absolute top-10 right-10 bg-red-600/20 hover:bg-red-600 text-white p-3 rounded-full border border-red-600/40 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
               </div>
               
               <div className="absolute bottom-10 right-10 flex gap-4">
                  {config.environment === 'MATCH_UPLOAD' && (
                    <GoldButton 
                      onClick={() => {
                        setResult({ url: config.uploadedPhoto!, description: 'Bypassed synthesis: using raw upload.' });
                        setSuccessMsg("RAW_DNA_LOCKED");
                      }} 
                      className="rounded-full px-12 py-4 border-[#FFCC00] text-[#FFCC00] font-black uppercase"
                    >
                        [ USE_RAW_UPLOAD_AS_IS ]
                    </GoldButton>
                  )}
               </div>
             </div>
           ) : result ? (
             <div className="relative w-full h-full flex items-center justify-center group animate-in fade-in duration-700 overflow-hidden">
                <div className="relative w-full h-full p-12 flex items-center justify-center">
                    <img src={result.url} className="w-auto h-auto max-w-full max-h-[90%] object-contain rounded-[2rem] shadow-2xl transition-transform duration-700 group-hover:scale-105" alt="Source DNA" />
                    
                    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
                        <div className="w-full h-[2px] bg-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.5)] absolute top-0 animate-[scan-move_3s_linear_infinite]" />
                    </div>

                    <div className="absolute top-10 left-10 flex items-center gap-2 px-3 py-1 bg-[#FFCC00] text-black rounded-full z-20 shadow-[0_0_20px_rgba(255,204,0,0.4)] animate-pulse">
                       <Check className="w-3 h-3" />
                       <span className="text-[8px] font-black uppercase tracking-widest">[ IDENTITY_LOCKED ]</span>
                    </div>

                    <div className="absolute bottom-10 flex gap-4 bg-zinc-950/60 backdrop-blur-xl border border-white/10 px-8 py-3 rounded-full z-30 shadow-2xl">
                        <button 
                            onClick={onForge}
                            disabled={isLoading}
                            className={`text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 text-[#FFCC00] hover:text-white ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> [ REGENERATE_DNA ]
                        </button>
                        <div className="w-px h-4 bg-white/10 self-center"></div>
                        <button 
                            onClick={() => saveAs(result.url, 'persona-dna-8k.png')}
                            className="text-[10px] font-black uppercase tracking-widest text-white hover:text-[#FFCC00] transition-all"
                        >
                            [ DOWNLOAD_DNA ]
                        </button>
                    </div>
                </div>
                <GoldButton 
                    onClick={() => setViewMode('MISSION_HUB')} 
                    disabled={isLoading}
                    className="absolute bottom-10 right-10 rounded-full px-12 py-4 bg-[#FFCC00] text-black font-black uppercase shadow-[0_0_15px_rgba(255,204,0,0.5)] animate-bounce-horizontal flex items-center gap-2"
                >
                    [ LOCK_DNA &amp; PROCEED_TO_MAP ] &gt;&gt;
                </GoldButton>
             </div>
           ) : (
             <div className="text-center opacity-30 animate-in fade-in duration-1000">
                <Camera className="w-32 h-32 mx-auto mb-8 text-gray-700" />
                <p className="text-[14px] tracking-[0.6em] uppercase font-black font-mono leading-relaxed max-w-sm mx-auto">
                    // STANDBY // <br/> AWAITING_DNA_INJECTION_SIGNAL
                </p>
             </div>
           )}
        </div>

        <aside className="w-full lg:w-96 flex flex-col shrink-0 h-full bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 gap-6 overflow-y-auto custom-scrollbar">
          <div className="flex-1 flex flex-col pr-2 relative">
            <TacticalFolderHeader id="BIOMETRIC_DNA" label="🧬 BIOMETRIC_DNA" isOpen={openFolder === 'BIOMETRIC_DNA'} />
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${openFolder === 'BIOMETRIC_DNA' ? 'max-h-[1000px] p-8 pb-6 space-y-8' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-4">
                   <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest block">SOURCE_ORIGIN</label>
                   <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setConfig({...config, sourceType: 'NEURAL_GEN'})} className={`py-4 rounded-2xl text-[9px] font-black uppercase transition-all ${config.sourceType === 'NEURAL_GEN' ? 'bg-[#FFCC00] text-black font-bold' : 'bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white'}`}>[ NEURAL_GEN ]</button>
                      <button onClick={() => personaFileRef.current?.click()} className={`py-4 rounded-2xl text-[9px] font-black uppercase transition-all ${config.sourceType === 'UPLOAD' ? 'bg-[#FFCC00] text-black font-bold' : 'bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white'}`}>[ UPLOAD_DNA ]</button>
                      <input type="file" hidden ref={personaFileRef} onChange={handleFileUpload} accept="image/*" />
                   </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest block">GENDER_MAPPING</label>
                   <div className="grid grid-cols-3 gap-2">
                      {GENDERS.map(g => (
                        <button key={g} onClick={() => setConfig({...config, gender: g})} className={`py-3 rounded-xl text-[9px] font-black transition-all ${config.gender === g ? 'bg-[#FFCC00] text-black font-bold' : 'bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white'}`}>{g}</button>
                      ))}
                   </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest block">ETHNICITY_MAPPING</label>
                   <div className="relative">
                     <select value={config.ethnicity} onChange={(e) => setConfig({...config, ethnicity: e.target.value as any})} className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all text-[10px] md:text-xs font-black uppercase appearance-none truncate pr-10">
                        {ETHNICITIES.map(e => <option key={e} value={e}>{e.toUpperCase()}</option>)}
                     </select>
                     <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                   </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest block">VOICE_OUTPUT_LANGUAGE</label>
                   <div className="relative">
                     <select 
                       value={config.language} 
                       onChange={(e) => setConfig({...config, language: e.target.value as any})} 
                       className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all text-[10px] md:text-xs font-black uppercase appearance-none truncate pr-10"
                     >
                        <option value="ENGLISH">ENGLISH // GLOBAL</option>
                        <option value="TAGLISH">TAGLISH // VIRAL</option>
                        <option value="FILIPINO">FILIPINO // NATIVE</option>
                     </select>
                     <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                   </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest block">AGE_ANCHOR</label>
                        <span className="text-[10px] text-[#FFCC00] font-black">{config.ageRange}_YEARS</span>
                    </div>
                    <input type="range" min="18" max="65" value={config.ageRange} onChange={(e) => setConfig({...config, ageRange: e.target.value})} className="w-full accent-[#FFCC00] h-1 bg-white/10 rounded-full" />
                </div>
            </div>

            <TacticalFolderHeader id="SCENE_CONTEXT" label="🏢 SCENE_CONTEXT" isOpen={openFolder === 'SCENE_CONTEXT'} />
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${openFolder === 'SCENE_CONTEXT' ? 'max-h-[1000px] p-8 pb-6 space-y-8' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-4">
                    <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest block">ENVIRONMENT_DNA</label>
                    <div className="grid grid-cols-2 gap-2">
                        {ENVIRONMENTS.map(e => (
                            <button key={e.id} onClick={() => setConfig({...config, environment: e.id as any})} className={`py-3 rounded-xl text-[8px] font-black transition-all border ${config.environment === e.id ? 'bg-[#FFCC00] text-black border-[#FFCC00]' : 'bg-white/5 text-gray-500 border-white/10'}`}>{e.label}</button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest block">STUDIO_LIGHTING</label>
                    <div className="grid grid-cols-2 gap-3">
                        {LIGHTING_PRESETS.map(p => (
                            <button key={p.id} onClick={() => setConfig({...config, lightingPreset: p.id as any})} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${config.lightingPreset === p.id ? 'bg-[#FFCC00]/10 border-[#FFCC00]' : 'bg-white/5 border-white/10'}`}>
                                <span className="text-lg">{p.icon}</span>
                                <span className="text-[8px] font-black uppercase text-center">{p.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <TacticalFolderHeader id="VISUAL_STYLING" label="🎨 VISUAL_STYLING" isOpen={openFolder === 'VISUAL_STYLING'} />
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${openFolder === 'VISUAL_STYLING' ? 'max-h-[1000px] p-8 pb-6 space-y-8' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-4">
                    <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest block">WARDROBE_SYNC</label>
                    <div className="relative">
                      <select value={config.wardrobe} onChange={(e) => setConfig({...config, wardrobe: e.target.value as any})} className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all text-[10px] md:text-xs font-black uppercase appearance-none truncate pr-10">
                          {WARDROBES.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    </div>
                </div>

                <div className="space-y-4 relative">
                    <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest block">BRAND_CHROMATIC_DATA</label>
                    <div className="flex gap-4 items-center">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-mono text-[10px]">{'>'}</span>
                            <input 
                                type="text" 
                                value={config.brandColor} 
                                onChange={(e) => setConfig({...config, brandColor: e.target.value.toUpperCase()})} 
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-7 pr-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all text-[10px] font-black uppercase" 
                                placeholder="#FFCC00" 
                            />
                        </div>
                        <div className="relative">
                            <div 
                                className="w-12 h-12 rounded-xl border-2 border-white/10 shadow-lg cursor-pointer relative overflow-hidden shrink-0" 
                                style={{ backgroundColor: config.brandColor }}
                                onClick={() => colorPickerRef.current?.click()}
                            >
                                <input 
                                    type="color" 
                                    ref={colorPickerRef}
                                    value={config.brandColor.startsWith('#') && config.brandColor.length === 7 ? config.brandColor : '#FFCC00'}
                                    onChange={(e) => setConfig({...config, brandColor: e.target.value.toUpperCase()})}
                                    className="absolute inset-0 opacity-0 cursor-pointer scale-150"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <TacticalFolderHeader id="OPTIC_TARGET" label="🎥 OPTIC_TARGET" isOpen={openFolder === 'OPTIC_TARGET'} />
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${openFolder === 'OPTIC_TARGET' ? 'max-h-[1000px] p-8 pb-6 space-y-8' : 'max-h-0 opacity-0'}`}>
                <div className="space-y-4">
                   <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest block">GEAR_LOCK</label>
                   <div className="space-y-3">
                        <div className="relative">
                         <select value={config.camera} onChange={(e) => setConfig({...config, camera: e.target.value as any})} className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all text-[9px] md:text-xs font-black uppercase appearance-none truncate pr-10">
                              {CAMERAS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                          </select>
                          <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                       </div>
                        {config.camera !== 'IPHONE_15_PRO' && (
                            <div className="relative">
                             <select value={config.lens} onChange={(e) => setConfig({...config, lens: e.target.value as any})} className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all text-[9px] md:text-xs font-black uppercase appearance-none truncate pr-10">
                                  {LENSES.map(l => <option key={l} value={l}>{l.replace(/_/g, ' ')}</option>)}
                              </select>
                              <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                           </div>
                        )}
                   </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest block">FRAME_RATIO</label>
                    <div className="grid grid-cols-4 gap-2">
                        {['9:16', '4:5', '1:1', '16:9'].map(r => (
                            <button key={r} onClick={() => setConfig({...config, aspectRatio: r as any})} className={`py-2 rounded-lg text-[9px] font-black transition-all border ${config.aspectRatio === r ? 'bg-[#FFCC00] text-black border-[#FFCC00]' : 'bg-white/5 text-gray-500 border-white/10'}`}>{r}</button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest block">RENDER_QUALITY</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['1K', '2K', '4K'].map(q => (
                            <button key={q} onClick={() => setConfig({...config, quality: q as any})} className={`py-2 rounded-lg text-[9px] font-black transition-all border ${config.quality === q ? 'bg-[#FFCC00] text-black border-[#FFCC00]' : 'bg-white/5 text-gray-500 border-white/10'}`}>{q}</button>
                        ))}
                    </div>
                </div>
            </div>

          </div>

          <div className="mt-auto pt-6">
             {!result && (
                 <GoldButton 
                    onClick={onForge} 
                    disabled={isLoading || isForgeDisabled} 
                    className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-[0.2em]"
                 >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-3"><RefreshCw className="w-5 h-5 animate-spin" /> [ WORKING... ]</span>
                    ) : (
                        <span className="flex items-center justify-center gap-3"><Sparkles className="w-5 h-5" /> INITIALIZE PERSONA_DNA</span>
                    )}
                 </GoldButton>
             )}
          </div>
        </aside>
      </div>

      {successMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] bg-[#FFCC00]/20 border border-[#FFCC00] px-6 py-3 rounded-full animate-in fade-in slide-in-from-top-4 shadow-[0_0_20px_rgba(255,204,0,0.4)]">
          <p className="text-[#FFCC00] font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
            <Check className="w-4 h-4" /> {successMsg}
          </p>
        </div>
      )}

      <style>{`
        @keyframes scan-move {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes bounce-horizontal {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(10px); }
        }
        .animate-bounce-horizontal {
          animation: bounce-horizontal 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default InfluencerForge;