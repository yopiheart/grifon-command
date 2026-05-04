import { useCallback, useEffect, useRef, useState } from 'react';
import type { HistoryTake } from '../../types';
import { HISTORY_CAP, REGEN_BUDGET_PER_TAKE } from './utils';

export interface AddTakeInput {
  kind: HistoryTake['kind'];
  voiceId: string;
  voiceName: string;
  audioUrl: string;
  stabilityMode: HistoryTake['stabilityMode'];
  text?: string;
  sourceFile?: string;
  sourceLabel?: string;
}

export interface SessionHistoryApi {
  takes: HistoryTake[];
  pendingRestore: HistoryTake | null;
  addTake: (input: AddTakeInput) => string;
  replaceTakeAudio: (id: string, newAudioUrl: string) => void;
  restoreTake: (take: HistoryTake) => void;
  consumeRestore: () => void;
  removeTake: (id: string) => void;
}

export const useSessionHistory = (): SessionHistoryApi => {
  const [takes, setTakes] = useState<HistoryTake[]>([]);
  const [pendingRestore, setPendingRestore] = useState<HistoryTake | null>(null);
  const takesRef = useRef<HistoryTake[]>([]);
  takesRef.current = takes;

  const addTake = useCallback((input: AddTakeInput): string => {
    const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `take_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const next: HistoryTake = {
      ...input,
      id,
      createdAt: Date.now(),
      regensRemaining: REGEN_BUDGET_PER_TAKE,
    };
    setTakes(prev => {
      const combined = [next, ...prev];
      if (combined.length <= HISTORY_CAP) return combined;
      const dropped = combined.slice(HISTORY_CAP);
      dropped.forEach(t => {
        try { URL.revokeObjectURL(t.audioUrl); } catch { /* ignore */ }
      });
      return combined.slice(0, HISTORY_CAP);
    });
    return id;
  }, []);

  const replaceTakeAudio = useCallback((id: string, newAudioUrl: string) => {
    setTakes(prev => prev.map(t => {
      if (t.id !== id) return t;
      try { URL.revokeObjectURL(t.audioUrl); } catch { /* ignore */ }
      return { ...t, audioUrl: newAudioUrl, regensRemaining: Math.max(0, t.regensRemaining - 1) };
    }));
  }, []);

  const restoreTake = useCallback((take: HistoryTake) => {
    setPendingRestore(take);
  }, []);

  const consumeRestore = useCallback(() => setPendingRestore(null), []);

  const removeTake = useCallback((id: string) => {
    setTakes(prev => {
      const target = prev.find(t => t.id === id);
      if (target) {
        try { URL.revokeObjectURL(target.audioUrl); } catch { /* ignore */ }
      }
      return prev.filter(t => t.id !== id);
    });
  }, []);

  // Revoke all blob URLs on unmount (browser also reclaims on tab close, but
  // doing it explicitly avoids leaks when the user navigates away mid-session).
  useEffect(() => {
    return () => {
      takesRef.current.forEach(t => {
        try { URL.revokeObjectURL(t.audioUrl); } catch { /* ignore */ }
      });
    };
  }, []);

  return { takes, pendingRestore, addTake, replaceTakeAudio, restoreTake, consumeRestore, removeTake };
};
