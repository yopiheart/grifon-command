# Independent preliminary recreation-player code review

**No actionable code finding in this preliminary scope.** This is a source
review, not finished-output, browser, download or visual/sonic approval. The
full MP4, `qa/full-media.json` and `qa/full-poster.png` were absent when reviewed,
so the real builder output and its browser behavior remain pending.

## Bound source and method

Read both complete player source files, their shared artifact gates and imported
script-syntax verifier. Reviewed the full brief and relevant audio recipe/receipt
fields without repeating the existing audio analysis. Manual control-flow and
byte-construction review only: no builder/render/GPU/browser run, broad tests,
provider/install/secret access or Git mutation. Only this report was written.

| Source | SHA256 at review |
|---|---|
| `tools/artifacts/build-grifon-shader-recreation.mjs` | `e5d45d76ae16bd4884b74020af9097d46b1b6754f5f618e96de5aa5b8c76d157` |
| `tools/artifacts/grifon-shader-recreation.tpl.html`, current disclosure | `6eefb8fee0be48bf98d202642344b366c1c04b80fc244063c17cc0aba6593c5d` |
| `tools/artifacts/_gates.mjs`, LF-normalized | `57dd8b78b37160c9643964dffbdc4a07cdddeb728fe0ecbbf8ab177747af0f94` |
| imported `grifon-motion-action-pilot/verify-player.mjs` | `a57218edb684cbcd2588c2e7c43c2d21a444ef32ac74aa8ecae7607008a88b49` |
| `audio.json` | `7a1e2d4ba455d609d62403fafbf90eb98ade8c4bfe3c0c8dad8ccac46b4aa689` |
| `qa/audio-verification.json` | `7869b51136b5aabd785301e39507883cc46f7737c970834a078424a98f82bc42` |

Both player hashes were checked again after the disclosure wording change and
remain as listed; builder logic is unchanged. The template now says "An alternate
music mix is used for this review," avoiding a claim that the underlying song
identity was established. The shared gate hash changed only through LF line-end
normalization; the parent reports canonical text equality to HEAD. The shared
gate and syntax-verifier dependencies are already tracked. The parent owns
staging/commit of the new player sources, final media/poster/receipt and generated
standalone twin. This metadata refresh is still a source-only review.

## Inspected behavior

- **Exact media/download binding.** Before generation, the builder compares
  finished MP4 filename, byte count and SHA256 to the producer's full-media
  receipt. The same read byte buffer becomes the inline base64 video. Download
  decodes that very payload into a video/mp4 Blob with a fixed MP4 filename;
  there is no separate video source or transcoding path. The generated receipt
  records HTML/media bytes/hashes and source hashes. `--check` regenerates from
  durable sources and requires exact HTML and receipt equality.
- **Native contract.** The gate requires932 frames,30000/1001 fps,1920x1080,
  exact native video duration within10 microseconds, approximately31.146667s
  audio/container duration, strict decode PASS and222 verified prefix frames.
  The page's29.97 FPS and rounded31.15-second copy are consistent with the
  intended rational rate and longer audio/container tail. The builder trusts
  the producer's verified receipt for decode/prefix statements; it does not
  itself inspect all video frames.
- **Audio binding and truthful status.** It requires AAC stereo48kHz, explicit
  SONIC_UNVERIFIED provenance, the free provisional digital-clouds recipe,
  recipe hash equality to the technical audio receipt, and the exact full AAC
  master hash from that receipt. The existing master entry is
  `0358a2223f2bfe2c5a73aa60e07d99a8ca7b97746507f967c08d18edaa44b523`.
  Copy says an alternate music mix is used and sound similarity/direct listening are
  pending. It makes no exact-track, transcript or hearing claim. Actual muxed
  stream provenance must still be confirmed by the full producer evidence.
- **Offline isolation.** The finished file embeds only the fixed Grifon MP4
  and PNG poster. No reference footage is read by this builder. Media/image
  URLs are data payloads; the only generated Blob is the download. CSP blocks
  external connections/resources, bases and form submissions. The actual
  template has no network calls, external stylesheet/font/script dependency
  or user-supplied HTML. JSON/base64 insertion cannot introduce a closing
  script tag from these validated fields.
- **Controls and lifecycle.** Metadata readiness enables play/restart/scrub.
  Play calls `film.play()` from a user gesture and handles rejection. An attempt
  token suppresses stale promise status updates after pause/restart/error.
  Scrubbing pauses and seeks; restart pauses, resets and starts; end/error
  states are explicit. Sound is a direct muted toggle with an accessible state.
  Download URLs are created lazily, revoked on pagehide and reset so a cached
  page return can create a fresh valid URL on the next download.
- **Artifact gates.** Required structure/control tokens and leftover-token
  rejection run through `_gates.finalize`; ASCII/CSS and clipped-gradient rules
  apply. The template's strings/scripts are ASCII, so this shared escaping
  does not corrupt script literals. An inline JavaScript parser gate follows.
  The builder rejects standalone files above95,000,000 bytes. Mobile CSS wraps
  controls into two columns, keeps timeline flexible and uses46px control
  heights; actual390px behavior is not established by reading CSS.

## Required finished-output evidence

After the producer supplies exact full media/poster/receipt, run the builder
and its exact regeneration check, inspect the emitted file and receipt, and
perform the separately assigned390x844/playback/download smoke. That smoke
must compare the saved MP4 SHA256 to the final producer and inline payload,
verify actual metadata/playback/seeking/audio toggling/replay/errors and inspect
poster/layout readability. Actual offline/network observations belong there.

Header-only PNG checks and receipt assertions are not a full media decoder or
visual review. Missing final assets currently prevent output validation; they
are an expected production dependency, not a player-code failure. Full native
and timed fidelity gates, and unresolved sonic similarity, remain separate.
No finished artifact PASS is inferred from this preliminary code result.
