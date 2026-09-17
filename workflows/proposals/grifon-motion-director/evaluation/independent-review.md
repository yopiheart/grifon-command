# Independent source review

Review date: 2026-09-17. Reviewer is a separate agent from the candidate/demo builders. The reviewer previously authored rubric-exposed baseline planning outputs; this review is independent of implementation, not a blind evaluation. No implementation files were edited.

Scope read: candidate/SKILL.md, install.patch (including treatments and eval data), current demo composition.template.html, build.mjs, demo.json, render.mjs, revision-check.mjs, README.md, and tools/artifacts/build-motion-director-review.mjs. Policy references: full DESIGN.md, brand-spec.md, repository AGENTS.md/desktop workflow, and existing Creative Director, AI Editor and brand-check guidance. Also inspected the installed Hyperframes 0.7.68 CLI's snapshot description-flag parsing.

## Verdict

No open actionable source-level findings. The original P2 branding conflict and P3 reproduction-command omission are resolved. Final-delta review found no new render, audio-verifier, revision-script or review-artifact code defect. The applied skill matches the approved candidate text across all four files, with only Windows CRLF checkout differences. This is not a visual, listening or final-media approval.

## Resolved finding

**P2 - Demo lockup conflicted with the canonical creative asset rule: RESOLVED IN SOURCE.**

The original build selected public/logo-badge.png and the opening lockup said GRIFON AI, contrary to brand-spec.md. The revised build now embeds public/logo.png; the template provides a transparent thin gold ring, unchanged contained image and italic GRIFON wordmark. demo.json retains DESCRIBE, BUILD, LAUNCH and the separate GRIFON.AI address. The candidate now explicitly reads brand-spec.md for canonical assets and gives it precedence over conflicting historical skill summaries/templates. Verify the final rerender contains these corrected sources; this reviewer did not inspect the video visually.

## Source review observations

- Candidate routing explicitly separates authored graphics from reference-only analysis (Viral Autopsy), ordinary trim/music/preset edits (AI Editor), Marvin generation and application features. Existing AI Editor has a Hyperframes lane, but the candidate points to that lane rather than replacing its ownership. No concrete routing contradiction found. Actual automatic skill activation was not tested.
- Paid-operation policy explicitly covers AI generation, analysis and QA; historical claims that a tool is free do not authorize provider calls. Local delivery/publication boundaries are stated. No concrete spending-policy gap found.
- render.mjs discovers the existing pinned Hyperframes cache entry and local FFmpeg/FFprobe/browser paths. It throws on unavailable dependencies and has no install or cloud fallback. Snapshot passes `--describe false`. The installed 0.7.68 CLI converts that exact string to a null describe argument, so this is an actual supported opt-out from the optional Gemini snapshot analysis, not an assumed flag.
- Exact copy is centralized in demo.json and HTML-escaped before insertion. Build enforces the fixed 12-second/24-fps timeline. Separate landscape layout rules and motion distances are present. Authored timing remains at 0/3/6/9/12 seconds; source inspection cannot establish reading quality.
- render.mjs muxes the named existing music asset with explicit trim/fades and loudness targets. Its machine contract checks dimensions, 288 decoded video frames, 24 fps, an audio stream, 12-second container duration and full decode. Those checks do not establish subjective listening quality or guarantee the achieved loudness targets; README distinguishes machine and listening results.
- revision-check.mjs changes DESCRIBE to CREATE in a separate .tmp JSON/output directory. It compares real browser frames at five moments per format and counts changed pixels inside/outside the prompt card. Other sampled beats must be pixel-identical. Its final message and README limit the claim to sampled beats and this one string replacement. It is not a full revised-MP4 playback or exhaustive proof of every transition/replacement string.
- The review artifact builder embeds both local MP4s/posters, escapes the exact installation patch for display and pauses the other player when one starts. It writes a local file and invokes no publication/provider tool. Approval remains attached to the displayed patch.
- Inline SVG graphics still require shape inspection during visual QA; no geometry failure is established by this static review. UI-only interaction/page-layout requirements were not mechanically imposed on a video.

## Read-only checks executed by this reviewer

Each command was executed independently and returned exit code 0:

- `git apply --check workflows/proposals/grifon-motion-director/install.patch`
- `node --check workflows/assets/grifon-motion-director-demo/render.mjs`
- `node --check workflows/assets/grifon-motion-director-demo/revision-check.mjs`
- `node --check tools/artifacts/build-motion-director-review.mjs`

Patch checking did not install the skill. Syntax checking did not execute the scripts or render media.

## Remaining evidence boundaries

The builder's current-media and revision evidence is discussed in the final delta below. This reviewer independently checked file hashes against audio evidence and artifact embeds, but did not execute rendering or playback. The separate smoke review owns final frame inspection.

No visual playback, contact-sheet inspection, audio listening, renderer execution, revision execution or provider operation was performed by this reviewer. This report is not a BRAND_PASS, rendering pass, listening pass, benchmark superiority claim or user creative approval.

## Final audio/revision delta review

Reviewed the updated render.mjs finish path, temporary output, post-resample stereo limiter, new media-check.mjs, updated revision-check.mjs and current review-artifact builder. All four scripts passed independent `node --check` calls, each exit 0.

- The finish path remuxes the existing local silent render, so it supports audio-only correction without paying for or regenerating visuals. It decodes/probes the temporary output before copying it to the delivery path. No provider/cloud fallback is introduced.
- media-check.mjs measures the encoded AAC's input integrated loudness/true peak rather than trusting requested filter targets. Its negative control reproduces the original mix and requires rejection. The persisted report shows both exports at -13.82 LUFS / -1.41 dBTP and the earlier mix rejected at +5.27 dBTP. This is measurement evidence, not subjective listening.
- Independently recalculated both final MP4 SHA-256 values and confirmed exact matches to qa/audio-check.json. Also decoded the MP4 data URLs from the offline review artifact and confirmed both embedded videos match those same current files. This was read-only data inspection, not browser playback.
- revision-check.mjs now uses a block-bodied Playwright evaluate callback so the GSAP seek result is not returned as a thenable. Its persisted results show ten sampled frames: eight identical outside the edited beat, and both edited-beat samples differing only within the prompt card (zero changed pixels outside). The reviewer read the evidence but did not rerun the browser check.
- The parent reports local browser policy blocked mobile review. No browser retry or alternate route was attempted by this reviewer. Final visual frame review belongs to the separate smoke review; listening and physical-device playback are not claimed here.

**P3 - Include the new audio verifier in reproduction instructions: RESOLVED.** Final reread confirms README.md:35 runs media-check.mjs after render and before the review artifact, with its finite true-peak requirement described at line 82. The earlier observation was made against the prior concurrent file snapshot. No render change was required.

## Applied skill comparison

The parent supplied the user's approval of exact installation patch SHA-256 `2b542b8b135997e33a322856de8bd00d45c5bacf75fa3b37dfdbc046ce462074`. Independent hashing confirms the current install.patch has that digest.

The active `.agents/skills/grifon-motion-director/` and candidate tree each contain exactly four files: SKILL.md, references/treatments.md, evals/evals.json and evals/trigger-queries.json. All four are text-identical after normalizing CRLF to LF. Raw hashes differ because the applied Windows files contain CRLF (52, 23, 42 and 12 line endings respectively) while the candidate uses LF; no content edits or extra files were found. This is an applied-source equivalence check, not a real automatic-activation test.

The parent reports check:codex passed 32 checks with zero errors; this reviewer did not rerun that repository gate. No browser retry, alternate browser route, paid operation or implementation mutation occurred during this final review. Reviewer-owned changes are confined to this report.
