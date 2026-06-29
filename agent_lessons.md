# Agent Lessons

A living log of behavioral guidance that emerges from actual mistakes made in this repo. Each entry is short, dated, and explains *what went wrong* and *what to do differently*.

This file is read at session start. Add to it when something goes sideways. Do not pre-write rules here for hypothetical mistakes — that's what `CLAUDE.md` and `.claude/skills/` are for. This file captures the lessons that *only* become apparent after they bite us.

## Format

```
### YYYY-MM-DD — One-line summary of the mistake
**Context:** What was being attempted
**What went wrong:** The specific failure
**Lesson:** What to do differently next time
```

## Entries

### 2026-05-04 — Vite dev plugin silently 404s prod-style dynamic API routes
**Context:** Voice-cloning DELETE endpoint at `api/elevenlabs/voices/[id].ts` worked on Vercel but always returned 404 in `npm run dev`.
**What went wrong:** The custom `vercelApiDevPlugin` in `vite.config.ts` only matched literal file paths — it didn't understand Vercel's `[param].ts` dynamic-segment convention. Any dynamic API route is invisible to local dev unless the resolver explicitly handles it. Production via Vercel's filesystem router worked fine, masking the problem until someone tested locally.
**Lesson:** Whenever a new `[param].ts` API route is added under `api/`, smoke-test it in `npm run dev`, not just on a Vercel preview. The dev plugin's resolver should stay feature-equivalent with Vercel's so dev/prod parity isn't a foot-gun. Patch landed 2026-05-04 to support single-level dynamic segments.

### 2026-05-04 — vite.config.ts env loader guard makes .env edits silently stale
**Context:** Iterating on the `ELEVEN_LABS_API_KEY` value in `.env` during voice-cloning debugging. Vite logged `.env changed, restarting server...` but the new key wasn't being used.
**What went wrong:** `vite.config.ts:81-84` uses `if (process.env[k] === undefined) process.env[k] = v` when promoting `.env` values into `process.env`. After the first config evaluation in a Node process, subsequent in-process restarts skip the assignment because `process.env[k]` is no longer undefined. Net effect: the *first* `.env` value sticks for the lifetime of the Node process.
**Lesson:** When the running dev server isn't picking up a `.env` change, don't trust Vite's "server restarted" message — TaskStop the npm process, kill any orphan node listening on the port, and `npm run dev` fresh. Patch landed 2026-05-04 dropping the undefined-guard at `vite.config.ts:97` so every config reload overwrites `process.env` with current `.env` values.

### 2026-05-04 — Shared ElevenLabs workspace: visibility filters must fail-closed (allowlist), not fail-open (denylist)
**Context:** Building the `// FILIPINO_LIBRARY` section of the voice picker. The original filter at `api/elevenlabs/voices.ts` was `category !== 'premade' && !myIdSet.has(v.voice_id)` — i.e., "show all non-stock voices the current user doesn't own."
**What went wrong:** That filter is fail-open on a shared ElevenLabs workspace (Starter plan = one account = one voice pool for all Grifon users). Three concrete leaks resulted: (1) admin's personal clones (`Zam Grifon voice`, `NEIL MAGLAYA NEW VOICE`) appeared in every user's picker; (2) voices the admin saved from ElevenLabs Voice Library for personal reference (`James` — American English; `Ellen` — German English) appeared under a `FILIPINO_LIBRARY` header that didn't match their actual language; (3) future user clones would leak to other users — when User A clones a voice it goes into `user_voices(user_id=A)`, but `!myIdSet.has(voice_id)` is true for User B since their `myIdSet` is built from User B's rows, so A's clone falls through into B's `libraryVoices`. The label was also a lie: `// FILIPINO_LIBRARY` was a UI promise the filter didn't enforce.
**Lesson:** Anywhere the app fans out a shared account-level resource (ElevenLabs voices, Gemini Files, Vercel Blob, Supabase Storage buckets without RLS) to multi-tenant user UI, visibility must default to fail-closed. Use an explicit allowlist (`is in FILIPINO_LIBRARY`), not a denylist (`is not mine`). New entries default to invisible until admin explicitly blesses them. Patch landed 2026-05-04: `api/_lib/filipinoLibrary.ts` is the single source of truth, edited + redeployed when admin curates a new voice. Same rule applies to future features that surface account-level resources — when in doubt, default to hidden.

### 2026-05-09 — Outside framework (NotebookLM brief) used to override grifon-cmo without Neil's permission
**Context:** Neil dropped a NotebookLM brief from Boris Cherny (Anthropic) arguing "process is dead as a moat, AI eats it in 12-24 months" and asked Claude to evaluate it against the codebase + roadmap. Claude analyzed, recommended a moat-rewrite, then invoked `grifon-cmo` with the Boris brief loaded as the lens — producing 7 copy edits across `LandingPage.tsx` + `GrifonPricingPage.tsx` that swapped the existing tuned-prompts moat narrative for a "Filipino voice library" moat.
**What went wrong:** Two layers of error. (1) The voice-library moat itself was wrong on the facts — Veo 3.1 ships native Filipino audio, and any user can clone their own voice in ElevenLabs Starter for $5/mo, making the "rare resource" claim hollow within 6 months. Neil surfaced both facts in pushback. (2) More importantly: invoking `grifon-cmo` *through an external framework's lens* (Boris's — an Anthropic agent-coding context) overrode Neil's deliberately-built CMO positioning without Neil's strategic endorsement of the lens itself. Boris was talking about coding agents at Anthropic, where the AI runs all the way down. Grifon is a Filipino SMB marketing SaaS where customers value the OUTPUT (the converting ad), not the prompt-engineering sophistication. Tuned prompts ARE a moat in this domain because customers don't want to tune their own prompts — they want the marketing outcome. All 7 edits reverted before commit; no permanent damage.
**Lesson:** Before applying outside material (notebook briefs, expert opinions, third-party frameworks) to Grifon's strategy or copy, ask Neil first whether the lens fits Grifon — *don't* assume it does and have `grifon-cmo` execute through it. The `grifon-cmo` skill output is **Neil's voice through Claude, not Claude's strategic opinion overlaid with Claude-discovered frameworks**. Default response to "apply this notebook/article/expert to Grifon" is **analysis-and-flag-conflicts**, not **rewrite-the-strategy**. Boris Cherny's "process is dead" thesis specifically: applies to Anthropic-style agent coding workflows. Does NOT necessarily apply to consumer/SMB AI SaaS where the customer values the OUTPUT, not the implementation. File the distinction; don't re-apply naively.

### 2026-05-04 — One localStorage key, two unrelated gates: don't dedupe by name
**Context:** While replacing the `localStorage.grifon_admin` gate at `components/SignalModulator/index.tsx` with a `useSubscription` plan-tier check, the prior session's handoff also recommended running `localStorage.removeItem('grifon_admin')` in the prod browser to "clean up the stale key." I relayed that advice to the user.
**What went wrong:** The `grifon_admin` key has **two consumers** with **different intents**. SignalModulator was using it as a feature gate for IVC (now plan-tier-gated). But `Dashboard.tsx:440,463` uses the same key as an **admin-only preview switch** for the entire MORE MODULES section (Signal Modulator, Influencer Forge, Generate Video, Image Ads, Organic Calendar, Edit Video, Cinematic Studio) — these are intentionally unfinished modules hidden from end users until ready. Removing the key on prod hid all 7 modules from the user's own dashboard and replaced them with a "Coming Soon" placeholder. Recovery: paste `localStorage.setItem('grifon_admin', 'true')` in DevTools and refresh.
**Lesson:** Before recommending the deletion of any flag, key, or env var, grep for **all** consumers — not just the one in front of you. `grep -rn 'grifon_admin'` would have surfaced the Dashboard usage in seconds. The cost of a 5-second search is much lower than the cost of regressing prod UI on someone's account. Same rule applies to refactoring shared keys: if a name is used in two places, *assume the intents differ* until you've read both consumers.

