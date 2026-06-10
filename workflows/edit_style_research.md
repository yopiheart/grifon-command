# Edit Style Research — Viral Editor 2.0 (Phase A)

Date: 2026-06-10. Method: ffmpeg deconstruction (scene-cut detection at scene>0.25,
2fps frame grids, 5fps hook autopsies, volumedetect/silencedetect audio profiling)
of 6 videos — our own baseline + 3 Neil-picked viral references + 2 proven FB Ad
Library runners (One Peak Creative "Format Finder", PH, sorted by impressions).
Frame evidence lives in `.tmp/edit-analysis/<slug>/` (disposable; regenerate with
the ffmpeg commands in git history if needed). Analysis rubric follows
sandcastles.ai's dimensions: hook, storytelling format, edit style.

## 1. Baseline autopsy: CURRENT EDIT.mp4 (our renderer's output)

35.8s, 8 shots, average shot 4.48s, zero shots under 3.8s.

**HOOK BLOB CONFIRMED — severity 8/10.** Window **1.8s → 3.4s**: the start→end
frame AI morph passes through a flesh-toned amorphous mass (reads as carcass →
giant skin-egg → sweating organ → Hershey-kiss cone) before the bottle resolves
at 3.4s. It occupies the peak swipe-decision second, is flesh-colored in a
skincare ad, and the crimson "TIGNAN MO TO" box literally points at it. The
product is not legible until 3.4s; references put product/text in frame 1.

Other baseline gaps (in priority order):
1. **4 captions in 36s** — the entire problem/benefit VO plays text-free. Muted
   viewers (majority) get nothing for ~24 of 36 seconds.
2. **Zero edit grammar** — all 7 cuts are bare hard cuts; silencedetect shows one
   flat loudness wall (no SFX hits, no audio punctuation, no music dynamics).
3. **Zero camera motion** outside two generated b-roll push-ins; no punch-ins.
4. **No finishing layer** — no proof graphic, no end card; "ORDER NA" vanishes 3s
   before the video ends, so the final seconds sell nothing.
5. Same actress in 4 disconnected sets (storyboard continuity, separate issue).

## 2. Reference Edit DNA (condensed)

| | 5 Websites (58.7s) | Don't get this wrong (28.1s) | Lowe's plane UGC (19.4s) | FB Ad 1 VSL (204s) | FB Ad 2 VSL (219s) |
|---|---|---|---|---|---|
| Median shot | ~4.7s + cards every ~9s | ~4.7s | ~4.8s | 5.5s | 5.5s |
| Perceived pace driver | window-content swaps every 1.5–3s + caption churn | caption churn every 0.4–0.6s + overlay cards | live stunt escalation | invisible match-cuts + badge pop-ins | location jump-cuts mid-sentence |
| Captions | 1–3 word ALL-CAPS gold #FFD400, outline+shadow, ~35–40% h | two layers: yellow karaoke chunks ~62–75% h + accumulating headline upper third | white sentence-case, 1–2 words, ~46% h | white ExtraBold Italic, 1–3 words, ~58–63% h | white ExtraBold Italic, 1–3 words, ~52–58% h |
| Caption animation | chunk pop w/ scale overshoot | hard pop per chunk | instant swap | pop w/ slight scale punch | hard pop |
| Keyword emphasis | gold vs white per word class | whole-chunk yellow; chunk isolation | none | **solo 1-word card** for key numbers | solo word cards |
| Transitions | hard cuts + black chapter cards + open/close strobe | hard cuts + strobe bookends + jump punch-in | 2 hard cuts + 1 whip-pan blur | match-cuts + truck object-wipe + whip frames | whip-pans + mid-sentence location jumps |
| Camera | slow ±5–8% digital drift, ONE zoom-punch at CTA | constant 3–5%/s zoom-in every TH shot, punch-in at pivot | locked-off; in-world motion | always zooming 3–6%/s, push/pull alternating | never static, handheld + punch-ins |
| Product reveal | n/a (cards) | n/a | **in hand from frame 1, zero transition** | title-card slam at 41% + phone mockup | title-card slam at 45% + phone mockup |
| SFX/music | hits on cards, slammed mix | none audible; VO-slaved | pops on sticker pop-ins | limiter-touched, 1 dramatic pause in 204s | loudness-maxed, 1 pause in 219s |
| Silence ≥0.3s | **0** | **0** | **0** | 1 (deliberate, pre-payoff) | 1 (deliberate, pre-payoff) |

## 3. Synthesis — what the winners do that we don't

