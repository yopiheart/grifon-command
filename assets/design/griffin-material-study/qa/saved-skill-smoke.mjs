import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const root = process.cwd();
const here = path.dirname(fileURLToPath(import.meta.url));
const sha = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const digest = file => { const buffer = fs.readFileSync(file); return { bytes: buffer.length, sha256: sha(buffer) }; };
const sameFile = (file, expected) => { const actual = digest(file); return actual.bytes === expected.bytes && actual.sha256 === expected.sha256; };

if (process.argv[2] === '--single') {
  const [file, expectedHash, expectedBytes] = process.argv.slice(3);
  const pass = sameFile(file, { sha256: expectedHash, bytes: Number(expectedBytes) });
  console.log(pass ? 'INTEGRITY_PASS' : 'INTEGRITY_REJECT: bytes or SHA-256 differ');
  process.exit(pass ? 0 : 1);
}

const report = {
  schema: 1,
  recorded_at: new Date().toISOString(),
  command: 'node assets/design/griffin-material-study/qa/saved-skill-smoke.mjs',
  checker_sha256: digest(fileURLToPath(import.meta.url)).sha256,
  checks: [],
  limits: 'File integrity, portability, PNG decode/alpha and scope checks only. No Blender render, visual reassessment, browser, animation, provider or app calls.',
};
const check = (name, pass, detail) => report.checks.push({ name, pass: Boolean(pass), ...(detail === undefined ? {} : { detail }) });
const checkFile = (name, file, expected) => check(name, fs.existsSync(file) && sameFile(file, expected), { file, expected, actual: fs.existsSync(file) ? digest(file) : null });
const relativeFiles = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
  ? relativeFiles(path.join(dir, entry.name)).map(child => `${entry.name}/${child}`)
  : [entry.name]).sort();
const contained = (base, file) => { const rel = path.relative(base, file); return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel); };

