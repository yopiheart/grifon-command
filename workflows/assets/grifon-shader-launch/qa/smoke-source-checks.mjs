// Independent smoke fixture: finished player bytes and offline delivery contract.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const qa = path.dirname(fileURLToPath(import.meta.url));
const dir = path.dirname(qa);
const root = path.resolve(dir, '../../..');
const htmlPath = path.join(root, 'artifacts/grifon-shader-launch.html');
const htmlBytes = await fs.readFile(htmlPath);
const html = htmlBytes.toString('utf8');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const start = html.indexOf('const films=') + 'const films='.length;
const end = html.indexOf(',duration=', start);
assert(start >= 'const films='.length && end > start, 'Embedded finished media manifest missing');
const films = JSON.parse(html.slice(start, end));
const checks = [];
const check = (condition, label) => { assert(condition, label); checks.push(label); };
check(html.includes('<meta charset="utf-8">'), 'Full document has explicit UTF-8 charset');
check(html.includes("connect-src 'none'"), 'CSP rejects external connections');
check(html.includes("default-src 'none'"), 'CSP defaults to no remote resources');
check(html.includes("media-src data: blob:"), 'Media sources restricted to embedded data and downloads');
check(!/<(?:script|link|img|video|source)[^>]+(?:src|href)=["']https?:/i.test(html), 'No remote asset URL in resource elements');
check(!/background-clip\s*:\s*text|color\s*:\s*transparent|background-attachment\s*:\s*fixed/i.test(html), 'Mobile-fragile clipped type and fixed attachment absent');
check(html.includes('min-height:46px') && html.includes('min-width:46px'), 'Source declares at least 46 px control targets');
check(html.includes('class="ground"') && html.includes('.ground{position:fixed;inset:0;'), 'Continuous ground has its own fixed layer');
check(html.includes('color:#f5f5f7') && html.includes('font-weight:900'), 'Display type is solid near-white and bold');
check(html.includes('Example project') && html.includes('manually prepared example content'), 'Fixture disclosure remains present');
check(html.includes('Direct listening and real-phone review remain pending.'), 'Player honestly preserves unperformed hearing and device checks');
const receipt = { status: 'PASS', fixture: 'Independent offline source byte smoke', html: { path: htmlPath, bytes: htmlBytes.length, sha256: sha256(htmlBytes) }, checks, formats: {} };
for (const [format, dimensions] of Object.entries({ landscape: [1920,1080], portrait: [1080,1920] })) {
  const disk = await fs.readFile(path.join(dir, `${format}.mp4`));
  const embedded = Buffer.from(films[format].src.split(',')[1], 'base64');
  assert.deepEqual(films[format].dimensions, dimensions, `${format} manifest dimensions`);
  assert.deepEqual(embedded, disk, `${format} embedded bytes differ from finished MP4`);
  assert.equal(films[format].bytes, disk.length, `${format} manifest byte size`);
  assert.equal(films[format].sha256, sha256(disk), `${format} manifest digest`);
  if (format === 'portrait') assert(disk.length <= 12000000, 'Portrait attachment exceeds 12 MB');
  const poster = await fs.readFile(path.join(qa, `${format}-poster.png`));
  assert.deepEqual(Buffer.from(films[format].poster.split(',')[1], 'base64'), poster, `${format} embedded poster differs`);
  receipt.formats[format] = { bytes: disk.length, sha256: sha256(disk), embeddedExact: true, posterExact: true, dimensions };
}
await fs.writeFile(path.join(qa, 'smoke-source-checks.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
