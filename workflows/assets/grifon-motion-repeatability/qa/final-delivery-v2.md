# Final source and delivery review v2

**Current source and delivery review passes, with no actionable source or artifact findings.** The artifact `b03318712755658ec0727278b04d747fbc2c6c449c3d042f745ae292abee2d1c` embeds exactly the two current mixed MP4s and their posters. Their actual bytes agree with the manifest, standalone receipt and final independent 35/35 media report. Its native download anchor creates a Blob from the selected verified MP4 and uses that clip's filename. Actual browser download remains a separate root-owned gate.

The final media report `9ac49d23d0e73d8c866be7057ba4c7733cae3b66b13935de8b290b4a301ae172` binds the current unchanged producer tuple, including preview `d62d781`, audio `158a028` and visual `3ee78b0`. The prior clock resolution remains applicable; no repeated VM or media captures were run for this delivery review.

Independent hashing verified all 59 receipt-bound files against working bytes, actual staged index bytes and fresh Windows checkout bytes. The v2 checkout receipt hash is `4a25298b6e936a0d5785d490a74aae7fd8f2cedbec892761c601cf34c90264a9`. The standalone builder's `--check` independently passed from both working and fresh checkouts. All 17 protected originals remain unchanged, and the application/provider/control diff against accepted `118a5e8a` is empty. MR4 is closed for the current bound sources.

The manifest and workflow prose accurately distinguish picture timing, verified reuse and separate audio builds. Shader/portrait cold picture totals are 37.02s/19.84s; repeated totals are 1.06s/0.87s with zero new captures. The complete basic portrait is 288 frames, 12s, 1080x1920, with 81.00s for picture render and verification. Landscape was a four-frame control. The full new 932-frame shader capture remains **NOT RUN**. These measurements describe already authored local treatments and make no automatic-reference, customer SLA or listening-quality claim.

Earlier reports remain immutable. Initial manifest/receipt public copies and all three initial private preservation copies independently match their recorded hashes; the older HTML and earlier attempts are excluded from the current manifest.

Current browser controls, download and live audio/frame alignment checks, and the default repository suite, remain pending root. Before commit, root should replace the interim old timings and pending-checkout statement in NOW.md with final values and actual gate outcomes. Full bindings and remaining gates are in `final-delivery-v2.json`.
