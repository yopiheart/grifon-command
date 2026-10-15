import { isCreativeSource, type CreativeSource } from './companionCreativeLibrary.js';

// Local intake data only. This is not a provider response or generation contract.
export interface ReferenceMedia {
  id: string;
  name: string;
  blob: Blob;
  width: number;
  height: number;
  duration?: number;
}
export interface ReferencePhoto extends ReferenceMedia { role: 'product' | 'character' | 'clothing' }
export interface ReferenceVoice { id: string; name: string; source: 'curated' | 'private' }
export interface CompanionReferenceDraft {
  version: 1;
  brief: string;
  brandName: string;
  productName: string;
  audience: string;
  offer: string;
  callToAction: string;
  instructions: string;
  outputLanguage: 'Taglish' | 'Tagalog' | 'English';
  referenceLanguage: string;
  referenceLink: string;
  referenceVideo: ReferenceMedia | null;
  photos: ReferencePhoto[];
  voice: ReferenceVoice | null;
  adaptationMode?: 'adapt' | 'close';
  speechMode?: 'spoken' | 'silent';
  creativeSource?: CreativeSource;
}
export function createReferenceDraft(): CompanionReferenceDraft {
  return { version: 1, brief: '', brandName: '', productName: '', audience: '', offer: '', callToAction: '', instructions: '', outputLanguage: 'Taglish', referenceLanguage: '', referenceLink: '', referenceVideo: null, photos: [], voice: null };
}

export function validateReferenceLink(value: string): string {
  const link = value.trim();
  if (!link) return '';
  try {
    const url = new URL(link);
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.') || url.hostname.endsWith('.localhost')) throw new Error();
    return link;
  } catch { throw new Error('Use an HTTPS reference link without a username or password.'); }
}

export function validateMediaFile(file: Pick<Blob, 'size' | 'type'>, kind: 'photo' | 'video'): void {
  const allowed = kind === 'photo' ? ['image/jpeg', 'image/png', 'image/webp'] : ['video/mp4', 'video/webm', 'video/quicktime'];
  const limit = (kind === 'photo' ? 10 : 100) * 1024 * 1024;
  if (!allowed.includes(file.type)) throw new Error(kind === 'photo' ? 'Choose a JPEG, PNG or WebP photo.' : 'Choose an MP4, WebM or MOV video.');
  if (!file.size || file.size > limit) throw new Error(`${kind === 'photo' ? 'Photos must be 10' : 'Reference videos must be 100'} MB or smaller and cannot be empty.`);
}

// Decode locally instead of trusting the filename or MIME label. No upload or remote fetch.
export async function prepareReferenceMedia(file: File, kind: 'photo' | 'video'): Promise<ReferenceMedia> {
  validateMediaFile(file, kind);
  const url = URL.createObjectURL(file);
  const element = kind === 'photo' ? new Image() : document.createElement('video');
  try {
    return await new Promise<ReferenceMedia>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('This file could not be read. Try another supported file.')), 15_000);
      const fail = () => { window.clearTimeout(timer); reject(new Error('This file could not be decoded. Try another supported file.')); };
      const ready = () => {
        window.clearTimeout(timer);
        const width = element instanceof HTMLVideoElement ? element.videoWidth : element.naturalWidth;
        const height = element instanceof HTMLVideoElement ? element.videoHeight : element.naturalHeight;
        const duration = element instanceof HTMLVideoElement ? element.duration : undefined;
        if (!width || !height || width * height > 40_000_000) { reject(new Error('Choose media with a valid frame up to 40 megapixels.')); return; }
        if (duration !== undefined && (!Number.isFinite(duration) || duration <= 0 || duration > 180)) { reject(new Error('Choose a reference video up to 3 minutes long.')); return; }
        resolve({ id: crypto.randomUUID(), name: file.name.slice(0, 255), blob: file, width, height, ...(duration === undefined ? {} : { duration }) });
      };
      element.onerror = fail;
      if (element instanceof HTMLVideoElement) { element.preload = 'metadata'; element.onloadedmetadata = ready; }
      else element.onload = ready;
      element.src = url;
    });
  } finally {
    element.onerror = null;
    if (element instanceof HTMLVideoElement) { element.onloadedmetadata = null; element.removeAttribute('src'); element.load(); }
    else { element.onload = null; element.src = ''; }
    URL.revokeObjectURL(url);
  }
}

function validMedia(value: unknown, kind: 'photo' | 'video'): value is ReferenceMedia {
  if (!value || typeof value !== 'object') return false;
  const media = value as ReferenceMedia;
  if (typeof media.id !== 'string' || !media.id || typeof media.name !== 'string' || media.name.length > 255 || !(media.blob instanceof Blob)
    || !Number.isInteger(media.width) || media.width <= 0 || !Number.isInteger(media.height) || media.height <= 0 || media.width * media.height > 40_000_000) return false;
  try { validateMediaFile(media.blob, kind); } catch { return false; }
  return kind !== 'video' || (typeof media.duration === 'number' && Number.isFinite(media.duration) && media.duration > 0 && media.duration <= 180);
}
export function isReferenceDraft(value: unknown): value is CompanionReferenceDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as CompanionReferenceDraft;
  if (draft.version !== 1 || !['Taglish', 'Tagalog', 'English'].includes(draft.outputLanguage)
    || (draft.adaptationMode !== undefined && !['adapt', 'close'].includes(draft.adaptationMode))
    || (draft.speechMode !== undefined && !['spoken', 'silent'].includes(draft.speechMode))
    || (Object.prototype.hasOwnProperty.call(draft, 'creativeSource') && !isCreativeSource(draft.creativeSource))
    || !['brief', 'brandName', 'productName', 'audience', 'offer', 'callToAction', 'instructions', 'referenceLanguage', 'referenceLink'].every(key => typeof draft[key as keyof CompanionReferenceDraft] === 'string' && (draft[key as keyof CompanionReferenceDraft] as string).length <= 4000)
    || !Array.isArray(draft.photos) || draft.photos.length > 5
    || !draft.photos.every(photo => validMedia(photo, 'photo') && ['product', 'character', 'clothing'].includes(photo.role))
    || new Set(draft.photos.map(photo => photo.id)).size !== draft.photos.length
    || (draft.referenceVideo !== null && !validMedia(draft.referenceVideo, 'video'))) return false;
  // Partial link text is retained while editing; validity is shown in the form.
  return draft.voice === null || (!!draft.voice && typeof draft.voice.id === 'string' && draft.voice.id.length > 0 && draft.voice.id.length <= 200
    && typeof draft.voice.name === 'string' && draft.voice.name.length > 0 && draft.voice.name.length <= 200 && ['curated', 'private'].includes(draft.voice.source));
}
