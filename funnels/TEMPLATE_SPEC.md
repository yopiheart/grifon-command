# funnels/_template — Data Contract & Build Spec

The canonical lead-gen funnel template (Funnel Forge Phase 2). Every funnel instance is a copy
of `_template/` with only `src/funnel.config.ts` (+ assets/data) edited — first instance:
`funnels/grifon-starter/` (`grifon-starter-v1`). Evidence base: Funnel Swipe
File patterns **L1 L2 L4 L7 L8** (`workflows/funnel_swipe_file.md`, all `proposed (baseline)`).

## Architecture rules

- **Standalone Vite app per funnel** — own `package.json`, own build. The root Grifon app build
  must never see `funnels/` (root `tsconfig.json` excludes it).
- **Vite MPA, no router**: two HTML entries — `index.html` (Landing) + `thank-you.html` (ThankYou).
- **Zero hardcoded copy in sections.** Every string arrives via `funnel.config.ts` props (L2:
  audience-skinned variants are config swaps, never code edits).
- **Single-anchor CTA (L8):** every `ctaBlock` scrolls to the ONE lead form (`#lead-form`) —
  the config carries CTA labels, the destination is fixed.
- **Thank-you = bridge (L1):** never a bare receipt — delivers the magnet + exactly one
  `nextStep` CTA.
- **Consent (L4):** checkbox **unchecked by default**, verbatim `consent.text` from config is
  displayed AND posted; server stamps it into `funnel_leads.consent_text`.
- **No external network calls** in the page: fonts are SELF-HOSTED @fontsource woff2 (Inter +
  JetBrains Mono, bundled same-origin — a bare CSS stack renders as Roboto/SF on visitor
  devices), no CDNs. Meta Pixel loads ONLY when `tracking.metaPixelId` is set (off by default).
- **ESM rule:** every VALUE import reachable from `api/lead.ts` (the `funnel.config.ts` chain)
  uses explicit `.js` extensions — Vercel's node runtime is strict ESM; extensionless imports
  build in Vite and crash in production.
- **Email hand-off:** the lead's email rides the thank-you redirect (`?email=`, scrubbed after
  read) and is appended to the bridge CTA so the product's `/login?email=` prefills its signup.
- **Motion:** `motion/react` with the vendored token system; every animation respects
  `prefers-reduced-motion` via the `reducedMotion()` helper.
- Mobile-first: design for 390×844 first, enhance at ≥1024px.

## Directory

```
funnels/_template/
  package.json            # react, react-dom, motion, zod, vite, @vitejs/plugin-react,
                          # typescript, tailwindcss (+postcss/autoprefixer), @vercel/node (dev types),
                          # @supabase/supabase-js
  vite.config.ts          # MPA inputs: index.html, thank-you.html
  tsconfig.json           # strict, mirrors root style
  tailwind.config.js, postcss.config.js
  index.html  thank-you.html
  vercel.json             # (only if needed for api routing; Vercel auto-detects /api)
  api/lead.ts             # POST — the only backend
  src/
    funnel.config.ts      # ACTIVE config (in _template: re-exports demo/minimal.ts)
    config.types.ts       # FunnelConfig + SectionInstance types (the contract)
    demo/minimal.ts       # demo config, archetype 'minimal'  (Hormozi-style, F03 anatomy)
    demo/longform.ts      # demo config, archetype 'longform' (Suby-style, F01 spine)
    theme/motionTokens.ts # vendored copy of components/ui/motionTokens.ts (verbatim)
    theme/brand.ts        # applies FunnelConfig.brand as CSS custom properties on :root
    primitives/CtaButton.tsx   # GoldButton-derived; colors from CSS vars (--brand-primary…)
    primitives/GlassCard.tsx   # simplified GlassPanel (works without backdrop-filter)
    primitives/SectionShell.tsx# width/rhythm wrapper (SHELL/BAND rhythm, self-contained)
    sections/               # one file per section type (list below)
    lib/submitLead.ts       # client: UTM capture + POST /api/lead + redirect
    pages/Landing.tsx       # sections.map() renderer + LeadForm anchor placement
    pages/ThankYou.tsx
    main.tsx  thankyou-main.tsx  index.css
```

## The contract (`src/config.types.ts`)

