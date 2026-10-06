import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { ArrowUp, Loader2, Paperclip } from 'lucide-react';
import Button from '../ui/Button';
import { MAT_PLATE } from '../ui/materialTokens';

export interface CompanionComposerHandle {
  clear: () => void;
  focus: () => void;
}

interface Props {
  disabled: boolean;
  uploading: boolean;
  allowAttachment: boolean;
  placeholder: string;
  onAttach: () => void;
  onSend: (text: string) => boolean;
  onDraftPresence: (present: boolean) => void;
}

// Keystrokes stay here; the conversation only needs the empty/nonempty reaction edge.
export const CompanionComposer = forwardRef<CompanionComposerHandle, Props>(function CompanionComposer(
  { disabled, uploading, allowAttachment, placeholder, onAttach, onSend, onDraftPresence }, ref,
) {
  const [text, setText] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  const present = useRef(false);
  const composing = useRef(false);
  const update = (value: string) => {
    setText(value);
    const next = !!value.trim();
    if (present.current !== next) { present.current = next; onDraftPresence(next); }
  };
  useImperativeHandle(ref, () => ({ clear: () => update(''), focus: () => input.current?.focus() }));
  const send = () => {
    if (disabled || composing.current || !text.trim()) return;
    if (onSend(text)) { update(''); input.current?.focus(); }
  };

  return <div className={`${MAT_PLATE} companion-composer flex items-end gap-2 rounded-2xl border border-white/10 p-2`}>
    {allowAttachment && <Button variant="ghost" className="companion-icon-button min-h-11 min-w-11 !rounded-xl !p-3" aria-label="Attach product photo" disabled={disabled} onClick={onAttach}>
      {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
    </Button>}
    <textarea ref={input} aria-label="Message Grifon" aria-describedby="companion-save-status" placeholder={placeholder}
      value={text} onChange={event => update(event.target.value)} disabled={disabled} maxLength={4000} rows={2}
      onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
      onKeyDown={event => {
        if (event.key === 'Enter' && !event.shiftKey && !composing.current && !event.nativeEvent.isComposing && event.keyCode !== 229) {
          event.preventDefault(); send();
        }
      }}
      className="companion-message-input min-h-11 max-h-32 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 leading-relaxed text-white outline-none placeholder:text-zinc-400 disabled:opacity-50" />
    <Button className="companion-send min-h-11 min-w-11 !rounded-xl !p-3" aria-label="Send" disabled={disabled || !text.trim()} onClick={send}>
      <ArrowUp className="h-5 w-5" />
    </Button>
  </div>;
});
