import type { ProductionInput } from './oneShotIntake';
import type { LockablePresetId } from '../types';
import { RECOMMENDED_VOICES } from '../components/SignalModulator/pinoyReady';

export interface CompanionMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: number;
}

export interface CompanionDraft {
  version: 1;
  brief: string;
  brandName: string;
  productName: string;
  offer: string;
  price: string;
  heroImageBase64: string;
  imageName: string;
  language: 'English' | 'Taglish';
  aspectRatio: '9:16' | '16:9' | '1:1';
  voiceId: string;
  messages: CompanionMessage[];
}

const FIELDS = ['brief', 'brandName', 'productName', 'offer', 'price'] as const;
export type CompanionField = typeof FIELDS[number];
const QUESTIONS: Record<CompanionField, string> = {
  brief: 'What product are we making an ad for? Tell me about your audience and what you want the ad to achieve.',
  brandName: 'What is the brand name? I will keep its exact spelling.',
  productName: 'What is the product called?',
  offer: 'What offer or benefit should the ad focus on?',
  price: 'What is the price or promotion? If there is no public price, say “No public price.”',
};

export const companionMessage = (role: CompanionMessage['role'], text: string): CompanionMessage => ({
  id: crypto.randomUUID(), role, text, at: Date.now(),
});

export function createCompanionDraft(): CompanionDraft {
  return {
    version: 1, brief: '', brandName: '', productName: '', offer: '', price: '',
    heroImageBase64: '', imageName: '', language: 'English', aspectRatio: '9:16',
    voiceId: RECOMMENDED_VOICES[0].id,
    messages: [companionMessage('assistant', QUESTIONS.brief)],
  };
}

export function nextCompanionField(draft: CompanionDraft): CompanionField | null {
  return FIELDS.find(field => !draft[field].trim()) ?? null;
}

export function companionQuestion(draft: CompanionDraft): string {
  const field = nextCompanionField(draft);
  return field ? QUESTIONS[field] : 'Your brief is ready to review. Add a clear product photo, check the preferences, then choose Generate storyboard.';
}

export function acceptCompanionAnswer(draft: CompanionDraft, text: string): CompanionDraft {
  const field = nextCompanionField(draft);
  if (!field) throw new Error('Your brief is complete. Use Edit brief to change a detail.');
  const value = text.trim();
  const maximum = field === 'brief' ? 4000 : field === 'offer' ? 2000 : 200;
  if (!value || value.length > maximum) throw new Error(`Enter between 1 and ${maximum} characters.`);
  const next = { ...draft, [field]: value };
  next.messages = [...draft.messages, companionMessage('user', value), companionMessage('assistant', companionQuestion(next))].slice(-120);
  return next;
}

export function buildCompanionInput(draft: CompanionDraft): ProductionInput {
  if (nextCompanionField(draft)) throw new Error('Finish your brief before generating.');
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(draft.heroImageBase64)) throw new Error('Add a product photo first.');
  const voice = RECOMMENDED_VOICES.find(item => item.id === draft.voiceId);
  if (!voice) throw new Error('Choose a voice from the list.');
  return {
    brandName: draft.brandName.trim(), productName: draft.productName.trim(),
    productDescription: draft.brief.trim(), offer: draft.offer.trim(), price: draft.price.trim(),
    heroImageBase64: draft.heroImageBase64,
    language: draft.language, aspectRatio: draft.aspectRatio, voiceId: draft.voiceId,
    scriptType: 'Testimonial', businessType: 'product',
    avatar: { url: '', description: '', ethnicity: '', gender: 'Any', prompt: '' },
    castHints: { gender: voice.gender === 'male' ? 'Male' : 'Female', ageRange: '', ethnicity: '' },
  };
}

export function parseCompanionRevision(text: string): { kind: 'reshoot'; sceneIndex: number } | { kind: 'preset'; preset: LockablePresetId | null } | null {
  const normalized = text.trim().toLowerCase();
  const reshoot = /^(?:reshoot|redo)(?: scene)? ([1-9]\d*)[.!]?$/.exec(normalized);
  if (reshoot) return { kind: 'reshoot', sceneIndex: Number(reshoot[1])-1 };
  const style = /^(?:style|preset) (raw|auto|impact|clean|punch|bars|spotlight)[.!]?$/.exec(normalized);
  if (!style) return null;
  return { kind: 'preset', preset: style[1] === 'auto' ? null : style[1] === 'raw' ? 'none' : style[1] as LockablePresetId };
}

export const companionDraftKey = (userId: string): string => `grifon_companion_draft:${userId}`;

export function loadCompanionDraft(userId: string, storage?: Pick<Storage, 'getItem'>): CompanionDraft | null {
  if (!userId) return null;
  try {
    const stored = JSON.parse((storage ?? localStorage).getItem(companionDraftKey(userId)) ?? 'null');
    if (!stored || stored.version !== 1 || stored.userId !== userId) return null;
    const draft = stored.draft as CompanionDraft;
    if (!draft || draft.version !== 1 || !FIELDS.every(field => typeof draft[field] === 'string' && draft[field].length <= 4000)) return null;
    if (!['English', 'Taglish'].includes(draft.language) || !['9:16', '16:9', '1:1'].includes(draft.aspectRatio)) return null;
    if (typeof draft.heroImageBase64 !== 'string' || draft.heroImageBase64.length > 4_000_000 || typeof draft.imageName !== 'string') return null;
    if (!RECOMMENDED_VOICES.some(voice => voice.id === draft.voiceId) || !Array.isArray(draft.messages) || draft.messages.length > 120) return null;
    if (!draft.messages.every(message => message && typeof message.id === 'string' && ['user', 'assistant'].includes(message.role) && typeof message.text === 'string' && message.text.length <= 5000 && Number.isFinite(message.at))) return null;
    return draft;
  } catch { return null; }
}

export function saveCompanionDraft(userId: string, draft: CompanionDraft, storage?: Pick<Storage, 'setItem'>): boolean {
  if (!userId) return false;
  try { (storage ?? localStorage).setItem(companionDraftKey(userId), JSON.stringify({ version: 1, userId, draft })); return true; }
  catch { return false; }
}

export function clearCompanionDraft(userId: string, storage?: Pick<Storage, 'removeItem'>): void {
  try { (storage ?? localStorage).removeItem(companionDraftKey(userId)); } catch { /* A storage failure must not block a fresh brief. */ }
}
