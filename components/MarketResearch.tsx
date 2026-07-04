
import React, { useState, useEffect } from 'react';
import { MarketResearchInput, MarketResearchReport, PremiseCheckResult, PremiseAlternative } from '../types';
import { generateMarketResearch, generatePremiseCheck } from '../services/geminiService';
import { compressImageForUpload } from '../utils/imageCompression';
import { generateMarketResearchPdf } from '../utils/marketResearchPdfGenerator';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import { PreviousResearchCard } from './ui/PreviousResearchCard';
import Loader from './ui/Loader';
import { toast } from 'sonner';
import { Download, ChevronLeft, ChevronDown, ChevronUp, ChevronRight, UploadCloud, X, ArrowRight, Target, Check } from 'lucide-react';
import saveAs from 'file-saver';

interface MarketResearchProps {
  onBack: () => void;
  onNavigate?: (module: string) => void;
}

const MarketResearch: React.FC<MarketResearchProps> = ({ onBack, onNavigate }) => {
  const [formData, setFormData] = useState<MarketResearchInput>({
    brandName: '',
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
  const [showFullReport, setShowFullReport] = useState(false);

  // Premise Check (assumption gate) — runs before MarketMind to pressure-test the
  // founder's premise. Skippable, default-on. 'idle' → 'loading' → 'ready' → 'done'
  // ('done' = gate consumed, research proceeding).
  const [gateStatus, setGateStatus] = useState<'idle' | 'loading' | 'ready' | 'done'>('idle');
  const [premiseResult, setPremiseResult] = useState<PremiseCheckResult | null>(null);
  const [confirmedTarget, setConfirmedTarget] = useState('');
  const [confirmedReason, setConfirmedReason] = useState('');

  // Previous-research recall (Roadmap #3): surface last saved MarketMind so users can skip re-typing
  const [previousReport, setPreviousReport] = useState<MarketResearchReport | null>(null);
  const [previousSavedAt, setPreviousSavedAt] = useState<number | null>(null);
  const [showRecallCard, setShowRecallCard] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('marketMindReport');
      const savedAtRaw = localStorage.getItem('marketMindReportSavedAt');
      if (stored) {
        const parsed = JSON.parse(stored) as MarketResearchReport;
        setPreviousReport(parsed);
        setPreviousSavedAt(savedAtRaw ? parseInt(savedAtRaw, 10) : Date.now());
      }
    } catch (err) {
      console.warn('[MarketResearch] Failed to read previous report from localStorage:', err);
    }
  }, []);

  // Hero handoff — a one-shot prompt typed on the dashboard prefills the product
  // description so Recon starts from the user's own words. One-time, then cleared.
  useEffect(() => {
    try {
      const hero = localStorage.getItem('grifon_heroPrompt');
      if (hero) {
        setFormData(prev => ({ ...prev, productDescription: prev.productDescription || hero }));
        localStorage.removeItem('grifon_heroPrompt');
        localStorage.removeItem('grifon_heroPromptTs');
      }
    } catch { /* best-effort */ }
  }, []);

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

  // Run the actual MarketMind research with a (possibly premise-enriched) input.
  const runResearch = async (input: MarketResearchInput) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
        const report = await generateMarketResearch(input);
        setResult(report);
        const savedAtMs = Date.now();
        localStorage.setItem('marketMindReport', JSON.stringify(report));
        localStorage.setItem('marketMindReportSavedAt', savedAtMs.toString());
        const { uploadedImages: _imgs, ...userInputs } = input;
        localStorage.setItem('marketMindUserInputs', JSON.stringify(userInputs));
        setPreviousReport(report);
        setPreviousSavedAt(savedAtMs);
        setShowRecallCard(false);
    } catch (err) {
        console.error(err);
        setError("Market Analysis Failed. Please check your connection and try again.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  // Append the confirmed premise into productDescription (same enrichment pattern as
  // the hero-handoff) so the UNCHANGED marketmind flow runs on a sharpened premise.
  const buildEnrichedInput = (): MarketResearchInput => {
    const parts: string[] = [];
    if (confirmedTarget.trim()) parts.push(`Target customer: ${confirmedTarget.trim()}.`);
    if (confirmedReason.trim()) parts.push(`Core reason they buy or hesitate: ${confirmedReason.trim()}.`);
    if (parts.length === 0) return formData;
    return {
        ...formData,
        productDescription: `${formData.productDescription}\n\n[Premise Check — confirmed by founder] ${parts.join(' ')}`,
    };
  };

  // Primary action: default-on gate. First click pressure-tests the premise; the
  // gate panel then holds the Confirm / Skip decision. If the gate call fails, fall
  // straight through to research (non-blocking).
  const handlePrimaryAction = async () => {
    if (!formData.productName || !formData.productDescription) {
        setError("Please provide at least a Product Name and Description.");
        return;
    }
    setError(null);
    setGateStatus('loading');
    try {
        const pc = await generatePremiseCheck({
            productName: formData.productName,
            productDescription: formData.productDescription,
            priceOffer: formData.priceOffer,
            brandName: formData.brandName,
            isLocalService: formData.isLocalService,
            businessAddress: formData.businessAddress,
        });
        setPremiseResult(pc);
        setConfirmedTarget('');
        setConfirmedReason('');
        setGateStatus('ready');
    } catch (err) {
        console.warn('[MarketResearch] Premise Check failed, proceeding to research:', err);
        setGateStatus('done');
        runResearch(formData);
    }
  };

  const applyAlternative = (alt: PremiseAlternative) => {
    setConfirmedTarget(alt.targetRead);
    setConfirmedReason(alt.coreReason);
  };

  const handleConfirmPremise = () => {
    const enriched = buildEnrichedInput();
    setGateStatus('done');
    runResearch(enriched);
  };

  const handleSkipPremise = () => {
    setGateStatus('done');
    runResearch(formData);
  };

  // Back/edit affordance: re-open the form so the user can edit inputs and re-run the
  // premise check. Resets the gate to 'idle' (re-enables the primary ANALYZE button)
  // and clears the prior premise result + confirmed fields.
  const handleBackToEdit = () => {
    setGateStatus('idle');
    setPremiseResult(null);
    setConfirmedTarget('');
    setConfirmedReason('');
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
    localStorage.setItem('grifon_pendingAutofill', 'marketResearch');
    localStorage.setItem('grifon_pendingAutofillTs', Date.now().toString());
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
                Recon
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
                // DEEP_DIVE CUSTOMER ANALYSIS
            </p>
          </div>
        </header>

        {previousReport && showRecallCard && previousSavedAt && !result && (
          <PreviousResearchCard
            subject={previousReport.subject || 'Previous Market Research'}
            savedAtMs={previousSavedAt}
            label="LAST MARKET RESEARCH"
            onLoad={() => {
              setResult(previousReport);
              setShowRecallCard(false);
            }}
            onSendToDirector={onNavigate ? () => {
              localStorage.setItem('grifon_pendingAutofill', 'marketResearch');
              localStorage.setItem('grifon_pendingAutofillTs', Date.now().toString());
              onNavigate('creative_director');
            } : undefined}
            onDismiss={() => setShowRecallCard(false)}
          />
        )}

        <GlassPanel className="relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* LEFT: INPUTS */}
                <div className="space-y-6">
                    <h2 className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest border-b border-white/10 pb-2">
                        // TARGET_DATA
                    </h2>
                    
                    <div className="space-y-2">
                        <label htmlFor="brandName" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                            // BRAND_NAME
                        </label>
                        <input
                            id="brandName"
                            name="brandName"
                            value={formData.brandName || ''}
                            onChange={handleChange}
                            placeholder="e.g., Lola Inday's"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] text-sm"
                        />
                    </div>

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
                        onClick={handlePrimaryAction}
                        disabled={isAnalyzing || gateStatus === 'loading' || gateStatus === 'ready'}
                        className="w-full py-4 mt-4 rounded-xl tracking-widest"
                    >
                        {isAnalyzing
                            ? "ACCESSING MARKETMIND..."
                            : gateStatus === 'loading'
                            ? "PRESSURE-TESTING PREMISE..."
                            : gateStatus === 'ready'
                            ? "REVIEW PREMISE CHECK →"
                            : "ANALYZE MARKET (LAUNCH MARKETMIND)"}
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

                    <div className="flex-grow bg-zinc-950 border border-white/10 rounded-xl p-6 relative">
                        {isAnalyzing ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-10 rounded-xl">
                                <Loader message="SIMULATING CUSTOMER RESEARCH..." />
                            </div>
                        ) : gateStatus === 'loading' ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-10 rounded-xl">
                                <Loader message="PRESSURE-TESTING YOUR PREMISE..." />
                            </div>
                        ) : gateStatus === 'ready' && !result ? (
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                                    <Target className="w-4 h-4 text-[#FFCC00] shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00]">// PREMISE_CHECK</p>
                                        <p className="text-xs text-zinc-500 leading-snug">Bago tayo magsunog ng budget — sigurado ka ba sa tunay na customer mo?</p>
                                    </div>
                                </div>

                                {premiseResult?.impliedPremise && (
                                    <div>
                                        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">// YOUR IMPLIED PREMISE</p>
                                        <p className="text-sm text-zinc-300 leading-relaxed italic">{premiseResult.impliedPremise}</p>
                                    </div>
                                )}

                                {premiseResult && premiseResult.alternatives.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">// ALTERNATIVE READS — TAP TO USE</p>
                                        {premiseResult.alternatives.map((alt, i) => (
                                            <button
                                                key={i}
                                                onClick={() => applyAlternative(alt)}
                                                className="w-full text-left bg-zinc-950 border border-white/10 rounded-xl p-4 hover:border-[#FFCC00] hover:bg-white/5 transition-all"
                                            >
                                                <p className="text-sm text-zinc-100 font-bold">{alt.targetRead}</p>
                                                <p className="text-sm text-zinc-300 mt-1">{alt.coreReason}</p>
                                                {alt.rationale && <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{alt.rationale}</p>}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {premiseResult && premiseResult.questions.length > 0 && (
                                    <div className="bg-[#FFCC00]/5 border border-[#FFCC00]/20 rounded-xl p-4">
                                        <p className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] mb-2">// ASK YOURSELF</p>
                                        <ul className="space-y-1.5">
                                            {premiseResult.questions.map((q, i) => (
                                                <li key={i} className="text-sm text-zinc-300 leading-relaxed flex gap-2"><ChevronRight className="w-3 h-3 shrink-0 mt-1 text-[#FFCC00]" />{q}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="space-y-3 border-t border-white/10 pt-4">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">// CONFIRMED_TARGET_CUSTOMER</label>
                                        <input
                                            value={confirmedTarget}
                                            onChange={(e) => setConfirmedTarget(e.target.value)}
                                            placeholder="Who is this REALLY for?"
                                            className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">// CONFIRMED_CORE_REASON</label>
                                        <input
                                            value={confirmedReason}
                                            onChange={(e) => setConfirmedReason(e.target.value)}
                                            placeholder="The real reason they buy or hesitate"
                                            className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <GoldButton
                                        onClick={handleConfirmPremise}
                                        className="w-full py-4 rounded-xl tracking-widest text-xs flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-4 h-4 shrink-0" /> CONFIRM &amp; RUN RESEARCH
                                    </GoldButton>
                                    <button
                                        onClick={handleSkipPremise}
                                        className="w-full text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-[#FFCC00] transition-colors py-2"
                                    >
                                        Skip — research as-is
                                    </button>
                                    <button
                                        onClick={handleBackToEdit}
                                        className="w-full text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-[#FFCC00] transition-colors py-2"
                                    >
                                        ← Edit inputs — re-run the check
                                    </button>
                                </div>
                            </div>
                        ) : result ? (
                            <div className="space-y-5">
                                {onNavigate && (
                                    <div className="bg-[#FFCC00]/5 border border-[#FFCC00]/30 rounded-xl p-5 md:p-6 space-y-5">
                                        <div>
                                            <p className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] mb-1.5">// MARKETMIND BRIEF</p>
                                            <p className="text-lg md:text-xl text-zinc-100 font-bold leading-tight">{result.subject}</p>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">// WINNING AVATAR</p>
                                            <p className="text-sm text-zinc-200 leading-relaxed">{result.winningAvatar}</p>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">// THE BIG IDEA</p>
                                            <blockquote className="text-base italic text-zinc-100 border-l-[3px] border-[#FFCC00]/40 pl-4 leading-relaxed">
                                                {result.bigIdea}
                                            </blockquote>
                                        </div>

                                        <div className="flex flex-wrap gap-2 pt-4 border-t border-[#FFCC00]/10">
                                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] border border-[#FFCC00]/30 bg-[#FFCC00]/5 rounded px-2 py-1">
                                                {result.headlines?.length ?? 0} HEADLINES
                                            </span>
                                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] border border-[#FFCC00]/30 bg-[#FFCC00]/5 rounded px-2 py-1">
                                                {result.videoHooks?.length ?? 0} HOOKS
                                            </span>
                                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] border border-[#FFCC00]/30 bg-[#FFCC00]/5 rounded px-2 py-1">
                                                {result.fbAdLibraryAngles?.length ?? 0} CONCEPTS
                                            </span>
                                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] border border-[#FFCC00]/30 bg-[#FFCC00]/5 rounded px-2 py-1">
                                                {result.competitorMatrix?.length ?? 0} COMPETITORS
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            <GoldButton
                                                onClick={handleSendToDirector}
                                                className="w-full py-4 rounded-xl tracking-widest text-xs flex items-center justify-center gap-2"
                                            >
                                                SEND TO DIRECTOR AI <ArrowRight className="w-4 h-4" />
                                            </GoldButton>
                                            <button
                                                onClick={() => onNavigate('offer_optimizer')}
                                                className="w-full text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-[#FFCC00] transition-colors flex items-center justify-center gap-1.5 py-1"
                                            >
                                                Or build stronger offer first <ArrowRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="border-t border-white/10 pt-4">
                                    <button
                                        onClick={() => setShowFullReport(v => !v)}
                                        className="w-full flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-[#FFCC00] hover:bg-white/5 transition-all py-2 px-3 -mx-3 rounded-md"
                                    >
                                        <span>{showFullReport ? 'COLLAPSE FULL REPORT' : 'VIEW FULL REPORT'}</span>
                                        {showFullReport ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>
                                    {showFullReport && (
                                        <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed mt-4">
                                            {result.narrativeReport}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                                <p className="font-mono text-center mb-2 text-[10px] uppercase tracking-widest">// SYSTEM_STANDBY</p>
                                <p className="text-sm text-center max-w-sm">
                                    Initiate analysis to generate your Avatar Profile, Bleeding Neck, Big Idea, 5 A/B-ready Headlines, 5 Typed Video Hooks, Competitor Matrix, and 3 ready-to-film FB Ad Concepts.
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

export default MarketResearch;
