# Viral Swipe File

The compounding database behind the `viral-autopsy` skill: every analyzed
social video/ad gets an evidence-bound entry here, patterns accumulate in the
index, and nothing graduates to a proposal without ≥3 corroborating videos.
Read top-to-bottom at the start of every autopsy run. Maintained by
`.claude/skills/viral-autopsy/` via `tools/analyze_video.py`.

Founding data ported from `workflows/edit_style_research.md` (2026-06-10 ffmpeg
autopsy of 6 videos — full Edit DNA table and synthesis live there; entries
below are condensed pointers, not replacements).

## Pending Actions

- [x] **P9 reached 3 corroborations (2026-06-26).** E6 (authority/gastro VSL) did
  NOT corroborate (→ new candidate P10); **E7 (IM8 GLP-1 kinetic VSL) did** — Neil
  accepted it as #3 (kernel match). The `vsl` preset is now a **Gated Proposal**
  (see below). Lesson banked: P9 is a *kinetic* edit grammar, not "any long-running
  supplement ad." Ad Recon + free fbcdn download + render_audit verification all
  proven this session.
- [x] **Build Believability DNA — CAPTURE half (2026-06-26).** `analyze_video.py`
  now emits a `believability` block (6 dims + `observed_register` +
  `source_realism_verdict`, soft-captured, qualitative+confidence); the entry
  template carries a Believability table + register/authenticity line; Step 3c
  cross-checks the visual register; the P11+ family + AI-tells catalog are seeded
  (above); the source guardrail is in the skill. No tuned-prompt change.
  - [ ] **APPLY half still frozen** (spec `believability_dna.md` Next-steps 3–4):
    establish the avatar **identity-lock baseline + consistency**, then per-fragment
    **Gated Proposals** through the ≥3-`real-human` + manual-A/B-on-Veo loop. Surface
    B/C cues never touch a tuned prompt until that loop closes.
- [ ] **Decide the `vsl` Gated Proposal** (below): tuned `IMPACT` variant vs a 5th
  preset, and the ROTATION pool. Then build under `surgical-edit` + `verify-changes`
  (TUNED file `api/_lib/renderPresets.ts`). Separately design the structural kernel
  (solo number word-cards as an EDL overlay; title-card product slam) — gated.
- [ ] **`find_winning_ads.py` enhancement:** parse `asset_age_days` from the
  captured fbcdn video URL's `efg` param as a second longevity signal (the
  displayed "Started running" date resets on edit; the date filter + asset age
  are both more trustworthy).
- [ ] When the `vsl` preset ships, unpark roadmap item #11 (client-facing
  preset picker) — see `workflows/post_beta_roadmap.md`.
- [ ] When Slice 3/4 renderer work lands, re-autopsy our own FINAL_RENDER
  output and compare against baseline entry E0 to measure the gap closed.
- [ ] **Validator blind spot (found 2026-07-08, Higgsfield batch):** all 6
  sub-20s format demos failed `analyze_video.py`'s specificity gate solely on
  `why_it_works >= 3` (twice each; every other field was timestamped and
  specific). Proposal for Neil: relax to `>= 2` when `duration_s < 20`, in
  `tools/analyze_video.py`'s validator (plain tool, not tuned — but gate the
  change since it guards swipe-file quality).
- [ ] **Tool bug (2026-07-08):** `analyze_video.py` crashes at the final
  `print(json.dumps(...))` on Windows cp1252 consoles when captions contain
  emoji (UnicodeEncodeError) — the JSON is already saved, only stdout dies, and
  the wrapper misreads it as FAIL. Fix: wrap stdout in utf-8
  (`sys.stdout.reconfigure(encoding='utf-8', errors='replace')`) near the top.
  Plain tool, trivial, next session.

## Active Format Evidence Hunt (opened 2026-07-08)

Neil's pre-launch decision (plan `by-the-way-fable-precious-hellman`, approved
2026-07-08): candidate **scripting formats** are NOT built on guesses — each must
graduate through this file's standard ≥3-corroboration gate before any
`scriptType` branch is proposed for the TUNED `api/_lib/prompts.ts`
(`buildAdScriptPrompt` + `buildStoryboardPrompt` skeleton). Neil collects the
videos (TikTok/FB; `ad-recon` can mine Meta Ad Library); each goes through
`/viral-autopsy` for an evidence-bound entry. Hunt priorities:

1. **Walking / authority UGC** (extends **P10**, currently 1/3 — closest to
   threshold). Wanted: 2+ more real viral examples — credentialed-expert or
   talking-while-walking UGC in services/practitioner niches. At ≥3 → Gated
   Proposal for a first-class format branch.
2. **Before/After transformation** (0 logged). Wanted: 3+ examples —
   cleaning/derma/fitness/renovation. Product plumbing already exists (the
   `before`/`after` servicePhotos slots + venue-slot routing), so the eventual
   proposal is script-formula + storyboard-skeleton only.

Deliberately NOT hunted yet (Neil, 2026-07-08): unboxing/POV promotion (already
live as Temu sub-types), tutorial/how-to (zero scaffolding, weakest evidence),
Food/Fashion dedicated verticals (see `post_beta_roadmap.md` #19–20 resume
triggers). P9 `vsl` stays a separate queued decision (below).

## Competitor Format Intel — Higgsfield UGC format demos (2026-07-08)

**Provenance:** 6 format demos Neil pulled from Higgsfield — the formats they
productized for users AFTER doing their own "what UGC style keeps going viral
on TikTok for product/fashion" research. Secondhand market signal: a funded
competitor's bets on which formats convert.

**Classification rules for this section (stricter than Entries):**
- These are DEMOS, not proven winners (no views/longevity) → they do **NOT**
  increment Pattern Index counts. They seed hunt targets only.
- Provenance is an AI-video vendor → source-authenticity forced to
  `likely-ai (vendor demo)` and **excluded from believability corroboration**,
  even though Gemini verdicted all 6 `real-human` (conf med-high). That
  mismatch is itself a data point: Higgsfield's believability passes our
  detector (natural micro-expressions, skin texture, hand physics, lip-sync,
  lived-in backgrounds — see per-demo notes).
- All 6 hit the analyzer's `GENERIC_OUTPUT` gate on `why_it_works >= 3` even
  after the one retry — a **validator blind spot for sub-20s demos** (the
  analyses are timestamped and specific; a 15s stripped demo genuinely has ~2
  claims). Recorded here by design; see Pending Actions.

