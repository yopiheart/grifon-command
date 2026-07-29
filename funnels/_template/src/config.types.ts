// ===========================================================================
// THE CONTRACT — every funnel instance is a copy of _template/ with only this
// file's *data* (src/funnel.config.ts) and assets/ changed. Section components
// hold zero copy; every user-visible string arrives from here as props.
//
// Evidence base: Funnel Swipe File patterns L1 L2 L4 L7 L8
// (workflows/funnel_swipe_file.md). See funnels/TEMPLATE_SPEC.md.
// ===========================================================================

export interface FunnelConfig {
  meta: {
    /** 'grifon' | 'oceanides' | … — logical partition key on every lead row. */
    clientId: string;
    /** 'grifon-starter-v1' — stamped on every lead row, server-side only. */
    funnelId: string;
    archetype: 'minimal' | 'longform';
    title: string;
    description: string;
    ogImage?: string;
  };
  /** Mirrors a DESIGN.md YAML frontmatter block 1:1 — applied as CSS custom properties. */
  brand: {
    colors: {
      primary: string;
      /** Page background. */
      surface: string;
      /** Cards / raised surfaces. */
      surfaceElevated: string;
      onSurface: string;
      onSurfaceMuted: string;
      onSurfaceDim: string;
      /** Optional light band (proof / testimonial sections). */
      proofBand?: string;
    };
    /** Full CSS font-family stacks — system fonts only, no webfont CDNs. */
    fonts: { display: string; body: string; accent?: string };
    rounded: 'sm' | 'md' | 'lg' | 'full';
  };
  form: {
    /** email is always required and always rendered, whatever the order here. */
    fields: Array<'name' | 'email' | 'phone'>;
    headline: string;
    ctaLabel: string;
    /** Under-button line — risk reversal / "no spam". */
    reassurance?: string;
    /** L4: text is shown VERBATIM and posted, then server-stamped onto the lead row. */
    consent: { required: boolean; text: string; policyVersion: string };
    /** L3: revenue-band / segment selects. Stored into the `utm` jsonb under `qualifiers`. */
    qualifiers?: Array<{ id: string; label: string; options: string[]; required: boolean }>;
  };
  tracking: { metaPixelId?: string };
  /** Ordered; rendered verbatim by Landing.tsx through SECTION_REGISTRY. */
  sections: SectionInstance[];
  thankYou: {
    headline: string;
    body: string;
    /** "Check your inbox — it's on the way" line. */
    magnetDelivery: string;
    /** L1: THE one bridge CTA. A thank-you page is never a bare receipt. */
    nextStep: { label: string; href: string; blurb?: string };
    /** Optional "what happens next" list (F02 pattern). */
    steps?: string[];
  };
}

export type SectionInstance =
  /** Minimal archetype hero: headline + the embedded LeadForm (F03/F06 anatomy). */
  | { type: 'heroOptin'; props: { eyebrow?: string; headline: string; subhead?: string; mockupImage?: string } }
  /** Longform hero: big claim + ctaBlock behavior (scrolls to #lead-form). */
  | { type: 'hero'; props: { eyebrow?: string; headline: string; subhead?: string; ctaLabel: string } }
  | { type: 'socialProofBar'; props: { rating?: string; reviewCount?: string; logos?: string[] } }
  | { type: 'testimonialWall'; props: { heading?: string; items: Array<{ quote: string; name: string; role?: string }> } }
  | { type: 'originStory'; props: { heading: string; paragraphs: string[] } }
  /** L9: specific-number authority stack. */
  | { type: 'caseStudyMetrics'; props: { heading?: string; items: Array<{ metric: string; caption: string }> } }
  | { type: 'valueStack'; props: { heading: string; items: Array<{ label: string; value?: string }>; totalLine?: string } }
  | { type: 'objectionReversal'; props: { heading: string; body: string[] } }
  | { type: 'guarantee'; props: { heading: string; body: string } }
  /** Repeatable (L8) — always scrolls to the ONE #lead-form. */
  | { type: 'ctaBlock'; props: { label: string; urgency?: string } }
  | { type: 'bonusStack'; props: { heading: string; bonuses: Array<{ title: string; blurb: string; value?: string }> } }
  | { type: 'faqAccordion'; props: { items: Array<{ q: string; a: string }> } }
  /** P.S. ladder (F01). */
  | { type: 'psBlock'; props: { items: string[] } }
  /** Standalone form (longform archetype). */
  | { type: 'leadFormSection'; props: { heading?: string } }
  | { type: 'complianceFooter'; props: { brandLine: string; disclaimer?: string; links?: Array<{ label: string; href: string }> } };

export type SectionType = SectionInstance['type'];

/** The props bag for one section type — used to type the registry entries. */
export type PropsOf<T extends SectionType> = Extract<SectionInstance, { type: T }>['props'];

/** The two section types that render the single <LeadForm id="lead-form">. */
export const FORM_SECTION_TYPES: SectionType[] = ['heroOptin', 'leadFormSection'];

/** The fixed single-anchor destination (L8). Config carries labels, never the target. */
export const LEAD_FORM_ANCHOR = 'lead-form';
