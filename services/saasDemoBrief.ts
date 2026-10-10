import type { AdReferenceBrief } from '../types';
import { resolveSelectedReference, validateReferenceBrief } from './adReconBrief';

export const MAX_SAAS_SCREENSHOT_BYTES = 1024 * 1024;
export const MAX_SAAS_DEMO_BYTES = 4.5 * 1024 * 1024;
export const SAAS_SCREENSHOT_SLOTS = ['setup', 'action', 'result'] as const;
export type SaasScreenshotSlot = typeof SAAS_SCREENSHOT_SLOTS[number];
export interface SaasScreenshotImage { dataUrl: string; mimeType: 'image/png' | 'image/jpeg'; bytes: number }
export interface SaasDemoScreenshot {
  slot: SaasScreenshotSlot;
  image?: SaasScreenshotImage;
  caption: string;
  sourceUrl: string;
  capturedAt: string;
  ownerNote: string;
}
/** Local review data only. This contract is never a ProductionInput or an AI response. */
export interface SaasDemoBrief {
  version: 1;
  preparationOnly: true;
  productFacts: { brandName: string; productName: string; officialWebsite: string; useCaseOrOffer: string };
  audienceHypothesis: string;
  creativeHypothesis: string;
  cta: { text: string; destinationUrl: string };
  screenshots: SaasDemoScreenshot[];
  referenceBrief?: AdReferenceBrief;
}

export function createSaasDemoBrief(): SaasDemoBrief {
  return { version: 1, preparationOnly: true,
    productFacts: { brandName: '', productName: '', officialWebsite: '', useCaseOrOffer: '' },
    audienceHypothesis: '', creativeHypothesis: '', cta: { text: '', destinationUrl: '' },
    screenshots: SAAS_SCREENSHOT_SLOTS.map(slot => ({ slot, caption: '', sourceUrl: '', capturedAt: '', ownerNote: '' })) };
}

