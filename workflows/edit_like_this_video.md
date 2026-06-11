# Workflow: "Edit like THIS video" — per-video style mimicry

**Objective:** Let a Grifon user paste a viral video URL into the AI Editor and have
their OWN Grifon-generated ad rendered in that video's editing style — caption churn,
chunking, font treatment, transitions, SFX density, hook mechanics — extracted by
Gemini video understanding and compiled onto the existing ffmpeg render presets.
No Adobe, no Higgsfield. First in the Philippines.

**Source:** Neil, 2026-06-11 — dropped 3 Higgsfield×Adobe demo Shorts and asked for
"this kind of super power to my editor … without using higgsfield or adobe."
Grilled and locked: superpower = per-video mimicry; footage = Grifon-generated ads
only (no raw uploads in v1); this doc + the capability tool are the session
deliverables, the feature itself builds later.

**Status:** PLANNED — blocked on the Gated Items below. Resume trigger lives in
`post_beta_roadmap.md` item #12.

---

## 1. Competitive read — what Higgsfield×Adobe actually is (and isn't)

The 3 demo Shorts (`O7apmF0GC_U`, `X9aWFFwMZG4`, `87DJe-UjX1Q`) showcase the
**Higgsfield plugin suite for Adobe Premiere Pro / After Effects** (5 panels, Premiere
2024+, runs on Higgsfield credits): **Reframe** (AI aspect conversion without crop),
**Remove Background**, **Upscale** (4K), **Draw to Edit** (brush-stroke inpainting —
remove/add/replace objects & people), **Edit Video** (prompt-based natural-language
edits). Generation comes from Higgsfield's aggregated models — **Seedance 2.0**
(ByteDance; multimodal input up to 12 assets, 15s multi-shot, joint audio-video
generation), Kling 3.0, Veo 3.1, Sora 2 — dragged into the Premiere timeline. The big
bold text and VFX in the demos are Premiere-native workflow plus generated VFX clips
composited in.

**Strategic read:** Higgsfield×Adobe is a *pro-editor assist* — the human drives
Premiere, the AI helps per clip, credits are burned per generation. Grifon's
first-in-PH play is the **inverse**: the editor IS the AI (EDL brain + Edit DNA
mimicry); the SMB owner never opens an editor and never learns one. We do not clone
the panels — we ship the brain.

### Capability matrix (web-verified + Neil-described; `CONFIRM-LOCAL` = verify with the runbook below)

| Higgsfield×Adobe capability | Grifon today | Grifon answer | Confirm |
|---|---|---|---|
| Generate AI video → timeline (Seedance 2.0 / Kling / Veo) | ✅ shipped (Veo + Kling, wizard-automated end-to-end) | Already MORE automated than per-clip Premiere. Seedance-via-BytePlus API = provider watch-list | CONFIRM-LOCAL |
| Prompt-based object add/remove on footage (Draw to Edit / Edit Video) | ❌ on video | **Grifon-native loop:** prompt-edit the scene's source still in ImageEditor (Gemini image editing) → re-generate the scene video. True video inpainting = out-of-scope v1; watch Veo/Kling editing APIs | CONFIRM-LOCAL |
| Big Canva-style bold text overlays | ✅ ffmpeg drawtext, animated (Anton / Bangers / ArchivoBlack) | This feature makes it style-MIMICKING instead of preset-rotated | CONFIRM-LOCAL |
| Realistic in-video VFX | ❌ compositing | Generation-side: prompt the VFX into scene generation | CONFIRM-LOCAL |
| Remove background (video) | ❌ | Out-of-scope v1 (per-frame MediaPipe matting is possible but heavy) | CONFIRM-LOCAL |
| Reframe without crop | partial | Generation-side: Grifon generates at the chosen aspect natively | CONFIRM-LOCAL |
| 4K upscale | ❌ | Out-of-scope v1; social ads target 1080p | CONFIRM-LOCAL |

### Runbook — confirm the matrix (Neil's PC, ~2 min + ~1 min/video)

Needs `GEMINI_API_KEY` in `.env` (already there on the cafe PC). The tool ingests
YouTube URLs natively — no yt-dlp, no download:

```bash
python tools/analyze_capability_demo.py https://youtube.com/shorts/O7apmF0GC_U --label higgsfield-demo-1
python tools/analyze_capability_demo.py https://youtube.com/shorts/X9aWFFwMZG4 --label higgsfield-demo-2
python tools/analyze_capability_demo.py https://youtube.com/shorts/87DJe-UjX1Q --label higgsfield-demo-3
```

JSON lands in `.tmp/viral-intel/higgsfield-demo-*.json`. Then: update the matrix above
(replace `CONFIRM-LOCAL` with ✅/✗ + timestamps), commit. Exit code 3 = rerun once,
then report what was vague. These are capability demos — findings stay HERE, never in
`viral_swipe_file.md` Entries (tool demos are product research, not ad swipe material).

---

## 2. Feature architecture (phased)

```
user pastes URL ──► api/autopsy/analyze.ts ──► video_style_cache (Supabase)
                         │  Gemini watches the                │
                         │  YouTube URL natively              ▼
                         ▼                        api/_lib/dnaToPreset.ts
                    Edit DNA JSON ──────────────► compile → RenderPreset
                                                              │
EditVideo UI: DNA chips + Apply toggle ──► render contract    ▼
                            preset.styleVideoId ──► api/render/final.ts → ffmpeg
```

### Phase 1 — analysis endpoint + cache

**`api/autopsy/analyze.ts`** (POST `{ url }`), mirroring the `api/gemini/text.ts`
pipeline shape:

1. Auth (Supabase token) → rate-limit `autopsy:analyze:${userId}` **5/hour** (the
   Gemini video call is the expensive unit) → plan gate (Pro+; the same line as
   `MONTHLY_LIMITS.video_ads > 0`).
2. Validate URL is `youtube.com`/`youtu.be`, extract the 11-char `videoId`. Anything
   else → friendly 400 pointing at the Analyzed Styles Library (§6). TikTok/IG are
   v2 — yt-dlp stays a local-agent capability only and never ships server-side.
3. **Cache-first**: `video_style_cache` hit → return immediately (second user pays
   nothing; `request_count++`).
4. Gemini call: `gemini-3.5-flash`, temp 0.2, `responseMimeType: 'application/json'`,
   `contents` parts = `[{ fileData: { fileUri: youtubeUrl } }, { text: AUTOPSY_PROMPT }]`.
   Native YouTube ingestion — public videos only, length cap 5 min (Shorts ≤3 min).
   ⚠️ Do NOT copy the `fileData` pattern at `services/geminiService.ts:1379` (stubbed
   EDL flow) — it passes Supabase signed URLs as `fileUri`, which the live API rejects
   (must be a Files API URI or a YouTube URL). Flag that when the EDL stub is unstubbed.
