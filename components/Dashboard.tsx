import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Film, Search, Target, Type, Image as ImageIcon,
  Settings, Sparkles, ArrowRight, ChevronRight,
  Video, User, Clapperboard, Wand2, Calendar, Scissors, Mic,
  LogOut, HelpCircle, Crown, Zap, X, Flame, Aperture, Lock
} from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { planAtLeast, type PlanId } from '../utils/planGate';
import { useQuota } from '../hooks/useQuota';
import { Aurora } from './ui/Aurora';
import { QuotaMeter } from './ui/QuotaMeter';
import { CommandPalette, type CommandItem } from './ui/CommandPalette';
import { RecentWorkCard } from './ui/RecentWorkCard';
import { loadRecentWork, recordRecentWork, activeDaysThisWeek, type RecentItem } from '../services/recentWorkService';
import { computeUpgradeNudge } from '../config/upgradeNudge';
import { ActiveJobsPanel } from './ui/ActiveJobsPanel';
import { useActiveJobs } from '../hooks/useActiveJobs';
import { useServerRenderJobs } from '../hooks/useServerRenderJobs';
import { OnboardingNudge } from './ui/OnboardingNudge';
import { ResumeDraftCard } from './ui/ResumeDraftCard';
import { SignatureScribble } from './landing/SignatureScribble';
import { getSession, clearSession, type WizardSessionV1 } from '../services/wizardSessionStore';

// Rotating omnibox placeholders — real outcomes, not tool names. The input
// should read like a wish, not a search box.
const OMNIBOX_PROMPTS = [
  'Make a video ad for my milk tea shop…',
  'Research the condo market in Cebu…',
  "Build an offer they can't refuse…",
  'Write 30 Taglish captions for my page…',
  'Turn my product photo into an ad…',
];

const GrifonLogo = ({ className = "h-8 w-auto" }) => (
  <img src="/logo.png" alt="GRIFON Logo" className={`object-contain ${className}`} />
);

