import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp, AudioLines, Loader2, Mic, Plus, Square } from 'lucide-react';
import Button from '../ui/Button';
import { LiquidGlass } from '../ui/LiquidGlass';
import { GlassPanel } from '../ui/GlassPanel';
import { useCompanionDictation } from './useCompanionDictation';

export interface CompanionComposerHandle {
  clear: () => void;
  focus: () => void;
  useVoiceDraft: (text: string) => void;
}

interface Props {
  initialText?: string;
  onTextChange?: (text: string) => void;
  disabled: boolean;
  voiceDisabled?: boolean;
  voiceScope?: string;
  onLiveVoice?: () => void;
  liveVoiceDisabled?: boolean;
  sendDisabled: boolean;
  uploading: boolean;
  allowAttachment: boolean;
  placeholder: string;
  onAttach: () => void;
  onSend: (text: string) => boolean;
  onDraftPresence: (present: boolean) => void;
}

// Keystrokes stay here; the conversation only needs the empty/nonempty reaction edge.
export const CompanionComposer = forwardRef<CompanionComposerHandle, Props>(function CompanionComposer(
  { initialText = '', onTextChange, disabled, voiceDisabled = disabled, voiceScope = '', onLiveVoice, liveVoiceDisabled = voiceDisabled, sendDisabled, uploading, allowAttachment, placeholder, onAttach, onSend, onDraftPresence }, ref,
) {
  const [text, setText] = useState(initialText);
  const [voiceDraft, setVoiceDraft] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const present = useRef(!!initialText.trim());
  const composing = useRef(false);
  const update = (value: string) => {
    setText(value); onTextChange?.(value);
    const next = !!value.trim();
    if (present.current !== next) { present.current = next; onDraftPresence(next); }
  };
  const voice = useCompanionDictation(input, text, update, voiceDisabled || uploading, voiceScope);
  useLayoutEffect(() => {
    const node = input.current;
    if (!node) return;
    const resize = () => {
      node.style.height = '0px';
      const height = node.scrollHeight;
      node.style.height = `${Math.max(44, Math.min(128, height))}px`;
      node.style.overflowY = height > 128 ? 'auto' : 'hidden';
    };
    resize();
    let width = node.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const next = node.getBoundingClientRect().width;
      if (next !== width) { width = next; resize(); }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [text]);
  useImperativeHandle(ref, () => ({
    clear: () => { voice.abort(); setVoiceDraft(null); update(''); },
    focus: () => input.current?.focus(),
    useVoiceDraft: value => {
      voice.abort();
      if (!value.trim() || value.length > 4000) return;
      if (text.trim()) setVoiceDraft(value);
      else { update(value); window.requestAnimationFrame(() => input.current?.focus()); }
    },
  }));
  const send = () => {
    if (disabled || sendDisabled || composing.current || !text.trim()) return;
    voice.abort();
    if (onSend(text)) { update(''); input.current?.focus(); }
  };

  return <>
  <LiquidGlass data-companion-glass className="companion-composer flex items-end gap-1 rounded-full border border-white/10 p-1.5">
    {allowAttachment && <Button variant="ghost" className="companion-icon-button min-h-11 min-w-11 !rounded-xl !p-3" aria-label="Attach product photo" disabled={disabled} onClick={onAttach}>
      {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
    </Button>}
    <textarea ref={input} aria-label="Message Grifon" aria-describedby={`companion-save-status${voice.used ? ' companion-voice-help' : ''}`} placeholder={placeholder}
      value={text} onChange={event => { voice.abort(); update(event.target.value); }} disabled={disabled} maxLength={4000} rows={1}
      onCompositionStart={() => { voice.abort(); composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
      onKeyDown={event => {
        if (event.key === 'Enter' && !event.shiftKey && !composing.current && !event.nativeEvent.isComposing && event.keyCode !== 229) {
          event.preventDefault(); send();
        }
      }}
      className="companion-message-input min-h-11 max-h-32 min-w-0 flex-1 resize-none bg-transparent px-1 py-3 text-white outline-none placeholder:text-zinc-300 disabled:opacity-50" />
    <Button variant="ghost" className="companion-icon-button min-h-11 min-w-11 !rounded-xl !p-3" aria-label={voice.listening ? 'Stop voice input' : 'Start voice input'} aria-describedby="companion-voice-help" aria-pressed={voice.listening} disabled={voiceDisabled || uploading || voice.stopping} onClick={voice.listening ? voice.stop : voice.start}>
      {voice.listening ? <Square className="h-4 w-4 text-[#FFCC00]" /> : <Mic className="h-5 w-5" />}
    </Button>
    {onLiveVoice && <Button variant="ghost" className="companion-icon-button companion-live-start min-h-11 min-w-11 !rounded-xl !p-3" aria-label="Start live voice chat" disabled={liveVoiceDisabled || uploading} onClick={() => { voice.abort(); input.current?.blur(); onLiveVoice(); }}><AudioLines className="h-5 w-5" /></Button>}
    <Button className="companion-send min-h-11 min-w-11 !rounded-xl !p-3" aria-label="Send" disabled={disabled || sendDisabled || !text.trim()} onClick={send}>
      <ArrowUp className="h-5 w-5" />
    </Button>
  </LiquidGlass>
  <p id="companion-voice-help" className={voice.used ? 'companion-footer-note mt-2 text-center text-xs leading-relaxed' : 'sr-only'}>Voice input uses your browser and may be processed online. Review before sending.</p>
  {voice.notice && <p role={voice.notice.error ? 'alert' : 'status'} className="companion-footer-note mt-1 text-center text-xs leading-relaxed">{voice.notice.text}</p>}
  {voiceDraft !== null && <GlassPanel role="region" aria-label="Review voice draft" className="companion-voice-draft mt-2 p-3">
    <p className="text-xs leading-relaxed text-zinc-300">Replace your typed draft with this voice transcript? Nothing is sent yet.</p>
    <p className="mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap break-words text-sm">{voiceDraft}</p>
    <div className="mt-2 flex flex-wrap gap-2"><Button variant="secondary" className="min-h-11 !rounded-xl !px-3 !text-sm" onClick={() => { update(voiceDraft); setVoiceDraft(null); input.current?.focus(); }}>Replace draft</Button><Button variant="ghost" className="min-h-11 !rounded-xl !px-3 !text-sm" onClick={() => { setVoiceDraft(null); input.current?.focus(); }}>Keep typed draft</Button></div>
  </GlassPanel>}
  </>;
});
