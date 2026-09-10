# Astra film: independent visual spot-check

**Verdict: PARTIAL VISUAL EVIDENCE; audiovisual autopsy remains FAILED specificity.** The one approved Gemini attempt returned two findings where the gate requires three. No paid retry, paid auditor, model substitution, or pattern-count promotion occurred.

Source: [official OpenAI post](https://x.com/OpenAI/status/2095595741528125780). Checked 2026-09-10. Local reference SHA-256 matches `D649D1EE93A3B63DF7BE324324CB3A757B723D9F9E0A8E556F9E79F5FCC91064`. FFmpeg reports 163.01 seconds, 1280×720 H.264, approximately 23.98 fps, stereo AAC. Audio-stream presence does **not** verify its contents.

## Method and corrected claims

Free local FFmpeg extraction: 54 requested timestamps, with stills inspected in contact sheets. Requested times label samples, not frame-exact event onsets. [Retained 25-frame contact sheet](astra-film-contact.jpg) is a compressed review aid; larger local samples/logs are disposable under `.tmp/astra/frame-audit/`.

- **Opening year:** absent at 1.8 and 1.9 seconds; fragments at 2.0–2.1; readable at 2.5. The claimed 1.8-second appearance is too early.
- **Historical/modern transition:** archival-looking frame at 9.0, modern set by 9.2. FFmpeg scene-score candidate at 9.134 supports an approximately 9.1-second cut.
- **Title:** elevated wide set reveal by 39.9; title shapes/letters assemble across 40.3, 40.7, 41.0 and 41.5; full title readable by 42.0. “Title-card slam at 41” misses the staged assembly over a visible set.
- **Ending:** screen model at 148–150; blue rocket inside a printer at 151; person reaches toward printer at 152–153; physical-looking blue rocket close-up by 156. This conveys digital-to-physical continuity; it does not prove unedited production or execution.
- **CTA:** wordmark at 156, logo at 157–158.5; CTA transition visible at 159; readable by 159.5 and still present at 162.8. It directs viewers to the desktop app. Exact first onset and final-frame hold were not established.

FFmpeg `select='gt(scene,T)',showinfo` yields **53 / 45 / 29 candidates** at thresholds **0.2 / 0.3 / 0.4**. These are threshold-dependent image-difference events, not exact cuts. The analyzer's 48-shot count, median 3.1-second shot, dolly speed, and silence count remain unverified.

## Sampled camera and b-roll map

Framing/height are visual estimates; continuous motion and exact lens are unverified. Beat purpose below is interpretation.

| Samples (seconds) | Visible framing / content | Likely beat job; Grifon production lane |
| --- | --- | --- |
| 1.8, 2.5, 9.0 | Elevated rear wide, seated person facing historical-looking display | Establish origin; own filmed/image plate + deterministic year typography |
| 9.2, 13 | Rear wide, modern room/display; animated year | Visual comparison; owned set footage + Hyperframes typography |
| 20; 30, 38 | Eye-level side medium/close person; rear display-facing rocket drawing and 3D viewport | Reaction then visible progression; filmed reaction + real Grifon capture composited deterministically |
| 40–43 | High wide exposes camera rigs and set boundaries; large moving letters | Reveal production world; owned wide plate + Hyperframes |
| 45, 50, 60 | Room wide followed by near-eye-level portraits, warm practical lights | Introduce people/use cases; filmed subjects |
| 80, 90, 110, 120, 130 | Rear wide/medium views of 3D viewport, slides, listing photo, document and game | Screen-result evidence; actual workflow capture + deterministic compositing |
| 140, 145 | Face close-up then seated medium-wide with food | Human reaction/continuity; filmed subject |
| 148–156 | Display model, printer detail, retrieval, shallow-focus rocket close-up | Tangible payoff; real output footage/stills |
| 159.5–162.8 | Rocket close-up beneath small centered CTA | Next step; deterministic end text |

**Limits:** projected application imagery and visible camera equipment are corroborated; whether software was operated live is not. Stills cannot establish source authenticity, lip-sync, dialogue, score, SFX, audio timing, or viewer response. All Gemini audio claims remain quarantined. This is a sampled map, not a complete shot inventory or recreation-ready audiovisual autopsy.
