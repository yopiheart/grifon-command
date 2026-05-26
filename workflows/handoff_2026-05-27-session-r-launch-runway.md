# Session R handoff — Launch-runway-to-June

> **TL;DR.** Session R + extension shipped 9 commits to `origin/main` (Bugs 16-22, Bug 19b loosening, reset_password, lessons-md, Hook Seed Protocol). The wizard now works end-to-end at the JSON/prompt level. **What's NOT verified yet: actual Veo audio quality** (dead air gone, Tagalog pronunciation, em-dash hallucination gone, contrarian hook generating in vivo). **One $2-3 contrasting-brand RENDER ALL smoke validates 4 unfinished verifications at once.** Do that first. If green, move to launch operational readiness (Supabase egress, rate limits, billing). If red, fix the one regression and re-smoke.
>
> **Neil is tired and needs to launch by June.** Don't ask permission for things he already approved in earlier sessions (Bug fixes, Hook Seed Protocol, reset_password, lessons). Focus on what's IN FRONT OF YOU — the contrasting-brand smoke first, then operational.
>
> **Stop-doing list:** CMO Deliverables 2-5 (Spectacle, Pacing, CTA Anchor, UGC Patina) are POST-LAUNCH. Don't propose them as today's work. They're conversion-ceiling optimizations, not launch blockers.

---

## What landed in Session R (on `origin/main`)

| Commit | Bug / Feature | Status |
|---|---|---|
| `3bede73` | reset_password handler (Session P WIP) | shipped, non-TUNED |
| `faa50c0` | Bug 18 — AUDIO TAIL PADDING removed (dead-air) | shipped TUNED |
| `4602e09` | Bug 22 em-dash normalizer + Bug 17A wiring removal | shipped TUNED |
| `74b3a4f` | Bug 19 — classifier tightening (initial) | superseded by 19b |
| `060183a` | Bug 17B — `i-` verb-prefix banned at CTA | shipped TUNED |
| `cb115b7` | Bug 20 — avatar IDEAL post-purchase state | shipped TUNED |
| `19ce00d` | Bug 19b — dual-signal classifier loosening | shipped TUNED |
| `9e7cf49` | agent_lessons.md — classifier-vocabulary-drift lesson | shipped docs |
| `4b192c6` | Hook Seed Protocol — contrarianTruth seeds hook1[0] | shipped TUNED |

All pushed. Defreezer-safe.

---

## LAUNCH READINESS — verified vs not

### ✅ Verified (smoke-confirmed in this session, Curology brand)
- MarketMind generates correctly (avatar profile + contrarian truth + headlines + hooks + 3 concepts + competitors)
- Director AI prefills Step 1+2 from MarketMind, no `[object Object]` leakage
- Step 3 script angle picker renders, MarketMind context flows through
- AdScript generates Veo-safe CTA (no `i-click`, used `Tap below`) — **Bug 17B PASS**
- Step 4 avatar generates clear-skinned despite "Oil-Prone" descriptor — **Bug 20 PASS**
- Step 5 storyboard synthesizes 6 scenes + start/end hook frames
- Step 6 thumbnail generates
- Step 7 video-prompt classifier produces B-B-B-T-B-T routing (Scene 4 testimonial + Scene 6 CTA route TALKING; rest b-roll) — **Bug 19b PASS**
- Auth flow + reset_password deep-link handler

### ⚠️ Deterministic-from-code, NOT in-vivo verified
- **Bug 17 Part A** (Layer 1 phonetic normalizer reverted at `:2032`) — Veo should now pronounce `lang` naturally instead of "lahong"
- **Bug 18** (`AUDIO TAIL PADDING` bullet removed at `:2112`) — Veo prompt no longer contains the `[silent pause]` text that rendered as dead air
- **Bug 22** (em-dash → comma at `:2032`) — Veo TTS should pronounce CTA cleanly without "ensten" hallucination
- **Hook Seed Protocol** — empty-guard works deterministically; protocol block is absent when MarketMind missing; present when MarketMind has contrarianTruth. But: have NOT seen the LLM produce a real contrarian hook yet.

### ❌ Not addressed this session (launch-relevant)
- Supabase egress at 108% of Free quota (Session P carry-over)
- Veo/Kling rate-limit verification under real traffic
- 15 pre-existing test failures in `tests/unit/geminiService.schemas.test.ts`
- Pricing page brand-fidelity pass with alignment-audit rule (Session P carry-over)
- Avatar/display-name on dashboard header (Session P carry-over)
- Bundle code-split for marketing routes (Session P carry-over)
- Bug 21 (EDSA → ELSA proper-noun TTS — needs ElevenLabs audio swap, architectural)

---

## TOMORROW'S PRIORITY ORDER (do these in this sequence)

### Priority 1 — Contrasting-brand smoke (~30 min, ~$2-3) — **DO THIS FIRST**

