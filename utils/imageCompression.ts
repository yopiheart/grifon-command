export interface CompressedImage {
  base64: string;
  mimeType: string;
  dataUrl: string;
}

export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
}

const DEFAULT_MAX_DIMENSION = 1280;
const DEFAULT_QUALITY = 0.85;
const OUTPUT_MIME = 'image/jpeg';

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image.'));
    img.src = src;
  });

const sourceToObjectUrl = (source: File | string): { url: string; revoke: () => void } => {
  if (typeof source === 'string') {
    return { url: source, revoke: () => {} };
  }
  const url = URL.createObjectURL(source);
  return { url, revoke: () => URL.revokeObjectURL(url) };
};

export async function compressImageForUpload(
  source: File | string,
  options: CompressOptions = {}
): Promise<CompressedImage> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;

  const { url, revoke } = sourceToObjectUrl(source);
  let img: HTMLImageElement;
  try {
    img = await loadImage(url);
  } finally {
    revoke();
  }

  const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longEdge > maxDimension ? maxDimension / longEdge : 1;
  const targetW = Math.round(img.naturalWidth * scale);
  const targetH = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const dataUrl = canvas.toDataURL(OUTPUT_MIME, quality);
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Canvas export produced an unexpected format.');

  return {
    base64: match[2],
    mimeType: match[1],
    dataUrl,
  };
}

export async function compressFileToDataUrl(
  file: File,
  options?: CompressOptions
): Promise<string> {
  const { dataUrl } = await compressImageForUpload(file, options);
  return dataUrl;
}
