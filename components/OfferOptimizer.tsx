
import React, { useState, useMemo, useEffect } from 'react';
import { OfferOptimizerInput, OfferOptimizerResult, OfferTier, MarketResearchReport } from '../types';
import { generateOfferOptimization } from '../services/geminiService';
import { generateOfferPdf } from '../utils/offerPdfGenerator';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import { PreviousResearchCard } from './ui/PreviousResearchCard';
import Loader from './ui/Loader';
import { Copy, ChevronLeft, ChevronDown, ChevronUp, UploadCloud, AlarmClock, ShieldCheck, ArrowRight, Download, Brain, FileSearch } from 'lucide-react';
import saveAs from 'file-saver';

interface OfferOptimizerProps {
  onBack: () => void;
  onNavigate?: (module: string) => void;
}

const TIER_LABELS: Record<'tripwire' | 'coreOffer' | 'highTicket', string> = {
  tripwire: 'TRIPWIRE',
  coreOffer: 'CORE OFFER',
  highTicket: 'HIGH-TICKET',
};

const TIER_SUBTITLES: Record<'tripwire' | 'coreOffer' | 'highTicket', string> = {
  tripwire: '// LOW-BARRIER ENTRY',
  coreOffer: '// MAIN PROFIT DRIVER',
  highTicket: '// VIP UPSELL',
};

const formatTierAsText = (label: string, tier: OfferTier): string => {
  const stackLines = tier.valueStack.map(v => `   • ${v.item} — ${v.value}`).join('\n');
  return [
    `=== ${label}: ${tier.name} ===`,
    ``,
    tier.pitch,
    ``,
    `VALUE STACK:`,
    stackLines,
    ``,
    `Total Value: ${tier.totalValue}`,
    `Your Price: ${tier.actualPrice}`,
    ``,
    `No-Brainer Logic: ${tier.noBrainerLogic}`,
    `Scarcity: ${tier.scarcity}`,
    `Guarantee: ${tier.guarantee}`,
    ``,
    `Hormozi Logic:`,
    `  Dream Outcome  → ${tier.hormoziLogic.dreamOutcome}`,
    `  Likelihood     → ${tier.hormoziLogic.likelihood}`,
    `  Time Delay     → ${tier.hormoziLogic.timeDelay}`,
    `  Effort Removed → ${tier.hormoziLogic.effort}`,
    ``,
    `Probability: ${tier.probability}`,
  ].join('\n');
};

