// Static exact-media gate and bounded loopback helper for Codex CUA smoke checks.
// This script never installs tools, launches a browser, or serves arbitrary paths.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const qa = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(qa, '../../../..');
const htmlPath = path.join(root, 'artifacts/grifon-motion-depth-review.html');
const filmPath = path.join(qa, '../grifon-motion-depth-1080p.mp4');
const html = await readFile(htmlPath, 'utf8');
const film = await readFile(filmPath);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const source = html.match(/<video\b[^>]*\bsrc="data:video\/mp4;base64,([A-Za-z0-9+/=]+)"/);
if (!source) throw new Error('Missing embedded MP4 source');
const embedded = Buffer.from(source[1], 'base64');
const poster = html.match(/\bposter="data:image\/jpeg;base64,([A-Za-z0-9+/=]+)"/);
const checks = {
  exactEmbeddedFilm: embedded.equals(film),
  embeddedPoster: Boolean(poster),
  inlineFont: /@font-face\{[^}]*data:font\/ttf;base64,/.test(html),
  charset: /<meta charset="utf-8">/.test(html),
  fixedGround: /\.ground\{position:fixed;inset:0;/.test(html),
  solidUppercaseHeading: /h1\{[^}]*text-transform:uppercase/.test(html) && !/background-clip\s*:\s*text|color\s*:\s*transparent/.test(html),
  noExternalAssetURLs: !/(?:src|href)="https?:\/\//.test(html),
  userGestureUnmutedHandler: /film\.muted=false;film\.volume=1;/.test(html),
  restartZeroHandler: /film\.currentTime=0;play\(\)/.test(html),
  downloadUsesSameEmbeddedBytes: /film\.getAttribute\('src'\)\.split\(','\)\[1\]/.test(html) && /new Blob\(\[bytes\],\{type:'video\/mp4'\}\)/.test(html),
};
const result = {
  generatedAt: new Date().toISOString(),
  staticStatus: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
  paths: { html: path.relative(root, htmlPath), film: path.relative(root, filmPath) },
  film: { bytes: film.length, sha256: hash(film), embeddedSha256: hash(embedded) },
  html: { bytes: Buffer.byteLength(html), sha256: hash(html) },
  checks,
  browserStatus: 'PENDING',
  limitations: ['Codex CUA permits HTTP/HTTPS only; offline file-URL browser playback is blocked.'],
};
await writeFile(path.join(qa, 'mobile-smoke.json'), `${JSON.stringify(result, null, 2)}\n`);
if (result.staticStatus !== 'PASS') {
  console.error(JSON.stringify(result));
  process.exitCode = 1;
} else if (process.argv.includes('--serve')) {
  const server = createServer((request, response) => {
    if (request.url === '/' || request.url === '/grifon-motion-depth-review.html') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(html);
    } else if (request.url === '/favicon.ico') {
      response.writeHead(204);
      response.end();
    } else {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  server.listen(0, '127.0.0.1', () => {
    console.log(JSON.stringify({ pid: process.pid, url: `http://127.0.0.1:${server.address().port}/grifon-motion-depth-review.html`, staticStatus: result.staticStatus, sha256: result.film.sha256 }));
  });
} else {
  console.log(JSON.stringify({ staticStatus: result.staticStatus, film: result.film, checks }));
}
