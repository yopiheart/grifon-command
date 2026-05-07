
import React, { useState } from 'react';
import { OfferOptimizerInput } from '../types';
import { generateOfferOptimization } from '../services/geminiService';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import { Copy, ChevronLeft, ChevronDown, UploadCloud } from 'lucide-react';
import saveAs from 'file-saver';

interface OfferOptimizerProps {
  onBack: () => void;
}

const OfferOptimizer: React.FC<OfferOptimizerProps> = ({ onBack }) => {
  const [formData, setFormData] = useState<OfferOptimizerInput>({
    productName: '',
    currentPrice: '',
    targetAudience: '',
    marketResearchText: '',
    language: 'English',
  });
  
  const [inputType, setInputType] = useState<'upload' | 'paste'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        setFormData(prev => ({ ...prev, marketResearchText: text }));
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    if (!formData.productName || !formData.currentPrice || !formData.marketResearchText) {
        setError("Please provide Product Name, Price, and Market Research context.");
        return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    
    try {
        const report = await generateOfferOptimization(formData);
        setResult(report);
    } catch (err) {
        console.error(err);
        setError("Offer Optimization Failed. Please check your connection and try again.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `Irresistible_Offer_Blueprint.txt`);
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
                Offer Optimizer
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
                // MAKE YOUR CUSTOMER FEEL STUPID SAYING NO
            </p>
          </div>
        </header>

        <GlassPanel className="relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* LEFT: INPUTS */}
                <div className="space-y-6">
                    <h2 className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest border-b border-white/10 pb-2">
                        // OFFER_CONTEXT
                    </h2>
                    
                    {/* Context Source Tabs */}
                    <div className="flex gap-4 mb-4">
                        <button 
                            className={`pb-2 text-[10px] font-mono tracking-widest uppercase transition-colors ${inputType === 'upload' ? 'text-[#FFCC00] border-b-2 border-[#FFCC00]' : 'text-zinc-500 hover:text-zinc-300'}`}
                            onClick={() => setInputType('upload')}
                        >
                            Upload Research File
                        </button>
                        <button 
                            className={`pb-2 text-[10px] font-mono tracking-widest uppercase transition-colors ${inputType === 'paste' ? 'text-[#FFCC00] border-b-2 border-[#FFCC00]' : 'text-zinc-500 hover:text-zinc-300'}`}
                            onClick={() => setInputType('paste')}
                        >
                            Paste Text
                        </button>
                    </div>

                    {inputType === 'upload' ? (
                        <div className="space-y-2">
                            <label htmlFor="file-upload" className="bg-zinc-950/50 border-2 border-dashed border-white/10 hover:border-[#FFCC00] hover:bg-zinc-800/80 text-zinc-400 p-4 rounded-xl flex items-center justify-center cursor-pointer transition-all w-full gap-2"> 
                                <UploadCloud className="w-5 h-5" /> UPLOAD .TXT FILE 
                            </label>
                            <input 
                                id="file-upload"
                                type="file" 
                                accept=".txt" 
                                onChange={handleFileUpload} 
                                className="hidden"
                            />
                            {formData.marketResearchText && <p className="text-[#FFCC00] text-xs mt-2 font-mono text-center">File loaded successfully.</p>}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label htmlFor="marketResearchText" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                                // PASTE_MARKET_RESEARCH
                            </label>
                            <textarea 
                                id="marketResearchText"
                                name="marketResearchText"
                                value={formData.marketResearchText}
                                onChange={handleChange}
                                placeholder="Paste the MarketMind report or key customer insights here..."
                                rows={6}
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] min-h-[100px] text-sm"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="productName" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                            // CURRENT_PRODUCT_SERVICE_NAME
                        </label>
                        <input 
                            id="productName"
                            name="productName"
                            value={formData.productName}
                            onChange={handleChange}
                            placeholder="e.g., Ultimate Growth Kit"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] text-sm"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="currentPrice" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                                // CURRENT_OFFER_PRICE
                            </label>
                            <input 
                                id="currentPrice"
                                name="currentPrice"
                                value={formData.currentPrice}
                                onChange={handleChange}
                                placeholder="e.g., ₱1,500"
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] text-sm"
                            />
                        </div>
                         <div className="space-y-2">
                            <label className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                                // LANGUAGE
                            </label>
                            <div className="relative">
                                <select
                                    name="language"
                                    value={formData.language}
                                    onChange={handleChange}
                                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] font-mono text-sm appearance-none truncate pr-10 md:text-base"
                                >
                                    <option value="English">English</option>
                                    <option value="Taglish">Taglish</option>
                                </select>
                                <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label htmlFor="targetAudience" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                            // TARGET_AUDIENCE_BRIEF
                        </label>
                        <input 
                            id="targetAudience"
                            name="targetAudience"
                            value={formData.targetAudience}
                            onChange={handleChange}
                            placeholder="e.g., Frustrated freelancers looking for stable income"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] text-sm"
                        />
                    </div>

                    <GoldButton 
                        onClick={handleAnalyze} 
                        disabled={isAnalyzing}
                        className="w-full py-4 mt-4 rounded-xl tracking-widest whitespace-nowrap"
                    >
                        {isAnalyzing ? "OPTIMIZING OFFER..." : "GENERATE IRRESISTIBLE OFFERS"}
                    </GoldButton>
                    
                    {error && (
                        <p className="text-red-500 font-mono text-sm text-center border border-red-900/50 bg-red-900/20 p-4 rounded-xl mt-4">{error}</p>
                    )}
                </div>

                {/* RIGHT: RESULTS */}
                <div className="flex flex-col h-full min-h-[500px] border-l border-white/10 pl-0 lg:pl-10">
                    <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                        <h2 className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                            // OFFER_BLUEPRINT
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
                                <Loader message="APPLYING VIRAL PSYCHOLOGY..." />
                            </div>
                        ) : result ? (
                            <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                {result}
                            </pre>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                                <p className="font-mono text-center mb-2 text-[10px] uppercase tracking-widest">// SYSTEM_STANDBY</p>
                                <p className="text-sm text-center max-w-xs">
                                    Input your product details and market research to generate high-converting offer stacks.
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

export default OfferOptimizer;
