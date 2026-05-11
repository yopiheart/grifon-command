# Phase 5: Voice Consolidation — Asset Bundle MVP

> **Status (2026-05-12):** Plan approved via grill-me session. Awaiting Render All Decision Gate (see bottom). Session 1 (Foundation) is safe to start regardless of gate outcome.

## Context

After Phase 4h shipped, the wizard generates 8-scene storyboards and Render All produces 8 MP4s with Veo-generated audio per scene. Each scene's voice sounds slightly different per Veo seed → final ad feels "AI/fake UGC." Neil's manual workflow today: ElevenLabs TTS for Hook/B-rolls (typed script + chosen voice), ElevenLabs voice-changer for Avatar scenes (preserves lipsync), then CapCut to mute Veo audio and overlay new audio — all using one consistent voice X for brand identity.

Phase 5 hides that complexity behind a single button inside the Generate Video module: after Render All, user clicks "Consolidate Voice → Download Bundle," gets a zip of 8 muted MP4s + 8 voice-consistent MP3s, does the final merge externally.

**Timing**: This builds AFTER the 73-commit beta-merge ships. Validates Render All baseline first — if Veo audio is already passable, this feature reprioritizes (see Decision Gate below).

## Decisions Locked (grill-me session 2026-05-12)

| # | Decision | Choice |
|---|---|---|
| 1 | End state | Asset bundle: 8 muted MP4s + 8 MP3s in zip. User merges externally. |
| 2 | Voice picker placement | Brand-level default + per-ad override. Lazy-prompted on first use. |
| 3 | Voice menu at MVP | Filipino voice presets only. No upload, no recording (Phase 5.2). |
| 4 | Trigger | New "Consolidate Voice" button in Generate Video module. Signal Modulator untouched. |
| 5 | Timing | Phase 5, after beta-merge ships. |
| 6 | Persistence | localStorage keyed by brand slug. |

## Scope: Phase 5.1 MVP

### In Scope

