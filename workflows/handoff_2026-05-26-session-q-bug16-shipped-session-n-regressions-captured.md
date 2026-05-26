# Session Q handoff — 2026-05-26 — Bug 16 dead-model swap shipped + Session N regression evidence captured

> **TL;DR.** Session Q opened as a verbatim re-run of the Session O verification brief on a fresh Curology smoke. Pre-flight surfaced **Bug 16** — Google retired `gemini-3.1-flash-lite-preview` on 2026-05-25, hard-breaking MarketMind in prod. Approved + applied the 4-place model-ID swap to stable `gemini-3.1-flash-lite`. Smoke continued through 7/7 wizard steps + 7/7 video renders. Neil's manual video-by-video review of Scenes 2/4/5/6/7 surfaced **6 new bugs (17–22)** including in-vivo failures of Session N's Bug 14 (truncation safety-tail → became visible dead air) and Layer 1 phonetic normalizer (respellings reach Veo but Veo TTS doesn't honor them). Session R+ TUNED bundle queued. **Shipped: Bug 16 model swap only.** Session N regressions deferred to Session R+ per protocol (TUNED prompt rewrites need fresh AskUserQuestion + `/goal` cycle).

---

## What landed on `origin/main`

| Commit | Summary |
|---|---|
| `tuned(session-q)` | Bug 16 dead-model swap (`gemini-3.1-flash-lite-preview` → `gemini-3.1-flash-lite`) in 4 places: `services/geminiService.ts:275-276` + `api/_lib/prompts.ts:62-63`. Plus this handoff + new `agent_lessons.md` "grep wiring before shipping" rule. |

One commit. Bug 16 is independent of Session N regressions — it's a Google-side retirement that broke prod, requires immediate ship.

---

## Bug 16 details — Google retired the preview model

**Source:** Google docs cited by Neil 2026-05-26:

| Model ID | Status | Retirement |
|---|---|---|
| `gemini-3.1-flash-lite` | Active (Stable) | None announced |
| `gemini-3.1-flash-lite-preview` | Shutting Down | 2026-05-25 |

Both retire-by date and stable replacement were available — single-character swap (drop `-preview`).

**Diagnostic moment.** First MarketMind ANALYZE click in the smoke returned:

```
PROXY_ERROR_502: gemini_error — {"error":{"code":404,"message":
  "This model models/gemini-3.1-flash-lite-preview is no longer available."}}
```

**Decision detour (worth flagging for future runs).** I initially proposed swapping to `gemini-3.5-flash` based on the `researchTextModel` constant at `services/geminiService.ts:277` (the only line in the model-ID block that was already on 3.5). Neil corrected to `gemini-3.1-flash-lite` (stable variant of the retired model) per Google's status doc — "we are still undergo testing" so keep the cheap tier. Initial 3.5-flash edits were reverted to 3.1-flash-lite stable.

**Files touched (TUNED — all 4 occurrences):**

- [services/geminiService.ts:275](services/geminiService.ts#L275) — `textModel`
- [services/geminiService.ts:276](services/geminiService.ts#L276) — `fastTextModel`
- [api/_lib/prompts.ts:62](api/_lib/prompts.ts#L62) — `MODEL_TEXT`
- [api/_lib/prompts.ts:63](api/_lib/prompts.ts#L63) — `MODEL_FAST`

`researchTextModel = 'gemini-3.5-flash'` at `:277` left untouched (was already on 3.5, working).

**In-vivo verification (during the smoke, not as a separate retest):** After applying the Bug 16 fix and restarting Vite, MarketMind ran successfully and generated the full Curology brief — Avatar "Oil-Slicked Corporate Bianca", Big Idea, 5 headlines, 5 hooks, 3 concepts, 3 competitors. First attempt 504'd at the 55s client abort (3.5-flash-during-detour is slower than 3.1-lite-preview was); second attempt via retry-with-backoff succeeded. **Note:** the smoke ran on the in-memory 3.5-flash module since Vite wasn't restarted again after the revert to 3.1-flash-lite stable. Per-Neil decision, the dedicated post-revert verification retest was skipped — Google's "Active (Stable)" claim is authoritative; if 3.1-flash-lite somehow 404s in prod, fast-follow commit.

---

## Bug 16b ruled out

`avatarModel` (`services/geminiService.ts:278`) and `sceneImageModel` (`:279`) still use `gemini-3.1-flash-image-preview` (image-gen preview, different model class than text). I expected this might also be retired, but smoke evidence proved otherwise:

- Avatar generation: clean
- 7 scene images: all generated cleanly (took ~5 min sequential, no 404s)
- Thumbnail generation: clean
- Video-prompt generation: clean (used `fastTextModel` — the model we just fixed)

**Conclusion:** Google retired only the text-lite-preview, not the image-preview. No further model-ID swaps needed in this session.

---

## In-vivo PASS list — Session N fixes that DID hold

| Bug | Where it was confirmed | Evidence |
|---|---|---|
| Bug 5 (safeStr / no `[object Object]`) | Director AI Step 1 + Step 2 prefill | All 6 Step-2 fields populated with rich Taglish content, no `[object Object]` strings anywhere in DOM |
| Bug 8 (crane-lift vocab purge) | After Step 7 video-prompts generated | DOM grep: 0 occurrences of "crane" or "crane lift" across all 7 prompts |
| Bug 9 (PACING RULE — no 3-consecutive-talking) | Storyboard reveal at Step 5 | Pattern B-T-B-T-B-B-T (per visual-prompt classification: Scene 1/3/5/6 = B-roll, Scene 2/4/7 = talking) — no 3-in-a-row |
| Bug 12 (cross-session-binding patch) | GenerateVideo module entry | Fresh wizard showed "// SCENE PIPELINE · 0/7 RENDERED" — no auto-bind to the 60+ MP4s in the user's accumulated library |
| Bug 15 (face-care application on face) | Storyboard prompt-level | Scene 6 visual prompt: "Applying the cream to **cheek**, front of bag/label facing camera in other hand, looking in a mirror reflection" — face-application explicit, not hand-only |
| Layer 1 transport (phonetic normalizer reaches Veo prompt) | Scene routing labels in render panel | "moo-khah ka bang", "lightweight lahng talaga", "suffocated lahng", "Ee-click below" — all phonetic forms appear in Veo prompt context |

---

## In-vivo FAIL list — Session N fixes that DID NOT deliver

### Bug 14 (truncation prevention) → became Bug 18 (dead-air silent-pause)

Session N added a "safety tail" instruction at [services/geminiService.ts:2112](services/geminiService.ts#L2112):

> **AUDIO TAIL PADDING (REQUIRED on all talking scenes):** When emitting the dialogue inside the output prose, append a safety tail to the user-script line: ", [silent pause], looking back toward the lens with a natural, comfortable smile." This protects against final-syllable truncation by giving the video model a silent action to clip if the duration shortens by 0.3-0.5s — better to truncate a silent smile than a spoken Taglish word like "suffocate" or "mukha".

The instruction is a PROMPT TO GEMINI telling it to append the silent-pause text to the Veo prompt. Gemini does. Veo renders the silent pause and the smile faithfully. At Session M's 4s default duration this was a ~0.5s buffer (negligible). At Session Q's 6s default (`VIDEO_MODEL_SPECS['Veo_3.1_Lite'].durations[1]=6`), the tail becomes 1-2s of visible dead air at the end of every talking scene.

**Neil's verbatim observations (Scenes 4, 5, 6):**
- "4-6s stamp dead air again - exceeded duration"
- "Before okay naman ung mga scenes na sinetup sa 4s. Ngayon bumalik na ulit sa 6s ung dead air nadagdag nanaman which is worst kasi extra api credits usage."

The Session N fix is worse than the original truncation bug because it (a) ADDS dead air at all durations, (b) the default duration moved from 4s → 6s magnifying the dead air to UX-conspicuous levels, (c) the literal "silent pause, looking back, comfortable smile" instructions are now embedded in every Veo render = extra API credits.

### Layer 1 (phonetic normalizer) → became Bug 17 (Veo TTS doesn't honor respellings)

The phonetic respellings reach Veo's prompt context (we confirmed they appear in the scene-routing labels). But Veo's TTS interprets them sub-optimally:

| Source token | Layer 1 respelling | Veo TTS output | Status |
|---|---|---|---|
| `lang` | `lahng` | "lahong" (Scene 4) / "lahang" (Scene 5) | Veo inserts a vowel into the `hng` cluster |
| `I-click` | `Ee-click` | "Eh eh click" (Scene 7) | Veo treats hyphen as syllable separator, breaks `Ee` into two syllables |
| `mukha` | `moo-khah` | (Scene 1 was B-roll, not voice-tested) | TBD |
| `Bago` | `Bah-goh` | not in this script | TBD |

**Neil's verbatim observations:**
- Scene 4: "3-4s stamp she said 'Lightweight lahong' it supposed to be lang/lahng phonetics. I guess the phonetics we add didnt work?"
- Scene 5: "1-2s stamp she said 'suffocated lahang' it supposed to be lang/lahng phonetics."
- Scene 7: "0-1s she said 'Eh eh click below ngayon' it supposed to be i-click/ee-click phonetics. She mentioned the 'ee' twice."

The transport mechanism works; the *respellings themselves* don't transform Veo TTS output as intended. The Session N implementation chose respellings (`lahng`, `Ee-click`, `Bah-goh`) that are *English-spelling-natural* but produce *English-phonics-confused* TTS output. The fix requires either Veo-tested respellings (e.g., `lahn`, `Iklik`) or abandoning prompt-level phonetics for ElevenLabs TTS pre-render + audio swap.

---

## New bugs catalogue (17–22) — Session R+ scope

| Bug | Title | Root cause | Proposed fix | Severity |
|---|---|---|---|---|
| 17 | Layer 1 respellings ineffective on Veo TTS | Respellings reach Veo prompt via Gemini echo at `geminiService.ts:2032`. Veo's TTS re-parses hyphenated/cluster-respelled tokens — "lahng" → "lahong"/"lahang", "Ee-click" → "Eh-eh click". Transport works; *respellings themselves* aren't Veo-compatible. | (a) Iterate on Veo-compatible alternates (test "lahn", "Iklik", etc.) — empirical, requires test bench. (b) Abandon prompt-level phonetics and route audio through ElevenLabs TTS pre-render + audio swap (bigger architectural change). | HIGH |
| 18 | Dead-air silent-pause tail | `geminiService.ts:2112` AUDIO TAIL PADDING instruction tells Gemini to append `, [silent pause], looking back toward the lens with a natural, comfortable smile.` to every talking scene. Veo renders it as 1-2s dead air at 6s default duration. | (a) Remove the safety-tail entirely (accepts original Session M truncation risk). (b) Compute duration adaptively via `suggestDurationForScript()` at `:459-479` instead of the hardcoded `VIDEO_MODEL_SPECS[…].durations[1]=6s` default — durations match dialogue length + 0.8s buffer. **(b) is the disciplined fix.** | HIGH |
| 19 | B-roll mis-classified as talking | `RenderAllRunner.ts:39-49` `autoRouteModelForType()` routes correctly per Gemini's `type` field. But `generateVideoPrompts` Gemini classifier may tag visual-only scenes as `"talking"` — Scenes 5+6 (per my storyboard-level classification: B-roll with VO, not face-on-camera-speaking) routed to Veo. | Strengthen the TYPE section of the system instruction at `:2078-2122` — explicit examples for "face visible but not speaking" (B-roll with VO) vs "face visible AND speaking" (talking). Possibly add a `hasLipSync` boolean to the schema. | MEDIUM |
| 20 | Avatar inherits brand-narrative aversive-state condition | MarketMind avatar profile name was "Oil-Slicked Corporate Bianca" — the avatar generator absorbed "Oil-Slicked" into its prompt and rendered an avatar with oily skin, which is the condition the product is supposed to FIX. Avatar should look like the IDEAL post-purchase customer, not the aversive pre-purchase state. | Investigate `generateAvatar` in `services/geminiService.ts`. Strip narrative-condition tokens from the avatar-prompt builder, OR add explicit guardrail: "Avatar represents the target customer in their IDEAL post-purchase state, NOT the aversive pre-purchase state. Skin must be clear/healthy for skincare products." | MEDIUM |
| 21 | Veo proper-noun hallucination ("EDSA" → "ELSA") | Veo TTS model limitation — Filipino proper nouns get re-parsed via English phonics. | Document as known Veo limitation. Future mitigation: maintain a Filipino-proper-noun protection list + post-render audio swap via ElevenLabs (overlaps with Bug 17 fix path b). | LOW (model limitation) |
| 22 | Em-dash hallucination ("— limited" → "ensten limited") | Em-dash punctuation in script line (e.g., "I-click below ngayon — limited slots for free delivery!") confuses Veo TTS — model invented a "ensten" word at the punctuation boundary. | Add a pre-Veo punctuation normalizer that replaces em-dash (—) and en-dash (–) with comma + space, OR period + space. Tiny isolated fix. | LOW-MEDIUM |

**Other Neil observations not yet bug-numbered:**
- Scene 2 visual artifact: 1s mark has blur+black sidebars zoom effect not in prompt. Likely a Veo motion-modeling artifact. Could relate to Bug 19 routing (if it should have been B-roll routed to Kling).
- Scene 6 American accent: most of the line is English ("Curology absorbs agad, leaving my face plump at dry") — Veo defaulted to American TTS. Possibly mitigated by Bug 17 fix or by switching to a Filipino-tuned voice.
- Scene 6 voice projection too strong: hands blocking mouth may have triggered Veo's "VO over B-roll" heuristic. Overlaps with Bug 19.

---

## Critical open questions for Neil before Session R

### Q1 (Bug 17): Phonetic strategy

Two architectures:
- **(a) Iterate respellings** — find Veo-compatible Filipino-phoneme spellings via test bench. Cheaper but uncertain — Veo TTS is a moving target and respellings may not generalize.
- **(b) ElevenLabs TTS pre-render + audio swap** — generate audio via ElevenLabs (already integrated for Voice module), strip Veo's TTS, mux ElevenLabs audio into the rendered MP4. More work but Filipino-tuned ElevenLabs voices exist and produce reliable Taglish.

**Recommendation:** start with (a) for "lang/lahng" specifically (test 3-4 alternates: `lahn`, `lung`, `lan`, `langg`) — 30 min of testing tells us if (a) is viable at all. If alternates also fail, jump to (b) without spending more cycles on respelling iteration.

### Q2 (Bug 18): Safety-tail strategy

- **(a) Revert** — remove `:2112` safety-tail instruction entirely. Accept original Session M truncation risk.
- **(b) Wire `suggestDurationForScript()` into the model picker default** — derive duration from word count + 0.8s buffer, so the tail is just enough buffer (not visible dead air).

**Recommendation:** (b). The adaptive duration is the disciplined fix and already exists at `:459-479`. The UI default at the model picker just needs to call it instead of hardcoded `durations[1]`.

### Q3 (Bug 19): Classification ground truth

For your B-T-B-T-B-B-T classification verification: is Scene 5 ("Touching cheek with fingertips, eyes looking thoughtful, clear complexion, bright home interior lighting") and Scene 6 ("Applying the cream to cheek, looking in a mirror reflection, fresh-faced expression") meant to be:
- **B-roll** (VO over visual, no lip-sync) — my classification, fix Bug 19 by tightening Gemini's classifier
- **Talking** (face on camera, lip-sync) — keep current routing, Bug 19 is a false alarm

If B-roll → Bug 19 in scope. If talking → strike Bug 19, keep Scenes 5+6 on Veo.

### Q4 (Bug 20): Avatar policy

Should the avatar represent the aversive pre-purchase state (current behavior: oily Bianca for an oily-skin product), or the ideal post-purchase state (clear-skinned Bianca to model the brand promise)? This is a marketing/CMO call, not just a code fix.

---

## Session R agenda (TUNED bundle ordered by cheapness × UX win)

1. **Bug 18 first** (cheap, biggest UX win — kill the dead air). Wire `suggestDurationForScript()` into the model-picker default. Or revert the safety-tail. Single function rewrite, no schema change.
2. **Bug 22 second** (cheap, cosmetic). Em-dash normalizer — single util function applied to script lines before they enter the video prompt.
3. **Bug 19 third** (medium). Strengthen the type-classification system instruction at `:2078-2122` to make Gemini distinguish lip-sync vs VO scenes more reliably. Maybe add `hasLipSync` schema field.
4. **Bug 17 fourth** (hard — possibly architectural). Phonetic respelling iteration OR ElevenLabs pre-render. Q1 answer determines path.
5. **Bug 20 last** (medium). Avatar prompt builder cleanup. Q4 answer determines policy.

Bug 21 → document only, no code fix (Veo model limitation).

After landing the TUNED bundle, **re-run the same Curology smoke with same hero photo**. Compare results to this session's video links. Use `feedback_reuse_marketmind_for_same_brand.md` rule — reuse cached MarketMind.

---

## Carry-forwards still pending from prior sessions

- **From Session P:** `?reset=1` deep-link handler (it's in our uncommitted WIP stash this session — App.tsx + services/supabaseClient.ts). Avatar/display-name on dashboard header. Pricing page brand-fidelity pass with the new alignment-audit rule. 15 pre-existing test failures in `tests/unit/geminiService.schemas.test.ts`. Supabase egress optimization (108% of Free quota). Bundle code-split for marketing routes.
- **From Session M/N:** Bug 7 in-vivo (POST `/api/gemini/text` audio inlineData round-trip during EDL synthesis) — couldn't reach EDL in this session because we halted before Signal Modulator / AI Editor.
- **From Session H:** Fix 2 (strip audio/SFX from `generateVideoPrompts` + "daylight" → "like" typo).
- **From Session L:** Bug 5 schema tightening (defensive safeStr is sufficient, can stay deferred).

---

## Memory snapshot (auto-memory, defreezer-wiped, captured here)

| Memory file | Key fact | Source |
|---|---|---|
| `feedback_verify_design_alignment.md` | Eyeball icons + text + spacing on desktop AND 375x667 mobile. (Carry-over from Session P) | Session P |
| `feedback_reuse_marketmind_for_same_brand.md` | For same-brand smoke runs, reuse the "// LAST MARKET RESEARCH" cached banner instead of re-firing ANALYZE MARKET (paid Gemini call). Use DIRECTOR AI button on banner to skip into wizard with cached report. | This session, Neil 2026-05-26 |

---

## What survived in the repo (durable)

- This handoff at `workflows/handoff_2026-05-26-session-q-bug16-shipped-session-n-regressions-captured.md`
- The Bug 16 model-ID swap in `services/geminiService.ts` + `api/_lib/prompts.ts` (TUNED files, single commit)
- New 2026-05-26 entry in `agent_lessons.md` titled "Verify wiring with grep before declaring a feature shipped" — full incident analysis on how `normalizeTaglish` was wired only to the planning prompt at `:2032`, not the audio path

`reset_password` WIP from Session P is being restored from `stash@{0}` immediately after the Bug 16 commit pushes — that work was preserved across the entire Session Q smoke via `git stash push -m "session-q-wip-reset-password"`.

---

## Rendered video URLs (for Session R regression comparison)

All 7 rendered scenes survived the session and are referenced by signed Supabase URLs (expire ~24h from generation):

- Scene 1 (KLING O1 Omni, B-roll macro forehead): see render panel for video[1] in `.playwright-mcp/page-2026-05-26T12-31-23-347Z.yml` extraction
- Scene 2 (VEO 3.1 Lite, talking living-room): `c4d48a7f-6e0c-4047-9a3d-237885cb933a.mp4` — Neil reviewed: ELSA hallucinate, blur/black sidebars at 1s, dead air 4-6s
- Scene 3 (KLING 3.0, B-roll cream-on-countertop): rendered, not reviewed
- Scene 4 (VEO 3.1 Lite, talking with bottle): `13f999c3-917b-46fa-9902-61ca24a2d4a4.mp4` — Neil reviewed: "Lightweight lahong", dead air
- Scene 5 (VEO 3.1 Lite, touching cheek thoughtful): `f7942457-b40f-4be7-958a-a45976e588d8.mp4` — Neil reviewed: "suffocated lahang", dead air
- Scene 6 (VEO 3.1 Lite, applying cream in mirror): `cc76fdc6-8ec5-4d46-a031-4c337ef5983b.mp4` — Neil reviewed: American accent, voice too strong, dead air
- Scene 7 (VEO 3.1 Lite, CTA pointing down): `453225f8-ba69-44fd-9783-f3b65375d21f.mp4` — Neil reviewed: "Eh eh click", "ensten limited" hallucination, dead air

After Session R TUNED bundle lands, re-render these 7 scenes with the same Curology context (per the reuse-cached-MarketMind rule) and diff Gem audit results vs this session.

---

## References

- [services/CLAUDE.md](../services/CLAUDE.md) — TUNED-file rules (still apply for Session R)
- [api/CLAUDE.md](../api/CLAUDE.md) — api/_lib is TUNED
- [agent_lessons.md](../agent_lessons.md) — behavioral rules accumulator (new 2026-05-26 entry on grep-wiring-before-shipping)
- [CLAUDE.md](../CLAUDE.md) — project root, Plan→Goal pipeline rules
- [services/phoneticNormalizer.ts](../services/phoneticNormalizer.ts) — Layer 1 implementation, will be redesigned in Session R per Bug 17
- [services/geminiService.ts:2078-2122](../services/geminiService.ts#L2078) — `generateVideoPrompts` system instruction (Bug 18 + Bug 19 fixes will land here)
- Prior handoffs: [Session N](handoff_2026-05-26-session-n-tuned-edits-shipped.md), [Session O](handoff_2026-05-26-session-o-agentic-era-shipped-login-redesign-pending.md), [Session P](handoff_2026-05-26-session-p-login-redesign-shipped.md)

---

## Session R opening prompt (paste verbatim into fresh Claude Code)

```
Continuing from session-q (2026-05-26). Read this handoff first:
workflows/handoff_2026-05-26-session-q-bug16-shipped-session-n-regressions-captured.md

Then read CLAUDE.md, services/CLAUDE.md, agent_lessons.md, and
~/.claude/projects/.../memory/MEMORY.md for the memory index.

Session Q shipped only Bug 16 (dead-model swap). Session N's Bug 14
+ Layer 1 fixes regressed in vivo per Neil's video review of
Scenes 2/4/5/6/7 on the Curology smoke. 6 new bugs catalogued.

Today's first task: answer the 4 critical open questions in the
session-q handoff (Q1-Q4 — phonetic strategy, safety-tail strategy,
classification ground truth, avatar policy). After Neil resolves
those, plan the Session R TUNED bundle in this order:

1. Bug 18 (cheap, biggest win — kill dead air via suggestDurationForScript wiring OR revert safety-tail)
2. Bug 22 (cheap, cosmetic — em-dash → comma normalizer pre-Veo)
3. Bug 19 (medium — Gemini classifier tightening at :2078-2122)
4. Bug 17 (hard — phonetic respelling iteration OR ElevenLabs audio swap, depends on Q1 answer)
5. Bug 20 (medium — avatar prompt builder cleanup, depends on Q4 answer)

Each bug fix needs a fresh AskUserQuestion + /goal cycle per
services/CLAUDE.md TUNED-file rules. Do NOT autonomously rewrite
prompts. Pop the reset_password stash if it didn't auto-restore.

Smoke re-run: reuse cached MarketMind per
feedback_reuse_marketmind_for_same_brand.md (DIRECTOR AI button on
"// LAST MARKET RESEARCH" banner, don't re-fire ANALYZE MARKET).
Same Curology hero at .playwright-mcp/grifon-hero-curology-moisturizer.png.

Critical context: Vercel Pro Trial active, Supabase egress at 108%
of Free quota, gemini-3.1-flash-image-preview still ALIVE for now
(if it gets retired mid-session-R, file Bug 16b). Cost-down model
is gemini-3.1-flash-lite stable (no -preview).
```
