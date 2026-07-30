// Return-to-ad intent for the Step-8 paywall exits. Mirrors moduleIntentService:
// the user leaves the finished-ad screen for pricing/checkout, we stash the
// intent, and App.tsx pops it when they re-enter the app surface to land them
// back on their ad instead of an empty dashboard. sessionStorage-backed with
// graceful fallback if storage throws (private mode / disabled cookies).

const RETURN_TO_AD_KEY = 'grifon_return_to_ad';

export const setReturnToAd = () => {
  try {
    sessionStorage.setItem(RETURN_TO_AD_KEY, '1');
  } catch {}
};

export const popReturnToAd = (): boolean => {
  try {
    const raw = sessionStorage.getItem(RETURN_TO_AD_KEY);
    if (!raw) return false;
    sessionStorage.removeItem(RETURN_TO_AD_KEY);
    return true;
  } catch {
    return false;
  }
};
