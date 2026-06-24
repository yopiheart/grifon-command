
import React, { useState, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { ChevronLeft, Lightbulb, RotateCw, Mail, Check, Star, Apple, Sparkles } from 'lucide-react';
import { ClientDetails, BusinessInfo, Script, Scene, VideoPrompt, Avatar, CinematicNarrativeScene, SceneBatchEntry } from './types';
import StepIndicator from './components/StepIndicator';
import Step1ClientDetails from './components/Step1ClientDetails';
import Step2BusinessInfo from './components/Step2BusinessInfo';
import Step3AdScript from './components/Step3AdScript';
import Step4Avatar from './components/Step4Avatar';
import Step5Storyboard from './components/Step5Storyboard';
import OneShotAd from './components/OneShotAd';
import LockedVideoPreview from './components/LockedVideoPreview';
import PlanGate from './components/PlanGate';
import type { OneShotSinks } from './hooks/useOneShotGeneration';
import Step6Thumbnail from './components/Step6Thumbnail';
import Step6VideoPrompts from './components/Step6VideoPrompts';
import Step7FinalOutput from './components/Step7FinalOutput';
import { GlassPanel } from './components/ui/GlassPanel';
import { GoldButton } from './components/ui/GoldButton';
import { GrifonMark } from './components/ui/GrifonMark';
import Input from './components/ui/Input';
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
import HookLab from './components/HookLab';
import GenerateVideo from './components/GenerateVideo';
import SignalModulator from './components/SignalModulator';
import InfluencerForge from './components/InfluencerForge';
import LandingPage from './components/LandingPage';
import GrifonPricingPage from './components/GrifonPricingPage';
import CheckoutPage from './components/CheckoutPage';
import TopUpCheckoutPage from './components/TopUpCheckoutPage';
import Billing3dsReturn from './components/Billing3dsReturn';
import BillingSuccess from './components/BillingSuccess';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import RefundPolicy from './components/RefundPolicy';
import Support from './components/Support';
import { toast } from 'sonner';
import {
  getSupabase,
  signInWithProvider,
  type OAuthProvider,
  signUpWithPassword,
  requestPasswordReset,
  resendSignupConfirmation,
  updatePassword,
} from './services/supabaseClient';
import { popIntendedPlan, startCheckout } from './services/billingService';
import { inferAvatarGender } from './utils/voiceSelect';
import { OAUTH_PROVIDERS } from './config/authProviders';
import { RouteVeil, type VeilState } from './components/ui/RouteVeil';
import { QuotaWallModal } from './components/ui/QuotaWallModal';
import { quotaWallStore } from './services/quotaWallStore';
import { useSubscription } from './hooks/useSubscription';
import { nextTier, planAtLeast, type PlanId } from './utils/planGate';
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

type Route = 'landing' | 'pricing' | 'checkout' | 'billing_3ds_return' | 'app' | 'billing_success' | 'terms' | 'privacy' | 'refund' | 'support';

const detectInitialRoute = (): Route => {
  if (typeof window === 'undefined') return 'landing';
  const path = window.location.pathname;
  if (path.startsWith('/billing/3ds-return')) return 'billing_3ds_return';
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
  billing_3ds_return: '/billing/3ds-return',
  app: '/app',
  billing_success: '/billing/success',
  terms: '/terms',
  privacy: '/privacy',
  refund: '/refund',
  support: '/support',
};

const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<Route>(detectInitialRoute);
  // When a legal page is opened from checkout, remember the checkout URL so the
  // "Back to checkout" button can restore it (the checkout draft restores the form).
  const [legalReturnHref, setLegalReturnHref] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBooting, setIsBooting] = useState(false);

  // Quota-wall: published by the transport layer (proxyCall) when a metered
  // generation hits the user's monthly plan allowance (HTTP 402). Rendered once
  // at the app root so any module/wizard step triggers it without prop drilling.
  const quotaWall = useSyncExternalStore(quotaWallStore.subscribe, quotaWallStore.getSnapshot);
  const { billing_cycle, plan_id, loading: subLoading } = useSubscription();
  // Slice 5 — gate a graduated module's RENDER behind a plan tier, with the
  // grifon_dev_unlock bypass. Catches direct access (e.g. the video→AI-editor
  // hand-off), not just the Dashboard tile. Server stays authoritative for the
  // underlying AI calls.
  const devUnlocked = typeof localStorage !== 'undefined' && localStorage.getItem('grifon_dev_unlock') === '1';
  const gateModule = (node: React.ReactNode, requires: Exclude<PlanId, 'free'>, featureName: string): React.ReactNode =>
    devUnlocked
      ? node
      : (
        <PlanGate requires={requires} featureName={featureName} onBack={() => setActiveModule(null)} onUpgrade={() => { setActiveModule(null); setCurrentRoute('pricing'); }}>
          {node}
        </PlanGate>
      );
  const [bootLine, setBootLine] = useState(0);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirm, setAuthConfirm] = useState('');
  const [authError, setAuthError] = useState('');
  // Default to sign_up: most unauthenticated arrivals come from a START FREE CTA.
  // Returning users are one tap away, and Google OAuth handles both modes anyway.
  const [authMode, setAuthMode] = useState<'sign_in' | 'sign_up' | 'forgot' | 'check_email' | 'reset_password'>('sign_up');
  const [authNotice, setAuthNotice] = useState('');
  const [pendingSignUpEmail, setPendingSignUpEmail] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  // Deep-link target tab when routing into Signal Modulator (e.g. One-Shot's
  // "Clone your own voice" → the Voice Cloning tab).
  const [signalInitialTile, setSignalInitialTile] = useState<'tts' | 'vc' | 'clone' | 'scene-pipeline' | undefined>(undefined);
  const [directorNudgeDismissed, setDirectorNudgeDismissed] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  // Director AI entry mode: one-shot (default — auto-generate the whole ad) vs
  // the preserved 8-step wizard ('steps', advanced/Director mode). Slice 4 gates
  // 'steps' to Business.
  const [directorMode, setDirectorMode] = useState<'oneshot' | 'steps'>('oneshot');
  const [clientDetails, setClientDetails] = useState<ClientDetails>({ brandName: '', offer: '' });
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    product: '',
    audience: '',
    benefit: '',
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
  const avatarGender = useMemo(() => inferAvatarGender(avatar), [avatar]);
  const [storyboard, setStoryboard] = useState<Scene[]>([]);
  const [videoPrompts, setVideoPrompts] = useState<VideoPrompt[]>([]);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [cinematicNarrative, setCinematicNarrative] = useState<CinematicNarrativeScene[] | null>(null);
  const [cinematicFrameMap, setCinematicFrameMap] = useState<Record<string, string>>({});
  // Phase 5 v2 — Scene Pipeline batch voice generation. Populated by Generate
  // Video's "// SEND TO SIGNAL MODULATOR ↗" button after RENDER ALL completes;
  // consumed by Signal Modulator's Scene Pipeline tile (auto-selects when
  // sceneBatch.length > 0).
  const [sceneBatch, setSceneBatch] = useState<SceneBatchEntry[]>([]);
  // Phase 1 half (a) — Remotion AI Editor handoff. Populated by Signal
  // Modulator's "Send to AI Editor →" button after the Scene Pipeline batch
  // completes; consumed by EditVideo's "From Render Batch" mode to call the
  // (currently stubbed) generateEditDecisionList brain.
  const [editorBatch, setEditorBatch] = useState<{
    sceneBatch: SceneBatchEntry[];
    audioOverlays: { sceneIdx: number; audioUrl: string }[];
    aspectRatio: '9:16' | '16:9' | '1:1';
    finalScript: string;
    offer?: string;
  } | null>(null);
  const [cinematicResult, setCinematicResult] = useState<Scene[] | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [pendingSession, setPendingSession] = useState<WizardSessionV1 | null>(null);
  const [hasRestored, setHasRestored] = useState(false);
  const saveErrorToastedRef = useRef(false);
  const [marketMindLoadedAvatar, setMarketMindLoadedAvatar] = useState<string | null>(null);
  const [prefillSource, setPrefillSource] = useState<'marketResearch' | 'offerOptimizer' | null>(null);
  const [directorAngleBrief, setDirectorAngleBrief] = useState<string | null>(null);

  // When the user swaps script formula on Step 2, dump downstream caches that depend on the script.
  // Without this, going Step 2 → swap formula → Step 5 still shows the old MrBeast scenes (stale cache).
  // Preserves: clientDetails, businessInfo, aspectRatio, avatar (formula-agnostic).
  const prevScriptTypeRef = useRef<BusinessInfo['scriptType']>(businessInfo.scriptType);
  useEffect(() => {
    if (prevScriptTypeRef.current && prevScriptTypeRef.current !== businessInfo.scriptType) {
      setScript(null);
      setFinalScript([]);
      setStoryboard([]);
      setVideoPrompts([]);
      setThumbnailUrl(null);
    }
    prevScriptTypeRef.current = businessInfo.scriptType;
  }, [businessInfo.scriptType]);

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

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session?.user) {
        // Recovery session is valid but we don't want to land them on the
        // dashboard — push them to the reset_password form and keep
        // isAuthenticated false until they actually set a new password.
        setAuthMode('reset_password');
        setAuthEmail(session.user.email ?? '');
        setAuthError('');
        setAuthNotice('');
        if (typeof window !== 'undefined' && window.location.hash) {
          window.history.replaceState({}, '', window.location.pathname + window.location.search);
        }
        return;
      }
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

  // Auto-prefill Director AI wizard from MarketMind / Offer Optimizer.
  // Intent-based: fires only when the user clicked SEND TO DIRECTOR AI in those modules
  // (which writes `grifon_pendingAutofill` to localStorage). Survives stale wizard state —
  // we don't gate on "pristine wizard" anymore, because the click itself is the intent.
  useEffect(() => {
    if (activeModule !== 'creative_director') return;
    if (!hasRestored) return;
    if (pendingSession) return;
    const flag = localStorage.getItem('grifon_pendingAutofill');
    if (flag !== 'marketResearch') return;
    const tsRaw = localStorage.getItem('grifon_pendingAutofillTs');
    const tsAgeMs = tsRaw ? Date.now() - Number(tsRaw) : Infinity;
    if (tsAgeMs > 10 * 60 * 1000) {
      localStorage.removeItem('grifon_pendingAutofill');
      localStorage.removeItem('grifon_pendingAutofillTs');
      return;
    }
    const savedReport = localStorage.getItem('marketMindReport');
    if (!savedReport) return;
    try {
      const r = JSON.parse(savedReport);
      if (!r || typeof r !== 'object' || !r.subject) return;
      // Defensive coercion: Gemini occasionally returns scalar fields as objects
      // despite the TUNED schema saying string. Skip object-shaped values rather
      // than letting them stringify to "[object Object]" in the prefilled UI.
      const safeStr = (v: unknown): string => (typeof v === 'string' ? v : '');
      const avatar = safeStr(r.winningAvatar);
      const demo = safeStr(r.demographics);
      // The Big Idea (r.bigIdea) is a marketing thesis, not the user's actual offer —
      // Filipino SMB users come with their own working offer/promo, so we carry the
      // user-typed brandName/priceOffer forward via the sidecar instead. We also read
      // isLocalService here to smart-default the Step 2 Product/Service gate.
      let userInputs: { brandName?: string; priceOffer?: string; isLocalService?: boolean } = {};
      try {
        const raw = localStorage.getItem('marketMindUserInputs');
        if (raw) userInputs = JSON.parse(raw);
      } catch {
        // Legacy report saved before sidecar existed — autofill leaves these fields empty.
      }
      setBusinessInfo(prev => ({
        ...prev,
        product: prev.product || safeStr(r.subject),
        audience: prev.audience || `${avatar} — ${demo}`.trim().replace(/^—\s*/, ''),
        painPoint: prev.painPoint || safeStr(r.bleedingNeck),
        benefit: prev.benefit || safeStr(r.magicGenie),
        separator: prev.separator || safeStr(r.contrarianTruth) || safeStr(r.villain),
        features: prev.features || safeStr(r.bigIdea),
        // Smart-default the business-type gate; if a local service, also pre-select the
        // Services style. User can override both via the Step 2 toggle. Never clobber a
        // prior choice (re-entry / resumed draft).
        businessType: prev.businessType ?? (userInputs.isLocalService ? 'service' : 'product'),
        scriptType: prev.businessType ? prev.scriptType
          : userInputs.isLocalService ? 'Services'
          : prev.scriptType,
      }));
      setClientDetails(prev => ({
        ...prev,
        brandName: prev.brandName || userInputs.brandName || '',
        offer: prev.offer || userInputs.priceOffer || '',
      }));
      setMarketMindLoadedAvatar(r.winningAvatar || null);
      setPrefillSource('marketResearch');
      setCurrentStep(1);
      localStorage.removeItem('grifon_pendingAutofill');
      localStorage.removeItem('grifon_pendingAutofillTs');
    } catch {
      // Legacy string blob — no auto-prefill, user can still manually fill.
    }
  }, [activeModule, hasRestored, pendingSession]);

  useEffect(() => {
    if (activeModule !== 'creative_director') return;
    if (!hasRestored) return;
    if (pendingSession) return;
    const flag = localStorage.getItem('grifon_pendingAutofill');
    if (flag !== 'offerOptimizer') return;
    const tsRaw = localStorage.getItem('grifon_pendingAutofillTs');
    const tsAgeMs = tsRaw ? Date.now() - Number(tsRaw) : Infinity;
    if (tsAgeMs > 10 * 60 * 1000) {
      localStorage.removeItem('grifon_pendingAutofill');
      localStorage.removeItem('grifon_pendingAutofillTs');
      return;
    }
    const savedOffer = localStorage.getItem('offerOptimizerResult');
    if (!savedOffer) return;
    try {
      const r = JSON.parse(savedOffer);
      const payload = r?.directorPayload;
      if (!payload || typeof payload !== 'object' || !payload.offer) return;
      setBusinessInfo(prev => ({
        ...prev,
        product: prev.product || payload.productName || '',
        audience: prev.audience || payload.targetAudience || '',
        benefit: prev.benefit || payload.mainBenefit || '',
        painPoint: prev.painPoint || payload.painPoint || '',
        separator: prev.separator || payload.usp || '',
      }));
      setClientDetails(prev => ({
        ...prev,
        brandName: prev.brandName || r?.conversionAssets?.brandName || '',
        offer: prev.offer || payload.offer || '',
      }));
      setPrefillSource('offerOptimizer');
      setCurrentStep(1);
      localStorage.removeItem('grifon_pendingAutofill');
      localStorage.removeItem('grifon_pendingAutofillTs');
    } catch {
      // Malformed JSON — skip prefill, user can still manually fill.
    }
  }, [activeModule, hasRestored, pendingSession]);

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

  const handleOAuthSignIn = async (provider: OAuthProvider) => {
    setAuthError('');
    setIsSigningIn(true);
    try {
      await signInWithProvider(provider);
    } catch (err: any) {
      const label = provider === 'google' ? 'Google' : provider === 'github' ? 'GitHub' : 'Apple';
      setAuthError(err?.message || `${label} sign-in failed.`);
      setIsSigningIn(false);
    }
  };

  const goToAuthMode = (mode: 'sign_in' | 'sign_up' | 'forgot' | 'check_email') => {
    setAuthMode(mode);
    setAuthError('');
    setAuthNotice('');
    if (mode !== 'check_email') {
      setAuthPassword('');
      setAuthConfirm('');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthNotice('');
    const email = authEmail.trim();
    if (authPassword.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }
    if (authPassword !== authConfirm) {
      setAuthError('Passwords do not match.');
      return;
    }
    setIsSigningIn(true);
    try {
      const { hasSession } = await signUpWithPassword(email, authPassword);
      if (hasSession) {
        setIsBooting(true);
      } else {
        setPendingSignUpEmail(email);
        setAuthMode('check_email');
        setAuthPassword('');
        setAuthConfirm('');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Sign-up failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthNotice('');
    const email = authEmail.trim();
    if (!email) {
      setAuthError('Enter an email to recover your account.');
      return;
    }
    setIsSigningIn(true);
    try {
      await requestPasswordReset(email);
      setAuthNotice('Reset link sent. Check your inbox.');
    } catch (err: any) {
      setAuthError(err?.message || 'Could not send reset link.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthNotice('');
    if (!authPassword || authPassword.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }
    setIsSigningIn(true);
    try {
      await updatePassword(authPassword);
      await getSupabase().auth.signOut();
      setAuthPassword('');
      setAuthMode('sign_in');
      setAuthNotice('Password updated. Sign in with your new password.');
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to update password. Try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!pendingSignUpEmail) return;
    setAuthError('');
    setAuthNotice('');
    setIsSigningIn(true);
    try {
      await resendSignupConfirmation(pendingSignUpEmail);
      setAuthNotice('Confirmation link re-sent.');
    } catch (err: any) {
      setAuthError(err?.message || 'Resend failed.');
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
      setAuthConfirm('');
      setAuthError('');
      setAuthNotice('');
      setAuthMode('sign_in');
      setPendingSignUpEmail('');
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
    setDirectorMode('steps'); // resumed work is mid-wizard — keep the step view
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
    setClientDetails({ brandName: '', offer: '' });
    setBusinessInfo({ product: '', audience: '', benefit: '', painPoint: '', separator: '', features: '', productImageUrls: [], productImageDescription: undefined, logoImageUrl: undefined, brandColors: '', scriptType: 'MrBeast' });
    setScript(null);
    setDirectorAngleBrief(null);
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
    setPrefillSource(null);
    setMarketMindLoadedAvatar(null);
    setDirectorMode('oneshot'); // a finished/restarted ad returns to the default surface
  };

  const goToLegal = (route: Route) => {
    if (typeof window !== 'undefined' && window.history.replaceState) {
      window.history.replaceState({}, '', ROUTE_PATHS[route]);
    }
    setCurrentRoute(route);
  };

  // Route-transition veil (marketing pages only): cover 0.36s → swap route under
  // the panel → reveal. Skipped under prefers-reduced-motion and while one is
  // already running. The app entry keeps its existing boot sequence instead.
  const [veil, setVeil] = useState<VeilState | null>(null);
  const veilBusy = useRef(false);
  const runVeilTransition = (label: string, commit: () => void) => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || veilBusy.current) {
      commit();
      if (typeof window !== 'undefined') window.scrollTo(0, 0);
      return;
    }
    veilBusy.current = true;
    setVeil({ label });
    window.setTimeout(() => {
      commit();
      window.scrollTo(0, 0);
    }, 380);
    window.setTimeout(() => {
      setVeil(null);
      veilBusy.current = false;
    }, 1000);
  };
  const veilToLegal = (route: 'terms' | 'privacy' | 'refund' | 'support') => {
    const labels = {
      terms: '// TERMS_OF_SERVICE',
      privacy: '// PRIVACY_POLICY',
      refund: '// REFUND_POLICY',
      support: '// SUPPORT',
    } as const;
    runVeilTransition(labels[route], () => goToLegal(route));
  };

  // Open a legal page from checkout, remembering the exact checkout URL (incl. ?plan=&cycle=)
  // so we can return the buyer to it with their entries intact.
  const handleViewLegal = (route: 'terms' | 'privacy') => {
    if (typeof window !== 'undefined') {
      setLegalReturnHref(window.location.pathname + window.location.search);
    }
    goToLegal(route);
  };

  // Back button on a legal page: return to checkout if we came from there, else landing.
  const handleLegalBack = () => {
    if (legalReturnHref) {
      if (typeof window !== 'undefined' && window.history.replaceState) {
        window.history.replaceState({}, '', legalReturnHref);
      }
      setLegalReturnHref(null);
      setCurrentRoute('checkout');
    } else {
      runVeilTransition('// GRIFON COMMAND', () => goToLegal('landing'));
    }
  };

  if (currentRoute === 'billing_success') {
    return (
      <ErrorBoundary
        name="route:billing_success"
        resetKey={currentRoute}
        onReset={() => setCurrentRoute('app')}
        resetLabel="CONTINUE TO APP"
      >
        <BillingSuccess onContinue={() => setCurrentRoute('app')} email={userEmail} />
      </ErrorBoundary>
    );
  }

  if (currentRoute === 'landing') {
    return (
      <ErrorBoundary name="route:landing" resetKey={currentRoute} resetLabel="RETRY">
        <LandingPage
          onEnterApp={() => setCurrentRoute('app')}
          onNavigatePricing={() => runVeilTransition('// PREPARING YOUR PLANS', () => setCurrentRoute('pricing'))}
          onNavigateLegal={veilToLegal}
          isAuthenticated={isAuthenticated}
        />
        <RouteVeil veil={veil} />
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
          onNavigateHome={() => runVeilTransition('// GRIFON COMMAND', () => setCurrentRoute('landing'))}
          onNavigateLegal={veilToLegal}
        />
        <RouteVeil veil={veil} />
      </ErrorBoundary>
    );
  }

  if (currentRoute === 'checkout') {
    // A ?topup=<id> query routes to the standalone credit purchase (no plan);
    // everything else is the subscription checkout.
    const isTopupCheckout = new URLSearchParams(window.location.search).has('topup');
    return (
      <ErrorBoundary
        name="route:checkout"
        resetKey={currentRoute}
        onReset={() => setCurrentRoute('pricing')}
        resetLabel="BACK TO PRICING"
      >
        {isTopupCheckout ? (
          <TopUpCheckoutPage email={userEmail} onBack={() => setCurrentRoute('app')} onViewLegal={handleViewLegal} />
        ) : (
          <CheckoutPage email={userEmail} onBack={() => setCurrentRoute('pricing')} onViewLegal={handleViewLegal} />
        )}
      </ErrorBoundary>
    );
  }

  if (currentRoute === 'billing_3ds_return') {
    return (
      <ErrorBoundary
        name="route:billing_3ds_return"
        resetKey={currentRoute}
        onReset={() => setCurrentRoute('checkout')}
        resetLabel="BACK TO CHECKOUT"
      >
        <Billing3dsReturn
          onContinue={() => setCurrentRoute('app')}
          onRetry={() => setCurrentRoute('checkout')}
        />
      </ErrorBoundary>
    );
  }

  if (currentRoute === 'terms') {
    return (
      <ErrorBoundary name="route:terms" resetKey={currentRoute} onReset={() => goToLegal('landing')} resetLabel="BACK TO LANDING">
        <TermsOfService onBack={handleLegalBack} backLabel={legalReturnHref ? 'Back to checkout' : 'Back'} />
        <RouteVeil veil={veil} />
      </ErrorBoundary>
    );
  }

  if (currentRoute === 'privacy') {
    return (
      <ErrorBoundary name="route:privacy" resetKey={currentRoute} onReset={() => goToLegal('landing')} resetLabel="BACK TO LANDING">
        <PrivacyPolicy onBack={handleLegalBack} backLabel={legalReturnHref ? 'Back to checkout' : 'Back'} />
        <RouteVeil veil={veil} />
      </ErrorBoundary>
    );
  }

  if (currentRoute === 'refund') {
    return (
      <ErrorBoundary name="route:refund" resetKey={currentRoute} onReset={() => goToLegal('landing')} resetLabel="BACK TO LANDING">
        <RefundPolicy onBack={() => runVeilTransition('// GRIFON COMMAND', () => goToLegal('landing'))} />
        <RouteVeil veil={veil} />
      </ErrorBoundary>
    );
  }

  if (currentRoute === 'support') {
    return (
      <ErrorBoundary name="route:support" resetKey={currentRoute} onReset={() => goToLegal('landing')} resetLabel="BACK TO LANDING">
        <Support onBack={() => runVeilTransition('// GRIFON COMMAND', () => goToLegal('landing'))} />
        <RouteVeil veil={veil} />
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
        {/* Cinematic backdrop — CSS-only HUD gradient (no image weight). */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {/* Primary gold glow — top-right, stationary */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 55% 45% at 82% 18%, rgba(255,204,0,0.20), transparent 65%)',
            }}
          />
          {/* Secondary gold glow — bottom-left, gentle 6s breathe */}
          <div
            className="absolute inset-0 animate-pulse"
            style={{
              background:
                'radial-gradient(ellipse 48% 38% at 12% 88%, rgba(255,204,0,0.13), transparent 65%)',
              animationDuration: '6s',
            }}
          />
          {/* Dim neural dot-grid — quieter than before, still on-brand */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: 'radial-gradient(#FFCC00 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          {/* Horizontal scan lines — terminal/HUD signature */}
          <div
            className="absolute inset-0 opacity-[0.045]"
            style={{
              background:
                'repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)',
            }}
          />
          {/* Vertical edge vignette — frames the panel without cropping */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/60 via-transparent to-zinc-950/80" />
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
          <div className="relative z-10 w-full flex flex-col items-center">
            {/* Compact header — the whole gateway must fit one phone screen without scrolling */}
            <div className="mb-2 md:mb-6 text-center flex flex-col items-center">
              <div className="mb-1 md:mb-3 flex items-center gap-2.5">
                <GrifonMark className="h-8 w-8 md:h-14 md:w-14" />
                <h1 className="text-2xl md:text-4xl font-[900] italic text-white uppercase tracking-tighter">
                  GRIFON
                </h1>
              </div>
              {/* Outcome-first gateway copy — what the visitor GETS, not what the engine does */}
              <h2 className="text-sm md:text-lg font-bold uppercase tracking-tight text-zinc-200 mb-1">
                YOUR FIRST AD IS{' '}
                <span className="font-serif italic normal-case tracking-normal text-[#FFCC00]">30 minutes</span>{' '}
                AWAY.
              </h2>
              <p className="auth-compact-hide text-[9px] md:text-[10px] font-mono text-zinc-500 tracking-[0.3em] uppercase flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-[#FFCC00] animate-pulse shadow-[0_0_6px_rgba(255,204,0,0.8)]" aria-hidden="true" />
                // FREE PLAN — NO CREDIT CARD NEEDED
              </p>
            </div>

            <GlassPanel className="relative w-full max-w-md p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Terminal-frame hairlines — gold HUD corners */}
                <span aria-hidden="true" className="pointer-events-none absolute top-0 left-0 w-3 h-px bg-[#FFCC00]/60" />
                <span aria-hidden="true" className="pointer-events-none absolute top-0 left-0 w-px h-3 bg-[#FFCC00]/60" />
                <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 w-3 h-px bg-[#FFCC00]/60" />
                <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 w-px h-3 bg-[#FFCC00]/60" />
                <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 w-3 h-px bg-[#FFCC00]/60" />
                <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 w-px h-3 bg-[#FFCC00]/60" />
                <span aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 w-3 h-px bg-[#FFCC00]/60" />
                <span aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 w-px h-3 bg-[#FFCC00]/60" />
                {(authMode === 'sign_in' || authMode === 'sign_up') && (
                  <div className="grid grid-cols-2 mb-4 md:mb-6 -mt-1">
                    <button
                      type="button"
                      onClick={() => goToAuthMode('sign_up')}
                      className={`pb-3 text-[10px] font-mono uppercase tracking-widest transition-all border-b-2 ${
                        authMode === 'sign_up'
                          ? 'text-white border-[#FFCC00]'
                          : 'text-zinc-500 border-white/10 hover:text-white'
                      }`}
                    >
                      // START_FREE
                    </button>
                    <button
                      type="button"
                      onClick={() => goToAuthMode('sign_in')}
                      className={`pb-3 text-[10px] font-mono uppercase tracking-widest transition-all border-b-2 ${
                        authMode === 'sign_in'
                          ? 'text-white border-[#FFCC00]'
                          : 'text-zinc-500 border-white/10 hover:text-white'
                      }`}
                    >
                      // SIGN_IN
                    </button>
                  </div>
                )}

                {(authMode === 'sign_in' || authMode === 'sign_up') && (
                  <>
                    {OAUTH_PROVIDERS.google && (
                      <button
                        type="button"
                        onClick={() => handleOAuthSignIn('google')}
                        disabled={isSigningIn}
                        className="w-full flex items-center justify-center gap-3 py-3 md:py-4 px-6 bg-zinc-950 border border-white/15 hover:border-[#FFCC00]/50 hover:bg-zinc-900 text-white font-medium text-sm rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-2.5 md:mb-3"
                      >
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                          <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
                          <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                          <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                        </svg>
                        {isSigningIn ? 'Connecting...' : 'Continue with Google'}
                      </button>
                    )}
                    {(OAUTH_PROVIDERS.github || OAUTH_PROVIDERS.apple) && (
                      <div className="grid grid-cols-2 gap-2.5 mb-4 md:mb-6">
                        {OAUTH_PROVIDERS.github && (
                          <button
                            type="button"
                            onClick={() => handleOAuthSignIn('github')}
                            disabled={isSigningIn}
                            className={`flex items-center justify-center gap-2.5 py-3 px-4 bg-zinc-950 border border-white/15 hover:border-[#FFCC00]/50 hover:bg-zinc-900 text-white font-medium text-sm rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${!OAUTH_PROVIDERS.apple ? 'col-span-2' : ''}`}
                          >
                            {/* Canonical GitHub octicon (mark-github) — lucide dropped brand icons */}
                            <svg className="w-5 h-5 shrink-0" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
                            </svg>
                            GitHub
                          </button>
                        )}
                        {OAUTH_PROVIDERS.apple && (
                          <button
                            type="button"
                            onClick={() => handleOAuthSignIn('apple')}
                            disabled={isSigningIn}
                            className={`flex items-center justify-center gap-2.5 py-3 px-4 bg-zinc-950 border border-white/15 hover:border-[#FFCC00]/50 hover:bg-zinc-900 text-white font-medium text-sm rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${!OAUTH_PROVIDERS.github ? 'col-span-2' : ''}`}
                          >
                            <Apple className="w-5 h-5 shrink-0" aria-hidden="true" />
                            Apple
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-4 md:mb-6">
                      <div className="flex-1 border-t border-white/10"></div>
                      <span className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">OR CONTINUE WITH EMAIL</span>
                      <div className="flex-1 border-t border-white/10"></div>
                    </div>
                  </>
                )}

                {authMode === 'sign_in' && (
                  <form onSubmit={handleLogin} className="space-y-4 md:space-y-6">
                    <Input
                      id="auth-email"
                      type="email"
                      label="EMAIL"
                      placeholder="your@email.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      required
                    />
                    <div>
                      <Input
                        id="auth-password"
                        type="password"
                        label="PASSWORD"
                        placeholder="Your password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        required
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => goToAuthMode('forgot')}
                          className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest hover:text-[#FFCC00] transition-colors"
                        >
                          // FORGOT_PASSWORD?
                        </button>
                      </div>
                    </div>
                    {authError && (
                      <p className="text-red-500 text-sm font-mono text-center border border-red-900/50 bg-red-900/20 p-2 rounded-xl">{authError}</p>
                    )}
                    {authNotice && (
                      <p className="text-[#FFCC00] text-sm font-mono text-center border border-yellow-900/40 bg-yellow-900/10 p-2 rounded-xl">{authNotice}</p>
                    )}
                    <GoldButton type="submit" className="w-full justify-center py-4" disabled={isSigningIn}>
                      {isSigningIn ? 'SIGNING IN...' : 'SIGN IN'}
                    </GoldButton>
                  </form>
                )}

                {authMode === 'sign_up' && (
                  <form onSubmit={handleSignUp} className="space-y-3 md:space-y-5">
                    {/* Free-plan claims mirror the pricing page — no invented numbers */}
                    <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 -mt-1 text-[10px] md:text-xs text-zinc-400 whitespace-nowrap">
                      <span className="flex items-center gap-1"><Check className="w-3 h-3 shrink-0 text-[#FFCC00]" strokeWidth={2.5} /> 3 free ad workflows/mo</span>
                      <span className="flex items-center gap-1"><Check className="w-3 h-3 shrink-0 text-[#FFCC00]" strokeWidth={2.5} /> No credit card</span>
                      <span className="flex items-center gap-1"><Check className="w-3 h-3 shrink-0 text-[#FFCC00]" strokeWidth={2.5} /> Cancel anytime</span>
                    </div>
                    <Input
                      id="signup-email"
                      type="email"
                      label="EMAIL"
                      placeholder="your@email.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      required
                    />
                    <Input
                      id="signup-password"
                      type="password"
                      label="PASSWORD (MIN 8 CHARS)"
                      placeholder="Create a password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <Input
                      id="signup-confirm"
                      type="password"
                      label="CONFIRM_PASSWORD"
                      placeholder="Repeat password"
                      value={authConfirm}
                      onChange={(e) => setAuthConfirm(e.target.value)}
                      required
                      minLength={8}
                    />
                    {authError && (
                      <p className="text-red-500 text-sm font-mono text-center border border-red-900/50 bg-red-900/20 p-2 rounded-xl">{authError}</p>
                    )}
                    <GoldButton type="submit" className="w-full justify-center py-3 md:py-4" disabled={isSigningIn}>
                      {isSigningIn ? 'CREATING ACCOUNT...' : 'CREATE MY FREE ACCOUNT'}
                    </GoldButton>
                  </form>
                )}

                {authMode === 'forgot' && (
                  <>
                    <div className="text-center mb-6">
                      <p className="text-[10px] font-mono text-[#FFCC00] tracking-[0.4em] uppercase mb-3">// KEY_RECOVERY</p>
                      <p className="text-sm text-zinc-400 font-mono leading-relaxed">
                        Send a password reset link to your registered email.
                      </p>
                    </div>
                    <form onSubmit={handleForgotPassword} className="space-y-6">
                      <Input
                        id="forgot-email"
                        type="email"
                        label="EMAIL"
                        placeholder="your@email.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        required
                      />
                      {authError && (
                        <p className="text-red-500 text-sm font-mono text-center border border-red-900/50 bg-red-900/20 p-2 rounded-xl">{authError}</p>
                      )}
                      {authNotice && (
                        <p className="text-[#FFCC00] text-sm font-mono text-center border border-yellow-900/40 bg-yellow-900/10 p-2 rounded-xl">{authNotice}</p>
                      )}
                      <GoldButton type="submit" className="w-full justify-center py-4" disabled={isSigningIn}>
                        {isSigningIn ? 'SENDING...' : 'SEND RESET LINK'}
                      </GoldButton>
                    </form>
                    <div className="mt-6 text-center">
                      <button
                        type="button"
                        onClick={() => goToAuthMode('sign_in')}
                        className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest hover:text-[#FFCC00] transition-colors"
                      >
                        // BACK_TO_TERMINAL
                      </button>
                    </div>
                  </>
                )}

                {authMode === 'reset_password' && (
                  <>
                    <div className="text-center mb-6">
                      <p className="text-[10px] font-mono text-[#FFCC00] tracking-[0.4em] uppercase mb-3">// SET_NEW_PASSWORD</p>
                      <p className="text-sm text-zinc-400 font-mono leading-relaxed">
                        Choose a new password to finish recovery.
                      </p>
                    </div>
                    <form onSubmit={handleResetPassword} className="space-y-6">
                      <Input
                        id="reset-password"
                        type="password"
                        label="NEW PASSWORD"
                        placeholder="At least 8 characters"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                      {authError && (
                        <p className="text-red-500 text-sm font-mono text-center border border-red-900/50 bg-red-900/20 p-2 rounded-xl">{authError}</p>
                      )}
                      <GoldButton type="submit" className="w-full justify-center py-4" disabled={isSigningIn}>
                        {isSigningIn ? 'UPDATING...' : 'UPDATE PASSWORD'}
                      </GoldButton>
                    </form>
                  </>
                )}

                {authMode === 'check_email' && (
                  <div className="text-center space-y-5 py-2">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-full border border-[#FFCC00]/40 bg-[#FFCC00]/10 flex items-center justify-center shadow-[0_0_20px_rgba(255,204,0,0.25)]">
                        <Mail className="w-6 h-6 text-[#FFCC00]" />
                      </div>
                      <p className="text-[10px] font-mono text-[#FFCC00] tracking-[0.4em] uppercase">// TRANSMISSION_SENT</p>
                    </div>
                    <p className="text-sm text-zinc-300 font-mono leading-relaxed">
                      A confirmation link has been sent to
                      <span className="block text-white mt-1 break-all">{pendingSignUpEmail}</span>
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                      Click the link inside to activate your account.
                    </p>
                    {authError && (
                      <p className="text-red-500 text-sm font-mono border border-red-900/50 bg-red-900/20 p-2 rounded-xl">{authError}</p>
                    )}
                    {authNotice && (
                      <p className="text-[#FFCC00] text-sm font-mono border border-yellow-900/40 bg-yellow-900/10 p-2 rounded-xl">{authNotice}</p>
                    )}
                    <div className="flex flex-col gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest hover:text-[#FFCC00] transition-colors disabled:opacity-50"
                        disabled={isSigningIn}
                      >
                        {isSigningIn ? '// RESENDING...' : '// RESEND_LINK'}
                      </button>
                      <button
                        type="button"
                        onClick={() => goToAuthMode('sign_in')}
                        className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest hover:text-[#FFCC00] transition-colors"
                      >
                        // BACK_TO_TERMINAL
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-3 md:mt-8 pt-3 md:pt-4 border-t border-white/10 flex flex-col items-center gap-1.5 md:gap-3">
                  {/* Same trust claim as the pricing page social-proof pill — stars stacked above */}
                  <div className="auth-compact-hide flex flex-col items-center gap-1.5 text-xs text-zinc-400 text-center">
                    <span className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-3.5 h-3.5 shrink-0" strokeWidth={0} fill="#FFCC00" />
                      ))}
                    </span>
                    Trusted by 100+ Filipino business owners
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                    <button type="button" onClick={() => goToLegal('terms')} className="hover:text-[#FFCC00] transition-colors">TERMS</button>
                    <span className="text-zinc-700">·</span>
                    <button type="button" onClick={() => goToLegal('privacy')} className="hover:text-[#FFCC00] transition-colors">PRIVACY</button>
                    <span className="text-zinc-700">·</span>
                    <button type="button" onClick={() => goToLegal('refund')} className="hover:text-[#FFCC00] transition-colors">REFUND</button>
                    <span className="text-zinc-700">·</span>
                    <button type="button" onClick={() => goToLegal('support')} className="hover:text-[#FFCC00] transition-colors">SUPPORT</button>
                  </div>
                  <p className="hidden md:block text-[10px] font-mono text-zinc-600 tracking-[0.4em] uppercase">// SESSION_ENCRYPTED</p>
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
    moduleElement = <Dashboard onSelectModule={setActiveModule} activeModule={activeModule} userEmail={userEmail} userId={userId} onLogout={handleLogout} onUpgrade={() => setCurrentRoute('pricing')} />;
  } else if (activeModule === 'generate_video') {
    // Slice 3 — video is metered per FINISHED AD. Starter+ render (1/8/15 ads);
    // Free renders 0 and instead lands on the LockedVideoPreview upsell at the
    // hand-off. Server stays authoritative (meterVideoRequest); this is the UX
    // gate. PlanGate is bypassed here so Free gets the tailored upsell, not the
    // generic lock screen.
    if (subLoading) {
      moduleElement = <div className="min-h-screen bg-zinc-950" />;
    } else if (plan_id === 'free') {
      moduleElement = (
        <LockedVideoPreview
          onBack={() => setActiveModule(null)}
          onUpgrade={() => { setActiveModule(null); setCurrentRoute('pricing'); }}
          onBuyTopup={() => { window.location.href = '/checkout?topup=video_ad_single'; }}
          thumbnailUrl={thumbnailUrl}
          previewImageUrl={storyboard[0]?.imageUrl}
        />
      );
    } else {
      moduleElement = (
        <GenerateVideo
          onBack={() => setActiveModule(null)}
          seedPrompts={videoPrompts}
          storyboard={storyboard}
          defaultAspectRatio={aspectRatio ?? '9:16'}
          onSendToAiEditor={(batch) => {
            // Default path — skip Signal Modulator's redundant TTS pass. The AI
            // Editor consolidates voice once (audioOverlays unused, so []).
            setSceneBatch(batch);
            setEditorBatch({
              sceneBatch: batch,
              audioOverlays: [],
              aspectRatio: aspectRatio ?? '9:16',
              finalScript: finalScript.join(' '),
              offer: clientDetails.offer,
            });
            setActiveModule('edit_video');
          }}
          onSendToSignalModulator={(batch) => {
            setSceneBatch(batch);
            setActiveModule('signal_modulator');
          }}
        />
      );
    }
  } else if (activeModule === 'signal_modulator') {
    moduleElement = gateModule((
      <SignalModulator
        onBack={() => {
          setSceneBatch([]);
          setSignalInitialTile(undefined);
          setActiveModule(null);
        }}
        globalScript={finalScript}
        sceneBatch={sceneBatch}
        avatarGender={avatarGender}
        initialTile={signalInitialTile}
        onSendToAiEditor={(audioOverlays) => {
          setEditorBatch({
            sceneBatch,
            audioOverlays,
            aspectRatio: aspectRatio ?? '9:16',
            finalScript: finalScript.join(' '),
            offer: clientDetails.offer,
          });
          setActiveModule('edit_video');
        }}
      />
    ), 'pro', 'Voice Studio');
  } else if (activeModule === 'influencer_forge') {
    moduleElement = <InfluencerForge onBack={() => setActiveModule(null)} ethnicity={avatar?.ethnicity} />;
  } else if (activeModule === 'cinematic_studio') {
    moduleElement = gateModule(<CinematicSpecStudio onBack={() => setActiveModule(null)} onNavigate={setActiveModule} businessInfo={businessInfo} narrative={cinematicNarrative} setNarrative={setCinematicNarrative} frameMap={cinematicFrameMap} setFrameMap={setCinematicFrameMap} result={cinematicResult} setResult={setCinematicResult} />, 'business', 'Commercial & Cinematic Studio');
  } else if (activeModule === 'market_research') {
    moduleElement = <MarketResearch onBack={() => setActiveModule(null)} onNavigate={setActiveModule} />;
  } else if (activeModule === 'offer_optimizer') {
    moduleElement = <OfferOptimizer onBack={() => setActiveModule(null)} onNavigate={setActiveModule} />;
  } else if (activeModule === 'edit_video') {
    moduleElement = gateModule((
      <EditVideo
        onBack={() => {
          setEditorBatch(null);
          setActiveModule(null);
        }}
        editorBatch={editorBatch}
        avatarGender={avatarGender}
      />
    ), 'pro', 'AI Video Editor');
  } else if (activeModule === 'image_editor') {
    moduleElement = <ImageEditor onBack={() => setActiveModule(null)} ethnicity={avatar?.ethnicity} />;
  } else if (activeModule === 'caption_headline') {
    moduleElement = <CaptionHeadline onBack={() => setActiveModule(null)} />;
  } else if (activeModule === 'organic_calendar') {
    moduleElement = <OrganicCalendar businessInfo={businessInfo} avatar={avatar} clientDetails={clientDetails} onBack={() => setActiveModule(null)} />;
  } else if (activeModule === 'image_ads') {
    moduleElement = <ImageAdsGen businessInfo={businessInfo} avatar={avatar} clientDetails={clientDetails} onBack={() => setActiveModule(null)} />;
  } else if (activeModule === 'hook_lab') {
    moduleElement = <HookLab businessInfo={businessInfo} onBack={() => setActiveModule(null)} />;
  } else if (activeModule === 'creative_director') {
    const hasRunResearch = !!localStorage.getItem('marketMindReport');
    const wizardPristine = currentStep === 1 && !clientDetails.brandName && !businessInfo.product && script === null;
    const showResumePill = !isLoadingSession && pendingSession !== null && !hasRestored && wizardPristine;
    const showNudge = !hasRunResearch && !directorNudgeDismissed && !showResumePill;
    const showLoadedConfirmation = hasRunResearch && marketMindLoadedAvatar && !showResumePill;
    // One-shot is the default surface; a pending step session forces steps mode
    // so the user can resume where they left off.
    const showOneShot = directorMode === 'oneshot' && !showResumePill;
    const oneShotSinks: OneShotSinks = {
      setScript, setFinalScript, setAvatar, setStoryboard, setThumbnailUrl, setVideoPrompts, setLanguage,
    };
    // Slice 4 — Director (step-by-step) mode is a Pro+ unlock ("control every
    // scene"). Free/Starter ride the one-shot only. `grifon_dev_unlock` flips it
    // on for dev/Neil on any account (console: localStorage.grifon_dev_unlock='1').
    const devUnlock = typeof localStorage !== 'undefined' && localStorage.getItem('grifon_dev_unlock') === '1';
    const directorUnlocked = devUnlock || planAtLeast(plan_id, 'pro');

    if (showOneShot) {
      // One-Shot Ad — full-screen intake → research → generate → Step 8 review.
      moduleElement = (
        <OneShotAd
          userId={userId}
          sinks={oneShotSinks}
          setClientDetails={setClientDetails}
          setBusinessInfo={setBusinessInfo}
          setAspectRatio={setAspectRatio}
          directorUnlocked={directorUnlocked}
          onBack={() => setActiveModule(null)}
          onUpgrade={() => { setActiveModule(null); setCurrentRoute('pricing'); }}
          onSwitchToSteps={() => { setDirectorMode('steps'); setCurrentStep(1); }}
          onCloneVoice={() => { setSignalInitialTile('clone'); setActiveModule('signal_modulator'); }}
          onReview={() => { setDirectorMode('steps'); setCurrentStep(8); }}
        />
      );
    } else {
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

            {showLoadedConfirmation && (
              <div className="bg-zinc-900 border border-[#FFCC00]/30 rounded-xl p-4 mb-6 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-[#FFCC00] mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">// MARKETMIND_LOADED</h3>
                  <p className="text-xs text-zinc-400">
                    Director AI is targeting <span className="text-[#FFCC00] font-mono">{marketMindLoadedAvatar}</span>. Wizard fields pre-filled from your MarketMind report — edit any to override.
                  </p>
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
            {directorMode === 'steps' && !showResumePill && (
              <button
                onClick={() => setDirectorMode('oneshot')}
                className="mb-6 flex items-center gap-2 text-[10px] font-mono text-zinc-500 hover:text-[#FFCC00] uppercase tracking-widest transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" /> Back to one-shot
              </button>
            )}
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
            {currentStep <= TOTAL_STEPS && <StepIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} onStepClick={(s) => s < currentStep && directorUnlocked && setCurrentStep(s)} />}
            <div className="mt-8">
                {currentStep === 1 && <Step1ClientDetails
                  data={clientDetails}
                  setData={setClientDetails}
                  onNext={() => setCurrentStep(2)}
                  prefilled={prefillSource !== null && !!clientDetails.brandName && !!clientDetails.offer}
                  prefilledFrom={prefillSource}
                />}
                {currentStep === 2 && <Step2BusinessInfo data={businessInfo} setData={setBusinessInfo} onNext={() => setCurrentStep(3)} onBack={() => setCurrentStep(1)} aspectRatio={aspectRatio} setAspectRatio={setAspectRatio} />}
                {currentStep === 3 && <Step3AdScript businessInfo={businessInfo} script={script} setScript={setScript} setFinalScript={setFinalScript} language={language} setLanguage={setLanguage} onNext={() => setCurrentStep(4)} onBack={() => setCurrentStep(2)} brandName={clientDetails.brandName} offer={clientDetails.offer} directorAngleBrief={directorAngleBrief} setDirectorAngleBrief={setDirectorAngleBrief} />}
                {currentStep === 4 && <Step4Avatar businessInfo={businessInfo} avatar={avatar} setAvatar={setAvatar} onNext={() => setCurrentStep(5)} onBack={() => setCurrentStep(3)} aspectRatio={aspectRatio} />}
                {currentStep === 5 && <Step5Storyboard script={finalScript} avatar={avatar} businessInfo={businessInfo} storyboard={storyboard} setStoryboard={setStoryboard} onNext={() => setCurrentStep(6)} onBack={() => setCurrentStep(4)} aspectRatio={aspectRatio} language={language} />}
                {currentStep === 6 && <Step6Thumbnail script={finalScript} avatar={avatar} businessInfo={businessInfo} aspectRatio={aspectRatio} thumbnailUrl={thumbnailUrl} setThumbnailUrl={setThumbnailUrl} onNext={() => setCurrentStep(7)} onBack={() => setCurrentStep(5)} />}
                {currentStep === 7 && <Step6VideoPrompts storyboard={storyboard} videoPrompts={videoPrompts} setVideoPrompts={setVideoPrompts} onNext={() => setCurrentStep(8)} onBack={() => setCurrentStep(6)} businessInfo={businessInfo} />}
                {currentStep === 8 && <Step7FinalOutput allData={{ clientDetails, businessInfo, finalScript, avatar, storyboard, videoPrompts, thumbnailUrl, aspectRatio }} onRestart={restart} onBack={directorUnlocked ? () => setCurrentStep(7) : () => setDirectorMode('oneshot')} onGenerateVideo={() => setActiveModule('generate_video')} />}
            </div>
            </>
            )}
            </main>
        </div>
        </div>
    );
    }
  } else {
    moduleElement = <PlaceholderTool moduleName={activeModule} onBack={() => setActiveModule(null)} />;
  }

  // Quota-wall plan is server-authoritative: the 402 body carries the plan the
  // server actually metered against (quotaWall.plan), so plan + used + limit all
  // come from ONE source. Reading the client useSubscription() value here was a
  // bug — it could resolve to 'free' (default/stale) while the server returned
  // 'pro/15/15', producing a "FREE 15/15 → upgrade to Creator" wall on a Pro acct.
  const wallPlan = quotaWall.plan;
  const wallUpsell = nextTier(wallPlan);

  return (
    <ErrorBoundary
      name={`feature:${activeModule ?? 'dashboard'}`}
      resetKey={activeModule ?? 'dashboard'}
      onReset={() => setActiveModule(null)}
      resetLabel="BACK TO COMMAND CENTER"
    >
      {moduleElement}
      <QuotaWallModal
        open={quotaWall.open}
        scope={quotaWall.scope}
        currentPlan={wallPlan}
        nextPlan={wallUpsell}
        used={quotaWall.used}
        limit={quotaWall.limit}
        onUpgrade={() => {
          if (wallUpsell) startCheckout(wallUpsell, billing_cycle ?? 'monthly');
        }}
        onBuyTopup={(id) => { window.location.href = `/checkout?topup=${id}`; }}
        onDismiss={() => quotaWallStore.dismiss()}
      />
    </ErrorBoundary>
  );
};

export default App;
