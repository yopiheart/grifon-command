// Intent-preserving module deep-link. Mirrors billingService's intended-plan
// store: a guest taps a task-specific module CTA on the landing page, we stash
// the target module id, route them through signup, and App.tsx pops the intent
// after auth to drop them straight into that module. sessionStorage-backed with
// graceful fallback if storage throws (private mode / disabled cookies).

const INTENDED_MODULE_KEY = 'grifon_intended_module';

export const setIntendedModule = (moduleId: string) => {
  try {
    sessionStorage.setItem(INTENDED_MODULE_KEY, moduleId);
  } catch {}
};

export const popIntendedModule = (): string | null => {
  try {
    const raw = sessionStorage.getItem(INTENDED_MODULE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(INTENDED_MODULE_KEY);
    return raw || null;
  } catch {
    return null;
  }
};
