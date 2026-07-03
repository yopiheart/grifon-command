# PRD — Cinematic Ad Studio (Seedance 2.0 4K commercial module)

**Status:** Draft / design-ahead. **Owner:** Neil. **Tier:** Business.
**Date:** 2026-06-28. **Branch:** `claude/seedance-4k-ads-skill-wnwn57`.

> Design-now / build-when-ready. Phase A (local CLI prototyping) is shippable today and documented in [`cinematic_pipeline.md`](cinematic_pipeline.md). Phase B (the in-app module) is gated on the Seedance API integration Neil is wiring next. This PRD plans both; it does not itself build app code.

## 1. Context & vision
Grifon's existing video paths produce UGC/talking/storyboard ads (One-Shot, Director) and a product **stills/prompt exporter** (Cinematic Spec Studio). None produce a **true end-to-end 4K cinematic commercial**. The Cinematic Ad Studio is the premium Business-tier module that does: **lock assets → write a multi-scene shotlist → render 4K with Seedance 2.0 → assemble.** It productizes the workflow already captured in the `cinematic-ad-prompt` + `seedance-shotlist-director` skills and the `asset-prep.md` discipline.

**Stack (confirmed 2026-06-28):** images = **Codex CLI `gpt-image-2`** (local prototyping) / an image API in-app (open question, §6); video = **Seedance 2.0 API** (BytePlus ModelArk). **No Higgsfield.**

## 2. Relationship to existing surfaces
- **Cinematic Spec Studio (`cinematic_studio`, Business):** today a product-only **exporter** — 6×**1K** stills (its "4K" toggle is prompt-wording only) + text prompts, **no character, no video, no Seedance**, fixed 6-phase relay. The new module is its **end-to-end video evolution**. **Decision:** build as a new module that **reuses Spec Studio's asset-slot + hardware intake patterns** and the skills' doctrine; revisit folding Spec Studio in once the new module ships (avoid two half-overlapping Business modules long-term).
- **One-Shot / Director:** stay as-is (automated UGC + manual wizard, Veo/Kling). Cinematic Ad Studio is the *cinematic/visual* lane; Filipino talking scenes still route to the in-app/Veo pipeline.

## 3. Hard dependencies & phasing
- **Seedance is LOCKED in-app:** `VIDEO_MODEL_ROUTING.Seedance_2_0_*` = `modelId: null` (throws `MODEL_LOCKED`); **no `api/seedance/*` handler exists.** Wiring ≈ `api/seedance/video.ts` (submit) + `api/seedance/video/poll.ts` + `api/_lib/seedanceAuth.ts` + dispatcher branch in `services/geminiService.ts` + creds in `.env` + quota — ~3–5 files, mirror `api/kling/video.ts`/`omni-video.ts`.
- **Phase A (now):** local CLI pipeline (`tools/cinematic_pipeline.py` + `tools/seedance_render.py` + Codex tools) — validate quality, save API spend. ✅ scaffolded.
- **Phase B (the module):** wire `api/seedance/*` + resolve the image-provider question (§6) → in-app intake → render queue → status tracking → finished-ad metering. Business tier.

