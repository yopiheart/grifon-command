# NOW - the resume doc
**Stamped: 2026-09-27, V08 full film completed**

## Current state
Neil delegated the V07 A/B choice: "Ikaw na bahala bro". Chose B (Digital Clouds)
and completed the full 32.9s soundtrack and 1080p MP4. V04 visuals remain approved
and byte-identical. V05/V06 sound was rejected; those backups remain intact.
Neil has not yet listened to or approved this specific V08 full mix. No paid
generation, purchases, app changes, deployment, merge or product integration.

## Deliverables and backup
Branch: codex/ae-elevenlabs-reference; draft PR149:
https://github.com/yopiheart/grifon-command/pull/149
Root: workflows/assets/grifon-reference-full/
Latest: exports/grifon-your-next-ad-v08-1080p.mp4 (16,629,844 bytes).
Phone: private GitHub blob link to this file, then View raw; audio is in the MP4.
Native preview: http://127.0.0.1:4179/exports/grifon-your-next-ad-v08-1080p.mp4
Comparison: http://127.0.0.1:4179/compare.html (V08/reference/V06 selector).
Portable twin: artifacts/grifon-reference-full.html (37.8 MiB; embeds mixed MP4).
Source: audio-finish-v08.py. Cue/technical/review evidence: qa/sound-v08/.
Sources, credits, URLs and hashes: assets/audio-v07/SOURCES.md and manifest.
Raw stock and isolated work audio remain gitignored; distribute mixed video only.
Pre-V08 comparison: backups/compare-v06.html. Prior audio/source/exports intact.
Server: node workflows/assets/grifon-reference-full/serve.mjs (existing process).

## Sound direction
Licensed Digital Clouds by Alejandro Magana (A. M.), continuous source 8-40.9s.
Gain/filter changes shape the problem, reveal, dialogue and closing. 99 recorded
SFX placements cover typing, swipes, object detail, message cards and logo.
The bounded revision raised chat pops, reduced music bass and ducked arrivals;
warm contact was raised and reversed-air attacks softened. Dialogue exit sweep
was aligned to the actual 22.48s visual start. No voiceover is included.

## Verification
H.264 1920x1080/30fps,987 frames,32.900s; AAC stereo48kHz.
Final AAC -16.03LUFS/-1.35dBTP. Full AV decode and silent black tail pass.
Encoded video SHA256 matches approved V04; editable index.html hash unchanged.
Python AST, builder/comparison JS syntax, whitespace and artifact-anchor checks
pass. No application code changed, so application build/test were not run.
Native browser playback reached ended=true at32.9s, no error, unmuted.
Parent CUA:390x844 comparison screenshot inspected, no horizontal overflow;
V08/reference/V06 switch with only one audible track, play/pause/restart/seek work.
Viewport reset; page left at0s with V08 selected. No real Android-engine test.
Independent smoke agent had no browser surface. Parent checks are not independent.
Portable twin has embedded assets and parsed JS; not separately browser-tested.

## Listening evidence and limits
Existing Gemini web Flash chat reviewed first and revised full mixes, without
provider API calls/upgrades: https://gemini.google.com/app/f2c267c0b24961fd .
The assistant did not directly hear audio. The first review contained conflicting
instrument/timestamp claims; these were not accepted as facts. Targeted clarity
changes were made, then the final review reported no delivery-blocking flaw,
clearer chat cues and a smooth ending. This is not exact-reference proof or
Neil's listening approval. Detailed qualifications are in qa/sound-v08/results.md.
No stock raw assets/stems may be bundled into a future Grifon product library.

## Next action
Neil can download/watch V08 on phone. Use specific timestamped listening feedback
for any further audio changes. Do not reopen approved animation without request.
The Higgsfield tool-stack post is recorded in the brief; it did not reveal exact
skills/prompts or establish the original ElevenLabs soundtrack's provenance.

## Runtime and unrelated work
Existing FFmpeg6.0, FFprobe4.0.2 and Python/NumPy reused; nothing installed.
.codex-remote-attachments/ and workflows/assets/grifon-ae-reference/ are unrelated
pre-existing untracked files, untouched. Pilot/Spotlight/Spark and PR144/143 remain
intact; KAPE01/PR145 unrelated. No merge/publish/deploy requested.
