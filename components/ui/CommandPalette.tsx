import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DUR, EASE } from './motionTokens';
import { Search, X } from 'lucide-react';
import { MAT_CHROME, MAT_VEIL } from './materialTokens';

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

  const isSearching = query.trim().length > 0;

  const results = useMemo(() => {
    if (!isSearching) return items;
    return items
      .map(item => ({ item, s: score(query.trim(), item) }))
      .filter(x => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .map(x => x.item);
  }, [query, items, isSearching]);

  // Indexed view so the quick-pick tiles and the list share one keyboard-nav index space.
  const indexed = useMemo(() => results.map((item, i) => ({ item, i })), [results]);
  const tiles = useMemo(
    () => (isSearching ? [] : indexed.filter(x => x.item.group === 'Core')),
    [indexed, isSearching],
  );
  const rows = useMemo(
    () => (isSearching ? indexed : indexed.filter(x => x.item.group !== 'Core')),
    [indexed, isSearching],
  );

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
            transition={{ duration: DUR.instant }}
            onClick={onClose}
            className={`fixed inset-0 z-[100] ${MAT_VEIL}`}
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: DUR.fast, ease: EASE.out }}
            // CHROME — the palette floats above the whole app and is pure
            // control surface. Textbook functional layer.
            className={`fixed left-4 right-4 top-[12%] z-[101] mx-auto max-w-xl ${MAT_CHROME} rounded-3xl overflow-hidden`}
          >
            {/* Search */}
            <div className="flex items-center gap-3 px-5 py-4">
              <Search className="w-4 h-4 text-[#FFCC00] flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
                placeholder="Search for any tool…"
                className="bg-transparent text-white text-sm flex-1 min-w-0 outline-none placeholder:text-on-surface-sublabel"
              />
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-on-surface-sublabel bg-zinc-800/80 rounded">
                ESC
              </kbd>
              <button onClick={onClose} className="sm:hidden text-on-surface-sublabel hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[62vh] overflow-y-auto scroll-contain px-3 pb-3">
              {results.length === 0 && (
                <div className="px-4 py-10 text-center text-xs font-mono text-on-surface-sublabel uppercase tracking-widest">
                  // No matches
                </div>
              )}

              {/* Quick-pick tiles (Core modules) — hidden while searching */}
              {tiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-1 pt-1 pb-3">
                  {tiles.map(({ item, i }) => {
                    const Icon = item.icon;
                    const isActive = i === activeIdx;
                    const isDirector = item.id === 'creative_director';
                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setActiveIdx(i)}
                        onClick={() => { item.onSelect(); onClose(); }}
                        className={`flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-2xl transition-colors ${
                          isActive
                            ? 'bg-[#FFCC00]/15'
                            : isDirector
                              ? 'bg-[#FFCC00]/[0.08] hover:bg-[#FFCC00]/[0.12]'
                              : 'bg-white/[0.04] hover:bg-white/[0.08]'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive || isDirector ? 'text-[#FFCC00]' : 'text-zinc-300'}`} />
                        <span className="text-xs font-medium text-white truncate max-w-full">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Module list */}
              {rows.length > 0 && (
                <div className="space-y-0.5">
                  {rows.map(({ item, i }) => {
                    const Icon = item.icon;
                    const isActive = i === activeIdx;
                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setActiveIdx(i)}
                        onClick={() => { item.onSelect(); onClose(); }}
                        className={`w-full px-3 py-2.5 flex items-center gap-3 text-left rounded-xl transition-colors ${
                          isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#FFCC00]' : 'text-zinc-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{item.name}</div>
                          {item.desc && (
                            <div className="text-xs text-on-surface-sublabel truncate">{item.desc}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center justify-between px-5 py-2.5 text-[10px] font-mono text-on-surface-sublabel uppercase tracking-widest">
              <span>↑ ↓ navigate · ⏎ select · esc close</span>
              <span>{results.length} {results.length === 1 ? 'result' : 'results'}</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
