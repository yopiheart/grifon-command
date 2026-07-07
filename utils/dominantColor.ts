import { urlToDataUrl } from '../components/GenerateVideo/RenderAllRunner';

// utils/dominantColor.ts — sample a hero image's dominant brand color as the
// default swatch for the Omni Style picker. Downscales to a tiny canvas and
// averages the non-extreme pixels (skips near-white/near-black backgrounds), so
// the swatch lands on the product's real accent rather than the paper behind it.
// Returns null on ANY failure — the service default (#FFCC00) then takes over.

const toHex = (n: number): string => n.toString(16).padStart(2, '0').toUpperCase();

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('IMG_LOAD_FAILED'));
    img.src = src;
  });

export async function dominantHexFromImage(url: string): Promise<string | null> {
  // SSR-safe: no DOM at build/prerender time.
  if (typeof document === 'undefined' || !url) return null;
  try {
    // Route through urlToDataUrl first so a cross-origin signed URL never taints
    // the canvas (same fetch→dataURL approach RenderAllRunner uses for frames).
    const dataUrl = await urlToDataUrl(url);
    const img = await loadImage(dataUrl);
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const pr = data[i];
      const pg = data[i + 1];
      const pb = data[i + 2];
      if (data[i + 3] < 128) continue;        // near-transparent
      const max = Math.max(pr, pg, pb);
      const min = Math.min(pr, pg, pb);
      if (max > 240 && min > 240) continue;    // near-white
      if (max < 15) continue;                  // near-black
      r += pr;
      g += pg;
      b += pb;
      count += 1;
    }
    if (count === 0) return null;
    return `#${toHex(Math.round(r / count))}${toHex(Math.round(g / count))}${toHex(Math.round(b / count))}`;
  } catch {
    return null;
  }
}
