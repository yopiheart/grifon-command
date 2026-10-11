import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFile, writeFile, mkdir, access} from 'node:fs/promises';
import {dirname, isAbsolute, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '../../..');
const toolRoot = resolve(process.env.GRIFON_TOOL_ROOT || projectRoot);
const require = createRequire(resolve(toolRoot, 'package.json'));
const check = process.argv.includes('--check');
const versions = {shaders:'4.0.1', typegpu:'0.12.3', 'tinyest':'0.3.4', 'tsover-runtime':'0.0.7', 'typed-binary':'4.3.3'};

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function runtimePath() {
  if (process.env.GRIFON_SHADER_RUNTIME) return resolve(process.env.GRIFON_SHADER_RUNTIME);
  const candidates = [resolve(toolRoot, '.tools/shader-runtime')];
  try {
    const common = execFileSync('git', ['rev-parse', '--git-common-dir'], {cwd:projectRoot, encoding:'utf8', stdio:['ignore','pipe','ignore']}).trim();
    const commonPath = isAbsolute(common) ? common : resolve(projectRoot, common);
    candidates.push(resolve(dirname(commonPath), '.tools/shader-runtime'));
  } catch {}
  for (const candidate of candidates) if (await exists(resolve(candidate, 'node_modules/shaders/package.json'))) return candidate;
  throw new Error('Existing shader runtime missing. Set GRIFON_SHADER_RUNTIME to the directory containing node_modules/shaders. This build never installs packages.');
}

const runtime = await runtimePath();
const modules = resolve(runtime, 'node_modules');
const packages = {};
for (const [name, version] of Object.entries(versions)) {
  const info = JSON.parse(await readFile(resolve(modules, name, 'package.json'), 'utf8'));
  if (info.name !== name || info.version !== version) throw new Error(`Expected ${name}@${version}; found ${info.name}@${info.version}. Reuse the approved runtime.`);
  packages[name] = info;
}
const esbuildManifest = JSON.parse(await readFile(require.resolve('esbuild/package.json'), 'utf8'));
if (esbuildManifest.version !== '0.27.0') throw new Error(`Expected installed esbuild@0.27.0; found ${esbuildManifest.version}.`);
const {build} = await import(pathToFileURL(require.resolve('esbuild')).href);
const imports = ['shaders/core', 'shaders/js', 'shaders/core/FlowingGradient', 'shaders/core/LiquidMetal', 'shaders/core/FlutedGlass'];
const alias = Object.fromEntries(imports.map(name => {
  const entry = packages.shaders.exports[name.replace(/^shaders/, '.')].import;
  return [name, resolve(modules, 'shaders', entry)];
}));
const result = await build({
  absWorkingDir:here,
  entryPoints:['materials-source.js'],
  outfile:'shader-materials.js',
  bundle:true,
  format:'iife',
  target:'chrome140',
  minify:true,
  legalComments:'eof',
  banner:{js:'/*! shaders@4.0.1 + TypeGPU and dependencies. License notices: ./licenses/. Rebuild: node build.mjs */'},
  alias,
  nodePaths:[modules],
  write:false
});
const output = result.outputFiles[0].contents;
const outputPath = resolve(here, 'shader-materials.js');
const licenseDir = resolve(here, 'licenses');
if (check) {
  const saved = await readFile(outputPath);
  if (!saved.equals(Buffer.from(output))) throw new Error('shader-materials.js differs from the reproducible build. Run node build.mjs.');
} else {
  await writeFile(outputPath, output);
  await mkdir(licenseDir, {recursive:true});
}
for (const [name, info] of Object.entries(packages)) {
  const license = await readFile(resolve(modules, name, 'LICENSE'));
  const noticePath = resolve(licenseDir, `${name}-${info.license}.txt`);
  if (check) {
    const saved = await readFile(noticePath);
    if (!saved.equals(license)) throw new Error(`License notice differs: ${name}`);
  } else await writeFile(noticePath, license);
}
console.log(`${check ? 'Verified' : 'Built'} shader-materials.js (${output.length} bytes), shaders@4.0.1, esbuild@0.27.0; all dependency license notices included.`);