| # | Slug | Format family | Product | Dur/shots | Hook (verbatim) | Beats | Reveal | CTA |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| H1 | 4dcc2a50 | **Fashion try-on transformation** | striped set + tights | 15s / 5 (med 2.5s) | "Okay, I had to try this set. Watch this." | Setup → Reveal → Styling escalation → Verdict | in-frame @0s | none |
| H2 | 5d920c0b | **UGC talking-head demo** (Hook-Demonstrate-CTA) | snack | 13s / 4 (med 3.3s) | "I need to warn you these little guys are dangerously addictive." | Hook → Demo → CTA | in-frame @0s | spoken @10s, holds |
| H3 | 673f69ef | **ASMR unboxing (mic-check open)** | tech + dock | 15.6s / 1 (!) | "Okay, mic check, one, two. Just listen to the taps." | Hook → Reveal → Demo → CTA | unboxing @3s | spoken @12s ("tell me and I'll do it next") |
| H4 | 809b9092 | **Haul unbox → try-on → fit-proof** | gym set | 15s / 5 (med 3.2s) | "My gym set just landed, let's open it." | Hook → Unboxing → Try-on → Squat test → Verdict | unboxing @3s | none |
| H5 | 9f4320b6 | **POV handheld product demo** | phone case | 15.8s / 3 (med 4.8s) | "Wait. Wait, look at this." | Hook → Demo (shake/rustle) → Outro | in-frame @0s | none (3s dead-air outro) |
| H6 | 9f8bc173 | **Overhead aesthetic ASMR unboxing** | jewelry | 16s / 2 | *(no VO — pure ASMR taps/clicks)* | Hook (taps) → Reveal → Showcase | unboxing @3s | none |

**Shared DNA (6/6):** 13–16s · **ZERO captions** · no/minimal music · 1–5 shots
· phone-native (tripod-static or handheld-drift) · product visible ≤3s (4/6 at
0s) · conversational spoken hook ≤2s · `polished-ugc` register (H5 `raw-ugc`) ·
sensory proof beat (squat test H4, taps H3/H6, shake-rustle H5, styling
contrast H1) · natural lighting + lived-in backgrounds.

**Contradiction note (demo-class, not pattern-driving):** caption-less across
the board contradicts P1/P2/P7 (caption churn / text-on-frame-1) — Higgsfield's
product/fashion UGC bets on spoken hooks + tactile audio instead. Gemini itself
flagged the missing captions as the top weakness on 5/6 (silent scrollers).
Plausible synthesis: OUR pipeline can have both (Higgsfield performance grammar
+ Grifon caption system) — that combination is exactly what the hunt should
test against real winners.

**Hunt implications (updates the Active Format Evidence Hunt above):**
- H1/H4 (try-on transformation, fit-proof) → strengthens **Priority 2
  (before/after)**'s fashion flank; real-winner corroboration should include
  try-on transformations, not just cleaning/derma.
- H3/H6 (ASMR unboxing) + H5 (POV demo) → competitor-validated versions of the
  Temu sub-types; when Neil is ready to hunt unboxing/POV promotion, start from
  these skeletons.
- H2 (talking-head demo) → nearest to our existing Testimonial; lowest
  novelty.
- JSONs: `.tmp/viral-intel/*.json` (disposable — this section stands alone).

### NEW batch (2026-07-08 evening) — 7 more Higgsfield demos + 2 One Peak real ads

| # | Slug | Format family | Product | Dur/shots | Hook (verbatim) | Notable |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | 02af8f7c | **Hidden-feature hack demo** | blender | 11.4s / 5 | "Nobody uses this blender's secret pro mode." | open-loop secret + visual proof pour |
| N2 | 0bdf56d9 | **Skincare PAS transformation** | glow toner | 15s / 4 | "Tell me why my skin looks exhausted and textured right now?" | 1-cut 100% luminosity shift @6s |
| N3 | 17dd9ae4 | **UGC Addiction + payoff stunt** | snack | 11.2s / 7 (med 1.4s) | "Chups Light Pops, I cannot stop." | lights-out glowing-tongue payoff kills mid-dip; fastest cuts of batch |
| N4 | 3aa69d22 | **Tutorial / hack (3 steps)** | perfume | 15s / 4 | "Your perfume fades by noon? You're skipping one step." | 3 steps in 9s |
| N5 | 71d459a3 | **Before/After (cleaning)** | glass cleaner | 15.1s / 5 | "Look at this window: dust, fingerprints, and streaks everywhere." | SERVICES-adjacent; spoken CTA holds |
| N6 | 93e6c743 | **Instant beauty transformation** | highlighter | 10s / 6 (med 1.2s) | "Why do I look so flat today?" | 0.7s hand-to-lens reveal |
| N7 | e407bdfc | **Before/After (spot-clean)** | extractor | 10s / 7 | "Look at this. Coffee, mud, and hair all mashed into the fabric." | satisfying pull; CTA @0:08 holds |
| OP1 | one-peak-…863014 | **App tutorial ad (70s, REAL)** | content app | 70s / 14 | "Brainstorming content with ChatGPT is kind of like asking your mom for video ideas." | captions ON, text-on-frame-1, UI walkthrough + social proof |
| OP2 | one-peak-…935809 | **Kinetic VSL (168s, REAL)** | **Format Finder** | 168s / 28 (med 1.5s) | "Let me describe a person and you tell me if this is you." | **P1/P2/P7/P9-consistent**: 1–3-word captions @0.4s swap, white+gold emphasis, drop shadow; PAS→epiphany→proof→objections→CTA |

One Peak ads are REAL studio ads (same studio as E4/E5) — but Pattern Index
counts NOT incremented: render_audit ground-truth (Step 3c) not run this
session. Optional follow-up; P1/P2/P7 are `applied` and P9 already 3/3, so no
status would change. OP2's product is literally "proven viral formats for
creators" — the formats-as-product thesis, market-validated.

