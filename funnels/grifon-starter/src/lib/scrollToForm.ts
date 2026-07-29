import { LEAD_FORM_ANCHOR } from '../config.types';

// L8 single-anchor CTA: every CTA on the page routes here. The config supplies
// the label; the destination is fixed in code so a funnel can never grow a
// second competing conversion point.
export const scrollToLeadForm = (): void => {
  const form = document.getElementById(LEAD_FORM_ANCHOR);
  if (!form) return;

  form.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  });

  // Land the caret in the first field — the CTA promised the form, so deliver it
  // ready to type. Deferred so the scroll starts before focus yanks the viewport.
  window.setTimeout(() => {
    form.querySelector<HTMLInputElement>('input:not([type="hidden"]):not([tabindex="-1"])')?.focus({
      preventScroll: true,
    });
  }, 400);
};
