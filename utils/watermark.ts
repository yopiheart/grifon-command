/**
 * Free-tier export watermark (Slice 3).
 *
 * Overlays a small "MADE WITH GRIFON" gold pill on an image data URL so Free
 * exports carry the brand. Canvas-based, fully client-side. On ANY failure
 * (non-data-url input, image load/decode error, no 2D context) it returns the
 * original image untouched — a watermark hiccup must never block a download.
 *
 * Applied at the central export surface (components/Step7FinalOutput.tsx) for
 * the thumbnail, avatar and scene images. NOTE: this is the first surface; other
 * scattered download sites (ImageModal, per-module galleries) are a parked
 * follow-up — see workflows/pricing_unit_economics.md.
 */

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('WATERMARK_IMAGE_LOAD_FAILED'));
    img.src = src;
  });

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

export async function watermarkImage(dataUrl: string): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl;
  if (typeof document === 'undefined') return dataUrl;
  try {
    const img = await loadImage(dataUrl);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return dataUrl;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;

    ctx.drawImage(img, 0, 0);

    const text = 'MADE WITH GRIFON';
    const pad = Math.round(w * 0.022);
    const fontSize = Math.max(13, Math.round(w * 0.03));
    ctx.font = `700 ${fontSize}px sans-serif`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    const textW = ctx.measureText(text).width;
    const boxH = fontSize + pad * 0.9;
    const boxW = textW + pad * 1.4;
    const boxX = w - boxW - pad;
    const boxY = h - boxH - pad;

    ctx.fillStyle = 'rgba(9,9,11,0.55)'; // zinc-950 @ 55%
    roundRect(ctx, boxX, boxY, boxW, boxH, boxH / 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,204,0,0.95)'; // Grifon Gold
    ctx.fillText(text, boxX + pad * 0.7, boxY + boxH - pad * 0.55);

    return canvas.toDataURL('image/png');
  } catch {
    return dataUrl;
  }
}
