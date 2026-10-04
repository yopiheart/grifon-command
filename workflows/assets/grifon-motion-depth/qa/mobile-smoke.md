# Motion depth review smoke

Status: **BLOCKED for browser verification; static exact-media gate PASS.**

Final file: `artifacts/grifon-motion-depth-review.html`.
Final MP4: `workflows/assets/grifon-motion-depth/grifon-motion-depth-1080p.mp4`.
MP4 size: 10,396,397 bytes.
MP4 and embedded MP4 SHA-256: `6de26c71a88073682c2a2532cc2fadde16f14ebc8863085f8bea54d68ef1bd55`.

`node workflows/assets/grifon-motion-depth/qa/mobile-smoke.mjs --serve` exited the static gate successfully and started a bounded loopback helper serving only the exact review HTML. The helper's PID was 17028, port 50639. It was stopped with `Stop-Process -Id 17028`; the root preview and pre-existing tabs were preserved.

Static PASS checks: final embedded MP4 is byte-identical; poster and Inter font are embedded; UTF-8 charset exists; ground is fixed; heading has uppercase styling and solid text; no external asset URLs; the Play handler explicitly sets muted=false and volume=1; Restart sets currentTime=0; the download Blob is constructed from the same embedded source bytes. These source checks do not establish successful runtime behavior.

Browser attempts and exact limitations:

- CUA file-URL navigation rejected: only HTTP and HTTPS protocols are allowed. No offline browser playback was tested.
- CUA `visible:false` is unsupported in a subagent; this did not produce a tab.
- CUA HTTP navigation rejected by automatic approval review: “This requests browser-origin access to the localhost service, an access/permission change not specifically authorized by the user; the testing goal does not itself authorize granting that connector access.” The browser gate awaits explicit human authorization for the bounded root preview at `http://127.0.0.1:4186/`.
- No screenshots exist for 390×844, 375×667, or 1280×900. Continuous ground, visible glass, readable uppercase pixels, one primary CTA, and horizontal overflow were not browser-verified.
- User-gesture unmuted eight-second completion, Restart, executed download hash, browser errors/missing assets, and final browser frame remain NOT RUN. No headless or alternate-surface workaround was used.
- The temporary CUA viewport override was reset.

The root's fresh `qa/media.json` records H.264 1920×1080, 30/1 fps, 240 frames, eight seconds, plus AAC-LC 48 kHz stereo lasting eight seconds. This is objective media evidence. No claim is made about hearing the film, sound timbre, excitement, or subjective sound quality.

After browser authorization, use the exact approved root preview via Codex CUA, capture the required viewports, click Play with sound, verify muted=false/volume=1/progress/ended, verify Restart, execute Download MP4 and compare its bytes to the bound SHA-256, then record fresh runtime evidence. Real-device offline playback and creative listening remain separate checks.
