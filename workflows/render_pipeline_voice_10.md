# Render Pipeline — Item #10 (Final-Render Executor) folded with Phase 5 (Voice Setup)

> **Status (2026-05-31):** Scoped via grill-me (mobile session). Plan locked, **not started.**
> Supersedes the build sequence of `post_beta_roadmap.md` #10 and `phase5_voice_consolidation.md`
> by folding them into one render+voice pipeline. **Phase 0 (ffmpeg spike) is the decision gate —
> build nothing on Vercel until it passes.** Verification of the end result is **PC-gated** (Neil
> renders a real batch and watches it); cannot be closed from mobile.

## Context

The AI Editor's final-render executor is unbuilt. The only output today is a downloadable EDL
JSON (`components/EditVideo.tsx:69-73`); nothing assembles a final MP4, so nothing trims the
dead air. Neil's 2026-05-29 in-vivo CTA render: avatar speaks 0–4s, then **4–6s of silence +
stray blur**. Every talking scene overshoots the same way and the delivered video keeps that
amateur tail. This is the headline launch-readiness gap.

Two facts surfaced during scoping reshaped the work:

1. **Scene video and voice are separate, and the voice isn't server-reachable.** Veo/Kling MP4s
   render **silent** (`components/SignalModulator/ScenePipelineTile.tsx:160`); the voice is a
   separate ElevenLabs MP3 living as a **browser `blob:` URL**, never persisted, lost on refresh
   (`services/voiceService.ts:38`; `audioOverlays` in `components/EditVideo.tsx:14`). The video
   MP4 *is* persisted (Supabase signed, 24h); the audio is not.

2. **The per-scene-type voice setup is unbuilt (Phase 5).** The intended design — *talking avatar
   → voice-changer (STS), hook + b-roll → TTS* — is `workflows/phase5_voice_consolidation.md`
   ("approved, not started"). Today Signal Modulator uses **TTS for every scene type including
   talking avatars** (`ScenePipelineTile.tsx:112`, `synthesizeSpeech` only; `convertSpeech`/STS
   never called) and **punts lip-sync to the user in CapCut** (line 162).

