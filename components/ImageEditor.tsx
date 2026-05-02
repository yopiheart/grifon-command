import React, { useState, useRef, useEffect } from 'react';
import { optimizeImagePrompt, executeStudioCommand } from '../services/geminiService';
import { compressImageForUpload } from '../utils/imageCompression';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import { Trash2, RefreshCw, Copy, Check, Sparkles, Image as ImageIcon, ChevronLeft } from 'lucide-react';
import saveAs from 'file-saver';

interface ImageEditorProps {
  onBack: () => void;
  ethnicity?: string;
}

type StudioState = 'idle' | 'optimizing' | 'review' | 'generating' | 'result';

const TikTokOverlay: React.FC = () => (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 bg-gradient-to-b from-black/20 via-transparent to-black/40 animate-in fade-in">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-white text-xs font-bold">Logo</div>
                <div>
                    <p className="text-white text-sm font-bold">@brand_handle</p>
                    <p className="text-white/80 text-[10px]">Just now</p>
                </div>
            </div>
        </div>
        
        <div className="flex justify-between items-end pb-12">
            <div className="max-w-[70%] space-y-2">
                <p className="text-white text-sm leading-tight">This is how your optimized visual looks in-feed. #AD #VIRAL</p>
                <div className="flex items-center gap-2 bg-[#FFCC00] text-black px-4 py-3 rounded text-sm font-black italic">
                    SHOP NOW
                </div>
            </div>
            <div className="flex flex-col items-center gap-6 pb-4">
                <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
                    <span className="text-white text-[10px] font-bold">128K</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center"><Check className="w-5 h-5 text-white" /></div>
                    <span className="text-white text-[10px] font-bold">1.2K</span>
                </div>
            </div>
        </div>
    </div>
);

