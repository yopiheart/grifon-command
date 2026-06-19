import { getSupabase } from './supabaseClient';

/**
 * Client wrapper for the post-render feedback capture endpoint (api/feedback.ts).
 * Sends a star rating plus, depending on the rating, an optional public
 * testimonial (≥4) or private feedback (≤3). Never sends payment/tip data —
 * the post-render moment captures sentiment and an upgrade nudge, not a tip.
 */

export type RenderFeedbackPayload = {
  render_id: string;
  rating: number;
  testimonial?: string;
  consent_to_share?: boolean;
  display_name?: string;
  feedback?: string;
};

const getAuthToken = async (): Promise<string> => {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('NOT_AUTHENTICATED');
  return token;
};

export const submitRenderFeedback = async (payload: RenderFeedbackPayload): Promise<void> => {
  const token = await getAuthToken();
  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`FEEDBACK_FAILED (${res.status}): ${text}`);
  }
};
