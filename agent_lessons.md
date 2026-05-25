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