1. **Scene-aware routing** — read `VideoPrompt.type`:
   - `'talking'` → ElevenLabs voice-changer (speech-to-speech on the rendered MP4's audio track) — preserves lipsync timing
   - `'b-roll'` → ElevenLabs TTS using `scriptLine` + chosen voiceId
   - `'cinematic'` → TTS if `scriptLine` non-empty; skip otherwise (visual-only scene)
2. **"Consolidate Voice" button** inside Generate Video, appears after all scenes hit READY
3. **First-press voice picker modal** — if no brand voice in localStorage for current `brandName`, show preset grid → save → proceed
4. **Per-ad override** — small dropdown next to consolidate button ("Use brand voice (Carlo) ▾ | Override")
5. **Server-side audio extraction from MP4** — for talking scenes, strip audio track to feed voice-changer
6. **Client-side zip packaging** via JSZip: `scene_NN_<type>.mp3` + `scene_NN_<type>_muted.mp4` + `README.txt` with merge instructions
7. **Cost estimate** shown in button label or pre-press modal (~$0.15–0.20/ad)
8. **Plan gating** — Creator+ tier (matches existing cloning gate in [../components/SignalModulator/index.tsx](../components/SignalModulator/index.tsx))

### Out of Scope (Phase 5.2+)

- Voice cloning (file upload or 30s record) — gated on ElevenLabs Starter+ upgrade
- Supabase brand_profiles table / multi-brand UI
- Server-side video merging (would deliver finished MP4s, requires FFmpeg pipeline)
- Single-timeline rough-cut MP4 output
- Voice audio preview inside picker modal
- Re-consolidate single scene without redoing all

## Critical Files

### To Create

- **`utils/brandVoiceStorage.ts`** — `getBrandVoice(brandSlug)`, `setBrandVoice(brandSlug, voiceId)` over localStorage; slug derived from `clientDetails.brandName`
- **`api/_lib/audioExtract.ts`** — server util to strip audio from MP4 buffer (investigate `ffmpeg-static` for Vercel functions; see R1)
- **`api/voice/consolidate.ts`** — orchestrator endpoint: accepts `{ scenes: ConsolidationScene[], voiceId }`, fans out per scene to `text-to-speech` or `speech-to-speech`, returns per-scene MP3 URLs/blobs
- **`services/voiceConsolidationService.ts`** — client coordinator: calls `/api/voice/consolidate`, tracks per-scene progress, builds zip with JSZip, triggers download
- **`components/GenerateVideo/VoiceConsolidationPanel.tsx`** — UI: button, progress bars, override dropdown, cost estimate, error states
- **`components/GenerateVideo/VoicePickerModal.tsx`** — preset grid (reuses metadata from `components/SignalModulator/pinoyReady.ts`), saves on confirm

### To Modify

- **`components/GenerateVideo/index.tsx`** — render `VoiceConsolidationPanel` below scene queue when all scenes are READY; pass `storyboard`, `videoPrompts`, `brandName`
- **`types.ts`** — add `ConsolidationScene`, `ConsolidationResult`, `BrandVoiceMap`

### To Reuse (do NOT modify)

- **`services/voiceService.ts`** — `fetchVoices()` for preset library, `fetchBudget()` for cost display
- **`api/elevenlabs/text-to-speech.ts`** — already proxies to ElevenLabs with quota gating
- **`api/elevenlabs/speech-to-speech.ts`** — voice changer for talking scenes
- **`api/_lib/quota.ts`** — `requireQuota()` style helpers
- **`hooks/useSubscription.ts`** + **`utils/planGate.ts`** — `planAtLeast(plan_id, 'creator')`
- **`components/SignalModulator/pinoyReady.ts`** — Filipino preset metadata (curated voice IDs/names for the picker)
- **`components/ui/GlassPanel.tsx`**, **`GoldButton.tsx`** — design system primitives (see [../components/CLAUDE.md](../components/CLAUDE.md) hard rules)

## Implementation Order

### Session 1 — Foundation (~3 hrs)
1. `utils/brandVoiceStorage.ts` + round-trip unit test
2. `VoicePickerModal.tsx` rendering preset grid from `pinoyReady.ts` (no audio preview yet, that's 5.2)
3. Wire first-press flow: button → check storage → show modal if empty → save → proceed (no consolidation logic yet, just plumbing)
4. Manual test: pick voice, refresh app, confirm persistence

### Session 2 — Server orchestrator (~5 hrs)
1. Spike `ffmpeg-static` on Vercel function or decide on Cloud Run alternative (see R1)
2. `api/_lib/audioExtract.ts` — strip audio from MP4 buffer → MP3
3. `api/voice/consolidate.ts` — batch endpoint, fans out, returns per-scene MP3 URLs
4. Curl test: 2-scene payload (1 talking + 1 b-roll) → 2 MP3 URLs returned

### Session 3 — Client coordinator + UI (~5 hrs)
1. `services/voiceConsolidationService.ts` — orchestrator client + JSZip bundling + README generation
2. `VoiceConsolidationPanel.tsx` — button, progress, override dropdown
3. Wire into `GenerateVideo/index.tsx` (render only when all scenes READY)
4. End-to-end smoke: 2 scenes → press consolidate → zip downloads with correct content

### Session 4 — Polish + verification (~4 hrs)
1. Cost estimate display (call `fetchBudget()` + per-scene char/duration math)
2. Plan gating (Creator+ only; free tier sees upgrade CTA)
3. Partial-failure handling (4 of 8 scenes succeed → user sees error per scene + retry option)
4. Full 8-scene production smoke on real wizard run
5. Lipsync verification (record before/after on a talking scene)

## Verification Plan

1. **Unit** — `brandVoiceStorage` round-trip; `voiceConsolidationService` correctly routes scene types (mock fetch)
2. **Integration** — POST `/api/voice/consolidate` with 8 fake scenes → 200 with 8 MP3 URLs
3. **Smoke** — full wizard run → Render All 8 → Consolidate → unzip → verify 8 MP3s + 8 muted MP4s + README
4. **Lipsync** — play original Veo audio side-by-side with voice-changer MP3 for a talking scene; mouth-shape timing must match within ~50ms
5. **Cost** — ElevenLabs dashboard shows ~$0.15–0.20 charge after one full consolidation
6. **Plan gate** — free-tier test account sees upgrade CTA on press; Creator+ proceeds

## Risk Register

| # | Risk | Mitigation |
|---|---|---|
| R1 | `ffmpeg-static` may not work in Vercel serverless (~50MB binary, cold-start cost) | Session 2 spike: try locally first. Fallback: dedicated Cloud Run service for audio extraction. Don't commit Sessions 3+ until R1 is resolved. |
| R2 | Voice-changer may drift lipsync timing (ElevenLabs s2s shifts phonemes slightly) | Verify in Session 4 on real scene. If drift > 100ms, add manual offset slider as Phase 5.2. |
| R3 | ElevenLabs quota burn — beta users with limited credits exhaust fast | Plan-gate to Creator+. Show cost estimate before pressing. Track consolidations per user per month for visibility. |
| R4 | brandSlug collisions (two users with brand "Monat") | Not a real issue — localStorage is per-device. Note in Phase 5.3 (Supabase migration) when moving to cross-device sync. |
| R5 | **Veo audio is already passable** — Phase 5 solves a non-problem | **Decision Gate below.** Run beta first, validate need, then commit to Session 2+. |

## Decision Gate (BEFORE Session 2 starts)

After beta-merge ships and the first real Render All completes:

- **If Veo audio sounds consistent across 8 scenes** → REPRIORITIZE. Pause Phase 5, pull next item from [post_beta_roadmap.md](post_beta_roadmap.md) (product-scale hints, MrBeast CTA parity, or Vertex AI migration).
- **If Veo audio is noticeably inconsistent** → PROCEED with Phase 5 build per this plan.
- **If inconsistency exists but a cheaper fix is found** (e.g., reusing a single Veo seed across talking scenes for voice consistency) → re-grill, build the cheaper fix first, defer Phase 5.

Session 1 (foundation, ~3 hrs) is safe to do regardless — `brandVoiceStorage` and the picker modal are useful for future voice work even if voice consolidation never ships.

## Open Questions for Phase 5.2+

- ElevenLabs Starter+ upgrade timing — unlocks voice cloning, removes `GRIFON_VOICE_CLONING_ENABLED='false'` gate
- Supabase brand_profiles entity — needed if beta users start requesting cross-device sync or multi-brand management
- Server-side video merging (Option A from grill) — only if users keep asking "why do I still need CapCut?"
- Audio preview in picker modal — adds polish but each preview = ElevenLabs TTS spend; gate behind "Preview" button
