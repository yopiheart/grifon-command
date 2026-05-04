export const slugify = (s: string): string =>
  s.toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30) || 'audio';

const pad = (n: number) => n.toString().padStart(2, '0');

export const filenameTimestamp = (d: Date = new Date()): string =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;

export const downloadAudio = (url: string, feature: 'tts' | 'vc', voiceName: string) => {
  const filename = `grifon-${feature}-${slugify(voiceName)}-${filenameTimestamp()}.mp3`;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const STABILITY_LABELS: Record<'creative' | 'natural' | 'robust', string> = {
  creative: 'Creative — more emotion, less consistent',
  natural: 'Natural — balanced (recommended)',
  robust: 'Robust — consistent, less expressive',
};

export const TTS_TAGS = ['[whispers]', '[sighs]', '[laughs]', '[excited]', '[sad]', '[shouting]', '[chuckles]'] as const;

export const formatRelativeTime = (timestampMs: number): string => {
  const seconds = Math.floor((Date.now() - timestampMs) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const HISTORY_CAP = 20;
export const REGEN_BUDGET_PER_TAKE = 3;