## 4. Intake — what to ask the user
**Hero product (required):** multi-angle so geometry holds under motion — **front, 3/4 hero, left side, right side, back, top**, plus **bottom/sole** if relevant, a **macro/texture** close-up, and the **logo/label**. Brand name + product name + **exact colorway** (locks label/color). *(Asset sheets generated via the image engine; uploads allowed for the user's own product.)*
**Character (optional — only if the ad needs a person):** **describe** age/gender/look/wardrobe → the module **generates** the 3-panel sheet (close-up + front + back, neutral grey). **No real-face upload** (Seedance restriction). State-variants for mid-ad changes (dry→sweaty); side characters cast from a prompt. **Filipino spoken line → in-app/Veo, not Seedance.**
**Creative brief:** Brand / Product / Offer / Audience (Bryan/Olivia) / Platform / CTA · **mode** (Cinematic Film · UGC · Product Demo · Founder Story · Testimonial · Problem/Solution) · **# scenes** (tier-capped, Business `SCENE_CAP`) · **aspect** (9:16 / 16:9 / 21:9 / 1:1) · style/mood directive · optional **location plates** (3/4 angle).

## 5. Pipeline (maps 1:1 to the skills)
1. **Asset gen + single-variable validation** (`asset-prep.md`) — sheets, then a cheap motion baseline per candidate before committing.
2. **Shotlist** (`seedance-shotlist-director`) — global Style Prefix + CUT-structured 15s prompts + continuity.
3. **Render** (`seedance-4k.md` doctrine) — Seedance Standard (hero/brand) vs Fast/Mini (volume), image-to-video from the locked keyframes.
4. **Assemble** — micro-splice the best seconds; harvest, don't expect one-pass.

## 6. Engine routing & the open image-provider question
- **Video:** Seedance 2.0 (4K, EN/SFX, **no real faces, no Tagalog speech**).
- **Images:** Codex CLI `gpt-image-2` locally — but **the app cannot run Codex CLI** (local-only, ChatGPT-plan auth). **OPEN QUESTION for Phase B:** in-app image gen = (a) OpenAI `gpt-image-2` **API** (pay-per-image, matches the look we're tuning) vs (b) the app's existing **Gemini** image gen (already wired, no new vendor). Recommendation: validate the look on Codex locally; for in-app, price out the OpenAI image API vs Gemini and decide before Phase B.
- **Filipino talking:** in-app/Veo + ElevenLabs. **i2v with explicit end frame:** Kling.

## 7. Tier / gating / quota
- **Business-tier** module via `MODULE_TIER` + `gateModule` (mirror `cinematic_studio`); `config/moduleIdentity.ts` entry + `App.tsx` dispatch + `Dashboard.tsx` card.
- **Quota:** one finished-ad credit per ad regardless of resolution (`api/_lib/quota.ts`); honor `SCENE_CAP`; top-ups apply. **Note:** Seedance render cost-per-clip (external API) must be modeled against the credit price — see §9 risks.

## 8. Quality doctrine (the levers)
Asset-lock first · single-variable test · micro-splicing · granular move-by-move choreography · native 4K / 10-bit / "High" bitrate (no banding) · weight & force · audio-visual sync · believability-DNA alignment (avoid AI-tells, see `believability_dna.md`) · prompts < ~1000 words, formula-first · no real faces · continuity locks.

## 9. MVP vs later · risks · metrics
- **MVP:** product-only cinematic (no character), 9:16 + 16:9, Standard mode, ≤ Business `SCENE_CAP` scenes, Codex/OpenAI image step, manual assemble (export clips). 
- **Later:** characters + state-variants, 21:9, Fast/Mini auto-tiering, in-app auto-assemble, viral-autopsy-derived style-prefix library.
- **Risks / open questions:** (1) image provider in-app (§6); (2) **Seedance API cost-per-render vs the finished-ad credit price** — could blow unit economics, model before launch (see `pricing_unit_economics.md`); (3) real-face policy (Seedance blocks uploads → always-generate); (4) Spec Studio overlap/cannibalization; (5) render latency/UX (async fire-then-poll like the Veo/Kling pattern).
- **Success metrics:** Business-tier conversion/retention lift, cinematic ads rendered/user, render success rate, cost-per-finished-ad within target margin.

## 10. Sample-video learning loop (parked)
When Neil supplies a reference video to "recreate": run **`viral-autopsy`** → swipe-file entry → distil into a reusable **Seedance style-prefix + shotlist template** for the skills. Any in-app **preset** change stays gated behind the **≥3-corroboration** rule (`viral_swipe_file.md`); a single video never auto-becomes a preset.

## Appendix — build checklist for Phase B (when the key lands)
- [ ] `api/seedance/video.ts` + `/poll.ts` + `api/_lib/seedanceAuth.ts` (mirror Kling).
- [ ] Unlock `VIDEO_MODEL_ROUTING.Seedance_2_0_*` (set `modelId`) + dispatcher branch.
- [ ] Decide + wire the in-app image provider (§6).
- [ ] Module shell: `moduleIdentity.ts` + `Dashboard.tsx` card + `App.tsx` route + `gateModule('business', …)`.
- [ ] Intake UI (§4) + render queue (fire-then-poll) + quota metering.
- [ ] Model Seedance cost-per-render vs credit price (§9) before enabling spend.
