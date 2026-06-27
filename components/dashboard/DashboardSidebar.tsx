import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, PanelLeftClose, PanelLeft, Bell, Settings, Lock, History, X, type LucideIcon,
} from 'lucide-react';
import { SPRING } from '../ui/motionTokens';
import { GrifonMark } from '../ui/GrifonMark';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  hue: string;
  badge?: 'Beta';
  locked?: boolean;
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
  navItems: SidebarNavItem[];
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

/**
 * GRIFON COMMAND sidebar — a label rail that collapses to an icon rail (Meta-AI
 * pattern, Grifon register). Logo toggles collapse on desktop; a hide button
 * appears when expanded. On mobile it's a slide-over drawer. Module icons carry
 * their signature hue (identity); the active state + New Ad stay gold (action).
 */
export const DashboardSidebar: React.FC<DashboardSidebarProps> = (props) => {
  const {
    collapsed, onToggleCollapsed, mobileOpen, onMobileClose, activeModule,
    navItems, recent, onSelect, onNewAd, onSearch, onOpenNotifications, notifDot,
    userName, userEmail, quotaLabel, onOpenSettings,
  } = props;

  const Body: React.FC<{ expanded: boolean; mobile?: boolean }> = ({ expanded, mobile }) => (
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
          <button onClick={onToggleCollapsed} aria-label="Hide sidebar" className="w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center justify-center">
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
        {mobile && (
          <button onClick={onMobileClose} aria-label="Close" className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Expand affordance when collapsed */}
      {!expanded && !mobile && (
        <button onClick={onToggleCollapsed} aria-label="Expand sidebar" className="mx-auto mb-2 w-9 h-9 rounded-xl text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center justify-center">
          <PanelLeft className="w-4 h-4" />
        </button>
      )}

      <div className="px-2.5 space-y-1.5">
        {/* New Ad — the one gold action */}
        <button
          onClick={onNewAd}
          className={`relative overflow-hidden w-full flex items-center rounded-xl bg-gradient-to-b from-[#FFD83D] via-[#FFCC00] to-[#E6B800] text-black font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_0_18px_rgba(255,204,0,0.35)] hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_0_28px_rgba(255,204,0,0.55)] active:translate-y-0 active:scale-[0.99] transition-all ${expanded ? 'gap-2.5 px-3 py-2.5 justify-start' : 'justify-center h-11'}`}
        >
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent" />
          <Plus className="w-5 h-5 shrink-0 relative z-10" strokeWidth={2.5} />
          {expanded && <span className="text-sm relative z-10">New Ad</span>}
        </button>

        {/* Search → command palette */}
        <button
          onClick={onSearch}
          className={`w-full flex items-center rounded-xl text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors ${expanded ? 'gap-3 px-3 py-2.5 justify-start' : 'justify-center h-11'}`}
        >
          <Search className="w-5 h-5 shrink-0" />
          {expanded && (
            <>
              <span className="text-sm flex-1 text-left">Search</span>
              <kbd className="text-[10px] font-mono text-zinc-500 bg-zinc-800/80 rounded px-1.5 py-0.5">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      {/* Modules */}
      <nav className="px-2.5 mt-3 space-y-1 overflow-y-auto custom-scrollbar flex-1 min-h-0">
        {expanded && <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 px-2 mb-1.5 mt-1">Modules</p>}
        {navItems.map((item) => {
          const active = activeModule === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              title={!expanded ? item.label : undefined}
              className={`relative w-full flex items-center rounded-xl transition-all group ${expanded ? 'gap-3 px-3 py-2.5 justify-start' : 'justify-center h-11'} ${active ? 'bg-zinc-800/70' : 'hover:bg-white/[0.05]'}`}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#FFCC00] rounded-r-full" />}
              <Icon className="w-5 h-5 shrink-0" style={{ color: item.hue }} />
              {expanded && (
                <>
                  <span className={`text-sm flex-1 text-left truncate ${active ? 'text-white font-semibold' : 'text-zinc-300 group-hover:text-white'}`}>{item.label}</span>
                  {item.badge && (
                    <span className="text-[8px] font-mono uppercase tracking-wider rounded bg-[#FFCC00]/10 text-[#FFCC00]/70 ring-1 ring-[#FFCC00]/20 px-1 py-0.5">{item.badge}</span>
                  )}
                  {item.locked && <Lock className="w-3 h-3 text-zinc-600 shrink-0" />}
                </>
              )}
            </button>
          );
        })}

        {/* Recent / History */}
        {expanded && recent.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 px-2 mb-1.5 flex items-center gap-1.5">
              <History className="w-3 h-3" /> Recent
            </p>
            {recent.slice(0, 6).map((r) => (
              <button
                key={r.id}
                onClick={() => onSelect(r.moduleId)}
                className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors truncate"
              >
                {r.title}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom: notifications + profile */}
      <div className="px-2.5 pt-2 mt-1 border-t border-white/[0.06] space-y-1">
        <button
          onClick={onOpenNotifications}
          className={`relative w-full flex items-center rounded-xl text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors ${expanded ? 'gap-3 px-3 py-2.5 justify-start' : 'justify-center h-11'}`}
        >
          <span className="relative shrink-0">
            <Bell className="w-5 h-5" />
            {notifDot && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#FFCC00] ring-2 ring-zinc-950 animate-pulse" />}
          </span>
          {expanded && <span className="text-sm flex-1 text-left">Notifications</span>}
        </button>

        <button
          onClick={onOpenSettings}
          className={`w-full flex items-center rounded-xl hover:bg-white/[0.06] transition-colors ${expanded ? 'gap-3 px-2.5 py-2 justify-start' : 'justify-center h-11'}`}
        >
          <span className="w-8 h-8 rounded-full bg-zinc-800 ring-1 ring-white/10 flex items-center justify-center shrink-0 text-xs font-bold text-zinc-300">
            {userName.charAt(0).toUpperCase()}
          </span>
          {expanded && (
            <>
              <span className="flex-1 min-w-0 text-left">
                <span className="block text-sm font-semibold text-white truncate">{userName}</span>
                <span className="block text-[11px] text-zinc-500 truncate">{quotaLabel}</span>
              </span>
              <Settings className="w-4 h-4 text-zinc-500 shrink-0" />
            </>
          )}
        </button>
        {expanded && userEmail && (
          <p className="px-3 pb-1 text-[10px] text-zinc-600 truncate">{userEmail}</p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop rail */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 76 : 268 }}
        transition={SPRING.standard}
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-50 bg-zinc-950/90 backdrop-blur-xl border-r border-white/[0.06] overflow-hidden"
      >
        <Body expanded={!collapsed} />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={SPRING.standard}
              className="fixed left-0 top-0 bottom-0 z-[61] w-[86vw] max-w-[320px] bg-zinc-950/95 backdrop-blur-xl border-r border-white/10 lg:hidden"
            >
              <Body expanded mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default DashboardSidebar;
