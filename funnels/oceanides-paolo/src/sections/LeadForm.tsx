import React, { useEffect, useRef, useState } from 'react';
import { LEAD_FORM_ANCHOR } from '../config.types';
import { funnelConfig } from '../funnel.config';
import { trackFormViewed } from '../lib/pixel';
import { submitLead } from '../lib/submitLead';
import { normalizePhMobile } from '../lib/phPhone';
import { CtaButton } from '../primitives/CtaButton';

// ===========================================================================
// LeadForm — THE conversion point. Exactly one instance exists per page (L8);
// `heroOptin` and `leadFormSection` are the two sections allowed to render it,
// and Landing.tsx warns in dev if a config includes zero or two of them.
//
// It is the one component that reads the config directly rather than through
// props: the form's fields, consent text and labels ARE the config, and a
// funnel bundle only ever contains one. Sections stay pure props.
//
// Consent (L4): unchecked by default, the verbatim config text is what the user
// reads AND what gets posted; the server stamps its own copy onto the row.
// ===========================================================================

const FIELD_META: Record<'name' | 'email' | 'phone', { label: string; type: string; autoComplete: string }> = {
  name: { label: 'Pangalan', type: 'text', autoComplete: 'name' },
  email: { label: 'Email', type: 'email', autoComplete: 'email' },
  phone: { label: 'Cellphone number', type: 'tel', autoComplete: 'tel' },
};

// Taglish, kagaya ng buong page. Naiwang English ito noong una at hindi
// makikita lang kapag may pumalya, kaya madali syang makaligtaan.
const ERROR_COPY: Record<string, string> = {
  invalid_email: 'Mukhang mali ang email. Pakicheck ulit.',
  invalid_phone: 'Pakicheck ang cellphone number.',
  missing_consent: 'Pakitik lang yung box sa ibaba bago mag-send.',
  invalid_body: 'May kulang pa. Pakitingnan ulit ang form.',
  rate_limited: 'Sunod-sunod masyado. Sandali lang, tapos ulitin mo.',
  network_error: 'Mahina ang connection. Check mo ang signal, tapos ulitin.',
};

const friendlyError = (code: string): string =>
  ERROR_COPY[code] ?? 'May problema sa amin, hindi sayo. Pakiulit lang.';

// Per-field messages. They sit UNDER the field they are about, not in the one
// banner at the foot of the form: a single "may mali" line at the bottom makes
// the visitor hunt for which of eight inputs it means, and on a phone the
// offending field is usually off-screen by then.
const FIELD_ERROR = {
  emailMissing: 'Kailangan ng email para mapadalhan ka ng kumpirmasyon.',
  emailShape: 'Mukhang mali ang email. Pakicheck ulit.',
  phoneMissing: 'Kailangan ng cellphone number. Dyan ka namin tatawagan.',
  phoneShape: 'Dapat 11 digits na nagsisimula sa 09. Halimbawa: 0917 123 4567.',
} as const;

/** Deliberately loose: the server is the judge of an address, this only stops
 *  the obvious typo before a round trip. */
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INPUT_CLASS =
  // 2px border = the DESIGN.md checklist-row/print grammar, same as GlassCard.
  // The well is surface-void, not a black overlay: "huwag pure #000000 o
  // charcoal — ang itim ay Grifon; ang navy ang nagpapa-Oceanides."
  'w-full rounded-brand bg-[rgba(7,22,48,0.7)] border-2 border-white/20 px-4 py-3 text-base text-brand-on-surface ' +
  'placeholder:text-brand-on-surface-dim transition-colors duration-200 ' +
  'focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary';

const LABEL_CLASS = 'block text-xs font-semibold uppercase tracking-widest text-brand-on-surface-dim mb-2';

// A wrong field says so on its own edge, not only in words. #FF8563 is the
// warning hue that clears the contrast floor at small sizes on a dark ground;
// the DESIGN.md `danger` #D7263D is a stamp colour and goes muddy as 12px text.
const INPUT_INVALID = '!border-[#FF8563] focus:!border-[#FF8563] focus:!ring-[#FF8563]';

const FIELD_ERROR_CLASS = 'mt-2 text-sm font-medium leading-snug text-[#FF8563]';

interface LeadFormProps {
  /**
   * Set false when the section above already renders the same heading —
   * otherwise the page shows it twice, back to back. See LeadFormSection.
   */
  showHeadline?: boolean;
}

