
import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { VideoGenConfig, VideoModelType } from '../types';
import { VIDEO_MODEL_SPECS, VIDEO_MODEL_ROUTING, generateVideo, GeneratedVideoResult } from '../services/geminiService';
import { compressImageForUpload } from '../utils/imageCompression';
import { Trash2, UploadCloud, Sparkles, Video, ChevronLeft, Download } from 'lucide-react';
import { GoldButton } from './ui/GoldButton';

const GrifonLogo = ({ className = "h-8 w-auto" }: { className?: string }) => (
  <img src="/logo.png" alt="GRIFON Logo" className={`object-contain ${className}`} />
);

interface GenerateVideoProps {
  onBack: () => void;
}

const EXECUTION_LOGS = [
  "ACCESSING_VFX_CORE_v2.0...",
  "LOADING_KLING_WEIGHTS...",
  "SYNCING_TEMPORAL_LAYERS...",
  "MAPPING_KINETIC_VECTORS...",
  "ANALYZING_PHYSICS_CONSTRAINTS...",
  "GENERATING_LATENT_SPACE...",
  "INTERPOLATING_KEY_FRAMES...",
  "FINALIZING_RENDER_STREAM..."
];

const ViewfinderHologram = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24 absolute opacity-[0.03] pointer-events-none">
    <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
    <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
    <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
    <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
    <circle cx="12" cy="12" r="3"/>
    <line x1="12" y1="8" x2="12" y2="16"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);

const EnergyMeter = ({ level }: { level: number }) => (
  <div className="flex gap-0.5 ml-2">
    {[1, 2, 3].map((bar) => (
      <div 
        key={bar} 
        className={`w-0.5 h-2 rounded-full transition-colors duration-500 ${bar <= level ? 'bg-[#10B981] shadow-[0_0_5px_#10B981]' : 'bg-white/5'}`}
      />
    ))}
  </div>
);