Validates 4 unfinished verifications in one paid run:
1. Hook Seed Protocol generates a real contrarian hook for hook1[0]
2. Bug 17A — `lang`, `mukha`, `Bago` pronounce naturally on Veo
3. Bug 18 — no 1-2s dead air at end of talking scenes
4. Bug 22 — CTA scene plays cleanly without "ensten"-style em-dash hallucination

**Use a DIFFERENT brand than Curology** to prove the protocol generalizes:

Recommended test brand: **Brewlab Manila** (Bryan's coffee shop archetype) — Taglish food-and-bev, easy to source a handheld hero photo, MarketMind will produce a different `contrarianTruth` shape (e.g., "Hindi ka kape lover, addicted ka sa caffeine spike").

Alternative: any Lazada gadget with a hand-held label photo.

**Pre-flight (per agent_lessons.md 2026-05-26):**
1. Find handheld hero photo with readable brand label FIRST
2. Derive brand name from the label
3. Run MarketMind with brand-label-matched name
4. Send to Director AI → verify Step 1+2 prefill
5. Step 3: pick script angle (RESULT REVEAL or QUESTION are good MarketMind tests)
6. Step 4: avatar gen — should be clear-skinned
7. Step 5: storyboard
8. Step 6: thumbnail
9. Step 7: RENDER ALL (7 scenes, ~$2.10)
10. **Watch each video end-to-end** (per agent_lessons.md 2026-05-26 rule). Capture signed Supabase URLs.
11. For talking scenes (Veo): listen for dead air, mispronunciation, em-dash hallucination
12. For Hook Seed Protocol verification: at Step 3, inspect `hook1[0]` JSON — must contain the contrarianTruth's mechanism word (e.g., "addicted", "caffeine spike")

**If all PASS:** move to Priority 2.
**If anything FAILS:** halt, file as new bug, fix one thing, re-smoke. Don't proceed to launch with broken Veo audio — viewers will swipe.

---

### Priority 2 — Launch operational readiness (~2-4 hours)

Only after Priority 1 passes. These are the "real users will hit this" concerns.

**2a. Supabase egress (Session P carry-over).** Currently at 108% of Free quota. Either:
- Upgrade to Supabase Pro (~$25/mo) — fastest unblock
- OR identify the egress culprit (likely video downloads from Storage signed URLs) and add CDN / shorter signed-URL lifetimes / direct streaming
- Check Supabase dashboard for the actual usage chart before deciding

**2b. Veo + Kling rate-limit headroom.** Per `agent_lessons.md` 2026-05-13, Veo has an hourly per-key cap that produces 55-min cooldowns mid-render. For launch:
- Verify the RenderAllRunner queue's auto-resume actually works (it's been tested but only at single-user scale)
- Decide whether to gate RENDER ALL behind a quota check upfront so users don't burn credits + then hit cooldown mid-render
- Set up monitoring on the 429 paths (a Vercel log + Slack alert is enough)

**2c. Payment flow if pricing is live.** If `/pricing` is reachable from `/landing` and PayMongo checkout is wired, smoke a full $0.01 test transaction to verify:
- Pre-auth → magic-link sign-in → wizard access
- Post-checkout email confirmation
- Subscription state in `userPlan` / `useSubscription` hook
- Auto-renew copy matches backend reality (see lesson 2026-05-08 — don't promise auto-renew if backend doesn't support it)

**2d. Error monitoring.** Decide on Sentry / Vercel error reporting / nothing. Free Sentry tier is enough for beta. Without this, you won't know which real users are hitting which errors.

---

### Priority 3 — Polish that improves trial-to-paid conversion

Only after Priority 1 + 2 pass. These are nice-to-haves that move the conversion needle, not blockers.

**3a. Pricing page brand-fidelity pass** (Session P carry-over) — apply the 2026-05-26 alignment-audit rule. Inspect at 1280x900 + 375x667. Verify icon-text rhythm and brand-mark integrity.

**3b. Dashboard avatar + display name** (Session P carry-over) — show Bryan's photo + name in the dashboard header for personalization signal.

**3c. Step 3 traffic-temperature UI picker** (CMO deliverable from this session — drafted but not shipped):
- Add header above angle cards explaining cold/warm/relationship traffic types
- Add `// COLD TRAFFIC` / `// WARM TRAFFIC` / `// RELATIONSHIP TRAFFIC` tag chips on each angle card
- Non-TUNED, frontend-only, can ride along with the next UI sweep
- Full draft text is in `~/.claude/plans/resume-from-session-q-commit-cryptic-pearl.md` under "DELIVERABLE 2" if recovered, otherwise re-derive

---

## STOP-DOING LIST (don't propose these tomorrow)

