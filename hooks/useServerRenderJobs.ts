import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  listServerRenderJobs,
  hasSeenRenderJob,
  markRenderJobSeen,
} from '../services/serverJobsService';
import { startJob, endJob } from '../services/activeJobsService';
import { pollFinalRender } from '../services/finalRenderService';
import { notify } from '../services/notificationService';

const ACTIVE_PREFIX = 'final:';
const POLL_MS = 4_000;
const MAX_POLL_MS = 6 * 60 * 1000; // give up clearing the spinner after 6 min
// Only ping for renders that finished recently (i.e. "while you were away"),
// so a fresh device doesn't spam a toast for every job in 48h of history.
const RECENT_MS = 30 * 60 * 1000;

const announceDone = (jobId: string) => {
  if (hasSeenRenderJob(jobId)) return;
  toast.success('Your video ad is ready', { description: 'Finished rendering — open Video to view.' });
  notify({ title: 'Your video ad is ready 🎬', body: 'Finished rendering in another session.', tag: 'grifon-render' });
  markRenderJobSeen(jobId);
};

const announceFailed = (jobId: string) => {
  if (hasSeenRenderJob(jobId)) return;
  toast.error('A render failed', { description: 'One of your video renders did not finish.' });
  markRenderJobSeen(jobId);
};

/**
 * Cross-device render awareness (Phase 4). On mount (once), hydrate the dashboard
 * from the server job list so renders fired on another device surface here:
 *  - in-flight renders show in the existing ActiveJobsPanel and are polled to
 *    completion (so the spinner actually resolves), then announced once.
 *  - renders that already finished while away are announced once (deduped via the
 *    seen-ledger), with old history marked seen silently to avoid a toast storm.
 * Entirely best-effort — never throws into render.
 */
export const useServerRenderJobs = (enabled: boolean): void => {
  const ranRef = useRef(false);

  useEffect(() => {
    if (!enabled || ranRef.current) return;
    ranRef.current = true;
    let cancelled = false;

    const trackToCompletion = async (jobId: string) => {
      const deadline = Date.now() + MAX_POLL_MS;
      while (!cancelled && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        if (cancelled) return;
        let result;
        try {
          result = await pollFinalRender(jobId);
        } catch {
          continue; // transient poll miss — keep trying until the deadline
        }
        if (result.done) {
          endJob(`${ACTIVE_PREFIX}${jobId}`);
          if (result.status === 'done') announceDone(jobId);
          else announceFailed(jobId);
          return;
        }
      }
      endJob(`${ACTIVE_PREFIX}${jobId}`); // deadline hit — clear the spinner
    };

    void (async () => {
      const jobs = await listServerRenderJobs();
      if (cancelled) return;
      for (const job of jobs) {
        if (job.status === 'processing') {
          startJob({ id: `${ACTIVE_PREFIX}${job.jobId}`, label: 'Final render in progress…', kind: 'video' });
          void trackToCompletion(job.jobId);
          continue;
        }
        // Terminal: announce only if unseen AND recent; otherwise mark seen silently.
        if (hasSeenRenderJob(job.jobId)) continue;
        const recent = job.updatedAt ? Date.now() - Date.parse(job.updatedAt) < RECENT_MS : false;
        if (recent && job.status === 'done') announceDone(job.jobId);
        else if (recent && job.status === 'failed') announceFailed(job.jobId);
        else markRenderJobSeen(job.jobId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
};
