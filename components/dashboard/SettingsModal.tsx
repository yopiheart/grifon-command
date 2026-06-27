import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, User, Crown, Bell, Palette, LifeBuoy, Shield, LogOut, ArrowRight, Check,
} from 'lucide-react';
import { SPRING } from '../ui/motionTokens';
import type { PlanId } from '../../utils/planGate';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  userEmail?: string | null;
  userName: string;
  plan: PlanId;
  onUpgrade?: () => void;
  onLogout?: () => void;
}

const PLAN_LABEL: Record<string, string> = {
  free: 'Free Edition',
  starter: 'Starter Edition',
  pro: 'Pro Edition',
  business: 'Business Edition',
};

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500 px-1">
      <span className="text-zinc-400">{icon}</span>
      {title}
    </div>
    <div className="bg-zinc-950/60 rounded-2xl ring-1 ring-white/[0.06] overflow-hidden divide-y divide-white/[0.06]">
      {children}
    </div>
  </div>
);

const Row: React.FC<{ label: string; sub?: string; right?: React.ReactNode; onClick?: () => void; danger?: boolean }> = ({ label, sub, right, onClick, danger }) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${onClick ? 'hover:bg-white/[0.04]' : 'cursor-default'}`}
  >
    <div className="flex-1 min-w-0">
      <div className={`text-sm font-semibold ${danger ? 'text-red-400' : 'text-white'}`}>{label}</div>
      {sub && <div className="text-xs text-zinc-500 mt-0.5 truncate">{sub}</div>}
    </div>
    {right}
  </button>
);

/**
 * GRIFON COMMAND settings — a single, responsive, sectioned modal (Meta-style).
 * Real surfaces only: account, plan/billing (→ pricing), appearance (dark by
 * design), notification prefs (local), help, legal, sign out. No invented features.
 */
export const SettingsModal: React.FC<SettingsModalProps> = ({
  open, onClose, userEmail, userName, plan, onUpgrade, onLogout,
}) => {
  const [renderPing, setRenderPing] = useState(true);
  const [tips, setTips] = useState(true);

  useEffect(() => {
    setRenderPing(localStorage.getItem('grifon_notif_render') !== 'false');
    setTips(localStorage.getItem('grifon_notif_tips') !== 'false');
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const toggle = (key: string, val: boolean, setter: (v: boolean) => void) => {
    setter(val);
    localStorage.setItem(key, String(val));
  };

  const Switch: React.FC<{ on: boolean; onToggle: () => void }> = ({ on, onToggle }) => (
    <span
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${on ? 'bg-[#FFCC00]' : 'bg-zinc-700'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-zinc-950 transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </span>
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={SPRING.standard}
            className="relative w-full sm:max-w-lg h-full sm:h-auto sm:max-h-[85vh] bg-zinc-900/90 backdrop-blur-xl sm:rounded-3xl ring-1 ring-white/10 shadow-[0_0_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
              <span className="text-lg font-bold text-white tracking-tight">Settings</span>
              <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-zinc-950 ring-1 ring-white/10 text-zinc-400 hover:text-white hover:ring-[#FFCC00]/50 transition-all flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5 space-y-6 custom-scrollbar">
              {/* Profile card */}
              <div className="flex items-center gap-3 bg-zinc-950/60 rounded-2xl ring-1 ring-white/[0.06] p-4">
                <div className="w-12 h-12 rounded-full bg-zinc-800 ring-1 ring-white/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{userName}</div>
                  <div className="text-xs text-zinc-500 truncate">{userEmail}</div>
                </div>
              </div>

              <Section icon={<Crown className="w-3.5 h-3.5" />} title="Plan & billing">
                <Row label={PLAN_LABEL[plan] ?? 'Free Edition'} sub="Your current plan" right={
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFCC00] bg-[#FFCC00]/10 ring-1 ring-[#FFCC00]/30 rounded-full px-2 py-1">{plan}</span>
                } />
                <Row label="Upgrade plan" sub="More ads, cinematic renders, priority support" onClick={onUpgrade} right={<ArrowRight className="w-4 h-4 text-[#FFCC00]" />} />
              </Section>

              <Section icon={<Bell className="w-3.5 h-3.5" />} title="Notifications">
                <Row label="Render finished" sub="Ping me when my ad is ready" right={<Switch on={renderPing} onToggle={() => toggle('grifon_notif_render', !renderPing, setRenderPing)} />} />
                <Row label="Tips & product news" sub="Occasional in-app tips" right={<Switch on={tips} onToggle={() => toggle('grifon_notif_tips', !tips, setTips)} />} />
              </Section>

              <Section icon={<Palette className="w-3.5 h-3.5" />} title="Appearance">
                <Row label="Theme" sub="Grifon is cinematic dark by design" right={
                  <span className="inline-flex items-center gap-1.5 text-xs text-zinc-300"><Check className="w-3.5 h-3.5 text-[#FFCC00]" /> Dark</span>
                } />
              </Section>

              <Section icon={<LifeBuoy className="w-3.5 h-3.5" />} title="Help & legal">
                <Row label="Help & support" onClick={() => { window.location.href = '/support'; }} right={<ArrowRight className="w-4 h-4 text-zinc-500" />} />
                <Row label="Terms of service" onClick={() => { window.location.href = '/terms'; }} right={<ArrowRight className="w-4 h-4 text-zinc-500" />} />
                <Row label="Privacy policy" onClick={() => { window.location.href = '/privacy'; }} right={<ArrowRight className="w-4 h-4 text-zinc-500" />} />
              </Section>

              <Section icon={<Shield className="w-3.5 h-3.5" />} title="Account">
                <Row label="Sign out" danger onClick={onLogout} right={<LogOut className="w-4 h-4 text-red-400" />} />
              </Section>

              <p className="text-center text-[10px] font-mono uppercase tracking-widest text-zinc-600 pt-2">
                GRIFON COMMAND © 2026
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
