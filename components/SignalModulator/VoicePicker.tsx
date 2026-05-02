import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Play, Pause, User, Sparkles, X } from 'lucide-react';
import type { VoiceLibrary, StockVoice, UserVoice } from '../../types';
import { PINOY_READY_VOICE_IDS } from './pinoyReady';

interface VoicePickerProps {
  library: VoiceLibrary;
  value: string;
  onChange: (voiceId: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

interface GroupedStock {
  language: string;
  voices: StockVoice[];
}

interface FilterState {
  language: string | null;
  gender: string | null;
  age: string | null;
  accent: string | null;
}

const EMPTY_FILTERS: FilterState = { language: null, gender: null, age: null, accent: null };

const labelOf = (v: StockVoice, key: 'language' | 'gender' | 'age' | 'accent'): string | null => {
  const raw = v.labels?.[key];
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
};

const groupStockByLanguage = (voices: StockVoice[]): GroupedStock[] => {
  const groups = new Map<string, StockVoice[]>();
  for (const v of voices) {
    const lang = labelOf(v, 'language') || 'Other';
    const arr = groups.get(lang) ?? [];
    arr.push(v);
    groups.set(lang, arr);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === 'english') return -1;
      if (b === 'english') return 1;
      return a.localeCompare(b);
    })
    .map(([language, voices]) => ({ language, voices }));
};

