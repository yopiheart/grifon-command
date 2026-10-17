import { AudioLines, Loader2, Mic, MicOff, PhoneOff, RotateCcw, X } from 'lucide-react';
import Button from '../ui/Button';
import { LiquidGlass } from '../ui/LiquidGlass';
import type { CompanionVoiceSnapshot } from '../../services/companionVoiceSession';

export const companionVoiceLabel = (state: CompanionVoiceSnapshot) => state.status === 'connecting' ? 'Connecting…'
  : state.status === 'speaking' ? 'Speaking…' : state.status === 'responding' ? 'Responding…'
    : state.status === 'listening' ? state.muted ? 'Microphone muted' : 'Listening…' : state.status === 'error' ? 'Voice paused' : 'Voice ended';

interface Props {
  state: CompanionVoiceSnapshot;
  onMuted: (value: boolean) => void;
  onEnd: () => void;
  onRetry: () => void;
  onDismiss: () => void;
  onTranscript?: (text: string) => void;
  transcriptAction?: string;
}
export function CompanionVoiceSession({ state, onMuted, onEnd, onRetry, onDismiss, onTranscript, transcriptAction = 'Use as draft' }: Props) {
  const failed = state.status === 'error';
  const ended = state.status === 'ended';
  const latest = state.interim.assistant || state.interim.user || state.transcripts[state.transcripts.length - 1]?.text;
  const answer = [...state.transcripts].reverse().find(transcript => transcript.role === 'user');
  const tooLong = transcriptAction === 'Use as draft' && !!answer && answer.text.length > 4000;
  return <LiquidGlass data-companion-glass className="companion-live-voice rounded-2xl px-3 py-2" role="region" aria-label="Live voice chat">
    <div className="flex min-w-0 items-center gap-2">
      <div aria-hidden="true" className="companion-voice-symbol flex h-11 w-9 shrink-0 items-center justify-center">
        {state.status === 'connecting' ? <Loader2 className="h-5 w-5 motion-safe:animate-spin" /> : <AudioLines className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Live with Grifon</p>
        <p role="status" aria-live="polite" aria-atomic="true" className="text-xs text-zinc-400">{companionVoiceLabel(state)}</p>
      </div>
      {ended ? <Button variant="ghost" className="companion-icon-button min-h-11 min-w-11 !rounded-full !p-3" aria-label="Close voice review" onClick={onDismiss}><X className="h-5 w-5" /></Button> : failed ? <>
        <Button variant="ghost" className="companion-icon-button min-h-11 min-w-11 !rounded-full !p-3" aria-label="Retry live voice" disabled={state.retryAt !== null && state.retryAt > Date.now()} onClick={onRetry}><RotateCcw className="h-5 w-5" /></Button>
        <Button variant="ghost" className="companion-icon-button min-h-11 min-w-11 !rounded-full !p-3" aria-label="Close live voice" onClick={onDismiss}><X className="h-5 w-5" /></Button>
      </> : <>
        <Button variant="ghost" className="companion-icon-button min-h-11 min-w-11 !rounded-full !p-3" aria-label={state.muted ? 'Unmute live microphone' : 'Mute live microphone'} aria-pressed={state.muted} disabled={state.status === 'connecting'} onClick={() => onMuted(!state.muted)}>{state.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</Button>
        <Button variant="ghost" className="companion-voice-end min-h-11 min-w-11 !rounded-full !p-3" aria-label="End live voice" onClick={onEnd}><PhoneOff className="h-5 w-5" /></Button>
      </>}
    </div>
    {failed ? <p role="alert" className="px-1 pb-1 text-xs leading-relaxed text-zinc-300">{state.error}</p>
      : !ended && <p className="companion-voice-caption line-clamp-2 px-1 pb-1 text-xs leading-relaxed text-zinc-300">{latest || 'Speak naturally. Your typed draft is kept.'}</p>}
    <p className="px-1 text-xs leading-relaxed text-zinc-400">{ended ? 'Review the text received before the call ended. Nothing has been sent to your brief.' : 'Live audio is processed by Gemini. Voice usage applies.'}</p>
    {state.transcriptTruncated && <p className="mt-1 px-1 text-xs leading-relaxed text-zinc-400">The review keeps the first 8,000 characters of your speech. Check for missing words before using it.</p>}
    {!ended && !failed && state.interim.user.trim() && <Button variant="secondary" className="mt-2 min-h-11 !rounded-xl !px-3 !text-xs" onClick={onEnd}>End and review</Button>}
    {ended && answer && onTranscript && <div className="mt-3 px-1 text-xs"><p className="max-h-24 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed">{answer.text}</p>{tooLong && <p className="mt-2 leading-relaxed text-zinc-400">This transcript exceeds the 4,000 character message limit. Try a shorter answer.</p>}<Button variant="secondary" className="mt-2 min-h-11 !rounded-xl !px-3 !text-xs" disabled={tooLong} onClick={() => onTranscript(answer.text)}>{transcriptAction}</Button></div>}
  </LiquidGlass>;
}
