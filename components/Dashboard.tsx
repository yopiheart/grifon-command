import React, { useState, useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DUR, EASE, SPRING, reducedMotion } from './ui/motionTokens';
import {
  Sparkles, ArrowRight, ChevronRight, Film, Search, Target,
  Flame, Lock, Menu, Bell,
} from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { planAtLeast, type PlanId } from '../utils/planGate';
import { useQuota } from '../hooks/useQuota';
import { SmokeAura } from './ui/SmokeAura';
import { CommandPalette, type CommandItem } from './ui/CommandPalette';
import { loadRecentWork, recordRecentWork, activeDaysThisWeek, type RecentItem } from '../services/recentWorkService';
import { computeUpgradeNudge } from '../config/upgradeNudge';
import { ActiveJobsPanel } from './ui/ActiveJobsPanel';
import { useActiveJobs } from '../hooks/useActiveJobs';
import { useServerRenderJobs } from '../hooks/useServerRenderJobs';
import { OnboardingNudge } from './ui/OnboardingNudge';
import { ResumeDraftCard } from './ui/ResumeDraftCard';
import { SignatureScribble } from './landing/SignatureScribble';
import { getSession, clearSession, type WizardSessionV1 } from '../services/wizardSessionStore';
import { MODULE_IDENTITY, getModuleIdentity, hueAlpha, GRIFON_GOLD } from '../config/moduleIdentity';
import { DashboardSidebar, type SidebarNavGroup } from './dashboard/DashboardSidebar';
import { SheenSweep } from './ui/SheenSweep';
import { T_LABEL } from './ui/wizardTokens';
import {
  HAIRLINE, CARD_TONAL, FILL_REST, FILL_HOVER, ROW_HOVER, RING_FIELD,
  GOLD_GLOW_HOVER, entrance, SLATE_BEATS,
} from './ui/dashboardTokens';
import { MAT_CHROME, SCROLL_EDGE } from './ui/materialTokens';
import { SettingsModal } from './dashboard/SettingsModal';
import { NotificationsPanel } from './dashboard/NotificationsPanel';

interface DashboardProps {
  onSelectModule: (module: string) => void;
  activeModule?: string | null;
  userEmail?: string | null;
  userId?: string | null;
  onLogout?: () => void;
  onUpgrade?: () => void;
}

const WIZARD_TOTAL_STEPS = 8;

// Rotating hero placeholders — real outcomes. The hero input is the one-shot
// entry: describe the business → routes to Recon (research) → Director.
const HERO_PROMPTS = [
  'a milk tea shop in Cebu, buy-1-take-1 promo…',
  'my condo units in BGC, for young professionals…',
  'a home-based baking business, custom cakes…',
  'my barbershop, walk-ins welcome, ₱150 cut…',
  'a skincare line for Filipina moms…',
];

// Registry-driven dashboard data. Identity (name/descriptor/hue/icon) lives in
// config/moduleIdentity.ts — one edit there updates every surface here.
const DIRECTOR = getModuleIdentity('creative_director');
const DirectorIcon = DIRECTOR.icon;

const CORE_MODULES = ['market_research', 'offer_optimizer', 'caption_headline'].map((id) => {
  const m = getModuleIdentity(id);
  return { id, name: m.name, icon: m.icon, desc: m.descriptor, hue: m.hue };
});

const MORE_MODULES = [
  'concierge_mode', 'hook_lab', 'cinematic_studio', 'influencer_forge', 'generate_video',
  'image_ads', 'batch_fanout', 'image_editor', 'organic_calendar', 'edit_video', 'signal_modulator',
].map((id) => {
  const m = getModuleIdentity(id);
  return { id, name: m.name, icon: m.icon, desc: m.descriptor, hue: m.hue };
});

// Sidebar rail — every user-facing module, organized as studio departments
// (full branded names — the in-app world). MAIN UNIT is the free daily-driver
// crew, so the calm top of the rail is preserved; locked-heavy departments
// sink naturally. intelligence_uplink is internal and stays off every surface.
const RAIL_GROUPS: { label: string; ids: string[] }[] = [
  { label: '// Main Unit', ids: ['creative_director', 'market_research', 'offer_optimizer', 'caption_headline'] },
  { label: '// Production', ids: ['generate_video', 'cinematic_studio', 'concierge_mode', 'influencer_forge', 'image_ads'] },
  { label: '// Post', ids: ['edit_video', 'signal_modulator', 'image_editor'] },
  { label: '// Distribution', ids: ['batch_fanout', 'hook_lab', 'organic_calendar'] },
];

