# Full native visual review v2

**FAIL — precise cadence corrections required.** The revised film is materially close as the approved Grifon visual adaptation, including all seven families missing from the first full candidate. Two native pattern changes are late and the four-frame canvas erase has only two visible states. These are short signature beats, so the timing defects fail this native gate. The review does not request a broader design retune.

## Exact inputs

All paths are relative to workflows/assets/grifon-shader-recreation.

| Input | SHA-256 | Bytes |
| --- | --- | ---: |
| Reference | 47c8bbc8e3d06953dd850500e4c7702ce690b3a4bc6708c4fc6a1f3d392df089 | 11514975 |
| Candidate | 15cbddf056015c6ab16986fb5a22abd71ec03fb8c8b3b0903efcd6de1cbd37ce | 25018826 |
| Private silent pair | 534db1eb3cb970a6ec709885131205b02e8080de6f1e10dbb32cb5daaa3aad61 | 16279713 |
| Media receipt | 2bdc1c2e192385df6cfa06d8c3df6269632317b9f4c297ebbf116e5f3a9f2c88 | 3119 |
| Pair receipt | a0c5494003a53c79f4e55e90fabfe82e91385bc3e73c99fc1277235024df3797 | 3525 |
| Capture receipt | b480d87f32c122d8ba640704fb57b4b58bc79824483a1e5e7e14b027f5ec73f3 | 102302 |
| Accepted opening | 6815c6e5143257c2d8b4fa368735677754b8d57cc0685ccb7d2ce380459a1c69 | 5504941 |
| Producing helper | bbd8df71f403f6fc4d437b26df6110dc22d3155cff55572fa1efae26c7338e02 | 20291 |

The13 runtime source hashes in the media receipt match the extraction and final closure. The producing helper remains unchanged. Historical v1/focused v5 reports, opening movie and original source also remain unchanged. The independent audio QA measurement helper is outside this media-producing boundary.

## Method and limits

Decoded video streams only, selected by zero-based native presentation index:932 frames at30000/1001fps;frame n starts at n*1001/30000seconds. Inspected every frame0–931 chronologically across32 paired sheets (each side240x135), all83 larger paired PNG details (each side960x540), all39 source/candidate native detail pairs at1920x1080, and all49 five-frame cut neighborhoods. Nine cut composites were displayed at2048x661 after tool resizing from2400x775; the last four-board composite was1920x775. Larger/direct boundary evidence resolves the disputed cuts. Exact original-frame numbering takes precedence over browser seek clocks.

The18 additional inspected boundary files listed in the QA receipt include independently decoded source/film PNGs and hash-verified raw captured PNGs for400,403,407,636,639, plus pair407/636/639. Additional638–640 images were prepared for endpoint diagnosis; their preparation alone is not claimed as an additional visual inspection. All generated evidence hashes were rechecked at closure. No continuous playback, audio listening, GPU render, paid/provider operation or final artifact approval occurred. Paced1x/.25 review remains a separate required gate; sound remains SONIC_UNVERIFIED and the reference song identity is not established.

## Required corrections

| Native frame / time | Exact source | Frozen candidate, raw capture and film | Correction |
| --- | --- | --- | --- |
|400 /13.346667s | Second, rectangular-step pattern | First, chevron pattern; second appears401 | Change the second boundary to400. |
|403 /13.446767s | Third, upright zigzag pattern | Second, rectangular-step pattern; third appears404 | Change the third boundary to403. |
|636 /21.221200s | First visible black erase bars over binary canvas | Binary field remains unerased; first bars appear637 | Retain a visible initial bar state on636. |
|639 /21.321300s | Final surviving horizontal fragments | Already black in raw capture and decoded film | Retain fragments on639;640 remains black. |

The measured pattern intervals are source397–399 /400–402 /403–406 /407–409 versus candidate397–400 /401–403 /404–406 /407–409. Each delayed change is33.3667ms; the first three-frame hold gains one frame, a one-third cadence change. **407 aligns**: exact source, raw PNG, encoded film and private pair show the fourth step pattern at407. The preliminary overview suspicion of a407 delay is withdrawn.