### 2026-05-13 — Veo 429 after N scenes in RENDER ALL is by-design, not a code bug
**Context:** Decision Gate run on Glossier face-mist (MrBeast style). 4 scenes rendered successfully; scenes 5–7 hit 429 with the UI banner "RATE LIMITED · 3 queued · 55m to resume."
**What went wrong:** Nothing went wrong in code. Veo 3.1 enforces an hourly per-key cap. The queue at [components/GenerateVideo/RenderAllRunner.ts:32](components/GenerateVideo/RenderAllRunner.ts#L32) (`RATE_LIMIT_WINDOW_SEC = 3600`) catches the 429 gracefully, surfaces the cooldown via the `QueueEvent` `rate-limited` message, and auto-resumes after the wait. The user-facing "55m to resume" badge IS the documented retry-after countdown. A 502 on single-scene generate fired the same session — that one is likely an upstream Gemini timeout, distinct from the 429 hourly cap.
**Lesson:** When 429 hits during RENDER ALL, do NOT treat it as a recoverable code bug — it's by design and the queue handles it. Tell the user to leave the tab open; the queue resumes automatically when the cooldown lifts. Code-side audit only fires if (a) the queue stops resuming (likely an `AbortController` or `signal` issue), or (b) 502 recurs systematically on single-scene generate (audit `api/gemini/video.ts` timeout config in that case). Don't ship a "retry" button — the queue already handles it; a manual retry just stacks more queued scenes.

### 2026-05-18 — Verify canonical docs before wiring a new "variant" of an existing API surface

**Context:** Session C planned to route the hook scene to Kling Omni O1. Mental model: "Omni is just another Kling model, swap the `model_name` constant on the existing `/api/kling/video` proxy and we're done." Wrote the registry entry with `KLING_O1 = 'kling-v1-6'` (a guess based on Kling's typical naming pattern), shipped the routing, then asked Neil to live-test.

**What went wrong:** Neil pointed me at https://kling.ai/document-api/apiReference/model/OmniVideo. Three discoveries — every one of which alone would have broken the wiring: (1) the actual Omni model name is `kling-video-o1` or `kling-v3-omni`, not `kling-v1-6` — that string doesn't exist anywhere in Kling's enums. (2) Omni lives at `POST /v1/videos/omni-video`, NOT the `/v1/videos/image2video` endpoint our existing proxy hardcodes — routing Omni model names through that proxy 4xx's every call. (3) Omni's body shape is fundamentally different: `image_list: [{image_url, type: 'first_frame'|'end_frame'}]` array of tagged objects, not the flat `image` + `image_tail` strings image2video uses. Recovery cost was a `git revert` (clean, no data lost) but the routing change has to be re-done from scratch as a new proxy with the proper body shape.

**Lesson:** When adding a new model/variant to an existing API surface, "fetch the canonical docs" is a load-bearing prerequisite step, not a nice-to-have. Treat the assumption "Variant X is just like Variant Y with a different name" as false until proven true by the docs. For bot-protected docs sites (Kling's docs returned HTTP 446 to WebFetch), use Playwright in a real browser to bypass — that takes 60 seconds and is much cheaper than building the wrong proxy. Concrete rule for this repo: any new entry in `VIDEO_MODEL_ROUTING` that targets a `provider: 'kling'` model name we haven't directly tested via smoke must include a doc-fetch verification step BEFORE writing the dispatcher branch. Same rule generalizes — any new Veo model variant, ElevenLabs voice mode, Gemini SDK surface, PayMongo product type: read the actual docs page before assuming surface-level similarity. Captured in [workflows/handoff_2026-05-18-session-c-reverted-omni-discovery.md](workflows/handoff_2026-05-18-session-c-reverted-omni-discovery.md) for the Session D follow-up.

### 2026-05-18 — HTTP 429 can mean TWO different things from one upstream; inspect the envelope, not just the status code

**Context:** Building `api/kling/video.ts` as the new Kling 3.0 proxy. The natural instinct was to copy `api/gemini/video.ts:84-94` verbatim, where any 429 is treated as a rate-limit, returns `{error: 'gemini_quota', detail}` with a `Retry-After` header, and the `RenderAllRunner` queue auto-retries after the 60min window.

**What went wrong (caught before shipping):** The Phase 1 direct-API smoke against `api.klingai.com/v1/videos/image2video` returned HTTP 429 with body `{ "code": 1102, "message": "Account balance not enough" }`. Kling docs confirm `code 1102` = balance-exhausted (account credits at zero), NOT a rate limit. If the proxy had copied the Gemini 429 → quota pattern, the UI would have shown a user with depleted Kling credits a "rate limited · auto-resumes in 60min" banner — false, frustrating, and self-correcting in a way that's *worse* than the truth ("Top up at klingai.com").

**Lesson:** When wrapping a new upstream API in a proxy, never assume HTTP status code maps 1:1 to retry semantics. Inspect the upstream's response envelope before deciding what to surface to the client. For Kling specifically: HTTP 429 + envelope `code: 1102` → return HTTP **402** `kling_balance_exhausted` (user-actionable, no auto-retry); HTTP 429 + any other envelope code → real rate limit, return 429 `kling_quota` with retry-after (queue handles). General rule: any new proxy added under `api/` should be reviewed for this question — "does this upstream overload HTTP 429 (or 503, or any retry-semantic status) to mean multiple different things?" — before the proxy ships. Same caution will apply to future ElevenLabs IVC quota errors, PayMongo failure codes, etc. The HTTP status is a hint; the envelope is the truth.

### 2026-05-19 — Deferring "the actual point of the feature" to a follow-up session is the planning antipattern

**Context:** Session D wired Kling Omni O1 as the new hook-scene engine — new proxy, new dispatcher branch, new routing entry, the whole stack. The plan called for sending `image_list: [{first_frame only}]` to Omni and noted: *"End-frame morph would need a second image_list entry with type: 'end_frame'; deferred to a follow-up session. Single first_frame is enough for the hook drama."* Plan agent reviewed and approved. User approved. Goal evaluated green. Live $0.25 render shipped a clean MP4 from Supabase Storage. Everything mechanical passed.

**What went wrong:** Playwright frame-by-frame inspection of the rendered MP4 (`.tmp/omni-frame-00s.png` vs `.tmp/omni-frame-25s.png`) revealed the "hook" was camera-motion only — a forward dolly on a single composite frame, no transformation, no morph. The whole point of routing the hook to Omni was the morph drama (Omni's eyeball-tested advantage over V3). Without `end_frame` in `image_list`, Omni had nothing to morph toward and degraded to camera motion — making the entire Session D routing change a *performance regression* against just leaving the hook on V3 (slower, more expensive, same visual outcome). Hotfix `2d943b6` shipped end_frame in image_list as a separate commit.

**Lesson:** When a plan defers some piece of the work as "follow-up," interrogate whether the deferred piece is the *load-bearing differentiator* of the feature being shipped. If yes, don't defer — finish it now or don't ship. For Session D specifically, the question "does routing to Omni do anything *different* from V3 if we only send one frame?" was never asked in plan-mode. If it had been, the answer (*no — V3 already accepts one frame too; the morph is the whole point*) would have caught the planning mistake before any code was written. Generalizes to: any time a plan says "X feature, with Y deferred," check whether Y is decorative or fundamental. Decorative deferrals (more variants, better UX polish, an opt-in) are fine; fundamental ones (the feature's reason-for-being) aren't deferrals, they're scope reductions that need to be re-titled to match what's actually shipping. Plan agents and Goal evaluators are particularly bad at catching this — both review the plan-as-described, not the plan-against-the-feature-as-conceived. Capture this concern as a grill-me checkpoint going forward: "If we ship exactly what's in this plan, what does the user GET that they didn't have before? Is the deferred work part of that answer?"

### 2026-05-19 — Prompt formulas tuned for one engine don't auto-port to a sibling engine

**Context:** `generateVideoPrompts` Option A (b-roll) in `services/geminiService.ts:1671-1679` was tuned over months to work well with Kling V3 image2video. The directives are:
1. `CAMERA PHYSICS (MANDATORY — open the prose with this, never static)` — first, bolded
2. `SCENE 1 (HOOK) DIRECTIVE: Describe a morphing/transition from Start Frame to End Frame`
3. `NEGATIVE PHRASE: Avoid... morphing, melting, deformation...` — last, weighed heavily

On V3 image2video, all three coexisted fine because V3's `image + image_tail` body params hardcode the start/end frames at the API level — Kling's V3 model *auto-morphs between them* regardless of the prompt text. The morph language in the prompt was decorative; the negative-morphing tail was guarding against unwanted artifacts (extra limbs, glitch frames, melted geometry), not the intentional frame transition.

**What went wrong:** When Session D routed the hook scene to Kling O1 Omni, the same prompt formula was used. Omni's morph behavior is *prompt-driven* — it interprets the prompt to decide HOW to transition between `image_list` frames, not just IF. So the three directives now actively fight each other on Omni: (1) camera-physics-mandatory-first biases toward camera motion as the dominant action, (2) the morph directive is buried in third position, (3) the negative phrase *explicitly suppresses* the morph the directive asked for. Net result on Omni: the model picks the most consistent signal (camera physics + negative morph suppression) and produces camera motion. The hook directive becomes near-cosmetic.

**Lesson:** Prompt formulas written against one model's API surface don't automatically transfer when that prompt is sent to a sibling model — even if the sibling model accepts identical-looking inputs. Before re-routing a prompt to a new engine, audit: (a) which parts of the prompt are decorative on the old engine but load-bearing on the new one; (b) which parts of the negative phrase are guarding against unwanted artifacts vs unintentionally suppressing the new engine's intended behavior; (c) whether the prompt's structural priorities (mandatory-first, etc.) still match the new engine's interpretation order. For Session D specifically, the formula needs three branches before Omni hook routing is actually useful: hook scenes drop camera-physics-mandatory-first, get a hook-scoped negative phrase that omits morphing/melting/deformation, and elevate the morph directive to the first/mandatory slot. That's Session E scope. Generalizes to: any time a new model gets wired into an existing prompt pipeline, re-grade the prompt against the new model's behavior model, not just against the API contract.

### 2026-05-19 — Audit upstream before designing new downstream logic

**Context:** Session E set out to redesign `generateVideoPrompts` Option A for the Kling Omni hook scene, planning a Nikolai-anchor-bridge classifier inside a new "Option A-Hook" block. The plan assumed Flash needed brand-new instructions to pick a transition type per scene.

**What went wrong (mostly caught in Phase 2 prereq, before any code shipped):** the storyboard generator at [api/_lib/prompts.ts:773-823](api/_lib/prompts.ts) already classifies — it picks one of 6 VIRAL VFX MENU effects per Scene 1 (Character Morph, Object Materialization, Teleport/Snap Cut, Explosion Reveal, Invisible Effect, Chaos Burst) and stores the choice in `scene.transitionEffect` (defined in [types.ts:50](types.ts)). The signal was being **dropped** by `generateVideoPrompts` at services/geminiService.ts:1617-1619 before reaching the Flash meta-prompt that builds video prompts. So Flash had to re-invent a transition every call, ignoring the storyboard's actual choice. The original Phase 2 plan would have shipped a *second* classifier on top of an existing one without realizing it. Gate 1 text-diff against 3 TransitionEffect values confirmed: just plumbing the existing signal through (Commit 2a — pure code, 5-line change) produced *automatic* per-effect prose diversity from Flash with zero new instructions. The Option A-Hook split (Commit 2b — TUNED) added discipline on top, but the load-bearing improvement was the plumbing.

**Lesson:** Before designing new downstream logic (classifier, picker, generator), trace whether an upstream stage already produces the signal you're about to invent. The cheapest audit move is **read the upstream's response schema/prompt and grep its output fields against downstream consumers** — if the field exists upstream but doesn't appear in any downstream usage, it's being dropped on the floor. Surfacing that signal is almost always a smaller, lower-risk change than building a parallel mechanism. Concrete rule for this repo: when touching the wizard pipeline (Step 1 → Step 7), grep every `Scene`/`AllData`/storyboard field name against the consuming code paths before designing new field flows. The 2026-05-09 crown-jewel migration moved some prompts server-side but did not retrofit all downstream consumers — assume some fields still aren't reaching where they should. Generalizes to: any time a "redesign" plan emerges, the first audit question is *"what does upstream already give us that downstream isn't using yet?"*

### 2026-05-08 — Subscription-model copy must match backend reality, not founder intent

**Context:** Building the on-domain `/checkout` page. Founder initially settled on no-auto-renew positioning, then pivoted mid-session to "I want monthly auto-charge like Claude/OpenAI." I almost reached for an `Edit` to flip the trust-badge copy to "Auto-renews monthly · Cancel anytime."
**What went wrong (caught before shipping):** The current backend creates a one-time PayMongo Payment Intent. There is no card-on-file storage, no billing cron, no recurring charge handler. Flipping copy to promise auto-renewal would have meant: customer pays, expects to be charged again in 30 days, isn't charged, either keeps free access or loses access without warning. Either outcome is a worse trust break than the original "no auto-renew" positioning. Caught it before writing the Edit, but only because I paused to think about technical scope before keystrokes.
**Lesson:** When the founder makes a strategic call about subscription/billing/recurring/trial behavior, the next question is **always** "does the backend support this?" — *before* drafting copy that asserts the new behavior. Subscription-model copy is a load-bearing claim, not just marketing language. If backend support is missing, surface it as a separate engineering workstream (see [workflows/auto_renew.md](workflows/auto_renew.md)) and ship neutral copy that doesn't promise either direction in the meantime. Same rule applies to: trial-period claims, refund-window claims, "cancel anytime" claims, "pause subscription" claims — every one of these is a backend feature gate masquerading as a copy choice.

### 2026-05-22 — A frame-sampling grid tuned for a slow transition silently misses a fast one

**Context:** Session F validated 5 hook transition effects on Kling Omni by extracting video
frames at t=0/2.5/4.9s — the grid Session E used for Character Morph. That grid worked for
Morph because the morph was slow enough that t=2.5 landed mid-transformation. Session F reused
it unchanged.

**What went wrong (caught mid-session, before grading):** at t=0/2.5/4.9 all four rendered
effects looked nearly identical — bean cluster, finished latte, finished latte. The grid made
the effects look indistinguishable. They are not: the Omni transition for these effects
completes in ~1.2–3s, so t=2.5 already shows the resolved end state and t=4.9 is just the
settled tail. The grid sampled start, end, and end-again — it never sampled the transition
itself. Grading off it would have produced four false "looks the same" verdicts. Re-extracting
with a dense 0–2.5s grid (0/0.4/0.8/1.2/1.7/2.5) surfaced the real per-effect differences.

**Lesson:** A frame-sampling grid is only valid relative to the speed of the thing it samples.
Before grading any animation/transition/render, first locate WHERE the motion happens, then
sample that window densely — never inherit a grid from a prior test whose subject moved at a
different speed. Concrete rule for this repo's video QA: one quick coarse pass to find the
transition window, then a dense pass inside it; the interesting frames of a 5s hook are almost
never evenly spaced. Generalizes to any inherited measurement methodology — sampling rate,
poll interval, timeout, token budget — re-validate it against the new subject before trusting
its output.

### 2026-05-24 — Don't tool-install rabbit-hole when the user's observation alone is sufficient

**Context:** Mid-Session J Glossier smoke test, Neil flagged "Scenes 5 + 8 have unwanted BLUR effects."
The rendered video prompt for Scene 5 visibly contained `Rack focus pull using an 85mm lens` — a
literal defocus instruction that Veo 3.1 deterministically interprets as blur. The Bug 3 fix
(strip "rack focus" from Option B Talking camera-move palette) is mechanically correct from the
prompt content alone; no video frame inspection needed to confirm. I knew this BEFORE attempting
to watch the videos.

**What went wrong:** Neil then asked "Did you watch the 3 videos?" and instead of answering "no
but the fix is deterministic from the prompt content," I went down a 30+ min rabbit hole trying
to install ffmpeg to frame-extract the MP4s — first via winget (not installed), then chocolatey
(not installed), then scoop (not installed), then a direct download of Gyan's portable ffmpeg
zip. The cafe internet was slow; the download got to 46MB of ~140MB and the user lost patience
("BRO WTF ARE YOU STILL THERE? BEEN 30 mins"). I also crashed the Vite dev server by triggering
its watcher on the .tmp/ffmpeg.zip download (EBUSY race). Time + tokens lost; the fix itself was
ready 30 min earlier.

**Lesson:** When the user reports a SYMPTOM and the ROOT CAUSE is deterministic from already-
visible code/data (prompt content, config value, log line), ship the fix first and only do
sensory validation (video frames, screenshots, audio) if the fix doesn't take effect. Answer the
user's "did you check X" honestly with "no, but I can tell from Y" rather than scrambling to do
the check after-the-fact. Concrete checklist before installing a tool mid-session: (1) is the
data I'm trying to inspect actually load-bearing for the decision I'm about to make, or am I
just doing it for validation theater? (2) if the install fails or takes >5 min, what's the
fallback? Picking up these checks would have shipped the Bug 3 fix and continued the smoke test
30 min earlier today. Also: never trigger writes inside the workspace's vite-watched path while
the dev server is running — use $env:TEMP for downloads/extraction.

### 2026-05-24 — Director AI smoke test pre-flight discipline (3 rules)

**Context:** Session K drove a wizard smoke twice — first with no hero image
(generic placeholders), second with a brand-mismatched stock photo. Both produced
storyboards that didn't represent real beta-user output. Neil corrected with
explicit rules. Earlier same session also skipped MarketMind ("Skip for now")
which deterministically suppressed the script-angle picker at Step 3 (gated on
localStorage.marketMindReport shape — see components/Step3AdScript.tsx:49-94),
producing a script that didn't carry the angle-selection signal real users get.

**Lesson — before driving the wizard end-to-end as a smoke test, you MUST:**

**Rule 1. Always run MarketMind (Market Research module) FIRST, before entering
Director AI.** Inputs: Brand name, product name, description, price. Then click
"Send to Director AI" from the MarketMind result. Skipping MarketMind means:
(a) the script-angle picker is deterministically suppressed at Step 3 (gated on
localStorage.marketMindReport — see components/Step3AdScript.tsx:49-94), losing
the Pattern Interrupt / Curiosity Gap angle selection that real users get;
(b) Director AI doesn't get the market context that powers its critique +
hook quality.

**Rule 2. After Send-to-Director-AI, VERIFY that Step 1 + Step 2 fields are
auto-prefilled from the MarketMind result.** Specifically check: brand name,
product, target audience, dream result, 3 AM worry, differentiator, features.
If any field is empty or contains "[object Object]" / similar stringified-object
leakage (see Session J Bug 5 in handoff_2026-05-24-session-j-...), STOP and
fix the prefill bug before proceeding — that's a real bug, not a quirk to type
around.

**Rule 3. Hero product image MUST be a handheld shot — a hand holding the
product.** Not a studio shot, not a flat-lay, not a packshot on a gray background.
The handheld framing gives the storyboard a deterministic size reference; without
it, Veo/Kling render the product at wildly inconsistent sizes across scenes
(some scenes show it palm-sized, others billboard-sized). The Step 2 UI literally
says "Selling products? Upload product-in-hand FIRST — anchors size + appearance
for every scene." Take the UI text seriously.

**Concrete pre-flight checklist for any future Director AI smoke:**
1. MarketMind run? Brand + product + description + price entered? Report
   surfaced + has headlines/hooks/ads arrays?
2. Send-to-Director clicked → Step 1 brand/offer prefilled correctly?
3. Step 2 — service/product, audience, dream, worry, differentiator, features
   all prefilled? No "[object Object]" leakage?
4. Hero image uploaded? **Handheld product-in-hand framing** (not packshot,
   not flat-lay)?
5. AI Analysis on the hero confirms it's the right product + brand?
6. Script-angle picker appears at Step 3? (Confirms MarketMind context flowed
   through.)
7. The "VISUAL ASSETS MISSING" yellow banner on Step 5 is a hard stop, not a
   warning to acknowledge and move past.

If any answer is no, PAUSE and ask the user — do not proceed.

For service businesses with no product photo: require hero/storefront photo
with the same gate — the Step 2 UI itself says "Service business? Upload hero
photo FIRST."

Rules given verbatim by Neil on 2026-05-24:
- "When you conduct a testing for director ai make sure to upload hero product
  so that storyboard images would be perfect"
- "Always conduct market research - using Brand name, product name, description
  and price. Then send to director ai"
- "Make sure to verify if all the needed details in step 1 & 2 should be
  prefilled by market research result."
- "Make sure to upload a hero product which is handheld or a hand holding the
  product to make sure that the product size that will be reference in the
  storyboard would be accurate and consistent in size."

### 2026-05-26 — Director AI pre-flight: hero-FIRST, derive brand FROM the label

**Context:** Session M's first attempt: agent picked a brand name out of the air
("Sariwa Skin Co. / Niyog Glow Serum"), ran MarketMind, then went looking for a
matching Unsplash photo — and ended up uploading an unbranded clear dropper
bottle. Storyboard scenes 4-7 referenced "the Niyog Glow Serum bottle" but
the visible bottle had no label, so Veo had nothing to anchor the product
identity to across scenes. Neil corrected the ordering before any video
rendered.

**Lesson — REFINES the 2026-05-24 pre-flight (does NOT replace it).** The
ordering inside the pre-flight is load-bearing. The correct sequence is:

1. **FIND the handheld hero photo FIRST** — must be handheld (Rule 3 from
   2026-05-24) AND must have a **readable brand label** on the product.
2. **DERIVE the brand name FROM the visible label.** Whatever the bottle/box
   actually says — that is the brand. Don't invent a name and try to retrofit
   a matching photo.
3. **Run MarketMind with that label-matched brand name.**
4. **Send to Director AI, verify Step 1+2 prefill** (Rule 2 from 2026-05-24,
   unchanged).

**Why ordering matters:** Gemini Vision reads the label off the upload during
Step 2's auto-analysis. If MarketMind-brand and label-brand match, the storyboard
generator gets a coherent product identity. If they don't (Sariwa/unbranded
case), Veo/Kling render the product as a generic bottle in scenes 4-7 — the
identity baked into the script (brand name in dialogue) never visually anchors.

**Concrete amendment to the pre-flight checklist (Director AI smoke):**
0. (NEW, before old item 1.) Hero photo selected? Handheld AND has a readable
   brand label visible?
1. (was old 1.) MarketMind run with the brand name **that matches the label
   on the hero photo**?

If you cannot find a CC0 photo with a readable label for the brand you want
to test, ABANDON the brand. Pick a different brand whose photo you have, or
use the literal brand on the label you found (Curology, The Ordinary, etc.).
The cheapest brand for an internal smoke is whatever brand's label appears
on the best handheld photo you can source.

Rule given verbatim by Neil on 2026-05-26:
- "Look first for a hero image with brand name, then thats the time you will
  decide what brand name you will use for market research so that market
  research result would take that brand name."

### 2026-05-26 — Watch every rendered video BEFORE Signal Modulator

**Context:** Session M rendered 7 scenes (~$2.10) and would have proceeded
directly to Signal Modulator (TTS) → AI Editor (EDL) had Neil not interrupted
mid-flow to add a watch-each-video gate. Visual review surfaced 7 distinct
quality issues spanning Veo and Kling outputs: text hallucinations on the
Kling Omni hook, duration miscompute on talking scenes (4 overshoots with
dead air, 1 undershoot truncating "suffocate"), kinematic inversion on the
b-roll (product slides instead of camera tracking), and Taglish TTS slop
(Westernized "Bah-go", "Ee-click" parsed as "Is click"). Gemini 3.5's parallel
audit corroborated everything and added a 4-layer architectural fix blueprint
(phonetic middleware, audio padding, segment isolation, image-to-video keyframe).

**Lesson — NEW pre-flight rule, append after the 2026-05-24 Rule 3.** After
the 7-scene render completes and BEFORE clicking SEND TO SIGNAL MODULATOR,
the user MUST watch every rendered video and verify each is production-ready.
The agent should NEVER propagate to Signal Modulator on the user's behalf
without explicit per-scene approval. Specifically:

- Capture each scene's Supabase signed video URL from the GenerateVideo
  library rail (the right-side stack of MP4 thumbnails, newest-at-top maps
  to last-rendered scene)
- Present URLs + durations to the user as a table
- Wait for explicit "all 7 look good — proceed" before clicking SEND TO
  SIGNAL MODULATOR

**Why this matters:** Veo + Kling are stochastic. A pipeline that auto-propagates
to downstream modules ships visual/TTS slop to the EDL stage where the
problems become much more expensive to debug (audio + video + transitions
all interleaved). Catching quality issues at the per-scene render stage is
the cheapest unit of feedback. The cost of `$2.10 of renders + 10 minutes
of human review` is much lower than `$2.10 of renders + ~$0.10 of TTS +
~$0.02 of EDL + 30+ minutes of debugging which-layer-is-broken`.

**Concrete amendment to the pre-flight checklist:**
8. (NEW.) After RENDER ALL completes (all scenes show DONE), did the user
   watch each rendered video end-to-end and explicitly approve each one?
9. (NEW.) Captured all 7 sourceVideoUrls + durations for the handoff doc
   (so future sessions can A/B against post-TUNED-fix renders)?

Rule given verbatim by Neil on 2026-05-26:
- "After generating all the videos, make sure to watch it 1 by 1 to verify
  how the videos generated so we can also see if the video effects are gone
  which I requested from my last session. So I guess copy the supabase url
  link of video address link of each video using playwright to verify it
  before sendng to signal modulator"

### 2026-05-26 — Cross-session library binding via sceneIdx-only matching (Bug 12)

**Context:** Session M's smoke landed in GenerateVideo with 7 new Curology
seedPrompts. The rehydration useEffect at
[components/GenerateVideo/index.tsx:295-327](components/GenerateVideo/index.tsx#L295-L327)
matched library entries by `l.sceneIdx === i` alone. The user's Supabase
account already held 50+ MP4s from prior brand wizards (Battlecreek,
PeakBoost, Glossier...) at every `sceneIdx` value 0-6. Result: all 7 fresh
Curology scenes auto-bound to stale MP4s from a different brand — the
PIPELINE label correctly read "7/7 RENDERED" before a single Veo call had
fired, the RENDER ALL button was hidden, and SEND TO SIGNAL MODULATOR was
exposed. Clicking SEND would have spliced Curology audio with Battlecreek
visuals.

**Fix:** Tightened the filter to require BOTH sceneIdx AND prompt-text
match (`l.sceneIdx === i && l.prompt === seed.prompt`). The prompt-text
fallback below already required exact match, so the change is internally
consistent. Patch is 1 line at
[components/GenerateVideo/index.tsx:302](components/GenerateVideo/index.tsx#L302).

**Lesson — generalizable beyond GenerateVideo.** Any state matcher that
fans out a shared, multi-tenant resource (Supabase user library, ElevenLabs
shared workspace, Vercel Blob, anywhere accounts span multiple brands or
projects) MUST require an identity field in the match criteria, not just a
denormalized fan-out key (scene index, batch index, position). The
denormalized key alone collides across tenants/brands/sessions and binds
new state to stale neighbours.

**Concrete rule for this repo:** Before adding any `library.filter(...)`
expression to a useEffect that hydrates transient React state, ask:
*"If this user has 50+ library entries spanning prior wizards, would this
filter falsely match an entry from a different wizard at the same index?"*
If yes, add an identity guard (prompt text, batchId, wizardSessionId, or
fingerprint of the seed itself). Captured in
[workflows/handoff_2026-05-26-session-m-bug-catalog-halt.md](workflows/handoff_2026-05-26-session-m-bug-catalog-halt.md)
as the headline Session M finding.

**Pattern generalization for future work:** Same caution will apply to (a)
ElevenLabs voice picker rehydration (the 2026-05-04 fail-closed rule is the
sibling lesson); (b) any cross-wizard caching in MarketMind / Director AI;
(c) any "resume latest draft" UI that auto-binds to the most recent record
without confirming it's the SAME draft the user was working on.

### 2026-05-26 — Multimodal video QA via Gemini Gem complements Claude's blind spot

**Context:** Claude Code's environment cannot ingest video natively — Playwright MCP
can navigate to a video URL and screenshot it, but cannot watch the audio or
analyze motion. Session M's halt + the 2026-05-26 Gemini 3.5 audit had been
produced manually by Neil pasting MP4s into Gemini 3.5 Flash. Session N
operationalized this as a reusable Gemini Gem: the "Grifon Director AI Video
Auditor" — Knowledge anchored on `Gemini 3.5 flash video audit.md`, output
schema with 4 sections (per-scene findings / severity verdict / failure pattern
classification / recommended action type).

**What went wrong (Pass 1, caught and fixed in-session):** First Instructions
draft asked the Gem to propose "where the architectural layer integrates" in
Section 4. The Gem confabulated specific filenames — referenced
`suggestDurationForScript` as the Layer 2 padding site (wrong — that's a
duration estimator, not a prompt builder) and hallucinated
`api/_lib/phoneticPreprocessor.ts` for Layer 1 (actual ship:
`services/phoneticNormalizer.ts`). The Gem can't read code; it pattern-matched
plausible-looking paths from the audit MD in Knowledge. The recommendations
ALSO didn't know Layer 1 and Layer 2 had just shipped in `e392e66` — Knowledge
is a snapshot, not current state.

**Lesson — Two related rules.**

Rule 1: **Gem is observation layer; Claude is integration layer.** Don't
expect either to do both. Gem produces *what failed* with timestamps,
quoted-text evidence, and 4-layer category labels. Claude maps *what failed*
to *where to fix* using the current code state. Bake this into the Gem
Instructions: explicit ban on filenames, function names, file paths,
integration points in Section 4. Add a "Knowledge currency caveat" so the
Gem doesn't re-propose already-shipped layers.

Rule 2: **For CRITICAL gate decisions, run the Gem 2-3 times and take the
union of findings.** Single-pass multimodal analysis on the same clip is
stochastic. Pass 1 may catch audio cadence; Pass 2 may catch grip permanence;
Pass 3 may catch label drift. Pass 1 on Curology Scene 4 surfaced Westernized
accent + grip; Pass 2 on the same clip surfaced brand-label drift but dropped
both audio + grip findings. Ensemble for recall when the verdict halts a
downstream module ($0.07 TTS + $0.02 EDL avoided by catching CRITICAL
upstream).

**Concrete workflow** (replaces and improves the 2026-05-26 manual
watch-each-video pre-flight rule):

1. Render scene via Director AI Generate Video module.
2. Copy the video prompt + signed Supabase MP4 URL.
3. Upload MP4 + paste prompt to the Gem; specify engine (Veo Lite / Kling
   Omni / Kling 3.0) + target duration.
4. Read Gem Section 1-4 output. For CRITICAL verdict, re-run 2 more times
   for ensemble recall; halt if ≥2/3 passes flag CRITICAL.
5. Paste findings to Claude. Claude proposes any required TUNED edits using
   current code state — not Gem's confabulated file paths.
6. Line-by-line sign-off via AskUserQuestion per [services/CLAUDE.md](services/CLAUDE.md).

**Calibration anchor:** `Gemini 3.5 flash video audit.md` (repo root) is
the canonical style example. Already uploaded to the Gem's Knowledge.
Treat its architectural recommendations as STYLE, not state — most layers
may have shipped since the audit was written. Refresh Knowledge after every
TUNED-shipping session if drift becomes noticeable.

**Brand-label rule** (Pass 2 success): the Gem must quote the exact rendered
text and flag any discrepancy from the prompt-named brand without auto-
correcting. Pass 2 caught "Currology" with a double-r on the same Curology
clip Pass 1 missed — a real text-hallucination finding.

Captured in [workflows/handoff_2026-05-26-session-n-tuned-edits-shipped.md](workflows/handoff_2026-05-26-session-n-tuned-edits-shipped.md)
under "NEW: Grifon Director AI Video Auditor Gem".

### 2026-05-26 — Hand-transcribed inline SVGs and icon-text rhythm must be eyeballed, not build-verified

**Context:** Session P shipped a "Continue with Google" button on the auth
screen with an inline 4-color Google G SVG. I hand-transcribed the path data
from memory rather than copying the canonical mark. Build was clean. I took
a 1280x900 screenshot and moved on to brand-check + commit prep.

**What went wrong:** Neil opened the same screenshot and immediately flagged
the G as "looks like a slop designer." Three distinct failures, none caught
by build or my own desktop-scale screenshot inspection:

1. **Corrupted path data.** The Yellow path closing segment was written as
   `l3.66-2.84z` (single corrupted segment) instead of the official
   `l2.85-2.22.81-.62z` (two-segment arc closure). Rendered a cropped/
   squashed G with a missing arc. Eye-glanceable at desktop screenshot
   scale; obvious to Neil the moment he looked carefully.
2. **Wrong icon-text proportions.** Used `w-4 h-4 mr-2` (16px icon, 8px gap)
   against bold uppercase "CONTINUE WITH GOOGLE" text. Cursor / Stripe /
   Claude / Higgsfield all use ~20px icon with ~12px gap for that text
   weight. The cramped spacing read as amateur.
3. **Multicolor mark on a saturated brand color.** Placed the official
   4-color Google G on the `#FFCC00` GoldButton surface. The Yellow path
   (#FFC107) was nearly invisible against the gold; Red (#FF3D00)
   flattened to coral. Reference apps all use neutral (white or dark)
   surfaces for federated OAuth buttons specifically because the
   multicolor brand mark needs contrast it loses on saturated colors.

**Lesson:** Three rules going forward.

- **Don't hand-transcribe brand-mark SVGs.** Copy the canonical paths from
  the brand's official reference page (Google G: 48x48 viewBox, the standard
  4-color SDK distribution). If you must type by hand, render in the dev
  server, zoom to 200%, and verify shape integrity before committing.
- **Icon-text proportional weight is a real rule.** Bold/uppercase text
  pairs with `w-5 h-5` (20px) and `gap-3` / `mr-3` (12px). Normal-weight
  text pairs with `w-4 h-4` (16px) and `gap-2` / `mr-2` (8px). Cramping
  reads as careless regardless of how correct the rest of the layout is.
- **Federated OAuth buttons get NEUTRAL surfaces, not brand colors.**
  Cursor / Claude / Stripe / Higgsfield all use white or dark backgrounds
  for "Continue with Google/Apple/GitHub" buttons. This is not a design
  preference — multicolor brand marks (Google's 4-color G, Apple's logo,
  GitHub's octocat) need neutral contrast to render with their official
  trust signal intact. Reserve the brand accent color for primary CTAs
  (Sign In, Sign Up, Subscribe). OAuth buttons go on `bg-zinc-950 border
  border-white/15` (ghost) or white-surface (Stripe pattern).

**Procedural fix:** Append an "Alignment & icon-text rhythm" checklist to
the `brand-check` skill (`.claude/skills/brand-check/SKILL.md`) so any UI
diff with buttons, icons, or `flex items-center` containers gets
adversarially eyeballed before being declared done. Captured in
[workflows/handoff_2026-05-26-session-p-...](workflows/) (forthcoming) and
in the ephemeral memory layer at
`~/.claude/projects/.../memory/feedback_verify_design_alignment.md`.

The deeper failure mode: I declared "Phase 3 ready for sign-off" after a
desktop-scale screenshot, without zooming to inspect individual elements.
The mark looked plausible at the reading distance of a full-page screenshot;
it didn't look plausible to anyone actually looking at it. Build-clean +
screenshot-glance ≠ visually correct. The fix is to inspect at element
zoom, not page zoom, for any pixel-sensitive component (icons, marks,
spacing, alignment).

### 2026-05-26 — Verify wiring with grep before declaring a cross-module feature shipped
**Context:** Session Q smoke surfaced that Session N's Layer 1 phonetic
normalizer (`services/phoneticNormalizer.ts` — respellings for Veo TTS:
`lang`→`lahng`, `I-click`→`Ee-click`, `mukha`→`moo-khah`) did not deliver
the promised Veo TTS pronunciations in vivo. Neil's video-by-video review:
Scene 4 said "Lightweight lahong" (vowel inserted into the `hng` cluster),
Scene 5 "suffocated lahang", Scene 7 "Eh eh click below" (hyphen treated
as syllable separator, doubled the leading vowel).
**What went wrong:** `normalizeTaglish()` was wired into `services/geminiService.ts`
at exactly ONE call site — line `:2032`, inside the `generateVideoPrompts`
*planning prompt* sent to Gemini. From there, the normalized scriptLine
gets echoed by Gemini into its returned video-prompt JSON, which IS what
goes to Veo/Kling. So Layer 1's transport reaches Veo — but the chosen
respellings (`lahng`, `Ee-click`) aren't Veo-TTS-compatible: Veo's TTS
re-parses hyphens as syllable breaks and inserts vowels into uncommon
consonant clusters. The wider problem: nobody verified end-to-end Veo
audio output before declaring Session N's Layer 1 "shipped" — `grep -c
normalizeTaglish` would have shown the function reaches one prompt
boundary, and a 5-minute Veo render test on a single Taglish-heavy line
would have surfaced the TTS interpretation failure 4 weeks earlier.
**Lesson:** Two compounding rules going forward.

- **Grep wiring before declaring a feature shipped.** Any new utility
  that crosses module boundaries (here: `phoneticNormalizer.ts` → AI
  prompt builder → video model's TTS engine) needs `grep -rn` across
  the whole repo for every call site, not just the originating module.
  If the function is referenced at exactly one location, ask: is that
  location the *output* boundary (where the value reaches the external
  system) or the *intermediate* boundary (where the value is still
  inside our pipeline)? Layer 1's `:2032` is intermediate — the actual
  output boundary is the Veo/Kling proxy call in `api/gemini/video.ts`
  or sibling. Sherlock the data flow end-to-end, not the function
  definition.
- **Test the side effect, not the data transformation.** Verifying
  that `normalizeTaglish('lang')` returns `'lahng'` is necessary but
  insufficient. The feature's actual contract is "the Veo TTS audio
  pronounces `lang` correctly" — and the only way to verify THAT is
  a real Veo render on a Taglish-heavy line, before declaring the
  feature done. For Session R Bug 17 fix iteration, this means
  a fast test harness: pick one short Taglish line, render via Veo,
  listen, iterate respellings, render again. Don't ship respellings
  without a real Veo audio sample as evidence.

**Pairs with the 2026-05-26 alignment-audit rule** (above) — both are
"verify what you think you shipped actually exists where you think it
exists, at the rendering layer the user will see, not the
intermediate-state layer the code touches."

### 2026-05-26 — Classifier rules must match the vocabulary the upstream generator actually produces

**Context:** Session R Bug 19 tightened the SCENE 2+ talking/b-roll
classifier in `generateVideoPrompts` at services/geminiService.ts:2079
to require explicit "lips parted forming words", "mid-syllable",
"delivering line to camera" language in the storyboard description
before tagging a scene as "talking". Verification smoke (Curology
re-run) revealed ALL 6 scenes classified as b-roll — including the
CTA scene 6 ("Tap below ngayon" + "looking directly into the camera
lens" + "warm friendly smile") and the testimonial scene 4 ("Iba
ang Curology dahil para lang sa akin 'to" + "smiling gently at the
camera" + applying cream).

**What went wrong:** Gemini's storyboard generator
(`buildStoryboardPrompt` at api/_lib/prompts.ts) never produces the
literal "speaking" / "lips parted" / "mid-syllable" language. It
describes EXPRESSIONS and GESTURES — "smiling at camera", "warm
friendly smile", "looking directly into the lens". The strict Bug 19
rule had no vocabulary overlap with the actual upstream output, so it
defaulted everything to b-roll. This broke Director AI's intended
B-T-B-T-B-B-T rhythm: CTAs and testimonials lost Veo lip-sync,
becoming silent b-roll with disembodied VO.

Bug 19b (commit `19ce00d`) restored the intent by adopting a
**dual-signal rule** that matches the actual storyboard vocabulary:
"talking" requires BOTH (a) lens-engagement cues ("looking at
camera", "smiling at camera", "to camera") AND (b) verbal-delivery
context — CTA ("click below", "tap below"), testimonial
("I tried...", "Ako si..."), or direct first-person claim. Defaults
to b-roll when either signal is missing OR when the description
shows action (applying product, mirror reflection, looking
off-camera).

**Lesson — two parts.**

Rule 1: **Before writing a downstream classifier rule, sample the
upstream generator's actual output and confirm the rule's anchor
phrases will trigger.** Strict "lips parted" language is the
literal-most-correct cue, but if Gemini's storyboard never produces
those words, the rule misfires every time. Cheapest pre-flight
check: generate 3 storyboards, grep them for the proposed anchor
phrases, confirm hit rate >0% before shipping the classifier. If
hit rate is ~0, either loosen the rule to match the actual
vocabulary OR have the upstream emit a typed signal directly
(see Rule 2 / future improvement).

Rule 2: **"Avatar visible in frame" ≠ "talking scene."** Per Neil's
design intent: avatars can appear in many scenes visually, but only
some of those are talking (lip-sync). The decision is
script-and-scene-contextual — CTAs and testimonials delivered to
the lens are talking; touching-cheek / applying-cream-in-mirror /
sitting-thinking are b-roll even when the avatar's face is on
screen. The PACING_RULE at api/_lib/prompts.ts:719 controls
RHYTHM (max 2 consecutive talking for engagement); the classifier
at services/geminiService.ts:2079 controls ENGINE ROUTING (Veo for
talking, Kling for b-roll). They are COMPLEMENTARY layers, not
duplicative — pacing limits the count, classifier picks the engine
per scene.

**Pairs with 2026-05-19 "Audit upstream before designing new
downstream logic"** — same root pattern: a downstream stage
re-inventing logic that's tightly coupled to upstream behavior.
Same fix discipline: read the upstream's schema + sample its actual
output before specifying downstream rules.

**Future improvement (not in scope for this session):** Have
`buildStoryboardPrompt` emit a `type: "avatar-talking" |
"product-broll" | "metaphor-broll" | "cinematic"` field per scene
directly. Then `generateVideoPrompts` reads the field instead of
inferring from description text — single source of truth, no
classifier-vocabulary-drift risk. Storyboard schema is TUNED so
this is a future session's plan, not a quick patch.

### 2026-05-29 — Retire the audit Gem; drive raw Gemini 3.5 Flash via Playwright instead
**Context:** The 2026-05-26 rule established a pre-configured "Grifon Director AI
Video Auditor" Gem as Claude's ears (Claude can't ingest video/audio). Neil
moved to remove that Gem — its phonetics-anchored Knowledge went stale after we
reverted phonetic respelling (the "lahong" disaster, Session Q/R), and the Gem
had already confabulated non-existent file paths because its Knowledge is a
frozen snapshot.
**Lesson:** A pre-configured Gem with embedded Knowledge ROTS — its single
documented failure was stale Knowledge driving confabulated paths + re-proposing
already-shipped layers. The fix is NOT a better Gem; it's to drive **raw Gemini
3.5 Flash through the Playwright browser** (Neil signs into his Gemini account in
the Chromium when we reach the audit step) with a **Claude-authored prompt pasted
fresh each render** — so current context is injected every time and there is no
Knowledge to drift. The combo: **Playwright = eyes, Gemini 3.5 Flash = ears
(emits text Claude reads), Opus = brain**. Gemini stays the observation layer
(what failed + timestamps + quoted on-screen text, BANNED from naming filenames/
functions/paths); Claude stays the integration layer (maps to fixes against live
code). Keep the 2026-05-26 ensemble discipline (2–3 passes, union for CRITICAL
gates) AND add a hard tiebreak: **a model auditing another model's audio can also
hallucinate — for any launch-blocking gate, if the passes disagree, Neil's ear is
ground truth, not Gemini's.** Bake "audit every render before it propagates" into
the testing flow. Canonical protocol + copy-paste audit prompt + structured
output schema live in [workflows/video_audit_protocol.md](workflows/video_audit_protocol.md)
(repo, not the defreezer-wiped ~/.claude memory). This SUPERSEDES the 2026-05-26
"Grifon Director AI Video Auditor Gem" workflow.

### 2026-05-29 — A fix that depends on the model obeying a NEW classification rule must be verified in-vivo; prefer a deterministic code fallback
**Context:** Backlog #1 (hook end-frame ≠ hero) was addressed by `fix/hook-endframe-ref`,
whose load-bearing half was a TUNED prompt rule telling `buildStoryboardPrompt` to classify
the Scene-1 hook end frame's `referenceImage` as `product`/`both` when it reveals the
product (instead of the old hardcoded `none`). The branch was pushed and gated on in-vivo
verification.
**What went wrong:** In vivo, the model tagged the hook `referenceImage: "none"` **3/3**
across re-maps even though every end frame explicitly revealed the real product ("Blast
Portable Blender, logo facing camera"). The model has a hard prior that Scene 1 = `none`
and the added rule didn't move it. Because `getReferenceData` only passes the hero photo
when `referenceImage` is `product`/`both`, the end frame got **no** hero reference and
img-gen invented a look-alike ("Blast" ≠ Ninja hero) + hallucinated a face from the morph
prompt language. The prompt-only fix was effectively inert.
**Lesson — two parts.** (1) When a fix's success depends on the model **following a new
classification/labeling instruction**, do NOT trust the instruction — sample the model's
actual output (here, re-run 2–3× and read the field) before merging. A rule the model
ignores is a no-op that looks shipped. (2) When the downstream effect is deterministic and
the model's compliance is unreliable, **anchor it in code, not in the prompt.** The real fix
was a guarded Step5 code fallback: force the hero `productUrl` + product mode onto a
hook-morph END frame when the end-frame prompt names the product (guard keeps purely
abstract hooks product-free), independent of the model's `referenceImage` tag. Pair it with
a TUNED tightening (STILL_FRAME_RULE forbids transition/reveal verbs in frame prompts; hook
end frame = RESOLVED still) so the reveal frame is a calm product shot — which also starved
the face hallucination. Shipped + validated in vivo, commit `b6b9791`.

### 2026-05-29 — Don't accept "your change broke X" without checking the change even touches X's code path
**Context:** During the same gate run, Neil reported two storyboard regressions he
attributed to "the changes": Scene 2 rendered blank, and Scene 7's avatar rendered as a
"black woman" (wrong ethnicity) — "not experiencing this last time, after the changes."
**What went wrong (nothing — the attribution was wrong):** `git diff` showed fix #1 touched
only the hook's START frame (`startFrameRefs`), so for any non-morph scene `isHookMorph` is
false and scenes 2–8 run a **byte-for-byte identical code path** to before. The actual
causes: Scene 2 = a transient **upstream 502** from `/api/gemini/image` (console-confirmed;
regenerated fine on retry — same class as agent_lessons 2026-05-13), and Scene 7 = a
**stochastic** classifier framing (that sample described a product-only "backpack being
opened" with no avatar, so no avatar reference anchored → model invented a stranger; on the
clean run the scene was framed *with* the avatar and rendered the correct Filipino male).
**Lesson:** When a user attributes a regression to a recent change, first verify the change
**touches the failing path at all** (`git diff` the branch; trace whether the symptom's code
ran differently). Then classify the symptom: **upstream** (inspect the console/network — a
502/timeout is the provider, not your code; retry), **stochastic** (regenerate — image/video
models vary run-to-run; a clean second sample disproves a code regression), or **real code
regression** (the changed path demonstrably produces the bad output). Reporting "the changes
didn't cause this, here's the actual cause" honestly — with evidence — is more useful than
defensively fixing a phantom. The recurring image-API 502s this session were load, not us;
saying so (and just regenerating) was the correct response.

### 2026-05-30 — `backdrop-filter` (and `transform`/`filter`) on an ancestor traps `position: fixed` to that ancestor's box
**Context:** Building a shared `SiteHeader` with a mobile hamburger that opens a full-screen
overlay (`fixed inset-0 z-[60] bg-zinc-950/95`). The overlay rendered, but instead of
covering the viewport it was clamped to a **382×56px** strip — the header's own size — so the
hero showed straight through and menu items overlapped it. Looked like a z-index/opacity bug
(chased `bg-zinc-950/95`, the fade animation, stacking contexts) — none were the cause.
**What went wrong:** The overlay was a child of the `<header>`, which carries
`backdrop-blur-xl` (`backdrop-filter`). Per CSS spec, an ancestor with a non-`none`
`transform`, `filter`, `backdrop-filter`, `perspective`, `will-change`, or `contain:paint`
becomes the **containing block for `position: fixed` descendants** — so `fixed inset-0`
resolved against the 56px header, not the viewport. `getBoundingClientRect()` (width 382,
height 56, top 46) is what exposed it; the computed `backgroundColor` was correctly
`rgba(9,9,11,0.95)` and `opacity:1`, which ruled out the "obvious" suspects.
**Lesson:** When a `position: fixed` element is mysteriously sized/positioned to a parent box
instead of the viewport, stop chasing z-index/opacity and **measure its rect, then walk
ancestors for `transform`/`filter`/`backdrop-filter`/`perspective`/`will-change`/`contain`.**
Any one of those silently re-parents fixed positioning. The robust fix is to render the
overlay through a **React portal to `document.body`** (`createPortal(...)`), escaping the
filtered ancestor entirely — cleaner than hoisting it out of the JSX tree by hand. Also note:
`overflow-x: hidden` on a tall root establishes a scroll container that breaks
`position: sticky` descendants; use `overflow-x: clip` instead (it clips without creating the
scroll container). Both gotchas hit in the same header build; both verified fixed in vivo via
Playwright at 390px. Shipped this session (landing + pricing shared header + urgency bar).

### 2026-06-08 — A leaked face in a product-only frame is the REFERENCE image, not the prompt (and not always the avatar)
**Context:** During The Ordinary smoke, the hook end-frame and a product b-roll rendered a **western woman**
composited over the serum bottle — in frames whose prompt said "serum bottle on marble, no human." Two days
of other products never did this. First instinct (and a first patch attempt) blamed the **avatar** leaking
into the reveal.
**What went wrong / the trap:** It was NOT the avatar. A talking scene proved the avatar rendered correctly
as a **Filipino** woman — but the leaked face was **western**. The real source was the **hero product photo**
(`h_ointment.jpg`): a handheld lifestyle shot with a prominent **western hand/arm**. In `'product'` reference
mode, the image model **completed a whole western person** from that partial hand — the visual reference +
IDENTITY_LOCK overrode the text rule "NO HUMAN FACES." It only surfaced now because this hero is person-
prominent; cleaner product heroes didn't trigger it. (It's also stochastic — scene 7, same setup, came out
clean.)
**Lesson:** When an image defies a clearly-worded prompt, suspect the **reference image + consistency-lock
mode FIRST**, not the prompt wording — an attached reference + IDENTITY_LOCK beats "no human" every time.
And before blaming the avatar, **look at a talking scene to confirm the avatar's actual render** (ethnicity/
identity) — the leaked face may come from the *product* reference, in which case dropping the avatar does
nothing. Fix shipped: a TUNED `'product'`-mode guard in `services/geminiService.ts` `generateSceneImage`
("reproduce ONLY the product; ignore/exclude any hands/arms/people in the reference; never invent a person"),
Neil-approved per-diff, commit `627ccb2`. Verified: the hook reveal + b-roll regenerated clean. Keep the
handheld hero (it's the size anchor) — fix the prompt rule, not the hero.

### 2026-06-08 — ffmpeg burn-in: filtergraph escaping + drawbox can't animate (build-passes ≠ renders-right)
**Context:** Building the CapCut-grade overlay/caption engine in `api/_lib/renderFfmpeg.ts`
(Inter-Black drawtext + a crimson L→R "wipe" highlight box behind the hook title). Two ffmpeg
foot-guns bit in sequence, both invisible to the build and the type-checker.
**What went wrong (two distinct traps):**
1. **Windows drive-colon in filtergraph paths.** `drawtext=fontfile=C\:/…` (even escaped) made
   the filter parser throw `Invalid argument`. The synthetic harness caught it on the first run.
   Fix: copy the font into the scene temp dir, write textfiles there, and run ffmpeg with
   `cwd=dir` referencing **bare filenames** — no drive/colon ever enters the graph. Also: protect
   commas inside expression option values by **single-quoting** the value (`y='min(1,max(0,…))'`),
   NOT backslash-escaping (`\,`) — inside single quotes commas are literal; a stray backslash
   inside quotes breaks the expression parser. Validate empirically with a real Taglish line that
   contains an apostrophe AND a comma AND an emoji.
2. **`drawbox` evaluates w/x/y/h ONCE — no animation.** A `t`-based width
   `w='min(W,speed*max(0,t-start))'` rendered a *static full box*, not a wipe (`t` is NaN at
   init → `min()` returns W). This build of ffmpeg has **no `eval=frame` option on drawbox**
   (`Error applying option 'eval' to filter 'drawbox': Option not found`) — so you cannot animate
   a box dimension via the time variable at all. Fix: animate via **`enable` instead of geometry**
   — emit N (24) integer-tiled static drawbox slices left→right, each gated by
   `enable='gte(t,startSec+i*step)'` (enable IS evaluated per-frame), so they cascade on to fill
   the bar L→R. Same trick generalizes to any "reveal/wipe/progress" effect drawbox can't tween.
   The static box shipped unnoticed through build + unit tests + a frame I read at the wrong
   timestamp (post-wipe) — only a mid-wipe-window frame (and Neil's eye on the moving video)
   exposed it.
**Lesson — three parts.** (a) For ffmpeg work, **build-clean and even a passing render are not
proof**; assert the *motion* by extracting frames INSIDE the animation window (here 0.55–0.95s),
not just one resolved frame (pairs with the 2026-05-22 frame-sampling-grid lesson). (b) Before
relying on a `t`/per-frame expression in a filter, confirm that filter actually re-evaluates it
(many ffmpeg filters eval-once unless they expose `eval=frame`; drawtext does, drawbox does not in
this build) — `-filters`/`-h filter=drawbox` and a 3-frame smoke settle it in 30s. (c) Keep the
synthetic harness (`tests/integration/burnin-render.test.ts`, gated) seeded with the nastiest real
input (Taglish apostrophe+comma+emoji) so escaping regressions fail fast and free. Shipped:
slice-wipe + bare-filename/cwd + single-quote escaping, branch `feat/burn-in-overlays-sfx-music`.

### 2026-06-08 — Audio for ads: judge full-ad not excerpts; SFX timing must be engine-deterministic; less is more
**Context:** After the burn-in merge, polishing the final render's audio on Neil's real 8-scene ad
(music bed + SFX). Three separate traps, each only caught by Neil's ear on the FULL render.
**What went wrong / lessons:**
1. **Music level can't be judged on a short excerpt.** I A/B'd 8-second clips and Neil picked
   "balanced" (`MUSIC_VOLUME 0.34` + soft duck) — which then *fought the VO* across the full ad.
   Fix: bed `0.18` + harder/faster 4:1 duck AND a **`loudnorm=I=-14:TP=-1.5:LRA=11` master** so every
   ad ships VO-clear at the social standard regardless of the client's VO level. **Always confirm an
   audio mix on the whole timeline, not a snippet** — and pin final loudness deterministically.
2. **A text LLM can't time in-scene SFX** — the EDL writes `sfxCues[].anchorSec` but never sees the
   rendered frame, so "ding on the product reveal" / "whoosh on the transition" drift early/late
   (Neil saw exactly this). Fix: **place SFX from events the ENGINE knows exactly** — transition
   sounds snap to the cut (scene boundary), the hook accent to the flip (`HOOK_DELAY`), and emphasis
   sounds to each overlay's own `startSec` (`TextLayer.emphasisSfx`). Drop the EDL's guessed
   in-scene anchors. Generalizes: if a deterministic signal exists for "when", don't let the LLM guess it.
3. **Stacked/over-dense SFX read as cheap/AI-slop.** A whoosh on every cut + a pop stacked on the
   same beat sounded amateur. Fix: a restraint pass (`pickSceneSfx`) — no two within 0.4s, transition
   whooshes capped per ad, emphasis wins collisions. **For ads, 3–5 SFX / 30s max; silence is
   premium, mistimed noise is cheap.** Shipped `3d90474`/`732a4bf`/`259570a` on main. Verify audio
   work by re-stitching the real ad + uploading (`.tmp/upload.mjs`) for Neil to *hear* — frames/specs
   don't prove a mix.

### 2026-06-08 — ffmpeg drawtext `fontsize` DOES animate per-frame (verified) — so scale-pop is real
**Context:** Punching up the hook reveal (Neil: the old linear slide+fade read as a plain fade).
Building a "flip/scale-pop" variant needs the glyph size to animate, but the drawbox trap above
made me distrust per-frame eval. Ran the 30s capability smoke before committing flip: a 1s clip
with `drawtext=...:fontsize='40+360*t'`, frames at t=0.1 vs t=0.9.
**Result:** Glyphs scaled from ~76px → ~364px — **`fontsize` IS re-evaluated per frame** in this
ffmpeg-static build (exit 0, no `Option not found`). Unlike `drawbox` geometry, `fontsize` takes a
`t`-based expression directly (single-quote it so inner commas in `max(10,...)` stay literal).
**Lesson:** drawtext animates **y, alpha, AND fontsize** per-frame — only `drawbox` w/x/y/h is
eval-once here. So scale/flip effects belong on the text via `fontsize`, not on a box. Always run
the one-clip smoke first (it's the same 30s check that would've caught the drawbox trap) rather
than assuming a filter does or doesn't re-eval. Hook reveal now ships three styles behind
`HOOK_REVEAL` (`bounce` easeOutBack overshoot / `slam` easeOutQuart hard slide / `flip` uniform
scale-grow), alpha snapping in 0.15s so motion carries the reveal. `pow()` bases kept ≥0 via
`(1-p)` so eval never hits `pow(negative,...)`. Verify by reading frames **inside 0.42–0.60s**
(the punch window) — wider samples land post-settle and look identical across styles.

### 2026-06-10 — Background subagents auto-deny every permission prompt; split tools-vs-reading
**Context:** Viral Editor 2.0 Phase A needed ffmpeg frame extraction + Playwright capture across 6
videos. Launched 5 background agents to do extraction+analysis end-to-end; every one died — Bash
ffmpeg, PowerShell, Playwright MCP, even WebFetch were all denied (~30k tokens each burned just
discovering it). Permission prompts can't surface from `run_in_background` agents, so anything off
the pre-approved allowlist is auto-denied.
**Lesson:** Division of labor on this repo: the FOREGROUND main thread runs every privileged
command (one approval covers the loop — ffmpeg extraction, curl downloads, Playwright), writes
artifacts to `.tmp/`; BACKGROUND agents get read-only briefs over those artifacts (Read/Glob only —
ideal for token-heavy frame reading they can do in their own context). Same pattern for FB Ad
Library: main thread navigates + grabs `video.currentSrc` via Playwright evaluate, curls the CDN
mp4, agents read the extracted frames. Also: the defreezer wipes git identity — re-set
`git config user.email/user.name` (repo-local) before the first commit of a session.
**Bonus ffmpeg trap (found via RUN_BURNIN, not unit tests):** `scale=h=-2:eval=frame` rounding
nudges SAR off 1:1 (e.g. 2331:2332 at the end of a zoom-out ramp) and concat then rejects the
mixed-SAR inputs with "Failed to configure output pad". Any dynamic scale in a per-scene chain
must end `,setsar=1`. Unit-test strings can't catch this class — only the real-render harness can.

### 2026-06-12 — Playwright tool results in main context silently dominated plan usage; delegate browser driving to a foreground subagent
**Context:** Neil's Max 5x usage dashboard (7-day view) showed 50% of all plan usage came from
the playwright MCP server and 80% of usage happened at >150k context. The server's tool
*schemas* were never the cost (they're deferred via ToolSearch) — the cost is the tool
**results**: every `browser_snapshot`/screenshot is 10–50k tokens and stays in the main
conversation for the rest of the session, re-billed on every subsequent turn once past the
prompt-cache window.
**What went wrong:** Months of smoke tests and brand checks drove playwright directly in the
main thread. Each individual call looked cheap; the compounding re-read of accumulated
snapshots across long (>150k-context) sessions was invisible until the usage dashboard
surfaced it as half the bill.
**Lesson:** Any MCP server whose tool results are large (page snapshots, video frames, full
API dumps) must be driven from inside a subagent — the results die with the subagent's context
and only findings return. For this repo: browser work goes through the `smoke-tester` agent
(its frontmatter now grants `mcp__playwright`), spawned in the **foreground**. This REFINES,
not contradicts, the 2026-06-10 division of labor: that lesson's constraint was that
*background* agents auto-deny permission prompts — a foreground subagent surfaces prompts
fine, so privileged browser driving can live there; background agents stay read-only over
`.tmp/` artifacts. Companion changes shipped same day: the statusline now goes red with a
`/clear?` hint at 65% context, and `"model": "claude-fable-5"` is pinned in
`.claude/settings.json`. Note the pin was originally `opusplan` (cheaper execution) but Neil
overrode it mid-session: *"Make sure that the quality wouldn't sacrifice. It's better to
spend more just to get the quality."* — so the savings strategy is hygiene-only (delegation
+ `/clear`), never model downgrades. Those two levers carry no quality cost; they're a
quality GAIN, since reasoning degrades past ~100k context anyway.

### 2026-06-13 — Per-word phonetic respelling made TTS WORSE; the accent is locked by the script's OPENING words, not per-word spelling
**Context:** The Taglish phonetic middleware (`phoneticNormalizer.ts`, 6 mappings like
`mukha → moo-khah`) was built 2026-05-26 to stop ElevenLabs/Veo reading Taglish tokens with
English phonetics. Neil A/B-listened on the 2026-06-13 The-Ordinary final render.
**What went wrong:** Two compounding findings. (1) The respellings overcorrected: `moo-khah`
synthesized as an unnaturally stretched syllable — plain `mukha` sounded BETTER on the same
voice. Per-word respelling fixes one token at the cost of cadence. (2) The real accent driver
was upstream all along: Neil empirically found `eleven_v3` LOCKS the language/accent for the
ENTIRE read from the script's opening tokens — 3+ consecutive English words at the start
("Stop drying your face…") force an American accent on every Tagalog word after; ≤2 English
words before the first Tagalog word ("Stop na sa drying…") locks Filipino. The middleware
never touched the opening, so it treated symptoms while the trigger stayed.
**Lesson:** Fix language detection at the SOURCE (script structure) — the OPENING ACCENT
TRIGGER rule now lives in the adscript prompt's TAGLISH ACCENT LOCK (api/_lib/prompts.ts,
approved by Neil). The normalizer was removed entirely (was: services/phoneticNormalizer.ts).
Do NOT reintroduce respellings wholesale; if a specific word verifiably mispronounces
(2026-06-10 "swabe"→"swave" class), A/B-listen BOTH forms first — respelling is a last resort
for individually verified words, never a blanket map. Watch whether "swabe" regresses now that
its mapping is gone; if it does, that's the one candidate for a single-word re-add (A/B'd).

### 2026-06-13 — An uncapped "default" SFX in the EDL prompt ticked on every scene; restraint engines need a per-sound budget, not just per-class
**Context:** Neil heard a water-drop tick on EVERY scene of the final render. Traced: the EDL
prompt suggests `"drop"` as the default sfxCue, so Gemini placed one per scene; the renderer's
restraint pass (`pickSceneSfx`) capped transition whooshes (3/ad) and stacking (0.4s min-gap)
but emphasis sounds were uncapped BY DESIGN ("they're intentional") — 7 scenes × same default
= the most audible AI-slop tell in the ad. Bonus: `drop.mp3` is nominally a "bass drop" but at
0.6 volume under VO it reads as a water drip.
**What went wrong:** The restraint engine modeled the failure mode "too many sounds at once"
(stacking) and "too many transition sounds" (whoosh cap) but not "the SAME sound too many
times" — which is what a prompt-suggested default produces at scale.
**Lesson:** Whenever a tuned prompt names a DEFAULT value for a per-scene field, assume the
model will emit it on most scenes and budget for repetition downstream in deterministic code
(renderer caps), not in the prompt. Shipped: `MAX_PER_SOUND = 2` per emphasis sound per ad in
`pickSceneSfx`. The prompt's "drop" default is untouched (tuned); the cap makes it harmless.

### 2026-06-13 — Fable 5 / Mythos 5 suspended by US export-control directive; re-pinned default to Opus 4.8
**Context:** Anthropic was ordered by a US export-control directive to suspend ALL access to
Claude Fable 5 and Mythos 5 for every customer (https://www.anthropic.com/news/fable-mythos-access);
other Claude models are unaffected. Our `.claude/settings.json` pinned `"model": "claude-fable-5"`
(set 2026-06-12, see the 2026-06-12 entry above), so every defreezer-fresh cafe-PC session was
booting on a now-dead model. Neil hit it, ran `/model default` (→ Opus 4.8) to keep working, and
asked to strip the committed Fable 5 references.
**What went wrong:** Nothing in our code — external. But the first instinct was to wave off the
"Fable suspended" claim as implausible; the Anthropic announcement confirmed it. Lesson on the
meta level: verify provider/model-availability claims against the source before dismissing them.
**Lesson:** Re-pinned default to `claude-opus-4-8` — the best *available* quality model, which
honors Neil's "quality first, never downgrade to save tokens" rule (Fable is simply gone, not a
cost cut). Updated `.claude/settings.json` + the CLAUDE.md usage-budget paragraph. **Revert the
pin to `claude-fable-5` when access is restored** (Anthropic says they're working on it). Do not
re-add the "Fable burns ≈2x Opus" budgeting math until then.

### 2026-06-19 — Don't bump the video render default (Lite/720p → Fast/1080p) without a full render smoke
**Context:** Slice 4 of the pricing restructure gated advanced video controls to Business. The approved `/goal` text said lower tiers get a "locked default (Veo Fast 1080p, auto)". The temptation was to force `initialConfig` from the current `Veo_3.1_Lite` / `720p` (Phase 4h.1 beta cost-control default) to `Veo_3.1_Fast` / `1080p` to match the unit-economics COGS model.
**What went wrong:** Nothing — *because it was caught before shipping.* Forcing `1080p` trips a render-behavior interaction: `autoRouteModelForType` routes talking scenes to `Veo_3.1_Lite`, and `VIDEO_MODEL_SPECS` hard-constrains Lite@1080p to a SINGLE 8s duration (`durationsByResolution['1080p'] = [8]`). So every talking scene would be force-clamped to 8s, breaking the per-scene smart-duration pacing (`suggestDurationForScript`) that the current working formula relies on. Neil confirmed: "it might destroy our current working formula." The `/goal` verification (build + test + brand-check) would NOT have caught this — it's a render-output regression, invisible without an actual N-scene smoke.
**Lesson:** The video render default (model × resolution × the auto-routing × the per-resolution duration whitelist) is a TUNED, interacting system — treat changing it like a tuned-prompt edit. Never bump the default model/resolution to satisfy a pricing/COGS doc without a full Director-AI N-scene render smoke (via `smoke-tester`) eyeballing pacing on talking AND b-roll scenes. Slice 4 correctly gated the *controls* and left the proven `Lite/720p` auto pipeline untouched for lower tiers; the 1080p bump is parked for a smoke-gated pass. Also note: `grifon_dev_unlock` is a NEW localStorage gate added this slice (unlocks Director mode + advanced video controls for dev on any plan) — distinct from `grifon_admin`; don't dedupe them.

### 2026-06-23 — One-Shot Ad ≠ a stripped-down wizard; it's the SAME inputs on one page, automated
**Context:** Building the One-Shot Ad composer redesign (`workflows/oneshot_composer_redesign.md`). The Phase-1 spec scoped it to "composer + tokens, asset modals simple (single upload), Phases 2–3 deferred." I built exactly that. Neil pushed back hard ("ano nangyari sa bagong design natin? akala ko ba naintindihan mo?") because the result missed the actual product intent he'd stated before.
**What went wrong:** I treated One-Shot as a slimmer/simpler feature set than advanced mode. It isn't. One-Shot and the advanced 8-step wizard collect the **same inputs** and follow the **same Grifon guardrails** — the only difference is *control*: One-Shot puts everything on ONE page and lets Director AI generate the pain/features/contrarian/audience + script + scenes automatically (beginner / automode / "pang tamad"); advanced mode is for experts who don't fully trust the AI and want to type those research fields, write their own script, and customize each scene themselves. So the per-vertical guided photo upload (Service/RealEstate multi-slot with reference examples) is NOT an advanced-only feature to defer — it's a core *input* One-Shot must have too, just collapsed onto the page. Building the simple single-upload version read as "you didn't listen."
**Lesson:** When designing One-Shot, mirror advanced-mode's INPUT controls (reuse the same components/assets — e.g. the `/examples/*.png` reference shots + archetype slot configs, now in `components/guidedPhotoSlots.tsx`), and only collapse the multi-step flow + automate the *research/script/scene* generation. Never add manual research-input fields to One-Shot (that's advanced mode's job), and never assume a control that exists in advanced mode should be dropped from One-Shot "to keep it simple" — confirm with Neil first. Also: "Product" upload is for physical products; Service/RealEstate/Commercial get an "Assets" upload (place/property/scene photos), not "Product".

### 2026-06-27 — Built work lives on unmerged branches; checking only `main` + a doc concluded "not built" 3×
**Context:** Neil asked "tapos na ba ang Expert/Manual Mode?" A fresh post-`/clear` session grepped the codebase (on `main`) and read `workflows/expert_manual_mode.md` (whose top still said "not yet started"), then told Neil the feature was unbuilt and offered to start it — running a full `/grill-me` to design it from scratch. Neil pushed back ("promise, nagawa na natin yan, nag-testing pa nga tayo"). A `git branch -a` + `git log --all --grep` then found the ENTIRE feature built, smoke-tested, code-reviewed, and integrated-with-main on `origin/feat/expert-mode-directors-cut` (22 commits ahead, 0 behind). Neil says this is the 3rd time this exact thing happened.
**What went wrong:** The defreezer wipes *local* branches and all session state; only the repo + `origin/*` refs survive. Work-in-progress is committed to a `feat/*` branch and pushed, but NOT merged to `main`. A fresh session that inspects only `main`'s working tree + a planning doc sees no code and a stale "not started" doc → wrongly concludes the feature doesn't exist. Compounding it: the planning doc's status header was written *before* the build and never updated on `main` (the updated status lived only on the branch, via commit `265e4a7`), so the one artifact a fresh session trusts was actively misleading. The cost is severe — nearly rebuilt a finished, Neil-approved feature from zero.
**Lesson:** Before concluding ANY feature is unbuilt / not-started / missing, check the whole repo, not just `main`: `git branch -a`, `git log --all --grep=<feature>`, and `git diff --name-only origin/main...origin/<branch>`. A planning doc that says "not started" is NOT authoritative — code on a branch overrides it; verify against branches first. The SessionStart hook now lists every `origin/*` branch ahead of `main` so this surfaces automatically each session (see `.claude/hooks/session-start.sh` "UNMERGED WORK IN FLIGHT"). Also: when a build lands on a branch, update its planning-doc status header *in the same branch* so the doc and code travel together; and don't let a stale doc on `main` outvote a `git branch -a`. Recovering branches is cheap (`git checkout <branch>`); rebuilding a shipped feature is not.
