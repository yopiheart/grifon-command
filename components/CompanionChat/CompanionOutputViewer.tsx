import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';

export function CompanionOutputViewer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLElement>(null);
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const resize = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const content = Array.from(panel.current?.parentElement?.children ?? []).filter(node => node !== panel.current);
    if (mobile) content.forEach(node => node.setAttribute('inert', ''));
    panel.current?.querySelector<HTMLElement>('button')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab' || !mobile) return;
      const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], select:not(:disabled), video[controls]') ?? []);
      const first = items[0], last = items[items.length-1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { content.forEach(node => node.removeAttribute('inert')); document.removeEventListener('keydown', key); previous?.focus(); };
  }, [onClose, mobile]);
  return <aside ref={panel} role="dialog" aria-modal={mobile || undefined} aria-label={title} className="companion-output-viewer absolute inset-0 z-40 overflow-y-auto border-l border-white/10 bg-zinc-950 p-4 md:left-auto md:w-[45%]">
    <div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm font-semibold">{title}</p><Button variant="ghost" className="min-h-11 min-w-11 !rounded-xl !p-3" aria-label="Close viewer" onClick={onClose}><X className="h-4 w-4" /></Button></div>
    {children}
  </aside>;
}