The source erase is visibly active636–639 (four frames,133.4667ms); the candidate is active637–638 (two frames,66.7333ms). The endpoint mismatch is present in both raw capture and encoded film and is not a player seek or pair-scaling error. Preserve the middle637/638 states, material/palette and authored randomness; restore only the missing endpoints.

## Full-sequence judgment and residuals

| Native range | Judgment | Observation / residual |
| --- | --- | --- |
|0–221 |RETAINED |Accepted opening prefix retains coarse opening blocks/profile, eight fixed-ring material changes, tear68–69, delayed type through flare143–145, material relief and broad gray surround209–221. |
|222–254 |CLOSE_ADAPTATION |Localized rosette, continuous curved strip and six-blade dot aperture are present. Residuals: rosette placement/twist, narrower strip head, stronger blade separation and contrast. |
|255–343 |CLOSE_ADAPTATION |Catalog perspective grid,306 circular lens and307 large cropped rim/full-field copy preserve the structural progression. Residual: clean catalog appears during the source255–257 blur blend; candidate focus is sharper. |
|344–390 |CLOSE_ADAPTATION |Character-row folded field and joined two-mouth point shell reach the frame edges and sustain readable cavity/projection changes. Residuals: character rows darker/more even, point rings more circular and crisp with less glow, folded lobe cluster more ring-like than the source glass folds. |
|391–409 |FAMILY_CLOSE_CADENCE_FAIL |Silver pinwheel and four bright grain-pattern classes are present. Residuals: pinwheel more segmented and fine grain more uniform; measured400/403 cut delays are the actionable gate failure. |
|417–495 |CLOSE_ADAPTATION |Diagonal particle field, irregular radial burst and diffuse core lead to four distinguishable macro materials, including dark folded and soft milky/transmissive final forms. Residuals: particle band is broader/sparser, gray veil stronger445–446, final macro grayer with a sharper letter counter. |
|496–585 |CLOSE_ADAPTATION |Truthfully disclosed Grifon Script desktop/mobile content, reflow, full-field whirl541–545, desktop resolve546 and Storyboard capture preserve the presentation families. Whirl distortion is stronger on its first frame; product content is an approved substitution. |
|586–639 |FAMILY_CLOSE_CADENCE_FAIL |Tilted binary canvas, overlapping soft materials, growing type,608–609 tear,610 resolve and626 pullback remain coherent. Residuals: digits are coarser/more even; field transitions softer. Measured636/639 erase endpoints are the actionable gate failure. |
|640–931 |CLOSE_ADAPTATION |Black pause, canonical centered mark, bottom-cropped glow sphere, organic contours and tilted exit remain present;853–931 is visually black. Residuals: stronger initial logo fade, broader/more regular sphere/contours, rectangular panel edge more visible during837–844 exit. |

The seven original v1 signature failures have been resolved as close adaptations: continuous strip229–237; expanded catalog lens306–343; coherent characters344–356; joined cropped point-shell357–376; bright pattern/burst/distinct macro materials397–495; full-field mobile whirl541–546; overlapping canvas586–635. The remaining shape, density, sharpness and transition differences above are visible residuals, not a demand for original branding, exact hues, font outlines or pixel equality. Those substitutions are explicitly allowed by the brief.

The timing defects require a newly frozen candidate. This report cannot approve an unrendered fix or reinterpret the historical55-sample focused PASS as whole-film approval. After the minimal correction, compare decoded frames outside400/403/636/639, inspect corrected native neighborhoods, then perform actual paced playback.

## Evidence closure

Private evidence lives under .tmp/full-native-critic-v2. The original extracted receipt is preserved as receipt-extracted.json. The final closure at closure.json has SHA-256 **e48af15fcd481c857647d0b8b62aa7b8d492d02ebafd0af14dd012432428527f** and records unchanged before/after bytes and hashes for every bound input plus1218 generated evidence files. Boundary receipts:232c0979f6fcf05e6fbe9e19c699e4a9eff07d1ca8b54afe8de40539bea2c258 and2c907c05ed04a62467f0f9844a25b35b48c775bd6d4a8614d1e6ad48554ed05d. Composition receipt:80ec9dc8a1ec8c3909d451aabb7038a05ab4f3080c7d4ac11652623f11e4f2c1. Machine-readable judgment:qa/full-native-review-v2.json.