5. **Specificity validator**: TS port of `validate_specificity()`
   (`tools/analyze_video.py:201`) → 422 `style_analysis_failed` (the in-app analogue
   of the tool's exit code 3). A vague analysis must never enter the cache.
6. Write cache row, return `{ videoId, dna, chips }`.

**Prompt:** trimmed port of `ANALYSIS_PROMPT` from `tools/analyze_video.py` — only the
fields the compiler + UI consume (hook, shots, captions, edit_grammar, camera, sfx
density, why_it_works) — in a NEW file `api/_lib/autopsyPrompt.ts`. Kept out of
`prompts.ts` so the tuned file is untouched. **Gated: Neil signs off the prompt text.**

**Cache table** (Supabase migration — Gated):

```sql
create table video_style_cache (
  video_id text primary key,        -- 11-char YouTube id
  source_url text not null,
  dna jsonb not null,               -- compiler input (trimmed)
  full_analysis jsonb not null,     -- everything Gemini returned
  model text not null,
  prompt_version int not null,      -- bump on prompt change; re-render determinism
  analyzed_at timestamptz not null default now(),
  requested_by uuid not null,       -- first requester
  request_count int not null default 1
);
```

Global (same public video = same DNA for everyone), immutable per `prompt_version`.

**Ops:** `vercel.json` entry `maxDuration: 60`. Flash on a Short fits comfortably; if
p95 misbehaves, convert to the fire-then-poll sidecar pattern already proven by
`api/render/final.ts` + `poll.ts` — pre-designed fallback, not improvised.

### Phase 2 — DNA → RenderPreset compiler (the heart)

**`api/_lib/dnaToPreset.ts`**: `compileDnaToPreset(dna, scriptStyle, videoId):
RenderPreset` — pure, deterministic, zero randomness, every clamp commented. The DNA
can only land on what the ffmpeg renderer already implements:

| Edit DNA field | RenderPreset field | Rule + clamp |
|---|---|---|
| `captions.swap_interval_s` + `chunk_words` + `animation` | `caption.chunkAnim` | <0.7s & 1–3 words → `word-pop`; 0.7–1.2s → `pop`; "karaoke fill" → `karaoke`; else `none` |
| `captions.treatment` | `boxAlpha` / `borderWFrac` | outline+shadow → `borderWFrac` ∈ [0.06, 0.10], `boxAlpha` 0; box → `boxAlpha` ∈ [0.5, 0.85] |
| `captions.screen_height_pct` | `yFracTalking` / `yFracBroll` | clamp [0.60, 0.75] (face-clear band still wins) |
| caption size cues | `baseSizeFrac` | clamp [0.034, 0.048] |
| font descriptor | `fontFile` + `advRatio` | **nearest-neighbor across the 5 shipped fonts ONLY** (Inter-Black / Anton / Bangers / Montserrat-ExtraBold / ArchivoBlack) — never arbitrary fonts, never client-supplied paths |
| `hook.text_on_frame_1` + `hook_type` | `hook.layout` / `reveal` / `wordCadenceSec` | cadence clamp [0.26, 0.40] |
| `edit_grammar.transitions` | `transition.kind` / cadence | whip-pan→`whip`, flash/strobe→`flash`, dip/fade→`dip`, film-burn→`burn`; max 4 per ad |
| `edit_grammar.sfx_hits` density | `sfx` palette + volume | whoosh-count clamp [0, 4], volume [0.4, 0.6], fixed SfxBank only |
| `camera` zoom %/s | `camera.*` | **v1: recorded, NOT applied** — honors the 2026-06-10 pulse-guard decision (camera intensity 0 in all shipped presets; generation owns motion). Phase 2b candidate for static b-roll only |

**Sincerity guard is a mandatory post-pass** — `applySincerityGuard(preset,
scriptStyle)`: testimonial → `chunkAnim` capped at `pop`, transitions restricted to
`{none, dip}`, sfx volume ≤0.5, reveal `flip`. Unconditional: hype DNA on a
testimonial ad gets clamped, and the clamps are reported back to the UI ("softened
for testimonial sincerity").

`RenderPreset.id` widens to `PresetId | \`dna:${videoId}\``. `resolvePreset()` itself
stays untouched; a new resolution branch in `final.ts` runs before it.

**Tests:** `tests/unit/dnaToPreset.test.ts` — golden DNA fixtures (Swipe File E4/E5
numbers + the 3 demo analyses once run) → exact expected presets; clamp boundaries;
guard cases; determinism (same input twice → deep-equal). Build-gate + `verify-changes`
apply (this is `api/` code).

### Phase 3 — render contract extension (reference, never inline)

- `api/render/final.ts` body: `preset: { id?: <existing enum>, styleVideoId?:
  z.string().regex(/^[\w-]{11}$/) }`.
- Resolution order: **styleVideoId (load cached DNA → compile) > explicit id >
  rotation > classic**. Cache miss degrades silently to rotation — matches
  `resolvePreset`'s degrade philosophy, never throws.
- Persist `styleVideoId` on the ad (`FinalRenderRequest` in `types.ts` +
  `EditorBatchPayload`) so re-renders are deterministic — the exact persistence
  requirement roadmap item #11 already specifies for `presetId`.
- **Security invariant:** no inline `RenderPreset` ever crosses the wire.
  `fontFile` is a server file path consumed by the renderer's asset copier —
  client-supplied presets would be a path-injection vector. Client sends the 11-char
  reference; the server compiles.

### Phase 4 — EditVideo UI panel

New GlassPanel in Batch Edit Mode (`components/EditVideo.tsx`):

- Paste field + ANALYZE `GoldButton` → thin client `services/styleDnaService.ts`
  (own fetch + poll shape like `finalRenderService.ts`).
- **DNA chips** on success: "captions swap every 0.5s" · "outline + shadow" ·
  "whip cuts ×3" · "SFX-dense" · "hook: bold claim".
- **Honest-transfer line** (copy sourced from the §1 capability matrix): fonts
  approximated to Grifon's set, camera moves not applied, AI VFX out of scope —
  sell "style approximation", never "clone".
- **Apply toggle** sets `preset.styleVideoId` on the render request. Testimonial
  scripts additionally show the sincerity-guard notice.
- Pro+ upgrade wall via the existing 402 contract. DESIGN.md tokens throughout
  (`bg-zinc-950`, Grifon Gold, `GlassPanel`/`GoldButton`, lucide icons);
  `brand-check` before declaring done.
- **One surface with roadmap #11:** the preset picker renders shipped presets as
  cards + "paste a video" as the last card. Build them together when #11 unparks.

### Phase 5 — gating & cost control

- Plan gate: **Pro+** (open decision for Neil: Pro vs Business).
- Rate limit: 5 analyses/hour/user via the existing rate-limit RPC.
- Global cache amortizes Gemini cost across users; `request_count` is free telemetry.
- **No new `MeterUnit` in v1** — monthly quota math is load-bearing; adding a
  `style_analyses` meter is a flagged follow-up needing approval.
- YouTube ingestion quota (daily video-minutes, public-only, preview-status feature):
  handled by the same 429/RESOURCE_EXHAUSTED error mapping as `api/gemini/text.ts`.

### Phase 6 — flywheel back into the Swipe File

Every `video_style_cache` row is a candidate autopsy entry:

1. A new viral-autopsy skill step ("harvest in-app analyses") reads recent rows; the
   agent — not automation — writes condensed entries into
   `workflows/viral_swipe_file.md` and updates Pattern Index corroboration counts.
2. `request_count` ranks which mimicked styles users actually want → top styles get
   promoted to **named shipped presets** via the existing ≥3-corroboration Gated
   Proposal path (exactly how P9 → `vsl` is supposed to land).
3. The two pipelines stay conceptually separate and meet ONLY at the cache table:
   - **Mimicry** = per-video runtime compile. No tuned-file writes, ever.
   - **Patterns** = corroborated, Neil-gated, shipped presets.

---

## 3. Gated items awaiting Neil (nothing in Phases 1–5 merges before these)

- [ ] **Prompt sign-off:** `ANALYSIS_PROMPT` in `tools/analyze_capability_demo.py`
      (committed this session, unreviewed).
- [ ] **Prompt sign-off:** `api/_lib/autopsyPrompt.ts` (Phase 1 — drafted at build
      time as a trimmed port of `analyze_video.py`'s prompt).
- [ ] **Supabase migration:** `video_style_cache` table.
- [ ] **Tier decision:** Pro vs Business for the analyze endpoint.
- [ ] **Run the §1 runbook** and update the capability matrix (CONFIRM-LOCAL rows).

## 4. Risks

1. **YouTube ingestion limits/stability** — public-only, daily-minutes quota,
   preview feature. Mitigations: cache-first, 5/hr limit, 5-min length cap,
   degrade-to-rotation, Analyzed Styles Library as the no-API fallback.
2. **Fidelity ceiling** — no match-cuts, speed ramps, arbitrary fonts, or AI VFX.
   The UI must sell approximation or the feature reads as broken (§ Phase 4 copy).
3. **Clamp ranges are engineering guesses** until a visual pass — budget one tuning
   session: smoke-render at each clamp extreme, eyeball, adjust.
4. **60s ceiling on analysis** — fire-then-poll fallback is pre-designed (Phase 1 Ops).
5. **Stale precedent trap** — `geminiService.ts:1379` Supabase-URL-as-fileUri will
   fail when the EDL stub is unstubbed; tracked here so the new endpoint isn't blamed.

## 5. Relationship to existing work

- **Roadmap #11 (preset picker):** same UI surface; #11's persistence requirement is
  satisfied by Phase 3. Build Phase 4 and #11 together.
- **Roadmap #12:** the parked-item entry for THIS feature (resume trigger lives there).
- **Roadmap #10 (final-render executor):** prerequisite already landed — the executor
  exists (`api/render/final.ts` + `renderFfmpeg.ts`); this feature rides it.
- **viral-autopsy skill:** stays the agent-side research loop; this feature is its
  user-facing product twin. Tool demos (like the 3 Shorts) stay out of the Swipe File.
- **gemini-eval:** still the grader for Grifon's own output; a DNA-styled render is
  graded the same as any other.
