# Workflow: Launch Readiness

**Objective:** Track what's required before GRIFON COMMAND can take real paying users at `app.grifon.ai`.

This is the meta-workflow. It doesn't do the work itself — it points to the workflows that do, and tracks overall progress.

## Status as of 2026-05-08 late-late-evening (full Director AI wizard E2E smoke — both formulas — v1.x bundle expanded)

**Working tree clean. No new commits.** Pure verification session. Drove the full 8-step wizard end-to-end via Playwright MCP for both `MrBeast` and `TESTIMONIAL` formulas using a real account, real Supabase session, real Gemini API calls. **Pipeline works end-to-end on both formulas.** State propagation confirmed (Step 3 manual edits survive Step 5 paraphrase, persist through Step 8 final script). 9 v1.x carry-forwards identified — all surgical, none blocks beta.

### What ran tonight (post-3a-ship)

- **Full MrBeast wizard E2E** — 8 steps, real Bukidnon Brew product, OFW-wife audience, hero image upload, ~$0.80 in image gen. CMO-graded the script (A−), CD-graded the avatar (A) + storyboard (A) + thumbnail (A).
- **Full TESTIMONIAL wizard E2E** — also 8 steps, same inputs. Generated **8 scenes** (vs. MrBeast's 6 — TESTIMONIAL produces longer body, more beats). CMO-graded both attempts at Step 3.
- **Stochastic variance evidence:** Two TESTIMONIAL Step 3 runs with identical inputs produced different outputs. Run 1 had full offer in CTA (`"free shipping at ebook"`) but missed name self-intro. Run 2 had `"Ako si Nena"` (Intro spec ✓) but dropped the recipe ebook from CTA. The prompt is **not enforcing all rules consistently** — needs hardening.
- **Memory updated** — `feedback_mrbeast_thumbnail_evolution.md` saved per Neil's correction: drop the "3-5 word headline overlay" rule from CD skill. 2024+ MrBeast pattern is no overlay or 1-3 word context tag only; ad headline UI carries words anyway.

### v1.x prompt + UX bundle (9 items, ~120 lines surgical edit total)

All in `services/geminiService.ts` (TUNED file — needs explicit user approval per services/CLAUDE.md, which Neil has now given for this list). Same surgical territory as the offer-softening fix already on the v1.x roadmap. Could ship as one bundled commit with regression harness + new UI tests verifying.

| # | Issue | Fix location | Severity |
|---|---|---|---|
| 1 | TESTIMONIAL CTA softening (carries scarcity, drops value-adds) | `geminiService.ts` TESTIMONIAL CTA beat anchor | v1.x P1 |
| 2 | MrBeast CTA also softening | `geminiService.ts` MrBeast CTA beat anchor | v1.x P1 |
| 3 | "Link sa bio" → ad-native CTAs (banned phrase + required pattern) | `geminiService.ts` MrBeast + TESTIMONIAL CTA blocks | v1.x P1 |
| 4 | Speaking-scene `FACING_CAMERA_REQUIRED` rule (Scenes 02/06 in MrBeast were eyes-closed/looking-away despite delivering script lines — breaks lip sync if voiced) | `geminiService.ts` `generateStoryboard` visual prompt anchor | v1.x P1 |
| 5 | Identity Lock hair/wardrobe extension (SCENE_03 hair came down vs. Step 4 tied-up) — extend to hair OR pass Step 4 avatar as visual reference into every scene gen | `geminiService.ts` Identity Lock spec | v1.x P1 |
| 6 | Per-scene progress UX in Step 5 (synthesis was 9 min sequential with only generic placeholder — abandonment risk for Bryan; add `3/6 SYNTHESIZED` chip + ETA + cancel) | `components/Step5Storyboard.tsx` | v1.x P1 |
| 7 | TESTIMONIAL Intro name-tag enforcement (the upgrade landed but only fired in 1 of 2 stochastic runs — needs hard `REQUIRED:` anchor) | `geminiService.ts` TESTIMONIAL Intro beat anchor | v1.x P1 |
| 8 | **Formula-swap doesn't invalidate downstream cache** — Step 2 → swap formula → Step 5 still shows old scene cards | `App.tsx` wizard state — when `scriptType` changes, dump downstream | UX bug, v1.x |
| 9 | **Page refresh wipes wizard state without resume-pill recovery** — `// PREVIOUS_SESSION_DETECTED` should fire after refresh but didn't tonight. Could be P0 if real users lose work; needs investigation in `services/wizardSessionStore.ts` | wizardSessionStore + App.tsx | **Possibly P0** — investigate before beta |

**Optional follow-up:**
- Step 2 PROCEED gating UX — default aspect ratio to 9:16 OR show visual cue when none selected
- `logoImageUrl` wiring into product-only B-roll scenes (SCENE_04 type — no avatar, no hand-occlusion). Audit whether it's actually missing first; the BRAND_MARK slot exists in CinematicSpecStudio but may not propagate to storyboard gen

**Dropped (per memory + Neil's correction tonight):**
- ~~"Step 6 client-side text overlay layer"~~ — outdated MrBeast playbook. Modern MrBeast skips overlays for ads; platform's headline UI carries words.

### What worked exceptionally well (do NOT touch in v1.x)

1. **Step 3 → Step 5 → Step 8 propagation.** Manual CTA edits in Step 3 survive Step 5 paraphrase and show up in Step 8 final script verbatim or near-verbatim. State persistence works.
2. **Hero image AI analysis flows downstream.** Step 2's auto-generated description ("rustic, minimalist packaging, soft natural lighting, calm and inviting") visibly fed into Step 5 scenes — every scene leaned into that warm earthy palette.
3. **Hero image visual style propagates to thumbnail.** TESTIMONIAL thumbnail showed the kraft bag with the same cursive `Coffee` wordmark from the uploaded hero. AI is honoring the visual reference correctly without hallucinating brand text.
4. **Identity Lock holds across most scenes.** Step 4 → Step 5 (most scenes) → Step 6 thumbnail = same person. Only known break: SCENE_03 hair detail in MrBeast run.
5. **Audience register richness across both formulas.** "Habang tulog pa ang mga bata" / "habang nasa abroad si mister" / "naghihintay ng chat" / "parang yakap ni mister" — the prompt's audience-register injection is doing real work.
6. **MrBeast formula structure preserved through 6 scenes; TESTIMONIAL through 8 scenes.** Beat-to-scene mapping reads cleanly in both formulas.
7. **3a JWT refresh** continues to work silently — no auth interruptions tonight despite ~30+ Gemini calls and a JWT-expiry-edge-case scenario triggered by long sequential image gen waits.

### Verification artifacts (ephemeral)

`.playwright-mcp/wizard-smoke/` — ~30 screenshots + 1 walkthrough.md. Per Neil tonight: **wipe before reboot, do not commit.** Real-time review was the verification — durable artifacts not needed beyond session.

### Decisions made tonight (non-obvious)

1. **MrBeast thumbnail playbook is stale.** Saved to memory as `feedback_mrbeast_thumbnail_evolution.md`. CD skill should NOT mark down thumbnails for missing 3-5 word overlay text. 2024+ MrBeast = pure visual or 1-3 word context tag only.
2. **TESTIMONIAL is the better formula for OFW-wife archetype.** Both CMO grades returned A−, but TESTIMONIAL's first-person voice + CTA cleanliness (when prompt cooperates) + denser audience-world mental pictures fit the proof-driven OFW-wife buyer better than MrBeast's narrator-distance.
3. **Stochastic variance is real and significant.** Same prompt + same inputs produces materially different scripts on different runs. v1.x prompt fixes need to make rule enforcement CONSISTENT, not just hope for one good roll. Hard `REQUIRED:` anchors with verbatim examples beat soft "should include" phrasing.

### Cafe-PC reboot reminders (unchanged from earlier today)

- All commits ahead of `main` are pushed to origin — durable across reboot.
- Branch is **`checkout-redesign-preview`**, not main.
- If `node_modules/` missing on next session: `npm install`.
- Run `.\scripts\restore-git-identity.ps1` if `git commit` fails with "Author identity unknown".
- Run `.\scripts\restore-playwright-mcp.ps1` if Playwright MCP needed for browser-level testing again. **Important:** registering it requires VS Code restart which kills the active Claude Code conversation, so do it at session start.
- The regression harness needs `GEMINI_API_KEY` in `.env` (server-side, no `VITE_` prefix). Already configured.

---

## Status as of 2026-05-08 late-evening (3a JWT auto-refresh shipped — 2026-05-06 polish bundle FULLY CLOSED)

**Working tree clean. 1 commit pushed on top of evening's 7. Branch is 9 ahead of `main`, in sync with origin.** Final deferred item from the 2026-05-06 polish bundle is now in. Beta-cohort UX no longer breaks when a Supabase JWT expires mid-call.

### Pushed this late-evening session (1 commit)

```
3a358cd  feat(auth): silent JWT refresh + 401 retry in proxyCall (3a)
```

### What shipped

| What | Where it lives | Purpose |
| --- | --- | --- |
| **3a — silent JWT refresh + 401 retry** | [services/geminiService.ts](../services/geminiService.ts) `proxyCall`, `refreshAccessToken`, `proxyFetch` | On 401 from `/api/gemini/*`, `proxyCall` calls `sb.auth.refreshSession()` once and replays the original request with the new bearer — user sees zero error, wizard flow uninterrupted. Concurrent expired calls dedupe through a module-level in-flight promise so N parallel 401s trigger ONE refresh round-trip, not N. On genuine refresh failure (refresh token expired / network down), `sb.auth.signOut()` flips `onAuthStateChange` at [App.tsx:191](../App.tsx#L191) so the user is routed back to auth — wizard persistence row in Supabase is **untouched** (no `clearSession` call), so [RESUME] still works after re-auth. Pure transport-layer change; prompts/schemas/model IDs in tuned `geminiService.ts` untouched. |
| **Unit coverage on the new transport** | [tests/unit/geminiService.proxy.test.ts](../tests/unit/geminiService.proxy.test.ts) | 3 cases: (1) 401 + valid refresh → retry once with new bearer, return 200 silently, refresh called exactly once, fetch called twice with different `Authorization` headers; (2) 401 + failed refresh → `signOut()` called + `NOT_AUTHENTICATED` rejection; (3) 200 happy path → no refresh attempted (regression guard). Mocks `supabaseClient` at the same boundary the existing schema tests use. |

### Surgical-edit principle held

- **`App.tsx`, `ErrorBoundary.tsx`, `supabaseClient.ts` not touched.** The existing `onAuthStateChange` listener already flips `isAuthenticated=false` on `SIGNED_OUT`, which routes to the auth screen via the existing render logic at App.tsx:472. No new ErrorBoundary fallback was needed.
- **Prompts, schemas, model IDs untouched** in `geminiService.ts` (CLAUDE.md tuned-file rule respected). Only `proxyCall` + 2 new helpers + the in-flight promise lock.
- **No `clearSession` on refresh-fail.** Distinct from the explicit user-clicked Sign Out at App.tsx:300 (which clears the persistence row). Refresh-fail leaves the row intact so the user can re-auth and resume.

### Verification

- `npm run build` — green (tsc + vite, 1.51s)
- `npm test` — 23 passed / 8 skipped (was 20+8 pre-edit; +3 new proxy tests)
- Regression — `$env:RUN_REGRESSION='1'; npx vitest run tests/regression/script-gen.regression.test.ts --reporter=verbose` — 8/8 passed live against Gemini (45s, all 4 product categories × 2 formulas, no prompt drift from transport refactor)
- Manual browser smoke (clearing localStorage to force a 401): **deferred to user** — CLI agent on cafe PC can't drive a browser. Unit tests cover the same code path; live token-clearing is the user's check.

### Open follow-ups (post-tonight)

**Pre-beta blockers: NONE.** 2026-05-06 polish bundle (3a/3b/3c/3d/3e/3f) + Step 2 consolidation (3g) all shipped + tested. Branch is shippable to beta cohort.

**Carry-forwards (deferred to next session):**
- **TESTIMONIAL CTA offer-integration tightening** (v1.1, ~5-line surgical edit). Add scarcity-word + value-add VERBATIM anchor. Use regression harness to verify before/after.
- **`logoImageUrl` audit** — is the Cinematic Studio `SLOT 5: BRAND_MARK` actually delivering value? Audit separately before deciding to drop.

**P1 from prior session, still open:**
- **Module name audit completion** — Generate Video, Image Ads Gen `MORE_MODULES` descriptions still engine-y. UI nav labels updated; module-detail copy may not be.
- **In-progress modules to fully ship** — Signal Modulator + Edit Video need admin-gate removal + production-ready release before they can move out of Beta.

**P2 from prior session:**
- **Landing + Pricing 7-step claim** — Gated on Signal Modulator + Edit Video shipping for non-admin users.
- **Wizard ↔ Dashboard journey unification** — Long-term Jobs-aligned restructure. Defer until real beta data.

**P3 cleanup:**
- Other non-billing SPA rewrites in `vercel.json` (`/pricing`, `/terms`, `/privacy`, `/refund`, `/support`, `/app`).

### Next session starting point

If beta cohort is being prepped: nothing blocks. Run the regression harness as a final smoke before pushing to cohort. The branch can merge to `main` and ship.

If post-beta data flags TESTIMONIAL CTA softening: 5-line v1.1 fix on the CTA prompt anchor; use the regression harness to verify before/after.

If the next session targets the deeper UX restructure: Wizard ↔ Dashboard unification is the largest open Jobs-aligned bet, but it should wait for real beta usage data before committing to a direction.

### Cafe-PC reboot reminders

- **All 8 commits ahead of `main` are pushed to origin** — durable across reboot.
- Branch is **`checkout-redesign-preview`**, not main.
- If `node_modules/` missing on next session: `npm install`.
- Run `.\scripts\restore-git-identity.ps1` if `git commit` fails with "Author identity unknown".
- The regression harness needs `GEMINI_API_KEY` in `.env` (server-side, no `VITE_` prefix). Already configured.

---

## Status as of 2026-05-08 evening (3e wiring + Step 2 consolidation + regression harness — pre-beta polish bundle DONE)

**Working tree clean. 7 commits pushed to `checkout-redesign-preview` this evening (on top of morning's 7). Branch in sync with origin.** Largest single-session prompt-engineering shift since Director AI's beta-readiness fix sprint. Pre-beta polish bundle from the 2026-05-06 session is now FULLY shipped (3a JWT remains the only deferred item from that bundle). On top of that, the **biggest strategic win:** every required wizard field now actually fires in the script generation prompt, validated across 4 widely-different product categories.

### Pushed this evening session (7 commits)

```
c7fc94a  test(regression): add 3 stress-test product categories — Service/Skincare/Gym
2c6b16d  feat(step2): consolidate goal+problem into benefit+painPoint with deeper labels (3g)
55cf40c  test(regression): add Gemini-direct script-generation regression harness
651a993  fix(mrbeast): tighten Identity beat + harden Hook anti-demographic anchor
5357780  fix(testimonial): restore Hook generation — Intro verbosity starved beat 0
a2df8c6  feat(beta-polish): wire offer/separator/audience + drop services (3e/3f)
1321e2b  feat(beta-polish): nudge suppress + TEMU gate + Sonner restyle (3b/3c/3d)
```

### What shipped / decided this evening

| What | Where it lives | Purpose |
| --- | --- | --- |
| **3b/3c/3d quick wins** | [App.tsx](../App.tsx) (nudge suppression), [Step2BusinessInfo.tsx](../components/Step2BusinessInfo.tsx) (TEMU gate `// COMING_IN_V1.1`), [index.tsx](../index.tsx) (Sonner `theme="dark"` + `unstyled` + classNames per variant) | Resume pill + Pro Tip nudge no longer collide. TEMU disabled with corner label until v1.1 re-spec ships. Toaster matches `// PREVIOUS_SESSION_DETECTED` pill aesthetic instead of sonner default white. |
| **3e wiring — the dormant bridge BUILT** | [services/geminiService.ts](../services/geminiService.ts) `generateAdScript`, [components/Step3AdScript.tsx](../components/Step3AdScript.tsx), [App.tsx](../App.tsx) | `clientDetails.offer`, `businessInfo.separator`, `businessInfo.audience` were all REQUIRED wizard fields that geminiService **completely ignored** before today. Wired per the 2026-05-06 slotting matrix: offer → CTA beat (scarcity + value-adds, never bare price); separator → Result+Proof / Proof beats ("Hindi tulad ng iba — kami X" pattern); audience → COMMON_RULES AUDIENCE REGISTER bullet (vocab + idiom + mental imagery + Visual Payoff in audience's WORLD). |
| **3f services field DROPPED** | [types.ts](../types.ts), [App.tsx](../App.tsx) state/reset, [Step1ClientDetails.tsx](../components/Step1ClientDetails.tsx) | Step 1 went from 3 fields to 2 (brandName + offer only). `clientDetails.services` was a required textarea that no service consumed. **Spec correction logged:** `logoImageUrl` was supposed to drop in 3f too, but it's actively used by [CinematicSpecStudio.tsx:51,411](../components/CinematicSpecStudio.tsx#L51) (`SLOT 5: BRAND_MARK`). Skipped, filed as separate audit. |
| **CMO-upgraded TESTIMONIAL Intro + Hook anchor** | `geminiService.ts` TESTIMONIAL block | Intro went from `"Human introduction."` (3 words, name-tag output) to persona+wound+open-loop with 3 audience-pattern examples in appendix. Speakers now produce e.g. `"Ako si Elena. Tatlong taon na sa Saudi ang asawa ko."` instead of subject-less fragments. |
| **CMO-upgraded MrBeast Identity beat** | `geminiService.ts` MrBeast block | Identity went from `"Relatable audience statement."` (3 words, vague output) to direct-address with `ka`/`mo`/`tayo` + audience-world reference + 3 examples in appendix. Speakers now produce e.g. `"Pag-uwi galing office, diretso higa na lang sa sobrang pagod"` instead of `"Sa gising na maaga, malayo sa mga bata"` (subject-less stage direction). |
| **Hook anti-demographic-label anchor (both formulas)** | `geminiService.ts` Hook beats | Banned: `"para sa mga OFW"`, `"sa mga moms"`, `"for OFWs"`. Hooks must derive curiosity from situation/visual, not audience tag. |
| **Step 2 consolidation** | [types.ts](../types.ts), [App.tsx](../App.tsx), [Step2BusinessInfo.tsx](../components/Step2BusinessInfo.tsx), `geminiService.ts`, [IntelligenceUplink.tsx](../components/IntelligenceUplink.tsx) | Dropped `goal` + `problem` from `BusinessInfo` (each fired in only ONE formula — half-orphans). Renamed `benefit` → **`Dream Result`** (placeholder: Taglish-native "Wakes up energized, naka-2 hours back every morning, mas chill ang pasok sa work"). Renamed `painPoint` → **`3 AM Worry`** (placeholder: "3 AM, hindi makatulog kasi tuition deadline na bukas — wala pang pera"). Required fields went from 8 to 6. TESTIMONIAL Before Story now agitates `painPoint` instead of `problem`; Transformation now lands at `benefit` instead of `goal`. CMO-locked via grill-me 3-question protocol. |
| **Regression harness — kills the manual UI loop** | [tests/regression/script-gen.regression.test.ts](../tests/regression/script-gen.regression.test.ts) | Vitest test, gated by `RUN_REGRESSION=1` env var (default `npm test` skips). Mocks Supabase auth + stubs global fetch to route `/api/gemini/text` straight to `@google/genai` SDK using `GEMINI_API_KEY` from `.env`. Same prompt construction code path as production. Replaces the 5-min-per-iteration "open localhost, sign in, fill 8 fields, screenshot script" loop with a 5-second CLI run that prints full JSON. **Run command:** `$env:RUN_REGRESSION='1'; npx vitest run tests/regression/script-gen.regression.test.ts --reporter=verbose` |
| **Stress-test expansion (4 product categories)** | Same regression file | 8 tests across Bukidnon coffee + MalinisPH cleaning + Glaze PH skincare + BulkPH Coach gym. Probes whether the prompt's hardcoded archetype examples (OFW family / Filipino mom / Corporate) generalize. **They do.** Model produced 4 distinct speaker personas across 4 categories with no archetype copy-paste leakage. |

### Strategic decisions made this evening

1. **Phrasing locked via grill-me + CMO verification.** Three open questions from the 2026-05-06 session resolved:
   - Q1: `clientDetails.services` → DROP (overlapped with `businessInfo.product`, no slot in matrix, slotting matrix already covered service businesses through existing fields). Hypothesis that "Market Research auto-fills services" was tested in code — no scaffolding exists, phantom feature.
   - Q2: empty-field fallback rules → silent generic fallback in geminiService (form gate already prevents empty in normal flow; fallback is belt-and-suspenders for persistence-restore edge case).
   - Q3 (audience register-tuning): SPEC CORRECTION — line 564 referenced in 2026-05-06 spec is actually in `generateMarketResearch` (MarketMind module), not `generateAdScript`. **Don't touch line 564.** Real fix lives in `COMMON_RULES` block.

2. **CMO pushback on the slotting matrix accepted.** Original matrix said audience is "register only, never content." CMO read: too academic. Audience should also shape MENTAL PICTURES — the world the script lives in. Result beat / Visual payoff lands in the audience's WORLD (OFW reunion at NAIA, mom's school dropoff, corporate Friday 6PM logout) — not generic "happy moment." Updated AUDIENCE REGISTER bullet includes this.

3. **CMO pushback on Intro examples accepted.** Original Intro examples were name-tags ("Ako si Mark, OFW dad, 5 years sa Saudi"). CMO upgraded to name + life context + **the wound's first hint** + open loop ("...pero may isang bagay na halos natalo ako"). Tested live: model copies the upgraded pattern (Bukidnon TESTIMONIAL Intro: `"Ako si Elena. Tatlong taon na sa Saudi ang asawa ko."` — open-ended, pulls into beat 2).

4. **Step 2 consolidation labels CMO-locked.** "Dream Result" and "3 AM Worry" beat alternatives like "Main Benefit/Outcome" and "Bleeding Neck Pain." Reasoning: labels load-bear more than placeholders — Bryan reads the label once and writes accordingly. "Dream Result" pulls toward Sabri Suby Magic Genie wish without naming the framework. "3 AM Worry" cues visceral 3 AM moments without academic jargon.

### Live regression evidence (8 tests across 4 product categories)

Full output committed in `c7fc94a` test artifact. Highlights:

- **Bukidnon Brew + OFW-wife audience:** TESTIMONIAL Intro `"Ako si Elena. Tatlong taon na sa Saudi ang asawa ko."` ✓; MrBeast Identity `"Tuwing umaga, kahit malayo siya, kape ang nagpaparamdam."` ✓
- **MalinisPH + BGC professional audience:** TESTIMONIAL Intro `"Ako si Miggy, laging 12 hours sa Makati office."` ✓; MrBeast Identity `"Pag-uwi galing office, diretso higa na lang sa sobrang pagod."` ✓
- **Glaze PH + skincare-frustrated millennial audience:** TESTIMONIAL Intro `"Ako si Kaye, naubos sweldo ko sa mahal na facial sessions."` ✓; MrBeast Identity `"Pagod na pagod na kaka-skincare pero acne mo nandyan pa."` ✓
- **BulkPH Coach + Pinoy gym-bro audience:** TESTIMONIAL Intro `"Ako si JC. Tatlong taon nang nagbubuhat, pero walang pagbabago sa katawan."` ✓; MrBeast Identity `"Naka-three years ka na sa gym pero stuck ka pa rin."` ✓

**Generalization confirmed.** No category copied OFW/mom/corporate prompt examples literally. The 3 AM Worry framing carried into Before Story content for skincare AND gym, not just OFW-coffee.

### One soft spot identified for v1.1 (NOT a beta blocker)

**TESTIMONIAL CTA softens offer scarcity.** Across 4/4 TESTIMONIAL stress tests, the CTA dropped or softened the offer's scarcity language:

| Brand | Offer input | TESTIMONIAL CTA output | Dropped |
| --- | --- | --- | --- |
| Bukidnon Brew | First 50 + free shipping + recipe ebook | `"first 50 may free shipping pa"` | recipe ebook |
| MalinisPH | First 20 + 50% off + free deep clean | `"subukan niyo rin ito"` | **everything** |
| Glaze PH | First 100 + free derm consult + assessment | `"first 50 orders may free skin consultation pa"` | "100"→"50", assessment |
| BulkPH Coach | First 30 + 25% off + free meal plan | `"limited slots lang ang natitira"` | "30", "25%", meal plan |

Root cause: TESTIMONIAL CTA prompt anchor says `"WARM recommendation tone (not direct-sell)"`. Warmth wins over scarcity. **MrBeast carries offers cleanly** in all 4 cases. v1.1 fix: tighten TESTIMONIAL CTA with explicit "REQUIRED: at least one scarcity word + one value-add MUST appear verbatim" anchor. ~5-line surgical edit. Not a beta blocker — TESTIMONIAL CTAs land naturally, just less hard-sell.

### Open follow-ups (post-tonight)

**Pre-beta blockers (none — bundle is shippable):**
- ✅ All polish-bundle items 3b/3c/3d/3e/3f shipped + tested.
- ✅ Step 2 consolidation (3g, new this evening) shipped + tested.
- ✅ Regression harness exists for all future prompt-tuning iterations.

**Carry-forwards (deferred to next session):**
- **3a — JWT auto-refresh + 401 error boundary** (~half day, code-heavy, independent of prompts). The only item from the 2026-05-06 polish bundle still open. Auth interruption mid-call still surfaces `PROXY_ERROR_401` to the user; persistence preserves state but they manually re-auth + click `[ RESUME ]`. Touches `services/supabaseClient.ts` + auth flow + `App.tsx` ErrorBoundary. CLAUDE.md NOT-tuned territory.
- **TESTIMONIAL CTA offer-integration tightening** (v1.1, ~5-line surgical edit). Add scarcity-word + value-add VERBATIM anchor.
- **`logoImageUrl` audit** — is the Cinematic Studio `SLOT 5: BRAND_MARK` actually delivering value? Different scope from 3f. Audit separately before deciding to drop.

**P1 from prior session, still open:**
- **Module name audit completion** — Generate Video, Image Ads Gen `MORE_MODULES` descriptions still engine-y ("Render final video assets..."). UI nav labels updated; module-detail copy may not be.
- **In-progress modules to fully ship** — Signal Modulator + Edit Video need admin-gate removal + production-ready release before they can move out of Beta.

**P2 from prior session:**
- **Landing + Pricing 7-step claim** — Gated on Signal Modulator + Edit Video shipping for non-admin users.
- **Wizard ↔ Dashboard journey unification** — Long-term Jobs-aligned restructure. Defer until real beta data.

**P3 cleanup:**
- Other non-billing SPA rewrites in `vercel.json` (`/pricing`, `/terms`, `/privacy`, `/refund`, `/support`, `/app`).

### Next session starting point

If beta cohort is being prepped: **3a JWT auto-refresh** is the only remaining polish-bundle item that affects beta UX directly. Half a day. Touches Supabase token refresh + 401 interceptor + re-auth fallback at App.tsx ErrorBoundary. No prompt risk. Independent of everything else.

If beta is shipping immediately: nothing blocks. The bundle from this evening is the cleanest pre-beta state Director AI has been in. Run **`$env:RUN_REGRESSION='1'; npx vitest run tests/regression/script-gen.regression.test.ts --reporter=verbose`** if you want one final smoke check before pushing to cohort — 45 seconds, 8 product/formula combinations.

If TESTIMONIAL CTA softening becomes a real concern post-beta data: **5-line v1.1 fix** on the CTA prompt anchor. Use the regression harness to verify before/after.

### Cafe-PC reboot reminders

- **All 7 commits pushed to origin** — durable across reboot.
- Branch is **`checkout-redesign-preview`**, not main.
- If `node_modules/` missing on next session: `npm install`.
- Run `.\scripts\restore-git-identity.ps1` if `git commit` fails with "Author identity unknown".
- Run `.\scripts\restore-playwright-mcp.ps1` if you want Playwright MCP for browser-level testing (requires VS Code restart after registration — kills active Claude Code conversation).
- The regression harness needs `GEMINI_API_KEY` in `.env` (server-side, no `VITE_` prefix). Already configured.

---

## Status as of 2026-05-08 (Checkout redesign ship + Jobs lens + canonical 7-step flow)

**Working tree clean. 7 commits pushed to `checkout-redesign-preview`. Branch in sync with origin.** This session was a large strategic + tactical batch on top of the prior session's checkout-redesign visual MVP. Two unrelated workstreams ran in parallel: (1) get the checkout preview deploy unbroken and shipping outcome-first copy; (2) bake the Steve Jobs work-backwards filter into the durable doc layer + propagate the canonical 7-step flow throughout the dashboard.

### Pushed this session (7 commits, working tree clean)

```
57eaebb  feat(dashboard): align left sidebar + mobile bottom nav with 7-step flow
4259820  feat(dashboard): expand RECOMMENDED FLOW to canonical 7 steps
364981c  docs(skills+language): Jobs work-backwards filter + canonical 7-step flow
28dd56a  copy(checkout): revert no-auto-renew badge + scope auto-renew workstream
5af2e01  copy(checkout): outcome-first rewrite — Jobs lens + CMO trust stack
6698740  fix(checkout): add /checkout SPA rewrite (404 on direct visit)
2235d2f  fix(checkout): consolidate billing endpoints to clear Vercel 12-fn cap
```

### What shipped / decided this session

| What | Where it lives | Purpose |
| --- | --- | --- |
| Vercel deploy fix (15 → 12 functions) | [api/billing.ts](../api/billing.ts) (NEW, consolidated 4 endpoints into 1 with `?action=` switch); deleted `api/billing/{intent,confirm,ewallet,status}.ts`; updated [services/checkoutService.ts](../services/checkoutService.ts) | Hobby-cap deploy was failing. Now fits the 12-function ceiling. |
| `/checkout` SPA rewrite | [vercel.json](../vercel.json) | Direct-visiting `/checkout` no longer 404s on cold load (mobile, email links, PayMongo redirects). Other non-billing routes still have the same gap — flagged. |
| Outcome-first /checkout copy | [components/CheckoutPage.tsx](../components/CheckoutPage.tsx), [components/checkout/OrderSummary.tsx](../components/checkout/OrderSummary.tsx) | Replaced "40 workflows, 15 reports..." feature list with "Replaces your marketing agency. End-to-end: research, offer, scripts, AI video ads, captions, and images — for an entire month. Walang ₱30K agency, walang freelancer." Added "Just ₱83/day" daily reframe + "7-day money-back guarantee" trust badge. |
| Auto-renew workstream scoped | [workflows/auto_renew.md](auto_renew.md) (NEW, 270 lines) | Founder pivoted from no-auto-renew → YES auto-renew like Claude/OpenAI. Backend doesn't yet support it. Full plan: PayMongo card-on-file integration, Supabase migration, renewal cron, cancel UX, 8 email templates, hybrid model (cards auto-renew, e-wallets manual), pre-merge checklist, 5 open questions. |
| Steve Jobs filter baked into both skills | [.claude/skills/grifon-cmo/SKILL.md](../.claude/skills/grifon-cmo/SKILL.md), [.claude/skills/grifon-creative-director/SKILL.md](../.claude/skills/grifon-creative-director/SKILL.md) | 4 surgical adds each: named as 4th pillar in intro, "outcome before feature" copy/design rule, "no engine names on user-facing surfaces" hard constraint, Cohesive Vision Filter operating rule. Auto-applies in future sessions without re-explaining. |
| Canonical 7-step flow | [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md) | New top section: Research → Offer → Director → Video → Voice (Signal Modulator) → Edit → Caption. Bryan-outcome of full chain. Signal Modulator entry rewritten — "consistent character voice per scene" is the actual customer outcome, name flagged as engine-internal. |
| Subscription-copy lesson logged | [agent_lessons.md](../agent_lessons.md) | Don't ship subscription/recurring/trial copy without backend support. Generalizes to "cancel anytime", refund-window, pause-subscription claims. Future-me reads at session start. |
| Dashboard 7-step flow path | [components/Dashboard.tsx](../components/Dashboard.tsx) (RECOMMENDED FLOW block) | Was 5 steps (Research → Offer → Director → Copy → Images), now 7 with Beta badges on Voice + Edit. Image Editor removed from canonical chain (still on Dashboard tiles). Beta steps display-only for non-admin, clickable for admin. |
| Dashboard sidebar + mobile bottom nav | [components/Dashboard.tsx](../components/Dashboard.tsx) (`NAV_ITEMS` const) | Single source of truth for both surfaces. Same 7-step order, same Beta-gating. Mobile nav tightened (`px-1.5`, `text-[9px]`) so 7 items fit ~375px width. |
| Checkout redesign session log | [workflows/checkout_redesign.md](checkout_redesign.md) | Three new dated entries logging the three checkout-redesign fixes from today + the auto-renew direction reversal. |

### Strategic decisions made

1. **Auto-renew direction (founder call):** Reverse from no-auto-renew → YES auto-renew. Implementation deferred to dedicated workstream (auto_renew.md). Tonight's "No auto-renew" trust badge reverted; only the 7-day guarantee badge remains until backend catches up.
2. **Cohesive Vision Filter is now permanent:** Both CMO and CD skills auto-apply the work-backwards filter. Engine names ("Signal Modulator", "Video Synthesis") rejected on user-facing surfaces.
3. **Module renames (UI labels only, internal keys unchanged):**
   - `signal_modulator` UI label: "Signal Modulator" → **"Voice"**
   - `generate_video` UI label: "Video Synthesis" → **"Video"**
   - `edit_video` UI label: "Video Editor" → **"Edit"**
   - `caption_headline` UI label: "Copy" → **"Caption"**
4. **Image Editor dropped from canonical chain:** Still accessible as a CORE_MODULES tile, no longer in primary nav. Director AI handles thumbnails/scenes internally.
5. **Landing + Pricing 7-step claim deferred:** Per CMO HARD CONSTRAINT (working modules only on landing/pricing), can't pitch the full 7-step flow until Signal Modulator + Edit Video are fully shipped. Dashboard surfaces only for now.

### Tomorrow morning's first move

**Decide which of two priority queues to start with:**

- **Queue A: Pre-beta polish bundle (3a–3f)** — from the prior 2026-05-06 session, ~half day remaining. Items 3c (suppress nudge), 3d (TEMU option gate), 3b (sonner toast restyle), 3a (JWT auto-refresh), 3e (offer/separator/audience wiring), 3f (drop logoImageUrl + services decision). Beta launch was the goal of that workstream.
- **Queue B: Auto-renew engineering** — fresh workstream, 2-3 sessions. PayMongo card-on-file → cron → cancel UX → emails. Doesn't block beta launch; LTV optimization for post-launch.

**My recommendation: finish Queue A first.** Three reasons:
1. Already in motion (3 sessions of momentum), don't lose the context.
2. Queue A unblocks **beta launch** which has compounding value. Queue B is post-launch optimization.
3. Queue B also requires the 5 open questions in [auto_renew.md](auto_renew.md) to be answered — defer until you have headspace.

### Pre-clear actions to take BEFORE `/clear`

- ✅ Working tree clean, all 7 commits pushed
- ✅ Session summary committed to launch_readiness.md (this section)
- ⚠️ One open item: smoke-test `/checkout?plan=pro&cycle=monthly` on the live Vercel preview to confirm new outcome copy + 7-day badge render correctly. Browser test before clearing the session loses no work but gives confidence.
- ⚠️ Three open strategic questions from the prior session (still unresolved): `clientDetails.services` (drop or wire?); empty-field fallback rules for blank offer/separator; exact replacement phrasing for audience register-tuning at [services/geminiService.ts:564](../services/geminiService.ts). These block 3e wiring tomorrow — **run grill-me first thing in the next session.**

### Two things to remember when you boot up tomorrow

1. **Cafe-PC reboot wipes everything except git.** Run `npm install` if `node_modules/` is missing, run `.\scripts\restore-git-identity.ps1` if `git commit` fails with "Author identity unknown", run `.\scripts\restore-notebooklm.ps1` if you need NotebookLM MCP back.
2. **Branch is `checkout-redesign-preview`, not `main`.** Production main untouched — grifoncommand.com still serves the old PayMongo hosted page. Switch back: `git checkout checkout-redesign-preview` after `git fetch`.

### Open follow-ups not yet addressed

- **Module name audit (P1):** Generate Video, Image Ads Gen still need their `MORE_MODULES` descriptions updated to outcome-first language (currently still says "Render final video assets from storyboards and prompts" — engine-y). UI nav labels are already updated; module-detail pages may still have old copy.
- **In-progress modules to fully ship (P1):** Signal Modulator + Edit Video need admin-gate removal + production-ready release before they can move out of Beta.
- **Landing + Pricing 7-step claim (P2):** Gated on the in-progress modules shipping. Update copy + visual to claim "7 steps, end-to-end, in one tool" once all 7 are real for non-admin users.
- **Wizard ↔ Dashboard journey unification (P2):** Long-term Jobs-aligned restructure. Defer until real user nav data is available post-launch.
- **Other non-billing SPA rewrites (P3 cleanup):** `/pricing`, `/terms`, `/privacy`, `/refund`, `/support`, `/app` lack rewrites in vercel.json — they only work via in-app navigation today. Adding a catch-all rewrite or explicit entries is a 5-min cleanup task.

---

## Status as of 2026-05-05 (Director AI beta-readiness fix sprint)

**Working tree: dirty, build green, NOT committed.** Single bundled commit pending the Bukidnon Brew regression run. Eight files modified across this + the prior session — all share one theme (beta-readiness for 5–10 hand-picked Filipino owners).

### What shipped this session

**Step 8 (Final Output) — full redesign** ([components/Step7FinalOutput.tsx](components/Step7FinalOutput.tsx)):
- Tabbed asset viewer (`// SCRIPT // AVATAR // THUMBNAIL // STORYBOARD // VIDEO_PROMPTS`) — one panel visible at a time, replaces the prior 5-card vertical scroll. Disabled tabs auto-detect missing assets.
- `EXPORT_BUNDLE (.ZIP)` builds `BrandName_Bundle.zip` with `script.txt`, `storyboard.json`, `video_prompts.txt`, `avatar.png`, `thumbnail.png`, `scenes/scene_*.png`. Filename uses sanitized `clientDetails.brandName`.
- `◀ BACK` returns to Step 7 with state intact.
- `GENERATE VIDEO NOW ▶` deeplinks to GenerateVideo with all wizard prompts pre-loaded. `restart()` is *not* called on this path so wizard state is preserved.
- Click-to-zoom on Avatar/Thumbnail tabs via existing `ImageModal`. Switched from `object-cover` (cropping bug) to `object-contain` with `aspect-[9/16]` / `aspect-video` containers.
- `// Clear Session & Restart` visibility-bumped from `text-zinc-600` → `text-zinc-500` + `RotateCcw` icon + `border border-white/5 rounded-full` pill. Discoverable on scan, still secondary to gold CTAs.

**Wizard ↔ GenerateVideo handoff** ([App.tsx:421, 505](App.tsx); [components/GenerateVideo.tsx:14-17, 53-63, ~377](components/GenerateVideo.tsx)):
- `seedPrompts?: VideoPrompt[]` prop on GenerateVideo. When present, `config.prompt` initializes from `seedPrompts[0]` and a scene-picker chip row renders above the KINETIC_DIRECTIVE textarea (`SCENE_01 ... SCENE_NN`). Click a chip → swaps prompt content and highlights gold. Hygiene: when GenerateVideo is launched from the Dashboard (no wizard), `seedPrompts` is undefined and the chip row doesn't render.
- App.tsx mirrors the existing `<SignalModulator globalScript={finalScript}>` precedent at [App.tsx:425](App.tsx#L425).

**Bucket A — code-only fixes** (no CLAUDE.md tuning gate):
- **A1 — REGEN button race condition fixed** ([components/Step5Storyboard.tsx:135-188, 459](components/Step5Storyboard.tsx)). `handleGenerateSingleScene(index, force=true)` bypasses the skip gate. REGEN button now shows `REGENERATING...` with spinning icon while running. Prior bug: race between `setStoryboardData` and the closure-captured stale state caused the skip gate to fire and silently no-op.

**Bucket B — prompt tuning** (CLAUDE.md gated, approved via grill-me protocol):
- **B1 — `WARDROBE_PROTOCOL` injection stripped** ([services/geminiService.ts:~1442](services/geminiService.ts)) and the unused `WARDROBE_LOGIC` constant deleted (~7 lines removed at line 244). Wardrobe is now solely owned by IDENTITY_LOCK rule 1.
- **B2 — `IDENTITY_LOCK + ENVIRONMENT_SYNC` rewritten** ([services/geminiService.ts:~1413-1421](services/geminiService.ts)). Five numbered rules: **LOCKED** (face/skin/hair/wardrobe/body) vs **VARIES** (expression/gaze/pose/hands/props), with **FLEXIBLE** environment scope (same residence, different spots — kitchen → dining table → counter, never to unrelated locations).
- **B3 — `APPEARANCE_LOCK_RULE` added** to `generateStoryboard` system instruction ([services/geminiService.ts:~1295-1322](services/geminiService.ts)). Forbids appearance redescription in avatar scene prompts (no clothing, hair, body, face, ethnicity descriptors). Lists what's required (action, expression, gaze, hands, props, pose, spot, lighting). Includes wrong/correct example pair.
- **B4 — `STILL_FRAME_RULE` added** ([services/geminiService.ts:~1295-1308](services/geminiService.ts)). Names the contract: frames = stills, transitions carry motion. Forbids motion verbs in `imagePrompt` / `startFramePrompt` / `endFramePrompt`. Tightened Scene 1 schema field descriptions.

**IDENTITY_LOCK wiring fix** (the hidden bug surfaced by the camera-angle question):
- Discovered while auditing camera angles: `Step5Storyboard.tsx` was never passing `variationIndex` or `referenceImageMode` to `generateSceneImage`. Result: every avatar scene rendered at `AVATAR_CAMERA_ANGLES[0]` = INTIMATE_CLOSE_UP, AND `referenceImageMode` defaulted to `'none'` so **IDENTITY_LOCK and PRODUCT_IDENTITY_LOCK never fired in the wizard's main path**. The model was getting STRICT_NEGATIVE rules ("NO HUMANS, NO faces, NO hands") which it ignored due to the reference image arriving in the same call.
- Fix at [components/Step5Storyboard.tsx:158-188](components/Step5Storyboard.tsx#L158-L188): start frame passes `index` for variationIndex and `scene.referenceImage` for referenceImageMode. End frame uses `index + 100` so Scene 1's two frames land on different camera angles for visual punch.
- **Implication:** B1+B2 from above were dead code at ship time; this wiring fix makes them actually execute. The next regression run is the *first time* IDENTITY_LOCK has ever fired in the wizard.

### Files in working tree (uncommitted)

```
M  api/gemini/image.ts                 (prior session — Tier 1.5)
M  api/gemini/text.ts                  (prior session — Tier 1.5)
M  vercel.json                         (prior session — Tier 1.1)
M  index.css                           (prior session — UX.3 keyframes)
M  services/geminiService.ts           (this + prior — Tier 1.2, 2.A, 2.B, B1-B4)
M  components/Step5Storyboard.tsx      (this + prior — Tier 1.3, 1.4, UX.1/3/4, 3.1, 3.2, A1, wiring fix)
M  components/Step7FinalOutput.tsx     (this — Step 8 redesign + A2 + A3)
M  components/GenerateVideo.tsx        (this — seedPrompts + scene chips)
M  App.tsx                             (this — wizard ↔ GenerateVideo wiring)
?? .claude/skills/grifon-cmo/          (prior session — untracked CMO persona skill)
```

Build state: green (`tsc && vite build` → 2237 modules, ~5.9s). Cache wipe (`Remove-Item node_modules/.vite, dist`) is the reliable remediation when the documented html-inline-proxy first-build flake triggers (Open follow-up #3 in the 2026-05-04 section).

### Next action — Bukidnon Brew regression run

The single most valuable next action is **running the regression**, not building anything new. Reasons: (1) eight uncommitted files all depend on the storyboard rules and IDENTITY_LOCK actually producing better output; (2) the wiring fix means this is the first time IDENTITY_LOCK has ever fired — zero data on whether the rewritten content is actually correct; (3) one bundled commit per the prior session's pattern.

**Test brand** (reconstruction from prior session's screenshots since exact field text wasn't captured):
- Brand: `Bukidnon Brew` · Script: MrBeast formula · Language: Taglish · Aspect: 9:16
- Product: 250g single-origin Bukidnon highland coffee beans, medium roast, resealable valve bag
- Same 3 stock product photos as prior regression for clean apples-to-apples (if Neil still has them; otherwise pure regression baseline shifts)

**Pass criteria:**
- [ ] Scene 1 hook end-frame: static composition (frozen hand, suspended droplets), NOT another splash
- [ ] Avatar scenes: same wardrobe across all (gray pullover from reference, not blue chambray drift)
- [ ] Avatar scenes: same hair across all
- [ ] Scene 3-equivalent: avatar follows prompt (looking down, holding empty mug, brow furrowed) — does NOT inherit reference's smile
- [ ] Avatar scenes: same residence context, but spot varies (kitchen → dining → counter as prompts drive)
- [ ] Camera angles vary across scenes (no more all-close-up)
- [ ] REGEN button works (clears + re-renders the scene; shows `REGENERATING...` with spinning icon)
- [ ] Step 8 thumbnail tab: no crop, click-to-zoom modal works
- [ ] Step 8 EXPORT_BUNDLE: `Bukidnon_Brew_Bundle.zip` with all assets
- [ ] Step 8 GENERATE_VIDEO_NOW: deeplink works, scene chips load, click swaps prompt
- [ ] // CLEAR_SESSION_&_RESTART pill is visible and works

**If all pass:** commit everything as one bundled "beta-readiness" commit, then beta-source 5–10 real Filipino owners (operational, not engineering — out of plan scope).
**If any fail:** the failure mode tells us which rule needs tightening; fix → retest → commit.

### Regression run — partial pass (evening 2026-05-05)

Live regression with Bukidnon Brew (Taglish, 9:16, MrBeast formula). **Stopped at Step 6** to wrap session; resume tomorrow at Step 7 → 8.

Observed pass criteria:
- ✓ #1 — Scene 1 hook end-frame static (mug → bowl-of-beans, both stills, B4 STILL_FRAME_RULE held)
- ✓ #2/#3/#5 — Scene 2 avatar consistency: mustard sweater + hair + residence context all match reference; spot varies (breakfast nook ≠ reference's main room). **First proof B1+B2+B3+wiring fix all fire correctly.**
- ✓ #4 — Scene 2 expression follows prompt (mild frustration at phone), does NOT inherit reference's smile.
- ✓ #6 — Camera angles vary across scenes (Scene 7 head-on close-up vs Scene 2 medium shot — `index` / `index + 100` variationIndex pass at Step5Storyboard.tsx:158-188 working).
- ✓ #7 — REGEN button works on Scene 7 (initial roll: avatar looking down, no product → after regen: eye contact + holding product). A1 confirmed.

New observations (not failures, but worth logging):
- **Scene 4 product shot may be passing through the reference image** rather than re-rendering. The hero shot Neil uploaded already had rustic wood + warm light + bokeh, which matched the storyboard prompt verbatim — so we can't tell whether `PRODUCT_IDENTITY_LOCK` is doing surgical extract-and-replace or just echoing the reference. **Follow-up test post-beta:** run the same brand with a plain white-background product photo and check if Scene 4 still produces the wooden-board composition. If not, real bug.
- **Scene 7 prompt ambiguity:** "pointing down towards the screen with a friendly inviting smile" can read as "looking down at where you're pointing" *or* "eye contact + finger pointing at frame bottom." First interpretation produced a miss; REGEN got the right roll. Tighter phrasing (`eye contact with camera, finger pointing toward bottom edge of frame`) would reduce REGEN-needed rate. Bucket B tuning, deferred — REGEN is the user-facing fix.

Pending criteria (resume tomorrow):
- ☐ #8 — Step 8 thumbnail tab: no crop, click-to-zoom modal works
- ☐ #9 — Step 8 EXPORT_BUNDLE: produces `Bukidnon_Brew_Bundle.zip` with all assets
- ☐ #10 — Step 8 GENERATE_VIDEO_NOW: deeplink works, scene chips load, click swaps prompt
- ☐ #11 — // CLEAR_SESSION_&_RESTART pill is visible and works

New code shipped this evening (folds into the same bundled commit):
- **ImageModal zoom/pan** ([components/ui/ImageModal.tsx](components/ui/ImageModal.tsx)) — click-to-zoom (cursor `zoom-in` → `grab`/`grabbing`), drag-to-pan when zoomed, ZoomOut button (top-left) when zoomed, hint copy `// CLICK_IMAGE_TO_ZOOM_IN` / `// DRAG_TO_PAN · CLICK_TO_ZOOM_OUT`. Hand-rolled with `transform: scale() translate()`, no new dep. Single component → applies to Step 4/5/6/7/8.
- **Step 6 thumbnail tile no-crop fix** ([components/Step6Thumbnail.tsx:92-99](components/Step6Thumbnail.tsx#L92-L99)) — `object-cover` → `object-contain` + `bg-zinc-950` letterbox. Tile now shows the same image the modal shows (no aspect surprise on click). Same fix Neil already applied to Step 8 in this morning's redesign; Step 6 was missed in that pass.

Build state: green (`tsc && vite build` → 2237 modules, ~5.8s after one cache wipe for the documented html-inline-proxy flake). Dev server still running on :5173 as background task `bjup4hu4o`.

**Tomorrow's starting point:** test video generation end-to-end with the wizard's video prompts. Neil's words: *"build the video generation so I can test the video prompts to action."* Implies GenerateVideo module needs Veo wiring proven (or the multi-scene queue from the parked list is what unlocks the test). Open `components/GenerateVideo.tsx` + `services/geminiService.ts` video-related calls first thing to scope what "build" means. Don't commit the working tree yet — regression isn't complete; wait until #8–#11 pass.

### Regression run — TEMU + TESTIMONIAL extension (2026-05-06)

**Status: Run 1 (TESTIMONIAL) partial — completed through Step 6 thumbnail, auth expired before Step 7. Run 2 (TEMU) not started. Custom touch-test not started.** Pivot: enough signal captured to stop and address the surfaced bugs first; resume TEMU run after fixes.

**Pre-flight verified clean:** Steps 7/8 code paths verified end-to-end against the 208ba1a build (script render path, thumbnail no-crop, EXPORT_BUNDLE, GENERATE_VIDEO_NOW deeplink wiring, CLEAR_SESSION pill). All 5 pending criteria from 2026-05-05 confirmed at the code level. Build green: 2237 modules, 5.59s.

#### Code shipped (uncommitted, single edit)

- **ImageModal portal fix** ([components/ui/ImageModal.tsx](components/ui/ImageModal.tsx)) — wrapped return JSX in `createPortal(..., document.body)` plus `import { createPortal } from 'react-dom'`. Root cause: the wizard main panel at [App.tsx:511](App.tsx#L511) has `backdrop-blur-xl`, which per CSS spec creates a new containing block for fixed-positioned descendants. Modal's `fixed inset-0` was being scoped to that 9-scene-tall panel instead of the viewport, opening off-screen when the user clicked images on Scene 7+ of a long storyboard. Portal escapes the containing-block trap. **Confirmed working in browser by user.**

#### TESTIMONIAL Run 1 — observations

**What worked (validated, no regression vs MrBeast):**
- ✓ Avatar appearance consistency across Scenes 2 + 8 — face, wardrobe, hair, spot all locked. IDENTITY_LOCK + APPEARANCE_LOCK_RULE + ENVIRONMENT_SYNC firing correctly. The wiring fix from 2026-05-05 holds for TESTIMONIAL.
- ✓ Spot variation — kitchen / dining / counter inside one residence (ENVIRONMENT_SYNC working).
- ✓ Body copy quality — solid Taglish testimonial structure, named pain, transformation arc.
- ✓ Director Critique — coherent strategic reasoning ties to features + pacing.

**What's broken (system-level bugs surfaced — affect every formula, not just TESTIMONIAL):**

1. **P0 — `AVATAR_CAMERA_ANGLES` applied unconditionally to b-roll scenes.** Scene 7 (coffee close-up b-roll) generated a hallucinated woman's face — non-Filipino, not in prompt — because the talking-head "intimate close-up" angle was injected into a non-avatar scene at variationIndex 0/6. Scene 2 + Scene 8 also locked into side-profile/non-camera angles when the script intent (intro "Hi, ako si Mark" / CTA "nodding confidently") clearly called for camera-facing. The parked item from 2026-05-05 ("Separate BROLL_CAMERA_ANGLES menu") is no longer parkable — beta has surfaced the symptom. Fix paths: (a) intent-aware angle selection (intro/CTA scenes always face camera), (b) split the angle pool by scene type (avatar-talking vs avatar-action vs product-broll), (c) script-level flag that overrides rotation. **CLAUDE.md-tuned area, needs re-grill before changing.**

2. **P0 — Logo/text rendering on Gemini Flash Image.** Step 6 thumbnail rendered a kraft coffee bag with garbled letters: "Coffee TWEN LADET FOUM BET KEVU LIKE" / "TIPID LANG" — hallucinated text mimicking logo shapes. Same root cause as 2026-05-05 Scene 9 logo strip. Model-level limitation; Gemini Flash Image's diffusion pipeline cannot reliably preserve typography. **Three real fix paths:** (a) post-process logo overlay — composite user's actual uploaded logo onto generated images, perfect text + zero per-image cost increase, ~2-3 days build; (b) hybrid model — gpt-image-1 for thumbnails + branded shots only (~$0.19/image vs Gemini's $0.04), ship as Pro+ tier perk; (c) UI affordance for manual logo overlay by user post-generation. **CMO call already locked: defer to Pro+ tier upgrade post-beta. Beta documents this as a known limitation; users use logo-free hero shots in the wizard for now.**

3. **P0 — Hand hallucination on multi-prop shots.** Scene 4 (product shot) added a woman's hand not in prompt. Step 6 thumbnail showed three hands holding mug + 2 coffee bags. PRODUCT_IDENTITY_LOCK at [services/geminiService.ts:1451-1458](services/geminiService.ts#L1451-L1458) explicitly enforces "anatomical accuracy (2 hands, 5 fingers each)" — model violates its own rule on multi-prop compositions. **Tuned area; needs re-grill or accept as Gemini Flash Image limitation.**

4. **P1 — Start/end frame product continuity.** Scene 1 hook end-frame: white ceramic mug → black mug. Prompt explicitly said "same mug" but start and end frames are independent generation calls (`variationIndex` vs `variationIndex + 100`), so they share no continuity reference. Same drift class as character drift, applied to props.

5. **TRANSIENT — PROXY_TIMEOUT on Scenes 3 + 6.** Gemini infra blip; the 55s ceiling at [services/geminiService.ts:25](services/geminiService.ts#L25) fired correctly (5s safety margin under Vercel's 60s hard cap). REGEN unblocks. Not a code bug.

**TESTIMONIAL prompt issues (script tuning, lower priority):**
- Hooks intermittently dump into `body` array instead of `hook1`/`hook2` — REGENERATE worked on second roll, suggests Testimonial structure's `0.` numbering for Hook (vs MrBeast's `1.`) confuses the parser. Probabilistic flake.
- LANGUAGE_LOCK violation: "barista level kape" — direct violation of the `[geminiService.ts:697-702](services/geminiService.ts#L697-L702)` rule that maps "cafe-quality goodness → parang barista ang lasa." Model wrote exactly the thing the rule forbids.
- Tagalog grammar drift: "matabang kape" missing linker "na" → should be "matabang **na** kape."
- Forced English-Tagalog hybrid: "ro-roast" → not natural Tagalog; should be "i-roast" or "na-roast."
- Voice mismatch: "nila" (third-person plural) in first-person testimonial line.

#### UX bugs surfaced

- **P0 — No wizard state persistence.** Auth expired mid-Step 7, forced re-auth wiped wizard state (in-memory React state in App.tsx, never persisted). User lost ~12 Gemini calls of generation. Quotas already consumed; state loss = paid credits worthless. **Fix:** localStorage (or IndexedDB if image data URLs blow past 5MB limit) autosave for `clientDetails`, `businessInfo`, `script`, `finalScript`, `avatar`, `storyboard`, `thumbnailUrl`, `videoPrompts`, `aspectRatio`, `language`. Debounced 500ms write on state change. On App.tsx mount, detect saved session and prompt user with "Resume previous session?" pill (don't auto-restore — give user explicit choice). On `restart()` clear the key. **~half day. Beta-blocker. Phase 2 = Supabase-backed cloud history as a Pro+ tier paid upgrade.**

- **P0 — Failed-scene retry gap.** REGEN button at [Step5Storyboard.tsx:478](components/Step5Storyboard.tsx#L478) only renders when `(scene.imageUrl || scene.endFrameImageUrl)` exists. When a scene fails to generate (PROXY_TIMEOUT, etc.), there's no per-scene retry button — user must hit GENERATE_ALL (which works as workaround: skips scenes with `imageUrl`, retries failures). Fix: drop the `imageUrl` requirement from the conditional, change button label to `GENERATE` when no image, `REGEN` when image exists. ~5-line edit.

- **P0 — Long-session JWT expiry handling.** Hit twice in one session. Supabase JWT defaults to 1-hour TTL; refresh token also expires. `getSession()` returns the expired token, server rejects with 401, user gets PROXY_ERROR_401. **Fix paths:** (a) bump Supabase JWT TTL in dashboard (no code, but security trade-off), (b) proactive `sb.auth.refreshSession()` poll every ~50 minutes, (c) global error boundary catching `PROXY_ERROR_401` → show re-auth modal → preserve wizard state → retry call. **Recommended: (c) + state persistence above. Together they make any auth interruption invisible.**

- **P1 — Step 6 thumbnail tile aspect mismatch.** Tile container aspect doesn't match the user's `aspectRatio` selection, so 9:16 thumbnails get vertical letterbox (zinc-950 black bars left/right) inside a wider container. Yesterday's `object-cover → object-contain` fix at [Step6Thumbnail.tsx:92-99](components/Step6Thumbnail.tsx#L92-L99) prevented cropping but exposed the aspect mismatch. **Fix:** match Step 8's pattern at [Step7FinalOutput.tsx:46](components/Step7FinalOutput.tsx#L46) — pick `aspect-[9/16]` for 9:16, `aspect-video` for 16:9. ~5-line edit.

#### Tomorrow's punch list (in priority order)

1. **Wizard state persistence** ([App.tsx](App.tsx), localStorage/IndexedDB autosave). Beta-blocker. ~half day. Unblocks every subsequent regression run by making credit-spend durable.
2. **JWT auto-refresh + 401 error boundary.** Pairs with #1. ~half day. Together: tab close / sleep / network drop / auth expiry → zero state loss.
3. **Failed-scene GENERATE button** ([Step5Storyboard.tsx:478](components/Step5Storyboard.tsx#L478)). ~5-line UX fix.
4. **Step 6 tile aspect mismatch** ([Step6Thumbnail.tsx](components/Step6Thumbnail.tsx)). ~5-line UX fix.
5. **AVATAR_CAMERA_ANGLES split / intent-awareness** ([services/geminiService.ts](services/geminiService.ts)). CLAUDE.md-tuned, needs re-grill. ~1 day. Single biggest quality lift — fixes Scene 7 face hallucination class, Scene 2/8 wrong-angle-for-intent class.
6. **TESTIMONIAL prompt LANGUAGE_LOCK + grammar tuning.** CLAUDE.md-tuned, needs re-grill. ~1 hour. Address "barista level," "ro-roast," "nila," "matabang kape."
7. **Resume TEMU run + Custom touch-test** on the post-fix build. Document results.

After all 7: working tree gets committed as one bundled commit. Then the parked video-generation work resumes (yesterday's pointer).

#### Logo/text rendering — locked decision

CMO call locked, do not relitigate without new data: **stay on Gemini Flash Image for beta. Defer gpt-image-1 to Pro+ tier as a paid upgrade.** Document the text-rendering limitation publicly; tell beta users to use logo-free product hero shots. The hybrid model architecture (gpt-image-1 for thumbnails/branded shots only) becomes a Free→Pro conversion driver, not a beta blocker.

#### Working tree state at session end

- `M  components/ui/ImageModal.tsx` — portal fix (uncommitted, do not push)
- 208ba1a remains source of truth on main; nothing pushed.
- Dev server still running on :5173 (background task `bmhqa3rph`); will die when terminal closes.

### Wizard state persistence shipped (2026-05-06 evening)

**Status: built + tsc/build green + dev server up on :5174. Smoke testing deferred to next session.** Punch list item #1 from earlier in this date entry is now done; **item #2 (JWT auto-refresh + 401 error boundary) is the next thing**.

#### What shipped (uncommitted)

- **New file:** [services/wizardSessionStore.ts](../services/wizardSessionStore.ts) — thin IndexedDB wrapper, ~80 LOC, no new deps. Three exports: `getSession(userId)`, `setSession(userId, blob)`, `clearSession(userId)`. Single object store `sessions` in DB `grifon_wizard`, keyed by Supabase `user.id`. Session blob shape is the exported `WizardSessionV1` interface; schema-versioned (`version: 1`); version mismatch on read returns null (silent overwrite path for future migrations).

- **Edited:** [App.tsx](../App.tsx) — additions only, no removals:
  - `userId` state captured from both `getSession()` and `onAuthStateChange()`.
  - **Load useEffect** — fires when `userId` lands; reads IndexedDB → `pendingSession` state.
  - **Auto-restore-decision useEffect** — once load finishes, marks `hasRestored=true` if no saved session OR if user already started fresh wizard work (in which case the saved record is cleared).
  - **Debounced save useEffect** (500ms) — writes `WizardSessionV1` blob on any wizard state change. Suppresses writes while wizard is pristine. Wraps in try/catch; once-per-session sonner error toast on quota/transaction failure.
  - `handleLogout` — explicit logout calls `clearSession(userId)` before `signOut`. Auth-expiry path doesn't hit `handleLogout`, so saved state survives JWT timeout (the original bug from the morning's TESTIMONIAL run).
  - `resumeSession` / `declineSession` handlers.
  - **Resume pill** above StepIndicator inside wizard `<main>`. Shows `// PREVIOUS_SESSION_DETECTED — STEP_NN_OF_08 — BRAND_NAME`. `[ START_FRESH ]` ghost + `[ RESUME ]` GoldButton.
  - **Spinner gate** `// LOADING_SESSION...` while initial IndexedDB read resolves.
  - On resume: sonner banner `// SESSION_RESUMED — STEP_NN_OF_08`, 6s duration.

#### Locked design decisions (via grill-me)

| # | Decision | Locked |
|---|---|---|
| 1 | Scope | Wizard-only (10 fields + currentStep). Cinematic Studio state excluded — separate Dashboard module, different failure economics. |
| 2 | Library | Thin custom wrapper, no dep. Native IndexedDB API. |
| 3 | Per-user key | Supabase `user.id` (UUID, stable across email change, lower PII surface). |
| 4 | Restore behavior | Jump to saved currentStep + sonner banner. StepIndicator's existing back-nav handles "review my earlier inputs." |
| 5 | Save trigger | Single debounced useEffect (500ms) + `hasRestored` state guard. |
| 6a | Pristine check | `currentStep === 1 && !brandName && !product && script === null`. |
| 6b | Pill placement | Inline above StepIndicator (not toast, not modal). |
| 7a | Logout | Explicit logout clears IndexedDB; auth-expiry preserves it. |
| 7b | Write failures | try/catch + console.warn always + sonner once-per-session. |
| 7c | Schema | `version: 1` field; mismatch = silent overwrite. |
| 7d | Initial load | Spinner gate inside wizard `<main>`. |

#### Known caveats / what this does NOT solve

- **JWT auto-refresh + 401 error boundary not yet shipped.** Without it, an expired JWT still throws PROXY_ERROR_401 mid-call; persistence preserves state but the user still sees an error and has to manually re-auth, then click `[ RESUME ]`. Pairs with this; the recommended next ship.
- **Cinematic Studio state not persisted.** Out of scope per design lock #1. Add later under same DB with a `version: 2` upgrade path if it bites.
- **Smoke test pending.** Build green (2238 modules, 6.66s after cache wipe — html-inline-proxy flake hit; documented `Remove-Item node_modules/.vite, dist` remediation worked). Browser test of load → pristine-detect → resume → save → logout-clear → re-auth flow is the next manual verification.

#### Smoke test plan (run before next ship)

Open `localhost:5174/` (NOT `/app` directly — Windows case-insensitive routing serves App.tsx as JS). Sign in.

1. **Pristine + no saved record** — Click Director AI. Spinner flashes. No pill. No console errors.
2. **Autosave fires** — Type brand name on Step 1. Wait 1s. DevTools → Application → IndexedDB → `grifon_wizard` → `sessions`. Row exists keyed by user.id with `clientDetails.brandName` matching.
3. **Resume pill on hard reload** — F5. Click Director AI. Spinner → resume pill: `// PREVIOUS_SESSION_DETECTED — STEP_01_OF_08 — BRAND`. Step 1 inputs still pristine (no auto-restore).
4. **RESUME hydrates state** — Click `[ RESUME ]`. Brand name appears. Sonner: `// SESSION_RESUMED — STEP_01_OF_08`. Pill gone.
5. **START_FRESH clears record** — F5. Pill appears. Click `[ START_FRESH ]`. Pill gone. IndexedDB row deleted.
6. **Multi-step jump** — Fill Step 1, Next to 2, fill product, Next to 3. F5. Pill says `STEP_03_OF_08`. Resume → lands on Step 3 (not Step 1). StepIndicator back-nav shows Step 1+2 data intact.
7. **Explicit logout clears** — Logout via dropdown. Sign back in. Click Director AI. No pill. IndexedDB row gone.
8. **Image-bearing payload survives reload** — Generate avatar (Step 4) + at least one storyboard scene (Step 5). F5. Resume. Avatar + scene image render without re-generation. No quota toast.

#### Updated punch list (post this ship)

1. ~~Wizard state persistence~~ — **DONE 2026-05-06 evening.**
2. ~~Smoke test (8 tests + bonus Step 8 reload)~~ — **PASSED 2026-05-06 evening.** Persistence is shippable.
3. **Pre-beta polish bundle (~full day, NEXT SHIP):**
   - **3a.** JWT auto-refresh + 401 error boundary. Pairs with persistence: state is saved, 401 catch + re-auth makes auth interruption invisible. ~half day.
   - **3b.** Sonner toast restyle. Current white background on `// SESSION_RESUMED` toast breaks the design system. Align to zinc-950 + gold accent + mono caps to match the `// PREVIOUS_SESSION_DETECTED` pill. ~5-line theme override on the `<Toaster>` config.
   - **3c.** Suppress Pro Tip "Run Market Research First" nudge while resume pill is up. 1-line: add `&& !showResumePill` to the nudge condition at [App.tsx:563](../App.tsx#L563).
   - **3d.** Gate TEMU option in scriptType picker as disabled with `// COMING_IN_V1.1` label. Prevents the broken MrBeast-cosplaying-as-TEMU formula from reaching beta users.
   - **3e.** Wire `clientDetails.offer` (tripwire from Offer Optimizer), `businessInfo.separator` (Main Differentiator), `businessInfo.audience` into the script generation prompt per the locked **Script-input wiring matrix** below. Surgical per-formula slotting — offer slots into Scene 7 CTA only (offer STRUCTURE not bare price), separator into Scene 5/6 PROOF beats, audience as system-instruction register tuning (never as content). CLAUDE.md-tuned, requires grill-me to lock prompt edits before surgical-edit. ~half day. **Highest-ROI prompt change available pre-beta — wires the dormant Offer Optimizer → Director AI bridge that was architected but never built.**
   - **3f.** Drop `businessInfo.logoImageUrl` from wizard (truly unused everywhere). Decide on `clientDetails.services` (Neil's call: vestigial like an early-iteration leftover, or upstream-fed by some module I haven't seen?). 5-min UI cleanup once decided.
4. **Beta launch** — MrBeast + TESTIMONIAL formulas only. 5–10 hand-picked Filipino SMB owners. Frame TEMU as "v1.1 first access" reciprocity hook for the beta cohort.
5. **TEMU formula re-spec ship (v1.1, ~1.5–2 days)** — see locked design brief below this section. Grill-me protocol before touching `services/geminiService.ts`. Drop to beta cohort with reciprocity framing.
6. Failed-scene GENERATE button ([Step5Storyboard.tsx:478](../components/Step5Storyboard.tsx#L478)). ~5-line UX fix. Pre- or post-beta.
7. Step 6 tile aspect mismatch ([Step6Thumbnail.tsx](../components/Step6Thumbnail.tsx)). ~5-line UX fix. Pre- or post-beta.
8. AVATAR_CAMERA_ANGLES split / intent-awareness ([services/geminiService.ts](../services/geminiService.ts)). CLAUDE.md-tuned, needs re-grill. ~1 day. Post-beta.
9. TESTIMONIAL prompt LANGUAGE_LOCK + grammar tuning. CLAUDE.md-tuned, needs re-grill. ~1 hour.

#### Working tree state at end of session

```
M  App.tsx                                  (this evening — persistence)
M  components/ui/ImageModal.tsx              (morning — portal fix)
M  workflows/launch_readiness.md             (this update)
?? services/wizardSessionStore.ts            (this evening — new)
```

01cb33e remains HEAD on main; nothing pushed. Dev server still running on :5174 (background task `bz1c92pzg`); will die when terminal closes.

#### Next session starting point

Smoke tests + bonus Step 8 reload all green this evening; persistence is shippable. Next ship is the **pre-beta polish bundle** (punch list item #3): JWT auto-refresh + 401 boundary, sonner toast restyle, nudge-suppress fix, TEMU-option gate, **and the offer/separator/audience wiring per the Script-input slotting matrix below**. ~full day. After that bundle ships, beta launches with MrBeast + TESTIMONIAL only. TEMU re-spec is v1.1 — locked design brief below; grill-me before any `services/geminiService.ts` edit on either the slotting matrix OR TEMU.

### Script-input wiring matrix — locked design brief (2026-05-06 evening)

**Status: design brief locked via grifon-cmo + Neil approval. Ships pre-beta as polish bundle item #3e. ~half day grilled prompt work.**

#### Trigger

Discovery that 3 wizard inputs are collected but the script generation prompt either ignores them or explicitly tells the model to ignore them:
- `clientDetails.offer` — the tripwire from Offer Optimizer (Bryan crafts tripwire/core/high-ticket → pastes tripwire into Step 2). The architectural bridge Neil designed; never wired into geminiService.
- `businessInfo.separator` — "Main Differentiator" ([Step2BusinessInfo.tsx:156-165](../components/Step2BusinessInfo.tsx#L156-L165)). Required field in Step 2; geminiService has zero references.
- `businessInfo.audience` — script prompt at [services/geminiService.ts:564](../services/geminiService.ts#L564) explicitly says: `"Do not ask the user for target audience details. You deduce the most profitable avatar based on the product provided."` But the wizard makes Bryan fill it in anyway.

Hand-picked beta of 5–10 Filipino SMB owners means highest-stakes first-impression scripts. Shipping beta with the offer→script bridge cut means every Bryan in the cohort sees a strategically weaker output than the product can produce. Sabri Suby reality check: "build a great offer, copy is just the megaphone" — and the megaphone wire to the offer is currently cut.

#### Slotting matrix (locked, approved by Neil 2026-05-06 evening)

One slot per input per formula. Anywhere else dilutes or destroys the formula's persuasion stack.

| Input | MrBeast | TESTIMONIAL | TEMU (v1.1 re-spec) |
|---|---|---|---|
| **`clientDetails.offer`** (tripwire) | **Scene 7 CTA ONLY.** Inject offer STRUCTURE (scarcity + value adds + urgency), never the bare price. Example: "first 50 lang, kasama ang free shipping + recipe ebook." Hook stays curiosity-gap-pure. | **Scene 7 WARM CTA ONLY.** Same structural injection, gentler tone — recommendation framing not direct sell. "Try niyo na, sulit kahit first time bumili — first 50 may free shipping pa." | **Scene 6 (Proof/Scarcity) + Scene 7 (CTA) overlays.** Carry offer's scarcity/urgency words: `"FIRST 50 LANG"` / `"FREE SHIPPING"` / `"TAP YELLOW BASKET ↓"`. **Never the bare price** — price belongs on the Shopee/Lazada listing, not the ad. |
| **`businessInfo.separator`** (Main Differentiator) | **Scene 5 PROOF beat.** "Hindi tulad ng iba — kami `${separator}`." This is the "why believe?" slot. Never in hook (kills curiosity), never in CTA (offer owns that). | **Scene 6 SPECIFIC PROOF beat.** "Marami akong na-try na ibang [category], pero ito lang ang gumana sa akin kasi `${separator}`." Comparative moment is where differentiator earns its keep. | **Scene 5 VARIETY/STACK overlay.** Compress to 1-3 words: `"100% PLANT-BASED"` / `"BUKIDNON GROWN"` / `"NON-TOXIC"`. Differentiator becomes a visual badge, not a sentence. |
| **`businessInfo.audience`** | **System instruction REGISTER tuning ONLY** — never script body content. Inject as: `"Match vocabulary, idiom, and Taglish register to: ${audience}"`. Affects HOW the model talks, not WHAT it says. | **Same as MrBeast** + Scene 1 IDENTITY persona alignment ("Ako si Mark, OFW dad" matches OFW audience; "Ako si Tin, single mom" matches Filipino-mom audience). Audience NEVER named literally; speaker's persona implicitly matches. | **Visual register tuning** for Scene 4 In-Use beat: wardrobe, setting, lighting tone match audience context (Filipino moms → soft morning kitchen; OFWs → balikbayan-box framing). NEVER overlay text. |

#### Hard constraints honored

- **Never mention price in video scripts.** Wire offer STRUCTURE (scarcity, urgency, value adds), not bare price. Standard direct-response: ad opens curiosity → landing page closes price.
- **Audience as register, never as content.** Naming audience back to them ("for Filipino moms 25–40 who shop on TikTok Shop, here's the coffee...") reads like a database merge field — Bryan-killer.
- **Hook curiosity-gap (MrBeast) stays untouched.** All inputs slot at proof/CTA beats; Scenes 1–2 remain mechanism-pure.

#### Implementation handoff (grill-me + surgical-edit)

**1. services/geminiService.ts** (CLAUDE.md tuning gate — grill-me before any prompt edit)
- Remove "Do not ask the user for target audience details" instruction at [line 564](../services/geminiService.ts#L564). Replace with register-tuning instruction using `businessInfo.audience`.
- For each formula branch (MrBeast at [~line 766](../services/geminiService.ts#L766), Testimonial at [~line 752](../services/geminiService.ts#L752), Temu at [~line 723](../services/geminiService.ts#L723)): identify the Scene N prompt construction site and inject the per-input slot per the matrix. Surgical insertion at the right scene-prompt template, not a global "use everywhere" rule.
- Fallback handling: empty `offer` → Scene 7 CTA falls back to existing generic CTA. Empty `separator` → Scene 5/6 PROOF beat falls back to existing generic-proof phrasing.

**2. types.ts** — no change. All three fields already exist on `ClientDetails` / `BusinessInfo`.

**3. components/Step3AdScript.tsx** — no structural change. Form submission already passes both objects through to `generateAdScript`. The wiring change is purely on the prompt-construction side in geminiService.

#### Open question — Neil's call before grill-me

`clientDetails.services` — vestigial early-iteration field, or upstream-fed by some module I haven't seen? If standalone, drop in 3f. If upstream-fed (like `offer` is from Offer Optimizer), wire it like offer per a similar matrix.

#### Pre-grill-me checklist

Before grill-me runs tomorrow, lock the unresolved decisions:
- [x] Slotting matrix approved (2026-05-06 evening)
- [ ] `clientDetails.services` decision (drop / wire / keep parked)
- [ ] Fallback rules for empty `offer` and empty `separator` (degrade gracefully ✓ already specified, but confirm)
- [ ] Audience register-tuning instruction phrasing — once line 564 is removed, exact replacement text

### TEMU formula re-spec — locked design brief (2026-05-06 evening)

**Status: design brief locked via grifon-cmo + Neil pushback. Implementation deferred to v1.1; beta launches WITHOUT TEMU exposed.** Re-spec triggered by TEMU regression run findings: current formula generates MrBeast-style talking-head scaffolding (avatar + full Taglish VO + avatar in thumbnail) for what should be product-only fast-cut B-roll. Wrong category, wrong persuasion stack.

#### What TEMU actually is

Scroll-Stop Product Drop Mode. 8–12 seconds. 7 cuts. Zero avatar. Zero VO. Pure product B-roll with text overlays composited by user in CapCut on top of trending audio. Persuasion stack: **Pattern Interrupt → Curiosity Gap → Scarcity → Frictionless CTA.** Different from MrBeast (Authority + Liking) and TESTIMONIAL (Social Proof) — different formula, different scaffolding.

Target sub-segment of Bryan: e-com sellers on Shopee/Lazada/TikTok Shop. Single SKU. P99–P999 impulse-buy price points. Visual categories (food, gadgets, beauty, home goods). NOT for service businesses, high-ticket, or trust-required categories.

#### Locked design decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Skip Step 4 (Avatar) entirely when `scriptType === 'TEMU'` | No avatar in formula; saves Gemini call + removes hallucination surface |
| 2 | No VO output. Per-scene text-overlay copy delivered as DATA, never baked into images | Bryan rides trending audio; CapCut overlays animate; baked text would compound Gemini Flash Image's typography limitation across 7 scenes per ad |
| 3 | `RAW_OUTPUT_RULE` on all TEMU image gen — never embed text/captions/prices/labels/logos in the image | Edit-friendly: price changes = 1 CapCut text edit, zero Gemini re-gen, zero product drift |
| 4 | 7-scene structure mandate (Hook / Texture / Scale / In-Use / Variety / Proof / CTA), 1–2s per cut | TEMU pacing standard; ~10s total |
| 5 | Hands allowed on Scene 4 (in-use beat) only. No face, no full body, anywhere else | Product is the protagonist, not the user |
| 6 | Thumbnail = product hero only, raw. Overlay copy as separate data string | Same `RAW_OUTPUT_RULE`; Bryan composites in Canva/CapCut before posting |
| 7 | Kling 3.0 owns motion across all 7 scenes. Kling 2.6 only on Scene 1 keyframes (start + end frames) | Per Neil's architectural read; product motion vocabulary not human verbs |
| 8 | UI label in scriptType picker: `PRODUCT_DROP // SCROLL-STOP` with subtitle `For e-com SKUs. No talking head. Pure product cuts. ~10 seconds.` | Bryan needs to know what he's choosing before burning credits |
| 9 | Beta launches WITHOUT TEMU exposed. Disable option in Step 2 picker. Frame as "v1.1 first access" reciprocity hook | Prevents the "garbage AI output" objection landing on Day 1 of beta |

#### 7-scene structure (mandate in system instruction, no flexibility)

| Scene | Role | Duration | Visual | Camera vocab |
|---|---|---|---|---|
| 1 | HOOK | 1.5–2s | Extreme close-up macro. Pattern interrupt — bag opening, beans pouring, steam rising, label reveal | macro, push-in, snap-zoom |
| 2 | TEXTURE | 1–1.5s | Tight detail (grain, packaging texture, valve close-up) | macro, slow rotation |
| 3 | SCALE/CONTEXT | 1–1.5s | Product in real environment (counter, scale, beside cup) | static wide, tilt-down |
| 4 | IN-USE | 1.5–2s | Product being used (pouring, scooping, brewing) — hands allowed, no face | over-shoulder, top-down |
| 5 | VARIETY/STACK | 1–1.5s | Multiple bags, color/flavor options, quantity reveal | parallax, dolly across |
| 6 | PROOF/SCARCITY | 1–1.5s | Hero glamour, dramatic light, product centered | slow rotation, rim-light reveal |
| 7 | CTA | 1–2s | Product + yellow basket arrow + clear CTA | static center, bounce-in arrow |

#### Per-scene overlay copy spec (returned as data, not baked)

- 1–5 words max. 4th–5th grade Taglish. No full sentences.
- Scene 1 = curiosity-gap hook (`"GRABE THIS COFFEE"` / `"WAIT FOR IT"` / `"BUKIDNON DROP"`)
- Scenes 2–5 = single-word claims (`"PREMIUM"` / `"FRESH"` / `"BUKIDNON GROWN"` / `"RESEALABLE"`)
- Scene 6 = scarcity or proof (`"P349 ONLY"` — Bryan supplies the price; AI never invents)
- Scene 7 = clear action (`"TAP YELLOW BASKET ↓"`)
- Thumbnail overlay = 3–5 words, separate string, follows existing thumbnail rules (gold #FFCC00 + white)

#### Implementation handoff (grill-me + surgical-edit checklist)

**1. types.ts**
- Add `sceneOverlays: string[]` (one per scene) and `thumbnailOverlay: string` to script type. Either new `ProductDropScript` interface or optional fields on existing `Script` type. Keep `finalScript[]` as legacy/MrBeast/TESTIMONIAL field.

**2. App.tsx**
- When `businessInfo.scriptType === 'TEMU'`: Step 3 `onNext` jumps directly to Step 5. StepIndicator hides Step 4 or labels it `// SKIPPED`.
- `avatar` state stays null for the entire TEMU flow.

**3. services/geminiService.ts** (CLAUDE.md tuning gate — explicit approval required per change)
- `generateScript` — TEMU branch outputs `sceneOverlays[]` not VO lines. New system instruction: 7-scene structure, per-scene role (Hook / Texture / Scale / In-Use / Variety / Proof / CTA), text-overlay rules per spec above.
- `generateStoryboard` — TEMU branch with `NO_HUMAN_RULE` (no faces, no full bodies; hands only on Scene 4), `PRODUCT_FOCUS_RULE` (product centered or hero in every scene), `MOTION_VOCABULARY_RULE` (zoom, rotation, parallax, macro reveal — no human verbs), `RAW_OUTPUT_RULE` (never embed text/captions/prices/labels/logos in the image). Drop avatar locks (`IDENTITY_LOCK`, `APPEARANCE_LOCK_RULE`, `ENVIRONMENT_SYNC`).
- `generateThumbnail` — TEMU branch: product-hero prompt path, no avatar, `RAW_OUTPUT_RULE`. Generate `thumbnailOverlay: string` separately.
- `generateVideoPrompts` — TEMU branch: Kling 3.0 motion vocabulary across all scenes. Scene 1 retains Kling 2.6 keyframe pattern.

**4. components/Step5Storyboard.tsx**
- When TEMU, don't pass `avatar` to `generateSceneImage`. `referenceImageMode` defaults to product-only.
- Hide avatar-related UI affordances.

**5. components/Step2BusinessInfo.tsx (or wherever scriptType picker lives)**
- Update label to `PRODUCT_DROP // SCROLL-STOP`. Subtitle: `For e-com SKUs. No talking head. Pure product cuts. ~10 seconds.` Tooltip: `Best for single products P99–P999. Skip if you sell services or high-ticket.`
- For beta launch (item #3d above): gate as disabled with `// COMING_IN_V1.1` label until re-spec ships.

**6. components/Step6Thumbnail.tsx**
- When TEMU, render product-only preview. Hide avatar-blend toggle if it exists.

**7. components/Step7FinalOutput.tsx (Step 8 in UI)**
- Under each scene tile + thumbnail, render overlay copy as zinc-300 mono with `[ COPY ]` button (matches DEPLOY_AUDIO copy-button pattern from Signal Modulator).
- Add `overlays.txt` to `EXPORT_BUNDLE.zip` with all per-scene overlays + thumbnail overlay + usage notes (paste into CapCut, gold-on-dark / white-on-light, animate-in per cut).

#### Sequencing (post-persistence-ship)

1. **This week — pre-beta polish bundle (~half day):** punch list item #3 above (JWT + toast + nudge + TEMU gate).
2. **Beta launches with MrBeast + TESTIMONIAL only.** 5–10 hand-picked Filipino owners. Frame TEMU as v1.1 first-access for beta cohort.
3. **Week 1 of beta — TEMU re-spec ship.** ~1.5–2 days grilled engineering against this brief. Drop to beta users with reciprocity framing.
4. **Week 2 of beta — measure.** Which formula gets more wizard completions? Which produces ads beta users actually run? Answers whether TEMU should be the default for the e-com sub-segment of Bryan.

### Parked / deferred (non-blocking)

| Item | Reason |
|---|---|
| `ImageAdsGen.tsx` + `OrganicCalendar.tsx` wiring fix — same `referenceImageMode` bug, different modules | Outside current test path; Tier 4 cleanup post-beta |
| Separate `BROLL_CAMERA_ANGLES` menu — current `AVATAR_CAMERA_ANGLES` are talking-head framings ("focus on eyes") applied unconditionally including to product B-roll | Defer until beta tells us if B-roll framing is a problem |
| ChatGPT/Higgsfield-style persistent asset library — Supabase tables, RLS, CRUD, gallery UI | Greenfield multi-day initiative; export-bundle covers beta |
| Multi-scene queueing in GenerateVideo — auto-render all 8 scenes in sequence | Manual scene-chip swap is the v1 UX; beta will tell us if tedious |
| `// 3RD_REGENERATION_DETECTED` soft warning toast | Optional UX nudge; existing per-tier daily quotas (commit `5855fb3`) handle abuse |
| Strategic Audit prompt rewrite — current is generic and self-praising | Quality concern, not a beta blocker |
| 40-second ad length — tighten storyboard prompt to 5-6 scenes (~25-30s ads) | Beta will tell us if length is the bottleneck |
| Wizard input audit follow-up — superseded for `offer`/`separator`/`audience` by pre-beta polish bundle item #3e (Script-input wiring matrix). Remaining v1.2 work after polish-bundle ships: instrument Step 1/2 fill-rates per field across beta cohort, audit any other fields surfacing as collected-but-ignored, and confirm `clientDetails.services` resolution (drop vs wire pending Neil's call). | Beta data > assumptions. Once 3e ships, the once-suspected-dead fields will be wired correctly per the matrix; remaining cleanup is data-driven rather than guess-driven |

### Documented behavioral lessons from this session

Worth folding into `agent_lessons.md` if it bites again, but not blocking:
- **Wiring bugs masquerade as content bugs.** The Bucket B IDENTITY_LOCK rewrite was content-correct but never executed because `Step5Storyboard.tsx` wasn't passing `referenceImageMode`. Diagnosis path: when prompt edits don't produce expected output, grep call sites for the gated parameter before iterating on prompt text. The `generateSceneImage` signature has 11 positional args; only `InfluencerForge.tsx` was passing them all.
- **Vite html-inline-proxy first-build flake remediation:** wipe `node_modules/.vite` + `dist`, then retry. The "second invocation passes" recipe from the 2026-05-04 entry is unreliable; the cache wipe is deterministic.

## Status as of 2026-05-04 (evening update)

ICANN domain verification confirmed (Gate 6 follow-up closed). ElevenLabs upgraded to **Starter plan** (10 voice slots, IVC enabled). Voice cloning smoke-tested end-to-end in local dev: clone → cloned voice usable in TTS → delete frees the slot. Today's session shipped:
- `api/elevenlabs/voices/clone.ts` — fixed data-URL parser to accept MediaRecorder's `audio/webm;codecs=opus` output; split error mapper to distinguish "API key missing scope" from "plan tier insufficient"; added user-readable `message` to all 400/415/429 paths so the UI surfaces real reasons.
- `vite.config.ts` — taught `vercelApiDevPlugin` to resolve `[param].ts` dynamic routes and inject the segment value into `req.query`. Without this, the DELETE handler at `api/elevenlabs/voices/[id].ts` was unreachable in dev (worked in prod via Vercel's filesystem router).

**IVC unlock — CLOSED 2026-05-04.** Voice cloning is live for Creator+ users on `app.grifon.ai`. End-to-end smoke test on prod passed: cloned voice created, used in TTS, deletable. Voice Changer (uploaded + recorded) and Voice DNA library voices also confirmed working post-deploy. The Supabase `user_voices` table is live in prod (proven by behavior).

Operational changes flipped in Vercel (Production scope) and redeployed:
- `GRIFON_VOICE_CLONING_ENABLED=true`
- `ELEVEN_LABS_API_KEY` rotated to a key with `Voices=Write + TTS + Models` scopes (the prior key was missing `Voices=Write`, which would have 401'd cloning even with the flag on).

Shipped same session (commits `fa1fec1`, `9837d0b`, `66df4ca`):
- Plan-tier gate at `components/SignalModulator/index.tsx:24-25` — Voice Cloning tab now renders only when `useSubscription` reports Creator+ (`planAtLeast(plan_id, 'creator')`); free-tier users no longer see the tab.
- `MAX_VOICES_PER_USER` bumped 1 → 2 at `api/_lib/voiceConfig.ts:4` to give Creator/Pro users headroom without exhausting the 10-slot Starter pool.

Signal Modulator polish — CLOSED 2026-05-04 (extended session). Three-part ship:

**Part 3 — Session history + regenerate** (commit `e42e563`):
- New `// LOG` button at top-right of Signal Modulator header opens a slide-in drawer.
- In-memory session log capped at 20 takes, mixing TTS + Voice Changer in one chronological list.
- Each take: voice name, snippet/source, relative time, ▷ play, ⟲ restore, 🗑 remove.
- **Restore** rehydrates voice + text + stability + (for VC) sourceFile + sourceLabel into the form and auto-switches tab if needed. Implemented via `pendingRestore` state in `useSessionHistory` consumed by per-tile useEffect.
- **Regenerate** button inline next to DEPLOY AUDIO when an output is showing. Capped at 3 per take with visible `// 3_LEFT` counter. Re-fires API with the take's *stored* params (so editing the form mid-take doesn't change what regen produces). At 0, disables with hint copy.
- Copy updated: `// OUTPUTS_NOT_STORED` → `// LOGGED_TO_SESSION — DEPLOY_AUDIO_TO_KEEP_AFTER_REFRESH`.
- Cleared on browser refresh (no backend, no storage cost). Files: `useSessionHistory.ts` (hook), `SessionHistory.tsx` (drawer), updates in `index.tsx` + both tiles + `utils.ts` + `types.ts`.
- **Cost-protection caveat**: 3-regen cap is a band-aid. There is currently *no per-user daily/monthly TTS quota* — entire app shares ElevenLabs Starter's 30,000 credits/month. Per-tier daily quotas are a separate ship needed before any real userbase scales (see follow-ups below).

**Part 2 — Native download dedup** (commit `94762a3`):
- `<audio controls>` 3-dot menu was exposing a second download path that bypassed the `downloadAudio()` branded-filename helper. Added `controlsList="nodownload"` on both tiles' audio elements. Single clear save action via DEPLOY AUDIO.

**Part 1 — Voice picker curation + leak fix** (commit `b6b0c68`):

1. **Recommended-for-Ads curation**  (`components/SignalModulator/pinoyReady.ts` populated with 8 American stock voices: Sarah/Liam/Laura/Will/Jessica/Brian/Bella/Bill). ElevenLabs stock catalog has zero `language: "fil"` voices, so "Filipino default" can't be a metadata filter; curation is by hand. Picker now defaults to `// RECOMMENDED_FOR_ADS` section + a `// SHOW_ALL_21_STOCK_VOICES` toggle that expands the by-language groups. Default voice for new TTS / Voice Changer sessions prefers cloned → recommended → first stock.

2. **FILIPINO_LIBRARY allowlist + workspace-leak fix** (`api/_lib/filipinoLibrary.ts`). Replaced the fail-open `category !== 'premade' && !myIdSet.has()` filter with an explicit allowlist of 5 admin-curated voices: Pinay Spokesperson, Pinoy Reviewer, Pinay Vlogger, Pinoy TikToker, Pinoy Kid Voice. Display names override the admin's internal ElevenLabs labels (e.g., "SEAMAN TIKTOK" → "Pinoy TikToker") so users see persona-driven labels and admin internals stay private. Voice descriptions sourced from Gemini 3.1 Pro audio analysis (AI Studio, run by user). Hidden post-deploy: James, Ellen, Zam Grifon voice, NEIL MAGLAYA NEW VOICE — all correctly suppressed. See `agent_lessons.md` 2026-05-04 entry for why allowlist must be the default for any shared-account multi-tenant resource.

Note: the `localStorage.grifon_admin` key is **still in use** by `Dashboard.tsx:440,463` as an admin-only preview switch for the MORE MODULES section (7 in-progress modules). Do not advise users to remove it — see `agent_lessons.md` 2026-05-04 entry for the regression that taught this.

Dev-quality follow-up shipped same session: `vite.config.ts:97` env loader guard dropped so `.env` edits are picked up on every config reload (see `agent_lessons.md` 2026-05-04 entry).

**Part 4 — Per-user daily quotas + voice cloning UX polish** (commit `5855fb3`, shipped same evening):

1. **Cost firewall — per-user daily TTS/STS/clone quotas, plan-tier-aware.** Closes Open Follow-up #1 from earlier in this same session. Approach: kept request-count caps (not character-cost) to avoid an SQL migration; the existing `rate_limit_check` RPC handles variable limits per call, so per-tier limits drop in by passing the tier-resolved number. New: `api/_lib/userPlan.ts` (server-side plan lookup from `subscriptions` table, defaults to free for missing/cancelled), `api/_lib/quota.ts` (per-tier `TTS_DAILY` / `STS_DAILY` / `CLONE_DAILY` maps + `peekQuota()` read-only helper for the budget endpoint), `api/elevenlabs/budget.ts` (GET endpoint returning per-bucket `{used, limit, remaining, resetSeconds}`). Daily checks added to `text-to-speech.ts`, `speech-to-speech.ts`, and `voices/clone.ts` after the existing per-minute throttles. UI: `// X_LEFT_TODAY` indicator in Signal Modulator header reflecting the active tile's bucket, color-shifts gold/red as it depletes, refreshed via `onUsageReported` callback fired by tiles after every synth/regen/clone. Limits per day: free 3/2/0, creator 20/15/2, pro 60/40/5, business 150/100/10 (TTS/STS/clone). Edit `api/_lib/quota.ts` to retune.

2. **Tier-aware voice slots.** `MAX_VOICES_PER_USER` (fixed 2) replaced with `VOICE_SLOTS` map: free 0, creator 1, pro 3, business 5. Cap is intentionally conservative because ElevenLabs Starter has 10 total slots workspace-wide and ~5 are already held by the admin-curated Filipino library. One Business user filling 5 slots and one admin clone consumes the remaining capacity. Upgrading the ElevenLabs tier (Creator/Pro plan on the ElevenLabs side, not Grifon) raises the global ceiling. Slot meter in cloning tile UI now reflects the real plan cap.

3. **Voice cloning UX polish.** Consent paragraph bumped from 10px zinc-300 → 12px zinc-100 (legal text needs to be legible); `// CONSENT_REQUIRED` label switched to gold for legal-importance signal; sample-guidelines bullets bumped from 10px zinc-500 → 11px zinc-300.

4. **Audio player hardening.** Native `<audio>` playback-speed control was a UX trap — changing speed in the player only affected playback, not the downloaded file (downloaded file was always 1x). Added `noplaybackrate` to `controlsList` on both TTS and Voice Changer audio elements (alongside the existing `nodownload`). If real users want pacing control, the right primitive is the inline `[slow]` / `[fast]` ElevenLabs delivery tags already wired in `TTS_TAGS`.

5. **SAVE button per take in `// LOG` drawer.** Each session-history entry now has a download action using the same `downloadAudio()` branded-filename helper as the main DEPLOY AUDIO. Lets users save older takes without restoring them first.

### Open follow-ups (non-blocking, prioritized)

1. ~~**Per-user daily/monthly TTS quota**~~ — **CLOSED 2026-05-04 in commit `5855fb3`.** Shipped Option A (request-count caps per tier, not character-cost) — see Part 4 above. Open question for follow-up if telemetry shows users gaming the cap with max-length scripts: upgrade to character-cost daily budgets (would require a new SQL function `rate_limit_consume_cost` and ~half-day of work).
2. **Form state lost on Signal Modulator tab switch** — switching TTS↔VC unmounts the inactive tile, so typed scripts evaporate. Restore-from-history is the workaround. Fix would lift form state to parent or always-mount both tiles. Low priority; flag if real users complain.
3. **Vite HTML-proxy cache flake** — local builds (`npm run build`) intermittently fail on first invocation with `[vite:html-inline-proxy] Could not load index.html?html-proxy&inline-css&index=0.css`. Always succeeds on retry. Suspect Windows + Vite 5 + index.html inline `<style>` interaction. Vercel CI builds clean (different env, no leftover `.vite` cache). Worth investigating if it ever bites a deploy; benign for now.
4. **Vite dev: Windows case-insensitive routing serves `App.tsx` for `/app`.** Discovered 2026-05-04. On Windows, navigating directly to `localhost:PORT/app` makes Vite serve the transformed `App.tsx` JS module instead of `index.html` (case-insensitive filesystem matches `/app` to `App.tsx` before SPA fallback kicks in). Workaround: navigate to `/` first, let the in-app router take you to `/app`. Vercel prod is unaffected (proper SPA fallback). Latent dev-only bug; only affects Windows devs hitting `/app` directly.

## Status as of 2026-05-02 (evening update)

**All 7 launch gates are CLOSED.** Site is live at https://app.grifon.ai. Test-mode billing now fully proven end-to-end on prod (checkout → PayMongo → webhook → Supabase row → UI tier upgrade). Only outstanding item to take real money is the PayMongo live-key cutover (Gate 3-prod below).

Today's session shipped two fixes, both deployed:
- `5c6525a` — Upgrade buttons (top banner + profile dropdown) had no `onClick`; now route to `/pricing`
- `23fac77` — dropped dead `{CHECKOUT_SESSION_ID}` placeholder from PayMongo `success_url` (Stripe syntax PayMongo doesn't substitute)

Plus three Vercel config changes (no commit): added PayMongo test env vars, changed `APP_URL` to `https://app.grifon.ai`, and registered test webhook in PayMongo dashboard at `https://app.grifon.ai/api/webhook` for `checkout_session.payment.paid`. See [paymongo_webhook_setup.md](../../.claude/projects/c--Users-Administrator-Downloads-grifon-command----your-ai-marketing-team/memory/paymongo_webhook_setup.md) memory for the gotcha that cost ~30 min of debugging.

## Readiness Gates

### Gate 1: App works (no crashes) — CLOSED 2026-04-23
- [x] `SignalModulator` voiceService crash fixed
- [x] `GenerateVideo` submit handler implemented
- [x] Error boundaries around each module (`App.tsx:16` wraps every route)
- [x] Gemini API key no longer throws at import
- [x] Director AI rules-of-hooks crash fixed (state hoisted to top level — `App.tsx:87`)

### Gate 2: Real auth — CLOSED 2026-04-18
- [x] Plaintext `ACCESS_PASSWORD` removed from `App.tsx`
- [x] `ALLOWED_EMAILS` hardcode removed
- [x] Supabase email/password login wired
- [x] Session persistence (refresh doesn't log out)
- [x] Logout button in Dashboard profile dropdown

### Gate 3-dev: Billing wired (test mode) — CLOSED 2026-04-23
- [x] PayMongo hosted-checkout integration: `api/checkout.ts`
- [x] Webhook with signature verification: `api/webhook.ts`
- [x] Subscriptions table updated on payment events
- [x] Checkout flow matches `GrifonPricingPage.tsx` tiers
- [x] PayMongo helper lib: `api/_lib/paymongo.ts`

### Gate 3-prod: Live billing cutover — IN PROGRESS
Test-mode plumbing fully proven on prod 2026-05-02 (E2E test purchase activated subscription row in Supabase). Live cutover blocked only on PayMongo merchant verification.

Live cutover steps (repeat the test-mode setup with live values):
- [ ] PayMongo dashboard: complete merchant verification (Philippine business registration required)
- [ ] PayMongo dashboard: flip to Live Mode
- [ ] Pull live `PAYMONGO_SECRET_KEY` (`sk_live_...`) — only this one is read by code (`api/_lib/paymongo.ts:6`); `PAYMONGO_PUBLIC_KEY` is stored but unused
- [ ] Update `PAYMONGO_SECRET_KEY` in Vercel → Settings → Environment Variables (Production scope)
- [ ] Register live webhook URL `https://app.grifon.ai/api/webhook` in PayMongo Live Mode dashboard, listening for `checkout_session.payment.paid`
- [ ] Copy live signing secret (`whsk_live_...`) → update `PAYMONGO_WEBHOOK_SECRET` in Vercel
- [ ] Redeploy (Deployments → ⋯ → Redeploy, no cache)
- [ ] Test purchase with a real card on Creator tier (₱997); confirm row in Supabase, then refund yourself in PayMongo dashboard

### Gate 4: Production-safe code — CLOSED 2026-04-23
- [x] Zod input validation in all Gemini + ElevenLabs + checkout API routes (8 endpoints)
- [x] Rate limiting wired via `rateLimitCheck()` in 10 API routes (sliding-window via Supabase RPC)
- [x] Webhook bodyParser disabled for raw signature verification
- [x] Cron cleanup for stale Gemini videos: `api/cron/cleanup-gemini-videos.ts`

### Gate 5: Mobile responsiveness — CLOSED 2026-04-23
- [x] Dashboard upgrade banner padding fix for close-button overlap (`Dashboard.tsx:146`)
- [x] Director AI hook-branch crash fix (`App.tsx:87`)
- [x] Footer logo wired (`LandingPage.tsx:627`)
- [x] Legal page header logo wired (`LegalPageLayout.tsx:28`)
- [x] Wall-of-Proof carousel: 3-col grid → 9:16 swipeable cards w/ snap-proximity (`LandingPage.tsx:155-200`)
- [x] Phone-verified live on preview before promotion
- Open follow-ups (P1/P2/P3 from original 15-finding mobile audit deferred — non-blocking)

### Gate 6: Domain + hosting — CLOSED 2026-05-02
- [x] `grifon.ai` purchased (via Vercel registrar)
- [x] `app.grifon.ai` DNS + SSL (auto-provisioned by Vercel)
- [x] Production build deployed (Vercel project `grifon-command` linked to GitHub `yopiheart/grifon-command`, branch `main`)
- [x] Env vars set in host (Supabase, Gemini, ElevenLabs, APP_URL, APP_ENV=production, GRIFON_VOICE_CLONING_ENABLED=false)
- [x] Verified live: landing loads, auth works, session persists, Gemini AI generates, logout works
- Open follow-ups (non-blocking):
  - Vercel billing address incomplete — fix in Vercel → Settings → Billing → Update Address
  - ~~ICANN email verification for `grifon.ai`~~ — DONE 2026-05-04 (verified before deadline)
  - SignalModulator voice list — confirm whether empty list = no voices on ElevenLabs vs API failure

### Gate 7: Legal — CLOSED 2026-04 (effective date 2026-04-20)
- [x] Terms of Service (`components/TermsOfService.tsx`, 160 lines, Haste Enterprises / Republic of the Philippines)
- [x] Privacy Policy (`components/PrivacyPolicy.tsx`, 135 lines, covers Gemini data handling)
- [x] Refund Policy (`components/RefundPolicy.tsx`, 88 lines)
- [x] Support page (`components/Support.tsx`, 77 lines)
- All 4 share `LegalPageLayout` and have routes in `App.tsx`

## How to use

1. After every session that closes a gate, update this file's checkboxes IN THE SAME SESSION before clearing context.
2. The `git log` is more authoritative than this file — when in doubt, check what code actually shipped.
3. Treat this file as a *summary* of completed work, not a source of truth. Source of truth = the code.
