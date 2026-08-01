---
name: funnel-forge
description: Build and ship a conversion-optimized lead-gen funnel (landing → opt-in form → thank-you, leads to Supabase) for Grifon or a client from funnels/_template, driven by funnel.config.ts and the Funnel Swipe File's L-patterns. Use when Neil says "build the funnel", "new client funnel", "funnel forge", or a client needs a landing page + lead capture. Runs the full rep — market research → offer (grifon-cmo) → per-client DESIGN.md → config + copy → build → brand-check → mobile smoke → Vercel deploy → live lead test. NOT for researching competitor funnels (funnel-autopsy) or ad creatives (static-autopsy / viral-autopsy).
disable-model-invocation: true
---

# Funnel Forge

Ship one funnel instance under `funnels/<slug>/` from `funnels/_template/`.
Evidence source: [workflows/funnel_swipe_file.md](../../../workflows/funnel_swipe_file.md) — **every structural choice (archetype, section order, CTA cadence, form design) must cite an F- or L-ID.** No evidence → default to the template's archetype baseline and say so.
Aesthetic choices (the client's design world: palette, type, texture, motion personality) cite **D-/DP-IDs** from [workflows/design_swipe_file.md](../../../workflows/design_swipe_file.md) the same way — no evidence → anchor to the closest calibration world (D01 Grifon NOIR / D02 Oceanides) and say so in the client's DESIGN.md.
Proven end-to-end 2026-07-29 on `grifon-starter` (live: grifon-starter.vercel.app). Deploy registry: [workflows/funnel_deploys.md](../../../workflows/funnel_deploys.md).

## Hard-won build rules (each one cost a real bug on the first rep — do not relearn)

1. **ESM `.js` extensions on every value import reachable from `api/lead.ts`.** The Vercel node
   runtime is strict ESM: extensionless `./battlePlans` builds fine in Vite and CRASHES in prod
   (`ERR_MODULE_NOT_FOUND`). The import chain from `funnel.config.ts` down must use `.js`
   (type-only imports exempt). Same rule as tests/CLAUDE.md — it bit funnels too.
2. **Env-var setup is Neil's hands, one command at a time.** The permission classifier (correctly)
   blocks the agent from piping secrets. Runbook: agent may set `SUPABASE_URL` itself (public
   value); `SUPABASE_SERVICE_ROLE_KEY` = Neil runs `npx vercel env add ... production` and pastes
   at the Value prompt — NEVER paste multiple commands at once (a mangled multi-line paste
   corrupted the key on rep #1). Verify names with `npx vercel env ls production`, then
   **redeploy — env changes do nothing until the next deploy.**
3. **Fonts are self-hosted @fontsource imports, not system stacks.** "Inter" in a CSS stack
   renders as Roboto/SF on visitor devices unless the woff2 ships in the bundle. Same-origin =
   still zero external requests. Weight 500 stays banned (DESIGN.md).
4. **Share the alias URL, never the deployment URL.** `<project>-<hash>-….vercel.app` is behind
   Vercel SSO; only `<project>.vercel.app` (or the custom domain) is public.
5. **On-page magnet beats email delivery until a sender exists.** `thankYou.magnet` routes a
   variant by qualifier answer via `?v=` — instant delivery, zero infra. Email nurture is a
   separate later phase (Resend/Brevo not yet wired).
6. **The funnel→product email hand-off is standard equipment:** lead email rides the thank-you
   redirect (`?email=`, scrubbed from the URL after read), the bridge CTA targets the product's
   `/login?email=…`, and the app prefills its passwordless OTP field (App.tsx `readEmailPrefill`).
   Journey: quiz → magnet → one click → 6-digit code → dashboard. Zero re-typing.
7. **Live e2e test convention:** POST a real submission to the prod `/api/lead` → expect
   `{ok:true}` → verify the row via Supabase MCP `execute_sql` (check server-stamped funnel_id,
   consent_text, lowercased email, qualifiers-in-utm) → delete the test row. `db error: Invalid
   API key` in `vercel logs` = the service key env value is wrong.

## Division of labor (house rules)

- **This skill never writes long-form copy.** Copy briefs go to `grifon-cmo` (offer architecture, headlines, section copy, Taglish register per `_shared/taglish-voice.md`), citing F-/L-IDs.
- **Visual/section design decisions** brief `grifon-creative-director`. New sections follow the template's zero-hardcoded-copy contract.
- **QA** = `brand-check` against the governing DESIGN.md (root `DESIGN.md` for Grifon; `clients/<name>/DESIGN.md` for client work — the NOIR/Grifon rules do NOT apply to clients).
- **Executor lanes:** config-filling stays main loop; new sections / multi-file work → `code-executor`; mechanical spec-tight pieces → `codex-executor`. Builder ≠ reviewer: diffs reviewed in the main loop.
- **Browser checks** always via `smoke-tester` (foreground), 390×844 + 1440×900.

## The rep (with Neil gates marked ⛔)

1. **Inputs.** Market research + optimized offer must exist (run Market Research / Offer Optimizer modules or the client-doc equivalents first). For a new client: **run the design-curation pass BEFORE authoring `clients/<name>/DESIGN.md`** — pick 3–5 live reference sites in the client's niche (Mobbin / Land-book / whatever Neil drops), run `grifon-creative-director`'s 6-step extraction on the best 1–2, record them as D-entries in [workflows/design_swipe_file.md](../../../workflows/design_swipe_file.md), then author the DESIGN.md from that evidence (frontmatter skeleton cloned from root DESIGN.md, **values from the D-entries — never a Grifon re-skin with swapped hexes**; the 2026-07-28 NOIR-on-Oceanides rebuild is the cautionary tale). Time-box: ~30 min, not a research week. No time / no references → anchor to the closest calibration world (D01/D02) and say so.
2. ⛔ **Neil gate — offer/lead-magnet pick.** `grifon-cmo` proposes 3 lead-magnet options (value-stack framing + paid-tier bridge). No build before Neil picks.
3. **Copy.** `grifon-cmo` writes full section copy for the chosen archetype (`minimal` | `longform`), citing F-/L-IDs per structural choice. ⛔ **Neil gate — headline + offer-stack approval as a copy doc** (before any code).
4. **Build.** Copy `_template` → `funnels/<slug>/`; fill `src/funnel.config.ts` (brand block maps 1:1 from the governing DESIGN.md frontmatter; sections; form incl. verbatim consent text + policy version; thank-you). `npm run build` green inside the instance; root app build untouched.
5. **QA.** `brand-check` → `smoke-tester` mobile+desktop pass including a full opt-in walk against local dev (test rows use `funnel_id: '<slug>-smoke'`, deleted after). Fix loop until clean.
6. **Deploy.** From the instance dir: `npx vercel deploy --prod --yes` (CLI, logged in as Neil's account — creates the project on first run; NOT git-connected, redeploys are manual). Then env vars per hard-won rule #2, then redeploy. vercel.app alias unless Neil provides a domain. Meta Pixel stays OFF until a live campaign points at it. Record everything in `workflows/funnel_deploys.md`.
7. **Live verify.** Per hard-won rule #7 (POST → row → delete) → thank-you renders with the magnet → the bridge CTA carries the email to `/login` → ⛔ **Neil gate — eyeball on his phone.**
8. **Record.** Commit everything + append a handoff note (Vercel project name, root dir, env vars set, domain) to `workflows/funnel_deploys.md` — Vercel settings aren't in git and the defreezer eats local state.

## Hard constraints

- Leads table: `public.funnel_leads` (see `supabase/funnel_leads.sql`) — service-role writes only via the instance's `api/lead.ts`; never write from the browser client.
- Consent copy shown on the form must be the VERBATIM string stored as `consent_text` (server-stamped; consent_capture_plan.md doctrine).
- Never touch TUNED files. Template changes distilled from swipe evidence go through FGP proposals in the swipe file, approved by Neil.
- MVP scope = lead-gen only. Checkout / order bumps / upsells / A-B variants / email sequences are parked FGPs — do not scope-creep them into an instance build.
