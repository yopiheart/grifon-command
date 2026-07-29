---
name: funnel-forge
description: Build and ship a conversion-optimized lead-gen funnel (landing → opt-in form → thank-you, leads to Supabase) for Grifon or a client from funnels/_template, driven by funnel.config.ts and the Funnel Swipe File's L-patterns. Use when Neil says "build the funnel", "new client funnel", "funnel forge", or a client needs a landing page + lead capture. Runs the full rep — market research → offer (grifon-cmo) → per-client DESIGN.md → config + copy → build → brand-check → mobile smoke → Vercel deploy → live lead test. NOT for researching competitor funnels (funnel-autopsy) or ad creatives (static-autopsy / viral-autopsy).
disable-model-invocation: true
---

# Funnel Forge

Ship one funnel instance under `funnels/<slug>/` from `funnels/_template/`.
Evidence source: [workflows/funnel_swipe_file.md](../../../workflows/funnel_swipe_file.md) — **every structural choice (archetype, section order, CTA cadence, form design) must cite an F- or L-ID.** No evidence → default to the template's archetype baseline and say so.

## Division of labor (house rules)

- **This skill never writes long-form copy.** Copy briefs go to `grifon-cmo` (offer architecture, headlines, section copy, Taglish register per `_shared/taglish-voice.md`), citing F-/L-IDs.
- **Visual/section design decisions** brief `grifon-creative-director`. New sections follow the template's zero-hardcoded-copy contract.
- **QA** = `brand-check` against the governing DESIGN.md (root `DESIGN.md` for Grifon; `clients/<name>/DESIGN.md` for client work — the NOIR/Grifon rules do NOT apply to clients).
- **Executor lanes:** config-filling stays main loop; new sections / multi-file work → `code-executor`; mechanical spec-tight pieces → `codex-executor`. Builder ≠ reviewer: diffs reviewed in the main loop.
- **Browser checks** always via `smoke-tester` (foreground), 390×844 + 1440×900.

## The rep (with Neil gates marked ⛔)

1. **Inputs.** Market research + optimized offer must exist (run Market Research / Offer Optimizer modules or the client-doc equivalents first). For a new client: author `clients/<name>/DESIGN.md` by cloning the root DESIGN.md frontmatter skeleton and swapping values (Oceanides precedent).
2. ⛔ **Neil gate — offer/lead-magnet pick.** `grifon-cmo` proposes 3 lead-magnet options (value-stack framing + paid-tier bridge). No build before Neil picks.
3. **Copy.** `grifon-cmo` writes full section copy for the chosen archetype (`minimal` | `longform`), citing F-/L-IDs per structural choice. ⛔ **Neil gate — headline + offer-stack approval as a copy doc** (before any code).
4. **Build.** Copy `_template` → `funnels/<slug>/`; fill `src/funnel.config.ts` (brand block maps 1:1 from the governing DESIGN.md frontmatter; sections; form incl. verbatim consent text + policy version; thank-you). `npm run build` green inside the instance; root app build untouched.
5. **QA.** `brand-check` → `smoke-tester` mobile+desktop pass including a full opt-in walk against local dev (test rows use `funnel_id: '<slug>-smoke'`, deleted after). Fix loop until clean.
6. **Deploy.** New Vercel project, Root Directory `funnels/<slug>`, env vars `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. vercel.app URL unless Neil provides a domain. Meta Pixel stays OFF until a live campaign points at it.
7. **Live verify.** Real submission on the production URL → row in `funnel_leads` (check via Supabase MCP) → thank-you renders → ⛔ **Neil gate — eyeball on his phone.**
8. **Record.** Commit everything + append a handoff note (Vercel project name, root dir, env vars set, domain) to `workflows/funnel_deploys.md` — Vercel settings aren't in git and the defreezer eats local state.

## Hard constraints

- Leads table: `public.funnel_leads` (see `supabase/funnel_leads.sql`) — service-role writes only via the instance's `api/lead.ts`; never write from the browser client.
- Consent copy shown on the form must be the VERBATIM string stored as `consent_text` (server-stamped; consent_capture_plan.md doctrine).
- Never touch TUNED files. Template changes distilled from swipe evidence go through FGP proposals in the swipe file, approved by Neil.
- MVP scope = lead-gen only. Checkout / order bumps / upsells / A-B variants / email sequences are parked FGPs — do not scope-creep them into an instance build.
