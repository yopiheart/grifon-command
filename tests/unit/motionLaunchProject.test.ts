import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, readFile, writeFile, rm, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { initProject, readProject, planProject, contained, safeFile, projectDirectory, validateWindow, jsonBytes, sha256 } from '../../tools/motion-launch/project.mjs';
import { parseArguments } from '../../tools/motion-launch.mjs';
import { basicHtml, verifyVisualCache, visualCacheKey, headlessBrowserPath, browserRuntimeFiles } from '../../tools/motion-launch/visual.mjs';
import { previewPage } from '../../tools/motion-launch/preview-page.mjs';

let root: string;
beforeAll(async () => { root = await mkdtemp(path.join(tmpdir(), 'grifon-motion-reuse-')); });
afterAll(async () => { await rm(root, { recursive: true, force: true }); });
const fresh = (name: string) => path.join(root, name);

describe('isolated native motion projects', () => {
  it('copies two real instances and edits one without changing its sibling or template', async () => {
    const first = await initProject({ project: fresh('one'), templateId: 'basic-launch' });
    const second = await initProject({ project: fresh('two'), templateId: 'basic-launch' });
    expect(first.visualSourceKey).toBe(second.visualSourceKey);
    const original = await readFile(path.join(second.root, 'composition/demo.json'));
    const spec = JSON.parse(original.toString()); spec.copy.brand = 'NEIL';
    await writeFile(path.join(first.root, 'composition/demo.json'), jsonBytes(spec));
    const edited = await readProject(first.root), untouched = await readProject(second.root);
    expect(edited.visualSourceKey).not.toBe(untouched.visualSourceKey);
    expect(await readFile(path.join(second.root, 'composition/demo.json'))).toEqual(original);
    expect((await basicHtml(edited, 'portrait')).includes('>NEIL<')).toBe(true);
    expect((await basicHtml(untouched, 'landscape')).includes('>GRIFON<')).toBe(true);
    await expect(initProject({ project: first.root, templateId: 'basic-launch' })).rejects.toMatchObject({ code: 'EEXIST' });
  });

  it('keeps rational shader time and explicitly locks its copied opening', async () => {
    const state = await initProject({ project: fresh('shader'), templateId: 'shader-reference' });
    expect(state.job.timeline).toEqual({ fpsNumerator: 30000, fpsDenominator: 1001, frames: 932, sampleFrames: 1495040 });
    const plan = await planProject(state.root);
    expect(plan.lockedPrefixFrames).toBe(222); expect(plan.cues).toHaveLength(47);
    expect(plan.scope).toContain('arbitrary video conversion');
    expect(validateWindow(state.job, { from: 222, frames: 30 })).toMatchObject({ width: 960, height: 540 });
    expect(() => validateWindow(state.job, { from: 0, frames: 932, profile: 'draft' })).toThrow('bounded');
    expect(() => validateWindow(state.job, { from: 0, frames: 932, profile: 'final' })).not.toThrow();
    expect(() => validateWindow(state.job, { from: 0, frames: 20, profile: 'final' })).toThrow('locked encoded opening');
    await writeFile(path.join(state.root, 'composition/grifon-opening-pilot-silent.mp4'), 'changed opening');
    await expect(readProject(state.root)).rejects.toThrow('Locked encoded opening changed');
  });

  it('rejects invalid timeline, layout, fractional and out-of-range frame windows', async () => {
    const state = await initProject({ project: fresh('invalid'), templateId: 'basic-launch' });
    for (const window of [{ from: -1, frames: 1 }, { from: 0.5, frames: 1 }, { from: 287, frames: 2 }, { from: 0, frames: 0 }, { from: 0, frames: 121 }]) expect(() => validateWindow(state.job, window)).toThrow();
    expect(() => validateWindow(state.job, { format: 'square' })).toThrow('Unsupported format');
    expect(() => validateWindow(state.job, { profile: 'unknown' })).toThrow('Unknown profile');
    state.job.timeline.frames = 300;
    await writeFile(path.join(state.root, 'job.json'), jsonBytes(state.job));
    await expect(readProject(state.root)).rejects.toThrow('native treatment contract');
  });

  it('keys every visual source and producer while excluding audio-only changes', async () => {
    const state = await initProject({ project: fresh('keys'), templateId: 'basic-launch' });
    const window = validateWindow(state.job), runtime = { hashes: { browser: { sha256: 'browser' } }, producer: { 'visual.mjs': 'version-one' }, node: 'node', playwright: 'playwright', browserProfile: { headless: true } };
    const first = visualCacheKey(state, window, runtime);
    await writeFile(path.join(state.root, 'audio-plan.json'), '{"changed":"audio only"}\n');
    expect((await readProject(state.root)).visualSourceKey).toBe(state.visualSourceKey);
    expect(visualCacheKey(state, window, { ...runtime, producer: { 'visual.mjs': 'version-two' } })).not.toBe(first);
    await writeFile(path.join(state.root, 'composition/vendor/gsap.min.js'), '\n// visual source revision\n', { flag: 'a' });
    expect((await readProject(state.root)).visualSourceKey).not.toBe(state.visualSourceKey);
    await rm(path.join(state.root, 'composition/assets/logo.png'));
    await expect(readProject(state.root)).rejects.toThrow('Missing composition input');
  });

  it('keeps the responsive preview local and labels silent/draft/scope limits', async () => {
    const state = await initProject({ project: fresh('preview'), templateId: 'basic-launch' });
    const html = previewPage(await planProject(state.root), 'portrait');
    expect(html).toContain('Draft preview'); expect(html).toContain('locked encoded opening');
    expect(html).toContain('Explicit silent preview'); expect(html).toContain('ResizeObserver');
    expect(html).toContain('id="shots"'); expect(html).toContain('id="cues"');
    expect(html).not.toMatch(/(?:src|href)=["']https?:\/\//); expect(html).not.toMatch(/background-clip\s*:\s*text/);
  });
});

describe('cache proof and path boundaries', () => {
  it('binds supporting browser engine assets while excluding mutable logs', async () => {
    const directory = fresh('browser-assets'); await mkdir(directory);
    await writeFile(path.join(directory, 'chrome-headless-shell.exe'), 'unchanged launcher');
    await writeFile(path.join(directory, 'libGLESv2.dll'), 'engine-one');
    await writeFile(path.join(directory, 'debug.log'), 'mutable visited URLs are not read');
    const first = await browserRuntimeFiles(directory);
    await writeFile(path.join(directory, 'debug.log'), 'changed diagnostic');
    expect(await browserRuntimeFiles(directory)).toEqual(first);
    await writeFile(path.join(directory, 'libGLESv2.dll'), 'engine-two');
    const changed = await browserRuntimeFiles(directory);
    expect(changed).not.toEqual(first);
    expect(changed.find(row => row.file === 'chrome-headless-shell.exe')).toEqual(first.find(row => row.file === 'chrome-headless-shell.exe'));
  });

  it('waits for cue seek before audio starts and drops callbacks from a prior Play generation', async () => {
    const elements = new Map<string, any>(), raf: ((now: number) => void)[] = [];
    const element = () => ({ children: [] as any[], style: {}, classList: { add() {} }, clientWidth: 360, disabled: false, value: '', textContent: '', append(child: any) { this.children.push(child); } });
    for (const id of ['composition', 'stage', 'scrub', 'status', 'audio', 'scope', 'locked', 'audio-note', 'format', 'reload', 'play', 'back', 'next', 'sound', 'shots', 'cues']) elements.set(id, element());
    let resolveSeek: () => void = () => {}, audioStarts = 0, delayed = true;
    const audio = elements.get('audio'); audio.currentTime = 0; audio.pause = () => {}; audio.play = () => { audioStarts++; return Promise.resolve(); };
    elements.get('composition').contentWindow = { __motionReady: true, document: { fonts: { ready: Promise.resolve() } }, seekFullFrame: (frame: number) => frame === 66 && delayed ? new Promise<void>(resolve => { resolveSeek = () => { delayed = false; resolve(); }; }) : Promise.resolve() };
    const plan = { templateId: 'shader-reference', timeline: { fpsNumerator: 30000, fpsDenominator: 1001, frames: 932 }, formats: { landscape: { width: 1920, height: 1080 } }, lockedPrefixFrames: 222, audioStatus: 'AUTHORED_PLAN_NOT_LISTENING_ACCEPTANCE', shots: [{ key: 'opening', start: 0, end: 222 }], cues: [{ id: 'cue', frame: 66 }] };
    const html = previewPage(plan, 'landscape'), script = html.match(/<script>([\s\S]*?)<\/script>/)![1];
    vm.runInNewContext(script, { document: { getElementById: (id: string) => elements.get(id), createElement: element }, ResizeObserver: class { observe() {} }, location: { assign() {}, reload() {} }, performance, setTimeout, requestAnimationFrame(callback: (now: number) => void) { raf.push(callback); }, fetch: async () => ({ ok: true, json: async () => ({ available: true }) }) });
    await elements.get('composition').onload(); elements.get('sound').onclick();
    elements.get('cues').children[0].onclick();
    const pendingPlay = elements.get('play').onclick();
    // Control: unresolved picture still reports frame zero, so starting now would use stale audio time.
    expect(elements.get('scrub').value).toBe('0'); expect(audioStarts).toBe(0);
    resolveSeek(); await pendingPlay;
    expect(elements.get('scrub').value).toBe('66'); expect(audioStarts).toBe(1);
    expect(audio.currentTime).toBeCloseTo(66 * 1001 / 30000, 8);
    const oldCallback = raf.shift()!;
    await elements.get('play').onclick(); // Pause before the old callback dispatches.
    await elements.get('play').onclick(); // Resume creates a new generation.
    expect(raf).toHaveLength(1);
    oldCallback(performance.now()); expect(raf).toHaveLength(1);
    raf.shift()!(performance.now()); expect(raf).toHaveLength(1);
  });

  it('ignores paused audio-start cancellation but surfaces a failure in the active playback generation', async () => {
    const elements = new Map<string, any>();
    const element = () => ({ children: [] as any[], style: {}, classList: { add() {} }, clientWidth: 360, disabled: false, value: '', textContent: '', append(child: any) { this.children.push(child); } });
    for (const id of ['composition', 'stage', 'scrub', 'status', 'audio', 'scope', 'locked', 'audio-note', 'format', 'reload', 'play', 'back', 'next', 'sound', 'shots', 'cues']) elements.set(id, element());
    let rejectAudio: (error: Error) => void = () => {};
    const audio = elements.get('audio'); audio.currentTime = 0; audio.pause = () => {}; audio.play = () => new Promise<void>((_, reject) => { rejectAudio = reject; });
    elements.get('composition').contentWindow = { __motionReady: true, document: { fonts: { ready: Promise.resolve() } }, seekFullFrame: () => Promise.resolve() };
    const plan = { templateId: 'shader-reference', timeline: { fpsNumerator: 30000, fpsDenominator: 1001, frames: 932 }, formats: { landscape: { width: 1920, height: 1080 } }, lockedPrefixFrames: 222, audioStatus: 'AUTHORED_PLAN_NOT_LISTENING_ACCEPTANCE', shots: [{ key: 'opening', start: 0, end: 222 }], cues: [] };
    const script = previewPage(plan, 'landscape').match(/<script>([\s\S]*?)<\/script>/)![1];
    vm.runInNewContext(script, { document: { getElementById: (id: string) => elements.get(id), createElement: element }, ResizeObserver: class { observe() {} }, location: { assign() {}, reload() {} }, performance, setTimeout, requestAnimationFrame() {}, fetch: async () => ({ ok: true, json: async () => ({ available: true }) }) });
    await elements.get('composition').onload(); elements.get('sound').onclick();
    await elements.get('play').onclick(); await elements.get('play').onclick();
    const cancelled = new Error('The play request was interrupted by a call to pause()'); cancelled.name = 'AbortError';
    rejectAudio(cancelled); await Promise.resolve();
    expect(elements.get('play').disabled).toBe(false); expect(elements.get('scrub').disabled).toBe(false);
    await elements.get('play').onclick(); rejectAudio(new Error('Active audio decoder failed')); await Promise.resolve();
    expect(elements.get('play').disabled).toBe(true); expect(elements.get('scrub').disabled).toBe(true);
    expect(elements.get('status').textContent).toBe('Active audio decoder failed');
  });

  it('follows sound during delayed startup and buffering, and keeps silent elapsed-time and end playback', async () => {
    const elements = new Map<string, any>(), raf: ((now: number) => void)[] = [];
    const element = () => ({ children: [] as any[], style: {}, classList: { add() {} }, clientWidth: 360, disabled: false, value: '', textContent: '', append(child: any) { this.children.push(child); } });
    for (const id of ['composition', 'stage', 'scrub', 'status', 'audio', 'scope', 'locked', 'audio-note', 'format', 'reload', 'play', 'back', 'next', 'sound', 'shots', 'cues']) elements.set(id, element());
    let now = 0, resolveStart: () => void = () => {}, audioStarts = 0;
    const audio = elements.get('audio'); audio.currentTime = 0; audio.pause = () => {}; audio.play = () => { audioStarts++; return new Promise<void>(resolve => { resolveStart = resolve; }); };
    elements.get('composition').contentWindow = { __motionReady: true, document: { fonts: { ready: Promise.resolve() } }, seekFullFrame: () => Promise.resolve() };
    const fps = 30000 / 1001, plan = { templateId: 'shader-reference', timeline: { fpsNumerator: 30000, fpsDenominator: 1001, frames: 932 }, formats: { landscape: { width: 1920, height: 1080 } }, lockedPrefixFrames: 222, audioStatus: 'AUTHORED_PLAN_NOT_LISTENING_ACCEPTANCE', shots: [{ key: 'opening', start: 0, end: 222 }], cues: [{ id: 'contact', frame: 66 }] };
    const script = previewPage(plan, 'landscape').match(/<script>([\s\S]*?)<\/script>/)![1];
    vm.runInNewContext(script, { document: { getElementById: (id: string) => elements.get(id), createElement: element }, ResizeObserver: class { observe() {} }, location: { assign() {}, reload() {} }, performance: { now: () => now }, setTimeout, requestAnimationFrame(callback: (time: number) => void) { raf.push(callback); }, fetch: async () => ({ ok: true, json: async () => ({ available: true }) }) });
    const flush = async () => { await new Promise<void>(resolve => setImmediate(resolve)); };
    const tick = async (time: number) => { now = time; raf.shift()!(now); await flush(); };
    await elements.get('composition').onload(); elements.get('sound').onclick();
    elements.get('cues').children[0].onclick(); await elements.get('play').onclick();
    await tick(300); // Sound start is unresolved for 300 ms; picture must hold the contact.
    expect(elements.get('scrub').value).toBe('66'); expect(audio.currentTime).toBeCloseTo(66 / fps, 8);
    resolveStart(); await flush(); audio.currentTime = 70 / fps + 0.001;
    await tick(433); expect(elements.get('scrub').value).toBe('70');
    await tick(933); expect(elements.get('scrub').value).toBe('70'); // Buffering holds the sound clock.
    audio.currentTime = 74 / fps + 0.001; await tick(1033); expect(elements.get('scrub').value).toBe('74');
    const oldSound = raf.shift()!; await elements.get('play').onclick(); oldSound(1333); await flush();
    expect(elements.get('scrub').value).toBe('74'); expect(raf).toHaveLength(0);
    elements.get('sound').onclick(); elements.get('cues').children[0].onclick(); now = 1333;
    await elements.get('play').onclick(); await tick(1633);
    expect(elements.get('scrub').value).toBe('74'); expect(audioStarts).toBe(1); // Silent mode follows elapsed time.
    const oldSilent = raf.shift()!; await elements.get('play').onclick(); oldSilent(now);
    elements.get('scrub').value = '931'; elements.get('scrub').oninput(); await flush();
    await elements.get('play').onclick(); expect(elements.get('scrub').value).toBe('0');
    await tick(now + 932 / fps * 1000 + 1);
    expect(elements.get('scrub').value).toBe('931'); expect(elements.get('play').textContent).toBe('Play'); expect(raf).toHaveLength(0);
  });

  it('selects the same installed Windows headless revision and binds browser profile changes', () => {
    const full = 'C:\\browsers\\chromium-1228\\chrome-win64\\chrome.exe';
    expect(headlessBrowserPath(full, 'win32')).toBe('C:\\browsers\\chromium_headless_shell-1228\\chrome-headless-shell-win64\\chrome-headless-shell.exe');
    expect(() => headlessBrowserPath('C:\\Program Files\\Chrome\\chrome.exe', 'win32')).toThrow('no automatic browser install or fallback');
    const state = { visualSourceKey: 'source' }, window = { from: 222, frames: 1 };
    const runtime = { hashes: {}, producer: {}, node: 'node', playwright: 'playwright', browserProfile: { revision: '1228', expectedVersion: '149.0.7827.55' } };
    expect(visualCacheKey(state, window, runtime)).not.toBe(visualCacheKey(state, window, { ...runtime, browserProfile: { ...runtime.browserProfile, expectedVersion: 'changed' } }));
  });
  it('rejects an existing corrupt media file instead of treating filename existence as a hit', async () => {
    const directory = fresh('corrupt'); await mkdir(directory);
    const state = { visualSourceKey: 'source', job: { timeline: { fpsNumerator: 24, fpsDenominator: 1 } } }, window = { frames: 1 }, runtime = {};
    const valid = Buffer.from('formerly valid media'), corrupt = Buffer.from('corrupt media');
    await writeFile(path.join(directory, 'draft.mp4'), corrupt);
    await writeFile(path.join(directory, 'receipt.json'), jsonBytes({ key: 'key', visualSourceKey: 'source', timeline: state.job.timeline, window, runtime, media: { file: 'draft.mp4', bytes: valid.length, sha256: sha256(valid) } }));
    // Control: a filename-only cache lookup would accept this real existing file.
    expect((await readFile(path.join(directory, 'draft.mp4'))).length).toBeGreaterThan(0);
    await expect(verifyVisualCache(directory, { key: 'key', state, window, runtime })).rejects.toThrow('corrupt');
    await expect(verifyVisualCache(directory, { key: 'changed-key', state, window, runtime })).rejects.toThrow('stale');
    await rm(path.join(directory, 'draft.mp4'));
    await expect(verifyVisualCache(directory, { key: 'key', state, window, runtime })).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects traversal, absolute paths and files outside the project', async () => {
    const state = await initProject({ project: fresh('paths'), templateId: 'basic-launch' });
    for (const file of ['../job.json', '/job.json', 'composition/../../job.json', 'composition\\demo.json', './job.json']) expect(() => contained(state.root, file)).toThrow();
    await expect(safeFile(state.root, '../job.json')).rejects.toThrow('Unsafe project path');
    expect(await safeFile(state.root, 'composition/demo.json')).toBe(path.join(state.root, 'composition/demo.json'));
    const outside = fresh('outside'); await mkdir(outside);
    await symlink(outside, path.join(state.root, '.cache'), process.platform === 'win32' ? 'junction' : 'dir');
    await expect(projectDirectory(state.root, '.cache/visual')).rejects.toThrow('not contained');
  });

  it('fails unknown, duplicate, missing and fractional CLI options before work', () => {
    for (const args of [['render', '--project', 'x', '--surprise', 'yes'], ['render', '--project', 'x', '--frames', '1.2'], ['serve', '--project', 'x', '--port'], ['plan', '--project', 'x', '--project', 'y'], ['init', '--project', 'x'], ['fetch', '--project', 'x']]) expect(() => parseArguments(args)).toThrow();
    expect(parseArguments(['render', '--project', 'x', '--from', '222', '--frames', '30'])).toMatchObject({ command: 'render', values: { from: 222, frames: 30 } });
  });
});
