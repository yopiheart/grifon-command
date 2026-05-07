
import React, { useState } from 'react';
import { VideoEditInput } from '../types';
import { generateVideoEditPlan } from '../services/geminiService';
import { compressImageForUpload } from '../utils/imageCompression';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import { Copy, ChevronLeft, UploadCloud, Image as ImageIcon, Trash2 } from 'lucide-react';
import saveAs from 'file-saver';

interface EditVideoProps {
  onBack: () => void;
}

const EditVideo: React.FC<EditVideoProps> = ({ onBack }) => {
  const [formData, setFormData] = useState<VideoEditInput>({
    scriptText: '',
    sceneImages: [],
    instructions: '',
  });
  
  const [scriptSource, setScriptSource] = useState<'paste' | 'upload'>('paste');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleScriptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        setFormData(prev => ({ ...prev, scriptText: text }));
    };
    reader.readAsText(file);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const filesArray = Array.from(e.target.files) as File[];
          const compressed = await Promise.all(filesArray.map(f => compressImageForUpload(f)));
          const newImages = compressed.map(c => c.dataUrl);
          setFormData(prev => ({ ...prev, sceneImages: [...prev.sceneImages, ...newImages] }));
      }
      if (e.target) e.target.value = '';
  };

  const removeImage = (indexToRemove: number) => {
      setFormData(prev => ({
          ...prev,
          sceneImages: prev.sceneImages.filter((_, idx) => idx !== indexToRemove)
      }));
  };

  const handleAnalyze = async () => {
    // REQUIREMENT: Script is mandatory
    if (!formData.scriptText) {
        setError("Missing Script: You MUST paste a script or upload a text file.");
        return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    
    try {
        const plan = await generateVideoEditPlan(formData);
        setResult(plan);
    } catch (err: any) {
        console.error(err);
        setError(`Analysis Failed: ${err.message || 'Unknown Error'}. Please check your connection.`);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `Viral_Edit_Plan.txt`);
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
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight break-words whitespace-normal leading-tight">
                Viral Video Editor
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
                // TURN RAW FOOTAGE INTO VIRAL GOLD
            </p>
          </div>
        </header>

        <GlassPanel className="relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* LEFT: INPUTS */}
                <div className="space-y-6">
                    <h2 className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest border-b border-white/10 pb-2">
                        // SOURCE_MATERIAL
                    </h2>
                    
                    {/* Script Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                             <label className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                                 // SCRIPT_SOURCE (REQUIRED)
                             </label>
                             <div className="flex gap-4">
                                <button 
                                    className={`pb-2 text-[10px] font-mono tracking-widest uppercase transition-colors ${scriptSource === 'paste' ? 'text-[#FFCC00] border-b-2 border-[#FFCC00]' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    onClick={() => setScriptSource('paste')}
                                >
                                    Paste Text
                                </button>
                                <button 
                                    className={`pb-2 text-[10px] font-mono tracking-widest uppercase transition-colors ${scriptSource === 'upload' ? 'text-[#FFCC00] border-b-2 border-[#FFCC00]' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    onClick={() => setScriptSource('upload')}
                                >
                                    Upload File
                                </button>
                             </div>
                        </div>

                        {scriptSource === 'upload' ? (
                            <div className="space-y-2">
                                <label className="bg-zinc-950/50 border-2 border-dashed border-white/10 hover:border-[#FFCC00] hover:bg-zinc-800/80 text-zinc-400 p-4 rounded-xl flex items-center justify-center cursor-pointer transition-all">
                                    <UploadCloud className="w-5 h-5 mr-2" />
                                    <span className="font-mono text-sm uppercase tracking-widest">Upload .TXT Script</span>
                                    <input 
                                        type="file" 
                                        accept=".txt" 
                                        onChange={handleScriptUpload} 
                                        className="hidden"
                                    />
                                </label>
                                {formData.scriptText && <p className="text-[#FFCC00] text-xs mt-2 font-mono text-center">Script loaded successfully.</p>}
                            </div>
                        ) : (
                            <textarea 
                                id="scriptText"
                                name="scriptText"
                                value={formData.scriptText}
                                onChange={handleChange}
                                placeholder="Paste your script or outline here..."
                                rows={6}
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] min-h-[100px] text-sm"
                            />
                        )}
                    </div>
                    
                    {/* Image Section */}
                    <div>
                        <label className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest mb-2">
                            // KEY_SCENES_SCREENSHOTS
                        </label>
                        <p className="text-[10px] text-zinc-500 mb-4 font-mono">
                            Upload screenshots or photos of your raw footage. The AI will analyze visual composition against your script.
                        </p>
                        
                        {/* Image Grid */}
                        {formData.sceneImages.length > 0 && (
                             <div className="grid grid-cols-4 gap-2 mb-4">
                                {formData.sceneImages.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square border border-white/10 rounded-lg overflow-hidden bg-zinc-950 group">
                                        <img src={img} alt={`Scene ${idx}`} className="w-full h-full object-cover opacity-80" />
                                        <button 
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-1 right-1 bg-red-600/80 text-white w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-red-600 opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                             </div>
                        )}

                        <label className="bg-zinc-950/50 border-2 border-dashed border-white/10 hover:border-[#FFCC00] hover:bg-zinc-800/80 text-zinc-400 p-6 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all min-h-[100px]">
                            <ImageIcon className="w-6 h-6 mb-2 text-zinc-500" />
                            <span className="font-mono text-[10px] uppercase tracking-widest">[CLICK TO UPLOAD KEYFRAMES]</span>
                            <input 
                                type="file" 
                                accept="image/*" 
                                multiple
                                onChange={handleImageUpload} 
                                className="hidden"
                            />
                        </label>
                    </div>
                    
                    <div className="space-y-2">
                        <label htmlFor="instructions" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                            // SPECIAL_INSTRUCTIONS (OPTIONAL)
                        </label>
                        <textarea 
                            id="instructions"
                            name="instructions"
                            value={formData.instructions}
                            onChange={handleChange}
                            placeholder="e.g., Focus on high energy, target Gen Z audience..."
                            rows={2}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] text-sm"
                        />
                    </div>

                    <GoldButton 
                        onClick={handleAnalyze} 
                        disabled={isAnalyzing}
                        className="w-full py-4 mt-4 rounded-xl tracking-widest whitespace-nowrap"
                    >
                        {isAnalyzing ? "ANALYZING SCENES..." : "GENERATE EDIT PLAN"}
                    </GoldButton>
                    
                    {error && (
                        <p className="text-red-500 font-mono text-sm text-center border border-red-900/50 bg-red-900/20 p-4 rounded-xl mt-4">{error}</p>
                    )}
                </div>

                {/* RIGHT: RESULTS */}
                <div className="flex flex-col h-full min-h-[500px] border-l border-white/10 pl-0 lg:pl-10">
                    <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                        <h2 className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                            // VIRAL_EDIT_PLAN
                        </h2>
                        {result && (
                            <button 
                                onClick={handleDownload} 
                                className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono uppercase tracking-widest hover:text-[#FFCC00] transition-colors"
                            >
                                <Copy className="w-3 h-3" /> DOWNLOAD .TXT
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-grow bg-zinc-950 border border-white/10 rounded-xl p-6 overflow-y-auto custom-scrollbar relative">
                        {isAnalyzing ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-10 rounded-xl">
                                <Loader message="WATCHING & STRATEGIZING..." />
                            </div>
                        ) : result ? (
                            <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                {result}
                            </pre>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                                <p className="font-mono text-center mb-2 text-[10px] uppercase tracking-widest">// SYSTEM_STANDBY</p>
                                <p className="text-sm text-center max-w-xs">
                                    Upload script and scene screenshots to receive a frame-by-frame viral editing strategy.
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

export default EditVideo;