**GATE WAIVER (Neil, 2026-07-08):** the ≥3-real-winner gate is **waived** for
the UGC Pro launch build — Higgsfield catalog = competitor-validated TikTok
research; One Peak = real ads. Full PRD + taxonomy + draft skeletons:
`workflows/ugc_pro_formats_plan.md`. The Active Format Evidence Hunt above
CONTINUES for post-launch re-validation with real winners + our own telemetry.
The P3 hard-cut hook proposal ships as part of the UGC Pro storyboard branch
(update P3's status when that lands).

## Pattern Index

Status: `observed` (counting) → `proposed` (≥3 corroborations, in Gated
Proposals or applied discussion) → `applied` (shipped in Grifon).

| ID | Pattern | Corroborations | Status |
| --- | --- | --- | --- |
| P1 | Caption churn is the engine of perceived pace, not cut rate — 1–3 word chunks swap every 0.4–0.6s while shots hold 4–7s | 11 (+E8–E12); **contradicted ×4 (E15–E18 TEMU)** — TEMU product drops have ZERO caption churn; pace is the 1–2s cut rate | applied — drives Slice 4 word-pop/chunk sizing; **niche-scoped: does NOT hold for no-avatar product drops** |
| P2 | Caption treatment: outline+shadow, never a background box; gold/yellow or white; emphasis via solo-word card or two-tone | 8 (+E9–E11) | applied — renderPresets caption styles. Variance from 2026-07-12 batch: `plain` (no outline) treatment in 4/7 reels; accent color is brand-variable (green/purple/red-pink/yellow), never a box anywhere (core rule held 7/7); E14 is a 25%-height lowercase outlier |
| P3 | Nobody morphs, ever — product reveals are hard cuts, title-card slams, or in-hand-from-frame-1; whip-pan blur masks big changes | 12 (+E14; +E15–E18 TEMU — all hard cuts, product in-frame @0s) | proposed — hook blob fix (TUNED, gated; see edit_style_research §6) |
| P4 | Always be zooming: 3–6%/s push on every static shot, alternating direction; punch-ins reserved for pivots/CTA | 4 | applied — preset camera defaults; **contradicted by E3 (stunt UGC) + E6 (authority talking-head) + the whole 2026-07-12 creator batch (E8–E13: static camera, 10–15% punch-ins on emphasis/cuts ONLY, no continuous drift)** — static + emphasis-punch wins when subject/credibility carries it |
| P5 | Zero dead air: VO fills ≥99% of timeline; at most ONE deliberate ≤0.5s pause right before the payoff | 15 (+E8–E14; +E18; E15–E17 n/a — no VO exists to fill) | observed |
| P6 | Proof is graphic, not spoken — pills, chips, dashboards, numerals popped on screen | 7 (+E8,E9,E12) | observed; E6 contradicts (data spoken, not popped); E7 confirms (stat + nutrient word-cards); E8/E9/E12 confirm (phone mockups, retention chart, follower count-up ticker, article/YouTube screenshots) |
| P7 | Text on frame 1 — hook caption already on screen when the video starts | 11 (+E8,E14; +E15–E17 TEMU; E18 watermark-only = flagged, not counted) | applied — hook text delay → 0 (Slice 3) |
| P8 | Strobe/flash bookends (1–3 frames) open and close short-form edits — cheap scroll-stop + clean out | 3 (+E13) | **proposed — threshold reached 2026-07-12 (E13 flash overlay @0.4s); proposal pending Neil** |
| P11 | **UI pop-up card device**: notification/DM/comment/profile-mockup cards pop in as motion-graphic proof or callout, SFX-synced, over talking-head footage | 5 (E8–E12) | **proposed — feeds `creator-ui-pop-v1`** (omni_edit_presets.md); E9 is an ACTUAL Devin Jatho reel, upgrading that preset's secondhand-origin caveat to firsthand evidence |
| P12 | **Glitch/datamosh transition** on emphasis pivots (with glitch-whoosh SFX) | 3 (E8–E10) | **proposed — threshold reached 2026-07-12**; FFmpeg-class (filter + existing `glitch.mp3`); pending Neil |
| P13 | **SFX-per-entrance discipline**: EVERY graphic entrance/transition carries a synced hit (whoosh/pop/ding); diegetic hits on content mentions (cash-register on money, paper rustle on docs, shutter on camera motifs); music = low-key steady beat, never competing | 7 (E8–E14) | **proposed — threshold reached 2026-07-12**; E14 runs 11 hits in 51s (one per transition), E11 syncs notification pops to UI cards; ties to the SFX shopping list (omni_edit_presets.md) + Neil's per-ad custom SFX idea (grill in progress) |
| P14 | **Caption-only CTA**: "Comment "X" for the [asset]" as a silent caption overlay holding to final frame — never spoken in VO | 1 (E13) | observed (new candidate) |
| P9 | **VSL grammar — KERNEL (preset candidate `vsl`)**: white 1–3 word word-pop captions churning sub-0.5s, **solo word-cards for key numbers/nutrients**, whip-pan/match cuts, title-card product slam, post-zoom (from generation), zero dead air, text-on-frame-1. *Variable (studio/length-specific, do not bake):* 5–6s vs ~2.4s shots, reveal 40–45% vs ~62%, the single pre-payoff pause, ExtraBold-Italic vs ALL-CAPS. | 3 (E4, E5, **E7**) | **proposed** (Neil accepted E7 as #3, 2026-06-26 — kernel cross-confirmed across 2 studios + long-form & short formats) → see Gated Proposals |
| P10 | **Authority/practitioner talking-head UGC**: credentialed expert (scrubs/title-card on frame 1) → problem → solution → CTA; plain white sentence-case captions, hard cuts, *static* camera, ingredient/data points spoken in VO not popped | 1 (E6) | observed (new candidate) |
| P15 | **TEMU product-drop grammar**: NO humans (hands only), product in-frame @0s, static title-card/POV text on frame 1, hard cuts at 1–2s median, 16–27s total, music-led energy, **zero caption churn**, proof beat mid-video, weak/no held CTA | 4 (E15, E16, E17, E18) | **proposed** → see Gated Proposals (feeds the TEMU One-Shot Slice 3 re-spec). *Renumbered P12→P15 at the 2026-07-16 merge — the 2026-07-09 TEMU batch and the 2026-07-12 creator batch both claimed P12–P14 on parallel branches; creator batch keeps them (already cited by sfx_upgrade_plan/omni_edit_presets)* |
| P16 | **No-VO music-led drop (Format B)**: zero voiceover, upbeat bed carries ALL energy at lead volume, ONE static product-name/POV overlay does the verbal work, pace from cut rate alone | 3 (E15, E16, E17) | **proposed** → see Gated Proposals (validates the shipped Pure Hype `sfx_only` recipe; overlay copy register = title card, NOT churning deal text). *Renumbered P13→P16 (same 2026-07-16 merge note as P15)* |
| P17 | **AI-TTS-over-real-b-roll is winner-viable**: synthetic VO over real hands-on footage wins anyway — believability lives in the footage, not the voice (Format A thesis) | 1 (E18) | observed (new candidate — needs 2 more VO-led product-drop winners). *Renumbered P14→P17 (same 2026-07-16 merge note as P15)* |

### P18+ — Believability family (capture live 2026-06-26; see `believability_dna.md`; renumbered from "P11+" 2026-07-12 when edit-grammar rows P11–P14 claimed the range, then from "P15+" 2026-07-16 when the TEMU rows renumbered to P15–P17 at the branch merge — family unchanged, still zero rows)

What makes a *human subject* read as real and trustworthy (vs "AI slop") —
performance, voice delivery, lighting, camera/lens, image realism, lip-sync — plus
the **realism register** (`raw-ugc` / `polished-ugc` / `cinematic`). Distinct from
the Edit-DNA patterns above (P1–P10) because each cue is **surface-tagged**:

- **A** = renderer/presets (post-production) — normal review, **zero slop risk**.
- **B** = Veo 3.1 video prompt — **FROZEN** behind the ≥3 + manual-A/B loop.
- **C** = ElevenLabs TTS (cinematic/narrator-VO only) — **FROZEN**, same loop.

**Gating rules for this family** (stricter than P1–P10): a candidate corroborates
**only** from `real-human` (`source_realism_verdict`) sources — `likely-ai` winners
are excluded and instead feed the **AI-tells / avoid** catalog below. Believability
rows are created the first time a `real-human` autopsy surfaces a recurring
believability cue (same lifecycle as P1–P17) — **number them P18+ (P11–P14 were
claimed by the 2026-07-12 creator batch, P15–P17 by the 2026-07-09 TEMU batch at
the 2026-07-16 renumber)**; Surface B/C rows can reach
`proposed` only via `believability_dna.md`'s validation loop, never a bare ≥3.

*(No rows yet — seeded empty on purpose; the first `real-human` autopsy populates them.)*

## Gated Proposals

*Tuned-prompt / preset proposals awaiting Neil. Only patterns with ≥3
corroborations may appear here. The viral-autopsy skill never applies these.*

- **P3 → hook construction (TUNED):** add a "hard-cut reveal" hook variant
  alongside the metaphor-morph hook (end scene on the cut; product b-roll scene
  follows), killing the morph dependency. Evidence: 5/5 references, plus
  baseline blob severity 8/10. Full design: `edit_style_research.md` §5–6.
  Status: with Neil.

- **P9 → new `vsl` Edit Style Preset (TUNED — `api/_lib/renderPresets.ts`).**
  Evidence: 3 corroborations (E4, E5 One Peak long-form VSLs; E7 IM8 GLP-1 kinetic
  VSL) — kernel cross-confirmed across 2 studios + 2 formats. **Proposed, never
  applied — for Neil. The kernel maps cleanly onto the existing `RenderPreset`
  shape; it's close to `IMPACT`+`HYPE`, so the cheapest path may be a tuned
  `IMPACT` variant rather than a 5th preset.** Concrete starting values:

  | Field | Proposed `vsl` value | Why (kernel evidence) | Closest existing |
  | --- | --- | --- | --- |
  | `caption.fontFile` | `Anton-Regular` or `Montserrat-ExtraBold` | white ExtraBold/condensed caps (E4/E5 Italic, E7 ALL-CAPS — case is the *variable* axis, weight is the constant) | IMPACT (Anton) |
  | `caption.chunkAnim` | `word-pop` | 1–3 word pop, sub-0.5s churn (E7 swap ~0.4s, verified) | HYPE |
  | `caption.boxAlpha` / `borderWFrac` | `0` / `~0.08` | outline, never box (P2) | IMPACT |
  | `caption.fillColor` / `highlightColor` | `white` / accent on numbers | color-shift emphasis on key numerals (E7) | IMPACT |
  | `transition.kind` / `everyN` / `halfDurSec` | `whip` / `2` / `~0.05` | whip-pan/match cuts on alternating cuts (E4/E5/E7) | HYPE |
  | `hook.layout` / `reveal` | `title-stack` / `slam` | text-on-frame-1, punchy reveal (P7) | IMPACT |
  | `sfx.maxWhoosh` | `~4` | whoosh hits on cuts (E7) | HYPE |
  | `camera.*` | **leave `intensity: 0`** | ⚠️ P9's "always-zoom" comes from **generation**, NOT the renderer — adding renderer zoom contradicts the locked pulse-guard (Neil 2026-06-10). Do NOT bake. | all presets |
  | `ROTATION` pool | Neil's call (DR/`temu`? new `vsl` script style?) | VSL is long-form direct-response, distinct from mrbeast/testimonial | — |

  **NOT in this preset (separate, also gated):** the *structural* kernel —
  **solo word-cards for key numbers/nutrients** (needs a new EDL overlay variant,
  not a caption-style field), the **title-card product slam** at a mid-point, and
  the **educational runway / one pre-payoff pause** — these are storyboard/EDL +
  prompt concerns (`prompts.ts` / EDL), to be designed under `surgical-edit` +
  `verify-changes`, never as an autopsy side effect.
  Status: with Neil.

- **P15 + P16 → TEMU One-Shot prompt re-spec (TUNED — `api/_lib/prompts.ts` adscript + storyboard Temu branches).** *(IDs renumbered from P12+P13 / E8–E11 at the 2026-07-16 merge — see the E15 entry note.)*
  Evidence: P15 at 4/4 (E15–E18), P16 at 3/3 (E15–E17) — Neil's own most-recent-viral batch,
  every timing figure ffmpeg-verified via `render_audit.mjs`. This IS the evidence gate for
  **Slice 3** of the approved TEMU plan (`~/.claude/plans/tsaka-bro-ung-temu-streamed-mochi.md`);
  plumbing (audioMode axis + Pure Hype recipe + fast-cut EDL targets) already shipped as
  Slices 1–2 (commits d103cd0/6c792ed/6f037db). Proposed prompt-facing implications, for Neil:
  - Storyboard Temu branch: zero humans incl. the current "Avatar reaction" scene (hands
    allowed; non-talking avatar b-roll ONLY for worn/on-body products per Neil's Format A rule
    — note: none of E15–E18 needed one); product in-frame @0s; 7–10 scenes at 1–2s cuts,
    **16–20s total** (evidence range 16–18s no-VO, 27s VO demo); one proof/stress-test beat.
  - Overlay copy register: ONE static product-name/POV title card on frame 1 (1–8 words),
    NOT churning deal text; optional deals card near the close (E18 @21s) — maps to the
    existing end-card mechanism.
  - Format A (VO) script register: benefit-per-cut spec-rattle like E18's transcript;
    TTS voice is fine (P17) — no talking human ever.
  - E15–E17 had NO SFX hits (music only); E18 used 4 action-synced hits → keep SFX
    optional/action-synced for Format B, not the default whoosh-on-overlay map.
  Status: with Neil (drafts to be produced under the Slice 3 gate — this proposal is the
  autopsy+evidence half; the `grifon-cmo` conversion pass is the other half).

## AI-tells / avoid (anti-pattern catalog)

*The inverse of the Believability family: cues that made a `likely-ai`-verdicted
source read **fake**. These winners are excluded from believability corroboration
(they may be long-running but they're slop) — what makes *theirs* fake is exactly
what to avoid in *ours*. Populated as `likely-ai` `source_realism_verdict`s accrue;
each entry cites the autopsy + the specific tell (skin/hands/teeth/eye artifact,
lip-sync drift, impossible lighting, plastic over-clean texture).*

- **2026-07-09 · E18 (verdict `mixed`; renumbered from E11 2026-07-16) — synthetic TTS cadence.** The one AI element in an
  otherwise real-footage TEMU winner: "slightly robotic cadence and pronunciation throughout"
  + a mispronunciation @22s ("flexible"→"flat"). Tell, not a killer — the ad wins anyway (P17).
  Avoid-lesson for OUR Format A: phonetic-normalize product/spec words (we already have
  `phoneticNormalizer.ts`) and keep VO lines short/benefit-per-cut so cadence flaws can't
  accumulate. Footage realism is what carried it — never pair TTS with synthetic-looking b-roll.

## Entries

### 2026-06-10 — E0 BASELINE: CURRENT EDIT.mp4 (our renderer, skincare PH)
**Why autopsied:** own-output baseline to measure references against.
**Format:** hook→bridge→alternating b-roll/talking→CTA, 35.8s, 8 shots (avg 4.48s, none under 3.8s)
Hook blob 1.8–3.4s (severity 8/10, product illegible until 3.4s); 4 captions in
36s; zero edit grammar (7 bare hard cuts, flat loudness); zero camera motion
outside 2 push-ins; CTA vanishes 3s before end. Full autopsy:
`edit_style_research.md` §1. **So What:** the entire Slice 3/4 + Phase D punch
list. **Patterns:** violates P1–P8 (that's the point).

### 2026-06-10 — E1 "5 Websites" (Neil-picked viral ref, tech/listicle)
58.7s, median shot ~4.7s + chapter cards every ~9s; pace from window-content
swaps every 1.5–3s + caption churn; gold ALL-CAPS outline+shadow captions,
chunk pop w/ scale overshoot; black chapter cards + open/close strobe; ±5–8%
drift, ONE zoom-punch at CTA; 0 silences. Details: `edit_style_research.md` §2.
**Patterns:** P1, P2, P4, P5, P8.

### 2026-06-10 — E2 "Don't get this wrong" (Neil-picked viral ref, talking-head)
28.1s, ~4.7s shots; caption churn every 0.4–0.6s in two layers (yellow karaoke
chunks + accumulating headline); strobe bookends + jump punch-in; constant
3–5%/s zoom-in per talking-head shot; 0 silences; maps 1:1 onto our storyboard
grammar. **Patterns:** P1, P2, P4, P5, P7, P8.

### 2026-06-10 — E3 Lowe's plane UGC (Neil-picked viral ref, stunt UGC)
19.4s, ~4.8s shots, locked-off camera; pace from live stunt escalation, not
edit; product **in hand from frame 1, zero transition**; white sentence-case
1–2 word captions, instant swap; pops on sticker pop-ins; 0 silences.
Contradiction note: wins with static camera (P4 contradiction — stunts carry
their own motion). **Patterns:** P1 (partial), P3, P5, P7; contradicts P4.

### 2026-06-10 — E4 FB Ad 1 VSL (One Peak Creative "Format Finder", PH, by impressions)
204s, 5.5s shots; invisible match-cuts + badge pop-ins; white ExtraBold Italic
1–3 word captions, pop w/ scale punch, **solo 1-word cards for key numbers**;
title-card product slam at 41% + phone mockup; always zooming 3–6%/s
push/pull; ONE deliberate pre-payoff pause in 204s. **Patterns:** P1, P2, P3,
P4, P5, P6, P7.

### 2026-06-10 — E5 FB Ad 2 VSL (One Peak Creative, PH, by impressions)
219s, 5.5s shots; whip-pans + mid-sentence location jump-cuts; white ExtraBold
Italic 1–3 word captions, hard pop, solo word cards; title-card slam at 45% +
phone mockup; never static (handheld + punch-ins); loudness-maxed, ONE
pre-payoff pause. **Patterns:** P1, P2, P3, P4, P5, P6, P7.

### 2026-06-26 — E6 IM8 gastroenterologist VSL (fb-ad-library, supplements)
**Why autopsied:** Ad Recon's **first live run** (`spy_intel.md`). IM8 Health's #2
most-scaled video ad (top of the impressions sort, `view_all_page_id=345914995276546`);
displayed "Started running" Jun 9 (17d) but the fbcdn URL's `asset_age_days=52`
— the creative has been in rotation ~52 days (date resets on edit). Picked to
test the handoff hypothesis that an IM8 authority-testimonial would push **P9**.
· **File:** `.tmp/viral-intel/im8-gastro-847677991322874.json` (disposable)
**Format:** Authority Hook→Problem→Solution→CTA talking-head UGC, 39s, 9 shots (median 3.0s; one 15.2s static tail)

| Hook | Pace driver | Captions | Edit grammar | Camera | Reveal | CTA |
| --- | --- | --- | --- | --- | --- | --- |
| "As a practicing gastroenterologist, I know" — text on frame 1 @0.0s, bold-claim authority (scrubs + title card) | b-roll content swaps (5 cuts / 13s) vs slow talking-head — **not** caption churn | white + black-outline, **sentence case, 3–6 words**, instant swap ~1.5s, **no emphasis** | light-leak flash @1.0s, otherwise **all hard cuts**; ambient synth pad; **0 silences** | **handheld static**, minor shake (no zoom) | @10.5s (27%), **hard cut** | @25s pinned overlay, holds to final frame |

**Why it works (timestamped):**
1. Immediate authority — scrubs + "gastroenterologist" title card within @1.0s (high)
2. Clear product demo — 9.6s open/pour/shake/present sequence @14.2s (high)
3. Specific ingredient data — "3g prebiotic soluble fibre", "90+ ingredients" @30s, but **spoken in VO, not graphic word-cards** (medium)

**Weaknesses:** the 15.2s static talking-head tail around the CTA risks drop-off before the offer lands.

**So What for Grifon:**
- Authority-credential cold-open (credential title card on frame 1) → target: `grifon-cmo` hook template (a Bryan/Olivia "as a [credential]…" variant) — a **message** pattern, not a renderer change.
- Plain sentence captions + hard cuts + **static** camera win here → **evidence the kinetic P9 grammar is not universal**; do NOT cargo-cult zoom/word-pop onto authority-UGC. → none (record-only; would be TUNED/gated anyway).
- `asset_age_days` embedded in the fbcdn video URL is a **truer longevity signal** than the displayed "Started running" date → target: `tools/find_winning_ads.py` enhancement (parse `asset_age_days` from the captured video URL as the longevity field).
**Patterns:** corroborates **P3** (hard-cut reveal, no morph), **P5** (zero dead air), **P7** (text on frame 1); partial **P2** (white outline, no box — but no emphasis mechanic); **contradicts P4** (wins with a static camera — 2nd P4 contradiction after E3, and this one is a talking-head, not a stunt); **does NOT corroborate P9** (edit-DNA mismatch on every axis — message-similar ≠ grammar-similar). New candidate: **P10**.
**Verified (2026-06-26):** cross-checked with `tools/render_audit.mjs` (ffmpeg ground-truth timing + still-frame OCR). Gemini's numbers held within tolerance — duration 39.0 vs ffmpeg 38.15s; shots 9 vs ~7–8; longest 15.2 vs 14.4s; captions 3–6w/1.5s vs observed 2–4w/~1–2s; transcript matched verbatim across two independent reads + the burned captions. Single pass missed only the pinned `USE CODE "DRALAN"` overlay + white CTA band + karaoke-build captions (called "instant swap") — none change the P9 verdict.

### 2026-06-26 — E7 IM8 "GLP-1 / Daily Essentials PRO" VSL (fb-ad-library, supplements)
**Why autopsied:** Ad Recon's first **date-filtered genuine winner** — IM8's own
ad that cleared the `start_date[max]` longevity gate (displayed May 19 = 38d;
fbcdn `asset_age_days=44`). Picked to re-test **P9** on a *proven* long-runner
after E6 (authority-UGC) missed. · **File:** `.tmp/viral-intel/im8-glp1-1019504114362909.json` (disposable)
**Format:** kinetic VSL, hook-problem-agitate-solve (educational), 62s, ~20 shots (ffmpeg; median ~2.4s) — a fast TikTok-native VSL vs E4/E5's 200s+ long-form.

| Hook | Pace driver | Captions | Edit grammar | Camera | Reveal | CTA |
| --- | --- | --- | --- | --- | --- | --- |
| "Three stages people go through on GLP-1" — text on frame 1 @0.4s, curiosity gap | sub-second caption churn + ~2.4s cuts + content swaps | **1–3 word ALL-CAPS, white+red, ~0.4–0.8s swap**, color-shift emphasis, **solo word-cards** (`ENERGY`,`FATIGUE`,`10 BILLION`,`[16+]`, nutrient cards `Mg/B12/CoQ10/Zn`) | whip-zoom @4.8s, slide, cross-dissolve, **whoosh SFX hits**; synth bed; **0 silences** | static + post digital zooms/pans | **title-card slam** "I·M·8 Daily Ultimate Essentials" @~38.5s (~62%) | end card @~60s + clinical stats + money-back |

**Why it works (timestamped):**
1. Targeted curiosity hook — names "GLP-1" + warns of "Stage 3" in first 3s (high)
2. Rhythmic kinetic pacing — ~20 cuts + sub-second caption churn over 62s prevents drop-off (high)
3. Value-first structure — ~38s (62%) of physiology education before the pitch (high)
4. Graphic proof — "95% felt an energy boost", "85% better digestion" stat cards near the close (medium)

**Weaknesses:** late product reveal (~62%) risks pre-pitch drop-off; the long education runway is the bet.

**So What for Grifon:**
- This is the **kinetic VSL grammar** P9 describes, corroborated by a 3rd independent video (different studio, shorter format) → strengthens the `vsl` preset case. → target: `renderPresets.ts` `vsl` candidate (TUNED/gated — Gated Proposal).
- Solo word-cards for numbers/nutrients + sub-0.5s caption churn → the word-pop/chunk engine Slice 4 already targets (P1/P6); confirms it generalizes to VSLs.
- `grifon-cmo`: the "3 stages / Stage 3 is where it costs you" agitation + GLP-1 audience-naming is a reusable hook structure.
**Patterns:** corroborates **P1** (sub-0.5s caption churn), **P3** (title-card/hard-cut reveal, no morph), **P5** (zero dead air), **P6** (graphic proof + word-cards), **P7** (text on frame 1); **P9 kernel** — hits the *distinctive* P9 elements (1–3w word-pop captions, **solo word-cards for numbers**, whip-pans, title-card product slam, post-zoom) but diverges on the E4/E5-specific specs (shots ~2.4s not 5–6s; reveal ~62% not 40–45%; no pre-payoff pause; ALL-CAPS not Italic).
**Verified (2026-06-26):** `render_audit.mjs` — duration 62.0 vs ffmpeg 62.21s; shots 24 vs ffmpeg ~20; median 2.0 vs ~2.4s; caption swap 0.4s confirmed (new caption nearly every 0.5s frame); solo word-cards + title-card slam confirmed off frames; transcript matched verbatim. Reads trustworthy.

### 2026-07-09 — E15 TEMU bottle-carrier bag drop (tiktok/savetik, TEMU e-comm product drops)

*(Batch renumbered E8–E11 → E15–E18 and P12–P14 → P15–P17 at the 2026-07-16 branch
merge: this TEMU batch and the 2026-07-12 creator batch claimed the same IDs on
parallel branches; the creator batch keeps E8–E14/P11–P14 because sfx_upgrade_plan
and omni_edit_presets already cite them.)*
**Why autopsied:** Neil-picked batch of TEMU's most recent virals (4 videos) — evidence base for the TEMU One-Shot recipe re-spec (Format A/B, plan `tsaka-bro-ung-temu-streamed-mochi`). File: `.tmp/viral-intel/savetik-1783598750.json` (disposable).
**Format:** feature showcase, **16.0s, 8 shots (ffmpeg; median 1.3s)** — **NO VO** (music-led).

| Hook | Pace driver | Captions | Edit grammar | Camera | Reveal | CTA |
| --- | --- | --- | --- | --- | --- | --- |
| "POV: you found the perfect bag for your water bottle✨" static text ON frame 1 @0.25s | 1.3s median hard cuts + hands packing 5 items in 9s | ONE persistent mixed-case POV line (no churn, no karaoke) | hard cuts only; lo-fi R&B bed, no SFX hits | handheld close-ups, hands only | product in-frame @0s | none |

**Realism register:** `polished-ugc` · **Source-authenticity:** `real-human` — real hands/fabric/daylight (high). No human face, no voice.
**Why it works:** product-in-use @0s (high); 5-item packing density in 9s window (high); POV hook line does ALL the verbal work — music carries energy (high).
**Weaknesses:** no CTA anywhere; identification rides entirely on the one text line.
**So What for Grifon:** direct Format B (Pure Hype/`sfx_only`) corroboration — no VO, BGM-led, ONE static hook overlay from frame 1 (NOT churning deal text). → target: storyboard/adscript TEMU re-spec (TUNED, gated — Slice 3) + overlay copy register.
**Patterns:** corroborates P3, P7; **contradicts P1** (zero caption churn — pace is cut-rate + in-frame action); new candidates → P15, P16.
**Verified (2026-07-09):** `render_audit.mjs` — ffmpeg 15.98s / 8 scenes / median 1.30s (Gemini overcounted 13 → trust ffmpeg); frame-OCR confirms single persistent POV caption from 0.25s; "No voiceover present" confirmed.

### 2026-07-09 — E16 TEMU foldable storage cabinet drop (tiktok/savetik, TEMU e-comm product drops)
**Why autopsied:** same Neil batch. File: `.tmp/viral-intel/savetik-1783598899.json` (disposable). *Specificity note: passed on quantified fields; 3rd why-claim was qualitative (excluded below).*
**Format:** product demo (assembly→styling), **17.7s, 14 shots (ffmpeg; median 1.07s)** — **NO VO** (music-led).

| Hook | Pace driver | Captions | Edit grammar | Camera | Reveal | CTA |
| --- | --- | --- | --- | --- | --- | --- |
| "TEMU / Foldable storage cabinet" title card ON frame 1 @0.25s (persists ~2s) | 1.07s median hard cuts; flat-pack → assembled in first 3s across 3 cuts | product-title card only, no churn | hard cuts; upbeat pop (female vocals) bed, no SFX | handheld close-ups, hands only | product in-frame @0s | none |

**Realism register:** `polished-ugc` · **Source-authenticity:** `real-human` — real hands, lived-in room (high).
**Why it works:** instant value demo — flat-pack to assembled in <3s (high); feature density across 14 cuts in 17.7s (high).
**Weaknesses:** no CTA; vocal music bed would fight a VO if one were added (none is).
**So What for Grifon:** Format B corroboration #2 — and the overlay is a **product-name title card**, not price text. Assembly-speed-as-hook maps to our Scale/In-Use beats. → Slice 3 re-spec evidence.
**Patterns:** corroborates P3, P7; contradicts P1 (no churn); P15, P16.
**Verified (2026-07-09):** `render_audit.mjs` — ffmpeg 17.69s / 14 scenes / median 1.07s (Gemini undercounted 10 → trust ffmpeg); title card on frame 1 confirmed via OCR @0.25–1.75s; no VO confirmed.

### 2026-07-09 — E17 TEMU mirror shoe organizer drop (tiktok/savetik, TEMU e-comm product drops)
**Why autopsied:** same Neil batch. File: `.tmp/viral-intel/savetik-1783599010.json` (disposable).
**Format:** product showcase, **17.8s, 11 shots (ffmpeg; median 1.93s)** — **NO VO** (music-led).

| Hook | Pace driver | Captions | Edit grammar | Camera | Reveal | CTA |
| --- | --- | --- | --- | --- | --- | --- |
| "TEMU / MIRROR SHOE ORGANIZER" ALL-CAPS title card ON frame 1 @0.25s | ~1.9s median hard cuts; compartments opening one after another | title card only (re-shown @2.75s), no churn | hard cuts; upbeat pop/R&B bed, no SFX | handheld close-ups, hands only | product in-frame @0s | none |

**Realism register:** `polished-ugc` · **Source-authenticity:** `real-human` (high).
**Why it works:** curiosity-gap title on a novel product @0s (high); 5 compartments revealed inside 10s (medium); utility contrast (mirror = furniture that hides storage) (medium).
**Weaknesses:** no CTA; slowest cut rate of the batch (still <2s median).
**So What for Grifon:** Format B corroboration #3 — **crosses the ≥3 gate**. Novel-product curiosity hook + reveal-per-cut structure = our Hook/Variety beats. → Slice 3 re-spec evidence.
**Patterns:** corroborates P3, P7; contradicts P1 (no churn); P15, P16 (both now at 3+).
**Verified (2026-07-09):** `render_audit.mjs` — ffmpeg 17.75s / 11 scenes / median 1.93s (Gemini overcounted 15 → trust ffmpeg); ALL-CAPS title card @0.25s confirmed via OCR; no VO confirmed.

### 2026-07-09 — E18 TEMU 9-in-1 tablet stand/dock demo (tiktok/savetik, TEMU e-comm product drops)
**Why autopsied:** same Neil batch — the one WITH a voiceover. File: `.tmp/viral-intel/savetik-1783599232.json` (disposable).
**Format:** feature-showcase demo, **26.8s, 23 shots (ffmpeg; median ~1.1s)** — **AI TTS VO**, hands-only.

| Hook | Pace driver | Captions | Edit grammar | Camera | Reveal | CTA |
| --- | --- | --- | --- | --- | --- | --- |
| "Grab this nine-in-one tablet stand…" spoken @0s + "TEMU Tech Finds" watermark on frame 1 | ~1.1s median hard cuts + benefit-per-cut VO | **none** (no caption track; only incidental product/screen text) | hard cuts; SFX hits (scratch @4s, thud @5s, plug @10s, click @15s); lo-fi bed under VO | static close-ups, minor pans, hands only | product in-frame @0s | TEMU deals/"SHOP NOW" card @~21s (not held to end) |

**Realism register:** `polished-ugc` · **Source-authenticity:** `mixed` — real footage + clearly synthetic TTS VO (high). Proof beats: scratch test @4s, water-jug weight test @5s.
**Why it works:** product in use within 0.5s (high); two durability proofs inside a 3s window (high); 23 cuts/26.8s keeps momentum (medium).
**Weaknesses:** TTS mispronunciation @22s ("flexible"→"flat", minor); no held end-CTA; zero captions locks out muted viewers.
**So What for Grifon:** direct **Format A** (TTS, zero talking avatar) corroboration — TEMU ships synthetic VO over real hands-on b-roll and it WINS; believability lives in the footage, not the voice. Proof-beat grammar (stress test) → storyboard Proof beat. Gemini's first read said "no CTA" — ffmpeg/OCR found the @21s deals card; trust the audit. → Slice 3 re-spec evidence (1 corroboration; needs 2 more VO-led TEMU winners before Format A prompt specifics graduate).
**Patterns:** corroborates P3, P5, P7 (watermark-as-frame-1-text is a weak read — flag, not full count); contradicts P1 (zero captions); P15; new candidate P17 (AI-TTS-over-real-b-roll acceptable).
**Verified (2026-07-09):** `render_audit.mjs` — ffmpeg 26.75s / 23 scenes vs Gemini 26 (within tolerance); transcript verbatim match; TTS confirmed; deals card OCR @21.25s.

### 2026-07-12 — E8–E14 batch: Neil's 7 IG reels (ai-editor Mode B intake)

**Why autopsied:** Neil dropped 7 reels 2026-07-12 asking what presets they yield.
Full Mode B: yt-dlp download → `analyze_video.py` Edit-DNA → **mandatory
smoke-tester frame verification** (117 tool uses; several DNA claims corrected —
corrections noted per entry). All 7 `source_realism_verdict: real-human`. Triage
in `omni_edit_presets.md` intake queue; preset decisions pending Neil's pick.
Files were `.tmp/reels-intake/` (disposable; re-downloadable by shortcode).

### 2026-07-12 — E8 "TAM / why your videos get 200 views" (instagram DaNydEQN5Dc, creator-economy talking-head)
47.2s, 5 shots; static + 10–15% punch-ins @14/@40.5; **plain white sentence-case**
1–3w captions ~0.3s swap (DNA's "white and green, lowercase" corrected on frames —
no green on captions, sentence case); glitch/datamosh @14.5 + B&W quote segment
@40.5; proof graphics: dual phone mockups @1.0 ("200"/"273" views), retention
chart @16.5, ✕/✓ kinetic checklist @24.5–31 (missed by DNA, caught on frames);
swoosh/pop/whoosh hits synced to entrances; 0 silences.
**Patterns:** P1, P5, P6, P7, P11 (phone-mockup cards), P12, P13; P4 contradiction (static + emphasis-punch only).

### 2026-07-12 — E9 "Optimize your Instagram profile" (instagram DHgVUG3x5YV, **an actual Devin Jatho reel**)
95.8s, 17 shots; ALL-CAPS pop captions, white + green AND purple accents (DNA's
"green only" corrected); UI cards throughout: IG profile mockups with **follower
count-up ticker** @7–8 ("98.9K"), Medium article screen @51, YouTube video-card
mockup @84 ("Devin Jatho / Content Guru"), **iOS push-notification card @94.5**
(missed by DNA); glitch @2, slide @8; whoosh + keyboard-typing SFX; 0 silences.
**FIRSTHAND JATHO EVIDENCE for `creator-ui-pop-v1`** — the exact corroboration
path its origin caveat named.
**Patterns:** P1, P2, P5, P6, P11, P12, P13.

### 2026-07-12 — E10 "Should you ever record 3 takes" (instagram DE7d5gzxAXk, creator-economy listicle)
56.9s, 24 shots; **camera-viewfinder REC-HUD frame device** (REC dot + battery)
opens AND closes the reel — new-device candidate, no existing preset covers it;
ALL-CAPS white + red/purple gradient, outline+shadow; profile-grid mockup @9–11.5
(DNA's "589K" corrected: actual counts 202K + 339K/61.3K); "REASON 1/2/3"
pill-list reveal @16 + memoji speech bubble @26 (both missed by DNA); camera-shutter
+ glitch-whoosh SFX; glitch @12; 0 silences.
**Patterns:** P1, P2, P5, P6, P11, P12, P13.

### 2026-07-12 — E11 "Editors ↔ business owners" (instagram DPCEQYdjbPz, matchmaking CTA reel)
32.8s, 10 shots; diagonal-wipe split screens @0.5/@2.5; comments-panel overlay
@15–17.5 (flag-reply mechanic) + DM mockups @25.5–28.5 incl. a **bad-pitch /
"You've been blocked" counter-example** (missed by DNA); notification-pop SFX
synced to each card; mixed-case white+yellow outline+shadow captions.
**CAUTION — impersonation device:** the "Hormozi" figure is a lookalike actor in
Acquisition.com merch and the "hormozi" commenter is a mock unverified account
(DNA's "Alex Hormozi / 3 recognizable creators" claims corrected on frames). Card
mechanics count as corroboration; the device itself must NOT be copied into
customer ads.
**Patterns:** P1, P2, P5, P11, P13.

### 2026-07-12 — E12 "17yo making $1M/mo" (instagram DJ8xn1XMR56, podcast 2-cam clip)
34.3s, 8 shots; **real multi-cam**: hard cut speaker→interviewer @6.0 on a
sentence boundary (what `angle-switch-v2` fakes — validates its design); pixel-art
platform-icon badges @2.5; YouTube nav-bar UI animation @8–9 (missed by DNA);
Minecraft-Short mockup with verbatim Reddit clickbait card @9.5; **Google-Doc
typewriter reveal** @20.5 ("Crayo AI"); diegetic SFX: cash-register @3.5 on the
money line, paper rustle @20; ALL-CAPS white+pink captions.
**Patterns:** P1, P2, P5, P6, P11, P13.

### 2026-07-12 — E13 "Fitness will make you rich" (instagram DHnbKjUJ89o, interview clip, register: cinematic)
16.6s, 5 shots; kinetic type + 💰 emoji @2.0; **B&W CGI body-scanner insert
@5.5–7.0** — DNA's single biggest miss of the batch, caught only on frames
(generation-class metaphor b-roll, NOT an edit move → routes to storyboard/Veo in
product, not an Omni preset); light-leak/bokeh overlay @8.5; **flash overlay @0.4
→ P8's third corroboration, threshold reached**; caption-only CTA @15–16
("Comment "file" for the project file", green highlight, holds to end, never
spoken — new P14); whoosh + money-rustle SFX.
**Patterns:** P5, P8, P13, P14.

### 2026-07-12 — E14 "7 best transitions" (instagram DChxOtHPDQQ, transitions listicle)
50.8s, 25 shots; **all 7 transitions are PHYSICAL capture-time techniques** (match-cut
outfit change, whip pans ×2, jump-cut outfit changes, spin, lens cover ×2, comment
grab, clone effect) — filming technique, not post/preset material; recurring
numbered "NUMBER N / [NAME]" yellow-label system (FFmpeg-class device); the hook's
comment-reply card @0.5 is reused as a physical prop @38.5 ("comment grab");
**11 SFX hits in 51s — one per transition** (P13's strongest single datapoint);
lowercase small captions @25% height (P2 outlier); 0 silences.
**Patterns:** P3 (whip-pan masking), P5, P7, P13; P1 partial.
