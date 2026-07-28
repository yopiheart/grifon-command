# The Thumbnail Law — decoded MrBeast frame grammar (shared)

Shared reference for the `grifon-cmo` and `grifon-creative-director` skills. It exists so the
thumbnail spec lives in **one** place instead of drifting across two SKILL.md copies — which is
exactly what went wrong before (see Correction History at the foot).

Re-read before designing or briefing ANY thumbnail, ad still, hero frame, or scroll-stopper —
Grifon, Kuya Marvin / Oceanides, or client work.

## Evidence provenance

Decoded 2026-07-28 from **15 real MrBeast thumbnails Neil collected** — all 15 examined directly,
not sampled: 7 long-form 16:9 + 8 short-form 9:16, in
[`assets/ad-swipe/mrbeast-thumbnails/`](../../../assets/ad-swipe/mrbeast-thumbnails/)
(`long-form/` + `short-form/`).

They live under `assets/`, **not** `public/` — Vite ships everything in `public/` to the live site,
and third-party copyrighted reference material must never be served from a Grifon domain. Same home
as the rest of the swipe-file sources.

This is **firsthand primary evidence** (the actual artifacts), which is why it can drive a house
rule. It does NOT clear the ≥3-corroboration gate for a *tuned-prompt* edit — that gate needs
Grifon-context A/B results, not MrBeast's. See "Gated, not applied" below.

---

## THE LAW (the one rule that generates the rest)

> **Text in the frame is never a message. It is one of three things: a NUMBER that quantifies the
> stake, a LABEL physically present in the scene, or the WORD being spoken at that instant.
> Never a sentence written to the viewer.**

**Zero of 15 carry a marketing sentence.** No benefit claim, no hook line, no "this changed
everything." Not one.

The reason, and it is the whole point: **the image must carry the premise by itself.** Text that
explains the image is a confession that the image failed. If you need a sentence, you don't have a
thumbnail — you have a caption stapled to a photo.

Practical test before adding any word: *can this be a number, a real object in the scene, or
someone's mouth mid-word?* If no — delete it and fix the image instead.

---

## The evidence

### Long-form 16:9 (7 files)

| File | Text | Where | Face | Expression |
|---|---|---|---|---|
| `imgi_13` Squid Game | none | — | center, ~40% h | neutral / menacing |
| `imgi_16` boat vs yacht | `$1` · `$1B` | both top corners | center | big smile |
| `imgi_17` crowd circle | none | — | left third | big smile |
| `imgi_18` fridge | `DAY #150` | top right | center, full body | collapsed, exhausted |
| `imgi_19` island | `DAY 6` | top right | center, large | blank, wet, spent |
| `imgi_20` blue cube | none | — | left third | big smile |
| `imgi_21` age gradient | none | — | center | big smile |

**4 of 7 carry no text at all.** The 3 that do are a **number + unit in a top corner** — `$1`/`$1B`
(the stake), `DAY #150` / `DAY 6` (the endurance). Corner-placed, never over the face, white heavy
sans with hard black outline.

### Short-form 9:16 (8 files)

| File | Text | Kind |
|---|---|---|
| `imgi_117` trick-or-treat cash | none | raw video frame |
| `imgi_120` briefcase + phone | `$10,000` · `Mom` | **diegetic** — printed on the case, on the phone screen |
| `imgi_127` slime vs ice | `VS` + hazard icons | relational graphic |
| `imgi_130` flamethrower + pizza | `THE BEAST FLAMETHROWER` | **diegetic** — printed on the actual product |
| `imgi_131` find-them board | `FIND THEM` · `WIN $10,000` | **diegetic** — a real poster board on set |
| `imgi_132` Lambo + wall | none | raw video frame |
| `imgi_134` street interview | `NO-` | spoken-word caption (karaoke, mid-syllable) |
| `imgi_274` taxi cash | `TAXI` · `$100` | **diegetic** — taxi sign, money band |

**4 of 8 are diegetic** — the words exist as physical objects that were really there. **2 carry
nothing.** `imgi_131` is the tell: even "WIN $10,000" — pure marketing language — was **built as a
physical printed board and photographed**, not overlaid in post.

---

## Composition

- **Face in the left third or dead center**, foreground, hard cut-out separation from the
  background. Rim light on the subject is doing most of the work.
- **The subject occupies one side; "the thing" occupies the other** — the crowd, the cube, the
  prize, the opponent, the wreck. Two poles, one frame.
- **Saturated primaries, high-key, mostly bright and outdoor.** Blue sky, red, yellow. This is
  *not* the Grifon dark cinematic look — do not merge the two registers by reflex.
- **One focal point.** If the eye has two jobs, it does neither.

## Expression — the default is a warm smile, NOT shock