1. **Caption churn is the engine of perceived pace, not cut rate.** Every
   reference holds 4–7s shots but swaps a 1–3 word caption every 0.4–0.6s,
   VO-slaved. → word/chunk-level caption animation is the single highest-impact
   upgrade (Slice 4), with smaller chunks (1–3 words, not 3–4).
2. **Outline + shadow, never a background box** (box reads "lower-third TV", not
   TikTok). Gold/yellow #FFD400-class or white; emphasis via solo-word isolation
   or two-tone word classes — full karaoke fill appears in exactly one reference.
3. **Nobody morphs. Ever.** Product reveals are hard cuts, title-card slams, or
   product-in-hand-from-frame-1. Whip-pan blur (3–5 frames) is the universal
   mask for big scene changes. → validates Phase D: fix the prompt AND give the
   renderer a whip/flash cover for the hook cut.
4. **Always be zooming**: 3–6%/s push on every static shot, alternating in/out
   per shot to fake handheld energy; punch-ins reserved for pivots/CTA.
5. **Strobe/flash bookends** (1–3 frames) open and close two of three short
   references — cheap scroll-stop + clean out.
6. **Zero dead air**: VO fills ≥99% of the timeline; at most ONE deliberate
   ≤0.5s pause right before the payoff. Mix limited, near ceiling.
7. **Proof is graphic, not spoken**: follower pills, view-count chips, retention
   dashboards, chapter numerals. (Our pipeline's equivalent: "5,000 SOLD" should
   be a pill graphic with a pop, and the CTA caption must hold to the last frame.)
8. **Text on frame 1.** Hook caption is already on screen when the video starts
   (we currently delay 0.4s).

## 4. Preset calibration (applied to api/_lib/renderPresets.ts)

Evidence-driven adjustments to the v1 preset hypothesis:
- **impact**: chunkAnim `karaoke` → **`pop`** (chunk pop with scale overshoot is
  the dominant meta; karaoke fill is rare). Keep gold highlight for solo
  emphasis words later.
- **hype**: keep `word-pop` (matches FB-ad word-at-a-time cadence), gold fill.
- **Caption chunks shrink**: target 1–3 words (references) vs our current 3–4 —
  preset-driven chunk sizing in Slice 4.
- **Camera**: alternate zoom-in/zoom-out per scene when no EDL hint (FB ad rule
  "never leave a frame still"); intensities confirmed (1.06–1.08).
- **Transitions**: flash/whip/dip confirmed; whip = 3-frame blur ramp. Strobe
  bookends = future option.
- **Hook text delay** → 0 for non-classic presets (text on frame 1), Slice 3.
- **CTA hold**: punchline overlay must extend to scene end (baseline gap #4),
  Slice 3.

## 5. Storyboard flow verdict (Phase E input — TUNED, gated)

The current grammar (hook → talking bridge → alternating b-roll/talking → CTA)
matches the references structurally — "Don't get this wrong" maps 1:1 onto it.
The weakness is NOT the scene order; it's that each scene is a static block.
Renderer-side fixes (captions/zoom/transitions) close most of the gap without
touching the tuned storyboard prompt. Two storyboard-level findings worth a
gated discussion:
1. **Hook construction**: references win with text-on-frame-1 + product/person
   visible immediately. The metaphor-morph hook is structurally riskier than a
   "product in frame from the start" hook. Recommend: keep the metaphor hook as
   ONE option, add a "hard-cut reveal" hook variant (start frame = metaphor,
   END the scene on the cut, product b-roll scene follows) — kills the morph
   dependency entirely.
2. **Scene length ceiling**: no reference exceeds ~7s without a new overlay or
   cut. Our talking scenes run to 5.7s with one or zero captions — solved by
   caption churn (Slice 4), no storyboard change needed.

## 6. Hook blob fix design (Phase D input — TUNED, gated)

Root cause chain: storyboard `endFramePrompt` + video-prompt "anchor
transformation" (geminiService.ts ~2124–2131) lets the video model freely
interpolate metaphor→product → flesh-toned mush for 1.6s.
- **Prompt fix**: require a named concrete anchor (dominant color + silhouette
  position shared by both frames) and fast decisive transformation verbs;
  end-frame = product fully resolved. Diff to Neil before commit.
- **Renderer insurance** (after Slice 3): hook "reveal cover" — speed-ramp the
  morph window (setpts) + whip-blur + whoosh so residual mush flashes by in
  ~0.3s. The Edit DNA shows the blob sits mid-clip (1.8–3.4s of a 4.2s scene);
  VO-sync makes this experimental, prompt fix ships first.
