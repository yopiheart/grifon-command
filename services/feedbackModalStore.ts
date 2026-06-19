/**
 * Global store for the post-render Feedback + upgrade-nudge modal. When a video
 * is delivered (final MP4 in the AI Editor, or a full scene pipeline in Generate
 * Video), the producing component calls triggerRenderFeedback(renderId) and
 * App.tsx — subscribed via useSyncExternalStore — renders <RenderFeedbackModal>.
 *
 * Dedupes by renderId so the same delivered video never re-prompts (e.g. on a
 * re-render of the result block). Mirrors the tiny observable pattern in
 * quotaWallStore.ts — no external state lib.
 */

export type FeedbackModalState = {
  open: boolean;
  renderId: string | null;
};

const CLOSED: FeedbackModalState = { open: false, renderId: null };

type Listener = () => void;

class FeedbackModalStore {
  private state: FeedbackModalState = CLOSED;
  private seen = new Set<string>();
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): FeedbackModalState => this.state;

  private emit() {
    this.listeners.forEach((l) => l());
  }

  /** Open the modal once per delivered render. No-op if already prompted for this id. */
  trigger(renderId: string) {
    if (!renderId || this.seen.has(renderId)) return;
    this.seen.add(renderId);
    this.state = { open: true, renderId };
    this.emit();
  }

  dismiss() {
    if (!this.state.open) return;
    this.state = { ...this.state, open: false };
    this.emit();
  }
}

export const feedbackModalStore = new FeedbackModalStore();

export const triggerRenderFeedback = (renderId: string) =>
  feedbackModalStore.trigger(renderId);

export const dismissRenderFeedback = () => feedbackModalStore.dismiss();