Across all faces: **big warm open smile dominates** (`16, 17, 20, 21, 130, 274`). Shock/wide-eye
appears only as a genuine *reaction* to something in-frame (`120`). Exhaustion appears in endurance
content (`18, 19`). Neutral/menacing when the premise is threat (`13`).

Forcing extreme shock on every frame produces the screaming-face look that reads instantly as AI
slop. **Match the expression to the premise; default warm, escalate only when the scene earns it.**

## The contrast device — the ENGINE, not a rule among rules

Recurs in `16` ($1 vs $1B), `21` (baby vs elderly), `127` (slime vs ice), `120` (cash vs a call to
Mom), `132` (supercar vs wall). **5 of 15.**

One frame that poses a question you cannot answer without watching. Not "here is a thing" — "here
are two things that should not be in the same picture."

**THE TWO-POLE TEST — run it before you brief or generate anything:**

> Name the two poles in one sentence. If you can't, you don't have a thumbnail yet — you have a
> photograph. Go back to the concept; do not proceed to the visual.

**Why this outranks the text law.** Proven the hard way on the 2026-07-28 test run: a generated
Grifon frame obeyed every branch of the text law perfectly — zero text, warm smile, saturated,
photographic, correct face placement — and was completely forgettable. A man standing in front of
colourful screens. Compliant and dead, because there was no second pole and therefore no question.

The text law is **necessary but not sufficient.** It stops you from ruining a good frame; only the
contrast device makes the frame worth stopping for. When time is short, spend it here.

## Short-form is a FRAME, not a composite

`117`, `132`, `134` are literally strong frames pulled from the video — not built thumbnails. For
9:16, the scroll-stopper must be **designed in-camera**, which means it is a storyboard/hero-frame
decision, not a post decision. Applies directly to our own video pipeline: the hero frame IS the
thumbnail.

---

## Direct-response translation (CMO seat)

**The YouTube thumbnail and the paid DR ad are different jobs. Do not transplant whole.**

| | YouTube thumbnail | Meta/TikTok DR ad |
|---|---|---|
| Viewer intent | actively browsing for something to watch | not looking for you at all |
| Competing against | ~20 thumbnails in a grid | friends' photos, native content |
| The payoff costs | nothing | money |
| A wrong click costs | 3 seconds | your ad spend |

A pure curiosity gap on a paid ad buys **cheap clicks and bad ROAS** — and worse, it trains
Andromeda on *clickers instead of buyers*, which is expensive to undo.

**Transfers:** face + expression, rim-light foreground separation, saturated color against a muted
feed, one focal point, the contrast device, diegetic number props, the no-sentence law.

**Does not transfer:** pure mystery with no product visible, no offer signal, stakes the viewer
gets nothing from.

**The DR-native version already passed our own gate** — `S12 pattern-interrupt hook`,
9 ads / 5 brands, [`workflows/static_ad_swipe_file.md`](../../../workflows/static_ad_swipe_file.md).
**When MrBeast's playbook and S12 disagree on a paid ad, S12 wins** — it survived a DR test;
MrBeast's numbers came from free content.

### Prize numbers vs price numbers — how this reconciles with "never mention price"

MrBeast's numbers quantify **what the viewer GETS** (`$10,000`, `WIN $10,000`, `$1B`). Our standing
hard constraint bans numbers that quantify **what the viewer PAYS**.

No conflict, and it sharpens the rule:

- **Allowed:** a number for the outcome, the scale, the stake, the duration, the count.
- **Banned, unchanged:** any peso price, tier, or discount in a thumbnail, ad still, or video script.

## Kuya Marvin / Oceanides

The diegetic law is a gift here, because Marvin's proof is *already physical*. The number belongs on
the truck, the meter, the receipt, the invoice, the tank — photographed, not overlaid. That is real
proof passing cleanly through the no-fake-proof constraint, and it beats any caption we could write.
(Standing: never use "Malabanan".)

---

## Register: exaggerate the SITUATION, never the RENDERING

The law's lighting layer (saturated, high-key, rim-lit, hyper-real commercial photography) collides
head-on with the believability register that governs real-person content —
[`marvin-avatar`](../marvin-avatar/SKILL.md) mandates flat overcast, no rim light, matte skin, never
cinematic. Surfaced on the 2026-07-28 test run. Resolve it this way, not by picking a side:

**MrBeast's frames are not faked — his situations are.** `120` real cash in a real briefcase, `274`
a real taxi and real hands, `130` a real flamethrower and a real pizza, `131` a real printed board,
`117` a raw video frame. He stages something genuinely remarkable and photographs it straight. The
exaggeration lives in *what happened*, not in *how it was rendered*.

So the split is by **subject**, and the reason is trust exposure, not taste:

| Subject | Rendering | Situation |
|---|---|---|
| **Grifon** (SaaS, no real named person) | stylize freely — composite, saturate, hyper-real. No trust liability. | push hard |
| **Kuya Marvin / Oceanides**, and any real named person or client | **believability register wins** — soft even light on the face, matte skin, phone-camera, per `marvin-avatar` | push hard |

**The believable register is NOT the grey register.** Learned the hard way on the same test run:
"flat overcast" was misread as *drain the colour*, and the result — grey concrete, white sky, silver
van, one navy shirt — was rejected on sight ("sakit sa mata"). The rule governs the **light on the
subject's face**, not the **colour of the world**. A bright tropical Philippine day (deep blue sky,
white cumulus, banana and palm, warm concrete) is simply *true*, and it costs the register nothing
as long as his face stays in soft even light with no hard shadow, sun patch, rim light or
golden-hour cast. Approved reference:
[`clients/oceanides/kuya-marvin/daylight-register/marvin-daylight-master.png`](../../../clients/oceanides/kuya-marvin/daylight-register/marvin-daylight-master.png)
(Neil, 2026-07-28).

**Watch the neighbours, not the frame alone.** The muted version only read as broken because it sat
directly beside two saturated Grifon frames — a real contrast effect, and the reason the first
verdict was "still grey." In a live Meta feed a believable frame sits beside friends' photos and
native content, where the muted register reads correctly. Judge a frame against the feed it will
actually run in, never against our own swipe set.

A viewer who clocks a MrBeast thumbnail as staged thinks *"this looks fun."* A Filipino homeowner
who clocks Marvin's photo as AI thinks *"is this company even real?"* — and then does not let him
into their house. MrBeast spends 500M subscribers' worth of accumulated trust; a service brand
pre-launch has none. Identical stylization, completely different bill.

**This has already been paid for once:** the blue vacuum tanker was retired from Marvin content
because Oceanides owns no such truck — logged as a believability/truth risk. A composited scene
implying equipment, scale, or results they don't have is not a style choice, it is a **claim**.

Marvin's contrast devices must therefore be *true ones*, and he already has them: the real
before/after pair ([`clients/oceanides/assets/`](../../../clients/oceanides/assets/) `before-1.jpg`
/ `after-1.jpg`), the real DENR and BIR badges, the real van, real scale, real elapsed time. True
poles hit harder than invented ones anyway — they survive the comments section.

## What this does NOT license

- **No tuned-prompt edits.** [`services/geminiService.ts`](../../../services/geminiService.ts) —
  `MRBEAST_THUMBNAIL_STYLE`, `NO_TEXT_CONSTRAINT`, `generateThumbnail` — is TUNED. This document
  governs what CMO and CD produce **by hand**; changing what the *product* generates for users is a
  separate, Neil-approved, A/B-tested change.
- **No fake proof.** Diegetic text must be a thing that really existed in the shot. Compositing a
  fake receipt or an invented stat onto a prop is the same lie as overlaying it.
- **Not a license to go bright.** DESIGN.md still governs Grifon's own brand surfaces
  (`zinc-950`, `#FFCC00`). MrBeast's saturated high-key register applies to *ad creative and
  thumbnails*, not to app UI or marketing pages.

## Gated, not applied

Two known gaps between this decoded law and what the **product** ships, both open and awaiting
Neil:

1. `generateThumbnail` has **no composition layer** — it specifies photography (`Sony A1, 35mm
   f1.4`, rim light, real skin) and nothing about face placement, the two-pole split, or the
   contrast device.
2. It forces `extreme, high-energy facial expression (Shock/Surprise/Joy)` — the evidence says the
   default should be a warm smile, escalating only when the premise earns it. It also bans all text
   unconditionally, which forecloses the diegetic-prop pattern on 9:16.

Both are Gated Proposals. Do not apply without Neil's approval and an eyeball A/B.

---

## Correction History

**2026-07-28 — the rule this replaces was wrong.** `grifon-cmo/SKILL.md` and
`grifon-creative-director/SKILL.md` both carried *"3–5 big words overlaid, high-contrast text."*
All 15 files contradict it: not one has an overlaid marketing sentence. The rule was written from
the 2019–2021 MrBeast era, when he did overlay words; he moved off it and our docs did not follow.

Two failure modes worth remembering, because both bit us in the same hour:

- **Duplicated rules drift.** The rule lived in two SKILL.md copies and neither got updated. That is
  why this file exists — same reasoning as `pricing-ladder.md`.
- **Small samples produce confident wrong laws.** The first read of 4 long-form files produced
  *"MrBeast uses zero text on 16:9"* — falsified immediately by files 16, 18 and 19. The real law
  only appeared after all 15. Read the whole set before writing a rule.