export const LeadForm: React.FC<LeadFormProps> = ({ showHeadline = true }) => {
  const { form } = funnelConfig;
  const fields = form.fields.includes('email') ? form.fields : ['email' as const, ...form.fields];

  const [values, setValues] = useState<Record<string, string>>({});
  const [qualifiers, setQualifiers] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // "Did anyone even get here?" is a real question, not a rhetorical one: this
  // form is section 14 of 17. Threshold 0.15 is the same number StickyCta uses
  // for its own form observer, so both agree on what "at the form" means and the
  // event cannot fire while the sticky bar still thinks it is off-screen.
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const node = formRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        trackFormViewed(funnelConfig.tracking.metaPixelId);
        observer.disconnect(); // one shot; scrolling past twice is still one visit
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const setField = (field: string, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear this field's complaint the moment they start fixing it. Leaving a
    // red line under a field the visitor is actively correcting reads as
    // "still wrong" and is the fastest way to make someone give up.
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));
  };

  // Reprint a valid number in the house format on blur. It is the cheapest
  // possible receipt: the visitor SEES that what they typed was understood,
  // and every row in Supabase arrives in one shape for whoever dials it.
  // Only ever runs on a number that already passed, so a half-typed one is
  // never rewritten under the cursor.
  const tidyPhone = () => {
    const current = values.phone?.trim();
    if (!current) return;
    const parsed = normalizePhMobile(current);
    if (parsed.ok) setValues((prev) => ({ ...prev, phone: parsed.pretty }));
  };

  /** Returns the per-field errors; empty object means the form may go. */
  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};

    const email = (values.email ?? '').trim();
    if (!email) next.email = FIELD_ERROR.emailMissing;
    else if (!LOOKS_LIKE_EMAIL.test(email)) next.email = FIELD_ERROR.emailShape;

    // Phone is REQUIRED on this funnel. The config has said so since the first
    // build ("walang booking na hindi natatawagan") but nothing enforced it —
    // the markup only ever marked email required, and `noValidate` on the form
    // means the browser was not checking either. So the rule lived in a comment
    // and a lead could be submitted with no way to reach them.
    if (fields.includes('phone')) {
      const phone = (values.phone ?? '').trim();
      if (!phone) next.phone = FIELD_ERROR.phoneMissing;
      else if (!normalizePhMobile(phone).ok) next.phone = FIELD_ERROR.phoneShape;
    }

    return next;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const found = validate();
    if (Object.keys(found).length > 0) {
      setFieldErrors(found);
      setError(null);
      // Send them to the first thing that is wrong rather than making them
      // scroll a nine-field form looking for red.
      const firstBad = fields.find((field) => found[field]);
      if (firstBad) document.getElementById(`lead-${firstBad}`)?.focus();
      return;
    }

    if (form.consent.required && !consent) {
      setError(friendlyError('missing_consent'));
      return;
    }

    setFieldErrors({});
    setError(null);
    setSubmitting(true);

    // The NORMALISED number goes to the server, never the raw string: Zam
    // should not have to read three different formats down a call list.
    const parsedPhone = values.phone ? normalizePhMobile(values.phone.trim()) : undefined;

    const result = await submitLead({
      name: values.name?.trim() || undefined,
      email: (values.email ?? '').trim(),
      phone: parsedPhone?.ok ? parsedPhone.local : undefined,
      consent,
      qualifiers: Object.keys(qualifiers).length > 0 ? qualifiers : undefined,
      website: honeypot || undefined,
    });

    if (!result.ok) {
      setError(friendlyError(result.error));
      setSubmitting(false);
    }
    // On success the browser is already navigating to the thank-you bridge —
    // deliberately stay disabled so the button can't be double-fired.
  };

  return (
    <form ref={formRef} id={LEAD_FORM_ANCHOR} onSubmit={handleSubmit} noValidate className="scroll-mt-24">
      {showHeadline && <h2 className="mb-6 text-2xl leading-tight md:text-3xl">{form.headline}</h2>}

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field}>
            <label className={LABEL_CLASS} htmlFor={`lead-${field}`}>
              {FIELD_META[field].label}
            </label>
            <input
              id={`lead-${field}`}
              name={field}
              type={FIELD_META[field].type}
              autoComplete={FIELD_META[field].autoComplete}
              // Numeric keypad on a phone for the phone field. 90% of this
              // audience is on mobile and the default keyboard makes them hunt
              // for the number row on the one field that is all digits.
              inputMode={field === 'phone' ? 'numeric' : undefined}
              placeholder={field === 'phone' ? '0917 123 4567' : undefined}
              required={field === 'email' || field === 'phone'}
              aria-invalid={fieldErrors[field] ? true : undefined}
              aria-describedby={fieldErrors[field] ? `lead-${field}-error` : undefined}
              value={values[field] ?? ''}
              onChange={(e) => setField(field, e.target.value)}
              onBlur={field === 'phone' ? tidyPhone : undefined}
              className={`${INPUT_CLASS} ${fieldErrors[field] ? INPUT_INVALID : ''}`}
            />
            {fieldErrors[field] && (
              <p id={`lead-${field}-error`} role="alert" className={FIELD_ERROR_CLASS}>
                {fieldErrors[field]}
              </p>
            )}
          </div>
        ))}

        {form.qualifiers?.map((qualifier) => (
          <div key={qualifier.id}>
            <label className={LABEL_CLASS} htmlFor={`lead-q-${qualifier.id}`}>
              {qualifier.label}
            </label>
            <select
              id={`lead-q-${qualifier.id}`}
              name={qualifier.id}
              required={qualifier.required}
              value={qualifiers[qualifier.id] ?? ''}
              onChange={(e) => setQualifiers((prev) => ({ ...prev, [qualifier.id]: e.target.value }))}
              className={INPUT_CLASS}
            >
              <option value="">Pumili…</option>
              {qualifier.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Honeypot — off-screen, unlabelled to assistive tech, skipped by tab order.
          A bot fills it; the server then 200s without writing anything. */}
      <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <label className="mt-5 flex items-start gap-3 text-sm leading-relaxed text-brand-on-surface-muted">
        <input
          type="checkbox"
          name="consent"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required={form.consent.required}
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand-primary)]"
        />
        <span>{form.consent.text}</span>
      </label>

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-[#FF8563]">
          {error}
        </p>
      )}

      <CtaButton type="submit" block disabled={submitting} className="mt-6">
        {submitting ? 'Sini-send…' : form.ctaLabel}
      </CtaButton>

      {form.reassurance && (
        <p className="mt-3 text-center text-xs text-brand-on-surface-dim">{form.reassurance}</p>
      )}
    </form>
  );
};