try {
  const projectSkill = path.join(root, '.agents/skills/blender-studio');
  const mirrorSkill = 'C:/Users/ADMIN/.codex/skills/blender-studio';
  const neutralDir = path.join(projectSkill, 'assets/griffin-neutral-v01');
  const studyDir = path.join(root, 'assets/3d-lab/griffin-material-study');
  const candidateDir = path.join(studyDir, 'candidate-final');
  const study = json(path.join(studyDir, 'study-manifest.json'));
  const candidate = json(path.join(candidateDir, 'manifest.json'));
  const bundle = json(path.join(neutralDir, 'manifest.json'));
  const approval = json(path.join(studyDir, 'owner-acceptance.json'));
  const selection = json(path.join(studyDir, 'trial-selection.json'));
  const storage = json(path.join(here, 'local-scene-storage.json'));

  check('study inventory has 43 unique entries', study.builder_output_inventory.length === 43 && new Set(study.builder_output_inventory.map(item => item.path)).size === 43);
  for (const item of study.builder_output_inventory) checkFile(`study inventory: ${item.path}`, path.join(studyDir, item.path), item);

  for (const item of bundle.files) {
    checkFile(`project neutral bundle: ${item.path}`, path.join(neutralDir, item.path), item);
    checkFile(`installed neutral bundle: ${item.path}`, path.join(mirrorSkill, 'assets/griffin-neutral-v01', item.path), item);
    const origin = item.path === 'render-manifest.json' ? path.join(candidateDir, 'manifest.json')
      : item.path === 'owner-acceptance.json' ? path.join(studyDir, item.path)
        : path.join(candidateDir, item.path);
    checkFile(`bundle exact source copy: ${item.path}`, origin, item);
  }
  for (const item of candidate.files) checkFile(`saved candidate final: ${item.path}`, path.join(candidateDir, item.path), item);
  for (const item of approval.views) checkFile(`owner-approved view: ${item.path}`, path.join(candidateDir, item.path), item);
  checkFile('owner-approved refinement source', path.join(candidateDir, approval.source.path), approval.source);
  checkFile('owner-approved render evidence', path.join(studyDir, approval.render_manifest.path), approval.render_manifest);
  checkFile('portable owner-approved render evidence', path.join(neutralDir, approval.render_manifest.bundled_path), approval.render_manifest);
  check('owner render evidence paths are explicit', approval.render_manifest.path === 'candidate-final/manifest.json' && approval.render_manifest.path_base === 'Originating assets/3d-lab/griffin-material-study directory' && approval.render_manifest.bundled_path === 'render-manifest.json');

  for (const view of candidate.views) {
    const image = path.join(neutralDir, `griffin-material-final-${view.name}.png`);
    const meta = await sharp(image).metadata();
    const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let alphaMin = 255;
    let alphaMax = 0;
    for (let offset = 3; offset < data.length; offset += info.channels) { alphaMin = Math.min(alphaMin, data[offset]); alphaMax = Math.max(alphaMax, data[offset]); }
    check(`PNG decode/dimensions: ${view.name}`, meta.format === 'png' && meta.width === view.resolution && meta.height === view.resolution,
      { width: meta.width, height: meta.height, expected: view.resolution, hasAlpha: meta.hasAlpha });
    check(`PNG alpha: ${view.name}`, view.transparent ? meta.hasAlpha && alphaMin === 0 && alphaMax === 255 : alphaMin === 255 && alphaMax === 255,
      { min: alphaMin, max: alphaMax, intendedTransparent: view.transparent });
  }

  const projectFiles = relativeFiles(projectSkill);
  const mirrorFiles = relativeFiles(mirrorSkill);
  check('installed mirror has exact package file list', JSON.stringify(projectFiles) === JSON.stringify(mirrorFiles), { projectCount: projectFiles.length, mirrorCount: mirrorFiles.length });
  for (const file of projectFiles) checkFile(`portable mirror exact bytes: ${file}`, path.join(mirrorSkill, file), digest(path.join(projectSkill, file)));
  for (const [label, base] of [['project', projectSkill], ['installed', mirrorSkill]]) {
    for (const file of relativeFiles(base).filter(file => file.endsWith('.md'))) {
      const content = fs.readFileSync(path.join(base, file), 'utf8');
      const pattern = /!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"\n]*")?\)/g;
      for (const match of content.matchAll(pattern)) {
        if (/^(?:https?:|mailto:|#)/.test(match[1])) continue;
        const target = decodeURIComponent(match[1].split('#')[0]);
        const resolved = path.resolve(base, path.dirname(file), target);
        check(`${label} local Markdown link: ${file} -> ${target}`, contained(base, resolved) && fs.existsSync(resolved));
      }
    }
    for (const folder of ['assets/griffin-v05', 'assets/griffin-neutral-v01']) {
      const manifest = json(path.join(base, folder, 'manifest.json'));
      for (const item of manifest.files) checkFile(`${label} manifest anchor: ${folder}/${item.path}`, path.join(base, folder, item.path), item);
    }
  }

  for (const item of storage.files) checkFile('persistent local storage receipt: ' + path.basename(item.path), item.path, item);
  checkFile('actual approved original v05 master', bundle.exact_replay_input.path, { bytes: 35668191, sha256: bundle.exact_replay_input.sha256 });
  checkFile('actual preferred persistent scene', bundle.local_scene.path, bundle.local_scene);
  checkFile('actual acceptance persistent scene', approval.local_scene.path, approval.local_scene);
  const v05Dir = path.join(projectSkill, 'assets/griffin-v05');
  for (const file of relativeFiles(v05Dir)) {
    const repoFile = `.agents/skills/blender-studio/assets/griffin-v05/${file}`;
    const committed = spawnSync('git', ['show', `HEAD:${repoFile}`], { cwd: root, encoding: null, maxBuffer: 12 * 1024 * 1024, windowsHide: true });
    if (file.endsWith('.json')) {
      const expected = spawnSync('git', ['rev-parse', `HEAD:${repoFile}`], { cwd: root, encoding: 'utf8', windowsHide: true });
      const filtered = spawnSync('git', ['hash-object', `--path=${repoFile}`, repoFile], { cwd: root, encoding: 'utf8', windowsHide: true });
      check(`frozen v05 unchanged Git-filtered content vs HEAD: ${file}`, expected.status === 0 && filtered.status === 0 && expected.stdout.trim() === filtered.stdout.trim(),
        { committedObject: expected.stdout.trim(), workingObject: filtered.stdout.trim(), note: 'Existing text:auto JSON normalizes CRLF on Git storage; raw checkout bytes are not identical to HEAD.' });
    } else {
      check(`frozen v05 unchanged raw bytes vs HEAD: ${file}`, committed.status === 0 && sha(committed.stdout) === digest(path.join(v05Dir, file)).sha256);
    }
  }

  const reference = fs.readFileSync(path.join(projectSkill, 'references/neutral-material-finish.md'), 'utf8');
  const skill = fs.readFileSync(path.join(projectSkill, 'SKILL.md'), 'utf8');
  const script = fs.readFileSync(path.join(neutralDir, 'refine-griffin.py'), 'utf8');
  check('preferred specimen is selected v01 everywhere', approval.selected_look === 'v01' && selection.selected_look === 'v01' && study.selected_look === 'v01' && candidate.look === 'v01' && bundle.look === 'Material Trial v01');
  check('acceptance remains still-only without runtime promotion', approval.runtime_promoted === false && /still material\/light reference/.test(approval.scope) && /Runtime promotion, rig\/motion changes and new paid operations are outside/.test(approval.scope) && /still finish/.test(bundle.stage));
  check('owner acceptance keeps exact preference and save request', approval.preference_quote === 'True, pero mas okay nga itong material trial, kasi ung approved parangg yellowish based dun sa comparison slide.  Pero still parehas parin maganda..' && approval.save_request_quote === 'So save mo nalng para atleast in the future gantong quality na rin :)');
  check('historical pending status retained separately from acceptance', selection.previous_status === 'comparison candidate; user acceptance pending' && selection.owner_acceptance === 'owner-acceptance.json' && study.owner_acceptance === 'owner-acceptance.json');
  check('new reference retains independent limitations and task-specific tracks', /no obvious material advantage at 64 px/.test(reference) && /hidden back surfaces were not reviewed/.test(reference) && /not apply the graphite\/cream\/gold palette, fur or nonmetallic rule universally/.test(reference) && /Other subjects keep their own material and fidelity requirements/.test(skill));
  check('replay preserves strict identity guard and fresh output', bundle.frozen_script_requires_exact_v05_master === true && script.includes(bundle.exact_replay_input.sha256) && /exist_ok=False/.test(script) && /--look v01/.test(reference) && /Do not disable the frozen/.test(reference));
  check('package separates local binary persistence from portable assets', /local only/.test(reference) && /no Blender binary is bundled or remotely backed up/.test(bundle.binary_backup) && !projectFiles.some(file => /\.blend[0-9]?$/.test(file)));
  check('reference and saved evidence retain 404000 curves', reference.includes('404,000 native curves') && candidate.invariants.native_curves === 404000 && candidate.invariants.all_geometry_buffers_unchanged === true && study.proof.native_curves === 404000);

  const tempBase = path.join(os.tmpdir(), 'grifon-neutral-integrity-');
  const isolated = fs.mkdtempSync(tempBase);
  try {
    const original = bundle.files.find(item => item.path.endsWith('-hero.png'));
    const copied = path.join(isolated, original.path);
    fs.copyFileSync(path.join(neutralDir, original.path), copied);
    const control = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--single', copied, original.sha256, String(original.bytes)], { encoding: 'utf8', windowsHide: true });
    check('isolated valid-copy integrity control exits 0', control.status === 0 && control.stdout.includes('INTEGRITY_PASS'));
    const corrupted = fs.readFileSync(copied);
    corrupted[0] ^= 1;
    fs.writeFileSync(copied, corrupted);
    const negative = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--single', copied, original.sha256, String(original.bytes)], { encoding: 'utf8', windowsHide: true });
    report.negative_control = { path: copied, mutation: 'One byte XOR at offset 0 of isolated hero copy; same length.', before_sha256: original.sha256, after_sha256: digest(copied).sha256,
      child_pid: negative.pid, exit_code: negative.status, diagnostic: negative.stdout.trim(), actual_asset_untouched: sameFile(path.join(neutralDir, original.path), original) };
    check('isolated corrupt-copy integrity control rejects with exit 1', negative.status === 1 && negative.stdout.includes('INTEGRITY_REJECT') && report.negative_control.actual_asset_untouched);
  } finally {
    if (!contained(os.tmpdir(), isolated) || !isolated.startsWith(tempBase)) throw new Error('Temporary cleanup target escaped intended task folder');
    fs.rmSync(isolated, { recursive: true, force: false });
    check('isolated negative copy removed', !fs.existsSync(isolated));
  }

  report.package = { projectSkill, mirrorSkill, totalFiles: projectFiles.length, snapshots: projectFiles.map(file => ({ path: file, ...digest(path.join(projectSkill, file)) })) };
  report.study_manifest = digest(path.join(studyDir, 'study-manifest.json'));
} catch (error) {
  check('smoke execution completed without error', false, String(error.stack || error));
}

