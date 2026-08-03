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
    /** Amber chip above the headline — the brand's status stamp on the arrival chapter. */
    eyebrow?: string;
    headline: string;
    body: string;
    /**
     * "Check your inbox — it's on the way" line. Renders as the EYEBROW of the
     * magnet chapter, i.e. the label on the handout, not a page-level kicker.
     */
    magnetDelivery: string;
    /** L1: THE one bridge CTA. A thank-you page is never a bare receipt. */
    nextStep: { label: string; href: string; blurb?: string };
    /** Optional "what happens next" list (F02 pattern). */
    steps?: string[];
    /** Heading over `steps`. Omit and the list renders bare. */
    stepsHeading?: string;
    /**
     * Printed beside the bridge CTA. You cannot SAVE a number you cannot SEE,
     * and a bare `tel:` button does nothing at all on a desktop browser, so the
     * number itself has to be on the page as text.
     */
    phone?: string;
    phoneLabel?: string;
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
  /** The headline line item — the one number the page exists to state.
   *  `sub` is a small dim line under the label. WALANG numero dito: ang
   *  "4,000 litro" katabi ng "₱5,000" ay dalawang malaking numero na
   *  nagbabanggaan sa mabilis na tingin (Neil, 2026-08-01 — "may 4k tapos
   *  5k, ang gulo"). Isang numero lang ang ticket: ang presyo. */
  lead: { label: string; sub?: string; amount: string };
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
        /**
         * Messenger link for the StickyCta's third door. It is NOT rendered in
         * the hero itself: the fold already carries the form CTA and the phone,
         * and a third choice at the decision moment is a choice fewer people
         * make. It lives on the hero props only because StickyCta reads them.
         */
        messenger?: string;
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
        /** Totoong registration numbers, rendered bilang print receipts row.
         *  Verbatim ang label at value na galing kay Neil/Boss Jay — walang
         *  inimbentong numero, walang binagong format. */
        receipts?: Array<{ label: string; value: string }>;
      };
    }
  /**
   * OCEANIDES-only. A scrolling strip of client NAMES — deliberately text, never
   * logo images: we hold no rights to their artwork, and a wall of borrowed
   * marks is the wrong device in a print world anyway. Names only, verbatim from
   * the company profile deck.
   */
  | { type: 'clientsMarquee'; props: { label?: string; names: string[] } }
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
  /**
   * OCEANIDES-only. The cost-of-inaction block, sitting immediately before the
   * form — the last argument a reader meets before deciding.
   *
   * 🔴 THE CONSTRAINT THAT SHAPES IT. Loss aversion normally reaches for a
   * deadline or a rising price, and this brand can use NEITHER: a fake countdown
   * is banned outright (clients/oceanides/DESIGN.md, "walang fake proof"), and
   * the price genuinely does not rise with waiting — ₱5,000 is ₱5,000 next
   * month. So the loss on offer here is not money, it is the CHOICE: today the
   * reader picks the day, the crew and the written price; after it overflows
   * they take whoever answers first, which is the exact situation that produces
   * the ₱2,500-became-₱5,500 story this page already quotes from its own ad.
   *
   * `compare` is the device: two work-order columns, same shape, so the loss is
   * read rather than asserted. Anything added here must be defensible from copy
   * already on the page — no new numbers enter the funnel through this section.
   */
  | {
      type: 'costOfDelay';
      props: {
        eyebrow?: string;
        heading: string;
        body: string[];
        compare?: { nowLabel: string; nowItems: string[]; laterLabel: string; laterItems: string[] };
        /** Closing line, under the columns. Carries the one `==highlight==`. */
        close?: string;
      };
    }
  /**
   * Risk reversal. `seal` is the printed number (IM8's "90 DAY" device, read on
   * 2026-08-02 and ported into the print world); `chips` is the checkmark row
   * under it.
   *
   * 🔴 EVERY CHIP MUST BE BACKED BY COPY THAT ALREADY SHIPS ELSEWHERE ON THE
   * PAGE. The row's whole value is that a skimmer can audit it against the
   * sections above; one unbacked chip turns the row into decoration and takes
   * the honest ones down with it. There is deliberately NO rating and NO review
   * count here — this brand has zero reviews and inventing them is a hard ban.
   */
  | {
      type: 'guarantee';
      props: {
        eyebrow?: string;
        heading: string;
        body: string;
        seal?: { value: string; unit: string; label: string };
        chips?: string[];
      };
    }
  /**
   * OCEANIDES-only. Names and shows the one person who actually arrives. The
   * last thing a household weighs before booking is not the price, it is who is
   * walking into their yard. Requires a signed likeness consent — the same gate
   * every Marvin plate goes through.
   */
  | {
      type: 'fieldInspector';
      props: {
        eyebrow?: string;
        heading: string;
        body: string[];
        image: string;
        imageAlt: string;
        name: string;
        role: string;
        /**
         * Pangalawang inspector, opsyonal (2026-08-03). Dalawa na sila: si
         * Marvin ang nasa KM-004 na video ad, si Gabriel ang nasa GB-001. Kung
         * isang mukha lang ang nasa page at iba ang galing sa ad, sira ang
         * message match — at nasa CLOSE yun naka-upo, ang tanging bagay na
         * sinusubukan nating ayusin (A3: 100 message, isang order).
         *
         * ADDITIVE sya nang sinasadya: `undefined` = eksaktong dating itsura,
         * isang litrato. Walang lumang page na nasisira.
         */
        second?: { image: string; imageAlt: string; name: string; role: string };
      };
    }
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
        /**
         * The LAST DOOR (Neil, 2026-08-01): "if ever na umabot sila dun at hindi
         * mag fill up at hindi pumindot atleast meron silang visible number."
         * A reader who scrolled the whole page without acting is not a lost
         * lead, they are an unanswered question. Printed number + Messenger,
         * above the legal text, because the fine print is the last thing to
         * READ and this is the last thing to DO.
         */
        contactLine?: string;
        phone?: string;
        phoneLabel?: string;
        /** `m.me/...` or the full page URL. Omit and the button does not render. */
        messenger?: string;
        messengerLabel?: string;
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
