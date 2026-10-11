# Offline player smoke: current full-film candidate

**PASS for the player UI, offline playback and actual download integrity.**
All 33 recorded checks passed at actual 390x844 and 1280x844 browser viewports.
This is a technical result for the exact candidate below. It does not accept
the full film's visual fidelity: the root held full timed comparison after the
separate native-frame critic reported continuation mismatches. No full timed
comparison was run by this agent for these bytes, and no audio was heard.

## Exact tested inputs

| Input | Bytes | SHA-256 |
|---|---:|---|
| Standalone `artifacts/grifon-shader-recreation.html` | 37,296,121 | `a8e04c2f4f6ff218414ab7c90dffd9a7248587e652165a46e6af6a77ccb75ade` |
| Embedded Grifon film, captured from `grifon-recreation-landscape-provisional.mp4` | 27,719,697 | `045ba2b06e283f2894fd8581c49fac8ef51780244c5cf6ec7a9fdfcb78c27dab` |

Both hashes and byte counts were checked before and after the browser run and
were unchanged. These are historical test bindings; a later rebuilt player or
corrected film needs its own binding rather than inheriting this PASS.
The owner's `qa/player-build.json` and `qa/player-integrity.json` were read
during preflight. Their inline-byte assertions were supplemented here by an
actual browser download in each viewport, not used as a substitute for it.

## Actual offline browser flow

The supported CUA surface was unavailable in the resumed task. I used the
previously authorized installed Playwright fallback with Chromium
149.0.7827.55. Each viewport received a fresh context with
deviceScaleFactor 1, `offline: true` and downloads enabled. The standalone
artifact was opened by its local `file:` URL. The route gate permitted only
that document and internal `data:`/`blob:` resources. No helper server was
started; the root's shared review server was left running.

At each size I exercised the visible controls in sequence: Play, Pause, mute
while paused, muted Play, unmute during playback, Pause, middle-timeline scrub,
Restart, a complete natural run to the end, replay after completion, Pause and
Download MP4. Settled native video state was read after each asynchronous
operation. The pause clock held, restart/replay reset to the beginning and
played, and a scrub paused the film at the range's requested value.

| Observation | 390x844 | 1280x844 |
|---|---|---|
| Body/document scroll width | 390 / 390px | 1280 / 1280px |
| Buttons and download target height | 46px | 46px |
| Narrowest action target width | 177px | 82.84px |
| Timeline target | 267.38 x 46px | 970.22 x 46px |
| Poster | Inline, decoded 1920x1080 | Inline, decoded 1920x1080 |
| Film ready state | Paused at0, 1920x1080, readyState4 | Paused at0, 1920x1080, readyState4 |
| Settled middle scrub | 17.550866s, paused, not seeking | 17.484133s, paused, not seeking |
| Natural end | 31.146s, ended and paused | 31.146s, ended and paused |
| Natural-run wall interval after restart | 31.233s | 31.214s |

The terminal UI displayed `31.15 / 31.15s` and
`Finished. Replay or download the film.` The native-frame range step means
the terminal slider value quantizes to31.1311s; the video itself reaches its
31.146s container end. This small range quantization did not prevent completion
or replay. The visual stream's 31.097733s extent and the longer provisional
AAC/container extent were not confused with a player failure.

I inspected the actual 390x844 poster, playing, scrubbed and completed screens,
and the 1280x844 poster, scrubbed and completed screens. The phone layout keeps
the film, action buttons and timeline within the viewport width, with legible
example-project and provisional-soundtrack disclosures. There is no horizontal
body overflow. The desktop hero uses normal vertical scrolling to reach the
controls/details; the control flow remained usable. Images are genuine
390x844/1280x844 captures verified from their PNG dimensions, not upscaled
images of a different viewport.

Both actual browser downloads used the suggested filename
`grifon-recreation-landscape-provisional.mp4`, completed without a download
failure, and contained exactly27,719,697 bytes with SHA-256
`045ba2b06e283f2894fd8581c49fac8ef51780244c5cf6ec7a9fdfcb78c27dab`.
The two saved files independently match the tested film. No external request,
failed network request, console error or page error was recorded while offline.

The default player is paused and unmuted, with explicit `Play with sound` and
`Mute sound` labels. Mute/unmute changed the native video flag, button text,
`aria-pressed` state and status without interrupting active playback. These
observed states establish widget behavior only. A browser being unmuted does
not establish that this model heard music, speech or sound effects; soundtrack
quality and sonic reference fidelity remain unreviewed.

## Evidence and scope

- `../qa/player-mobile-smoke.mjs`: actual offline UI/download runner.
- `../qa/player-mobile-report.json`: 33 checks, exact before/after hashes,
  viewport geometry, settled media states, network/console records and
  actual download hashes.
- `../qa/player-mobile-390x844-{poster,playing,scrub,ended}.png`: mandatory
  actual mobile screenshots.
- `../qa/player-mobile-1280x844-{poster,playing,scrub,ended}.png`: desktop
  screenshots, including the scrolled control view.
- `../qa/player-mobile-390x844-download.mp4` and
  `../qa/player-mobile-1280x844-download.mp4`: actual saved Grifon downloads.

Only owned player QA evidence and this report were written. The browser and
contexts were closed. No player/renderer change, provider call, install,
secret access, Git operation or broad test was performed. The prepared
`review-player-timed-full-single.mjs` remains unexecuted, ready for a corrected
frozen full-film pair and explicit root release.