function fail(message: string): never { throw new Error(`Software preparation: ${message}`); }
function object(value: unknown, keys: string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object.`);
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some(key => !keys.includes(key))) fail(`${label} contains unsupported fields.`);
  return result;
}
function text(value: unknown, max: number, label: string): string {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail(`${label} is invalid or exceeds ${max} characters.`);
  return value;
}
function publicUrl(value: unknown, label: string, httpsOnly = false): string {
  const raw = text(value, 2048, label);
  if (!raw.trim()) return raw;
  let url: URL;
  try { url = new URL(raw); } catch { return fail(`${label} needs a public ${httpsOnly ? 'HTTPS' : 'HTTP or HTTPS'} URL.`); }
  const host = url.hostname.toLowerCase();
  const ipv4 = host.split('.').map(Number);
  const privateIPv4 = ipv4.length === 4 && ipv4.every(n => Number.isInteger(n) && n >= 0 && n <= 255) &&
    (ipv4[0] === 0 || ipv4[0] === 10 || ipv4[0] === 127 || ipv4[0] >= 224 ||
      (ipv4[0] === 169 && ipv4[1] === 254) || (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31) || (ipv4[0] === 192 && ipv4[1] === 168));
  if (!(httpsOnly ? url.protocol === 'https:' : ['http:', 'https:'].includes(url.protocol)) || url.username || url.password ||
      !host.includes('.') || host.startsWith('[') || host === 'localhost' || /\.(localhost|local|internal|test|invalid)$/.test(host) || privateIPv4) {
    fail(`${label} needs a public ${httpsOnly ? 'HTTPS' : 'HTTP or HTTPS'} URL without credentials.`);
  }
  return raw;
}
function capturedAt(value: unknown): string {
  const raw = text(value, 40, 'Captured time');
  if (!raw.trim()) return raw;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(raw) || !Number.isFinite(Date.parse(raw)) ||
      new Date(raw).toISOString().slice(0, 19) !== raw.slice(0, 19) || Date.parse(raw) > Date.now() + 60000) fail('Captured time needs a valid past ISO UTC date.');
  return raw;
}
function imageBytes(dataUrl: string, mimeType: string): Uint8Array {
  const prefix = `data:${mimeType};base64,`;
  if (!dataUrl.startsWith(prefix)) fail('Screenshot MIME does not match its data URL.');
  const encoded = dataUrl.slice(prefix.length);
  if (!encoded || encoded.length > Math.ceil(MAX_SAAS_SCREENSHOT_BYTES / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) fail('Screenshot is not valid base64 or exceeds 1 MiB.');
  let binary: string;
  try { binary = atob(encoded); } catch { return fail('Screenshot base64 is invalid.'); }
  if (binary.length > MAX_SAAS_SCREENSHOT_BYTES) fail('Screenshot exceeds 1 MiB.');
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  const matches = mimeType === 'image/png'
    ? [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!matches) fail('Screenshot content does not match PNG or JPEG MIME.');
  return bytes;
}
function validateImage(value: unknown): SaasScreenshotImage | undefined {
  if (value === undefined) return undefined;
  const image = object(value, ['dataUrl', 'mimeType', 'bytes'], 'Screenshot');
  if (!['image/png', 'image/jpeg'].includes(image.mimeType as string)) fail('Choose a PNG or JPEG screenshot.');
  if (!Number.isInteger(image.bytes) || (image.bytes as number) <= 0 || (image.bytes as number) > MAX_SAAS_SCREENSHOT_BYTES) fail('Screenshot exceeds 1 MiB or has invalid byte count.');
  const dataUrl = text(image.dataUrl, MAX_SAAS_SCREENSHOT_BYTES * 1.34 + 40, 'Screenshot data');
  if (imageBytes(dataUrl, image.mimeType as string).length !== image.bytes) fail('Screenshot byte count does not match.');
  return { dataUrl, mimeType: image.mimeType as SaasScreenshotImage['mimeType'], bytes: image.bytes as number };
}

export function validateSaasDemoBrief(value: unknown): SaasDemoBrief {
  const b = object(value, ['version', 'preparationOnly', 'productFacts', 'audienceHypothesis', 'creativeHypothesis', 'cta', 'screenshots', 'referenceBrief'], 'Brief');
  if (b.version !== 1 || b.preparationOnly !== true) fail('This must be a version 1 preparation-only brief.');
  const facts = object(b.productFacts, ['brandName', 'productName', 'officialWebsite', 'useCaseOrOffer'], 'Product facts');
  const cta = object(b.cta, ['text', 'destinationUrl'], 'CTA');
  if (!Array.isArray(b.screenshots) || b.screenshots.length !== 3) fail('Keep exactly three screenshot slots.');
  const screenshots = b.screenshots.map((value, index) => {
    const slot = object(value, ['slot', 'image', 'caption', 'sourceUrl', 'capturedAt', 'ownerNote'], 'Screenshot slot');
    if (slot.slot !== SAAS_SCREENSHOT_SLOTS[index]) fail('Screenshot slots must be setup, action, result in order.');
    return { slot: SAAS_SCREENSHOT_SLOTS[index], image: validateImage(slot.image), caption: text(slot.caption, 500, 'Caption'),
      sourceUrl: publicUrl(slot.sourceUrl, 'Screenshot source'), capturedAt: capturedAt(slot.capturedAt), ownerNote: text(slot.ownerNote, 1000, 'Owner observation') };
  });
  const brief: SaasDemoBrief = { version: 1, preparationOnly: true, productFacts: {
    brandName: text(facts.brandName, 200, 'Brand name'), productName: text(facts.productName, 200, 'Product name'),
    officialWebsite: publicUrl(facts.officialWebsite, 'Official website', true), useCaseOrOffer: text(facts.useCaseOrOffer, 2000, 'Use case or offer') },
    audienceHypothesis: text(b.audienceHypothesis, 2000, 'Audience hypothesis'), creativeHypothesis: text(b.creativeHypothesis, 2000, 'Creative hypothesis'),
    cta: { text: text(cta.text, 200, 'CTA text'), destinationUrl: publicUrl(cta.destinationUrl, 'CTA destination') }, screenshots,
    ...(b.referenceBrief === undefined ? {} : { referenceBrief: validateReferenceBrief(b.referenceBrief) }) };
  if (new TextEncoder().encode(JSON.stringify(brief)).length > MAX_SAAS_DEMO_BYTES) fail('Brief exceeds 4.5 MiB.');
  return brief;
}

export async function decodeSaasScreenshot(dataUrl: string): Promise<void> {
  const image = new Image();
  image.src = dataUrl;
  try { await image.decode(); } catch { return fail('Screenshot could not be decoded. Choose a real PNG or JPEG.'); }
  if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 64000000) fail('Screenshot dimensions are invalid or too large.');
}

export async function parseSaasDemoBrief(raw: string, decode = decodeSaasScreenshot): Promise<SaasDemoBrief> {
  if (new TextEncoder().encode(raw).length > MAX_SAAS_DEMO_BYTES) fail('Brief exceeds 4.5 MiB.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail('Choose a valid JSON preparation file.'); }
  const brief = validateSaasDemoBrief(value);
  for (const screenshot of brief.screenshots) if (screenshot.image) await decode(screenshot.image.dataUrl);
  return brief;
}

export async function readSaasScreenshot(file: File, decode = decodeSaasScreenshot): Promise<SaasScreenshotImage> {
  if (!['image/png', 'image/jpeg'].includes(file.type)) fail('Choose a PNG or JPEG screenshot.');
  if (file.size > MAX_SAAS_SCREENSHOT_BYTES) fail('Screenshot exceeds 1 MiB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const image = validateImage({ dataUrl: `data:${file.type};base64,${btoa(binary)}`, mimeType: file.type, bytes: bytes.length })!;
  await decode(image.dataUrl);
  return image;
}

export function saasDemoGaps(brief: SaasDemoBrief): string[] {
  const gaps: string[] = [];
  for (const [label, value] of [['Brand name', brief.productFacts.brandName], ['Product name', brief.productFacts.productName], ['Official website', brief.productFacts.officialWebsite], ['Use case or offer', brief.productFacts.useCaseOrOffer], ['Audience hypothesis', brief.audienceHypothesis], ['Creative hypothesis', brief.creativeHypothesis], ['CTA text', brief.cta.text], ['CTA destination', brief.cta.destinationUrl]]) if (!value.trim()) gaps.push(`${label} is missing.`);
  for (const screenshot of brief.screenshots) {
    const label = screenshot.slot[0].toUpperCase() + screenshot.slot.slice(1);
    if (!screenshot.image) gaps.push(`${label} screenshot is missing.`);
    for (const [field, value] of [['caption', screenshot.caption], ['source URL', screenshot.sourceUrl], ['captured time', screenshot.capturedAt], ['owner observation', screenshot.ownerNote]]) if (!value.trim()) gaps.push(`${label} ${field} is missing.`);
  }
  if (!brief.referenceBrief?.selectedConceptId) gaps.push('No selected ad reference concept.');
  try { resolveSelectedReference(brief.referenceBrief, { brandName: brief.productFacts.brandName, productName: brief.productFacts.productName, offer: brief.productFacts.useCaseOrOffer }); }
  catch (e) { gaps.push(e instanceof Error ? e.message : 'References need review.'); }
  return gaps;
}
