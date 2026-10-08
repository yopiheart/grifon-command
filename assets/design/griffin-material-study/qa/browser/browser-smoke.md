# Material study browser smoke

PASS. The final offline viewer passed 93 automated checks and independent screenshot inspection at 1440x1000 and 390x844.

Executed command:

```powershell
node assets/design/griffin-material-study/qa/browser/smoke-material-study.mjs
```

Final exit: **0**. This final replay covers the removed comparison handle and updated caption, including exact screenshot dimensions and scrolled-bottom ground verification. Node v24.21.0; installed Playwright headless Chromium. No installation or HTTP helper server was used. The recorded final browser PID was 26312; its own BrowserServer was closed and the PID was confirmed absent afterward. No unrelated process was stopped.

## Passed behavior

- File URL works with the browser context offline. The sole observed request is the local HTML document. No external resource entries or request attempts occur.
- All ten selected source PNG hashes match the comparison manifest; every embedded PNG decodes. The image bytes shown by each camera tab match that view's approved and trial SHA-256 values.
- Hero, Front, Detail and Profile switch both images, their alt text and the single `aria-pressed` state correctly.
- Approved, Compare and Trial presets set 100%, 50% and 0% approved coverage, respectively. Computed clipping, divider position and output text agree. The trial label is hidden at 100%; the approved label is hidden at 0%; both show at 50%.
- Actual range keyboard input changes coverage to 37%; a further ArrowRight changes it to 38%. Both update the visible computed clip and output text.
- Desktop and mobile document widths equal their viewport widths. No horizontal overflow occurs.
- The charcoal radial ground covers each actual viewport before and after scrolling. Titles are solid near-white; glass borders, layered sheen and readable captions are visible.
- The comparison handle is absent in every checked viewport. Desktop Detail and mobile Hero screenshots confirm the face and beak are exposed; the thin divider and range slider remain visible.
- Both chat images render at exactly 64x64 CSS pixels. Their 256x256 source PNGs contain nonempty character pixels and transparent surroundings, with identical content bounds of x49..216, y20..228.
- No console warnings/errors, CSP errors or unhandled page errors occur. Inline CSP hashes match the emitted style and script blocks.
- The final HTML and recorded source hashes remain unchanged throughout the smoke run.

## Visual finding

No blocking visual defect. The previously reported face/beak occlusion is resolved: the handle was removed by the artifact owner. The tester inspected the final desktop Detail and mobile Hero screenshots and made no product changes.

Full-page Chromium captures can show a seam at the viewport boundary because fixed backgrounds paint only the viewport in that capture mode. Exact-size screenshots and separately scrolled-bottom screenshots confirm continuous ground in the actual page. Final retained screenshots are exact viewport captures.

## Exact evidence

Artifact SHA-256: `bf8f661d608fe8c99856256d3502f23acb2463d72fe8db54a36094798486b1cd`.

| Source | SHA-256 |
|---|---|
| `tools/artifacts/build-griffin-material-study.mjs` | `3386aa2c71f1c6c26d6c526e058b15f8e65e4552da94c42a4d25e82360568371` |
| `tools/artifacts/griffin-material-study.tpl.html` | `b0e23ede12d01bfa39b70c7d8469e9567bf977fb2b682cb3cc6688d61f437ab5` |
| `assets/design/griffin-material-study/comparison.json` | `98c7e15c192937dbc8a188913e679fcbcf3a5c8bc31a9aad00599c2d513f5985` |
| `assets/3d-lab/griffin-material-study/refine-griffin.py` and both final frozen copies | `2adad6a2d9acf398b81a573c8a0813356c9df66c3bfd1ac7f529d51423102c60` |
| `assets/3d-lab/griffin-material-study/baseline-final/manifest.json` | `6febc6b1666e99c3a6194edea545757c57a66988887cb790dc1a9ddb0248e681` |
| `assets/3d-lab/griffin-material-study/candidate-final/manifest.json` | `5dd1e9c9f2a0c3e64b8415f14667e2dfa153b659bfdb84e196044f9ab01bb7fc` |
| `assets/design/griffin-material-study/qa/browser/smoke-material-study.mjs` | `61c1cc50e2de9b31753854446c1e3441a2da9ca27da6be41be94842bdc7293ec` |

`browser-smoke.json` contains all fifteen source hashes, selected/embedded asset hashes, screenshot hashes, exact measured geometry and per-check outcomes.

Screenshots in this directory:

- `desktop-hero-1440x1000.png`
- `desktop-front-1440x1000.png`
- `desktop-detail-1440x1000.png`
- `desktop-profile-1440x1000.png`
- `desktop-profile-approved.png`
- `desktop-profile-compare.png`
- `desktop-profile-trial.png`
- `mobile-hero-390x844.png`
- `mobile-detail-390x844.png`
- `mobile-detail-bottom-390x844.png`
- `desktop-detail-bottom-1440x1000.png`

These are Chromium viewport checks. They do not establish real Android/WebView painting, animation quality, or app runtime FPS.
