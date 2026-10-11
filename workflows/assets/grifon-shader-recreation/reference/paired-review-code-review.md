# Independent review of the private single-stream comparison

The reviewed helper is appropriately isolated for private reference
inspection. **No current actionable code finding** remains in this narrow
review. This is a source/receipt review, not a browser playback or visual
fidelity acceptance.

`../build-paired-review.mjs` checks the native source hash, records the pilot
hash, trims both to frames0–221, resets their presentation starts, scales each
to960×540 and stacks them into one1920×540 silent stream. It verifies222
decoded frames,30000/1001fps, dimensions and absence of audio, then rechecks
the pilot hash. The reviewed source and pilot have the same native frame
rate; retaining timestamps after `setpts=PTS-STARTPTS` therefore pairs their
same frame numbers. Output validation would not by itself prove frame
alignment for arbitrary differently timed inputs; a future changed-input
review must retain the native input contracts as well as the output receipt.

One decoded stream prevents independently stalled video elements from
presenting different halves, though the whole stream can still stall. The
timed reviewer must observe actual presented pixel changes and frames, not
only advancing clocks. The earlier dual-player timed failure is not repaired
merely by a successful encoding command.

`../review-server.mjs` binds explicitly to127.0.0.1, serves a fixed allowlist
with GET/HEAD only, applies no-store/nosniff headers, and supports bounded byte
ranges. Request URLs do not become arbitrary filesystem paths. Neither
standalone working audio nor fixture media has a route. The native source
route is intentional local private inspection. The pair and native source
remain ignored local media, rather than embedded delivery artifacts.

`../paired-review.html` references only local pair/receipt routes, labels both
halves and private status, and implements normal/slow playback plus frame
controls. It separately shows approximate clock frame and
`requestVideoFrameCallback` presented frame. The fetched digest is a visible
receipt binding, not a browser-side cryptographic verification of the video.
No audio acceptance or direct-hearing claim is made by this page.

I read the three sources, checked the actual pair and receipt hashes, and
confirmed `.tmp/paired-pilot.mp4` is ignored. No server restart, new pair
generation, UI interaction, source mutation or broad test was performed.
The actual receipt binds the already-reviewed correction-pass1 pilot:

| Artifact | SHA-256 |
|---|---|
| `../build-paired-review.mjs` | `cf61587c46bc1b5c23f28c04ff8ff047f3727f9083ca8cd23bfad91c8b803a0c` |
| `../paired-review.html` | `24be8ad9854fd37a8909ec81d403cae61a482de74b445dd8eb03e9afb2bb48cf` |
| `../review-server.mjs` | `bad2bd547f51d5726271e8d558b2980fb2b6ec0c39dea37b7cba2279312ce83e` |
| `../qa/paired-review-receipt.json` | `f23c28d4a7199ca4b8a431c2b17fa2b5277918e8ca5f7f5d54e8b46a9dfaded2` |
| Private pair | `0ef1e831e42a363f14d20591f4661c538f275818f3948597b6570766d0e478b9` |
| Bound reference | `47c8bbc8e3d06953dd850500e4c7702ce690b3a4bc6708c4fc6a1f3d392df089` |
| Bound pilot | `50713631826e5b6cb7cf90d6795f6f20e492fbc970a5d63cc3cb82256b7e57e8` |

The pilot's existing visual FAIL is unchanged. Regenerate the pair and
receipt after the next exact pilot render; old timed evidence cannot approve
new bytes.
