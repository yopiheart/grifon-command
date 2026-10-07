import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Crown, Palette, LifeBuoy, Shield, LogOut, ArrowRight, Check } from 'lucide-react';
import Button from '../ui/Button';
import { MAT_PLATE, MAT_PLATE_INSET } from '../ui/materialTokens';
import type { PlanId } from '../../utils/planGate';
import { grant as grantConsent, withdraw as withdrawConsent, getMarketingConsent } from '../../services/consentService';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  userEmail?: string | null;
  userName: string;
  plan: PlanId;
  planLoading?: boolean;
  planError?: boolean;
  onRetryPlan?: () => Promise<void>;
  onUpgrade?: () => void | Promise<void>;
  onLogout?: () => void | Promise<void>;
  onNavigate?: (href: string) => void | Promise<void>;
  preview?: boolean;
  restoreFocus?: () => HTMLElement | null;
}
const PLAN_LABEL: Record<PlanId, string> = { free: 'Free Edition', starter: 'Starter Edition', pro: 'Pro Edition', business: 'Business Edition' };
const control = 'min-h-11 min-w-11 !rounded-xl !text-sm !font-semibold !normal-case !tracking-normal';
const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <section className="space-y-2"><h3 className="flex items-center gap-2 px-1 text-sm font-semibold text-zinc-300"><span className="text-zinc-400">{icon}</span>{title}</h3><div className={`${MAT_PLATE_INSET} overflow-hidden rounded-2xl divide-y divide-white/[0.06]`}>{children}</div></section>
);
const Row: React.FC<{ label: string; sub?: string; right?: React.ReactNode; onClick?: () => void; disabled?: boolean }> = ({ label, sub, right, onClick, disabled }) => {
  const content = <><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-white">{label}</div>{sub && <div className="mt-0.5 text-sm leading-relaxed text-zinc-400">{sub}</div>}</div>{right}</>;
  return onClick ? <Button type="button" variant="ghost" disabled={disabled} onClick={onClick} className={`${control} flex w-full items-center gap-3 !rounded-none !px-4 !py-3 text-left`}>{content}</Button> : <div className="flex min-h-11 items-center gap-3 px-4 py-3">{content}</div>;
};

