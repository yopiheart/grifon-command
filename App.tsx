
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Lightbulb, RotateCw } from 'lucide-react';
import { ClientDetails, BusinessInfo, Script, Scene, VideoPrompt, Avatar, CinematicNarrativeScene } from './types';
import StepIndicator from './components/StepIndicator';
import Step1ClientDetails from './components/Step1ClientDetails';
import Step2BusinessInfo from './components/Step2BusinessInfo';
import Step3AdScript from './components/Step3AdScript';
import Step4Avatar from './components/Step4Avatar';
import Step5Storyboard from './components/Step5Storyboard';
import Step6Thumbnail from './components/Step6Thumbnail';
import Step6VideoPrompts from './components/Step6VideoPrompts';
import Step7FinalOutput from './components/Step7FinalOutput';
import { GlassPanel } from './components/ui/GlassPanel';
import { GoldButton } from './components/ui/GoldButton';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import Dashboard from './components/Dashboard';
import PlaceholderTool from './components/ui/PlaceholderTool';
import MarketResearch from './components/MarketResearch';
import OfferOptimizer from './components/OfferOptimizer';
import EditVideo from './components/EditVideo';
import ImageEditor from './components/ImageEditor';
import CaptionHeadline from './components/CaptionHeadline';
import OrganicCalendar from './components/OrganicCalendar';
import ImageAdsGen from './components/ImageAdsGen';
import CinematicSpecStudio from './components/CinematicSpecStudio';
import GenerateVideo from './components/GenerateVideo';
import PlanGate from './components/PlanGate';
import SignalModulator from './components/SignalModulator';
import InfluencerForge from './components/InfluencerForge';
import LandingPage from './components/LandingPage';
import GrifonPricingPage from './components/GrifonPricingPage';
import CheckoutPage from './components/CheckoutPage';
import BillingSuccess from './components/BillingSuccess';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import RefundPolicy from './components/RefundPolicy';
import Support from './components/Support';
import { toast } from 'sonner';
import { getSupabase } from './services/supabaseClient';
import { popIntendedPlan, startCheckout } from './services/billingService';
import { getSession, setSession, clearSession, type WizardSessionV1 } from './services/wizardSessionStore';

const TOTAL_STEPS = 8;

if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const adminParam = params.get('admin');
  if (adminParam === 'on' || adminParam === 'off') {
    if (adminParam === 'on') {
      localStorage.setItem('grifon_admin', 'true');
    } else {
      localStorage.removeItem('grifon_admin');
    }
    params.delete('admin');
    const query = params.toString();
    const cleanUrl = window.location.pathname + (query ? `?${query}` : '') + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);
  }
}

const GrifonLogo = ({ className = "h-24 w-auto" }) => (
  <img src="/logo.png" alt="GRIFON Logo" className={`object-contain ${className}`} />
);

type Route = 'landing' | 'pricing' | 'checkout' | 'app' | 'billing_success' | 'terms' | 'privacy' | 'refund' | 'support';

const detectInitialRoute = (): Route => {
  if (typeof window === 'undefined') return 'landing';
  const path = window.location.pathname;
  if (path.startsWith('/billing/success')) return 'billing_success';
  if (path.startsWith('/billing/cancel')) return 'pricing';
  if (path.startsWith('/checkout')) return 'checkout';
  if (path.startsWith('/pricing')) return 'pricing';
  if (path.startsWith('/terms')) return 'terms';
  if (path.startsWith('/privacy')) return 'privacy';
  if (path.startsWith('/refund')) return 'refund';
  if (path.startsWith('/support')) return 'support';
  if (path.startsWith('/app')) return 'app';
  return 'landing';
};

const ROUTE_PATHS: Record<Route, string> = {
  landing: '/',
  pricing: '/pricing',
  checkout: '/checkout',
  app: '/app',
  billing_success: '/billing/success',
  terms: '/terms',
  privacy: '/privacy',
  refund: '/refund',
  support: '/support',
};

