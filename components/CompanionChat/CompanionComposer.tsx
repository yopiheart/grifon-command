import { forwardRef, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState, type FocusEvent, type PointerEvent, type SyntheticEvent } from 'react';
import { ArrowUp, Loader2, Mic, Plus, Square } from 'lucide-react';
import Button from '../ui/Button';
import { LiquidGlass } from '../ui/LiquidGlass';
import { useCompanionDictation } from './useCompanionDictation';

export interface CompanionComposerHandle {
  clear: () => void;
  focus: () => void;
}

interface Props {
  initialText?: string;
  onTextChange?: (text: string) => void;
  disabled: boolean;
  voiceDisabled?: boolean;
  voiceScope?: string;
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
  { initialText = '', onTextChange, disabled, voiceDisabled = disabled, voiceScope = '', sendDisabled, uploading, allowAttachment, placeholder, onAttach, onSend, onDraftPresence }, ref,
) {
  const [text, setText] = useState(initialText);
  const [tooltip, setTooltip] = useState<{ label: string; left: number } | null>(null);
  const tooltipId = useId();
  const controls = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLSpanElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const present = useRef(!!initialText.trim());
  const composing = useRef(false);
  const update = (value: string) => {
    setText(value); onTextChange?.(value);
    const next = !!value.trim();
    if (present.current !== next) { present.current = next; onDraftPresence(next); }
  };
  const voice = useCompanionDictation(input, text, update, voiceDisabled || uploading, voiceScope);
  useEffect(() => { setTooltip(null); }, [text, disabled, uploading, voice.listening]);
  useEffect(() => {
    if (!tooltip) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setTooltip(null); };
    const resize = () => setTooltip(null);
    document.addEventListener('keydown', escape); window.addEventListener('resize', resize);
    return () => { document.removeEventListener('keydown', escape); window.removeEventListener('resize', resize); };
  }, [tooltip]);
  useLayoutEffect(() => {
    if (!tooltip || !hint.current || !controls.current) return;
    const half = hint.current.getBoundingClientRect().width / 2;
    const left = Math.max(half, Math.min(controls.current.clientWidth - half, tooltip.left));
    if (left !== tooltip.left) setTooltip({ ...tooltip, left });
  }, [tooltip]);
  const showTooltip = (event: SyntheticEvent<HTMLButtonElement>, label: string) => {
    const button = event.currentTarget.getBoundingClientRect(), bounds = controls.current?.getBoundingClientRect();
    if (bounds) setTooltip({ label, left: button.x + button.width / 2 - bounds.x });
  };
  const tooltipProps = (label: string) => ({
    'aria-describedby': tooltip?.label === label ? tooltipId : undefined,
    onPointerEnter: (event: PointerEvent<HTMLButtonElement>) => { if (event.pointerType === 'mouse' && window.matchMedia('(hover: hover)').matches) showTooltip(event, label); },
    onPointerLeave: () => setTooltip(null), onPointerDown: () => setTooltip(null), onBlur: () => setTooltip(null),
    onFocus: (event: FocusEvent<HTMLButtonElement>) => { if (event.currentTarget.matches(':focus-visible')) showTooltip(event, label); },
  });
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
    clear: () => { voice.abort(); update(''); },
    focus: () => input.current?.focus(),
  }));
  const send = () => {
    if (disabled || sendDisabled || composing.current || !text.trim()) return;
    setTooltip(null);
    voice.abort();
    if (onSend(text)) { update(''); input.current?.focus(); }
  };

  return <>
  <div ref={controls} className="companion-composer-controls">
  <LiquidGlass data-companion-glass className="companion-composer flex items-end gap-1 rounded-full border border-white/10 p-1.5">
    {allowAttachment && <Button {...tooltipProps('Attach product photo')} variant="ghost" className="companion-icon-button min-h-11 min-w-11 !rounded-xl !p-3" aria-label="Attach product photo" disabled={disabled} onClick={() => { setTooltip(null); onAttach(); }}>
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
    <Button {...tooltipProps(voice.listening ? 'Stop voice input' : 'Start voice input')} variant="ghost" className="companion-icon-button min-h-11 min-w-11 !rounded-xl !p-3" aria-label={voice.listening ? 'Stop voice input' : 'Start voice input'} aria-describedby={`companion-voice-help${tooltip?.label === (voice.listening ? 'Stop voice input' : 'Start voice input') ? ` ${tooltipId}` : ''}`} aria-pressed={voice.listening} disabled={voiceDisabled || uploading || voice.stopping} onClick={() => { setTooltip(null); if (voice.listening) voice.stop(); else voice.start(); }}>
      {voice.listening ? <Square className="h-4 w-4 text-[#FFCC00]" /> : <Mic className="h-5 w-5" />}
    </Button>
    {!!text.trim() && <Button {...tooltipProps('Send')} className="companion-send grid min-h-11 min-w-11 w-11 shrink-0 place-items-center !rounded-xl !p-0" aria-label="Send" disabled={disabled || sendDisabled || !text.trim()} onClick={send}>
      <ArrowUp className="h-5 w-5" />
    </Button>}
  </LiquidGlass>
  {tooltip && <span ref={hint} id={tooltipId} role="tooltip" className="companion-composer-tooltip" style={{ left: tooltip.left }}>{tooltip.label}</span>}
  </div>
  <p id="companion-voice-help" className={voice.used ? 'companion-footer-note mt-2 text-center text-xs leading-relaxed' : 'sr-only'}>Voice input uses your browser and may be processed online. Review before sending.</p>
  {voice.notice && <p role={voice.notice.error ? 'alert' : 'status'} className="companion-footer-note mt-1 text-center text-xs leading-relaxed">{voice.notice.text}</p>}
  </>;
});
