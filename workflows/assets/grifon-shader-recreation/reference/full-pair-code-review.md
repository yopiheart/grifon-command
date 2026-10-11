# Full private comparison code review

Independent explorer review found three defects in the first builder/server:
the builder accepted a byte-bound movie after continuation sources changed;
the server read independently mutable page/video/receipt paths; and a failed
encode could overwrite the previously bound comparison video.

The corrected source received an independent static review with no remaining
actionable findings:

- Builder SHA256: `45bd23d46bc5e9751ff3b9f2f8c3092fe4495ab97b5b1f22ecfb70926acf2015`.
- Server SHA256: `3e40ce34c45b5043a5e1e0240c179d6cb1a47c659ac1317258092597e112f5b7`.
- Exact original builder snapshot SHA256:
  `cae06400ccf99d335332176d9263afe587d3c1531628e377d9f15cc4cf202f1a`.

The builder pins the approved 222-frame opening, verifies the complete current
continuation source set and capture receipt before media work, and repeats
input stability checks afterward. It validates every zero-based native input
and output presentation timestamp and decoded opening-frame equality.

Encoding uses a unique staging file. Native probe, strict decode and provenance
checks finish before publication of a new immutable page/video/receipt
generation. A failed construction leaves the previous generation intact.

The server validates generation hashes, receipt equality, producer binding,
reference/opening pins and current source files before loading the generation.
It serves pinned buffers across subsequent requests and byte ranges. Restart
it after building a new full comparison. The compatibility video alias and
canonical receipt publish separately; the server uses the immutable generation
specified by its validated receipt.

Independent smoke execution passed 17 checks, including reproduction of the
original stale-source defect before the first mocked media probe. A subsequent
portable `--synthetic-only` run passed 16 checks and explicitly did not rerun
that live-input witness; its timestamp and hashes remain in the report.
Six induced build failures retained the prior pair/receipt, six server binding
mismatches returned 503, and cached page/media/receipt ranges stayed identical
after fixture files changed. Native media boundaries were mocked. An initial
QA setup error (missing `URL` in its VM context) was repaired in the harness.

Execution evidence is recorded in `qa/pair-provenance-guard.json`.
No visual similarity or audio verdict follows
from these checks; the first `045ba2b0...` movie remains a failed visual candidate.