const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<Route>(detectInitialRoute);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBooting, setIsBooting] = useState(false);
  const [bootLine, setBootLine] = useState(0);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [directorNudgeDismissed, setDirectorNudgeDismissed] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [clientDetails, setClientDetails] = useState<ClientDetails>({ brandName: '', offer: '', services: '' });
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    product: '',
    audience: '',
    goal: '',
    benefit: '',
    problem: '',
    painPoint: '',
    separator: '',
    features: '',
    productImageUrls: [],
    productImageDescription: undefined,
    logoImageUrl: undefined,
    brandColors: '', 
    scriptType: 'MrBeast', 
  });
  const [script, setScript] = useState<Script | null>(null);
  const [language, setLanguage] = useState<'English' | 'Taglish' | null>(null);
  const [finalScript, setFinalScript] = useState<string[]>([]);
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [storyboard, setStoryboard] = useState<Scene[]>([]);
  const [videoPrompts, setVideoPrompts] = useState<VideoPrompt[]>([]);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [cinematicNarrative, setCinematicNarrative] = useState<CinematicNarrativeScene[] | null>(null);
  const [cinematicFrameMap, setCinematicFrameMap] = useState<Record<string, string>>({});
  const [cinematicResult, setCinematicResult] = useState<Scene[] | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [pendingSession, setPendingSession] = useState<WizardSessionV1 | null>(null);
  const [hasRestored, setHasRestored] = useState(false);
  const saveErrorToastedRef = useRef(false);

  const bootLines = [
    "> INITIALIZING GRIFON_DNA...",
    "> LOADING MARKET_INTEL_VAULT...",
    "> SYNCING SIGNAL_MODULATOR...",
    "> ACCESS_GRANTED."
  ];

  useEffect(() => {
    if (isBooting) {
      const interval = setInterval(() => {
        setBootLine(prev => {
          if (prev >= bootLines.length - 1) {
            clearInterval(interval);
            setTimeout(() => {
              setIsBooting(false);
            }, 500);
            return prev;
          }
          return prev + 1;
        });
      }, 350);
      return () => clearInterval(interval);
    }
  }, [isBooting]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname.startsWith('/billing/cancel')) {
      toast.info('Checkout canceled', { description: 'No charge was made. You can upgrade anytime.' });
      window.history.replaceState({}, '', '/pricing');
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUserEmail(data.session.user.email ?? null);
        setUserId(data.session.user.id);
        setIsAuthenticated(true);
      } else {
        setIsLoadingSession(false);
      }
      setIsCheckingSession(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserEmail(session.user.email ?? null);
        setUserId(session.user.id);
        setIsAuthenticated(true);
      } else {
        setUserEmail(null);
        setUserId(null);
        setIsAuthenticated(false);
      }
    });

    return () => { sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const intended = popIntendedPlan();
    if (!intended) return;
    startCheckout(intended.plan_id, intended.billing_cycle).catch((err) => {
      toast.error('Could not resume checkout', { description: err?.message ?? 'Please try again.' });
    });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setIsLoadingSession(true);
    getSession(userId).then((session) => {
      if (cancelled) return;
      setPendingSession(session);
      setIsLoadingSession(false);
    });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (hasRestored || isLoadingSession) return;
    if (pendingSession === null) {
      setHasRestored(true);
      return;
    }
    const wizardPristine = currentStep === 1 && !clientDetails.brandName && !businessInfo.product && script === null;
    if (!wizardPristine) {
      if (userId) clearSession(userId);
      setPendingSession(null);
      setHasRestored(true);
    }
  }, [hasRestored, isLoadingSession, pendingSession, userId, currentStep, clientDetails.brandName, businessInfo.product, script]);

  useEffect(() => {
    if (!userId || !isAuthenticated || !hasRestored) return;
    const wizardPristine = currentStep === 1 && !clientDetails.brandName && !businessInfo.product && script === null;
    if (wizardPristine) return;

    const timer = setTimeout(() => {
      setSession(userId, {
        version: 1,
        savedAt: Date.now(),
        currentStep,
        clientDetails,
        businessInfo,
        script,
        language,
        finalScript,
        avatar,
        storyboard,
        videoPrompts,
        aspectRatio,
        thumbnailUrl,
      }).catch((err) => {
        console.warn('[wizard-session] save failed', err);
        if (!saveErrorToastedRef.current) {
          saveErrorToastedRef.current = true;
          toast.error('// SESSION_AUTOSAVE_FAILED', {
            description: 'Storage may be full or blocked. Your work is in memory but not persisted.',
          });
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [userId, isAuthenticated, hasRestored, currentStep, clientDetails, businessInfo, script, language, finalScript, avatar, storyboard, videoPrompts, aspectRatio, thumbnailUrl]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSigningIn(true);
    setIsBooting(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });
      if (error) {
        setIsBooting(false);
        setAuthError(error.message || 'Sign-in failed.');
      }
    } catch (err: any) {
      setIsBooting(false);
      setAuthError(err.message || 'Sign-in failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (userId) await clearSession(userId);
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } finally {
      setActiveModule(null);
      restart();
      setAuthEmail('');
      setAuthPassword('');
    }
  };

  const resumeSession = () => {
    if (!pendingSession) return;
    const stepLabel = String(pendingSession.currentStep).padStart(2, '0');
    setCurrentStep(pendingSession.currentStep);
    setClientDetails(pendingSession.clientDetails);
    setBusinessInfo(pendingSession.businessInfo);
    setScript(pendingSession.script);
    setLanguage(pendingSession.language);
    setFinalScript(pendingSession.finalScript);
    setAvatar(pendingSession.avatar);
    setStoryboard(pendingSession.storyboard);
    setVideoPrompts(pendingSession.videoPrompts);
    setAspectRatio(pendingSession.aspectRatio);
    setThumbnailUrl(pendingSession.thumbnailUrl);
    setPendingSession(null);
    setHasRestored(true);
    toast.success(`// SESSION_RESUMED — STEP_${stepLabel}_OF_08`, {
      description: 'Your earlier work has been restored.',
      duration: 6000,
    });
  };

  const declineSession = () => {
    if (userId) clearSession(userId);
    setPendingSession(null);
    setHasRestored(true);
  };

  const restart = () => {
    setCurrentStep(1);
    setClientDetails({ brandName: '', offer: '', services: '' });
    setBusinessInfo({ product: '', audience: '', goal: '', benefit: '', problem: '', painPoint: '', separator: '', features: '', productImageUrls: [], productImageDescription: undefined, logoImageUrl: undefined, brandColors: '', scriptType: 'MrBeast' });
    setScript(null);
    setLanguage(null);
    setFinalScript([]);
    setAvatar(null);
    setStoryboard([]);
    setVideoPrompts([]);
    setAspectRatio(null);
    setThumbnailUrl(null);
    setCinematicNarrative(null);
    setCinematicFrameMap({});
    setCinematicResult(null);
  };

  const goToLegal = (route: Route) => {
    if (typeof window !== 'undefined' && window.history.replaceState) {
      window.history.replaceState({}, '', ROUTE_PATHS[route]);
    }
    setCurrentRoute(route);
  };

  if (currentRoute === 'billing_success') {
    return (
      <ErrorBoundary
        name="route:billing_success"
        resetKey={currentRoute}
        onReset={() => setCurrentRoute('app')}
        resetLabel="CONTINUE TO APP"
      >
        <BillingSuccess onContinue={() => setCurrentRoute('app')} />
      </ErrorBoundary>
    );
  }

  if (currentRoute === 'landing') {
    return (
      <ErrorBoundary name="route:landing" resetKey={currentRoute} resetLabel="RETRY">
        <LandingPage
          onEnterApp={() => setCurrentRoute('app')}
          onNavigatePricing={() => setCurrentRoute('pricing')}
          onNavigateLegal={goToLegal}
        />
      </ErrorBoundary>
    );
  }

  if (currentRoute === 'pricing') {
    return (
      <ErrorBoundary
        name="route:pricing"
        resetKey={currentRoute}
        onReset={() => setCurrentRoute('landing')}
        resetLabel="RETURN TO LANDING"
      >
        <GrifonPricingPage
          onEnterApp={() => setCurrentRoute('app')}
          onNavigateHome={() => setCurrentRoute('landing')}
          onNavigateLegal={goToLegal}
        />
      </ErrorBoundary>
    );
  }

  if (currentRoute === 'checkout') {
    return (
      <ErrorBoundary
        name="route:checkout"
        resetKey={currentRoute}
        onReset={() => setCurrentRoute('pricing')}
        resetLabel="BACK TO PRICING"
      >
        <CheckoutPage email={userEmail} onBack={() => setCurrentRoute('pricing')} />
      </ErrorBoundary>
    );
  }

  if (currentRoute === 'terms') {
    return (
      <ErrorBoundary name="route:terms" resetKey={currentRoute} onReset={() => goToLegal('landing')} resetLabel="BACK TO LANDING">
        <TermsOfService onBack={() => goToLegal('landing')} />
      </ErrorBoundary>
    );
  }

  if (currentRoute === 'privacy') {
    return (
      <ErrorBoundary name="route:privacy" resetKey={currentRoute} onReset={() => goToLegal('landing')} resetLabel="BACK TO LANDING">
        <PrivacyPolicy onBack={() => goToLegal('landing')} />
      </ErrorBoundary>
    );
  }

  if (currentRoute === 'refund') {
    return (
      <ErrorBoundary name="route:refund" resetKey={currentRoute} onReset={() => goToLegal('landing')} resetLabel="BACK TO LANDING">
        <RefundPolicy onBack={() => goToLegal('landing')} />
      </ErrorBoundary>
    );
  }

  if (currentRoute === 'support') {
    return (
      <ErrorBoundary name="route:support" resetKey={currentRoute} onReset={() => goToLegal('landing')} resetLabel="BACK TO LANDING">
        <Support onBack={() => goToLegal('landing')} />
      </ErrorBoundary>
    );
  }

  if (isCheckingSession) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  if (!isAuthenticated || isBooting) {
    return (
      <ErrorBoundary name="route:auth" resetLabel="RETRY">
      <div className="min-h-screen bg-zinc-950 font-sans flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background neural grid effect */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
           <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(#FFCC00 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        </div>

        {isBooting ? (
          <GlassPanel className="w-full max-w-md p-10 z-20 animate-in fade-in zoom-in-95 duration-300">
             <div className="mb-8 flex justify-center">
                <GrifonLogo className="h-24 w-auto text-[#FFCC00] animate-pulse" />
             </div>
             <div className="space-y-4 font-mono text-sm">
                {bootLines.slice(0, bootLine + 1).map((line, i) => (
                  <div key={i} className={`flex items-center gap-3 ${i === bootLine ? 'text-[#FFCC00]' : 'text-zinc-500'}`}>
                    <span className="shrink-0">[ OK ]</span>
                    <span className="tracking-tighter">{line}</span>
                    {i === bootLine && <span className="w-2 h-4 bg-[#FFCC00] animate-pulse"></span>}
                  </div>
                ))}
             </div>
             <div className="mt-10 pt-6 border-t border-white/10 text-center">
                <p className="text-[10px] text-zinc-600 uppercase tracking-[0.5em] animate-pulse">ESTABLISHING_NEURAL_LINK</p>
             </div>
          </GlassPanel>
        ) : (
          <div className="z-10 w-full flex flex-col items-center">
            <div className="mb-8 text-center flex flex-col items-center">
              <div className="mb-6">
                <GrifonLogo className="h-32 w-auto text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
              </div>
              <h1 className="text-6xl font-[900] italic text-white uppercase tracking-tighter mb-2">
                GRIFON
              </h1>
              <h2 className="text-[10px] font-mono text-[#FFCC00] tracking-[0.4em] uppercase">// NEURAL_ENGINE_ACTIVE</h2>
            </div>

            <GlassPanel className="w-full max-w-md p-8">
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-2">AUTHORIZED EMAIL</label>
                        <input 
                            id="auth-email"
                            type="email" 
                            placeholder="ENTER EMAIL IDENTIFIER" 
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            required
                            className="w-full bg-zinc-950 border border-white/10 focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] rounded-xl px-4 py-3 text-sm font-medium text-white transition-all outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-2">ACCESS KEY</label>
                        <input 
                            id="auth-password"
                            type="password" 
                            placeholder="ENTER PASSWORD" 
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            required
                            className="w-full bg-zinc-950 border border-white/10 focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] rounded-xl px-4 py-3 text-sm font-medium text-white transition-all outline-none"
                        />
                    </div>
                    
                    {authError && (
                        <p className="text-red-500 text-sm font-mono text-center border border-red-900/50 bg-red-900/20 p-2 rounded-xl">{authError}</p>
                    )}

                    <GoldButton
                      type="submit"
                      className="w-full justify-center py-4"
                      disabled={isSigningIn}
                    >
                        {isSigningIn ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
                    </GoldButton>
                </form>
                <div className="mt-6 border-t border-white/10 pt-4 text-center">
                    <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">RESTRICTED AREA // AUTHORIZED PERSONNEL ONLY</p>
                </div>
            </GlassPanel>
          </div>
        )}
      </div>
      </ErrorBoundary>
    );
  }

  let moduleElement: React.ReactNode;

  if (!activeModule) {
    moduleElement = <Dashboard onSelectModule={setActiveModule} activeModule={activeModule} userEmail={userEmail} onLogout={handleLogout} onUpgrade={() => setCurrentRoute('pricing')} />;
  } else if (activeModule === 'generate_video') {
    moduleElement = (
      <PlanGate
        requires="pro"
        featureName="Video Synthesis"
        onBack={() => setActiveModule(null)}
        onUpgrade={() => { setActiveModule(null); setCurrentRoute('pricing'); }}
      >
        <GenerateVideo onBack={() => setActiveModule(null)} seedPrompts={videoPrompts} />
      </PlanGate>
    );
  } else if (activeModule === 'signal_modulator') {
    moduleElement = <SignalModulator onBack={() => setActiveModule(null)} globalScript={finalScript} />;
  } else if (activeModule === 'influencer_forge') {
    moduleElement = <InfluencerForge onBack={() => setActiveModule(null)} ethnicity={avatar?.ethnicity} />;
  } else if (activeModule === 'cinematic_studio') {
    moduleElement = <CinematicSpecStudio onBack={() => setActiveModule(null)} onNavigate={setActiveModule} businessInfo={businessInfo} narrative={cinematicNarrative} setNarrative={setCinematicNarrative} frameMap={cinematicFrameMap} setFrameMap={setCinematicFrameMap} result={cinematicResult} setResult={setCinematicResult} />;
  } else if (activeModule === 'market_research') {
    moduleElement = <MarketResearch onBack={() => setActiveModule(null)} />;
  } else if (activeModule === 'offer_optimizer') {
    moduleElement = <OfferOptimizer onBack={() => setActiveModule(null)} />;
  } else if (activeModule === 'edit_video') {
    moduleElement = <EditVideo onBack={() => setActiveModule(null)} />;
  } else if (activeModule === 'image_editor') {
    moduleElement = <ImageEditor onBack={() => setActiveModule(null)} ethnicity={avatar?.ethnicity} />;
  } else if (activeModule === 'caption_headline') {
    moduleElement = <CaptionHeadline onBack={() => setActiveModule(null)} />;
  } else if (activeModule === 'organic_calendar') {
    moduleElement = <OrganicCalendar businessInfo={businessInfo} avatar={avatar} clientDetails={clientDetails} onBack={() => setActiveModule(null)} />;
  } else if (activeModule === 'image_ads') {
    moduleElement = <ImageAdsGen businessInfo={businessInfo} avatar={avatar} clientDetails={clientDetails} onBack={() => setActiveModule(null)} />;
  } else if (activeModule === 'creative_director') {
    const hasRunResearch = !!localStorage.getItem('marketMindReport');
    const showNudge = !hasRunResearch && !directorNudgeDismissed;
    const wizardPristine = currentStep === 1 && !clientDetails.brandName && !businessInfo.product && script === null;
    const showResumePill = !isLoadingSession && pendingSession !== null && !hasRestored && wizardPristine;

    moduleElement = (
        <div className="min-h-screen bg-zinc-950 font-sans flex flex-col items-center p-4 sm:p-6 md:p-8 text-white">
        <div className="w-full max-w-6xl mx-auto">
            <header className="flex flex-col items-start gap-4 mb-8 w-full border-b border-white/10 pb-4">
              <div className="flex items-center justify-between w-full">
                 <button onClick={() => setActiveModule(null)} className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">
                  <ChevronLeft className="w-4 h-4" /> <span className="hidden md:inline">COMMAND CENTER</span><span className="md:hidden">BACK</span>
                </button>
              </div>
              <div className="flex flex-col items-start gap-2">
                <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 uppercase tracking-tight">
                  Director AI
                </h1>
                <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                  // AUTOMATED VIDEO WORKFLOW
                </p>
              </div>
            </header>

            {showNudge && (
              <div className="bg-zinc-900 border border-[#FFCC00]/30 rounded-xl p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <Lightbulb className="w-5 h-5 text-[#FFCC00]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Pro Tip: Run Market Research First</h3>
                    <p className="text-xs text-zinc-400">Director AI generates better scripts when it has real-time market data. Run a quick research report to feed the AI.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                  <button
                    onClick={() => setDirectorNudgeDismissed(true)}
                    className="text-zinc-500 hover:text-white text-xs font-medium transition-colors"
                  >
                    Skip for now
                  </button>
                  <GoldButton
                    onClick={() => setActiveModule('market_research')}
                    className="text-xs py-2 px-4"
                  >
                    Run Research
                  </GoldButton>
                </div>
              </div>
            )}

            <main className="bg-zinc-900/80 backdrop-blur-xl p-6 sm:p-10 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden">
            {isLoadingSession ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest animate-pulse">// LOADING_SESSION...</p>
              </div>
            ) : (
            <>
            {showResumePill && pendingSession && (
              <div className="bg-zinc-900 border border-[#FFCC00]/30 rounded-xl p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <RotateCw className="w-5 h-5 text-[#FFCC00]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">// PREVIOUS_SESSION_DETECTED</h3>
                    <p className="text-xs text-zinc-400">
                      STEP_{String(pendingSession.currentStep).padStart(2, '0')}_OF_08
                      {pendingSession.clientDetails.brandName && ` — ${pendingSession.clientDetails.brandName.toUpperCase()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                  <button
                    onClick={declineSession}
                    className="text-zinc-500 hover:text-white text-xs font-medium transition-colors"
                  >
                    START_FRESH
                  </button>
                  <GoldButton
                    onClick={resumeSession}
                    className="text-xs py-2 px-4"
                  >
                    RESUME
                  </GoldButton>
                </div>
              </div>
            )}
            {currentStep <= TOTAL_STEPS && <StepIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} onStepClick={(s) => s < currentStep && setCurrentStep(s)} />}
            <div className="mt-8">
                {currentStep === 1 && <Step1ClientDetails data={clientDetails} setData={setClientDetails} onNext={() => setCurrentStep(2)} />}
                {currentStep === 2 && <Step2BusinessInfo data={businessInfo} setData={setBusinessInfo} onNext={() => setCurrentStep(3)} onBack={() => setCurrentStep(1)} aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} />}
                {currentStep === 3 && <Step3AdScript businessInfo={businessInfo} script={script} setScript={setScript} setFinalScript={setFinalScript} language={language} setLanguage={setLanguage} onNext={() => setCurrentStep(4)} onBack={() => setCurrentStep(2)} brandName={clientDetails.brandName} />}
                {currentStep === 4 && <Step4Avatar businessInfo={businessInfo} avatar={avatar} setAvatar={setAvatar} onNext={() => setCurrentStep(5)} onBack={() => setCurrentStep(3)} aspectRatio={aspectRatio} />}
                {currentStep === 5 && <Step5Storyboard script={finalScript} avatar={avatar} businessInfo={businessInfo} storyboard={storyboard} setStoryboard={setStoryboard} onNext={() => setCurrentStep(6)} onBack={() => setCurrentStep(4)} aspectRatio={aspectRatio} language={language} />}
                {currentStep === 6 && <Step6Thumbnail script={finalScript} avatar={avatar} businessInfo={businessInfo} aspectRatio={aspectRatio} thumbnailUrl={thumbnailUrl} setThumbnailUrl={setThumbnailUrl} onNext={() => setCurrentStep(7)} onBack={() => setCurrentStep(5)} />}
                {currentStep === 7 && <Step6VideoPrompts storyboard={storyboard} videoPrompts={videoPrompts} setVideoPrompts={setVideoPrompts} onNext={() => setCurrentStep(8)} onBack={() => setCurrentStep(6)} businessInfo={businessInfo} />}
                {currentStep === 8 && <Step7FinalOutput allData={{ clientDetails, businessInfo, finalScript, avatar, storyboard, videoPrompts, thumbnailUrl, aspectRatio }} onRestart={restart} onBack={() => setCurrentStep(7)} onGenerateVideo={() => setActiveModule('generate_video')} />}
            </div>
            </>
            )}
            </main>
        </div>
        </div>
    );
  } else {
    moduleElement = <PlaceholderTool moduleName={activeModule} onBack={() => setActiveModule(null)} />;
  }

  return (
    <ErrorBoundary
      name={`feature:${activeModule ?? 'dashboard'}`}
      resetKey={activeModule ?? 'dashboard'}
      onReset={() => setActiveModule(null)}
      resetLabel="BACK TO COMMAND CENTER"
    >
      {moduleElement}
    </ErrorBoundary>
  );
};

export default App;
