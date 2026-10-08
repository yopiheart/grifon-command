import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const shader = 'workflows/assets/grifon-shader-recreation';
const basic = 'workflows/assets/grifon-motion-director-demo';

export const templates = {
  'shader-reference': {
    timeline: { fpsNumerator: 30000, fpsDenominator: 1001, frames: 932, sampleFrames: 1495040 },
    formats: { landscape: { width: 1920, height: 1080 } },
    config: 'full.json', entry: 'full.html', lockedPrefixFrames: 222,
    files: ['full.json', 'full.html', 'full.js', 'full-surfaces.frag', 'grifon-opening-pilot-silent.mp4',
      'vendor/three.global.js', 'vendor/LICENSE-Three.txt', 'assets/full/manifest.json',
      'assets/full/inter-outlines.json', 'assets/full/inter-900.ttf', 'assets/full/OFL-Inter.txt',
      'assets/full/logo.png', 'assets/full/script-desktop.png', 'assets/full/script-mobile.png', 'assets/full/storyboard.png']
      .map(file => ({ source: `${shader}/${file}`, target: `composition/${file}` })),
    audio: `${shader}/sound-v1/sound-spec.json`,
  },
  'basic-launch': {
    timeline: { fpsNumerator: 24, fpsDenominator: 1, frames: 288, sampleFrames: 576000 },
    formats: { landscape: { width: 1920, height: 1080 }, portrait: { width: 1080, height: 1920 } },
    config: 'demo.json', entry: null, lockedPrefixFrames: 0,
    files: [
      ...['demo.json', 'composition.template.html', 'vendor/gsap.min.js'].map(file => ({ source: `${basic}/${file}`, target: `composition/${file}` })),
      { source: 'public/logo.png', target: 'composition/assets/logo.png' },
      { source: 'workflows/assets/grifon-promo-canvas/fonts/inter-900.ttf', target: 'composition/assets/inter-900.ttf' },
      { source: 'workflows/assets/grifon-promo-canvas/fonts/jbmono-600.ttf', target: 'composition/assets/jbmono-600.ttf' },
    ],
    audio: null,
  },
};

export function templateFor(id) {
  if (!Object.hasOwn(templates, id)) throw Error(`Unknown template ${id}; choose shader-reference or basic-launch`);
  return templates[id];
}
