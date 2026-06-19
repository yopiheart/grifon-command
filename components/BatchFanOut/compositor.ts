// Client-side Canvas compositor — the engine that makes a 100-creative batch
// cost $0 and run in minutes. It takes ONE hero image (already generated) and
// stamps a headline / subhead / badge onto it per a TemplatePreset. No network,
// no AI: pure 2D drawing in the user's browser.

import type { TemplatePreset, FillToken } from './templates';

const GOLD = '#FFCC00';

export type AspectRatio = '9:16' | '4:5' | '1:1' | '16:9';

// Output canvas dimensions per aspect ratio. JPEG (not PNG) keeps a 100-image
// ZIP in the tens-of-MB range instead of hundreds — these are photos, not flat
// art, so the size win dwarfs the quality loss.
const DIMS: Record<AspectRatio, { w: number; h: number }> = {
  '4:5': { w: 1080, h: 1350 },
  '1:1': { w: 1080, h: 1080 },
  '9:16': { w: 1080, h: 1920 },
  '16:9': { w: 1920, h: 1080 },
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('hero image failed to load'));
    img.src = src;
  });

// --- colour helpers -------------------------------------------------------

const firstHex = (brandColors: string[]): string => {
  const c = (brandColors || []).map((x) => x && x.trim()).find(Boolean);
  if (!c) return '#16412c'; // deep brand-green fallback (reads on most photos)
  return c.startsWith('#') ? c : `#${c}`;
};

const luminance = (hex: string): number => {
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const r = parseInt(n.slice(0, 2), 16) || 0;
  const g = parseInt(n.slice(2, 4), 16) || 0;
  const b = parseInt(n.slice(4, 6), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

const darken = (hex: string, amount = 0.4): string => {
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(n.slice(i, i + 2), 16) || 0;
    return Math.max(0, Math.round(v * (1 - amount)));
  });
  return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

const resolveFill = (
  token: FillToken,
  brand: string,
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number },
): string | CanvasGradient => {
  switch (token) {
    case 'brand':
      return brand;
    case 'brandDark':
      return darken(brand, 0.45);
    case 'gold':
      return GOLD;
    case 'white':
      return '#ffffff';
    case 'scrim': {
      const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
      g.addColorStop(0, 'rgba(9,9,11,0)');
      g.addColorStop(1, 'rgba(9,9,11,0.92)');
      return g;
    }
  }
};

const resolveText = (
  token: TemplatePreset['headlineColor'],
  bandFill: FillToken,
  brand: string,
): string => {
  if (token === 'white') return '#ffffff';
  if (token === 'black') return '#0a0a0a';
  if (token === 'gold') return GOLD;
  // auto: contrast against the band's base colour
  const base =
    bandFill === 'gold' ? GOLD : bandFill === 'white' ? '#ffffff' : bandFill === 'brand' ? brand : darken(brand);
  return luminance(base) > 0.6 ? '#0a0a0a' : '#ffffff';
};

// --- text layout ----------------------------------------------------------

const wrap = (ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] => {
  const words = (text || '').toUpperCase().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
};

/** Shrink font until the headline fits the band in at most `maxLines` lines. */
const fitHeadline = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  startSize: number,
  maxLines: number,
): { size: number; lines: string[] } => {
  let size = startSize;
  while (size > 18) {
    ctx.font = `900 ${size}px Arial, sans-serif`;
    const lines = wrap(ctx, text, maxW);
    if (lines.length <= maxLines) return { size, lines };
    size -= 4;
  }
  ctx.font = `900 ${size}px Arial, sans-serif`;
  return { size, lines: wrap(ctx, text, maxW).slice(0, maxLines) };
};

// --- drawing primitives ---------------------------------------------------

const drawCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number) => {
  const scale = Math.max(W / img.width, H / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const drawBadge = (
  ctx: CanvasRenderingContext2D,
  text: string,
  corner: TemplatePreset['badgeCorner'],
  fill: string,
  W: number,
  H: number,
) => {
  if (!text) return;
  const label = text.toUpperCase();
  const pad = Math.round(W * 0.018);
  const margin = Math.round(W * 0.04);
  ctx.font = `800 ${Math.round(W * 0.032)}px Arial, sans-serif`;
  const tw = ctx.measureText(label).width;
  const bw = tw + pad * 2.4;
  const bh = Math.round(W * 0.075);
  const x = corner === 'tl' || corner === 'bl' ? margin : W - margin - bw;
  const y = corner === 'tl' || corner === 'tr' ? margin : H - margin - bh;
  roundRect(ctx, x, y, bw, bh, bh * 0.28);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.fillStyle = luminance(fill) > 0.6 ? '#0a0a0a' : '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + bw / 2, y + bh / 2 + bh * 0.02);
};

// --- public API -----------------------------------------------------------

export interface RenderInput {
  hero: HTMLImageElement;
  headline: string;
  subhead: string;
  badge: string;
  preset: TemplatePreset;
  brandColors: string[];
  aspectRatio: AspectRatio;
}

/** Composite one creative. Returns a JPEG data URL. */
export const renderCreative = (input: RenderInput): string => {
  const { hero, headline, subhead, badge, preset, brandColors, aspectRatio } = input;
  const { w: W, h: H } = DIMS[aspectRatio] || DIMS['4:5'];
  const brand = firstHex(brandColors);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. hero photo, cover-fit
  drawCover(ctx, hero, W, H);

  // 2. compute the band rect
  const short = Math.min(W, H);
  const bandH = Math.round(short * preset.bandHeightFrac);
  let rect: { x: number; y: number; w: number; h: number };
  if (preset.band === 'top') rect = { x: 0, y: 0, w: W, h: bandH };
  else if (preset.band === 'left') rect = { x: 0, y: 0, w: Math.round(W * 0.62), h: H };
  else rect = { x: 0, y: H - bandH, w: W, h: bandH }; // bottom / framed / scrim

  // 3. paint the band
  if (preset.band === 'framed') {
    // full-height bottom scrim + thin gold frame
    const g = resolveFill('scrim', brand, ctx, { x: 0, y: H * 0.45, w: W, h: H * 0.55 });
    ctx.fillStyle = g;
    ctx.fillRect(0, Math.round(H * 0.45), W, Math.round(H * 0.55));
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = Math.max(4, Math.round(W * 0.008));
    const inset = Math.round(W * 0.03);
    ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  } else {
    ctx.fillStyle = resolveFill(preset.bandFill, brand, ctx, rect) as string | CanvasGradient;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  // 4. headline + subhead
  const textColor = resolveText(preset.headlineColor, preset.bandFill, brand);
  const padX = Math.round(W * 0.055);
  const innerW = (preset.band === 'left' ? rect.w : W) - padX * 2;
  const centered = preset.headlineAlign === 'center';
  ctx.textAlign = centered ? 'center' : 'left';
  ctx.textBaseline = 'alphabetic';

  const { size, lines } = fitHeadline(ctx, headline, innerW, Math.round(W * 0.085), 3);
  const lineH = size * 1.06;
  const subSize = Math.round(size * 0.42);
  const blockH = lines.length * lineH + (subhead ? subSize * 1.8 : 0);

  // vertical anchor inside the band
  let cy: number;
  if (preset.band === 'top') cy = rect.h / 2 - blockH / 2 + size;
  else if (preset.band === 'left') cy = H / 2 - blockH / 2 + size;
  else if (preset.band === 'framed') cy = H - bandH * 0.9;
  else cy = H - rect.h + (rect.h - blockH) / 2 + size;

  const tx = centered ? (preset.band === 'left' ? rect.w / 2 : W / 2) : padX;
  ctx.fillStyle = textColor;
  lines.forEach((ln, i) => {
    ctx.font = `900 ${size}px Arial, sans-serif`;
    ctx.fillText(ln, tx, cy + i * lineH);
  });

  if (subhead) {
    ctx.font = `600 ${subSize}px Arial, sans-serif`;
    ctx.fillStyle = textColor === '#ffffff' ? 'rgba(255,255,255,0.88)' : 'rgba(10,10,10,0.82)';
    const subLines = wrap(ctx, subhead, innerW).slice(0, 2);
    subLines.forEach((ln, i) => {
      ctx.fillText(ln, tx, cy + lines.length * lineH + subSize * 1.4 + i * subSize * 1.2);
    });
  }

  // 5. badge
  if (preset.showBadge) {
    const badgeFill = preset.badgeFill === 'gold' ? GOLD : preset.badgeFill === 'white' ? '#ffffff' : brand;
    drawBadge(ctx, badge, preset.badgeCorner, badgeFill, W, H);
  }

  return canvas.toDataURL('image/jpeg', 0.9);
};

export { loadImage };
export type { TemplatePreset };
