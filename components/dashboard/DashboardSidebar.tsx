import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, PanelLeftClose, PanelLeft, Bell, Settings, Lock, History, X, type LucideIcon,
} from 'lucide-react';
import { SPRING } from '../ui/motionTokens';
import { GrifonMark } from '../ui/GrifonMark';
import { SheenSweep } from '../ui/SheenSweep';
import { T_LABEL, R_CTRL } from '../ui/wizardTokens';
import {
  HAIRLINE, ROW_HOVER, ACTIVE_ROW, GOLD_CTA_GRADIENT,
} from '../ui/dashboardTokens';
import { MAT_CHROME, MAT_VEIL, rim } from '../ui/materialTokens';

export interface SidebarNavItem {
  id: string;
  label: string;
  /** One-line outcome descriptor from the module registry — surfaced as the row tooltip. */
  descriptor?: string;
  icon: LucideIcon;
  hue: string;
  /** Plan word shown on locked rows (e.g. 'starter'); rendered via T_LABEL caps. */
  tier?: string;
  locked?: boolean;
}

/** One studio department — a labeled section of the rail. */
export interface SidebarNavGroup {
  label: string;
  items: SidebarNavItem[];
}

export interface SidebarRecent {
  id: string;
  moduleId: string;
  title: string;
}

interface DashboardSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  activeModule?: string | null;
  navGroups: SidebarNavGroup[];
  recent: SidebarRecent[];
  onSelect: (id: string) => void;
  onNewAd: () => void;
  onSearch: () => void;
  onOpenNotifications: () => void;
  notifDot: boolean;
  userName: string;
  userEmail?: string | null;
  quotaLabel: string;
  onOpenSettings: () => void;
}

interface SidebarBodyProps extends Omit<DashboardSidebarProps, 'collapsed' | 'mobileOpen'> {
  expanded: boolean;
  mobile?: boolean;
}

/**
 * The rail's content, shared by the desktop rail and the mobile drawer.
 * Hoisted to module scope: defining it inside DashboardSidebar's render gave it
 * a new identity every render, so React remounted the whole subtree on every
 * parent re-render (each hero-input keystroke) — resetting nav scroll and
 * replaying mount animations.
 */
