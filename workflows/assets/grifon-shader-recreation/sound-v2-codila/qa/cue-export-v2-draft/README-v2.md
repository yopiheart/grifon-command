# Codila bounded correction

The final permitted correction is additive. `selection-recipe.json`, `export-cues.mjs`, the first export receipt and all first-attempt media/QA remain preserved. Use `selection-recipe-v2.json` and `export-cues-v2.mjs` for this revision; do not rerun either mix as an unrecorded third attempt.

The first encoded attempt had 14 failures and 8 warnings. The first-lens and relief changes did not satisfy the original hard-cut detector. Several contact/air cues were masked; closely spaced typing also triggered the original mixer's cluster reduction. Its encoded loudness, true peak, sync offset, music continuity and silence checks passed. These findings do not establish auditory quality.

The revision uses 23 cues and six principal accents on the source-derived ring reveal, grayscale scene change, character reprise, dark-gold glyph, storyboard and logo landing. Those picture actions passed the original first-attempt detector. Mean hero spacing is 3.890553333 seconds, with every gap at least three seconds. Each hero retains `thump+tap`, `build`, `stop_before` and the truthful cut/land tag. A new set of recorded sounds is bound separately in the root-owned `selection-v2` receipt; no synthesized effects are added.

The first lens gets an entry-zoom movement cue instead of a hard-cut hero. Shallow relief changes and most incidental material accents are omitted. Capability and particle arrivals are supporting contacts. The canvas-arrival accent is removed so it does not reduce the following key through the mixer's 0.15-second cluster rule. **Only selected newly visible non-space character indices 6 and 8 receive keys; this is not an accent on every character.** All 23 cue-to-cue gaps are at least 0.2002 seconds, and all pans are centered.

The logo exit uses the maximum discrete derivative of the actual source opacity `Math.pow(exit,1.35)`, parsed from protected `full.js`, with the action window from `full.json#/camera/endExit`. This gives frame 842 rather than the earlier generic smooth-progress frame 844. It is a source-function correction, not a manually substituted detector frame. Small typing changes can still produce meaningful picture warnings; retain the final original QA result and explain any warnings.

The actual export command was:

```powershell
node workflows/assets/grifon-shader-recreation/sound-v2-codila/export-cues-v2.mjs --out .tmp/codila-audio/attempt-2/audio
```

It wrote a distinct private cue sheet, timing provenance and listening draft. Exporter syntax and execution passed; the original toolkit pin and unchanged source diff passed. `qa/cue-export-v2.json` binds the inputs and output bytes. The exporter itself never mixes, renders, muxes or declares sound quality.

The music, native duration, end-fade derivation, black-tail allowance and empty voice track retain the initial recipe's intent. The original upstream scripts and thresholds remain unchanged. Root owns the one final actual mix, stream-copy mux, encoded QA, whole-picture verification and final delivery qualification. `LISTEN-v2.md` is the five-checkpoint human listening plan. Encoded results and final human verdict must be recorded separately; no automatic sonic match or listening approval is implied by this document.
