// Browser-side caption-region detection (MediaPipe Tasks-Vision face detector).
//
// Runs ONLY in the AI Editor, on talking scenes, sampling 2–3 frames per scene and
// unioning the face bbox to pick a caption band that clears the face. It is an
// ENHANCEMENT over the renderer's per-type heuristic, never a hard dependency:
// every failure path (no WebGL/wasm, model load error, video CORS, no face, a
// face that fills the frame) returns no region → the renderer falls back to the
// proven heuristic band. The model + wasm are bundled in public/mediapipe (no CDN).

export interface CaptionRegion { yFracTop: number; yFracBottom: number }

interface SceneInput {
  sceneIdx: number;
  videoUrl?: string;
  type: 'talking' | 'b-roll' | 'cinematic';
}

const SAMPLE_FRACS = [0.3, 0.55, 0.75]; // where in the clip to sample faces
const MODEL = '/mediapipe/blaze_face_short_range.tflite';
const WASM = '/mediapipe/wasm';

/** Detect a face-clear caption band per talking scene. Returns {} on any failure. */
export async function detectCaptionRegions(scenes: SceneInput[]): Promise<Record<number, CaptionRegion>> {
  const out: Record<number, CaptionRegion> = {};
  const talking = scenes.filter((s) => s.type === 'talking' && s.videoUrl);
  if (!talking.length) return out;

  let detector: any;
  try {
    const vision = await import('@mediapipe/tasks-vision');
    const fileset = await vision.FilesetResolver.forVisionTasks(WASM);
    detector = await vision.FaceDetector.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.4,
    });
  } catch (e) {
    console.warn('[captionRegion] detector init failed; using heuristic band', e);
    return out;
  }

  for (const s of talking) {
    try {
      const region = await detectOne(detector, s.videoUrl as string);
      if (region) out[s.sceneIdx] = region;
    } catch {
      /* skip this scene → heuristic */
    }
  }
  try { detector.close?.(); } catch { /* ignore */ }
  return out;
}

async function detectOne(detector: any, url: string): Promise<CaptionRegion | null> {
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.preload = 'auto';
  video.src = url;

  await new Promise<void>((res, rej) => {
    const to = setTimeout(() => rej(new Error('video_timeout')), 8000);
    video.onloadeddata = () => { clearTimeout(to); res(); };
    video.onerror = () => { clearTimeout(to); rej(new Error('video_error')); };
  });

  const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 3;
  const vw = video.videoWidth || 480;
  const vh = video.videoHeight || 854;
  const scale = 480 / vw;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(vw * scale);
  canvas.height = Math.round(vh * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  let top = Infinity, bottom = -Infinity, found = false;
  for (const f of SAMPLE_FRACS) {
    await seekTo(video, dur * f);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const result = detector.detect(canvas);
    for (const d of result?.detections ?? []) {
      const bb = d?.boundingBox;
      if (!bb) continue;
      top = Math.min(top, bb.originY / canvas.height);
      bottom = Math.max(bottom, (bb.originY + bb.height) / canvas.height);
      found = true;
    }
  }
  video.src = '';
  if (!found) return null;

  // Prefer the band BELOW the face (captions read best low); else above; else
  // give up (face fills the frame) → renderer heuristic/bottom.
  const belowRoom = 1 - bottom;
  const aboveRoom = top;
  if (belowRoom >= 0.18) return { yFracTop: Math.min(0.78, bottom + 0.04), yFracBottom: 0.84 };
  if (aboveRoom >= 0.18) return { yFracTop: Math.max(0.14, top - 0.20), yFracBottom: Math.max(0.18, top - 0.02) };
  return null;
}

function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((res) => {
    const h = () => { video.removeEventListener('seeked', h); res(); };
    video.addEventListener('seeked', h);
    try { video.currentTime = Math.max(0, t); } catch { res(); }
  });
}