const MenuItem = ({ icon, label, hasSubmenu, danger, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors
    ${danger ? 'text-red-400' : 'text-zinc-300'}`}
  >
    <span className="w-4 h-4 flex-shrink-0">{icon}</span>
    <span className="text-sm flex-1 text-left">{label}</span>
    {hasSubmenu && <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />}
  </button>
);

interface DashboardProps {
  onSelectModule: (module: string) => void;
  activeModule?: string | null;
  userEmail?: string | null;
  userId?: string | null;
  onLogout?: () => void;
  onUpgrade?: () => void;
}

const WIZARD_TOTAL_STEPS = 8;

const CORE_MODULES = [
  { id: 'market_research', name: 'Research', icon: Search, desc: 'Know your market, outsmart competitors' },
  { id: 'offer_optimizer', name: 'Offer', icon: Target, desc: "Build an offer they can't refuse" },
  { id: 'caption_headline', name: 'Captions', icon: Type, desc: 'Copy that stops the scroll' }
];

// Director's subtitle is shared across the card blocks and the command palette.
const DIRECTOR_DESC = 'Your finished video ad, start to finish';

// Outcome-named quick-start chips under the command input — deep-link into modules.
const STARTER_CHIPS = [
  { id: 'creative_director', label: 'Make a video ad', icon: Film },
  { id: 'market_research', label: 'Research my market', icon: Search },
  { id: 'offer_optimizer', label: 'Build an offer', icon: Target },
  { id: 'caption_headline', label: 'Write captions', icon: Type },
];

// Action-oriented nav for the left sidebar + mobile bottom nav.
// Director leads — it's the flagship workflow and the most-clicked surface.
// The educational journey (Research → Offer → Director → …) lives on the
// dashboard's RECOMMENDED FLOW path, which intentionally diverges so users
// see both "fastest path to the tool" (nav) and "best practice order" (path).
// Beta items are admin-only-clickable; display-only for non-admin.
const NAV_ITEMS: { id: string; label: string; icon: any; badge?: 'Beta' }[] = [
  { id: 'creative_director', label: 'Director', icon: Film },
  { id: 'market_research',   label: 'Research', icon: Search },
  { id: 'offer_optimizer',   label: 'Offer',    icon: Target },
  { id: 'generate_video',    label: 'Video',    icon: Clapperboard },
  { id: 'signal_modulator',  label: 'Voice',    icon: Mic,         badge: 'Beta' },
  { id: 'edit_video',        label: 'Edit',     icon: Scissors,    badge: 'Beta' },
  { id: 'caption_headline',  label: 'Caption',  icon: Type }
];

// Slice 5 — graduated beta modules and the plan tier that unlocks each. Modules
// NOT listed here stay dev-only (grifon_admin / grifon_dev_unlock). Server stays
// authoritative for the underlying AI calls; this is the access UI.
const MODULE_TIER: Record<string, PlanId> = {
  generate_video: 'starter',   // already starter+ at the render gate (Slice 3)
  edit_video: 'pro',           // AI editor
  signal_modulator: 'pro',     // Voice
  cinematic_studio: 'business', // Commercial/Spec studio
};

const MORE_MODULES = [
  { id: 'hook_lab', name: 'Hook Lab', icon: Aperture, desc: 'Surreal, scroll-stopping opening hooks for your ads.' },
  { id: 'cinematic_studio', name: 'Cinematic Studio', icon: Video, desc: 'High-fidelity video synthesis with custom camera paths and lighting control.' },
  { id: 'influencer_forge', name: 'Influencer Forge', icon: User, desc: 'Generate consistent digital personas for social campaigns and brand storytelling.' },
  { id: 'generate_video', name: 'Video Synthesis', icon: Clapperboard, desc: 'Render final video assets from storyboards and prompts.' },
  { id: 'image_ads', name: 'Ad Creative Gen', icon: Wand2, desc: 'Generate high-converting image ads and variations.' },
  { id: 'image_editor', name: 'Image Editor', icon: ImageIcon, desc: 'AI-generated ad images — in active improvement.' },
  { id: 'organic_calendar', name: 'Social Planner', icon: Calendar, desc: 'Schedule and automate your organic content calendar.' },
  { id: 'edit_video', name: 'Video Editor', icon: Scissors, desc: 'Timeline-based editing, trimming, and assembly.' },
  { id: 'signal_modulator', name: 'Signal Modulator', icon: Mic, desc: 'Voice cloning, TTS, and audio enhancement.' }
];

const Dashboard: React.FC<DashboardProps> = ({ onSelectModule, activeModule, userEmail, userId, onLogout, onUpgrade }) => {
  // ADMIN MODE: To see in-progress modules, two ways:
  //   Desktop (DevTools): localStorage.setItem('grifon_admin', 'true')  → refresh
  //   Mobile or no-DevTools: visit ?admin=on (e.g. grifon.ai/?admin=on)
  // Disable: ?admin=off  or  localStorage.removeItem('grifon_admin')
  // The URL-param toggle lives at the top of App.tsx and runs before React mounts.
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const adminFlag = localStorage.getItem('grifon_admin');
    const devUnlock = localStorage.getItem('grifon_dev_unlock') === '1';
    setIsAdmin(adminFlag === 'true' || devUnlock);
  }, []);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');
  const [bannerUrgency, setBannerUrgency] = useState<'low' | 'final'>('low');
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [onboardingDismissed, setOnboardingDismissed] = useState(true);
  const [draftSession, setDraftSession] = useState<WizardSessionV1 | null>(null);
  const activeJobs = useActiveJobs();
  // Cross-device resume (Phase 4): surface renders fired on another device + ping
  // once for any that finished while away. Best-effort; runs once when logged in.
  useServerRenderJobs(Boolean(userId));
  // Honest weekly-momentum signal — distinct days active in the trailing 7 days.
  // Reflects real return visits only; recomputed whenever the recent feed changes.
  const weeklyActiveDays = useMemo(() => activeDaysThisWeek(), [recent]);

  useEffect(() => {
    const initialRecent = loadRecentWork();
    setRecent(initialRecent);
    const flag = localStorage.getItem('grifon_onboarded') === 'true';
    setOnboardingDismissed(flag || initialRecent.length > 0);
  }, []);

  useEffect(() => {
    if (!userId) {
      setDraftSession(null);
      return;
    }
    let cancelled = false;
    getSession(userId).then(s => {
      if (cancelled) return;
      // Only show resume CTA for an in-progress wizard (not finished, not blank).
      if (s && s.currentStep > 1 && s.currentStep < WIZARD_TOTAL_STEPS) {
        setDraftSession(s);
      } else {
        setDraftSession(null);
      }
    });
    return () => { cancelled = true; };
  }, [userId, activeModule]);

  const discardDraft = async () => {
    if (userId) {
      try { await clearSession(userId); } catch { /* best-effort */ }
    }
    setDraftSession(null);
  };

  const dismissOnboarding = () => {
    localStorage.setItem('grifon_onboarded', 'true');
    setOnboardingDismissed(true);
  };

  const showOnboarding = !onboardingDismissed && recent.length === 0;

  const ALL_MODULE_LOOKUP = useMemo(() => {
    const map: Record<string, { name: string }> = {
      creative_director: { name: 'Director' },
    };
    [...CORE_MODULES, ...MORE_MODULES].forEach(m => { map[m.id] = { name: m.name }; });
    return map;
  }, []);

  const handleSelectModule = (moduleId: string) => {
    const meta = ALL_MODULE_LOOKUP[moduleId];
    if (meta) {
      const next = recordRecentWork({
        id: `visit:${moduleId}`,
        moduleId,
        title: meta.name,
        kind: 'visit',
      });
      setRecent(next);
    }
    if (!onboardingDismissed) {
      localStorage.setItem('grifon_onboarded', 'true');
      setOnboardingDismissed(true);
    }
    onSelectModule(moduleId);
  };
  const bannerRef = useRef<HTMLDivElement>(null);
  const [bannerHeight, setBannerHeight] = useState(0);

  useLayoutEffect(() => {
    if (!showUpgradeBanner || !bannerRef.current) {
      setBannerHeight(0);
      return;
    }
    const el = bannerRef.current;
    const observer = new ResizeObserver(([entry]) => {
      setBannerHeight(entry.contentRect.height);
    });
    observer.observe(el);
    setBannerHeight(el.getBoundingClientRect().height);
    return () => observer.disconnect();
  }, [showUpgradeBanner, bannerMessage]);

  const { plan_id: userPlan } = useSubscription();
  // A graduated module is reachable if the user is dev (grifon_admin /
  // grifon_dev_unlock, folded into isAdmin) or their plan meets the module's
  // required tier. Non-graduated beta modules (no MODULE_TIER entry) stay dev-only.
  const moduleUnlocked = (id: string): boolean =>
    isAdmin || (MODULE_TIER[id] ? planAtLeast(userPlan, MODULE_TIER[id]) : false);
  const quota = useQuota();
  const displayEmail = userEmail || '';
  const userName = displayEmail
    ? displayEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Operator';
  const userAvatarUrl = '';

  // Time-aware greeting + first name: the dashboard should know who walked in.
  const firstName = userName.split(' ')[0];
  const hour = new Date().getHours();
  const dayPart = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Rotating omnibox placeholder (paused for reduced-motion users).
  const [promptIndex, setPromptIndex] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setPromptIndex((i) => (i + 1) % OMNIBOX_PROMPTS.length), 3200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileMenuOpen(false);
      // Cmd+K (mac) / Ctrl+K (win) toggles the command palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteQuery('');
        setPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const paletteItems: CommandItem[] = [
    { id: 'creative_director', name: 'Director', desc: DIRECTOR_DESC, icon: Film, group: 'Core', onSelect: () => handleSelectModule('creative_director') },
    ...CORE_MODULES.map(m => ({ id: m.id, name: m.name, desc: m.desc, icon: m.icon, group: 'Core', onSelect: () => handleSelectModule(m.id) })),
    ...MORE_MODULES.filter(m => moduleUnlocked(m.id)).map(m => ({ id: m.id, name: m.name, desc: m.desc, icon: m.icon, group: 'More', onSelect: () => handleSelectModule(m.id) })),
  ];

  // Honest moment-of-value nudge — only surfaces once the user has felt the
  // limit (shipped work + running low), quoting the real remaining number.
  // Replaces the old permanent generic banner. The hard cap is the QuotaWallModal.
  useEffect(() => {
    if (localStorage.getItem('grifon_banner_dismissed') === 'true') {
      setShowUpgradeBanner(false);
      return;
    }
    const nudge = computeUpgradeNudge(userPlan, quota.workflows, quota.loading);
    if (nudge) {
      setBannerMessage(nudge.message);
      setBannerUrgency(nudge.urgency);
      setShowUpgradeBanner(true);
    } else {
      setShowUpgradeBanner(false);
    }
  }, [userPlan, quota.loading, quota.workflows.used, quota.workflows.limit, quota.workflows.remaining]);

  const dismissBanner = () => {
    localStorage.setItem('grifon_banner_dismissed', 'true');
    setShowUpgradeBanner(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-[#FFCC00] selection:text-black relative">
      {/* Cinematic ambient layer — shared with landing/pricing for brand continuity */}
      <Aurora intensity="dashboard" />
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: 'radial-gradient(#FFCC00 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Upgrade Banner */}
      {showUpgradeBanner && (
        <div ref={bannerRef} className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b ${bannerUrgency === 'final' ? 'bg-gradient-to-r from-[#FFCC00]/15 via-[#FFCC00]/25 to-[#FFCC00]/15 border-[#FFCC00]/35' : 'bg-gradient-to-r from-[#FFCC00]/10 via-[#FFCC00]/15 to-[#FFCC00]/10 border-[#FFCC00]/20'}`}>
          <div className="max-w-7xl mx-auto pl-4 pr-10 py-2.5 flex items-center justify-center gap-3 relative">
            <Zap className="w-4 h-4 text-[#FFCC00] flex-shrink-0" />
            <p className="text-xs lg:text-sm text-zinc-300 text-center">
              {bannerMessage}
              <button onClick={onUpgrade} className="ml-2 text-[#FFCC00] font-semibold hover:underline inline-flex items-center gap-1">
                Upgrade Now
                <ArrowRight className="w-3 h-3" />
              </button>
            </p>
            
            {/* Dismiss button */}
            <button 
              onClick={dismissBanner}
              className="absolute right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Fixed Top Bar */}
      <div
        className="fixed left-0 right-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 transition-all"
        style={{ top: bannerHeight }}
      >
        <div className="px-4 lg:pl-24 lg:pr-8 py-3 flex items-center justify-between">
          {/* Mobile logo on left */}
          <div className="lg:hidden">
            <GrifonLogo className="w-8 h-8" />
          </div>
          
          {/* Badges pushed to far right */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Mobile Profile Avatar */}
            <button 
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="lg:hidden w-8 h-8 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0"
            >
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-zinc-400" />
              )}
            </button>

            {/* AI Agents Online Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-full">
              <div className="relative flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <div className="absolute w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75" />
              </div>
              <span className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-widest">
                AI Agents Online
              </span>
            </div>

            <QuotaMeter
              plan={userPlan}
              used={quota.workflows.used}
              limit={quota.loading ? undefined : quota.workflows.limit}
              label="Workflows"
            />

          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav — 7-step canonical flow with Beta gating */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-t border-white/10 px-1 py-2 flex items-center justify-around lg:hidden">
        {NAV_ITEMS.map((item) => {
          const isBeta = item.badge === 'Beta';
          const isClickable = !isBeta || moduleUnlocked(item.id);
          const isActive = activeModule === item.id;
          return (
            <div
              key={item.id}
              onClick={isClickable ? () => handleSelectModule(item.id) : undefined}
              className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded-xl group ${
                isClickable ? 'cursor-pointer' : 'cursor-default opacity-50'
              }`}
            >
              <div className={`w-1 h-1 rounded-full mx-auto mb-0.5 ${isActive ? 'bg-[#FFCC00]' : 'bg-transparent'}`} />
              <item.icon className={`w-5 h-5 ${isActive ? 'text-[#FFCC00]' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
              <span className={`text-[9px] font-medium ${isActive ? 'text-[#FFCC00]' : 'text-zinc-600 group-hover:text-zinc-400'}`}>{item.label}</span>
            </div>
          );
        })}
      </nav>

      {/* Desktop Left Sidebar — 7-step canonical flow with Beta gating */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-50 w-20 bg-zinc-950/95 backdrop-blur-xl border-r border-white/10 flex-col items-center py-6 gap-2">
        <GrifonLogo className="w-10 h-10 mb-6" />

        {NAV_ITEMS.map((item) => {
          const isBeta = item.badge === 'Beta';
          const isClickable = !isBeta || moduleUnlocked(item.id);
          const isActive = activeModule === item.id;
          return (
            <div
              key={item.id}
              onClick={isClickable ? () => handleSelectModule(item.id) : undefined}
              className={`relative flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl w-16 transition-all group ${
                isClickable ? 'cursor-pointer' : 'cursor-default opacity-50'
              } ${isActive ? 'bg-zinc-900/80' : isClickable ? 'hover:bg-zinc-900/80' : ''}`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#FFCC00] rounded-r-full" />
              )}

              <item.icon className={`w-5 h-5 ${isActive ? 'text-[#FFCC00]' : 'text-zinc-400 group-hover:text-white'}`} />
              <span className={`text-[9px] font-medium tracking-wide ${isActive ? 'text-[#FFCC00]' : 'text-zinc-400 group-hover:text-white'}`}>{item.label}</span>
            </div>
          );
        })}

        <div className="mt-auto mb-4 relative">
          <button 
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="w-12 h-12 mx-auto rounded-full bg-zinc-800 border-2 border-white/10 hover:border-[#FFCC00]/50 transition-all overflow-hidden cursor-pointer flex items-center justify-center"
          >
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-zinc-400" />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <main className={`pb-20 lg:pb-0 lg:pl-20 transition-all ${showUpgradeBanner ? 'pt-32 lg:pt-28' : 'pt-16 lg:pt-20'}`}>
        <div className="max-w-4xl lg:max-w-6xl mx-auto px-4 lg:px-8 flex flex-col justify-center min-h-screen lg:min-h-screen">
          
          {/* Command Hero */}
          <div className="mb-10 lg:mb-12 relative z-10">
            {/* Ambient Gold Spotlight Behind Hero */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden -z-10">
              <div
                className="w-[800px] h-[800px] lg:w-[1200px] lg:h-[1200px] rounded-full"
                style={{
                  background: 'radial-gradient(circle at center, rgba(255,204,0,0.06) 0%, rgba(255,204,0,0.03) 30%, rgba(255,204,0,0.01) 60%, transparent 80%)',
                  filter: 'blur(60px)',
                  mixBlendMode: 'screen',
                  animation: 'float-glow 12s ease-in-out infinite',
                }}
              />
            </div>

            {/* Calm sentence-case greeting — non-heading elements so they escape the global h1..h6 uppercase rule.
                Personal + time-aware: the dashboard greets YOU, then asks the question. */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-zinc-200 mb-3 lg:mb-4"
            >
              {dayPart},{' '}
              <SignatureScribble variant="underline" delay={0.9} strokeWidth={2.5}>
                <span className="font-medium text-white">{firstName}</span>
              </SignatureScribble>
              .
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="text-center text-base lg:text-lg text-zinc-500 mb-3"
            >
              What are we creating today?
            </motion.p>
            {/* Momentum line — real usage only, framed as achievement */}
            {!quota.loading && quota.workflows.used > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="text-center text-xs text-zinc-500 mb-8 lg:mb-10"
              >
                You've shipped{' '}
                <span className="text-[#FFCC00] font-semibold">{quota.workflows.used}</span>{' '}
                workflow{quota.workflows.used === 1 ? '' : 's'} this month. Tuloy lang.
              </motion.p>
            )}
            {/* Honest weekly-momentum chip — distinct active days this week, real activity only.
                Shown from 2+ days so a single visit never reads as a "streak". */}
            {weeklyActiveDays >= 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex justify-center -mt-4 mb-8 lg:mb-10"
              >
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/70 ring-1 ring-white/[0.06] text-[11px] text-zinc-400">
                  <Flame className="w-3.5 h-3.5 text-[#FFCC00] shrink-0" />
                  <span className="text-[#FFCC00] font-semibold">{weeklyActiveDays}</span> days creating this week
                </span>
              </motion.div>
            )}
            {(quota.loading || quota.workflows.used === 0) && <div className="mb-6 lg:mb-9" />}

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="max-w-2xl lg:max-w-3xl mx-auto w-full"
            >
              {/* Command input — borderless tonal, opens the Cmd+K palette */}
              <div className="bg-zinc-900/70 backdrop-blur-xl rounded-2xl ring-1 ring-white/[0.06] p-4 lg:p-6 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#FFCC00] flex-shrink-0" />
                <input
                  type="text"
                  placeholder={OMNIBOX_PROMPTS[promptIndex]}
                  onFocus={() => { setPaletteQuery(''); setPaletteOpen(true); }}
                  onClick={() => { setPaletteQuery(''); setPaletteOpen(true); }}
                  className="bg-transparent text-white text-sm lg:text-base flex-1 min-w-0 outline-none placeholder:text-zinc-600 cursor-pointer transition-opacity duration-300"
                  readOnly
                />
                <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-800/80 rounded mr-1">
                  <span className="text-[11px]">⌘</span>K
                </kbd>
                <button
                  onClick={() => { setPaletteQuery(''); setPaletteOpen(true); }}
                  className="w-9 h-9 lg:w-12 lg:h-12 bg-[#FFCC00] rounded-xl flex items-center justify-center flex-shrink-0 hover:scale-105 active:scale-95 transition-all"
                >
                  <ArrowRight className="w-5 h-5 text-black" />
                </button>
              </div>

              {/* Outcome-named starter chips — deep-link into modules */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                {STARTER_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => handleSelectModule(chip.id)}
                    className="flex items-center gap-1.5 bg-white/[0.04] rounded-full px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all"
                  >
                    <chip.icon className="w-3.5 h-3.5" />
                    {chip.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Resume in-progress wizard draft — highest priority surface */}
          {draftSession && (
            <div className="mb-6 lg:mb-8 max-w-2xl lg:max-w-3xl mx-auto w-full">
              <ResumeDraftCard
                currentStep={draftSession.currentStep}
                totalSteps={WIZARD_TOTAL_STEPS}
                savedAt={draftSession.savedAt}
                brandName={draftSession.clientDetails?.brandName}
                onResume={() => handleSelectModule('creative_director')}
                onDiscard={discardDraft}
                delay={0.2}
              />
            </div>
          )}

          {/* Onboarding Nudge — first-timers only */}
          {showOnboarding && !draftSession && (
            <div className="mb-6 lg:mb-8 max-w-2xl lg:max-w-3xl mx-auto w-full">
              <OnboardingNudge
                onStart={() => handleSelectModule('creative_director')}
                onDismiss={dismissOnboarding}
                delay={0.25}
              />
            </div>
          )}

          {/* Recommended Flow Path — canonical 7-step ad creation journey (UBIQUITOUS_LANGUAGE.md) */}
          <div className="mb-6 lg:mb-10 max-w-2xl lg:max-w-3xl mx-auto w-full">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 text-center lg:text-left">
              // RECOMMENDED FLOW
            </p>
            <div className="flex items-center justify-center flex-wrap gap-y-3 lg:gap-y-0 lg:flex-nowrap pb-2 px-1 lg:px-0">
              {[
                { num: 1, label: 'Research', id: 'market_research' },
                { num: 2, label: 'Offer', id: 'offer_optimizer' },
                { num: 3, label: 'Director', id: 'creative_director' },
                { num: 4, label: 'Video', id: 'generate_video' },
                { num: 5, label: 'Voice', id: 'signal_modulator', badge: 'Beta' },
                { num: 6, label: 'Edit', id: 'edit_video', badge: 'Beta' },
                { num: 7, label: 'Caption', id: 'caption_headline' }
              ].map((step, idx, arr) => {
                const isBeta = step.badge === 'Beta';
                const isClickable = !isBeta || moduleUnlocked(step.id);
                return (
                  <React.Fragment key={step.id}>
                    <div
                      onClick={isClickable ? () => handleSelectModule(step.id) : undefined}
                      className={`flex items-center gap-1.5 flex-shrink-0 transition-transform ${
                        isClickable ? 'cursor-pointer active:scale-95' : 'cursor-default opacity-60'
                      }`}
                    >
                      <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-[#FFCC00]/10 border border-[#FFCC00]/30 flex items-center justify-center text-[9px] lg:text-[10px] font-mono font-bold text-[#FFCC00]">
                        {step.num}
                      </div>
                      <span className="text-[10px] lg:text-xs font-medium text-zinc-400 whitespace-nowrap">{step.label}</span>
                      {step.badge && (
                        <span className="px-1 py-0.5 text-[8px] font-mono uppercase tracking-wider rounded bg-[#FFCC00]/10 text-[#FFCC00]/70 border border-[#FFCC00]/20">
                          {step.badge}
                        </span>
                      )}
                    </div>
                    {idx < arr.length - 1 && (
                      <div className={`w-3 lg:w-4 h-px bg-zinc-700 flex-shrink-0 mx-1 ${idx === 3 ? 'hidden lg:flex' : 'flex'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Active Jobs */}
          {activeJobs.length > 0 && (
            <div className="mb-6 max-w-2xl lg:max-w-3xl mx-auto w-full">
              <ActiveJobsPanel jobs={activeJobs} delay={0.3} />
            </div>
          )}

          {/* Recent Work */}
          {recent.length > 0 && (
            <div className="mb-8 lg:mb-10 max-w-2xl lg:max-w-3xl mx-auto w-full">
              <RecentWorkCard
                items={recent}
                onResume={(item) => handleSelectModule(item.moduleId)}
                delay={0.35}
              />
            </div>
          )}

          {/* Module Grid */}
          <div className="max-w-3xl mx-auto w-full mb-12">
            {/* Mobile Grid */}
            <div className="grid grid-cols-2 gap-3 lg:hidden">
              {/* Director AI (Mobile) */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                onClick={() => handleSelectModule('creative_director')}
                className="col-span-2 bg-[#FFCC00]/[0.06] backdrop-blur-xl rounded-2xl p-5 relative overflow-hidden group cursor-pointer flex items-center gap-4 hover:scale-[1.01] hover:bg-[#FFCC00]/[0.10] hover:shadow-[0_8px_40px_rgba(255,204,0,0.15)] active:scale-[0.98] transition-all duration-500 ease-out"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#FFCC00]/5 to-transparent pointer-events-none" />
                <div className="w-12 h-12 bg-[#FFCC00]/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-500 ease-out">
                  <Film className="w-6 h-6 text-[#FFCC00]" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-white tracking-tight">Director</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{DIRECTOR_DESC}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-[#FFCC00] transition-colors relative z-10" />
              </motion.div>

              {/* Standard Modules (Mobile) */}
              {CORE_MODULES.map((mod, i) => (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.06 }}
                  onClick={() => handleSelectModule(mod.id)}
                  className="bg-zinc-900/70 backdrop-blur-xl rounded-2xl p-4 relative overflow-hidden group cursor-pointer aspect-square flex flex-col justify-between hover:scale-[1.01] hover:bg-zinc-900 hover:shadow-[0_8px_30px_rgba(255,204,0,0.12)] active:scale-[0.98] transition-all duration-500 ease-out"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="w-10 h-10 bg-[#FFCC00]/10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-500 ease-out">
                    <mod.icon className="w-5 h-5 text-[#FFCC00]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white tracking-tight leading-tight">{mod.name}</p>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{mod.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Desktop Row */}
            <div className="hidden lg:flex items-start justify-center gap-4">
              {/* Director AI (Desktop) */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                onClick={() => handleSelectModule('creative_director')}
                className="flex-1 bg-[#FFCC00]/[0.06] backdrop-blur-xl rounded-2xl p-6 relative overflow-hidden group cursor-pointer text-center hover:scale-[1.01] hover:bg-[#FFCC00]/[0.10] hover:shadow-[0_8px_40px_rgba(255,204,0,0.15)] active:scale-[0.98] transition-all duration-500 ease-out"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#FFCC00]/5 to-transparent pointer-events-none" />
                <div className="w-14 h-14 lg:w-16 lg:h-16 bg-[#FFCC00]/10 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform duration-500 ease-out">
                  <Film className="w-7 h-7 lg:w-8 lg:h-8 text-[#FFCC00]" />
                </div>
                <p className="text-sm lg:text-sm xl:text-base font-bold text-white tracking-tight">Director</p>
                <p className="text-[11px] lg:text-xs text-zinc-500 mt-1">{DIRECTOR_DESC}</p>
              </motion.div>

              {/* Standard Modules (Desktop) */}
              {CORE_MODULES.map((mod, i) => (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.06 }}
                  onClick={() => handleSelectModule(mod.id)}
                  className="flex-1 bg-zinc-900/70 backdrop-blur-xl rounded-2xl p-6 relative overflow-hidden group cursor-pointer text-center min-w-0 hover:scale-[1.01] hover:bg-zinc-900 hover:shadow-[0_8px_30px_rgba(255,204,0,0.12)] active:scale-[0.98] transition-all duration-500 ease-out"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="w-14 h-14 lg:w-16 lg:h-16 bg-zinc-800/80 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform duration-500 ease-out">
                    <mod.icon className="w-7 h-7 lg:w-8 lg:h-8 text-[#FFCC00]" />
                  </div>
                  <p className="text-sm lg:text-sm xl:text-base font-bold text-white tracking-tight">{mod.name}</p>
                  <p className="text-[11px] lg:text-xs text-zinc-500 mt-1">{mod.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* More Modules Section — graduated modules are plan-gated; dev sees all.
              Below-tier modules render LOCKED with a tier badge → upgrade (upsell). */}
          {(() => {
            // Dev sees every module; everyone else sees the graduated ones only.
            const visible = MORE_MODULES.filter((mod) => isAdmin || MODULE_TIER[mod.id]);
            if (visible.length === 0) return null;
            return (
              <div className="max-w-3xl mx-auto w-full">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4">
                  // MORE MODULES
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                  {visible.map((mod) => {
                    const unlocked = moduleUnlocked(mod.id);
                    const tier = MODULE_TIER[mod.id];
                    return (
                      <div
                        key={mod.id}
                        onClick={() => (unlocked ? handleSelectModule(mod.id) : onUpgrade?.())}
                        className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl p-4 relative overflow-hidden group hover:bg-zinc-900/80 active:scale-[0.98] transition-all duration-500 ease-out cursor-pointer flex flex-col"
                      >
                        {!unlocked && tier && (
                          <span className="absolute top-3 right-3 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#FFCC00] bg-[#FFCC00]/10 border border-[#FFCC00]/30 rounded-full px-1.5 py-0.5">
                            <Lock className="w-3 h-3" /> {tier}
                          </span>
                        )}
                        <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center mb-3">
                          <mod.icon className="w-4 h-4 text-zinc-400 group-hover:text-[#FFCC00] transition-colors" />
                        </div>
                        <p className={`text-xs font-bold text-white tracking-tight mb-1${!unlocked && tier ? ' pr-12' : ''}`}>{mod.name}</p>
                        <p className="text-[10px] text-zinc-500 leading-snug line-clamp-2">{mod.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

        </div>
      </main>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={paletteItems}
        initialQuery={paletteQuery}
      />

      {/* Global Profile Menu */}
      {profileMenuOpen && (
        <>
          {/* Backdrop to close on outside click */}
          <div 
            className="fixed inset-0 z-[60] bg-black/40 lg:bg-transparent backdrop-blur-sm lg:backdrop-blur-none" 
            onClick={() => setProfileMenuOpen(false)}
          />
          
          {/* Menu popover */}
          <div className="fixed z-[70] w-[calc(100vw-32px)] max-w-sm lg:w-72 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden top-[88px] right-4 lg:top-auto lg:bottom-6 lg:left-24 lg:right-auto origin-top-right lg:origin-bottom-left">
            
            {/* User info header */}
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                {userAvatarUrl ? (
                  <img src={userAvatarUrl} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-zinc-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {userName}
                </div>
                <div className="text-xs text-zinc-500 truncate">
                  {displayEmail}
                </div>
              </div>
            </div>
            
            {/* Plan + Credits Section */}
            <div className="p-3 border-b border-white/5 space-y-2">
              <button onClick={onUpgrade} className="w-full bg-[#FFCC00]/10 hover:bg-[#FFCC00]/15 border border-[#FFCC00]/20 rounded-lg px-3 py-2 flex items-center justify-between transition-all group">
                <span className="text-xs font-semibold text-[#FFCC00]">Upgrade Plan</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#FFCC00] group-hover:translate-x-0.5 transition-transform" />
              </button>
              
              <div className="bg-zinc-800/50 rounded-lg px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFCC00]" />
                  <span className="text-xs text-zinc-400">Daily AI</span>
                </div>
                <span className="text-xs font-mono font-bold text-white">
                  {userPlan === 'pro' || userPlan === 'business' ? 'Unlimited' : userPlan === 'starter' ? '0 / 10' : '0 / 3'}
                </span>
              </div>
            </div>
            
            {/* Plan Edition Label */}
            <div className="px-4 py-2.5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-[#FFCC00]" />
                <span className="text-xs font-semibold text-white">
                  {userPlan === 'free' ? 'Free Edition' : userPlan === 'starter' ? 'Starter Edition' : 'Pro Edition'}
                </span>
              </div>
            </div>
            
            {/* Menu Items */}
            <div className="py-1">
              <MenuItem icon={<Settings className="w-4 h-4" />} label="Settings" />
              <MenuItem icon={<HelpCircle className="w-4 h-4" />} label="Help" hasSubmenu />
              <MenuItem icon={<LogOut className="w-4 h-4" />} label="Sign out" danger onClick={onLogout} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