// Outcome chips under the hero — deep-link straight into a module.
const HERO_CHIPS = [
  { id: 'creative_director', label: 'Make a video ad', icon: Film },
  { id: 'market_research', label: 'Research my market', icon: Search },
  { id: 'offer_optimizer', label: 'Build an offer', icon: Target },
];

// Slice 5 — gated modules and the plan tier that unlocks each. Modules absent
// here are free. The full roster is tiered so every rail row can show its
// unlock path (Neil-approved ladder, 2026-07-03) — the lock is nav-level; an
// App.tsx gateModule pass for the newly-tiered six is a follow-up.
const MODULE_TIER: Record<string, PlanId> = {
  generate_video: 'starter',
  hook_lab: 'starter',
  image_ads: 'starter',
  image_editor: 'starter',
  organic_calendar: 'starter',
  edit_video: 'pro',
  signal_modulator: 'pro',
  batch_fanout: 'pro',
  cinematic_studio: 'business',
  concierge_mode: 'business',
  influencer_forge: 'business',
};

const Dashboard: React.FC<DashboardProps> = ({ onSelectModule, activeModule, userEmail, userId, onLogout, onUpgrade }) => {
  const reduce = useReducedMotion();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const adminFlag = localStorage.getItem('grifon_admin');
    const devUnlock = localStorage.getItem('grifon_dev_unlock') === '1';
    setIsAdmin(adminFlag === 'true' || devUnlock);
  }, []);

  // Shell state
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );

  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [onboardingDismissed, setOnboardingDismissed] = useState(true);
  const [draftSession, setDraftSession] = useState<WizardSessionV1 | null>(null);
  const [heroInput, setHeroInput] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);

  const activeJobs = useActiveJobs();
  useServerRenderJobs(Boolean(userId));
  const weeklyActiveDays = useMemo(() => activeDaysThisWeek(), [recent]);
  const { plan_id: userPlan } = useSubscription();
  const quota = useQuota();

  useEffect(() => {
    setCollapsed(localStorage.getItem('grifon_sidebar_collapsed') !== 'false');
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const initialRecent = loadRecentWork();
    setRecent(initialRecent);
    const flag = localStorage.getItem('grifon_onboarded') === 'true';
    setOnboardingDismissed(flag || initialRecent.length > 0);
  }, []);

  useEffect(() => {
    if (!userId) { setDraftSession(null); return; }
    let cancelled = false;
    getSession(userId).then((s) => {
      if (cancelled) return;
      if (s && s.currentStep > 1 && s.currentStep < WIZARD_TOTAL_STEPS) setDraftSession(s);
      else setDraftSession(null);
    });
    return () => { cancelled = true; };
  }, [userId, activeModule]);

  // Rotating hero placeholder
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setPromptIndex((i) => (i + 1) % HERO_PROMPTS.length), 3400);
    return () => clearInterval(id);
  }, []);

  // ⌘K opens search palette
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteQuery('');
        setPaletteOpen((p) => !p);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem('grifon_sidebar_collapsed', String(next));
      return next;
    });
  };

  const moduleUnlocked = (id: string): boolean =>
    isAdmin || (MODULE_TIER[id] ? planAtLeast(userPlan, MODULE_TIER[id]) : false);

  const ALL_MODULE_LOOKUP = useMemo(() => {
    const map: Record<string, { name: string }> = {};
    Object.values(MODULE_IDENTITY).forEach((m) => { map[m.key] = { name: m.name }; });
    return map;
  }, []);

  const handleSelectModule = (moduleId: string) => {
    const meta = ALL_MODULE_LOOKUP[moduleId];
    if (meta) {
      const next = recordRecentWork({ id: `visit:${moduleId}`, moduleId, title: meta.name, kind: 'visit' });
      setRecent(next);
    }
    if (!onboardingDismissed) {
      localStorage.setItem('grifon_onboarded', 'true');
      setOnboardingDismissed(true);
    }
    setMobileOpen(false);
    onSelectModule(moduleId);
  };

  // Sidebar select routes any tier-locked module → upgrade.
  const sidebarSelect = (id: string) => {
    if (MODULE_TIER[id] && !moduleUnlocked(id)) { onUpgrade?.(); return; }
    handleSelectModule(id);
  };

  const discardDraft = async () => {
    if (userId) { try { await clearSession(userId); } catch { /* best-effort */ } }
    setDraftSession(null);
  };
  const dismissOnboarding = () => {
    localStorage.setItem('grifon_onboarded', 'true');
    setOnboardingDismissed(true);
  };

  const showOnboarding = !onboardingDismissed && recent.length === 0;

  // Hero submit → stash the brief and route to Recon (research-first doctrine).
  const submitHero = () => {
    const text = heroInput.trim();
    if (text) {
      localStorage.setItem('grifon_heroPrompt', text);
      localStorage.setItem('grifon_heroPromptTs', Date.now().toString());
    }
    handleSelectModule('market_research');
  };

  // Identity / greeting
  const displayEmail = userEmail || '';
  const userName = displayEmail
    ? displayEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Operator';
  const firstName = userName.split(' ')[0];
  const hour = new Date().getHours();
  const dayPart = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  // Call-sheet line — the studio register, time- and streak-aware.
  const callSheet = hour < 12
    ? '// Morning call — your crew is on set'
    : hour < 18
      ? `// On the lot${weeklyActiveDays >= 2 ? ` — day ${weeklyActiveDays} this week` : ''}`
      : "// Night shoot — the crew's still rolling";

  // Quota label + low-nudge
  const quotaLabel = quota.loading
    ? '—'
    : userPlan === 'pro' || userPlan === 'business'
      ? 'Unlimited'
      : typeof quota.workflows.remaining === 'number'
        ? `${quota.workflows.remaining} left`
        : '';
  const quotaLow = Boolean(computeUpgradeNudge(userPlan, quota.workflows, quota.loading));

  // Sidebar departments from registry
  const navGroups: SidebarNavGroup[] = RAIL_GROUPS.map((g) => ({
    label: g.label,
    items: g.ids.map((id) => {
      const m = getModuleIdentity(id);
      return {
        id, label: m.name, descriptor: m.descriptor, icon: m.icon, hue: m.hue,
        tier: MODULE_TIER[id],
        locked: Boolean(MODULE_TIER[id]) && !moduleUnlocked(id),
      };
    }),
  }));

  // Command palette
  const paletteItems: CommandItem[] = [
    { id: 'creative_director', name: DIRECTOR.name, desc: DIRECTOR.descriptor, icon: DIRECTOR.icon, group: 'Core', onSelect: () => handleSelectModule('creative_director') },
    ...CORE_MODULES.map((m) => ({ id: m.id, name: m.name, desc: m.desc, icon: m.icon, group: 'Core', onSelect: () => handleSelectModule(m.id) })),
    ...MORE_MODULES.filter((m) => moduleUnlocked(m.id)).map((m) => ({ id: m.id, name: m.name, desc: m.desc, icon: m.icon, group: 'More', onSelect: () => handleSelectModule(m.id) })),
  ];

  // Explore-tools grid tiles
  const exploreTiles = useMemo(() => {
    const more = MORE_MODULES.filter((m) => isAdmin || MODULE_TIER[m.id]);
    return [
      { id: 'creative_director', name: DIRECTOR.name, icon: DIRECTOR.icon, desc: DIRECTOR.descriptor, hue: DIRECTOR.hue, featured: true },
      ...CORE_MODULES.map((m) => ({ ...m, featured: false })),
      ...more.map((m) => ({ ...m, featured: false })),
    ];
  }, [isAdmin]);

  const recentForSidebar = recent.map((r) => ({ id: r.id, moduleId: r.moduleId, title: r.title }));

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-[#FFCC00] selection:text-black relative">
      <SmokeAura />

      <DashboardSidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        activeModule={activeModule}
        navGroups={navGroups}
        recent={recentForSidebar}
        onSelect={sidebarSelect}
        onNewAd={() => handleSelectModule('creative_director')}
        onSearch={() => { setPaletteQuery(''); setPaletteOpen(true); }}
        onOpenNotifications={() => setNotifOpen(true)}
        notifDot={activeJobs.length > 0 || quotaLow}
        userName={userName}
        userEmail={displayEmail}
        quotaLabel={quotaLabel}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Mobile top bar */}
      {/* CHROME + scroll edge — the slate scrolls under this bar, so content
          grades out beneath it instead of colliding with the icons. */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 z-40 h-14 px-3 flex items-center justify-between ${MAT_CHROME} ${SCROLL_EDGE} border-b ${HAIRLINE}`}>
        <button onClick={() => setMobileOpen(true)} aria-label="Menu" className={`w-11 h-11 rounded-xl text-zinc-300 hover:text-white ${ROW_HOVER} transition-colors flex items-center justify-center`}>
          <Menu className="w-5 h-5" />
        </button>
        <button onClick={() => setNotifOpen(true)} aria-label="Notifications" className={`relative w-11 h-11 rounded-xl text-zinc-300 hover:text-white ${ROW_HOVER} transition-colors flex items-center justify-center`}>
          <Bell className="w-5 h-5" />
          {(activeJobs.length > 0 || quotaLow) && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FFCC00] ring-2 ring-zinc-950 animate-pulse" />}
        </button>
      </div>

      {/* Main */}
      <motion.main
        initial={false}
        animate={{ paddingLeft: isDesktop ? (collapsed ? 76 : 268) : 0 }}
        transition={SPRING.standard}
        className="relative z-10 pt-14 lg:pt-0 min-h-screen flex flex-col"
      >
        <div className="w-full max-w-3xl lg:max-w-4xl mx-auto px-4 lg:px-8 flex-1 flex flex-col">

          {/* HERO — the one-shot entry, revealed as one "first slate" sequence */}
          <div className="flex-1 flex flex-col justify-center min-h-[70vh] py-10">
            <motion.p
              {...entrance(reduce, SLATE_BEATS.greeting)}
              className="text-center text-2xl sm:text-3xl lg:text-4xl font-normal tracking-tight text-zinc-200 mb-2"
            >
              {dayPart},{' '}
              <SignatureScribble variant="underline" delay={SLATE_BEATS.signature} strokeWidth={2.5} playOnMount>
                <span className="font-semibold text-white">{firstName}</span>
              </SignatureScribble>.
            </motion.p>
            <motion.p
              {...entrance(reduce, SLATE_BEATS.callSheet)}
              className={`text-center ${T_LABEL} text-on-surface-sublabel mb-3`}
            >
              {callSheet}
            </motion.p>
            <motion.div
              {...entrance(reduce, SLATE_BEATS.headline)}
              className="text-center text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.3] pb-1 bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500 mb-7"
            >
              What are we selling today?
            </motion.div>

            {/* Hero input */}
            <motion.div
              {...entrance(reduce, SLATE_BEATS.heroInput)}
              className="w-full max-w-2xl mx-auto"
            >
              {/* Deliberately NOT chrome: the hero input sits in the flow of the
                  slate, it doesn't float over anything. Its backdrop-filter was
                  blurring a near-black field for nothing, so it's gone — the ring
                  and tonal fill carry the field treatment. */}
              <div className={`${CARD_TONAL} rounded-2xl ${RING_FIELD} p-3 lg:p-4 flex items-center gap-3 focus-within:ring-[#FFCC00]/40 transition-all`}>
                <Sparkles className="w-5 h-5 text-[#FFCC00] flex-shrink-0 ml-1" />
                <input
                  type="text"
                  value={heroInput}
                  onChange={(e) => setHeroInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitHero(); }}
                  placeholder={`Tell me about your business — e.g. ${HERO_PROMPTS[promptIndex]}`}
                  className="bg-transparent text-white text-sm lg:text-base flex-1 min-w-0 outline-none placeholder:text-on-surface-sublabel"
                />
                <button
                  onClick={submitHero}
                  aria-label="Make my ad"
                  className={`w-10 h-10 lg:w-12 lg:h-12 bg-[#FFCC00] rounded-xl flex items-center justify-center flex-shrink-0 hover:scale-105 ${GOLD_GLOW_HOVER} active:scale-95 transition-all`}
                >
                  <ArrowRight className="w-5 h-5 text-black" />
                </button>
              </div>

              {/* Outcome chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                {HERO_CHIPS.map((chip, i) => (
                  <motion.button
                    key={chip.id}
                    {...entrance(reduce, SLATE_BEATS.chips + i * SLATE_BEATS.chipStep)}
                    onClick={() => handleSelectModule(chip.id)}
                    className={`flex items-center gap-1.5 h-11 ${FILL_REST} rounded-xl px-4 text-xs font-semibold text-zinc-400 hover:text-white ${FILL_HOVER} transition-all`}
                  >
                    <chip.icon className="w-3.5 h-3.5" />
                    {chip.label}
                  </motion.button>
                ))}
              </div>

              <p className="text-center text-xs text-on-surface-sublabel mt-4">
                One prompt → a full video ad. Grifon researches, scripts, and storyboards it for you.
              </p>

              {!quota.loading && quota.workflows.used > 0 && (
                <p className="text-center text-xs text-on-surface-sublabel mt-3">
                  You've shipped <span className="text-[#FFCC00] font-semibold">{quota.workflows.used}</span>{' '}
                  workflow{quota.workflows.used === 1 ? '' : 's'} this month. Tuloy lang.
                  {weeklyActiveDays >= 2 && (
                    <span className="inline-flex items-center gap-1 ml-2 text-zinc-400">
                      <Flame className="w-3.5 h-3.5 text-[#FFCC00]" /> {weeklyActiveDays} days this week
                    </span>
                  )}
                </p>
              )}
            </motion.div>
          </div>

          {/* Resume / onboarding */}
          {draftSession && (
            <div className="mb-6 max-w-2xl mx-auto w-full">
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
          {showOnboarding && !draftSession && (
            <div className="mb-6 max-w-2xl mx-auto w-full">
              <OnboardingNudge onStart={() => handleSelectModule('creative_director')} onDismiss={dismissOnboarding} delay={0.25} />
            </div>
          )}
          {activeJobs.length > 0 && (
            <div className="mb-6 max-w-2xl mx-auto w-full">
              <ActiveJobsPanel jobs={activeJobs} delay={0.3} />
            </div>
          )}

          {/* EXPLORE TOOLS */}
          <div className="w-full mb-16">
            <p className={`${T_LABEL} text-on-surface-sublabel mb-4`}>// EXPLORE TOOLS</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {exploreTiles.map((tile, i) => {
                const isMore = !tile.featured && !CORE_MODULES.some((c) => c.id === tile.id);
                const unlocked = !isMore || moduleUnlocked(tile.id);
                const tier = MODULE_TIER[tile.id];
                const Icon = tile.featured ? DirectorIcon : tile.icon;
                return (
                  <motion.button
                    key={tile.id}
                    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                    transition={reducedMotion(reduce, { duration: DUR.slow, delay: 0.05 + i * 0.04, ease: EASE.expressive })}
                    whileHover="hover"
                    onClick={() => (unlocked ? handleSelectModule(tile.id) : onUpgrade?.())}
                    className={`relative text-left rounded-2xl p-4 group transition-all duration-300 active:scale-[0.98] overflow-hidden ${
                      tile.featured
                        ? 'bg-[#FFCC00]/[0.06] hover:bg-[#FFCC00]/[0.10] hover:shadow-[0_8px_40px_rgba(255,204,0,0.15)] col-span-2 lg:col-span-1'
                        : `${CARD_TONAL} hover:bg-zinc-900`
                    }`}
                  >
                    {tile.featured && <SheenSweep color={hueAlpha(GRIFON_GOLD, 0.14)} />}
                    {!unlocked && tier && (
                      <span className={`absolute top-3 right-3 flex items-center gap-1 ${T_LABEL} text-[#FFCC00] bg-[#FFCC00]/10 ring-1 ring-[#FFCC00]/30 rounded-full px-1.5 py-0.5`}>
                        <Lock className="w-2.5 h-2.5 shrink-0" /> {tier}
                      </span>
                    )}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: hueAlpha(tile.hue, 0.1) }}
                    >
                      <Icon className="w-5 h-5" style={{ color: tile.hue }} />
                    </div>
                    <p className="text-sm font-bold text-white tracking-tight">{tile.name}</p>
                    <p className="text-xs text-on-surface-sublabel mt-1 leading-snug line-clamp-2">{tile.desc}</p>
                    {tile.featured && <ChevronRight className="absolute top-4 right-4 w-4 h-4 text-on-surface-sublabel group-hover:text-[#FFCC00] transition-colors" />}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} initialQuery={paletteQuery} />

      <NotificationsPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        jobs={activeJobs}
        quotaLow={quotaLow}
        quotaRemaining={typeof quota.workflows.remaining === 'number' ? quota.workflows.remaining : undefined}
        onUpgrade={() => { setNotifOpen(false); onUpgrade?.(); }}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userEmail={displayEmail}
        userName={userName}
        plan={userPlan}
        onUpgrade={() => { setSettingsOpen(false); onUpgrade?.(); }}
        onLogout={onLogout}
      />
    </div>
  );
};

export default Dashboard;
