# Hero cut 04 — pacing review

24-second revision of the rejected slow 40-second cut. The product appears in
the first frame, every edit beat lasts 2–3 seconds, and the end card holds for
three seconds. Earlier cuts and source assets are preserved.

Watch `hero-rough-cut-04.mp4`. This is a **provisional pacing review**, not a
finished website film. The plan, UGC and cinematic proof still require actual
same-product Grifon exports. Their three cards total seven seconds and are
explicitly labeled. Owner scenes remain still images with small camera pushes.

## Edit

| Time | Picture | Evidence |
| --- | --- | --- |
| 0–2.5 | KAPE 01 studio close-up | Existing Genjutsu 3.5–6s; external/provisional |
| 2.5–4.5 | Owner photographs bottle | Existing C03 still |
| 4.5–6.5 | Owner checks bottle | Existing C02 still |
| 6.5–8.5 | Owner works at laptop | Existing C04 still; screen unseen |
| 8.5–10.5 | The ad plan | Actual capture pending |
| 10.5–13.5 | Wide studio move | Existing Genjutsu 0–3s; external/provisional |
| 13.5–16 | Make it feel human. | Actual Grifon UGC pending |
| 16–18.5 | Give it presence. | Actual Grifon cinematic output pending |
| 18.5–21 | Return to owner | Existing C05 still |
| 21–24 | Grifon end card | Canonical logo/ring/italic GRIFON; separate GRIFON.AI |

The Genjutsu shot improves the room's realism but fails exact camera transfer:
stronger push-in and changed plinth. See ../genjutsu-sample/result-review.md.
It is intentionally kept separate from Grifon-generated proof. It is not repaired
or retimed. Output delivery is 854x480 to match the native generated video;
this is not a final website-resolution claim. Small label spelling is unverified.

Visible copy is in timeline.json. Existing English placeholder and end-card copy
is retained for review; no new offer, price, performance or speed claim was added.
Review banners describe source status. Small banners are intended for native-size
landscape review; do not claim that every label reads in a phone-width thumbnail.

## Reproduce

From this worktree root:

```powershell
node assets/hero-film/rough-cut-v4/build.mjs --runtime-root C:/Users/ADMIN/Desktop/grifon-command
```

Uses existing Sharp and FFmpeg dependencies. Edit timeline.json for durations,
source in-points, order and copy. The local builder reads only local assets.
Temporary .render files are ignored. No paid generation or rendering is involved.

Audio is the existing Inspirational Piano library track, normalized to a -20 LUFS
target before 0.25s entry and 2s ending fades; measured encoded peak is -6.6 dBFS.
This is a temporary music-only score, with no VO or source ad speech. Actual UGC
audio will require a new mix when supplied. Musical taste and casting remain open.

## Verification

Actual encoded output: 576 frames / 24 seconds, 854x480, 24fps, H.264 and stereo
48kHz AAC. Full decode and audio/black scan pass; no blank interval at the stated
0.25s/98% threshold. Source hashes match before and after render. First and last
encoded frames of all ten shots are captured in contact-sheet.jpg. verification.json
and media-scan.txt record actual checks, hashes and edit points.

Continuous playback and subjective listening remain pending: in-app browser URL
policy rejected the local file, and no browser workaround was attempted. The file
is delivered for Neil's playback. Frame/metadata checks do not certify retention,
motion between samples, final label spelling or creative approval.

Independent smoke-tester review passed the provisional assembly: exact first/last
frames of all cuts inspected; Genjutsu source frames 84–143 and 0–71 compared
across each included frame (SSIM 0.991472 and 0.991956 outside the review banner).
The minor wordmark tracking finding was corrected to -0.025em. Adjacent proof
cards at 13.5–18.5s change text only; they do not establish meaningful new footage.
Original cut03 remains 40s, with 17s placeholders and a 7s longest hold; cut04
reduces these to 24s, 7s and 3s. This measures cadence, not retention.

Node v24.21.0, Sharp 0.35.3 and existing ffmpeg-static (Lavf60.3.100) were used.
Node syntax checks passed. `npm.cmd run check:codex` passed all 26 tests and 31
entrypoints. No app code or dependencies changed; app build/tests were not run.

Remaining production: real KAPE 01 plan/UI capture and Grifon UGC/cinematic exports;
final voice/music treatment; casting and creative approval; final-resolution footage.
The existing HERO-PROOF-02 proposal remains unapproved and lacks exact generated
inputs. No provider call is authorized merely by acceptance of this pacing revision.