const SidebarBody: React.FC<SidebarBodyProps> = ({
  expanded, mobile, activeModule, navGroups, recent,
  onToggleCollapsed, onMobileClose, onSelect, onNewAd, onSearch,
  onOpenNotifications, notifDot, userName, userEmail, quotaLabel, onOpenSettings,
}) => (
  <div className="flex flex-col h-full w-full py-4">
    {/* Header: logo + toggle/close */}
    <div className={`flex items-center px-3 mb-3 ${expanded ? 'justify-between' : 'justify-center'}`}>
      <button
        onClick={mobile ? undefined : onToggleCollapsed}
        className="flex items-center gap-2.5 group"
        aria-label={mobile ? 'GRIFON' : 'Toggle sidebar'}
      >
        <GrifonMark className="h-9 w-9 shrink-0 group-hover:scale-105 transition-transform" />
        {expanded && <span className="font-sans font-black text-xl tracking-tighter text-white italic">GRIFON</span>}
      </button>
      {expanded && !mobile && (
        <button onClick={onToggleCollapsed} aria-label="Hide sidebar" className={`w-11 h-11 ${R_CTRL} text-on-surface-sublabel hover:text-white ${ROW_HOVER} transition-colors flex items-center justify-center`}>
          <PanelLeftClose className="w-4 h-4" />
        </button>
      )}
      {mobile && (
        <button onClick={onMobileClose} aria-label="Close" className={`w-11 h-11 ${R_CTRL} text-zinc-400 hover:text-white ${ROW_HOVER} transition-colors flex items-center justify-center`}>
          <X className="w-5 h-5" />
        </button>
      )}
    </div>

    {/* Expand affordance when collapsed */}
    {!expanded && !mobile && (
      <button onClick={onToggleCollapsed} aria-label="Expand sidebar" className={`mx-auto mb-2 w-11 h-11 ${R_CTRL} text-on-surface-sublabel hover:text-white ${ROW_HOVER} transition-colors flex items-center justify-center`}>
        <PanelLeft className="w-4 h-4" />
      </button>
    )}

    <div className="px-2.5 space-y-1.5">
      {/* New Ad — the one gold action */}
      <motion.button
        onClick={onNewAd}
        whileHover="hover"
        className={`relative overflow-hidden w-full flex items-center h-11 ${R_CTRL} ${GOLD_CTA_GRADIENT} text-black font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_0_18px_rgba(255,204,0,0.35)] hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_0_28px_rgba(255,204,0,0.55)] active:translate-y-0 active:scale-[0.99] transition-all ${expanded ? 'gap-2.5 px-3 justify-start' : 'justify-center'}`}
      >
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent" />
        <SheenSweep color="rgba(255,255,255,0.35)" />
        <Plus className="w-5 h-5 shrink-0 relative z-10" strokeWidth={2.5} />
        {expanded && <span className="text-sm relative z-10">New Ad</span>}
      </motion.button>

      {/* Search → command palette */}
      <button
        onClick={onSearch}
        className={`w-full flex items-center h-11 ${R_CTRL} text-zinc-300 ${ROW_HOVER} hover:text-white transition-colors ${expanded ? 'gap-3 px-3 justify-start' : 'justify-center'}`}
      >
        <Search className="w-5 h-5 shrink-0" />
        {expanded && (
          <>
            <span className="text-sm flex-1 text-left">Search</span>
            <kbd className={`${T_LABEL} text-on-surface-sublabel bg-zinc-800/80 rounded px-1.5 py-0.5`}>⌘K</kbd>
          </>
        )}
      </button>
    </div>

    {/* Departments */}
    <nav className="px-2.5 mt-3 overflow-y-auto custom-scrollbar flex-1 min-h-0">
      {navGroups.map((group, gi) => (
        <div key={group.label}>
          {expanded ? (
            <p className={`${T_LABEL} text-on-surface-sublabel px-2 mb-1.5 ${gi === 0 ? 'mt-1' : 'mt-4'}`}>{group.label}</p>
          ) : (
            gi > 0 && <div aria-hidden className={`mx-auto my-2 w-6 border-t ${HAIRLINE}`} />
          )}
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = activeModule === item.id;
              const Icon = item.icon;
              // Expanded rows already show the label, so the tooltip carries the outcome
              // descriptor; collapsed rows get label — descriptor (— tier when locked).
              const tooltip = expanded
                ? item.descriptor
                : [item.label, item.descriptor, item.locked ? item.tier : undefined].filter(Boolean).join(' — ');
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  title={tooltip || undefined}
                  className={`relative w-full flex items-center h-11 ${R_CTRL} transition-all group ${expanded ? 'gap-3 px-3 justify-start' : 'justify-center'} ${active ? ACTIVE_ROW : ROW_HOVER}`}
                >
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#FFCC00] rounded-r-full" />}
                  {/* Locked rows dim icon + label only — the lock badge and tier word
                      (the unlock path) stay at full opacity for the legibility gate. */}
                  <span className="relative shrink-0">
                    <Icon className={`w-5 h-5 ${item.locked ? 'opacity-45 group-hover:opacity-80 transition-opacity' : ''}`} style={{ color: item.hue }} />
                    {/* Lock stays legible even in the icon-only rail. */}
                    {!expanded && item.locked && (
                      <span className="absolute -bottom-1 -right-1 bg-zinc-950 rounded-full p-px">
                        <Lock className="w-2.5 h-2.5 text-zinc-400" />
                      </span>
                    )}
                  </span>
                  {expanded && (
                    <>
                      <span className={`text-sm flex-1 text-left truncate ${active ? 'text-white font-semibold' : 'text-zinc-300 group-hover:text-white'} ${item.locked ? 'opacity-45 group-hover:opacity-80 transition-opacity' : ''}`}>{item.label}</span>
                      {item.locked && (
                        <span className={`flex items-center gap-1 text-zinc-400 ${T_LABEL}`}>
                          <Lock className="w-3 h-3 shrink-0" /> {item.tier}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Recent / History */}
      {expanded && recent.length > 0 && (
        <div className="mt-4">
          <p className={`${T_LABEL} text-on-surface-sublabel px-2 mb-1.5 flex items-center gap-1.5`}>
            <History className="w-3 h-3" /> Recent
          </p>
          {recent.slice(0, 6).map((r) => {
            const active = activeModule === r.moduleId;
            return (
              <button
                key={r.id}
                onClick={() => onSelect(r.moduleId)}
                className={`w-full text-left px-3 py-2 ${R_CTRL} text-xs transition-colors truncate ${active ? `${ACTIVE_ROW} text-white font-semibold` : `text-zinc-400 hover:text-white ${ROW_HOVER}`}`}
              >
                {r.title}
              </button>
            );
          })}
        </div>
      )}
    </nav>

    {/* Bottom: notifications + profile */}
    <div className={`px-2.5 pt-2 mt-1 border-t ${HAIRLINE} space-y-1`}>
      <button
        onClick={onOpenNotifications}
        className={`relative w-full flex items-center h-11 ${R_CTRL} text-zinc-300 ${ROW_HOVER} hover:text-white transition-colors ${expanded ? 'gap-3 px-3 justify-start' : 'justify-center'}`}
      >
        <span className="relative shrink-0">
          <Bell className="w-5 h-5" />
          {notifDot && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#FFCC00] ring-2 ring-zinc-950 animate-pulse" />}
        </span>
        {expanded && <span className="text-sm flex-1 text-left">Notifications</span>}
      </button>

      <button
        onClick={onOpenSettings}
        className={`w-full flex items-center h-11 ${R_CTRL} ${ROW_HOVER} transition-colors ${expanded ? 'gap-3 px-2.5 justify-start' : 'justify-center'}`}
      >
        <span className="w-8 h-8 rounded-full bg-zinc-800 ring-1 ring-white/10 flex items-center justify-center shrink-0 text-xs font-bold text-zinc-300">
          {userName.charAt(0).toUpperCase()}
        </span>
        {expanded && (
          <>
            <span className="flex-1 min-w-0 text-left">
              <span className="block text-sm font-semibold text-white truncate">{userName}</span>
              <span className="block text-xs text-on-surface-sublabel truncate">{quotaLabel}</span>
            </span>
            <Settings className="w-4 h-4 text-on-surface-sublabel shrink-0" />
          </>
        )}
      </button>
      {expanded && userEmail && (
        <p className="px-3 pb-1 text-xs text-on-surface-sublabel truncate">{userEmail}</p>
      )}
    </div>
  </div>
);

/**
 * GRIFON COMMAND sidebar — a label rail that collapses to an icon rail (Meta-AI
 * pattern, Grifon register), organized as studio departments. Logo toggles
 * collapse on desktop; a hide button appears when expanded. On mobile it's a
 * slide-over drawer. Module icons carry their signature hue (identity); the
 * active state + New Ad stay gold (action). Locked modules render recessive
 * with a lock that stays visible even collapsed.
 */
export const DashboardSidebar: React.FC<DashboardSidebarProps> = (props) => {
  const { collapsed, mobileOpen, ...bodyProps } = props;

  return (
    <>
      {/* Desktop rail */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 76 : 268 }}
        transition={SPRING.standard}
        // CHROME — the rail floats the full height of the app over the SmokeAura
        // field, so there is genuinely something behind it to refract. This is
        // the textbook case for the tier.
        style={rim(2)}
        className={`hidden lg:flex fixed left-0 top-0 bottom-0 z-50 ${MAT_CHROME} border-r ${HAIRLINE} overflow-hidden`}
      >
        <SidebarBody {...bodyProps} expanded={!collapsed} />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={props.onMobileClose}
              className={`fixed inset-0 z-[60] ${MAT_VEIL} lg:hidden`}
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={SPRING.standard}
              style={rim(2)}
              className={`fixed left-0 top-0 bottom-0 z-[61] w-[86vw] max-w-[320px] ${MAT_CHROME} border-r ${HAIRLINE} lg:hidden`}
            >
              <SidebarBody {...bodyProps} expanded mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default DashboardSidebar;
