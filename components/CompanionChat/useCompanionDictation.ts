import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

interface SpeechResult {
  isFinal: boolean;
  readonly [index: number]: { transcript: string };
}
interface SpeechResultEvent { results: ArrayLike<SpeechResult>; }
interface BrowserRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionConstructor = new () => BrowserRecognition;
const errors: Record<string, string> = {
  'not-allowed': 'Microphone permission was denied. You can keep typing.',
  'service-not-allowed': 'Your browser could not enable voice input. You can keep typing.',
  'audio-capture': 'No microphone is available. You can keep typing.',
  'network': 'Voice input lost its connection. You can keep typing.',
  'no-speech': 'No speech was heard. Try again or keep typing.',
  'language-not-supported': 'Voice input does not support this language. You can keep typing.',
};

export function useCompanionDictation(input: RefObject<HTMLTextAreaElement>, text: string, update: (value: string) => void, disabled: boolean, scope: string) {
  const [listening, setListening] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [used, setUsed] = useState(false);
  const current = useRef({ text, update, disabled, scope });
  current.current = { text, update, disabled, scope };
  const session = useRef<BrowserRecognition | null>(null);
  const epoch = useRef(0);
  const mounted = useRef(true);

  const detach = (recognition: BrowserRecognition) => {
    recognition.onstart = null; recognition.onresult = null;
    recognition.onerror = null; recognition.onend = null;
  };
  const abort = useCallback((message?: string, error = false) => {
    epoch.current++;
    const recognition = session.current;
    session.current = null;
    if (recognition) {
      detach(recognition);
      try { recognition.abort(); } catch { /* A finished browser session needs no further cleanup. */ }
    }
    if (mounted.current) {
      setListening(false); setStopping(false);
      if (message && (recognition || error)) setNotice({ text: message, error });
      else if (recognition) setNotice({ text: 'Voice input stopped.', error: false });
    }
  }, []);
  const blocked = () => current.current.disabled || document.hidden || !!input.current?.closest('[inert]');

  useEffect(() => {
    mounted.current = true;
    const visibility = () => { if (document.hidden) abort('Voice input stopped. Your draft is kept.'); };
    document.addEventListener('visibilitychange', visibility);
    // Shell navigation marks an ancestor inert before awaiting persistence.
    const observer = new MutationObserver(() => abort('Voice input stopped. Your draft is kept.'));
    for (let node = input.current?.parentElement; node; node = node.parentElement) observer.observe(node, { attributes: true, attributeFilter: ['inert'] });
    return () => {
      mounted.current = false;
      observer.disconnect(); document.removeEventListener('visibilitychange', visibility); abort();
    };
  }, [abort, input]);
  useEffect(() => { if (session.current) abort('Voice input stopped. Your draft is kept.'); }, [disabled, scope, abort]);

  const start = () => {
    if (blocked() || session.current) return;
    setUsed(true);
    const browser = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const Recognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice({ text: 'Voice input is unavailable in this browser. You can keep typing.', error: false }); return;
    }
    const token = ++epoch.current;
    const identity = current.current.scope;
    const base = current.current.text;
    let recognition: BrowserRecognition;
    const valid = () => {
      if (epoch.current !== token || session.current !== recognition) return false;
      if (blocked() || current.current.scope !== identity) { abort('Voice input stopped. Your draft is kept.'); return false; }
      return true;
    };
    try {
      recognition = new Recognition(); session.current = recognition;
      recognition.continuous = true; recognition.interimResults = true;
      recognition.lang = document.documentElement.lang || navigator.language || 'en-US';
      recognition.maxAlternatives = 1;
      recognition.onstart = () => { if (valid()) { setListening(true); setNotice({ text: 'Listening… Review your draft before sending.', error: false }); } };
      recognition.onresult = event => {
        if (!valid()) return;
        // The browser's complete result list replaces earlier interim words.
        const words = Array.from(event.results, result => result[0]?.transcript.trim() ?? '').filter(Boolean).join(' ');
        const value = base + (base && words && !/\s$/.test(base) ? ' ' : '') + words;
        current.current.update(value.slice(0, 4000));
        if (value.length > 4000) abort('Your draft is full. Edit it before adding more voice input.');
      };
      recognition.onerror = event => { if (valid()) abort(errors[event.error] ?? 'Voice input could not finish. You can keep typing.', true); };
      recognition.onend = () => {
        if (!valid()) return;
        detach(recognition); session.current = null; epoch.current++;
        setListening(false); setStopping(false);
        setNotice({ text: 'Voice input stopped. Review your draft before sending.', error: false });
      };
      setListening(true); setStopping(false);
      setNotice({ text: 'Starting voice input…', error: false });
      recognition.start();
    } catch { abort('Voice input could not start. Check microphone permission or keep typing.', true); }
  };
  const stop = () => {
    if (!session.current || stopping) return;
    if (blocked()) { abort('Voice input stopped. Your draft is kept.'); return; }
    setStopping(true); setNotice({ text: 'Finishing voice input…', error: false });
    try { session.current.stop(); }
    catch { abort('Voice input stopped. Your draft is kept.'); }
  };
  return { listening, stopping, notice, used, start, stop, abort };
}