/** Account settings expose confirmed server preferences and existing destinations. */
export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose, userEmail, userName, plan, planLoading = false, planError = false, onRetryPlan, onUpgrade, onLogout, onNavigate, preview = false, restoreFocus }) => {
  const overlay = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const consentEpoch = useRef(0);
  const marketingPending = useRef(false);
  const actionPending = useRef(false);
  const callbacks = useRef({ onClose, restoreFocus });
  callbacks.current = { onClose, restoreFocus };
  const active = useRef(open);
  active.current = open;
  const [marketingAds, setMarketingAds] = useState<boolean | null>(null);
  const [marketingBusy, setMarketingBusy] = useState(false);
  const [marketingError, setMarketingError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const close = useCallback(() => { if (!actionPending.current) callbacks.current.onClose(); }, []);
  const loadConsent = useCallback(async () => {
    if (preview) return;
    const epoch = ++consentEpoch.current;
    marketingPending.current = true; setMarketingAds(null); setMarketingBusy(true); setMarketingError('');
    try {
      const consent = await getMarketingConsent({ strict: true });
      if (active.current && consentEpoch.current === epoch) setMarketingAds(consent.granted);
    } catch {
      if (active.current && consentEpoch.current === epoch) setMarketingError('Your ad preference could not be loaded. Try again.');
    } finally {
      if (active.current && consentEpoch.current === epoch) { marketingPending.current = false; setMarketingBusy(false); }
    }
  }, [preview]);
  useEffect(() => {
    if (!open) return;
    active.current = true;
    setActionError(''); void loadConsent();
    return () => { active.current = false; consentEpoch.current += 1; marketingPending.current = false; };
  }, [open, userEmail, loadConsent]);
  useLayoutEffect(() => {
    if (!open || !overlay.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const background = Array.from(document.body.children).filter((node): node is HTMLElement => node instanceof HTMLElement && node !== overlay.current).map(node => ({ node, inert: node.hasAttribute('inert') }));
    const overflow = document.body.style.overflow;
    background.forEach(({ node }) => node.setAttribute('inert', ''));
    document.body.style.overflow = 'hidden'; dialog.current?.querySelector<HTMLElement>('button')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
      if (event.key !== 'Tab') return;
      event.stopPropagation();
      const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]') ?? []).filter(item => item.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (!first) { event.preventDefault(); dialog.current?.focus(); }
      else if (event.shiftKey && (document.activeElement === first || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('keydown', key, true);
      background.forEach(({ node, inert }) => { if (!inert) node.removeAttribute('inert'); }); document.body.style.overflow = overflow;
      const target = callbacks.current.restoreFocus?.() ?? previous;
      if (target?.isConnected && !target.closest('[inert]')) target.focus();
    };
  }, [open, close]);
  const toggleMarketing = async () => {
    if (preview || marketingPending.current || marketingAds === null) return;
    const epoch = ++consentEpoch.current;
    marketingPending.current = true; setMarketingBusy(true); setMarketingError('');
    try {
      const consent = await (marketingAds ? withdrawConsent() : grantConsent());
      if (active.current && consentEpoch.current === epoch) setMarketingAds(consent.granted);
    } catch {
      if (active.current && consentEpoch.current === epoch) setMarketingError('Your ad preference was not changed. Try again.');
    } finally {
      if (active.current && consentEpoch.current === epoch) { marketingPending.current = false; setMarketingBusy(false); }
    }
  };
  const runAction = async (label: string, action: () => void | Promise<void>) => {
    if (actionPending.current) return;
    actionPending.current = true; setActionBusy(label); setActionError('');
    try { await action(); }
    catch (error) { if (active.current) setActionError(error instanceof Error && error.message === 'CHAT_SAVE_FAILED' ? 'Draft could not be saved. Your chat is still here. Try this action again.' : label === 'Sign out' ? 'Sign out failed. Your session and draft are still here. Try again.' : 'This page could not be opened. Your chat has been kept. Try again.'); }
    finally { actionPending.current = false; if (active.current) setActionBusy(''); }
  };
  const navigate = (href: string) => void runAction('Opening page', () => onNavigate ? onNavigate(href) : window.location.assign(href));
  if (!open) return null;
  return createPortal(<div ref={overlay} className="companion-settings fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/80 p-3 font-sans text-sm text-white sm:p-4" onClick={close}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="account-settings-title" aria-busy={!!actionBusy} tabIndex={-1} className={`${MAT_PLATE} relative flex max-h-[calc(100dvh-24px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl ring-1 ring-white/10`} onClick={event => event.stopPropagation()}>
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-3"><h2 id="account-settings-title" className="!text-base !font-semibold !normal-case !tracking-tight">Settings</h2><Button type="button" variant="ghost" disabled={!!actionBusy} onClick={close} aria-label="Close settings" className={`${control} !p-3`}><X className="h-4 w-4" /></Button></div>
      <div className="companion-settings-scroll min-h-0 overflow-y-auto overscroll-contain space-y-5 px-5 py-5">
        {preview && <p className="text-sm leading-relaxed text-zinc-300">Preview account · settings and sign-out are simulated. No external account preference is changed.</p>}
        <div className={`${MAT_PLATE_INSET} flex items-center gap-3 rounded-2xl p-4`}><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-800"><User className="h-5 w-5 text-zinc-300" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{userName}</p><p className="break-all text-sm text-zinc-400">{userEmail}</p></div></div>
        <Section icon={<Crown className="h-4 w-4" />} title="Plan & billing"><Row label={planLoading ? 'Checking your plan…' : planError ? 'Your plan could not be confirmed.' : PLAN_LABEL[plan]} sub={preview ? 'Simulated preview plan' : 'Your current plan'} right={!planLoading && !planError && <span className="text-sm text-[#FFCC00]">{plan.charAt(0).toUpperCase() + plan.slice(1)}</span>} />{planError && <div className="px-4 pb-3"><p role="alert" className="text-sm text-zinc-300">Your plan could not be loaded. Try again.</p>{onRetryPlan && <Button variant="secondary" className={`${control} mt-2 !px-3`} disabled={planLoading || !!actionBusy} onClick={() => { void onRetryPlan().catch(() => {}); }}>Retry plan</Button>}</div>}{onUpgrade && <Row label={preview ? 'Preview plan options' : 'Upgrade plan'} sub="View available plans" disabled={!!actionBusy || planLoading || planError} onClick={() => void runAction('Opening plans', onUpgrade)} right={<ArrowRight className="h-4 w-4 text-[#FFCC00]" />} />}</Section>
        <Section icon={<Shield className="h-4 w-4" />} title="Privacy">
          {preview ? <Row label="Personalized ads" sub="Unavailable in preview. Sign in to manage your real preference." /> : <>
            <div className="flex items-center gap-3 px-4 py-3"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Personalized ads</p><p className="mt-0.5 text-sm leading-relaxed text-zinc-400">Share limited data with ad partners for relevant ads.</p></div><button type="button" role="switch" aria-label="Personalized ads" aria-checked={marketingAds ?? false} aria-busy={marketingBusy} disabled={marketingBusy || marketingAds === null || !!actionBusy} onClick={() => void toggleMarketing()} className="companion-consent-switch flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl disabled:opacity-50"><span aria-hidden="true" className={`relative h-6 w-10 rounded-full ${marketingAds ? 'bg-[#FFCC00]' : 'bg-zinc-700'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full ${marketingAds ? 'left-[18px] bg-zinc-950' : 'left-0.5 bg-zinc-100'}`} /></span></button></div>
            {marketingBusy && <p role="status" className="px-4 pb-3 text-sm text-zinc-300">{marketingAds === null ? 'Loading your ad preference…' : 'Saving your ad preference…'}</p>}
            {marketingError && <div className="px-4 pb-3"><p role="alert" className="text-sm text-zinc-300">{marketingError}</p><Button variant="secondary" className={`${control} mt-2 !px-3`} disabled={marketingBusy || !!actionBusy} onClick={() => void (marketingAds === null ? loadConsent() : toggleMarketing())}>Retry ad preference</Button></div>}
          </>}
        </Section>
        <Section icon={<Palette className="h-4 w-4" />} title="Appearance"><Row label="Dark appearance" sub="Grifon uses a dark interface." right={<Check className="h-4 w-4 text-[#FFCC00]" />} /></Section>
        <Section icon={<LifeBuoy className="h-4 w-4" />} title="Help & legal">{[['Help & support', '/support'], ['Terms of service', '/terms'], ['Privacy policy', '/privacy']].map(([label, href]) => <Row key={href} label={label} disabled={!!actionBusy} onClick={() => navigate(href)} right={<ArrowRight className="h-4 w-4 text-zinc-300" />} />)}{preview && <Row label="Sign in to Grifon" sub="Open the real login page" disabled={!!actionBusy} onClick={() => navigate('/login')} right={<ArrowRight className="h-4 w-4 text-zinc-300" />} />}</Section>
        {onLogout && <Section icon={<User className="h-4 w-4" />} title="Account"><Row label={actionBusy === 'Sign out' ? 'Signing out…' : preview ? 'Simulate sign out' : 'Sign out'} disabled={!!actionBusy || marketingBusy} onClick={() => void runAction('Sign out', onLogout)} right={<LogOut className="h-4 w-4 text-zinc-300" />} /></Section>}
        {actionBusy && <p role="status" className="text-sm text-zinc-300">{actionBusy === 'Sign out' ? 'Saving your chat and signing out…' : 'Saving your chat…'}</p>}
        {actionError && <p role="alert" className="text-sm leading-relaxed text-zinc-300">{actionError}</p>}
        <p className="text-center text-sm text-zinc-400">Grifon Command © 2026</p>
      </div>
    </div>
  </div>, document.body);
};

export default SettingsModal;