**Why they merge:** #10's target (silent MP4 + ElevenLabs voice) only lip-syncs on talking scenes
if the voice is **voice-changed (STS on the Veo audio track)** — TTS-over-Veo desyncs the lips. So
#10 and Phase 5's talking-half are two halves of one pipeline, and they share the **same blocking
unknown: whether ffmpeg can run on Vercel** (Phase 5 R1 == #10 host decision). De-risk once,
unblock both.

## Decisions locked (grill-me, 2026-05-31)

| # | Decision | Choice |
|---|---|---|
| 1 | v1 final-render scope | **Trim + concat only.** No burned-in overlays/SFX yet (stay in EDL for later). |
| 2 | Render host | **Spike ffmpeg-on-Vercel first**; fall back to a dedicated worker if it blows the ceiling. |
| 3 | Trim target | **AI Editor batch** (silent MP4 + ElevenLabs MP3), not Veo native-audio. |
| 4 | Render locus | **Persist MP3 to Supabase, then server-side ffmpeg.** No browser blob in render path. |
| 5 | Trim signal | **`silencedetect` on the MP3 + 0.3s pad** → speech-end per scene. |
| 6 | Audio-less scenes | **EDL `keepSegments` fallback** (script-text heuristic stays for b-roll/cinematic with no MP3). |
| 7 | EDL role in v1 | **Render straight from the batch** (`editorBatch`, ordered by `sceneIdx`); EDL used only for the audio-less fallback length. |
| 8 | Sequencing | **One pipeline:** shared ffmpeg spike → voice-changer (talking) + TTS (b-roll/hook) → trim/mux/concat → final MP4. |

## Build order

### Phase 0 — Shared ffmpeg spike (DECISION GATE — do first)
Prove ffmpeg can run in a Vercel function before building anything on top.
- Bundle `ffmpeg-static` into a throwaway endpoint; run a real **5–7 scene, 1080p trim + concat
  (re-encode)** and measure wall-time + output size + function bundle size.
- **Gate:** finishes under ~50s (inside the 55s client-abort / 60s Vercel ceiling) AND the binary
  deploys under Vercel's 250MB unzipped limit → **build on Vercel**. Otherwise → **dedicated
  worker** (Railway/Render/Fly) fired async + polled, mirroring the Veo/Kling fire-then-poll.
  Resolves premortem #1 (60s ceiling) + #2 (packaging) before any real build.
- **Record the verdict in this file.**

#### ✅ VERDICT (2026-06-04): BUILD ON VERCEL (ffmpeg-static) — gate PASSED on both axes.

Spike harness: [`scripts/ffmpeg-spike.mjs`](../scripts/ffmpeg-spike.mjs) (throwaway, NOT a deployed
function — see note below). Faithfully mirrors Phase 2: silent 1080×1920 scene MP4s + separate MP3s
→ per-scene trim-to-speech-end + mux + normalize (fps/scale/sar/48k, H.264/AAC) → **concat *filter*
re-encode** (not the demuxer). `ffmpeg-static` 5.3.0 / ffmpeg 6.1.1, `libx264 -preset veryfast -crf
20`. Measured on a 12-core cafe PC.

| Axis | Gate | Measured | Result |
|---|---|---|---|
| **Function bundle** | < 250 MB unzipped | **76.1 MB** (linux-x64 ffmpeg, the real Vercel binary; HEAD on the `b6.1.1` release) + small node deps | ✅ **3.3× under** |
| **Wall-time, 7 scenes** | < ~50 s | **15.8 s** all-cores / **16.6 s** single-thread (`-threads 1`, ~1-vCPU proxy) | ✅ **~3× under** |
| **Wall-time, 5 scenes** | < ~50 s | 15.3 s / 12.9 s | ✅ |
| **Wall-time, 2 scenes** | (sanity) | 5.2 s / 5.8 s | ✅ |
| **Output size, 7 scenes** | (info) | 19.8 MB (~28 s of final video) | small |

**Why Vercel, not a worker:** both gate criteria pass with multiples of headroom, and the
dedicated-worker fallback (Railway/Render/Fly) is the heavier path — new deploy target, new secrets,
new infra to babysit on defreezer cafe PCs. Default to Vercel unless the gate is *clearly* blown; it
is not. The Decision #2 worker fallback stays in reserve, triggered only if the confirmation deploy
below shows real Vercel renders breaching the budget.

**Two honest caveats carried into Phase 2 (do not lose these):**
1. **Synthetic source under-states real cost.** `testsrc2` needs no H.264 *decode* and didn't
   saturate x264 (all-cores ≈ single-thread), so real Veo/Kling footage on a slower Vercel vCPU will
   cost more than 16 s. Conservative envelope — 2.5× Vercel-vCPU penalty × 1.4× real-footage/decode
   penalty on the 7-scene single-thread number → **≈ 45–55 s of compute worst case.** That sits at
   the edge of the 50 s gate, so: **(a)** the render call must NOT use `proxyCall`'s 55 s client
   abort — give the render endpoint its own longer client timeout (or poll a status row); **(b)**
   set the Vercel fn `maxDuration` generously (≥120 s; confirm the plan ceiling) so a long worst-case
   render can't be killed mid-encode. This is also *why* Phase 2 already plans `api/render/final/poll.ts`
   — treat render as out-of-band of the standard 55 s abort.
2. **Vercel per-vCPU speed was not measured directly** (spike is PC/local per the plan). Before
   fixing Phase 2's `maxDuration` and committing the synchronous-vs-poll shape, do **one throwaway
   Vercel deploy of the 7-scene case** and record the real wall-time here. If it breaches ~120 s,
   reopen the worker fallback.
   - **Status (2026-06-04): confirmation deploy DEFERRED, not done.** A ready-to-deploy token-gated
     endpoint (`api/render/_spike.ts` + `vercel.json` maxDuration 300 / `includeFiles` for the ffmpeg
     binary) was built and pushed, then **removed** — Neil opted to skip the manual Vercel deploy and
     move on (PC margin is ~3×, and the live feature will yield a real number anyway). To redo:
     recover `api/render/_spike.ts` from git history (commit `537b257` on `claude/effort-estimation-AhHqn`),
     re-add the `vercel.json` entry, deploy a *preview*, and curl
     `/api/render/_spike?key=grifon-phase0-spike-7e3f1a&n=7&threads=1`. **Still recommended before
     Phase 2 locks `maxDuration`.**

**Note on "throwaway endpoint":** the spike is a `scripts/` Node script, not an `api/` file, *on
purpose* — any file under `api/` becomes a live Vercel function on the next deploy, and the script
issues the byte-identical ffmpeg invocations a function would. No prod surface touched. `ffmpeg-static`
was added to `dependencies` (Phases 1–2 need it regardless of host).

### Phase 1 — Voice routing server-side (Phase 5 talking-half + persistence)
Generate per-scene voice **on the server** and persist to Supabase. This is also #10's "step
zero" and **eliminates premortem #3** (no browser blob in the render path).
- `api/voice/consolidate.ts` — accepts `{ scenes, voiceId }`, routes per `VideoPrompt.type`:
  `talking` → `speech-to-speech` (voice-changer on the Veo audio track, **preserves lip-sync**);
  `b-roll` → `text-to-speech`; `cinematic` → TTS if `scriptLine` non-empty else skip. Returns
  per-scene **Supabase-persisted MP3 URLs** (not blobs).
- `api/_lib/audioExtract.ts` — strip the Veo audio track from the MP4 buffer to feed STS (same
  ffmpeg muscle as Phase 0).
- Reuse `api/elevenlabs/text-to-speech.ts` + `speech-to-speech.ts` + `api/_lib/quota.ts`
  (per-tier TTS/STS caps already exist).

### Phase 2 — Final-render executor (#10 core)
- `api/render/final.ts` (+ `api/render/final/poll.ts` if Phase 0 → async/worker). For each scene,
  in `sceneIdx` order:
  1. **Trim length** = `silencedetect` last-non-silent on the scene MP3 + 0.3s pad (audio-less
     scenes → EDL `keepSegments`). Tune `silencedetect` noise floor + min-silence so a soft first
     word is never clipped (premortem #4).
  2. Trim the silent MP4 to that length; **mux** the scene MP3 onto it.
  3. **Normalize** every clip (batch aspect ratio, common fps + sample rate, H.264/AAC) and concat
     via the **concat filter with re-encode** (NOT the demuxer) to avoid A/V drift (premortem #5).
  4. Upload final MP4 → Supabase, return a 24h signed URL — reuse the upload+sign pattern in
     `api/gemini/video/poll.ts:149-187` (BUCKET `gemini-videos`).
- `services/finalRenderService.ts` — client coordinator (fire, poll if async, surface URL).

### Phase 3 — UI
- `components/EditVideo.tsx` `BatchEditMode` — add a **"Render Final Video"** action (replaces the
  EDL-JSON-only output as the primary CTA), a progress state, and a result player + download. Keep
  "Export EDL JSON" as secondary.

## Critical files

**Create:** `api/voice/consolidate.ts`, `api/_lib/audioExtract.ts`, `api/render/final.ts`
(+ `api/render/final/poll.ts` if async), `services/finalRenderService.ts`.
**Modify:** `components/EditVideo.tsx` (BatchEditMode CTA + result), `types.ts`
(`ConsolidationScene`, `FinalRenderJob`/`FinalRenderResult`), `vercel.json` (maxDuration for new
render endpoints; if Phase 0 says worker, no Vercel render fn).
**Reuse (do not modify):** `api/gemini/video/poll.ts` (upload+sign pattern), `api/gemini/video.ts`
(fire-then-poll shape), `services/voiceService.ts` (`convertSpeech`/`synthesizeSpeech`),
`api/_lib/quota.ts`, `components/SignalModulator/pinoyReady.ts` (voice presets),
`components/ui/GlassPanel.tsx` + `GoldButton.tsx`.

## Premortem mitigations (Neil flagged #3 + #4 as top)

- **#3 blob gone → ELIMINATED.** Voice generated + persisted server-side (Phase 1); render never
  touches a browser blob.
- **#4 wrong/desynced audio.** (a) Strict `sceneIdx` keying audio↔video, assert counts match
  before render; (b) talking scenes use **voice-changer (STS), not TTS**, preserving lip-sync;
  (c) `silencedetect` tuned (noise floor + min-silence) + 0.3s pad so the first word survives.
- **#1 60s ceiling / #2 ffmpeg packaging → Phase 0 gate** decides Vercel vs worker before build.
- **#5 A/V drift on concat →** normalize + concat-filter re-encode; verify lip-sync ≤ ~50ms (Phase 5 R2).
- **#7 cost/quota →** reuse per-tier `api/_lib/quota.ts`, show cost estimate, Creator+ gate; extend
  the `cleanup-gemini-videos` cron to reap final MP4s.

## Verification

1. **Phase 0 spike (PC/local):** curl a 2-scene then a 5–7-scene 1080p trim+concat; record
   wall-time, output size, bundle size → write the Vercel-vs-worker verdict into this file.
2. **Unit:** `sceneIdx` keying; `silencedetect` output parse; audio-less → `keepSegments` fallback
   (vitest, `.js`-extension imports per `tests/CLAUDE.md`).
3. **Integration:** POST `api/render/final` with a fixture batch → 200 + a playable signed MP4.
4. **Smoke (PC-GATED — Neil's eyes/ears):** real wizard run → Render All → consolidate voice →
   Render Final Video → confirm: talking scene **lip-synced**, ends at speech-end with **no blur
   tail**, scenes concatenated in `sceneIdx` order, final ends clean. This is the actual green
   light; cannot be closed from mobile.
5. **Build gate:** `npm run build` exit 0 (cite its pass message); crown-jewel leak check = 0 (no
   prompt content touched — expected trivially clean).

## Guardrails for execution

- **No TUNED edits expected.** This is render/transport/voice-routing — it does not touch prompt
  strings, schemas, or model IDs in `services/geminiService.ts` / `api/_lib/prompts.ts`. If any
  prompt/schema change surfaces, STOP and get Neil's per-line approval (never `/goal`).
- **Plan→Goal pipeline:** at PC, each session's slice gets its own `/goal` citing the build-gate
  pass message + `verify-changes` (and the PC-gated smoke for the slice that ships the render).
  Too large for one goal — phase it per session; commit + push every slice (defreezer).
- **Phase 0 is the real gate.** Do not build Phase 2 on Vercel until Phase 0 says it fits.

## Related docs
- `workflows/post_beta_roadmap.md` #10 — original final-render-executor entry.
- `workflows/phase5_voice_consolidation.md` — the voice setup (talking→STS, b-roll/hook→TTS) this folds in.
- `workflows/handoff_2026-05-29-gates-merged-hook-codefix.md` — backlog #3 origin of the dead-air observation.
