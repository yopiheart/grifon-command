// DEV ONLY: renders the real chat surface with a public mock controller. No provider imports.
import { useState } from 'react';
import { CompanionChatShell, type ConversationBinding } from '../components/CompanionChat/CompanionChatShell';
import ReactDOM from 'react-dom/client';
import { CompanionChatSurface } from '../components/CompanionChat/CompanionChatSurface';
import type { ProducerSurfaceController } from '../components/OneShotAd/ProducerFlow';
import type { ProductionInput } from '../services/oneShotIntake';
import type { ProductionRun } from '../services/producerOrchestrator';
import Button from '../components/ui/Button';
import '../index.css';

const IMAGE = '/tests/fixtures/sample-batch/timpla-hero.jpg';
const VIDEO = '/tests/fixtures/sample-batch/before_after-run1-complete-raw.mp4';
const stageIds = ['market_research', 'script', 'storyboard', 'scene_images', 'video_prompts', 'video', 'thumbnail', 'voices', 'edl', 'final_render'] as const;
type FixtureEvent = 'researching' | 'script' | 'storyboard' | 'video' | 'result' | 'error' | 'resume-error';
type FixtureCall = { name: string; value?: unknown };
const calls: FixtureCall[] = [];
const debug = new URLSearchParams(window.location.search).get('debug') === '1';
const defaultInput: ProductionInput = { brandName: 'North Coffee', productName: 'Cold brew', productDescription: 'Fresh coffee for busy mornings', offer: 'Two bottles for 199', price: '199', heroImageBase64: IMAGE, avatar: { url: '', description: '', ethnicity: 'Filipino', prompt: '' }, voiceId: '', language: 'English', aspectRatio: '9:16', scriptType: 'Testimonial' };

function makeRun(input: ProductionInput, userId: string): ProductionRun {
  return { runId: crypto.randomUUID(), userId, createdAt: 1, updatedAt: 1, status: 'running', input,
    stages: stageIds.map(id => ({ id, label: id === 'script' ? 'Writing your script' : id.replace(/_/g, ' '), status: id === 'market_research' ? 'running' : 'pending', attempts: 0 })), scenes: [] };
}

