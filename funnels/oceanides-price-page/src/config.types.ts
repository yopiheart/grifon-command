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
    /**
     * Optional on-page magnet delivery — the fastest fulfilment there is: no
     * inbox, no sender, no deliverability. The lead's answer to `qualifierId`
     * rides to the thank-you page as `?v=…`; the page renders
     * `variants[v] ?? variants[fallback]` above the bridge CTA.
     * Variant keys are the EXACT qualifier option strings shown in the form.
     */
    magnet?: {
      qualifierId: string;
      variants: Record<string, BattlePlan>;
      fallback: string;
    };
  };
}

/**
 * One on-page magnet variant. Every string lives in the funnel's own config/data —
 * the renderer is generic. A body string beginning with `SKELETON:` is rendered as
 * a fill-in-the-blanks script block (mono, ruled) instead of a paragraph.
 */
export interface BattlePlan {
  title: string;
  blocks: Array<{ heading: string; body: string[] }>;
}

/**
 * The chapter ground a section is painted on — a full-bleed band behind it,
 * rendered by Landing.tsx. See the ground ladder in src/index.css.
 *
 * `paper` and `void` are not decoration: a price page argues in chapters (here
 * is the quotation / here is the story / here is the promise) and a print piece
 * changes stock when it changes argument. Defaults to `navy` when omitted.
 */
export type Ground = 'navy' | 'navy-deep' | 'navy-gradient' | 'paper' | 'void';

/** The hero's printed quotation ticket. Copy lives in the config, as always. */
export interface PriceTicketData {
  /** Amber tab pinned over the ticket's top edge. */
  tab: string;
  /** The headline line item — the one number the page exists to state. */
  lead: { label: string; amount: string };
  /** Row label above the conditional charges, e.g. "Kung kailangan lang:". */
  addOnsLabel: string;
  /** The charges other siphoners hide. Printing them IS the offer. */
  addOns: Array<{ label: string; amount: string }>;
  /** Closing line under the dashed rule, carries the ✓. */
  footnote: string;
}

type SectionBody =
  /** Minimal archetype hero: headline + the embedded LeadForm (F03/F06 anatomy). */
  | { type: 'heroOptin'; props: { eyebrow?: string; headline: string; subhead?: string; mockupImage?: string } }
  /**
   * Longform hero: big claim + ctaBlock behavior (scrolls to #lead-form).
   * OCEANIDES additions — `logo`/`phone` are the DESIGN.md hero lockup
   * (wordmark, phonePill). `headline` supports `**amber**` runs via
   * lib/goldEmphasis: Anton has one weight, so colour is the only emphasis
   * channel the brand has.
   *
   * `ticket` is the centrepiece: the promise ("nakasulat ang presyo bago
   * magsimula") rendered as an actual printed quotation, in the first viewport.
   * `trustChips` pulls the papers up to the fold instead of leaving them in a
   * band the reader has to scroll to find.
   */
  | {
      type: 'hero';
      props: {
        eyebrow?: string;
        headline: string;
        subhead?: string;
        /** S8 audience callout — names the reader before they hit the price. */
        audience?: string;
        ctaLabel: string;
        logo?: string;
        logoAlt?: string;
        phone?: string;
        phoneLabel?: string;
        ticket?: PriceTicketData;
        /** Short bordered text chips — SEC / BIR / DENR, above the fold. */
        trustChips?: string[];
      };
    }
  /**
   * `line` is the authority sentence variant (L9); rating/logos are the strip
   * variant. This is the one place the brand has genuine proof — there are no
   * testimonials, no years in service, no household count, and inventing any of
   * those is a hard ban.
   *
   * ⚠️ `badges` is kept for template compatibility but this instance no longer
   * passes it: the DENR mark on file shows the wrong region, and a wrong seal on
   * a trust page is worse than no seal. The papers now ride the hero as
   * `trustChips` text, which is above the fold and cannot be wrong-artwork.
   */
  | {
      type: 'socialProofBar';
      props: {
        line?: string;
        rating?: string;
        reviewCount?: string;
        logos?: string[];
        badges?: Array<{ src: string; alt: string }>;
      };
    }
  | { type: 'testimonialWall'; props: { heading?: string; items: Array<{ quote: string; name: string; role?: string }> } }
  /**
   * OCEANIDES: `image` is the fleet photo. It used to hang under the hero CTA,
   * where it only ever showed as an unreadable sliver at the fold. The kwento
   * chapter is where a photograph actually earns its height.
   */
  | { type: 'originStory'; props: { heading: string; paragraphs: string[]; image?: string; imageAlt?: string } }
  /** L9: specific-number authority stack. */
  | { type: 'caseStudyMetrics'; props: { heading?: string; items: Array<{ metric: string; caption: string }> } }
  | { type: 'valueStack'; props: { heading: string; items: Array<{ label: string; value?: string }>; totalLine?: string } }
  /**
   * OCEANIDES-only. Matched before/after shots of the same fixture — the only
   * outcome proof this brand owns (no testimonials, no review count, and
   * inventing them is a hard ban). Pairs MUST be the same fixture in the same
   * light; a mismatched pair proves nothing and poisons the ones beside it.
   */
  | {
      type: 'beforeAfter';
      props: {
        heading: string;
        eyebrow?: string;
        note?: string;
        pairs: Array<{ before: string; after: string; alt: string; caption?: string }>;
      };
    }
  | { type: 'objectionReversal'; props: { heading: string; body: string[] } }
  | { type: 'guarantee'; props: { heading: string; body: string } }
  /** Repeatable (L8) — always scrolls to the ONE #lead-form. */
  | { type: 'ctaBlock'; props: { label: string; urgency?: string } }
  | { type: 'bonusStack'; props: { heading: string; bonuses: Array<{ title: string; blurb: string; value?: string }> } }
  | { type: 'faqAccordion'; props: { heading?: string; items: Array<{ q: string; a: string }> } }
  /** P.S. ladder (F01). */
  | { type: 'psBlock'; props: { items: string[] } }
  /** Standalone form (longform archetype). */
  | { type: 'leadFormSection'; props: { heading?: string } }
  | {
      type: 'complianceFooter';
      props: {
        brandLine: string;
        disclaimer?: string;
        links?: Array<{ label: string; href: string }>;
        logo?: string;
      };
    };

/**
 * A section as the config authors it: the type + props pair, plus the chapter
 * ground it is painted on. `ground` sits on the INSTANCE rather than inside
 * `props` on purpose — it is a page-composition decision owned by Landing.tsx,
 * not a prop the section component ever reads. Sections stay ground-agnostic.
 */
export type SectionInstance = SectionBody & { ground?: Ground };

export type SectionType = SectionBody['type'];

/** The props bag for one section type — used to type the registry entries. */
export type PropsOf<T extends SectionType> = Extract<SectionBody, { type: T }>['props'];

/** The two section types that render the single <LeadForm id="lead-form">. */
export const FORM_SECTION_TYPES: SectionType[] = ['heroOptin', 'leadFormSection'];

/** The fixed single-anchor destination (L8). Config carries labels, never the target. */
export const LEAD_FORM_ANCHOR = 'lead-form';
