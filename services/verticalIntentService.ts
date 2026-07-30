// One-question segmentation stash. Mirrors moduleIntentService: a guest answers
// "Anong business mo?" on the landing CTA, we stash the chosen vertical
// ('product' | 'service' | 'real_estate'), route them through signup, and
// App.tsx pops the intent after auth to pre-fill the One-Shot vertical picker.
// sessionStorage-backed with graceful fallback if storage throws (private mode /
// disabled cookies).

const INTENDED_VERTICAL_KEY = 'grifon_intended_vertical';

export const setIntendedVertical = (vertical: string) => {
  try {
    sessionStorage.setItem(INTENDED_VERTICAL_KEY, vertical);
  } catch {}
};

export const popIntendedVertical = (): string | null => {
  try {
    const raw = sessionStorage.getItem(INTENDED_VERTICAL_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(INTENDED_VERTICAL_KEY);
    return raw || null;
  } catch {
    return null;
  }
};
