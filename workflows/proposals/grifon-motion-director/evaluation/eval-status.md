# Motion Director behavioral dry runs

2026-09-17: the skill author executed the three saved prompts with the proposed candidate guidance explicitly available. Outputs are saved under `with-skill/`. Candidate source and the install patch were unchanged. This pass uses inherited task context; it is not blind, independent grading, or automatic-trigger evidence.

The Grifon case grounded its plan in the current DESIGN.md and demo source, retained the approved beat sequence, and described local rendering and future checks. The fictional client case used the prompt's approved navy/cream rules and treated unavailable assets as pending. The routing case selected Viral Autopsy and AI Editor without starting media work.

Review correction: the initial Grifon output inherited `logo-badge.png` from the demo source and therefore missed the canonical ad-creative lockup. The reviewer caught this real brand failure; initial marker checks did not cover it. The candidate now requires `brand-spec.md` and its GrifonMark identity rule. The Grifon output was revised accordingly and checked for canonical asset/wordmark/ring instructions. This correction is not an independent rerun or automatic-trigger result.

Observable checks are recorded beside each output in `grading.json`. They assess the written dry-run plan only. No rendered-video quality, full playback, audio listening, live provider behavior, fresh-context skill discovery, measured time/token benchmark, or user creative approval is claimed. No task execution beyond read-only grounding and evaluation-output bookkeeping occurred.

## Static evaluation viewer

[review.html](review.html) was generated with the existing skill-creator `eval-viewer/generate_review.py` and bundled Python; command exited 0. Six original/revised file-backed outputs are staged in `review-inputs/` for the viewer, with source mapping in [benchmark.json](benchmark.json). Embedded JavaScript parses successfully. Browser interaction was not tested by this authoring pass.

[benchmark.md](benchmark.md) explains why the 13/13 revised WITH-skill and 12/13 original baseline written-rubric coverage cannot establish skill superiority: both were rubric-exposed, the initial WITH-skill output also had the wrong logo, and only it was corrected after review. The baseline remains intact. Timing/token metrics are unavailable (`null`), not zero; the comparative delta is explicitly not comparable. The standard deviation across different prompts is not a repeatability measurement. Automatic-trigger testing and human feedback remain pending.
