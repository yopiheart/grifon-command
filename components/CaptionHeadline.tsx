
import React, { useState, useRef } from 'react';
import { generateCaptionAndHeadline } from '../services/geminiService';
import { compressImageForUpload } from '../utils/imageCompression';
import { CaptionHeadlineInput } from '../types';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import { Copy, ChevronLeft, ChevronDown, Video, Image as ImageIcon, Trash2 } from 'lucide-react';
import saveAs from 'file-saver';

interface CaptionHeadlineProps {
  onBack: () => void;
}

const CaptionHeadline: React.FC<CaptionHeadlineProps> = ({ onBack }) => {
  const [formData, setFormData] = useState<CaptionHeadlineInput>({
    adFiles: [],
    adFileType: 'image',
    marketResearchText: '',
    language: 'Taglish',
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Cast to File[]
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const newAdFiles: string[] = [];

    for (const file of files) {
        if (file.type.startsWith('image/')) {
            const { dataUrl } = await compressImageForUpload(file);
            newAdFiles.push(dataUrl);
        } else {
            const reader = new FileReader();
            const filePromise = new Promise<string>((resolve) => {
                reader.onload = (event) => resolve(event.target?.result as string);
            });
            reader.readAsDataURL(file);
            const dataUrl = await filePromise;
            newAdFiles.push(dataUrl);
        }
    }

    setFormData(prev => {
        const updatedFiles = [...prev.adFiles, ...newAdFiles];
        const updatedType = updatedFiles.some(f => f.startsWith('data:video')) ? 'video' : 'image';
        return { 
            ...prev, 
            adFiles: updatedFiles,
            adFileType: updatedType
        };
    });

    if (e.target) e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFormData(prev => {
        const updatedFiles = prev.adFiles.filter((_, i) => i !== index);
        const updatedType = updatedFiles.some(f => f.startsWith('data:video')) ? 'video' : 'image';
        return { ...prev, adFiles: updatedFiles, adFileType: updatedType };
    });
  };

  const injectMarketMind = () => {
      const savedReport = localStorage.getItem('marketMindReport');
      if (savedReport) {
          setFormData(prev => ({ ...prev, marketResearchText: savedReport }));
      } else {
          setError("NO_REPORT_FOUND: Run MarketMind module first.");
          setTimeout(() => setError(null), 3000);
      }
  };

  const handleGenerate = async () => {
    if (formData.adFiles.length === 0) {
      setError("Please upload at least one image or video asset.");
      return;
    }
    if (!formData.marketResearchText) {
      setError("Please provide some market research or context.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const copy = await generateCaptionAndHeadline(formData);
      setResult(copy);
    } catch (err) {
      console.error(err);
      setError("Analysis Failed. Ensure files are not too large and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `Ad_Copy_Variations.txt`);
  };

  // Helper to parse variations and extract scores
  const renderVariations = () => {
    if (!result) return null;

    // Split result into segments if it follows a standard pattern, otherwise just show text
    const segments = result.split(/(?=Variation|Response|Option)/gi);

    return segments.map((seg, i) => {
        const scoreMatch = seg.match(/Success Probability Score:\s*(\d+)%/i);
        const score = scoreMatch ? scoreMatch[1] : null;

        return (
            <div key={i} className="mb-8 p-6 bg-zinc-900/50 border border-white/10 rounded-2xl relative group">
                {score && (
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-[#FFCC00]/10 border border-[#FFCC00]/30 px-3 py-1 rounded-full shadow-lg">
                        <div className="w-2 h-2 bg-[#FFCC00] rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black text-[#FFCC00] font-mono uppercase tracking-tighter">
                            SCORE: {score}%
                        </span>
                    </div>
                )}
                <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap leading-loose">
                    {seg.trim()}
                </pre>
            </div>
        );
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-6xl mx-auto">
        <header className="flex flex-col items-start gap-4 mb-8 w-full border-b border-white/10 pb-6 relative">
          <div className="flex items-center justify-between w-full">
            <button onClick={onBack} className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">
              <ChevronLeft className="w-4 h-4" /> <span className="hidden md:inline">COMMAND CENTER</span><span className="md:hidden">BACK</span>
            </button>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 uppercase tracking-tight break-words whitespace-normal leading-tight">
                Caption AI
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
                // MULTIMODAL_COPY VISUAL-FIRST AD GENERATION
            </p>
          </div>
        </header>

        <GlassPanel className="relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <h2 className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest border-b border-white/10 pb-2">
                        // AD_MATERIALS
                    </h2>
                    
                    <div className="space-y-4">
                        <label className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                            // UPLOAD_AD_VISUALS (BATCH SUPPORT)
                        </label>
                        
                        {formData.adFiles.length > 0 && (
                            <div className="grid grid-cols-5 gap-2 mb-2">
                                {formData.adFiles.map((file, idx) => (
                                    <div key={idx} className="relative aspect-square border border-white/10 rounded-lg overflow-hidden bg-zinc-950 group">
                                        {file.startsWith('data:video') ? (
                                            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                                <Video className="w-6 h-6 text-zinc-500" />
                                            </div>
                                        ) : (
                                            <img src={file} className="w-full h-full object-cover opacity-80" alt="thumbnail" />
                                        )}
                                        <button 
                                            onClick={() => removeFile(idx)}
                                            className="absolute top-1 right-1 bg-red-600/80 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <label className={`bg-zinc-950/50 border-2 border-dashed border-white/10 hover:border-[#FFCC00] hover:bg-zinc-800/80 text-zinc-400 p-6 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all min-h-[100px] ${formData.adFiles.length > 0 ? 'border-[#FFCC00]/50' : ''}`}>
                            <ImageIcon className="w-6 h-6 mb-2 text-zinc-500" />
                            <span className="font-mono text-[10px] uppercase tracking-widest">[CLICK TO UPLOAD ASSETS]</span>
                            <p className="text-[9px] text-zinc-600 font-mono italic mt-2">AI will sync its vision sensors to these visuals.</p>
                            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
                        </label>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-end mb-2">
                            <label className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                                // STRATEGIC_CONTEXT
                            </label>
                            <button 
                                onClick={injectMarketMind}
                                className="text-[9px] font-black text-[#FFCC00] border border-[#FFCC00]/30 px-3 py-1 rounded-full hover:bg-[#FFCC00] hover:text-black transition-all font-mono uppercase tracking-widest"
                            >
                                [ INJECT_MARKETMIND_DATA ]
                            </button>
                        </div>
                        <textarea 
                            id="marketResearchText"
                            name="marketResearchText"
                            value={formData.marketResearchText}
                            onChange={(e) => setFormData(p => ({ ...p, marketResearchText: e.target.value }))}
                            placeholder="Paste your customer avatar or product info here..."
                            rows={6}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                                // OUTPUT_LANGUAGE
                            </label>
                            <div className="relative">
                                <select
                                    name="language"
                                    value={formData.language}
                                    onChange={(e) => setFormData(p => ({ ...p, language: e.target.value as any }))}
                                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] font-mono text-sm appearance-none truncate pr-10 md:text-base"
                                >
                                    <option value="English">English</option>
                                    <option value="Taglish">Taglish</option>
                                </select>
                                <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                            </div>
                        </div>
                        <div className="flex flex-col justify-end">
                             <div className="p-4 bg-zinc-950 border border-white/10 rounded-xl flex flex-col justify-center h-[54px]">
                                <p className="text-[9px] text-zinc-500 font-mono tracking-tighter uppercase leading-none mb-1">SESSION_TYPE</p>
                                <p className="text-[10px] text-[#FFCC00] font-black uppercase font-mono">{formData.adFileType}_ANALYSIS_PROTOCOL</p>
                             </div>
                        </div>
                    </div>

                    <GoldButton 
                        onClick={handleGenerate} 
                        disabled={isGenerating}
                        className="w-full py-4 mt-4 rounded-xl tracking-widest whitespace-nowrap"
                    >
                        {isGenerating ? "DECODING_MULTIMODAL_INPUTS..." : "SYNTHESIZE AD COPY (VISION MODE)"}
                    </GoldButton>

                    {error && <p className="text-red-500 font-mono text-sm text-center border border-red-900/50 bg-red-900/20 p-4 rounded-xl mt-4">{error}</p>}
                </div>

                <div className="flex flex-col h-full min-h-[600px] border-l border-white/10 pl-0 lg:pl-10">
                    <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                        <h2 className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                            // COPY_VARIATIONS
                        </h2>
                        {result && (
                            <button 
                                onClick={handleDownload} 
                                className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono uppercase tracking-widest hover:text-[#FFCC00] transition-colors"
                            >
                                <Copy className="w-3 h-3" /> EXPORT .TXT
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-grow bg-zinc-950 border border-white/10 p-6 overflow-y-auto custom-scrollbar relative rounded-xl">
                        {isGenerating ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-10 rounded-xl">
                                <Loader message="SYNTHESIZING PSYCHOLOGICAL TRIGGERS..." />
                            </div>
                        ) : result ? (
                            <div className="animate-in fade-in duration-1000">
                                {renderVariations()}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                                <p className="font-mono text-center mb-2 tracking-[0.5em] text-[10px] uppercase">// SYSTEM_STANDBY</p>
                                <p className="text-sm text-center max-w-xs">
                                    Awaiting visual and strategic data injection to generate ad artifacts.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </GlassPanel>
      </div>
    </div>
  );
};

export default CaptionHeadline;
