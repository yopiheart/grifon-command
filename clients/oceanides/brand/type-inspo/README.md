# Font-combo board — filed, and the verdict

Neil dropped six carousel slides here on 2026-09-03 (they arrived loose in
`clients/oceanides/`, renamed by pairing when filed).

| # | Pairing | Verdict |
| --- | --- | --- |
| 01 | Tempting + Switzer | ❌ Tempting is a script. Switzer is good but Fontshare was unreachable from the build sandbox, so it could not be tested. |
| 02 | Arial + Epic Pro | ❌ Arial is a default, not a choice. Epic Pro is an extended tech/sports face — wrong register. |
| 03 | Shadow Light + Balboa | ❌ Handwriting undercuts a compliance pitch. Balboa is paid. |
| 04 | Inter + Times New Roman MT | ⚠️ The structure is right (grotesque + institutional serif) and Inter is already the DESIGN.md body face. Times itself reads as a Word document. |
| 05 | Archivo + Abril | ✅ **The Archivo half WINS.** Abril loses — see below. |
| 06 | Athelas + Vanguard | ❌ Both paid. Vanguard is genuinely strong for a wordmark; revisit only if a licence is bought. |

## The winner: Archivo Expanded ExtraBold

`wdth 125, wght 800`, committed at `../fonts/Archivo-Expanded-800.ttf`.
SIL Open Font License 1.1 — free for commercial use, logos included.

**Picked by measuring, not taste.** All six candidates were set as OCEANIDES at
three sizes that matter:

- **50px** — wordmark scale
- **19px reversed on navy** — how it lives on the card front
- **11px (~5pt)** — the real fine-print size on a 90mm card

Archivo Expanded holds its counters at 11px. **Abril Fatface — the other half of
Neil's own slide 05 — closes up**, because a Didone's thin strokes vanish at 5pt
and at truck distance. Width was the tiebreaker after that: an expanded face
reads *established*, which is the entire job of this brand's identity.

Neil's board and the interim placeholder (Archivo Black) converged on the same
family independently. That is corroboration, not coincidence — but note it is a
sample of two opinions, not a test with users.

## To change it

The vector mark family this face was originally cut for was DELETED on
2026-09-03 -- Neil's new logo is the single mark now. The face survives that
decision because it is still the closest match to the new logo's own wordmark,
and it is what print surfaces are set in. To change it: swap the file at
`../fonts/`, update the `@font-face` in `clients/oceanides/card/_card.css`, and
rerun `node clients/oceanides/card/render-card.mjs`. The font gate there fails
the render if the new file does not load, so a silent Arial fallback cannot ship.

## What a replacement must survive

- **5–6pt on a business card.** Most display faces fail here.
- **A truck panel at two metres**, unchanged.
- **One colour, reversed out of navy**, embroidered on a uniform.
- **Filipino B2B register** — read by building admins deciding whether this
  company has its papers in order.

A pairing that only works at poster size is a headline, not a brand typeface.