function Fixture({ conversation, userId, setUserId }: { conversation: ConversationBinding; userId: string; setUserId: (id: string) => void }) {
  const checkpointKey = `companion_fixture_checkpoint:${userId}:${conversation.chat.id}`;
  const [run, setRun] = useState<ProductionRun | null>(() => {
    try { return JSON.parse(sessionStorage.getItem(checkpointKey) || 'null'); } catch { return null; }
  });
  const [readOnly, setReadOnly] = useState(!!conversation.chat.runId);
  const [phase, setPhase] = useState<ProducerSurfaceController['phase']>('launch');
  const [error, setError] = useState('');
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [presetUnlocked, setPresetUnlocked] = useState(true);
  const [videoAllowed, setVideoAllowed] = useState<boolean | null>(true);
  const saveRun = (next: ProductionRun | null) => {
    setRun(next);
    if (next) sessionStorage.setItem(checkpointKey, JSON.stringify(next));
    else sessionStorage.removeItem(checkpointKey);
  };
  const emit = (event: FixtureEvent) => {
    calls.push({ name: 'fixture-event', value: event });
    if (event === 'error' || event === 'resume-error') {
      setError('Fixture connection interrupted. Nothing new was submitted.');
      setPhase(event === 'resume-error' ? 'resume-error' : 'error');
      if (run) saveRun({ ...run, status: 'error', error: 'Fixture connection interrupted.' });
      return;
    }
    setError(''); setPhase(event === 'researching' ? 'researching' : 'launch');
    const next = structuredClone(run || makeRun(defaultInput, userId));
    next.status = event === 'storyboard' || event === 'result' ? 'review' : 'running';
    next.gate = event === 'storyboard' ? 'storyboard' : event === 'result' ? 'first_cut' : undefined;
    const current = event === 'researching' ? 0 : event === 'script' ? 1 : event === 'storyboard' ? 5 : event === 'video' ? 5 : 10;
    next.stages = next.stages.map((s, i) => ({ ...s, status: i < current ? 'done' : i === current && event !== 'storyboard' ? 'running' : 'pending' }));
    if (['storyboard', 'video', 'result'].includes(event)) {
      next.storyboard = [{ scriptLine: `Start your morning with ${next.input.brandName}.`, sceneDescription: 'Existing local sample product photo, not generated.', imageUrl: IMAGE }];
      next.scenes = [{ sceneIdx: 0, imageUrl: IMAGE, status: event === 'result' ? 'done' : 'pending', ...(event === 'result' ? { videoUrl: VIDEO } : {}) }];
    }
    if (event === 'result') { next.finalVideoUrl = VIDEO; next.finalDownloadUrl = VIDEO; next.storyboardApproved = true; }
    saveRun(next);
  };
  const controller: ProducerSurfaceController = {
    readOnly, resume: async () => { calls.push({ name: 'resume' }); setReadOnly(false); },
    run, phase, error, busy: !readOnly && (phase === 'researching' || run?.status === 'running'), reshooting: null, presetBusy: false, approving: false,
    start: async input => { calls.push({ name: 'start', value: input }); setPhase('researching'); saveRun(makeRun(input, userId)); },
    approve: async () => { calls.push({ name: 'approve' }); emit('video'); },
    regenScene: async index => { calls.push({ name: 'regenScene', value: index }); },
    reshoot: async index => { calls.push({ name: 'reshoot', value: index }); },
    choosePreset: async id => { calls.push({ name: 'choosePreset', value: id }); },
    retry: async () => { calls.push({ name: 'retry' }); setError(''); setPhase('launch'); if (run) saveRun({ ...run, status: 'running', error: undefined }); },
    retryResume: () => { calls.push({ name: 'retryResume' }); setError(''); setPhase('launch'); },
    reset: () => { calls.push({ name: 'reset' }); saveRun(null); setPhase('launch'); setError(''); },
    cancel: () => { calls.push({ name: 'cancel' }); saveRun(null); setPhase('launch'); setError(''); },
  };
  Object.assign(window, { companionFixture: {
    snapshot: () => ({ calls: structuredClone(calls), run, phase, userId, chatId: conversation.chat.id }),
    emit,
    account: (id: string) => { setUserId(id); setRun(null); setPhase('launch'); setError(''); },
    quota: setQuotaBlocked, presets: setPresetUnlocked, videoAllowed: setVideoAllowed,
    clearCalls: () => { calls.splice(0); },
  } });
  return <div className="companion-fixture" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}><style>{'.companion-fixture > [data-testid="companion-chat"] { height: auto; flex: 1; min-height: 0; }'}</style>{debug && <details style={{ flexShrink: 0, background: '#18181b', color: '#fafafa', padding: '0 16px', borderBottom: '1px solid #3f3f46' }}>
    <summary style={{ minHeight: 44, display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: 13 }}>Local test fixture · mocked generation · no provider calls</summary>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingBottom: 12 }}>
      {(['researching', 'script', 'storyboard', 'video', 'result', 'error', 'resume-error'] as const).map(event => <button type="button" key={event} onClick={() => emit(event)} style={{ minHeight: 44, padding: '8px 12px', border: '1px solid #71717a', borderRadius: 8 }}>Fixture: {event}</button>)}
      <button type="button" onClick={controller.reset} style={{ minHeight: 44, padding: '8px 12px', border: '1px solid #71717a', borderRadius: 8 }}>Fixture: reset</button>
      <span style={{ width: '100%', fontSize: 12 }}>These controls emit test callbacks. They do not create an ad or call a provider. Scene images and the video are existing local samples, not generated from your brief.</span>
    </div>
  </details>}<CompanionChatSurface key={conversation.chat.id} conversation={conversation} controller={controller} userId={userId} onAvatarPresentation={conversation.presentAvatar} fixtureLabel="Preview · simulated output."
    onBack={() => { void conversation.leave(() => { calls.push({ name: 'back' }); }).catch(() => {}); }} onUpgrade={() => { void conversation.leave(() => { calls.push({ name: 'upgrade' }); }).catch(() => {}); }}
    presetUnlocked={presetUnlocked} quotaBlocked={quotaBlocked} videoAllowed={videoAllowed} /></div>;
}

function Preview() {
  const [userId, setUserId] = useState('fixture-user-a');
  const [signedIn, setSignedIn] = useState(true);
  const account = (id: string) => { setUserId(id); setSignedIn(true); };
  if (!signedIn) return <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-950 px-6 font-sans text-sm text-white"><h1 className="!text-lg !font-semibold !normal-case !tracking-tight">Preview signed out</h1><p className="max-w-sm text-center text-sm leading-relaxed text-zinc-300">This simulated account is signed out. Your preview chats remain saved on this device.</p><Button className="!rounded-xl" onClick={() => setSignedIn(true)}>Simulate sign in</Button><a href="/login" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#FFCC00]">Sign in to Grifon</a></main>;
  return <CompanionChatShell key={userId} userId={userId} userEmail={`${userId}@preview.invalid`} userName="Preview account" plan="free" preview
    onLogout={async () => { calls.push({ name: 'preview-sign-out' }); setSignedIn(false); }} onUpgrade={() => { calls.push({ name: 'upgrade' }); }} onStudio={() => { calls.push({ name: 'back' }); }}>
    {conversation => <Fixture key={conversation.chat.id} userId={userId} setUserId={account} conversation={conversation} />}</CompanionChatShell>;
}

if ((import.meta as ImportMeta & { env: { DEV: boolean } }).env.DEV) ReactDOM.createRoot(document.getElementById('root')!).render(<Preview />);
