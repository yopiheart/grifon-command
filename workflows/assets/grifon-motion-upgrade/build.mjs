// Build the editable full film from local source and approved brand assets.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';
const here = path.dirname(fileURLToPath(import.meta.url));
const specPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(here, 'demo.json');
const out = process.argv[3] ? path.resolve(process.argv[3]) : here;
const spec = JSON.parse(await readFile(specPath, 'utf8'));
if (spec.width !== 1920 || spec.height !== 1080 || spec.fps !== 30 || spec.duration !== 32.9) throw new Error('Full film requires 1920x1080 / 30fps / 32.9s.');
if (spec.copy.opening !== 'Your next ad.' && (!spec.copy.opening || spec.copy.opening.length > 30)) throw new Error('Opening copy must be nonempty and at most 30 characters.');
const template = await readFile(path.join(here, 'composition.html.template'), 'utf8');
const uri = async (name, type) => `data:${type};base64,${(await readFile(path.join(here, name))).toString('base64')}`;
const values = {
  CONFIG: JSON.stringify(spec).replaceAll('<', '\\u003c'),
  OUTLINES: (await readFile(path.join(here, 'assets/inter-normalized-outlines.json'), 'utf8')).trim(),
  INTER: await uri('assets/inter-variable.ttf', 'font/ttf'),
  INTERBLACK: await uri('assets/inter-900.ttf', 'font/ttf'),
  LOGO: await uri('assets/logo.png', 'image/png'),
};
const html = template.replace(/\{\{([A-Z]+)\}\}/g, (_, key) => {
  if (!Object.hasOwn(values, key)) throw new Error(`Unknown source token ${key}`);
  return values[key];
});
for (const [, script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new Script(script);
const dependencies = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
for (const dependency of dependencies) {
  const source = path.resolve(here, dependency);
  if (!source.startsWith(here + path.sep)) throw new Error('External composition dependency rejected.');
  new Script(await readFile(source, 'utf8'));
}
await mkdir(out, { recursive: true });
if (out !== here) {
  for (const folder of ['assets', 'vendor']) {
    await mkdir(path.join(out, folder), { recursive: true });
    for (const name of await readdir(path.join(here, folder))) await writeFile(path.join(out, folder, name), await readFile(path.join(here, folder, name)));
  }
  for (const dependency of dependencies.filter(file => !file.startsWith('vendor/'))) await writeFile(path.join(out, dependency), await readFile(path.join(here, dependency)));
}
await writeFile(path.join(out, 'index.html'), html);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sources = ['composition.html.template', 'assets/inter-variable.ttf', 'assets/inter-900.ttf', 'assets/inter-normalized-outlines.json', 'assets/logo.png', 'assets/OFL-Inter.txt', 'vendor/LICENSE', ...dependencies];
const sourceHashes = {};
for (const name of sources) sourceHashes[name] = hash(await readFile(path.join(here, name)));
sourceHashes['demo.json'] = hash(await readFile(specPath));
await writeFile(path.join(out, 'source-manifest.json'), JSON.stringify({
  spec, sources: sourceHashes, output: { path: 'index.html', sha256: hash(html), localDependencies: dependencies },
  brand: 'Canonical unchanged public/logo.png; transparent gold ring and Inter Black italic GRIFON lockup',
  audio: { source: spec.baseline, treatment: 'Preserve the accepted V08 AAC payload and timing', payloadSha256: spec.acceptedAudioPayloadSha256 },
  three: { version: '0.180.0', license: 'MIT', notice: 'vendor/LICENSE' },
  fonts: { license: 'OFL-1.1', notice: 'assets/OFL-Inter.txt' },
  generationSpendUsd: 0,
}, null, 2) + '\n');
console.log('Built full 32.9s / 1920x1080 / 30fps editable source using local assets only.');
