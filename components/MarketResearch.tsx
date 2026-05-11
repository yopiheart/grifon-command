
import React, { useState } from 'react';
import { MarketResearchInput, MarketResearchReport } from '../types';
import { generateMarketResearch } from '../services/geminiService';
import { compressImageForUpload } from '../utils/imageCompression';
import { generateMarketResearchPdf } from '../utils/marketResearchPdfGenerator';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import { toast } from 'sonner';
import { Download, ChevronLeft, UploadCloud, X, ArrowRight } from 'lucide-react';
import saveAs from 'file-saver';

interface MarketResearchProps {
  onBack: () => void;
  onNavigate?: (module: string) => void;
}

const MarketResearch: React.FC<MarketResearchProps> = ({ onBack, onNavigate }) => {
  const [formData, setFormData] = useState<MarketResearchInput>({
    productName: '',
    productDescription: '',
    priceOffer: '',
    isLocalService: false,
    businessAddress: '',
    uploadedImages: [],
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<MarketResearchReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files) as File[];
    const compressed = await Promise.all(files.map(f => compressImageForUpload(f)));
    const newImages = compressed.map(c => c.dataUrl);

    setFormData(prev => ({ ...prev, uploadedImages: [...prev.uploadedImages, ...newImages] }));
  };

  const removeImage = (indexToRemove: number) => {
    setFormData(prev => ({
        ...prev,
        uploadedImages: prev.uploadedImages.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleAnalyze = async () => {
    if (!formData.productName || !formData.productDescription) {
        setError("Please provide at least a Product Name and Description.");
        return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    
    try {
        const report = await generateMarketResearch(formData);
        setResult(report);
        localStorage.setItem('marketMindReport', JSON.stringify(report));
    } catch (err) {
        console.error(err);
        setError("Market Analysis Failed. Please check your connection and try again.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    try {
      const blob = await generateMarketResearchPdf(result, formData.productName);
      saveAs(blob, `MarketMind_Report_${formData.productName.replace(/\s+/g, '_') || 'Untitled'}.pdf`);
    } catch (err: any) {
      console.error('[MarketResearch] PDF export failed:', err);
      toast.error('PDF EXPORT FAILED', { description: err?.message ?? 'Try again or copy the on-screen report.' });
    }
  };

  const handleSendToDirector = () => {
    if (!result || !onNavigate) return;
    onNavigate('creative_director');
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
                Market Research
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
                // DEEP_DIVE CUSTOMER ANALYSIS
            </p>
          </div>
        </header>

        <GlassPanel className="relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* LEFT: INPUTS */}
                <div className="space-y-6">
                    <h2 className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest border-b border-white/10 pb-2">
                        // TARGET_DATA
                    </h2>
                    
                    <div className="space-y-2">
                        <label htmlFor="productName" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                            // PRODUCT_SERVICE_NAME
                        </label>
                        <input 
                            id="productName"
                            name="productName"
                            value={formData.productName}
                            onChange={handleChange}
                            placeholder="e.g., SlimFit Detox Tea"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] text-sm"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label htmlFor="productDescription" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                            // DESCRIPTION
                        </label>
                        <textarea 
                            id="productDescription"
                            name="productDescription"
                            value={formData.productDescription}
                            onChange={handleChange}
                            placeholder="Briefly describe what it is and what it does..."
                            rows={4}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] min-h-[100px] text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="priceOffer" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                            // PRICE_CURRENT_OFFER
                        </label>
                        <input 
                            id="priceOffer"
                            name="priceOffer"
                            value={formData.priceOffer}
                            onChange={handleChange}
                            placeholder="e.g., ₱999 (Buy 1 Take 1)"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] text-sm"
                        />
                    </div>

                    <div className="p-6 bg-zinc-950/50 border border-white/10 rounded-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <input 
                                type="checkbox"
                                id="isLocalService"
                                name="isLocalService"
                                checked={formData.isLocalService}
                                onChange={handleChange}
                                className="w-5 h-5 accent-[#FFCC00] cursor-pointer rounded border-white/10 bg-zinc-900 text-sm"
                            />
                            <label htmlFor="isLocalService" className="text-sm font-bold text-white uppercase cursor-pointer">
                                Is this a Local Service?
                            </label>
                        </div>
                        
                        {formData.isLocalService && (
                            <div className="animate-fade-in space-y-2 mt-4">
                                <label htmlFor="businessAddress" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                                    // BUSINESS_ADDRESS_LOCATION
                                </label>
                                <input 
                                    id="businessAddress"
                                    name="businessAddress"
                                    value={formData.businessAddress}
                                    onChange={handleChange}
                                    placeholder="e.g., 123 Main St, Quezon City"
                                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] text-sm"
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest mb-2">
                            // VISUALS_PRODUCT_RESULTS
                        </label>
                        <div className="grid grid-cols-4 gap-4 mb-2">
                             {formData.uploadedImages.map((img, idx) => (
                                <div key={idx} className="relative aspect-square border-2 border-white/10 rounded-xl bg-zinc-950 overflow-hidden group">
                                    <img src={img} alt="preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    <button 
                                        onClick={() => removeImage(idx)}
                                        className="absolute top-1 right-1 bg-red-600/90 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                             ))}
                             <label className="bg-zinc-950/50 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#FFCC00] hover:bg-zinc-800/80 transition-all aspect-square">
                                <UploadCloud className="w-6 h-6 text-zinc-400 mb-2" />
                                <span className="text-[10px] text-zinc-400 font-mono uppercase">UPLOAD</span>
                                <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                             </label>
                        </div>
                    </div>

                    <GoldButton 
                        onClick={handleAnalyze} 
                        disabled={isAnalyzing}
                        className="w-full py-4 mt-4 rounded-xl tracking-widest whitespace-nowrap"
                    >
                        {isAnalyzing ? "ACCESSING MARKETMIND..." : "ANALYZE MARKET (LAUNCH MARKETMIND)"}
                    </GoldButton>
                    
                    {error && (
                        <p className="text-red-500 font-mono text-sm text-center border border-red-900/50 bg-red-900/20 p-4 rounded-xl mt-4">{error}</p>
                    )}
                </div>

                {/* RIGHT: RESULTS */}
                <div className="flex flex-col h-full min-h-[500px] border-l border-white/10 pl-0 lg:pl-10">
                    <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                        <h2 className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                            // ANALYSIS_REPORT
                        </h2>
                        {result && (
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono uppercase tracking-widest hover:text-[#FFCC00] transition-colors"
                            >
                                <Download className="w-3 h-3" /> DOWNLOAD .TXT
                            </button>
                        )}
                    </div>

                    {result && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] border border-[#FFCC00]/30 bg-[#FFCC00]/5 rounded px-2 py-1">
                                {result.headlines?.length ?? 0} HEADLINES
                            </span>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] border border-[#FFCC00]/30 bg-[#FFCC00]/5 rounded px-2 py-1">
                                {result.videoHooks?.length ?? 0} HOOKS
                            </span>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] border border-[#FFCC00]/30 bg-[#FFCC00]/5 rounded px-2 py-1">
                                {result.fbAdLibraryAngles?.length ?? 0} AD CONCEPTS
                            </span>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] border border-[#FFCC00]/30 bg-[#FFCC00]/5 rounded px-2 py-1">
                                {result.competitorMatrix?.length ?? 0} COMPETITORS MAPPED
                            </span>
                        </div>
                    )}

                    <div className="flex-grow bg-zinc-950 border border-white/10 rounded-xl p-6 overflow-y-auto custom-scrollbar relative">
                        {isAnalyzing ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-10 rounded-xl">
                                <Loader message="SIMULATING CUSTOMER RESEARCH..." />
                            </div>
                        ) : result ? (
                            <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                {result.narrativeReport}
                            </pre>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                                <p className="font-mono text-center mb-2 text-[10px] uppercase tracking-widest">// SYSTEM_STANDBY</p>
                                <p className="text-sm text-center max-w-sm">
                                    Initiate analysis to generate your Avatar Profile, Bleeding Neck, Big Idea, 5 A/B-ready Headlines, 5 Typed Video Hooks, Competitor Matrix, and 3 ready-to-film FB Ad Concepts.
                                </p>
                            </div>
                        )}
                    </div>

                    {result && onNavigate && (
                        <GoldButton
                            onClick={handleSendToDirector}
                            className="w-full py-3 mt-4 rounded-xl tracking-widest text-xs flex items-center justify-center gap-2"
                        >
                            SEND TO DIRECTOR AI <ArrowRight className="w-4 h-4" />
                        </GoldButton>
                    )}
                </div>
            </div>
        </GlassPanel>
      </div>
    </div>
  );
};

export default MarketResearch;