```ts
export interface FunnelConfig {
  meta: {
    clientId: string;            // 'grifon' | 'oceanides' | ...
    funnelId: string;            // 'grifon-starter-v1' — stamped on every lead row
    archetype: 'minimal' | 'longform';
    title: string; description: string; ogImage?: string;
  };
  brand: {                       // mirrors DESIGN.md YAML frontmatter 1:1
    colors: {
      primary: string;           // e.g. '#FFCC00'
      surface: string;           // page bg      e.g. '#09090B'
      surfaceElevated: string;   // cards        e.g. '#18181B'
      onSurface: string; onSurfaceMuted: string; onSurfaceDim: string;
      proofBand?: string;        // optional light band e.g. '#F2F1EA'
    };
    fonts: { display: string; body: string; accent?: string }; // CSS font-family stacks
    rounded: 'sm' | 'md' | 'lg' | 'full';
  };
  form: {
    fields: Array<'name' | 'email' | 'phone'>;   // email always required
    headline: string;            // e.g. "Free Gift: Get Our 5 Scaling Frameworks"
    ctaLabel: string;            // submit button text
    reassurance?: string;        // under-button line
    consent: { required: boolean; text: string; policyVersion: string };
    qualifiers?: Array<{ id: string; label: string; options: string[]; required: boolean }>;
      // L3: revenue-band / segment selects, stored into utm jsonb under key `qualifiers`
  };
  tracking: { metaPixelId?: string };
  sections: SectionInstance[];   // ordered; rendered verbatim by Landing.tsx
  thankYou: {
    headline: string; body: string;
    magnetDelivery: string;      // "Check your inbox — it's on the way" line
    nextStep: { label: string; href: string; blurb?: string };  // THE one bridge CTA (L1)
    steps?: string[];            // optional "what happens next" list (F02 pattern)
    magnet?: {                   // optional ON-PAGE delivery — no sender needed
      qualifierId: string;       // which qualifier answer routes the variant
      variants: Record<string, BattlePlan>;  // keys = EXACT qualifier option strings
      fallback: string;          // key used when ?v= is missing/unknown
    };
  };
}

export interface BattlePlan {   // one on-page magnet variant; all copy is config data
  title: string;
  blocks: Array<{ heading: string; body: string[] }>;
    // a body string starting with `SKELETON:` renders as a mono, ruled script block
}

export type SectionInstance =
  | { type: 'heroOptin';       props: { eyebrow?: string; headline: string; subhead?: string; mockupImage?: string } }
      // minimal archetype hero: headline + embedded LeadForm (F03/F06 anatomy)
  | { type: 'hero';            props: { eyebrow?: string; headline: string; subhead?: string; ctaLabel: string } }
      // longform hero: big claim + ctaBlock behavior (scrolls to #lead-form)
  | { type: 'socialProofBar';  props: { line?: string; rating?: string; reviewCount?: string; logos?: string[] } }
      // `line` = single authority sentence (L9); rating/logos = the classic strip
  | { type: 'testimonialWall'; props: { heading?: string; items: Array<{ quote: string; name: string; role?: string }> } }
  | { type: 'originStory';     props: { heading: string; paragraphs: string[] } }
  | { type: 'caseStudyMetrics';props: { heading?: string; items: Array<{ metric: string; caption: string }> } }
      // L9: specific-number authority stack
  | { type: 'valueStack';      props: { heading: string; items: Array<{ label: string; value?: string }>; totalLine?: string } }
  | { type: 'objectionReversal';props:{ heading: string; body: string[] } }
  | { type: 'guarantee';       props: { heading: string; body: string } }
  | { type: 'ctaBlock';        props: { label: string; urgency?: string } }        // repeatable (L8)
  | { type: 'bonusStack';      props: { heading: string; bonuses: Array<{ title: string; blurb: string; value?: string }> } }
  | { type: 'faqAccordion';    props: { items: Array<{ q: string; a: string }> } }
  | { type: 'psBlock';         props: { items: string[] } }                        // P.S. ladder (F01)
  | { type: 'leadFormSection'; props: { heading?: string } }                       // standalone form (longform)
  | { type: 'complianceFooter';props: { brandLine: string; disclaimer?: string; links?: Array<{ label: string; href: string }> } };
```

`Landing.tsx` renders `sections.map()` through a `SECTION_REGISTRY: Record<type, FC<props>>`.
`heroOptin` and `leadFormSection` both render the single `<LeadForm id="lead-form">` — config
authors include exactly ONE of them (dev-mode console.warn if 0 or >1).

## api/lead.ts

Self-contained (no imports from repo root — funnels deploy as separate Vercel projects).
Pipeline: POST only → honeypot (`website` field non-empty → 200 `{ ok: true }` silently, no write)
→ zod body validation (name?, email, phone?, consent boolean, consentChecked, qualifiers?,
utm?, referrer?, pageUrl?) → **email = trim().toLowerCase()** → best-effort in-memory IP rate
limit (10/min, per-container) → server stamps: `created_at`, `ip` (first x-forwarded-for hop),
`user_agent`, `consent_text` + `policy_version` (from CONFIG constants baked at build — the
handler imports funnel.config meta/form.consent), `client_id`, `funnel_id` (from config, NEVER
from the request body) → supabase-js service-role upsert `onConflict: 'funnel_id,email'` →
`{ ok: true }` | `{ error: 'CODE' }` (house error shape). Env: `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`. Table: `public.funnel_leads` (see `supabase/funnel_leads.sql`).

`lib/submitLead.ts` (client): reads `location.search` once for `utm_*` keys → posts JSON →
on `{ ok: true }` → `window.location.href = '/thank-you.html'` (Vercel serves clean
`/thank-you` too; use relative href from config if provided). With `thankYou.magnet`
configured it appends `?v=<encodeURIComponent(answer to magnet.qualifierId)>` — the redirect
is the only handoff between the two MPA documents. Optimistic disabled-button state;
inline error message on failure. Fires Pixel `Lead` on thank-you page load (no-op without pixelId).

## Demo configs

- `demo/minimal.ts` — F03 anatomy: heroOptin (+2 qualifier selects) → socialProofBar →
  complianceFooter. Grifon-brand values (DESIGN.md frontmatter) as placeholder brand.
- `demo/longform.ts` — condensed F01 spine (12–14 sections): hero → socialProofBar →
  caseStudyMetrics → originStory → testimonialWall → ctaBlock → objectionReversal →
  valueStack → guarantee → bonusStack → ctaBlock → psBlock → leadFormSection → faqAccordion
  → complianceFooter. Same placeholder brand. Copy = structurally-real placeholder (clearly
  fake product "Demo Offer Co", no lorem ipsum).
- Structural realism only — these exist to exercise every section at both viewports.

## Verification gates

1. `cd funnels/_template && npm install && npm run build` → green (tsc + vite, both entries).
2. Root `npm run build` from repo root → still green (isolation proof; root tsconfig excludes `funnels`).
3. Swap `funnel.config.ts` re-export to `demo/longform.ts` → build green again (leave minimal active).
4. smoke-tester: `npm run dev` (or `vite preview`), both demo configs at 390×844 + 1440×900 —
   layout, form focus states, reduced-motion, no horizontal scroll.
5. Live form test happens later against Supabase (table not applied yet — Neil gate).
