import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, Mic, MessageSquare, Wand2 } from 'lucide-react';
import { fetchVoices } from '../../services/voiceService';
import type { VoiceLibrary } from '../../types';
import TextToSpeechTile from './TextToSpeechTile';
import VoiceChangerTile from './VoiceChangerTile';
import VoiceCloningTile from './VoiceCloningTile';

type Tile = 'tts' | 'vc' | 'clone';

interface SignalModulatorProps {
  onBack: () => void;
  globalScript?: string[];
}

const EMPTY_LIBRARY: VoiceLibrary = { stockVoices: [], myVoices: [], libraryVoices: [], quotaUsed: 0, quotaMax: 1 };

const SignalModulator: React.FC<SignalModulatorProps> = ({ onBack, globalScript = [] }) => {
  const [activeTile, setActiveTile] = useState<Tile>('tts');
  const [library, setLibrary] = useState<VoiceLibrary>(EMPTY_LIBRARY);
  const [isAdmin, setIsAdmin] = useState(false);
  const [librarLoading, setLibraryLoading] = useState(true);

  useEffect(() => {
    setIsAdmin(typeof window !== 'undefined' && window.localStorage.getItem('grifon_admin') === 'true');
  }, []);

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
          <div className="hidden md:flex items-center gap-4 text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
            // FREQUENCY LOCKED
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
          {isAdmin && tabBtn('clone', 'VOICE CLONING', Wand2)}
        </div>
      </div>

      {activeTile === 'tts' && <TextToSpeechTile library={library} globalScript={globalScript} />}
      {activeTile === 'vc' && <VoiceChangerTile library={library} />}
      {activeTile === 'clone' && isAdmin && (
        <VoiceCloningTile library={library} onLibraryRefresh={refreshLibrary} />
      )}

      {librarLoading && (
        <p className="text-center text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-4">
          // LOADING_VOICE_LIBRARY
        </p>
      )}
    </div>
  );
};

export default SignalModulator;