- CMO Deliverable 2 (Spectacle Beat) — post-launch conversion optimization
- CMO Deliverable 3 (Pacing Floor per type) — post-launch refinement
- CMO Deliverable 4 (CTA Concrete Anchor) — post-launch refinement
- CMO Deliverable 5 (Avatar UGC Patina opt-in) — needs 5+ brands of beta CTR data first
- Bug 21 (EDSA → ELSA) — needs ElevenLabs audio-swap architecture, not a launch blocker
- `phoneticNormalizer.ts` file deletion — leave it, it's unused but harmless
- Adding `hasLipSync` schema field — only if Bug 19b proves insufficient in production
- Refactoring storyboard to emit `type` field directly — captured in lessons as future improvement, NOT a launch task
- Code-splitting bundle — performance polish, not blocker

If Neil asks for any of these tomorrow, the right answer is: "That's a post-launch task per the Session R handoff. Want to do it before or after launch confirms revenue?"

---

## Critical files for the next agent to read (in this order)

1. **This handoff** — `workflows/handoff_2026-05-27-session-r-launch-runway.md`
2. **`CLAUDE.md`** — project overview, working environment, Plan→Goal pipeline
3. **`agent_lessons.md`** — behavioral rules accumulated across sessions. The 2026-05-24 + 2026-05-26 Director AI pre-flight rules are MANDATORY before any wizard smoke.
4. **`services/CLAUDE.md`** + **`api/CLAUDE.md`** — TUNED file rules. If you're touching `geminiService.ts` or `api/_lib/prompts.ts`, you need per-line approval via AskUserQuestion before edits, then a `/goal` per the Plan→Goal pipeline.
5. **`~/.claude/projects/.../memory/MEMORY.md`** — auto-memory index. The `feedback_reuse_marketmind_for_same_brand` and `feedback_verify_design_alignment` memories apply.

If recovered after defreezer:
- The plan file `~/.claude/plans/resume-from-session-q-commit-cryptic-pearl.md` is ephemeral — its contents are summarized in this handoff.

---

## Working environment reminders

- Cafe PC, defreezer wipes `C:\Users\Administrator\` on reboot
- Only the GitHub repo persists across sessions
- Commit early + often
- MarketMind reuse rule: if testing the same brand twice in a session, click DIRECTOR AI on the cached banner instead of re-firing ANALYZE MARKET (paid call)
- Playwright runs in its own Chromium context — its localStorage + IndexedDB don't survive past the session; for any cross-session wizard state you'd need to extend `scripts/snapshot-wizard-session.ps1` to also handle IndexedDB (NOT a launch blocker, just a friction point)

---

## Open questions for tomorrow (resolve fast)

1. **Test brand for the Priority 1 smoke?** Brewlab Manila / Bryan's coffee, or a Lazada gadget? Pick one with a readable label on a handheld photo.
2. **Supabase Pro upgrade ($25/mo) or DIY egress optimization?** Pro is the fastest unblock — recommend it for launch, optimize later.
3. **Is `/pricing` + PayMongo checkout live for launch, or beta-only?** Determines whether Priority 2c (full payment smoke) is in scope.
4. **Error monitoring vendor?** Sentry free is enough. Default to it unless Neil has a preference.

---

## Suggested opening prompt for tomorrow's agent

```
Continuing from Session R (commit 4b192c6 on origin/main, 2026-05-27).
Read first, in this order:

1. workflows/handoff_2026-05-27-session-r-launch-runway.md
2. agent_lessons.md (Director AI pre-flight rules at 2026-05-24 + 2026-05-26)
3. services/CLAUDE.md + api/CLAUDE.md (TUNED rules)
4. CLAUDE.md (Plan→Goal pipeline)

Today's first move: Priority 1 contrasting-brand smoke (~$2-3, ~30 min)
to verify Hook Seed Protocol + Bug 17/18/22 in actual Veo audio. Use
Brewlab Manila or a Lazada gadget, not Curology. Follow the Director
AI pre-flight checklist (hero-FIRST with readable brand label →
derive brand from label → MarketMind → Director AI).

If smoke passes → move to Priority 2 (Supabase egress + rate-limit
verification + payment flow + error monitoring).

If smoke fails → halt, file the regression as a new bug, fix the one
thing, re-smoke before continuing.

Stop-doing list: CMO Deliverables 2-5, Bug 21, phoneticNormalizer.ts
deletion, schema refactors. All POST-LAUNCH.

Neil needs to launch by June. Don't ask permission for things already
shipped or already in the handoff's priority order. Focus on the
contrasting-brand smoke first.
```

---

## One personal note to the next agent

Neil's been at this for months. He's tired. He needs the wizard to work end-to-end on a fresh brand TOMORROW so he can sleep tonight knowing tomorrow's smoke either confirms launch readiness or surfaces exactly one bug to fix. That's the whole shape of tomorrow's work. Don't drift into prompt-tuning, refactors, or new features.

The 9 commits this session got the pipeline functional. Tomorrow's job is to confirm it ACTUALLY WORKS on a real brand, then handle the operational gaps that prevent real users from using it. That's it. That's the launch.

Good luck. Make it happen.