const ImageEditor: React.FC<ImageEditorProps> = ({ onBack, ethnicity = 'Global' }) => {
  const [studioState, setStudioState] = useState<StudioState>('idle');
  const [images, setImages] = useState<string[]>([]); 
  const [userRequest, setUserRequest] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:5' | '3:4' | null>(null);
  const [suggestion, setSuggestion] = useState<{purpose: string, finalPrompt: string, notes: string} | null>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTikTokPreview, setShowTikTokPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const sharedImg = localStorage.getItem('sharedImageToEdit');
    if (sharedImg && images.length === 0) setImages([sharedImg]);
  }, []);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [userRequest]);

  // Fix: Properly handle file uploads from both input change and drag events by narrowing the event type correctly.
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let filesToProcess: File[] = [];

    if ('target' in e && (e.target as HTMLInputElement).files) {
      filesToProcess = Array.from((e.target as HTMLInputElement).files || []);
    } else if ('dataTransfer' in e && e.dataTransfer.files) {
      filesToProcess = Array.from(e.dataTransfer.files);
    }

    if ('target' in e && (e.target as HTMLInputElement).value) {
        (e.target as HTMLInputElement).value = '';
    }

    const imageFiles = filesToProcess.filter(f => f.type.startsWith('image/'));
    const compressed = await Promise.all(imageFiles.map(f => compressImageForUpload(f)));
    if (compressed.length > 0) {
      setImages(prev => [...prev, ...compressed.map(c => c.dataUrl)]);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e);
  };

  const removeImage = (index: number) => setImages(images.filter((_, i) => i !== index));

  const onOptimize = async () => {
    if (!userRequest || !aspectRatio) return;
    setStudioState('optimizing');
    setError(null);
    try {
      const result = await optimizeImagePrompt(userRequest, images);
      setSuggestion(result);
      setStudioState('review');
    } catch (err) {
      setError("SYSTEM_ERROR: OPTIMIZATION_FAILED");
      setStudioState('idle');
    }
  };

  const onRunCommand = async () => {
    if (!suggestion || !aspectRatio) return;
    setStudioState('generating');
    try {
      const result = await executeStudioCommand(suggestion.finalPrompt, images, aspectRatio as any, ethnicity);
      setFinalImage(result);
      setStudioState('result');
    } catch (err) {
      setError("SYSTEM_ERROR: GENERATION_FAILED");
      setStudioState('review');
    }
  };

  const handleReset = () => {
    setStudioState('idle');
    setSuggestion(null);
    setFinalImage(null);
    setUserRequest('');
    setAspectRatio(null);
    setShowTikTokPreview(false);
  };


  return (
    <div 
        className="flex flex-col h-screen bg-zinc-950 text-white font-sans overflow-hidden relative"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
    >
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* --- HUD HEADER --- */}
      <header className="flex flex-col items-start gap-4 mb-8 w-full border-b border-white/10 pb-6 relative z-30 p-4 md:p-6 m-4">
        <div className="flex items-center justify-between w-full">
          <button onClick={onBack} className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">
            <ChevronLeft className="w-4 h-4" /> <span className="hidden md:inline">COMMAND CENTER</span><span className="md:hidden">BACK</span>
          </button>
          <div className="hidden md:flex items-center gap-4 text-[8px] font-mono text-zinc-600 tracking-tighter uppercase">
            [ FIRMWARE_v4.2 ] [ ASYNC_CORE_ACTIVE ]
          </div>
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 uppercase tracking-tight break-words whitespace-normal leading-tight">
            STUDIO CORE
          </h1>
          <span className="hidden lg:block text-[9px] text-zinc-600 tracking-widest font-mono uppercase whitespace-nowrap mt-2">// SESSION_ENCRYPTED // CORE_READY</span>
        </div>
      </header>

      {/* --- MAIN WORKSPACE --- */}
      <main className="flex-1 overflow-y-auto p-6 md:p-12 relative z-10 flex flex-col items-center custom-scrollbar">
        {images.length === 0 && studioState === 'idle' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-12 w-full max-w-4xl">
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        w-64 h-64 md:w-80 md:h-80 bg-zinc-950/50 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-700 cursor-pointer
                        ${isDragging ? 'border-[#FFCC00] bg-zinc-800/80 scale-110 shadow-[0_0_50px_rgba(255,204,0,0.1)]' : 'border-white/10 hover:border-[#FFCC00] hover:bg-zinc-800/80'}
                    `}
                >
                    <div className={`
                        w-12 h-12 md:w-16 md:h-16 rounded-full border border-[#FFCC00]/20 flex items-center justify-center mb-6 
                        ${isDragging ? 'animate-bounce shadow-[0_0_30px_rgba(255,204,0,0.4)]' : 'animate-pulse'}
                    `}>
                        <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-[#FFCC00]" />
                    </div>
                    <p className="text-[10px] md:text-[11px] font-mono tracking-[0.2em] uppercase text-center px-8 text-zinc-500">
                        {isDragging ? "[ RELEASE_TO_INJECT ]" : "[ DROP_ASSET_FOR_ANALYSIS ]"}
                    </p>
                    {!isDragging && (
                        <span className="mt-4 text-[8px] text-zinc-400 font-mono uppercase tracking-widest bg-white/5 px-4 py-1 rounded-full border border-white/10">
                            OR CLICK TO BROWSE
                        </span>
                    )}
                </div>
                <div className="hidden md:block opacity-10 text-center space-y-2 pointer-events-none">
                    <p className="text-xl md:text-3xl font-black tracking-[0.5em] uppercase italic">NEURAL_TARGETING_ACTIVE</p>
                    <p className="text-[10px] font-mono uppercase tracking-[0.8em] font-bold">MODE: HYBRID_CREATION</p>
                </div>
            </div>
        )}

        {images.length > 0 && studioState === 'idle' && (
            <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-16 w-full max-w-7xl animate-in fade-in duration-500">
                {images.map((img, i) => (
                    <div key={i} className="relative group scanner-active">
                        <div className="w-48 h-48 md:w-64 md:h-64 bg-zinc-900 border border-white/10 p-2 shadow-2xl relative overflow-hidden rounded-2xl">
                            <img src={img} className="w-full h-full object-cover transition-all group-hover:scale-105 duration-500 rounded-xl opacity-90" />
                            <div className="absolute top-4 left-4 bg-[#FFCC00] text-[9px] font-black px-3 py-1 text-black uppercase rounded-full shadow-lg tracking-widest">ASSET 0{i+1}</div>
                            <button onClick={() => removeImage(i)} className="absolute top-4 right-4 bg-red-600/80 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-xl"><Trash2 className="w-4 h-4 text-white"/></button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {studioState === 'result' && finalImage && (
            <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000 relative mb-24">
                <GlassPanel className="relative border-2 border-[#FFCC00]/40 shadow-[0_40px_100px_rgba(0,0,0,0.8)] p-2 md:p-3">
                    <img src={finalImage} className="w-full max-h-[70vh] object-contain mx-auto rounded-xl" alt="Final Synthesis" />
                    {showTikTokPreview && <TikTokOverlay />}
                    
                    <div className="absolute top-6 right-6 flex flex-col md:flex-row gap-3">
                        <button onClick={() => setShowTikTokPreview(!showTikTokPreview)} className={`px-4 py-2 rounded-full text-[9px] md:text-[10px] font-mono tracking-widest uppercase transition-all shadow-xl backdrop-blur-xl border ${showTikTokPreview ? 'bg-white text-black border-white' : 'bg-zinc-900/80 border-white/20 text-white hover:bg-white/10'}`}>
                            {showTikTokPreview ? 'HIDE PREVIEW' : 'AD PREVIEW'}
                        </button>
                        <div className="flex gap-2">
                            <button onClick={handleReset} className="bg-zinc-900/80 backdrop-blur-xl border border-white/20 p-3 text-zinc-300 rounded-full hover:text-[#FFCC00] transition-colors shadow-xl"><RefreshCw className="w-4 h-4"/></button>
                            <button onClick={() => saveAs(finalImage, 'studio-core-render.png')} className="bg-[#FFCC00] p-3 text-black rounded-full hover:shadow-[0_0_20px_rgba(255,204,0,0.4)] transition-all shadow-xl"><Copy className="w-4 h-4"/></button>
                        </div>
                    </div>
                </GlassPanel>
            </div>
        )}

        {(studioState === 'optimizing' || studioState === 'generating') && (
            <div className="flex-1 flex flex-col items-center justify-center gap-10">
                <div className="relative">
                    <div className="w-32 h-32 md:w-48 md:h-48 border border-[#FFCC00]/20 animate-spin-slow rounded-full"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-10 h-10 md:w-16 md:h-16 text-[#FFCC00] animate-pulse" />
                    </div>
                </div>
                <Loader message={studioState === 'optimizing' ? "SYSTEM_OPTIMIZING_PHYSICS..." : "RECONSTRUCTING_PIXELS..."} />
            </div>
        )}
      </main>

      {/* --- INTERACTION FOOTER --- */}
      <footer className="pb-8 md:pb-12 pt-4 px-4 md:px-12 bg-transparent z-40 relative">
        <div className="max-w-4xl mx-auto relative flex flex-col gap-4">
            
            {studioState === 'review' && suggestion && (
                <GlassPanel className="p-6 md:p-8 shadow-[0_-40px_80px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-8 border-2 border-[#FFCC00]/20">
                    <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                        <span className="text-[9px] md:text-[10px] font-mono text-[#FFCC00] uppercase tracking-[0.2em] md:tracking-[0.3em] truncate">
                          // SYSTEM_PROTOCOL : {suggestion.purpose}
                        </span>
                    </div>
                    <textarea 
                        value={suggestion.finalPrompt}
                        onChange={(e) => setSuggestion({...suggestion, finalPrompt: e.target.value})}
                        className="w-full bg-zinc-900 border border-white/10 text-sm text-zinc-300 focus:ring-1 focus:ring-[#FFCC00] focus:border-[#FFCC00] p-6 rounded-xl h-32 font-mono leading-relaxed resize-none custom-scrollbar outline-none"
                    />
                    <div className="flex justify-between items-center mt-8">
                        <button onClick={handleReset} className="text-[9px] md:text-[10px] text-zinc-500 uppercase hover:text-white underline font-mono tracking-widest">ABORT PROTOCOL</button>
                        <GoldButton onClick={onRunCommand} className="px-10 py-4 text-xs md:text-sm flex items-center gap-3 rounded-xl font-mono tracking-widest">
                            <Check className="w-4 h-4 md:w-5 md:h-5" />
                            EXECUTE SYNTHESIS
                        </GoldButton>
                    </div>
                </GlassPanel>
            )}

            {/* Floating Interaction Pill */}
            <div className={`
                bg-zinc-950/80 backdrop-blur-xl border border-white/10 p-2 md:p-3 flex flex-col rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.9)] transition-all group
                ${studioState !== 'idle' ? 'opacity-20 pointer-events-none' : 'opacity-100'}
            `}>
                {/* Internal Top: Aspect Ratio (Always visible in pill for mobile logic) */}
                <div className="flex items-center justify-center p-2 mb-1 gap-1 flex-wrap overflow-x-auto">
                    {['9:16', '4:5', '1:1', '3:4', '16:9'].map(r => (
                        <button 
                            key={r} 
                            onClick={() => setAspectRatio(r as any)}
                            className={`
                                text-[8px] md:text-[10px] px-4 md:px-6 py-1.5 md:py-2.5 font-mono uppercase tracking-widest transition-all rounded-full border border-transparent backdrop-blur-[10px]
                                ${aspectRatio === r 
                                    ? 'bg-[#FFCC00] text-black shadow-[0_0_10px_#FFCC00] scale-105 z-10 border-[#FFCC00]' 
                                    : 'text-zinc-500 hover:text-white hover:bg-white/10 hover:border-white/10'}
                            `}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                {/* Internal Bottom: Inputs */}
                <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4 p-2">
                    <div className="flex items-end gap-3 md:gap-4 flex-1">
                        <button 
                          onClick={() => fileInputRef.current?.click()} 
                          className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center text-zinc-400 hover:text-[#FFCC00] transition-colors bg-zinc-900 rounded-xl shrink-0 border border-white/10 hover:border-[#FFCC00]/50 shadow-inner group"
                          title="Add Asset"
                        >
                            <ImageIcon className="w-5 h-5 md:w-6 md:h-6" />
                            <input type="file" hidden multiple ref={fileInputRef} onChange={handleFileUpload} />
                        </button>
                        
                        <textarea 
                            ref={textareaRef}
                            placeholder="ENTER_MODIFICATION_REQUEST..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-zinc-600 py-3 md:py-4 resize-none h-12 md:h-14 min-h-[48px] max-h-[200px] text-xs uppercase tracking-widest font-mono leading-normal custom-scrollbar w-full outline-none text-sm"
                            value={userRequest}
                            onChange={(e) => setUserRequest(e.target.value)}
                        />
                    </div>

                    <GoldButton 
                      disabled={studioState !== 'idle' || !userRequest.trim() || !aspectRatio} 
                      onClick={onOptimize}
                      className={`
                        h-12 md:h-14 px-8 md:px-12 w-full md:w-auto md:min-w-[180px] text-[10px] md:text-xs transition-all duration-500 flex items-center justify-center gap-2 rounded-xl font-mono tracking-widest uppercase
                        ${(!userRequest.trim() || !aspectRatio) ? 'opacity-20' : 'opacity-100 shadow-[0_0_40px_rgba(255,204,0,0.2)]'}
                      `}
                    >
                        {studioState === 'optimizing' ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        ) : (
                            'OPTIMIZE'
                        )}
                    </GoldButton>
                </div>
            </div>
            
            <div className="flex justify-center gap-8 mt-2 opacity-30 select-none pointer-events-none">
                <p className="text-[7px] md:text-[8px] text-zinc-500 font-mono tracking-[0.4em] uppercase">STUDIO_CORE_v4.2_STABLE</p>
                <p className="hidden md:block text-[7px] md:text-[8px] text-zinc-500 font-mono tracking-[0.4em] uppercase">LUMEN_CORE: LOCKED</p>
                <p className="hidden md:block text-[7px] md:text-[8px] text-zinc-500 font-mono tracking-[0.4em] uppercase">NO_GHOSTING_ACTIVE</p>
            </div>
        </div>
      </footer>

      {error && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-red-900/20 backdrop-blur-xl border border-red-500/50 p-4 rounded-xl animate-in fade-in slide-in-from-top-4 shadow-2xl">
            <p className="text-red-500 font-mono text-[10px] uppercase tracking-widest">{error}</p>
        </div>
      )}
    </div>
  );
};

export default ImageEditor;