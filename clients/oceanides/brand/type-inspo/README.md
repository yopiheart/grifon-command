# Drop your font-combo inspiration here

Neil: put the screenshots / PDFs / boards from your font-combo folder in this
directory, then commit and push. Sessions run in the cloud, so a folder that
only exists on your PC is invisible here until it is pushed.

Actual font FILES (`.ttf` / `.otf` / `.woff2`) go one level up, in
`clients/oceanides/brand/fonts/`, not in here.

## What happens next

The wordmark in `logo-primary.svg` and `logo-lockup.svg` is currently set in
**Archivo Black** as a placeholder. It was picked from the four faces already
committed to `api/_lib/assets/fonts/`:

| Face | Why not |
| --- | --- |
| Anton | Condensed headline face. Goes claustrophobic as a wordmark. |
| Inter Black | A UI face. Correct for body copy, characterless as a mark. |
| Montserrat ExtraBold | The geometric-sans default. Reads as generated. |
| **Archivo Black** | **Wide grotesque, real authority at small sizes. Used.** |

Once your boards land here, the swap is one line: change `FACE` in
`tools/brand/build-oceanides-logo.py` and rerun it. Every variant regenerates
from the same geometry, so nothing else moves.

## What the face has to survive

Not "which looks nicest on a board" -- these are the real jobs:

- **5-6pt on a business card.** Most display faces fall apart here.
- **A truck panel at two metres.** The same face, unchanged.
- **One colour, reversed out of navy**, embroidered on a uniform.
- **Filipino B2B register.** It is read by building admins and restaurant
  owners deciding whether this company has its papers in order.

A pairing that only works at poster size is not a brand typeface, it is a
headline. Bring the whole board and I will say which half survives contact.
