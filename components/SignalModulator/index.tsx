import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, Mic, MessageSquare, Wand2, History } from 'lucide-react';
import { fetchVoices } from '../../services/voiceService';
import type { VoiceLibrary, HistoryTake } from '../../types';
import { useSubscription } from '../../hooks/useSubscription';
import { planAtLeast } from '../../utils/planGate';
import TextToSpeechTile from './TextToSpeechTile';
import VoiceChangerTile from './VoiceChangerTile';
import VoiceCloningTile from './VoiceCloningTile';
import SessionHistory from './SessionHistory';
import { useSessionHistory } from './useSessionHistory';

type Tile = 'tts' | 'vc' | 'clone';

interface SignalModulatorProps {
  onBack: () => void;
  globalScript?: string[];
}

const EMPTY_LIBRARY: VoiceLibrary = { stockVoices: [], myVoices: [], libraryVoices: [], quotaUsed: 0, quotaMax: 1 };

const SignalModulator: React.FC<SignalModulatorProps> = ({ onBack, globalScript = [] }) => {
  const [activeTile, setActiveTile] = useState<Tile>('tts');
  const [library, setLibrary] = useState<VoiceLibrary>(EMPTY_LIBRARY);
  const [librarLoading, setLibraryLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { plan_id, loading: subLoading } = useSubscription();
  const canClone = !subLoading && planAtLeast(plan_id, 'creator');
  const history = useSessionHistory();

  const refreshLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const lib = await fetchVoices();
      setLibrary(lib);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => { refreshLibrary(); }, [refreshLibrary]);

  // When the user clicks RESTORE on a take, switch to the matching tile so
  // the restore payload lands in the right form. The tile itself consumes
  // pendingRestore via useEffect.
  const handleRestore = useCallback((take: HistoryTake) => {
    setActiveTile(take.kind === 'tts' ? 'tts' : 'vc');
    history.restoreTake(take);
    setHistoryOpen(false);
  }, [history]);

  const tabBtn = (id: Tile, label: string, Icon: typeof Mic) => (
    <button
      type="button"
      onClick={() => setActiveTile(id)}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTile === id ? 'bg-[#FFCC00] text-black' : 'text-zinc-500 hover:text-white'}`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col p-4 sm:p-8">
      <header className="flex flex-col items-start gap-4 mb-8 w-full border-b border-white/10 pb-6 relative">
        <div className="flex items-center justify-between w-full">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />{' '}
            <span className="hidden md:inline">COMMAND CENTER</span>
            <span className="md:hidden">BACK</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:border-[#FFCC00]/40 hover:text-[#FFCC00] text-[10px] font-mono text-zinc-400 uppercase tracking-widest transition-colors"
              title="View this session's takes"
            >
              <History className="w-3.5 h-3.5" />
              <span>// LOG</span>
              {history.takes.length > 0 && (
                <span className="bg-[#FFCC00] text-black px-1.5 rounded text-[9px] font-bold">
                  {history.takes.length}
                </span>
              )}
            </button>
            <div className="hidden md:flex items-center gap-4 text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
              // FREQUENCY LOCKED
            </div>
          </div>
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 uppercase tracking-tight break-words whitespace-normal leading-tight">
            SIGNAL MODULATOR <span className="text-[#FFCC00]">// AUDIO CORE</span>
          </h1>
        </div>
      </header>

      <div className="flex justify-center mb-8">
        <div className="bg-zinc-900 border border-white/10 p-1 rounded-xl flex gap-1 flex-wrap">
          {tabBtn('tts', 'TEXT-TO-SPEECH', MessageSquare)}
          {tabBtn('vc', 'VOICE CHANGER', Mic)}
          {canClone && tabBtn('clone', 'VOICE CLONING', Wand2)}
        </div>
      </div>

      {activeTile === 'tts' && (
        <TextToSpeechTile
          library={library}
          globalScript={globalScript}
          history={history}
        />
      )}
      {activeTile === 'vc' && (
        <VoiceChangerTile
          library={library}
          history={history}
        />
      )}
      {activeTile === 'clone' && canClone && (
        <VoiceCloningTile library={library} onLibraryRefresh={refreshLibrary} />
      )}

      {librarLoading && (
        <p className="text-center text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-4">
          // LOADING_VOICE_LIBRARY
        </p>
      )}

      <SessionHistory
        open={historyOpen}
        takes={history.takes}
        onClose={() => setHistoryOpen(false)}
        onRestore={handleRestore}
        onRemove={history.removeTake}
      />
    </div>
  );
};

export default SignalModulator;