report.passed = report.checks.filter(item => item.pass).length;
report.failed = report.checks.filter(item => !item.pass).length;
report.status = report.failed === 0 ? 'PASS' : 'FAIL';
report.exit_code = report.failed === 0 ? 0 : 1;
fs.writeFileSync(path.join(here, 'saved-skill-smoke.json'), JSON.stringify(report, null, 2) + '\n');
const failures = report.checks.filter(item => !item.pass);
fs.writeFileSync(path.join(here, 'saved-skill-smoke.md'), `# Saved neutral Blender reference smoke\n\n${report.status}: ${report.passed} checks passed; ${report.failed} failed. Command exit ${report.exit_code}.\n\n` +
  'Validated exact bundled PNG/source/render evidence/acceptance hashes and bytes, 43-entry study inventory, decoded PNG dimensions and alpha, portable installed mirror and local Markdown links, actual local master/selected scene receipts, frozen v05 source/render bytes and Git-filtered metadata, and still-only acceptance.\n\n' +
  'An isolated same-length one-byte hero corruption was rejected by the same integrity checker with exit 1; its valid-copy control exited 0. The actual asset was unchanged, and the isolated directory was removed.\n\n' +
  'No Blender render, browser, animation or provider test was run. This proves saving and integrity, not new visual or runtime performance quality. Blender binaries remain locally persistent only.\n\n' +
  (failures.length ? failures.map(item => `- ${item.name}: ${JSON.stringify(item.detail)}\n`).join('') : '') +
  'See [the machine report](saved-skill-smoke.json) and [reproducible checker](saved-skill-smoke.mjs).\n');
console.log(`${report.status}: ${report.passed} passed, ${report.failed} failed; negative exit ${report.negative_control?.exit_code ?? 'not reached'}.`);
for (const failure of failures) console.error(`${failure.name}: ${JSON.stringify(failure.detail)}`);
process.exitCode = report.exit_code;
