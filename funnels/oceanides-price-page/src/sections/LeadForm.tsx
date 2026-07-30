import React, { useState } from 'react';
import { LEAD_FORM_ANCHOR } from '../config.types';
import { funnelConfig } from '../funnel.config';
import { submitLead } from '../lib/submitLead';
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
  missing_consent: 'Pakitik lang yung box sa ibaba bago mag-send.',
  invalid_body: 'May kulang pa. Pakitingnan ulit ang form.',
  rate_limited: 'Sunod-sunod masyado. Sandali lang, tapos ulitin mo.',
  network_error: 'Mahina ang connection. Check mo ang signal, tapos ulitin.',
};

const friendlyError = (code: string): string =>
  ERROR_COPY[code] ?? 'May problema sa amin, hindi sa iyo. Pakiulit lang.';

const INPUT_CLASS =
  // 2px border = the DESIGN.md checklist-row/print grammar, same as GlassCard.
  'w-full rounded-brand bg-black/30 border-2 border-white/20 px-4 py-3 text-base text-brand-on-surface ' +
  'placeholder:text-brand-on-surface-dim transition-colors duration-200 ' +
  'focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary';

const LABEL_CLASS = 'block text-xs font-semibold uppercase tracking-widest text-brand-on-surface-dim mb-2';

export const LeadForm: React.FC = () => {
  const { form } = funnelConfig;
  const fields = form.fields.includes('email') ? form.fields : ['email' as const, ...form.fields];

  const [values, setValues] = useState<Record<string, string>>({});
  const [qualifiers, setQualifiers] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if (form.consent.required && !consent) {
      setError(friendlyError('missing_consent'));
      return;
    }

    setError(null);
    setSubmitting(true);

    const result = await submitLead({
      name: values.name?.trim() || undefined,
      email: (values.email ?? '').trim(),
      phone: values.phone?.trim() || undefined,
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
    <form id={LEAD_FORM_ANCHOR} onSubmit={handleSubmit} noValidate className="scroll-mt-24">
      <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-6">{form.headline}</h2>

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
              required={field === 'email'}
              value={values[field] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
              className={INPUT_CLASS}
            />
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