const TierCard: React.FC<{ label: string; subtitle: string; tier: OfferTier }> = ({ label, subtitle, tier }) => {
  const [showHormozi, setShowHormozi] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(formatTierAsText(label, tier));
  };

  return (
    <div className="bg-zinc-950 border border-white/10 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">{subtitle}</p>
          <p className="text-[10px] text-[#FFCC00] font-mono uppercase tracking-widest mt-1">{label}</p>
          <h3 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight leading-tight mt-1 break-words">
            {tier.name}
          </h3>
        </div>
        <button
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-2 text-[10px] text-zinc-400 font-mono uppercase tracking-widest hover:text-[#FFCC00] transition-colors"
          title="Copy this tier"
        >
          <Copy className="w-3 h-3" /> COPY
        </button>
      </div>

      <p className="text-sm text-zinc-300 leading-relaxed">{tier.pitch}</p>

      <div className="space-y-2">
        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">// VALUE_STACK</p>
        <ul className="space-y-1">
          {tier.valueStack.map((v, idx) => (
            <li key={idx} className="flex items-center justify-between gap-3 text-xs font-mono border-b border-white/5 pb-1 last:border-b-0">
              <span className="text-zinc-300">{v.item}</span>
              <span className="text-zinc-400 shrink-0">{v.value}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-baseline justify-between gap-3 border-t border-white/10 pt-3">
        <div>
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Total Value</p>
          <p className="text-sm font-mono text-zinc-500 line-through">{tier.totalValue}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Your Price</p>
          <p className="text-2xl font-black text-[#FFCC00] tracking-tight">{tier.actualPrice}</p>
        </div>
      </div>

      <p className="text-xs text-zinc-300 italic border-l-2 border-[#FFCC00]/40 pl-3">
        {tier.noBrainerLogic}
      </p>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] border border-[#FFCC00]/30 bg-[#FFCC00]/5 rounded px-2 py-1">
          <AlarmClock className="w-3 h-3" /> {tier.scarcity}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] border border-[#FFCC00]/30 bg-[#FFCC00]/5 rounded px-2 py-1">
          <ShieldCheck className="w-3 h-3" /> {tier.guarantee}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-zinc-400 border border-white/10 bg-zinc-900/50 rounded px-2 py-1">
          PROBABILITY: {tier.probability}
        </span>
      </div>

      <button
        onClick={() => setShowHormozi(prev => !prev)}
        className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono uppercase tracking-widest hover:text-[#FFCC00] transition-colors w-fit"
      >
        <Brain className="w-3 h-3" /> {showHormozi ? 'HIDE' : 'SHOW'} HORMOZI LOGIC
        <ChevronDown className={`w-3 h-3 transition-transform ${showHormozi ? 'rotate-180' : ''}`} />
      </button>

      {showHormozi && (
        <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-3 space-y-2 text-xs font-mono">
          <p><span className="text-[#FFCC00]">Dream:</span> <span className="text-zinc-300">{tier.hormoziLogic.dreamOutcome}</span></p>
          <p><span className="text-[#FFCC00]">Likelihood:</span> <span className="text-zinc-300">{tier.hormoziLogic.likelihood}</span></p>
          <p><span className="text-[#FFCC00]">Time:</span> <span className="text-zinc-300">{tier.hormoziLogic.timeDelay}</span></p>
          <p><span className="text-[#FFCC00]">Effort Removed:</span> <span className="text-zinc-300">{tier.hormoziLogic.effort}</span></p>
        </div>
      )}
    </div>
  );
};

const OfferOptimizer: React.FC<OfferOptimizerProps> = ({ onBack, onNavigate }) => {
  const [formData, setFormData] = useState<OfferOptimizerInput>({
    productName: '',
    currentPrice: '',
    targetAudience: '',
    marketResearchText: '',
    language: 'English',
  });

  const [inputType, setInputType] = useState<'upload' | 'paste' | 'marketmind'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<OfferOptimizerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marketMindImported, setMarketMindImported] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);

  // Previous-result recall (Roadmap #3): surface last saved offer so users can skip re-typing
  const [previousResult, setPreviousResult] = useState<OfferOptimizerResult | null>(null);
  const [previousSavedAt, setPreviousSavedAt] = useState<number | null>(null);
  const [previousSubject, setPreviousSubject] = useState<string>('');
  const [showRecallCard, setShowRecallCard] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('offerOptimizerResult');
      const savedAtRaw = localStorage.getItem('offerOptimizerResultSavedAt');
      const subjectRaw = localStorage.getItem('offerOptimizerResultSubject');
      if (stored) {
        const parsed = JSON.parse(stored) as OfferOptimizerResult;
        setPreviousResult(parsed);
        setPreviousSavedAt(savedAtRaw ? parseInt(savedAtRaw, 10) : Date.now());
        setPreviousSubject(subjectRaw || parsed.coreOffer?.name || 'Previous Offer');
      }
    } catch (err) {
      console.warn('[OfferOptimizer] Failed to read previous result from localStorage:', err);
    }
  }, []);

  const marketMindReport = useMemo<MarketResearchReport | null>(() => {
    if (inputType !== 'marketmind') return null;
    try {
      const raw = localStorage.getItem('marketMindReport');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.subject) return null;
      return parsed as MarketResearchReport;
    } catch {
      return null;
    }
  }, [inputType]);

  const switchInputType = (next: 'upload' | 'paste' | 'marketmind') => {
    setInputType(next);
    setMarketMindImported(false);
  };

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
      const savedAtMs = Date.now();
      const subjectForCard = formData.productName || report.coreOffer?.name || 'Untitled Offer';
      localStorage.setItem('offerOptimizerResult', JSON.stringify(report));
      localStorage.setItem('offerOptimizerResultSavedAt', savedAtMs.toString());
      localStorage.setItem('offerOptimizerResultSubject', subjectForCard);
      setPreviousResult(report);
      setPreviousSavedAt(savedAtMs);
      setPreviousSubject(subjectForCard);
      setShowRecallCard(false);
    } catch (err) {
      console.error(err);
      setError("Offer Optimization Failed. Please check your connection and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownload = async () => {
    if (!result || isDownloading) return;
    setIsDownloading(true);
    try {
      const blob = await generateOfferPdf(result, formData.productName);
      const safeName = (formData.productName || 'Offer').trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_-]/g, '');
      saveAs(blob, `Irresistible_Offer_Blueprint_${safeName || 'Offer'}.pdf`);
    } catch (err) {
      console.error('PDF generation failed', err);
      setError('Could not generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendToDirector = () => {
    if (!result || !onNavigate) return;
    localStorage.setItem('grifon_pendingAutofill', 'offerOptimizer');
    localStorage.setItem('grifon_pendingAutofillTs', Date.now().toString());
    onNavigate('creative_director');
  };

  const handleImportMarketMind = () => {
    if (!marketMindReport) return;
    const audienceLine = `${marketMindReport.winningAvatar || ''} — ${marketMindReport.demographics || ''}`.trim().replace(/^—\s*/, '');
    setFormData(prev => ({
      ...prev,
      marketResearchText: marketMindReport.narrativeReport || prev.marketResearchText,
      productName: prev.productName || marketMindReport.subject || '',
      targetAudience: prev.targetAudience || audienceLine,
    }));
    setMarketMindImported(true);
  };

  const handleGoToMarketResearch = () => {
    if (!onNavigate) return;
    onNavigate('market_research');
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

        {previousResult && showRecallCard && previousSavedAt && !result && (
          <PreviousResearchCard
            subject={previousSubject || previousResult.coreOffer?.name || 'Previous Offer'}
            savedAtMs={previousSavedAt}
            label="LAST OFFER"
            onLoad={() => {
              setResult(previousResult);
              setShowRecallCard(false);
            }}
            onSendToDirector={onNavigate ? () => {
              localStorage.setItem('grifon_pendingAutofill', 'offerOptimizer');
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
                // OFFER_CONTEXT
              </h2>

              {/* Context Source Tabs */}
              <div className="flex flex-wrap gap-4 mb-4">
                <button
                  className={`pb-2 text-[10px] font-mono tracking-widest uppercase transition-colors ${inputType === 'upload' ? 'text-[#FFCC00] border-b-2 border-[#FFCC00]' : 'text-zinc-500 hover:text-zinc-300'}`}
                  onClick={() => switchInputType('upload')}
                >
                  Upload File
                </button>
                <button
                  className={`pb-2 text-[10px] font-mono tracking-widest uppercase transition-colors ${inputType === 'paste' ? 'text-[#FFCC00] border-b-2 border-[#FFCC00]' : 'text-zinc-500 hover:text-zinc-300'}`}
                  onClick={() => switchInputType('paste')}
                >
                  Paste Text
                </button>
                <button
                  className={`pb-2 text-[10px] font-mono tracking-widest uppercase transition-colors ${inputType === 'marketmind' ? 'text-[#FFCC00] border-b-2 border-[#FFCC00]' : 'text-zinc-500 hover:text-zinc-300'}`}
                  onClick={() => switchInputType('marketmind')}
                >
                  Use MarketMind Run
                </button>
              </div>

              {inputType === 'upload' && (
                <div className="space-y-2">
                  <label htmlFor="file-upload" className="bg-zinc-950/50 border-2 border-dashed border-white/10 hover:border-[#FFCC00] hover:bg-zinc-800/80 text-zinc-400 p-4 rounded-xl flex items-center justify-center cursor-pointer transition-all w-full gap-2">
                    <UploadCloud className="w-5 h-5" /> UPLOAD .TXT / .MD FILE
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".txt,.md,text/markdown,text/plain"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {formData.marketResearchText && <p className="text-[#FFCC00] text-xs mt-2 font-mono text-center">File loaded successfully.</p>}
                </div>
              )}

              {inputType === 'paste' && (
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

              {inputType === 'marketmind' && (
                <div className="space-y-2">
                  {marketMindReport ? (
                    <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                        <FileSearch className="w-4 h-4 text-[#FFCC00]" />
                        <p className="text-[10px] text-[#FFCC00] font-mono uppercase tracking-widest">// MARKETMIND_REPORT_FOUND</p>
                      </div>
                      <div className="space-y-2 text-xs font-mono">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">// AVATAR</p>
                          <p className="text-zinc-200 mt-0.5">{marketMindReport.winningAvatar || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">// SUBJECT</p>
                          <p className="text-zinc-200 mt-0.5">{marketMindReport.subject || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">// BIG_IDEA</p>
                          <p className="text-zinc-300 mt-0.5 leading-relaxed">
                            {marketMindReport.bigIdea && marketMindReport.bigIdea.length > 140
                              ? `${marketMindReport.bigIdea.slice(0, 140)}…`
                              : marketMindReport.bigIdea || '—'}
                          </p>
                        </div>
                      </div>
                      {marketMindImported ? (
                        <div className="flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] border border-[#FFCC00]/30 bg-[#FFCC00]/5 rounded-xl px-4 py-3">
                          <ShieldCheck className="w-3 h-3" />
                          // MARKETMIND_LOADED — Research, product name & audience prefilled.
                        </div>
                      ) : (
                        <GoldButton
                          onClick={handleImportMarketMind}
                          className="w-full py-3 rounded-xl tracking-widest text-xs flex items-center justify-center gap-2"
                        >
                          IMPORT TO OPTIMIZER <ArrowRight className="w-4 h-4" />
                        </GoldButton>
                      )}
                    </div>
                  ) : (
                    <div className="bg-zinc-950 border border-white/10 rounded-xl p-6 space-y-3 text-center">
                      <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">// NO_MARKETMIND_REPORT_FOUND</p>
                      <p className="text-sm text-zinc-300">
                        Run Market Research first to import the report into your offer build.
                      </p>
                      {onNavigate && (
                        <button
                          onClick={handleGoToMarketResearch}
                          className="inline-flex items-center gap-2 bg-zinc-950 border border-white/10 hover:border-[#FFCC00] hover:text-[#FFCC00] text-zinc-300 text-[10px] font-mono uppercase tracking-widest px-4 py-2 rounded-xl transition-colors"
                        >
                          GO TO MARKET RESEARCH <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
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
                    disabled={isDownloading}
                    className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono uppercase tracking-widest hover:text-[#FFCC00] disabled:opacity-50 disabled:cursor-wait transition-colors"
                  >
                    <Download className="w-3 h-3" /> {isDownloading ? 'BUILDING PDF…' : 'DOWNLOAD .PDF'}
                  </button>
                )}
              </div>

              <div className="flex-grow bg-zinc-950 border border-white/10 rounded-xl p-4 md:p-6 relative">
                {isAnalyzing ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-10 rounded-xl">
                    <Loader message="APPLYING VIRAL PSYCHOLOGY..." />
                  </div>
                ) : result ? (
                  <div className="space-y-5">
                    {onNavigate && (
                      <div className="bg-[#FFCC00]/5 border border-[#FFCC00]/30 rounded-xl p-5 md:p-6 space-y-5">
                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] mb-1.5">// OFFER BRIEF</p>
                          <p className="text-lg md:text-xl text-zinc-100 font-bold leading-tight">{result.coreOffer.name}</p>
                        </div>

                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">// CORE OFFER PITCH</p>
                          <blockquote className="text-base italic text-zinc-100 border-l-[3px] border-[#FFCC00]/40 pl-4 leading-relaxed">
                            {result.coreOffer.pitch}
                          </blockquote>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-4 border-t border-[#FFCC00]/10">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] border border-[#FFCC00]/30 bg-[#FFCC00]/5 rounded px-2 py-1">
                            TRIPWIRE {result.tripwire?.actualPrice ?? '—'}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] border border-[#FFCC00]/30 bg-[#FFCC00]/5 rounded px-2 py-1">
                            CORE {result.coreOffer?.actualPrice ?? '—'}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] border border-[#FFCC00]/30 bg-[#FFCC00]/5 rounded px-2 py-1">
                            HIGH-TICKET {result.highTicket?.actualPrice ?? '—'}
                          </span>
                        </div>

                        <GoldButton
                          onClick={handleSendToDirector}
                          className="w-full py-4 rounded-xl tracking-widest text-xs flex items-center justify-center gap-2"
                        >
                          SEND TO DIRECTOR AI <ArrowRight className="w-4 h-4" />
                        </GoldButton>
                      </div>
                    )}

                    <div className="border-t border-white/10 pt-4">
                      <button
                        onClick={() => setShowFullReport(v => !v)}
                        className="w-full flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-[#FFCC00] hover:bg-white/5 transition-all py-2 px-3 -mx-3 rounded-md"
                      >
                        <span>{showFullReport ? 'COLLAPSE FULL ANALYSIS' : 'VIEW FULL ANALYSIS'}</span>
                        {showFullReport ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {showFullReport && (
                        <div className="space-y-5 mt-4">
                          <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-4">
                            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">// PRICING_ANALYSIS</p>
                            <p className="text-sm text-zinc-300 leading-relaxed">{result.analysis}</p>
                          </div>

                          <TierCard label={TIER_LABELS.tripwire} subtitle={TIER_SUBTITLES.tripwire} tier={result.tripwire} />
                          <TierCard label={TIER_LABELS.coreOffer} subtitle={TIER_SUBTITLES.coreOffer} tier={result.coreOffer} />
                          <TierCard label={TIER_LABELS.highTicket} subtitle={TIER_SUBTITLES.highTicket} tier={result.highTicket} />

                          <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-4 space-y-2">
                            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">// CONVERSION_ASSETS</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono">
                              <p><span className="text-zinc-500">Brand:</span> <span className="text-zinc-300">{result.conversionAssets.brandName}</span></p>
                              <p><span className="text-zinc-500">Target:</span> <span className="text-zinc-300">{result.conversionAssets.target}</span></p>
                              <p><span className="text-zinc-500">Benefit:</span> <span className="text-zinc-300">{result.conversionAssets.mainBenefit}</span></p>
                              <p><span className="text-zinc-500">Problem:</span> <span className="text-zinc-300">{result.conversionAssets.mainProblem}</span></p>
                              <p><span className="text-zinc-500">Pain:</span> <span className="text-zinc-300">{result.conversionAssets.mainPainPoint}</span></p>
                              <p><span className="text-zinc-500">Mechanism:</span> <span className="text-zinc-300">{result.conversionAssets.mainDifferentiator}</span></p>
                            </div>
                            {result.conversionAssets.mainFeatures?.length > 0 && (
                              <div className="text-xs font-mono pt-2 border-t border-white/5">
                                <p className="text-zinc-500 mb-1">Features:</p>
                                <ul className="text-zinc-300 list-disc list-inside space-y-0.5">
                                  {result.conversionAssets.mainFeatures.map((f, idx) => <li key={idx}>{f}</li>)}
                                </ul>
                              </div>
                            )}
                            {result.conversionAssets.brandPalette?.length > 0 && (
                              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                                <span className="text-zinc-500 text-xs font-mono">Palette:</span>
                                {result.conversionAssets.brandPalette.map((hex, idx) => (
                                  <span key={idx} className="inline-flex items-center gap-1.5 text-[10px] font-mono text-zinc-300">
                                    <span className="w-3 h-3 rounded-sm border border-white/20" style={{ backgroundColor: hex }} />
                                    {hex}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
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
