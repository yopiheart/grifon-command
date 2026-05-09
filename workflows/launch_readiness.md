# Workflow: Launch Readiness

**Objective:** Track what's required before GRIFON COMMAND can take real paying users at `app.grifon.ai`.

This is the meta-workflow. It doesn't do the work itself — it points to the workflows that do, and tracks overall progress. **Source of truth = the code + `git log`.** This file summarizes; it does not replace.

## Where we are now

Site is live at `app.grifon.ai`. All 7 launch gates closed. Test-mode billing fully proven end-to-end on prod (checkout → PayMongo → webhook → Supabase row → UI tier upgrade). Voice cloning live for Creator+ (`fa1fec1`/`9837d0b`/`66df4ca`/`5855fb3`). Director AI storyboard rules + IDENTITY_LOCK wiring fix proven on Bukidnon Brew + TESTIMONIAL regression runs (2026-05-05 / 2026-05-06). Wizard state persistence shipped + smoke-tested (2026-05-06 evening, smoke pass next morning).

**The next ship is the pre-beta polish bundle.** After that ships and gets bundled-committed, beta launches with **MrBeast + TESTIMONIAL only** to 5–10 hand-picked Filipino SMB owners. TEMU is gated as `// COMING_IN_V1.1` for the cohort.

Live cutover for real money is blocked only on PayMongo merchant verification (Gate 3-prod below).

## Next concrete action — pre-beta polish bundle (~full day)

| # | Item | Files | Status |
|---|---|---|---|
| 3a | JWT auto-refresh + 401 error boundary | App.tsx, services/supabaseClient.ts | Pairs with persistence: state is saved, 401 catch + re-auth makes auth interruption invisible. |
| 3b | Sonner toast restyle (zinc-950 + gold + mono caps) | App.tsx Toaster config | ~5-line theme override. Current white background breaks design system. |
| 3c | Suppress "Run Market Research First" nudge while resume pill is up | App.tsx:563 | 1-line: `&& !showResumePill`. |
| 3d | Gate TEMU option in scriptType picker as `// COMING_IN_V1.1` | components/Step2BusinessInfo.tsx | Prevents broken MrBeast-cosplaying-as-TEMU formula reaching beta. |
| 3e | Wire `clientDetails.offer` + `businessInfo.separator` + `businessInfo.audience` into script generation per the Slotting Matrix | services/geminiService.ts | **CLAUDE.md-tuned, requires grill-me.** ~half day. **Highest-ROI prompt change available pre-beta.** Full brief: [script_input_wiring_brief.md](script_input_wiring_brief.md). |
| 3f | Drop unused `businessInfo.logoImageUrl`. Decide on `clientDetails.services` (drop / wire / park) | components/Step2BusinessInfo.tsx | 5-min UI cleanup once Neil decides on services. |

After all 6 ship: bundled commit, then beta launch.

## Open punch list (post-polish, prioritized)

