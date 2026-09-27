# NOW - the resume doc
**Stamped: 2026-09-27, V07 A/B audio auditions ready for Neil**

## Current state
V04 visuals approved. Neil rejected both V05 and V06 music/SFX. He authorized two
short audio alternatives. V07 delivers two 10-second mixes with licensed Mixkit
music and recorded SFX, plus one 22.4-second A/B reel. User preference is pending;
no new full-film soundtrack has been accepted or produced. Full MP4 export
permission persists. No app changes, purchases, paid generation or deployment.

## Deliverables and backup
Branch: codex/ae-elevenlabs-reference; draft PR149:
https://github.com/yopiheart/grifon-command/pull/149
Root: workflows/assets/grifon-reference-full/
A: exports/grifon-sound-option-a-10s.mp4 (Close Up, Michael Ramir C.).
B: exports/grifon-sound-option-b-10s.mp4 (Digital Clouds, Alejandro Magana).
Phone reel: exports/grifon-sound-ab-audition-v07.mp4 (22.4s, 7,911,151 bytes).
Reel chapters: A 1.2-11.2s; B 12.4-22.4s, separated by silent label cards.
Source: audio-auditions-v07.py. Credits/URLs/hashes: assets/audio-v07/.
Detailed technical and review evidence: qa/sound-v07/results.md and JSON reports.
Native preview: http://127.0.0.1:4179/exports/grifon-sound-ab-audition-v07.mp4
Server: node workflows/assets/grifon-reference-full/serve.mjs (existing process).
Old compare.html still offers V06/reference/V05. It was not changed for V07.
V05/V06 exports, source, audio, portable HTML and earlier backups remain intact.

## Verification
A/B each H.264 1920x1080/30fps,300frames,10.000s; AAC stereo48kHz.
A -16.31LUFS/-1.65dBTP, B -16.08LUFS/-1.37dBTP; 0.23LUFS apart.
Reel 22.400s,672frames,-16.19LUFS/-1.43dBTP. All full AV decodes pass.
Initial reel AAC-padding drift was fixed with exact segment sample trims.
Standalone A/B encoded video hashes match each other and V04's first10s.
Approved index.html hash unchanged. Python syntax and git whitespace pass.
Parent CUA: native reel ended at22.4s with no media error; 390x844 fits, viewport
reset. No real Android-engine or independent-agent check. No HTML/app edits.
Raw stock and intermediate audio are ignored; only mixed MP4 end products ship.

## Listening review and limits
Existing Gemini web Flash session used as an audio-capable reviewer, with no API
calls or upgrades. The assistant did not directly hear audio. Reference video
and audio-only analyses disagreed on exact timbres/timestamps, so these are not
verified facts. Four stock choices were shortlisted; named final A/B files were
reviewed. First mix review flagged masking and perceived abrupt endings; music
was ducked around cues and fades lengthened. Revised review reported improvement,
but B remains busier. Neil's listening decision is the creative acceptance gate.
See task QA notes for exact chat links, revisions and qualified observations.
Mixkit music/SFX license modals were read; no music-only remix or raw sample
redistribution. Do not package these assets into a future Grifon product library.

## Next action
Neil watches the A/B reel on phone via its private GitHub blob link and View raw,
or the native local preview. Ask which direction is closer, including neither.
Use his feedback before extending a selected direction across the full32.9s.
The Higgsfield setup post and source-role mapping are recorded in the task brief:
https://x.com/higgsfield_ai/status/2103958391144227149 . It is a tool-stack claim,
not an exact skill/prompt release or proof of the ElevenLabs audio's origin.

## Runtime and unrelated work
Existing FFmpeg6.0, FFprobe4.0.2, Codex Python/NumPy2.3.5 reused; no installation.
Sources and work files persist locally under ignored assets/audio-v07/ folders.
.codex-remote-attachments/ and workflows/assets/grifon-ae-reference/ are unrelated
pre-existing untracked files, untouched. Pilot/Spotlight/Spark and PR144/143 remain
intact; KAPE01/PR145 unrelated. No merge/publish/deploy requested.