const GenerateVideo: React.FC<GenerateVideoProps> = ({ onBack }) => {
  const [config, setConfig] = useState<VideoGenConfig>({
    model: 'Kling_O1',
    duration: 5,
    resolution: '720p',
    aspectRatio: '9:16',
    audioEnabled: false,
    prompt: '',
    elements: []
  });

  const [isLoading, setIsLoading] = useState(false);
  const [logIndex, setLogIndex] = useState(0);
  const [advice, setAdvice] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<GeneratedVideoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startFrameRef = useRef<HTMLInputElement>(null);
  const endFrameRef = useRef<HTMLInputElement>(null);
  const elementRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const modelSpecs = VIDEO_MODEL_SPECS[config.model];

  // Neural Advisor Logic
  useEffect(() => {
    const p = config.prompt.toLowerCase();
    if (p.includes('morph') || p.includes('transform') || p.includes('transition')) {
      setAdvice("[ RECOMMENDED: KLING_O1 ] // REASON: Superior physics for metamorphic transitions.");
    } else if (p.includes('fast') || p.includes('quick') || p.includes('realtime')) {
      setAdvice("[ RECOMMENDED: VEO_3.1_FAST ] // REASON: Low-latency generation optimized for speed.");
    } else if (p.includes('hyper-realistic') || p.includes('luxury') || p.includes('4k') || p.includes('cinematic')) {
      setAdvice("[ RECOMMENDED: VEO_3.1_QUALITY ] // REASON: High dynamic range and native 4K support.");
    } else if (p.includes('talking') || p.includes('person') || p.includes('mouth') || p.includes('actor')) {
      setAdvice("[ RECOMMENDED: VEO_3.1 ] // REASON: Optimized for lip-sync and human micro-expressions.");
    } else if (p.includes('sound') || p.includes('music') || p.includes('audio') || p.includes('sfx')) {
      setAdvice("[ RECOMMENDED: KLING_2.6 ] // REASON: Integrated high-fidelity audio engine.");
    } else {
      setAdvice(null);
    }
  }, [config.prompt]);

  // Loading Log Logic
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setLogIndex(0);
      interval = setInterval(() => {
        setLogIndex(prev => (prev + 1) % EXECUTION_LOGS.length);
      }, 600);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end' | 'element') => {
    const files = Array.from(e.target.files || []) as File[];
    if (e.target) e.target.value = '';
    for (const file of files) {
      const { dataUrl } = await compressImageForUpload(file);
      if (type === 'start') setConfig(prev => ({ ...prev, startFrame: dataUrl }));
      else if (type === 'end') setConfig(prev => ({ ...prev, endFrame: dataUrl }));
      else if (type === 'element') {
        setConfig(prev => prev.elements.length < modelSpecs.maxElements
          ? { ...prev, elements: [...prev.elements, dataUrl] }
          : prev);
      }
    }
  };

  const removeElement = (idx: number) => {
    setConfig(prev => ({ ...prev, elements: prev.elements.filter((_, i) => i !== idx) }));
  };

  const handleModelSelect = (m: VideoModelType) => {
    const newSpecs = VIDEO_MODEL_SPECS[m];
    setConfig(prev => ({
      ...prev,
      model: m,
      duration: newSpecs.durations[0],
      resolution: newSpecs.resolutions[0],
      aspectRatio: newSpecs.aspectRatios[0],
      audioEnabled: newSpecs.supportsAudio ? prev.audioEnabled : false
    }));
    if (VIDEO_MODEL_ROUTING[m]?.viaFallback) {
      toast(`${m.replace(/_/g, ' ')} // ROUTED VIA VEO 3.1`, {
        description: 'Kling engines are proxied through Veo on this deployment.',
      });
    }
  };

  const handleSubmit = async () => {
    if (!config.prompt.trim()) {
      toast.error('PROMPT REQUIRED');
      return;
    }
    if (modelSpecs.requiresStartFrame && !config.startFrame) {
      toast.error('ANCHOR FRAME REQUIRED', { description: 'This engine needs a start frame.' });
      return;
    }

    setError(null);
    setResult(null);
    setStatus('SUBMITTING_JOB');
    setIsLoading(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const output = await generateVideo(config, {
        signal: ctrl.signal,
        onStatus: (s) => setStatus(s),
      });
      setResult(output);
      toast.success('SYNTHESIS COMPLETE');
    } catch (e: any) {
      const msg = e?.message ?? 'Unknown error';
      setError(msg);
      if (msg !== 'ABORTED') {
        toast.error('SYNTHESIS FAILED', { description: msg });
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      setStatus('');
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setIsLoading(false);
    setStatus('');
  };

  const getEnergyLevel = () => {
    if (config.resolution.includes('4k')) return 3;
    if (config.resolution.includes('2k')) return 3;
    if (config.resolution.includes('1080p')) return 2;
    return 1;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono flex flex-col p-4 sm:p-6 md:p-8 overflow-x-hidden">
      {/* MOBILE OPTIMIZED HEADER */}
      <header className="flex flex-col items-start gap-4 mb-8 w-full border-b border-white/10 pb-4">
        <div className="flex items-center justify-between w-full">
          <button 
            onClick={onBack} 
            className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> <span className="hidden md:inline">COMMAND CENTER</span><span className="md:hidden">BACK</span>
          </button>
          <div className="text-[7px] sm:text-[8px] text-gray-600 tracking-tighter uppercase sm:block hidden">
            [ SYNTH_ENGINE_v2.0 ] [ KINETIC_LOCKED ]
          </div>
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 uppercase tracking-tight break-words whitespace-normal leading-tight">
            Generate Video
          </h1>
          <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
            // SYNTHESIS
          </p>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 md:gap-8 overflow-hidden">
        
        {/* HARDWARE CONFIG & ENGINE SELECTOR */}
        <aside className="w-full lg:w-72 flex flex-col gap-6 shrink-0">
          <div className="glass-morphism bg-white/5 border border-white/10 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] space-y-4 sm:space-y-6">
            <h3 className="text-[10px] font-black text-brand-yellow uppercase tracking-widest border-b border-white/10 pb-2">ENGINE_SELECT</h3>
            
            {/* MOBILE: HORIZONTAL TAB SCROLLER | DESKTOP: VERTICAL LIST */}
            <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 custom-scrollbar scroll-smooth">
              {(Object.keys(VIDEO_MODEL_SPECS) as VideoModelType[]).map(m => (
                <button
                  key={m}
                  onClick={() => handleModelSelect(m)}
                  className={`
                    whitespace-nowrap lg:whitespace-normal text-left px-4 py-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase transition-all border shrink-0 lg:shrink
                    ${config.model === m 
                      ? 'border-brand-yellow bg-brand-yellow/10 text-brand-yellow shadow-[0_0_15px_rgba(255,204,0,0.3)] ring-1 ring-brand-yellow/50 scale-[1.02]' 
                      : 'border-white/10 text-gray-500 hover:border-white/20'}
                  `}
                >
                  <div className="flex justify-between items-center gap-4">
                    {m.replace(/_/g, ' ')}
                    {config.model === m && <div className="w-1.5 h-1.5 bg-brand-yellow rounded-full animate-pulse shadow-neon-yellow"></div>}
                  </div>
                </button>
              ))}
            </div>

            <h3 className="text-[10px] font-black text-brand-primary uppercase tracking-widest border-b border-white/10 pb-2 pt-2 hidden lg:block">HARDWARE_SPECS</h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-[8px] text-gray-500 uppercase block">Duration</label>
                <div className="flex flex-wrap gap-1.5">
                  {modelSpecs.durations.map(d => (
                    <button key={d} onClick={() => setConfig({...config, duration: d})} className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border ${config.duration === d ? 'border-[#FFCC00] text-[#FFCC00] bg-[#FFCC00]/10' : 'border-white/10 text-gray-600'}`}>{d}s</button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[8px] text-gray-500 uppercase block">Ratio</label>
                <div className="flex flex-wrap gap-1.5">
                  {modelSpecs.aspectRatios.map(r => (
                    <button key={r} onClick={() => setConfig({...config, aspectRatio: r})} className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border ${config.aspectRatio === r ? 'border-[#FFCC00] text-[#FFCC00] bg-[#FFCC00]/10' : 'border-white/10 text-gray-600'}`}>{r}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 hidden lg:block">
                <div className="flex items-center justify-between">
                  <label className="text-[8px] text-gray-500 uppercase block">Resolution</label>
                  <EnergyMeter level={getEnergyLevel()} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {modelSpecs.resolutions.map(res => (
                    <button key={res} onClick={() => setConfig({...config, resolution: res})} className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border ${config.resolution === res ? 'border-[#FFCC00] text-[#FFCC00] bg-[#FFCC00]/10' : 'border-white/10 text-gray-600'}`}>{res}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 col-span-2 lg:col-span-1">
                <label className="text-[8px] text-gray-500 uppercase block">Audio_Synthesis</label>
                {modelSpecs.supportsAudio ? (
                  <button onClick={() => setConfig({...config, audioEnabled: !config.audioEnabled})} className={`w-full py-2 rounded-xl text-[9px] font-black border transition-all ${config.audioEnabled ? 'bg-[#FFCC00]/20 text-[#FFCC00] border-[#FFCC00]/40' : 'bg-zinc-950/40 text-gray-500 border-white/10'}`}>
                    {config.audioEnabled ? '[ ACTIVE ]' : '[ DISABLED ]'}
                  </button>
                ) : (
                  <div className="text-[8px] text-red-500/40 font-bold uppercase tracking-tighter italic">[ UNSUPPORTED ]</div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER: VISUAL CANVAS */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto lg:overflow-visible custom-scrollbar">
          {/* NEURAL ADVISOR PILL */}
          <div className={`glass-morphism border rounded-[1.5rem] sm:rounded-[2rem] p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 shrink-0 transition-all duration-500 ${advice ? 'border-brand-primary/40 shadow-[0_0_20px_rgba(255,204,0,0.1)]' : 'border-brand-primary/20'}`}>
            <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-brand-primary animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
                <span className="text-[8px] font-black text-brand-primary uppercase tracking-[0.2em]">NEURAL_ADVISOR_STREAM</span>
                <p className="text-[9px] sm:text-[10px] text-white/80 font-mono italic truncate">
                    {advice || "[ SYSTEM_IDLE ] // Start typing to receive engine recommendations..."}
                </p>
            </div>
          </div>

          <div className="flex-1 glass-morphism border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 flex flex-col gap-6 sm:gap-8 relative overflow-hidden bg-zinc-950/40">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0">
               <GrifonLogo className="w-96 h-96 grayscale" />
            </div>
            {isLoading && (
              <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
                <div className="relative mb-12">
                   <div className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-brand-primary/10 border-t-brand-primary rounded-full animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <Video className="w-8 h-8 text-brand-primary animate-pulse" />
                   </div>
                </div>
                
                {/* NEURAL EXECUTION LOG TERMINAL */}
                <div className="w-full max-w-sm bg-zinc-950 border border-white/10 rounded-2xl p-6 font-mono text-[9px] sm:text-[10px] space-y-2 shadow-2xl">
                   <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                      <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></div>
                      <span className="text-gray-500 uppercase tracking-widest font-black">NEURAL_EXECUTION_LOG</span>
                   </div>
                   {EXECUTION_LOGS.map((log, i) => (
                      <div key={i} className={`flex justify-between items-center transition-opacity duration-300 ${i === logIndex ? 'text-brand-primary' : i < logIndex ? 'text-brand-primary/40' : 'text-gray-800'}`}>
                         <span>&gt; {log}</span>
                         <span className="font-bold">{i < logIndex ? '[ OK ]' : i === logIndex ? '[ BUSY ]' : '[ WAIT ]'}</span>
                      </div>
                   ))}
                </div>
                <p className="mt-8 text-[10px] text-gray-500 uppercase tracking-[0.5em] font-black animate-pulse">
                  {status || 'RENDERING_LATENT_SPACE'}
                </p>
                <button
                  onClick={handleCancel}
                  className="mt-6 px-6 py-2 border border-red-500/40 text-red-400 text-[10px] font-mono uppercase tracking-widest rounded-xl hover:bg-red-500/10 transition-colors"
                >
                  ABORT_SYNTHESIS
                </button>
              </div>
            )}

            {result && !isLoading && (
              <div className="absolute inset-0 z-40 bg-zinc-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
                <video
                  src={result.url}
                  controls
                  autoPlay
                  loop
                  className="max-w-full max-h-[60vh] rounded-xl border border-[#FFCC00]/40 shadow-[0_0_40px_rgba(255,204,0,0.25)]"
                />
                <div className="mt-6 flex items-center gap-4">
                  <a
                    href={result.downloadUrl}
                    download={`grifon-${Date.now()}.${(result.mimeType.split('/')[1] || 'mp4')}`}
                    className="px-5 py-2 border border-[#FFCC00]/40 text-[#FFCC00] text-[10px] font-mono uppercase tracking-widest rounded-xl hover:bg-[#FFCC00]/10 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-3 h-3" /> DOWNLOAD
                  </a>
                  <button
                    onClick={() => setResult(null)}
                    className="px-5 py-2 border border-white/10 text-zinc-400 text-[10px] font-mono uppercase tracking-widest rounded-xl hover:bg-white/5 transition-colors"
                  >
                    NEW_SYNTHESIS
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest">KINETIC_DIRECTIVE</label>
                  <textarea
                    value={config.prompt}
                    onChange={(e) => setConfig({...config, prompt: e.target.value})}
                    placeholder="COMMAND_INPUT: Describe the action... (e.g. A fast drone shot chasing a car through neon rain)"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all h-32 sm:h-40 font-mono leading-relaxed"
                  />
               </div>

               {/* STACKED ON MOBILE, SIDE-BY-SIDE ON DESKTOP */}
               <div className="flex flex-col md:flex-row gap-4 sm:gap-8 w-full">
                  <div className="space-y-2 sm:space-y-4 flex-1">
                     <label className="text-[9px] sm:text-[10px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-2">
                        START <span className="hidden sm:inline">FRAME</span>
                        {modelSpecs.requiresStartFrame && <span className="text-[6px] bg-brand-yellow text-black px-1 rounded-full">!</span>}
                     </label>
                     <div 
                        onClick={() => startFrameRef.current?.click()}
                        className="aspect-video bg-zinc-950/50 border-2 border-dashed border-white/10 rounded-xl hover:border-[#FFCC00] hover:bg-zinc-800/80 transition-all group flex items-center justify-center cursor-pointer overflow-hidden relative p-6"
                     >
                        {config.startFrame ? (
                            <img src={config.startFrame} className="w-full h-full object-cover" alt="start frame" />
                        ) : (
                            <div className="flex flex-col items-center gap-1 opacity-20 relative z-10">
                                <UploadCloud className="w-4 h-4 sm:w-6 sm:h-6" />
                                <span className="text-[7px] sm:text-[8px] uppercase tracking-widest">ANCHOR</span>
                            </div>
                        )}
                        {!config.startFrame && <ViewfinderHologram />}
                     </div>
                     <input type="file" hidden ref={startFrameRef} onChange={(e) => handleFileUpload(e, 'start')} accept="image/*" />
                  </div>

                  <div className="space-y-2 sm:space-y-4 flex-1">
                     <label className="text-[9px] sm:text-[10px] font-black text-brand-primary uppercase tracking-widest">END <span className="hidden sm:inline">FRAME</span></label>
                     <div 
                        onClick={() => endFrameRef.current?.click()}
                        className="aspect-video bg-zinc-950/50 border-2 border-dashed border-white/10 rounded-xl hover:border-[#FFCC00] hover:bg-zinc-800/80 transition-all group flex items-center justify-center cursor-pointer overflow-hidden relative p-6"
                     >
                        {config.endFrame ? (
                            <img src={config.endFrame} className="w-full h-full object-cover" alt="end frame" />
                        ) : (
                            <div className="flex flex-col items-center gap-1 opacity-20 relative z-10">
                                <UploadCloud className="w-4 h-4 sm:w-6 sm:h-6" />
                                <span className="text-[7px] sm:text-[8px] uppercase tracking-widest">PAYOFF</span>
                            </div>
                        )}
                        {!config.endFrame && <ViewfinderHologram />}
                     </div>
                     <input type="file" hidden ref={endFrameRef} onChange={(e) => handleFileUpload(e, 'end')} accept="image/*" />
                  </div>
               </div>
            </div>

            <div className="flex flex-col items-center gap-4 pt-4 sm:pt-6">
                <GoldButton
                    onClick={handleSubmit}
                    disabled={isLoading || !config.prompt || (modelSpecs.requiresStartFrame && !config.startFrame)}
                    className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-[0.2em]"
                >
                    INITIALIZE SYNTHESIS
                    <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </GoldButton>
                {error && !isLoading && (
                  <p className="text-red-400 text-[10px] font-mono uppercase tracking-widest text-center border border-red-900/50 bg-red-900/20 px-4 py-2 rounded-xl max-w-md break-words">
                    {error}
                  </p>
                )}
                <p className="text-[8px] sm:text-[9px] text-gray-700 font-mono tracking-widest uppercase text-center">
                  // {config.model.replace(/_/g, ' ')}_ENGINE ACTIVE // READY_FOR_DEPLOYMENT
                </p>
            </div>
          </div>
        </div>

        {/* ASSET BAY (RIGHT) */}
        <aside className="w-full lg:w-48 flex flex-col gap-6 shrink-0 lg:block hidden">
           <div className="glass-morphism bg-white/5 backdrop-blur-[20px] border border-white/10 p-6 rounded-[2rem] space-y-6 h-full flex flex-col">
              <div className="flex flex-col border-b border-white/10 pb-2 gap-1">
                <h3 className="text-[10px] font-black text-brand-primary uppercase tracking-widest">
                  ASSET_BAY [ {config.elements.length}/{modelSpecs.maxElements} ]
                </h3>
              </div>

              <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
                {config.elements.map((el, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-white/10 shrink-0">
                        <img src={el} className="w-full h-full object-cover" alt="asset" />
                        <button 
                            onClick={() => removeElement(idx)}
                            className="absolute inset-0 bg-red-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 className="w-5 h-5 text-white" />
                        </button>
                    </div>
                ))}
                
                {config.elements.length < modelSpecs.maxElements && (
                    <button 
                        onClick={() => elementRef.current?.click()}
                        className="aspect-square bg-zinc-950/50 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center hover:border-[#FFCC00] hover:bg-zinc-800/80 transition-all shrink-0 group p-6"
                    >
                        <span className="text-xl font-light text-gray-600 group-hover:text-brand-primary">+</span>
                    </button>
                )}
                <input type="file" hidden ref={elementRef} multiple onChange={(e) => handleFileUpload(e, 'element')} accept="image/*" />
              </div>

              <div className="pt-4 border-t border-white/10">
                 <p className="text-[7px] text-gray-600 font-mono italic leading-tight uppercase">
                    IDENTITY_LOCK_ACTIVE
                 </p>
              </div>
           </div>
        </aside>

      </div>
    </div>
  );
};

export default GenerateVideo;