1. **Beta launch** — MrBeast + TESTIMONIAL only. 5–10 hand-picked Filipino SMB owners. Frame TEMU as "v1.1 first access" reciprocity hook for the beta cohort.
2. **TEMU formula re-spec ship (v1.1, ~1.5–2 days)** — full design brief: [temu_respec_brief.md](temu_respec_brief.md). Grill-me protocol before touching `services/geminiService.ts`. Drop to beta cohort with reciprocity framing.
3. **Failed-scene GENERATE button** ([Step5Storyboard.tsx:478](../components/Step5Storyboard.tsx#L478)). ~5-line UX fix. REGEN button only renders when `imageUrl` exists; failed scenes have no per-scene retry. Pre- or post-beta.
4. **Step 6 tile aspect mismatch** ([Step6Thumbnail.tsx](../components/Step6Thumbnail.tsx)). ~5-line UX fix. Match Step 8's `aspect-[9/16]` / `aspect-video` pattern. Pre- or post-beta.
5. **AVATAR_CAMERA_ANGLES split / intent-awareness** ([services/geminiService.ts](../services/geminiService.ts)). CLAUDE.md-tuned, needs re-grill. ~1 day. Single biggest quality lift — fixes Scene 7 face hallucination class, Scene 2/8 wrong-angle-for-intent class. Post-beta.
6. **TESTIMONIAL prompt LANGUAGE_LOCK + grammar tuning.** CLAUDE.md-tuned, needs re-grill. ~1 hour. Address "barista level," "ro-roast," "nila," "matabang kape."

## Parked / deferred (non-blocking)

| Item | Reason |
|---|---|
| `ImageAdsGen.tsx` + `OrganicCalendar.tsx` wiring fix — same `referenceImageMode` bug, different modules | Outside current test path; Tier 4 cleanup post-beta |
| ChatGPT/Higgsfield-style persistent asset library — Supabase tables, RLS, CRUD, gallery UI | Greenfield multi-day initiative; export-bundle covers beta |
| Multi-scene queueing in GenerateVideo — auto-render all 8 scenes in sequence | Manual scene-chip swap is the v1 UX; beta will tell us if tedious |
| `// 3RD_REGENERATION_DETECTED` soft warning toast | Optional UX nudge; existing per-tier daily quotas (commit `5855fb3`) handle abuse |
| Strategic Audit prompt rewrite — current is generic and self-praising | Quality concern, not a beta blocker |
| 40-second ad length — tighten storyboard prompt to 5-6 scenes (~25-30s ads) | Beta will tell us if length is the bottleneck |
| Wizard input audit follow-up | Superseded for `offer`/`separator`/`audience` by polish-bundle item #3e. Remaining v1.2: instrument Step 1/2 fill-rates per field across beta cohort once #3e ships. Beta data > assumptions. |

## Readiness Gates

| Gate | Status |
|---|---|
| **1: App works (no crashes)** | CLOSED 2026-04-23 — voiceService crash fixed, error boundaries, Director AI rules-of-hooks fix, Gemini key no longer throws at import |
| **2: Real auth** | CLOSED 2026-04-18 — Supabase email/password, session persistence, plaintext password + ALLOWED_EMAILS hardcode removed |
| **3-dev: Billing wired (test mode)** | CLOSED 2026-04-23 — PayMongo hosted-checkout, webhook signature verification, subscriptions table updates, `api/_lib/paymongo.ts` |
| **3-prod: Live billing cutover** | **IN PROGRESS** — blocked only on PayMongo merchant verification. See live cutover steps below. |
| **4: Production-safe code** | CLOSED 2026-04-23 — Zod validation in 8 endpoints, rate limiting in 10 routes, webhook bodyParser disabled for raw signature, cron cleanup for stale Gemini videos |
| **5: Mobile responsiveness** | CLOSED 2026-04-23 — phone-verified live; P1/P2/P3 from 15-finding audit deferred non-blocking |
| **6: Domain + hosting** | CLOSED 2026-05-02 — `grifon.ai` via Vercel registrar, `app.grifon.ai` SSL, env vars set, ICANN verified 2026-05-04 |
| **7: Legal** | CLOSED 2026-04 — Terms / Privacy / Refund / Support pages, effective 2026-04-20 |

### Gate 3-prod live cutover steps

Test-mode plumbing fully proven on prod 2026-05-02 (E2E test purchase activated subscription row in Supabase). Live cutover blocks only on PayMongo merchant verification.

- [ ] PayMongo dashboard: complete merchant verification (Philippine business registration required)
- [ ] PayMongo dashboard: flip to Live Mode
- [ ] Pull live `PAYMONGO_SECRET_KEY` (`sk_live_...`) — only this one is read by code (`api/_lib/paymongo.ts:6`); `PAYMONGO_PUBLIC_KEY` is stored but unused
- [ ] Update `PAYMONGO_SECRET_KEY` in Vercel → Settings → Environment Variables (Production scope)
- [ ] Register live webhook URL `https://app.grifon.ai/api/webhook` in PayMongo Live Mode dashboard, listening for `checkout_session.payment.paid`
- [ ] Copy live signing secret (`whsk_live_...`) → update `PAYMONGO_WEBHOOK_SECRET` in Vercel
- [ ] Redeploy (Deployments → ⋯ → Redeploy, no cache)
- [ ] Test purchase with a real card on Creator tier (₱997); confirm row in Supabase, then refund yourself in PayMongo dashboard

## Locked design briefs (in-flight)

- [script_input_wiring_brief.md](script_input_wiring_brief.md) — polish bundle item #3e. Slotting matrix for offer / separator / audience across MrBeast / TESTIMONIAL / TEMU formulas.
- [temu_respec_brief.md](temu_respec_brief.md) — v1.1 ship. 7-scene product-drop scaffolding, no avatar, no VO, RAW_OUTPUT_RULE, overlays as data.

## Session archive

Full historical session prose lives in [archive/](archive/). The main file stays thin so post-`/clear` resume is fast.

- [archive/2026-05-04-voice-cloning-ivc.md](archive/2026-05-04-voice-cloning-ivc.md) — voice cloning live, IVC unlock, Signal Modulator polish (Parts 1-4), per-user daily quotas
- [archive/2026-05-05-director-ai-sprint.md](archive/2026-05-05-director-ai-sprint.md) — Step 8 redesign, wizard↔GenerateVideo handoff, Bucket A/B prompt tuning, IDENTITY_LOCK wiring fix, Bukidnon Brew regression partial pass
- [archive/2026-05-06-temu-regression-and-persistence.md](archive/2026-05-06-temu-regression-and-persistence.md) — TESTIMONIAL Run 1 observations, P0 bugs surfaced (camera angles / logo text / hand hallucination / state persistence / JWT expiry), wizard state persistence ship + smoke test plan

## How to use

1. After every session that closes a gate or ships a punch-list item, update this file's tables IN THE SAME SESSION before clearing context.
2. **The `git log` is more authoritative than this file** — when in doubt, check what code actually shipped.
3. Treat this file as a *summary* of state, not a source of truth. Source of truth = the code.
4. **Don't re-bloat this file with session prose.** Per-session detail goes into `archive/YYYY-MM-DD-<topic>.md`. Keep this file scannable in one screen.
