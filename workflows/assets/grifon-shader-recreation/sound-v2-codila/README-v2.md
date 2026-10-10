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

It wrote a distinct private cue sheet, timing provenance and listening draft. Exporter syntax and execution passed; the original toolkit pin and unchanged source diff passed. `qa/cue-export-v2.json` binds the inputs and output bytes at export time. Its exact pre-QA README/LISTEN drafts are preserved under `qa/cue-export-v2-draft/`; `qa/documentation-finalization-v2.json` binds these finalized documents. The exporter itself never mixes, renders, muxes or declares sound quality.

The music, native duration, end-fade derivation, black-tail allowance and empty voice track retain the initial recipe's intent. The original upstream scripts and thresholds remain unchanged. Root executed the second original mix and stream-copy mux; its original encoded QA exited 1 with **6 failures and 2 warnings**. Both permitted rounds are consumed. No third mix or QA correction is authorized by this bounded workflow.

The encoded sync offset is zero samples in all three checks, integrated loudness is -16.22 LUFS, and true peak is -1.70 dBTP. Every hero picture check passes, as do all event sync checks, music continuity and silence. The final original results remain in `qa/attempt-2/qa-report.json` and `qa/attempt-2/qa.log`.

| Remaining failed check | Measured lift | Original requirement |
| --- | ---: | ---: |
| First-lens movement audibility | 0.3 dB | at least 1.5 dB |
| Grayscale hero main body | 2.0 dB | at least 3.0 dB |
| Character-reprise hero main body | 1.1 dB | at least 3.0 dB |
| Script-arrival audibility | 1.4 dB | at least 1.5 dB |
| Storyboard hero main body | 2.9 dB | at least 3.0 dB |
| First selected typing accent audibility | 0.8 dB | at least 1.5 dB |

The two warnings concern the small picture changes at the selected E/A typing actions. The actual source character-count transitions are preserved at frames 590 and 596; their source timing and audio sync do not establish that the whole-picture detector can isolate these subtle additions. The warnings remain visible rather than being retagged or suppressed.

The independent receipt in `qa/independent/attempt-2.json` confirms preservation/transport checks, including all 932 video packets and decoded frames plus the 222-frame opening. Decoded AAC and the master each contain 1,495,040 samples; the encoded track declares 1,495,008 samples, a 32-sample (0.667 ms) difference recorded in that receipt. Its overall result remains `INDEPENDENT_TECHNICAL_AUDIO_FAIL` because the six original audio-emphasis gates failed.

The distinct alternate is `grifon-recreation-landscape-sound-v2-codila-review.mp4`. It is a **review version with failed audio-emphasis checks**, not an all-pass master, an accepted replacement or a claimed improvement over sound-v1. The root delivery receipt records separate preservation/stream-copy verification. `LISTEN-v2.md` provides five human listening checkpoints covering the remaining issues. Final human verdict is **PENDING**; no auditory quality, superiority or sonic reference match is claimed.