export const VoicePicker: React.FC<VoicePickerProps> = ({ library, value, onChange, loading, disabled }) => {
  const [open, setOpen] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const allVoices = useMemo(
    () => [
      ...library.myVoices.map(v => ({ ...v, _kind: 'mine' as const })),
      ...library.libraryVoices.map(v => ({ ...v, _kind: 'library' as const })),
      ...library.stockVoices.map(v => ({ ...v, _kind: 'stock' as const })),
    ],
    [library]
  );
  const selected = allVoices.find(v => v.voice_id === value);

  const filterOptions = useMemo(() => {
    const langs = new Set<string>();
    const genders = new Set<string>();
    const ages = new Set<string>();
    const accents = new Set<string>();
    for (const v of library.stockVoices) {
      const l = labelOf(v, 'language'); if (l) langs.add(l);
      const g = labelOf(v, 'gender');   if (g) genders.add(g);
      const a = labelOf(v, 'age');      if (a) ages.add(a);
      const ac = labelOf(v, 'accent');  if (ac) accents.add(ac);
    }
    return {
      language: Array.from(langs).sort(),
      gender: Array.from(genders).sort(),
      age: Array.from(ages).sort(),
      accent: Array.from(accents).sort(),
    };
  }, [library.stockVoices]);

  const filteredStock = useMemo(() => {
    return library.stockVoices.filter(v => {
      if (filters.language && labelOf(v, 'language') !== filters.language) return false;
      if (filters.gender   && labelOf(v, 'gender')   !== filters.gender)   return false;
      if (filters.age      && labelOf(v, 'age')      !== filters.age)      return false;
      if (filters.accent   && labelOf(v, 'accent')   !== filters.accent)   return false;
      return true;
    });
  }, [library.stockVoices, filters]);

  const stockGroups = useMemo(() => groupStockByLanguage(filteredStock), [filteredStock]);

  const pinoyReady = useMemo(() => {
    if (PINOY_READY_VOICE_IDS.length === 0) return [];
    const idSet = new Set(PINOY_READY_VOICE_IDS);
    const byId = new Map(library.stockVoices.map(v => [v.voice_id, v]));
    return PINOY_READY_VOICE_IDS.map(id => byId.get(id)).filter((v): v is StockVoice => Boolean(v && idSet.has(v.voice_id)));
  }, [library.stockVoices]);

  const hasActiveFilter = Boolean(filters.language || filters.gender || filters.age || filters.accent);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const togglePreview = (voiceId: string, previewUrl?: string) => {
    if (!previewUrl) return;
    if (previewing === voiceId) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPreviewing(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    audio.onended = () => setPreviewing(null);
    audio.play().catch(() => setPreviewing(null));
    setPreviewing(voiceId);
  };

  const renderRow = (
    voice: { voice_id: string; name: string; preview_url?: string },
    kind: 'mine' | 'stock'
  ) => {
    const isSelected = voice.voice_id === value;
    const isPlaying = previewing === voice.voice_id;
    return (
      <div
        key={voice.voice_id}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isSelected ? 'bg-[#FFCC00]/10 border border-[#FFCC00]/30' : 'border border-transparent hover:bg-white/5'}`}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); togglePreview(voice.voice_id, voice.preview_url); }}
          disabled={!voice.preview_url}
          className="w-7 h-7 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center hover:border-[#FFCC00]/40 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
        >
          {isPlaying ? <Pause className="w-3 h-3 text-[#FFCC00]" /> : <Play className="w-3 h-3 text-zinc-300" />}
        </button>
        <button
          type="button"
          onClick={() => { onChange(voice.voice_id); setOpen(false); }}
          className="flex-1 text-left text-sm text-zinc-200 truncate"
        >
          {voice.name}
          {kind === 'mine' && (
            <span className="ml-2 text-[9px] font-mono text-[#FFCC00] uppercase tracking-widest">// MINE</span>
          )}
        </button>
      </div>
    );
  };

  const filterSelectClass = 'bg-zinc-950 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-mono text-zinc-300 uppercase tracking-widest focus:outline-none focus:border-[#FFCC00]/40';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen(o => !o)}
        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-left flex items-center justify-between hover:border-[#FFCC00]/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-2 truncate">
          {selected ? (
            <>
              {(selected as any)._kind === 'mine'
                ? <User className="w-4 h-4 text-[#FFCC00] shrink-0" />
                : <Sparkles className="w-4 h-4 text-zinc-500 shrink-0" />}
              <span className="text-sm font-medium text-white truncate">{selected.name}</span>
            </>
          ) : (
            <span className="text-sm text-zinc-500">{loading ? 'Loading voices…' : 'Select a voice'}</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full max-h-96 overflow-y-auto bg-zinc-900 border border-white/10 rounded-xl shadow-2xl">
          <div className="sticky top-0 bg-zinc-900 border-b border-white/10 p-2 z-10">
            <div className="grid grid-cols-2 gap-2">
              <select
                className={filterSelectClass}
                value={filters.language ?? ''}
                onChange={(e) => setFilters(f => ({ ...f, language: e.target.value || null }))}
              >
                <option value="">// LANGUAGE · ALL</option>
                {filterOptions.language.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select
                className={filterSelectClass}
                value={filters.gender ?? ''}
                onChange={(e) => setFilters(f => ({ ...f, gender: e.target.value || null }))}
              >
                <option value="">// GENDER · ALL</option>
                {filterOptions.gender.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <select
                className={filterSelectClass}
                value={filters.age ?? ''}
                onChange={(e) => setFilters(f => ({ ...f, age: e.target.value || null }))}
              >
                <option value="">// AGE · ALL</option>
                {filterOptions.age.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select
                className={filterSelectClass}
                value={filters.accent ?? ''}
                onChange={(e) => setFilters(f => ({ ...f, accent: e.target.value || null }))}
              >
                <option value="">// ACCENT · ALL</option>
                {filterOptions.accent.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="mt-2 flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-[#FFCC00] uppercase tracking-widest"
              >
                <X className="w-3 h-3" /> CLEAR_FILTERS
              </button>
            )}
          </div>

          <div className="p-2 space-y-3">
            {library.libraryVoices.length > 0 && !hasActiveFilter && (
              <div>
                <div className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-widest px-3 py-1.5">
                  // FILIPINO_LIBRARY
                </div>
                <div className="space-y-1">
                  {library.libraryVoices.map(v => renderRow(v, 'stock'))}
                </div>
              </div>
            )}

            {pinoyReady.length > 0 && !hasActiveFilter && (
              <div>
                <div className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-widest px-3 py-1.5">
                  // PINOY-READY
                </div>
                <div className="space-y-1">
                  {pinoyReady.map(v => renderRow(v, 'stock'))}
                </div>
              </div>
            )}

            {library.myVoices.length > 0 && (
              <div>
                <div className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-widest px-3 py-1.5">
                  // MY_VOICES
                </div>
                <div className="space-y-1">
                  {library.myVoices.map((v: UserVoice) => renderRow(v, 'mine'))}
                </div>
              </div>
            )}

            {stockGroups.map(group => (
              <div key={group.language}>
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest px-3 py-1.5">
                  // STOCK · {group.language.toUpperCase()}
                </div>
                <div className="space-y-1">
                  {group.voices.map(v => renderRow(v, 'stock'))}
                </div>
              </div>
            ))}

            {stockGroups.length === 0 && library.myVoices.length === 0 && library.libraryVoices.length === 0 && pinoyReady.length === 0 && (
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest px-3 py-4 text-center">
                {hasActiveFilter ? '// NO_MATCHES — TRY_CLEARING_FILTERS' : '// NO_VOICES_AVAILABLE'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoicePicker;
