import { createHash } from 'node:crypto';
import { getKlingAccessToken, invalidateKlingAccessToken, KLING_API_BASE } from './klingAuth.js';

// Stable across retries and unique across the users who share our Kling account.
// This is a lookup key. An unconfirmed lookup never grants permission to submit.
export function producerKlingTaskId(userId: string, runId: string, sceneIdx: number, attempt: number): string {
  return createHash('sha256')
    .update(JSON.stringify(['grifon-producer-scene-v1', userId, runId, sceneIdx, attempt]))
    .digest('hex')
    .slice(0, 32);
}

export async function lookupProducerKlingTask(externalTaskId: string): Promise<{
  task_id: string; task_status?: string; created_at?: number;
} | null> {
  const signal = AbortSignal.timeout(8000);
  const getTask = () => fetch(`${KLING_API_BASE}/v1/videos/image2video/${encodeURIComponent(externalTaskId)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${getKlingAccessToken()}` },
    redirect: 'error',
    signal,
  });

  try {
    let response = await getTask();
    if (response.status === 401) {
      invalidateKlingAccessToken();
      response = await getTask();
    }
    if (!response.ok) return null;
    const payload = await response.json();
    const task = payload?.data;
    if (payload?.code !== 0 || task?.task_info?.external_task_id !== externalTaskId ||
        typeof task.task_id !== 'string' || !task.task_id.trim() || task.task_id.length > 200) return null;
    return {
      task_id: task.task_id,
      ...(typeof task.task_status === 'string' ? { task_status: task.task_status } : {}),
      ...(Number.isFinite(task.created_at) ? { created_at: task.created_at } : {}),
    };
  } catch {
    // No task confirmed, including timeouts and incomplete provider responses.
    return null;
  }
}
