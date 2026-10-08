# Four-frame raw witness review

**Qualified witness code PASS; no actionable code finding.** The helper and
recorded results establish the correction's change scope. They do not, by
themselves, establish correct visual content or playback fidelity.

| Bound evidence | SHA256 |
|---|---|
| `qa/verify-full-timing-v3.mjs` | `ed39f1d38aeb34be3e121bd836818662362e7f5874f893940dd2a24e600bacd7` |
| `qa/full-timing-v3-raw-witness.json` | `264eaa2c8f1a9abf7b9f0fa84b9d4375a052ee0f067e74251dea71390f4ecc98` |
| Preserved capture receipt | `b480d87f32c122d8ba640704fb57b4b58bc79824483a1e5e7e14b027f5ec73f3` |
| Current capture receipt | `dc079552beb97ed4f742b0961bce0434d01fa5782a1661287cc47ae4e61bec28` |

The helper and witness match their execution-proof entries in
`qa/full-timing-v3-checks.json`. The preserved receipt is bound to the v2
preservation package and its source set. The current receipt is bound to the
v3 source boundary, the prior independent source review, and the silent
export's capture hash. Both captures retain the unchanged producer and
accepted-prefix binding.

The helper loops over **every 710** continuation frame. It requires native
index `222+i` and canonical filename `0000.png` through `0709.png` on both
sides. For each entry it reads both actual PNG buffers, verifies their SHA256
against their respective capture receipts, and compares `Buffer.equals`.
It derives the changed-frame list from those byte comparisons, then requires
exactly **400/403/636/639**. This covers actual bytes across the sequence;
it is not limited to four samples or declared receipt-hash equality.

The independent audit cross-checked all 710 recorded rows against both
capture receipts, verified strict frame/file order, and checked the recorded
byte counts against the sizes of all 1,420 existing PNG files. The result is
four changed entries and **706 byte-identical** entries, with consistent
hashes and lengths. The reviewer did not reread the raw PNG bodies or rerun
the already-green helper; those executed buffer comparisons belong to the
pinned witness above.

The original negative control invokes the real helper in a child process
with `--negative-original`. It uses the actual preserved 710-frame capture
as both inputs, verifies those real buffers, and rejects the empty change
list at the intended difference gate. That rejection occurs before the
new-source/export checks, additional control dispatch, or any receipt write.
It therefore demonstrates that the uncorrected sequence cannot pass this
correction witness merely by satisfying its source checks.

The fifth-change control passes `[400,403,407,636,639]` to the same exact-list
guard and records the expected rejection. **This is an in-memory list-policy
control, not an actual PNG-file mutation.** It meaningfully checks the extra
frame policy; it does not independently test corrupted-file/hash handling.
No stronger file-mutation claim should be made for that control.

The helper writes its result exclusively and already marks full native and
timed fidelity as pending. Its accepted-opening statement correctly defers
222 decoded-prefix equality to the separate temporal proof. Wrong visual
content on the four changed frames could still satisfy this witness; the
independent all-932 native review and actual aligned 1x/0.25x playback must
establish that content and continuity.

All audited helper/receipt bindings stayed unchanged. The reviewer reused
the prior source/opening review, performed no GPU/browser/media operation,
reran no green test or control, and created no fake frame or temporary file.
Only this report and `qa/full-timing-witness-review-v3.json` were written.
Encoded-media, mux/audio and hearing claims remain separate.
