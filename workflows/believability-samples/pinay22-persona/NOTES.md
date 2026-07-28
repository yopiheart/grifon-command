# Pinay-22 persona — fully-AI character (2026-07-28) — VALIDATED by Neil

Bagong fully-AI na 22yo Filipina persona (walang totoong tao sa likod — imbento
lahat). Neil verdict: *"Napatunayan na ng mata ko bagay sa auto presenter/fully
ai character"* — kasama sa parehong session kung saan na-prove ang hierarchy:

1. **Fully-AI persona = malakas** (walang compositing seam — imbento sabay-sabay
   ang tao at eksena, kaya coherent).
2. **Real person + MAGANDANG refs (Marvin) = 100%** (body master + multi-angle
   face refs + totoong skin texture).
3. **Real person + PANGET/filtered refs (Zam chat photos) = bagsak** — AI ang
   mukha ng output, lalo pag pinagalaw sa video. *"Ang salarin ung reference
   image."* (Full arc sa `../zam-master/NOTES.md`.)

## Pipeline na ginamit (the validated recipe)

1. `master-dusk-presenter.png` — from-scratch text-gen master (dusk presenter,
   eye level). OK ang from-scratch dusk dito dahil fully-invented ang tao.
2. Terrace + street: daylight bases naka-`--edit` anchor sa master (identity
   lock) → subject-locked dusk relight (two-step relight pipeline, decoded sa
   `../zam-master/NOTES.md` §"Register decode v2").

## Files

| File | Ano |
|---|---|
| `master-dusk-presenter.png` | ANG identity master + dusk presenter plate |
| `base-terrace-daylight.png` / `base-street-daylight.png` | Reusable daylight bases (master-anchored) |
| `opt-dusk-terrace.png` / `opt-dusk-street.png` | Dusk relights ng bases |

Sa susunod na generations ng persona na ito: laging i-anchor sa
`master-dusk-presenter.png` + ang skin-texture block (pores, vellus hair, grain)
sa bawat prompt.
