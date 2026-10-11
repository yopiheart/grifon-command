# Independent correctness review

Review status: four actionable findings. Report-only review against accepted base118a5e8a. No browser, GPU, FFmpeg, application suite, runtime mutation or cache mutation was performed.

## [P1] Full native shader concat rejects its own header insertion

Location: `tools/motion-launch/visual.mjs:194`. Trigger: render --project <shader-project> --from 0 --frames 932 --profile final.

Default concat auto conversion inserts H264 SPS/PPS NAL units before prefix keyframes; the exact packet payload comparison fails after710visualcaptures, so the advertised full-native path cannot succeed.

Use an intentionally packet-preserving compatible join verified against actual prefix/extradata and strict decoded pixels, or reject the unsupported path before capture. Do not merely disable auto_convert without decoder compatibility evidence.

## [P2] Play races unfinished sound-contact frame seeks

Location: `tools/motion-launch/preview-page.mjs:15`. Trigger: Select an opening sound contact, then press Play while seekFullFrame still awaits the prefix video seeked event.

draw only publishes frame after its awaited seek; Play meanwhile starts its wall clock and audio from the old frame. The selected cue can jump back and sound starts at the wrong time. Rapid pause/resume also keeps the old requestAnimationFrame chain because stop does not cancel or invalidate it.

Await completion of the requested frame before starting audio/playback and cancel or generation-guard pending RAF callbacks. Add meaningful pure async control regression coverage.

## [P2] Visual runtime key omits rendering runtime modules

Location: `tools/motion-launch/visual.mjs:92`. Trigger: Selected headless shell keeps executable/revision/version but libGLESv2.dll, libEGL.dll, V8 snapshot/resources, or Playwright core implementation bytes change.

visualRuntime only hashes ffmpeg,ffprobe,launch executable and local producer files; dependency module changes leave the same visual cache key and permit reuse under a changed actual renderer/profile implementation. This fails the stated full-runtime hash binding contract.

Bind the selected browser runtime files and relevant Playwright core/launch implementation bytes or an equivalently complete verified distribution digest; exclude mutable log/profile files.

## [P2] Windows checkout invalidates standalone proof receipt

Location: `.gitattributes:36`. Trigger: Commit generated proof files then check them out with the current core.autocrlf=true.

New preview-manifest.json and standalone-preview-build.json receive CRLF because they inherit text:auto/eol:unspecified. The builder hashes manifest rawbytes and compares receipt rawtext, so --check fails after a normal fresh checkout even with identical media/player.

Give all new byte-bound proof/source/receipt text explicit stable newline attributes and verify committed blob/fresh-checkout bytes before reporting reproducible backup.

Exact binary/VM/path evidence and source hashes are preserved in `independent-review.json`. Initial findings remain immutable; final fix review will use a new report.
