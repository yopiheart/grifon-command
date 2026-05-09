// In-memory pub/sub for active long-running jobs (Gemini video, heavy
// storyboard chains, multi-step research). Cleared on tab close — Phase 1
// doesn't persist. Phase 2 modules call startJob/updateJob/endJob to
// surface progress on the dashboard.

export type JobKind = 'video' | 'storyboard' | 'research' | 'image' | 'generic';

export interface ActiveJob {
  id: string;
  label: string;
  kind: JobKind;
  startedAt: number;
  progress?: number; // 0..1, optional
  detail?: string;
}

type Listener = (jobs: ActiveJob[]) => void;

let jobs: ActiveJob[] = [];
const listeners = new Set<Listener>();

const emit = () => {
  const snapshot = jobs.slice();
  listeners.forEach(l => l(snapshot));
};

export const subscribeActiveJobs = (l: Listener): (() => void) => {
  listeners.add(l);
  l(jobs.slice());
  return () => { listeners.delete(l); };
};

export const startJob = (job: Omit<ActiveJob, 'startedAt'>): string => {
  const existing = jobs.findIndex(j => j.id === job.id);
  const next: ActiveJob = { ...job, startedAt: Date.now() };
  if (existing >= 0) {
    jobs = jobs.map((j, i) => (i === existing ? { ...j, ...next, startedAt: j.startedAt } : j));
  } else {
    jobs = [...jobs, next];
  }
  emit();
  return job.id;
};

export const updateJob = (id: string, patch: Partial<Pick<ActiveJob, 'progress' | 'detail' | 'label'>>): void => {
  const idx = jobs.findIndex(j => j.id === id);
  if (idx < 0) return;
  jobs = jobs.map((j, i) => (i === idx ? { ...j, ...patch } : j));
  emit();
};

export const endJob = (id: string): void => {
  const before = jobs.length;
  jobs = jobs.filter(j => j.id !== id);
  if (jobs.length !== before) emit();
};

export const getActiveJobs = (): ActiveJob[] => jobs.slice();
