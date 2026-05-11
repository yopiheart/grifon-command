import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ArrowRight, X } from 'lucide-react';

export interface CommandItem {
  id: string;
  name: string;
  desc?: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
  initialQuery?: string;
}

const score = (q: string, item: CommandItem) => {
  if (!q) return 0;
  const hay = `${item.name} ${item.desc ?? ''} ${item.group ?? ''}`.toLowerCase();
  const needle = q.toLowerCase();
  if (hay.includes(needle)) return 2;
  // letter-order fuzzy: every char of q appears in hay in order
  let i = 0;
  for (const ch of hay) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return 1;
  }
  return -1;
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, items, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, initialQuery]);

  const results = useMemo(() => {
    if (!query.trim()) return items;
    return items
      .map(item => ({ item, s: score(query.trim(), item) }))
      .filter(x => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .map(x => x.item);
  }, [query, items]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx(i => Math.min(results.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx(i => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const pick = results[activeIdx];
        if (pick) {
          pick.onSelect();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, activeIdx, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed left-4 right-4 top-[15%] z-[101] mx-auto max-w-xl bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
              <Search className="w-4 h-4 text-[#FFCC00] flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
                placeholder="Search modules, recent work…"
                className="bg-transparent text-white text-sm flex-1 min-w-0 outline-none placeholder:text-zinc-600"
              />
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-800/80 border border-white/5 rounded">
                ESC
              </kbd>
              <button onClick={onClose} className="sm:hidden text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto py-2">
              {results.length === 0 && (
                <div className="px-4 py-8 text-center text-xs font-mono text-zinc-500 uppercase tracking-widest">
                  // No matches
                </div>
              )}
              {results.map((item, i) => {
                const Icon = item.icon;
                const isActive = i === activeIdx;
                return (
                  <button
                    key={item.id}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => { item.onSelect(); onClose(); }}
                    className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${isActive ? 'bg-[#FFCC00]/10' : 'hover:bg-white/5'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-[#FFCC00]/15' : 'bg-zinc-800'}`}>
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#FFCC00]' : 'text-zinc-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white uppercase tracking-tight truncate">{item.name}</span>
                        {item.group && (
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                            {item.group}
                          </span>
                        )}
                      </div>
                      {item.desc && (
                        <div className="text-xs text-zinc-500 truncate">{item.desc}</div>
                      )}
                    </div>
                    <ArrowRight className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#FFCC00]' : 'text-zinc-700'}`} />
                  </button>
                );
              })}
            </div>

            <div className="hidden sm:flex items-center justify-between px-4 py-2 border-t border-white/5 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              <span>↑ ↓ navigate · ⏎ select · esc close</span>
              <span>{results.length} {results.length === 1 ? 'result' : 'results'}</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
