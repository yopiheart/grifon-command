#!/usr/bin/env python3
"""Oceanides brand mark -- generates the whole SVG family from ONE geometry source.

    python3 tools/brand/build-oceanides-logo.py

WHY A GENERATOR AND NOT FIVE HAND-DRAWN FILES
---------------------------------------------
A logo family drifts. The favicon gets nudged, the lockup does not, and six months
later the shield on the truck is 2% wider than the shield on the card and nobody
can say which is right. Every variant here is cut from the same constants below,
so there is exactly one shield in the world.

WHAT THIS REPLACES
------------------
clients/oceanides/assets/logo.jpg -- a 316x316 JPEG carrying 18,832 distinct
colours (measured), a gradient-filled wordmark, and seven competing elements. It
is the only master that existed; public/logo.svg is a placeholder stub that
renders the literal word "LOGO". Every appearance of the brand anywhere was a
resample of that one small JPEG.

THE DIRECTION IS SUBTRACTION (Neil, 2026-09-03)
-----------------------------------------------
Seven elements become three: shield, wave, mosquito. Cut are the concentric
rings, the arc service text, the ribbon (it survives in the full lockup only),
and every gradient. Flat colour, real geometry, no raster.

Palette is the DESIGN.md ladder. Note deliberately absent: amber. The measurement
that started this said 0 of 99,856 pixels in the old mark are warm -- amber is a
signage decision (DESIGN.md:93), never derived from the logo. Whether the mark
gains a warm accent is Neil's call after seeing it, not something a redraw
smuggles in.
"""
import pathlib

OUT = pathlib.Path(__file__).resolve().parents[2] / "clients" / "oceanides" / "brand"

# ---- palette (clients/oceanides/DESIGN.md) ----
DEEP  = "#0A1F45"   # surface-deep -- shield ground
OCEAN = "#1C63AD"   # ocean        -- water
WHITE = "#FFFFFF"

# ---- the shield -------------------------------------------------------------
# One 96x112 box. FIRST ATTEMPT USED A 4-UNIT TOP RADIUS AND STRAIGHT FLANKS and
# read as a bookmark, not a shield -- caught on the render, not in the head. An
# 8-unit radius plus flanks that bow outward before the sweep is what makes the
# silhouette register as a crest at 16px, where no interior detail survives.
SHIELD = ("M14,6 H82 A8,8 0 0 1 90,14 V52 C90,78 73,97 48,107 "
          "C23,97 6,78 6,52 V14 A8,8 0 0 1 14,6 Z")

# ---- the water --------------------------------------------------------------
# Drawn oversize and clipped to the shield, so the wave meets the shield edge
# exactly instead of being eyeballed to it. The crest rises left-to-right; that
# asymmetry is the only movement in an otherwise symmetrical mark.
WATER = "M-4,74 C12,64 26,80 44,74 C62,68 76,60 100,67 V120 H-4 Z"
CREST = "M-4,74 C12,64 26,80 44,74 C62,68 76,60 100,67"

# ---- the mosquito -----------------------------------------------------------
# TOP-DOWN AND SYMMETRICAL, and that is the whole lesson of the first attempt.
#
# v1 drew a side-view mosquito -- anatomically the more identifiable pose, since
# the proboscis and hunched posture are the species cues. Rendered at 200px it
# read as a squid: thin splayed legs became tentacles and the swept wings became
# a blade. A mosquito is intrinsically spindly, and spindly does not survive
# either small reproduction or a flat silhouette.
#
# Top-down fixes it three ways: symmetry reads as heraldry rather than as an
# animal photograph, the wings become two broad shapes instead of thin slivers,
# and the proboscis sits on the vertical axis where it is unmistakable. Only the
# RIGHT half is drawn; the left is a mirror, so the mark cannot drift asymmetric.
MOSQ_BODY = ("M48,30 C50.6,30 51.8,32.2 51.5,35.2 L49.7,57.5 "
             "C49.5,59.6 46.5,59.6 46.3,57.5 L44.5,35.2 C44.2,32.2 45.4,30 48,30 Z")
MOSQ_HEAD = (48, 28.2, 4.0)          # cx, cy, r
MOSQ_PROB = "M48,24.6 L48,13.5"       # the one stroke that says mosquito, not fly
MOSQ_HALF = {                          # right side only -- mirrored for the left
    "wing": "M50.5,34.5 C61,40.5 70,51 72.5,63 C63.5,59 53.5,48.5 49.4,40.5 Z",
    "antenna": "M50.6,25.4 C54,21.5 56.5,18.5 57.5,15.5",
    "legs": ["M51.4,37.5 C60,40.5 67,42 72.5,41",
             "M51.2,42.5 C61,47.5 68,53.5 71,60",
             "M50.6,47.5 C57,55 60,62.5 60,69.5"],
}


def mosquito(fill):
    hx, hy, hr = MOSQ_HEAD
    half = [
        f'      <path d="{MOSQ_HALF["wing"]}" fill-opacity=".72" stroke="none"/>',
        f'      <path d="{MOSQ_HALF["antenna"]}" stroke-width="1.7" fill="none"/>',
        *[f'      <path d="{d}" stroke-width="2.0" fill="none"/>' for d in MOSQ_HALF["legs"]],
    ]
    # SCALE IS NOT COSMETIC HERE. Drawn at 1:1 the legs cross the white crest and
    # run into the water, so the insect and the wave fight over the same band.
    # 0.82 about (48,37) pulls the whole silhouette clear of the crest and leaves
    # the navy field reading as air above water, which is the point of the mark.
    return "\n".join([
        f'    <g fill="{fill}" stroke="{fill}" stroke-linecap="round" '
        f'transform="translate(48,37) scale(.82) translate(-48,-37)">',
        '      <g>', *half, '      </g>',
        # mirror about the mark's vertical axis (x=48): translate out, flip, back
        '      <g transform="translate(96,0) scale(-1,1)">', *half, '      </g>',
        f'      <path d="{MOSQ_BODY}" stroke="none"/>',
        f'      <circle cx="{hx}" cy="{hy}" r="{hr}" stroke="none"/>',
        f'      <path d="{MOSQ_PROB}" stroke-width="2.8" fill="none"/>',
        '    </g>',
    ])


def shield_group(with_mosquito=True, mono=None):
    """mono=None -> full colour. mono='<hex>' -> single flat colour, no water tone."""
    cid = "sh"
    if mono:
        return "\n".join([
            f'  <path d="{SHIELD}" fill="{mono}"/>',
            f'  <clipPath id="{cid}"><path d="{SHIELD}"/></clipPath>',
            f'  <g clip-path="url(#{cid})">',
            f'    <path d="{CREST}" fill="none" stroke="{WHITE}" stroke-width="5"/>',
            f'    <path d="{WATER}" fill="{WHITE}" fill-opacity=".22"/>',
            '  </g>',
            mosquito(WHITE) if with_mosquito else '',
        ])
    return "\n".join([
        f'  <path d="{SHIELD}" fill="{DEEP}"/>',
        f'  <clipPath id="{cid}"><path d="{SHIELD}"/></clipPath>',
        f'  <g clip-path="url(#{cid})">',
        f'    <path d="{WATER}" fill="{OCEAN}"/>',
        f'    <path d="{CREST}" fill="none" stroke="{WHITE}" stroke-width="4.5"/>',
        '  </g>',
        mosquito(WHITE) if with_mosquito else '',
    ])



# ---- wordmark ---------------------------------------------------------------
# Text is OUTLINED to real paths, never left as <text>. A logo carrying a
# font-family reference is a logo that renders in Arial on the one machine that
# matters -- the printer's RIP, a partner's deck, a sign shop's plotter. Outlined
# paths have no dependency and no licence question at all.
#
# INTERIM FACE: Archivo Black. Chosen over the other three already committed to
# api/_lib/assets/fonts/ -- Anton is a condensed headline face and goes claustro-
# phobic as a wordmark; Inter Black is a UI face; Montserrat ExtraBold is the
# geometric-sans default that reads as generated. Archivo Black is a wide
# grotesque with real authority at small sizes, which is the job.
#
# This is a PLACEHOLDER PENDING NEIL'S TYPE FOLDER (clients/oceanides/brand/
# type-inspo/). Swap FACE below and rerun -- nothing else changes.
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

FACE = pathlib.Path(__file__).resolve().parents[2] / "api" / "_lib" / "assets" / "fonts" / "ArchivoBlack-Regular.ttf"


def outline(text, cap_h, tracking=0.0):
    """Text -> (single path data, advance width), scaled so CAP HEIGHT == cap_h.

    Cap height, not em size, because a wordmark is aligned optically to the mark
    beside it and the em box is mostly air.
    """
    font = TTFont(FACE)
    upm = font["head"].unitsPerEm
    cap = getattr(font["OS/2"], "sCapHeight", 0) or int(upm * 0.72)
    scale = cap_h / cap
    glyphs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
    parts, x = [], 0.0
    for ch in text:
        name = cmap.get(ord(ch))
        if name is None:
            x += upm * 0.3 * scale
            continue
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        d = pen.getCommands()
        if d:
            # font space is Y-up, SVG is Y-down: flip once, here, on the group
            parts.append(f'<g transform="translate({x:.2f},0) scale({scale:.5f},{-scale:.5f})">'
                         f'<path d="{d}"/></g>')
        x += hmtx[name][0] * scale + tracking
    return "".join(parts), x - tracking



def svg(vb, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" '
            f'aria-label="{title}">\n<title>{title}</title>\n{body}\n</svg>\n')


MARK_W, MARK_H = 96, 112

def lockup(with_ribbon):
    """Mark left, wordmark right, optically centred on the wordmark's cap band."""
    cap = 30.0
    word, w_word = outline("OCEANIDES", cap, tracking=1.2)
    gap = 26.0
    x0 = MARK_W + gap
    # baseline sits so the cap band centres on the mark's own vertical centre
    base = MARK_H / 2 + cap / 2 - (6 if with_ribbon else 0)
    rows = [f'  <g transform="translate({x0},{base})" fill="{DEEP}">{word}</g>']
    total_w = x0 + w_word
    if with_ribbon:
        sub, w_sub = outline("Malabanan Services", 13.0, tracking=0.8)
        rows.append(f'  <g transform="translate({x0 + 1.5},{base + 26})" fill="{OCEAN}">{sub}</g>')
        total_w = max(total_w, x0 + w_sub)
    body = shield_group(True) + "\n" + "\n".join(rows)
    return svg(f"0 0 {total_w + 4:.0f} {MARK_H}", body,
               "Oceanides Malabanan Services" if with_ribbon else "Oceanides")


files = {
  "mark.svg":         svg("0 0 96 112", shield_group(True),  "Oceanides"),
  "mark-small.svg":   svg("0 0 96 112", shield_group(False), "Oceanides"),
  "mark-mono.svg":    svg("0 0 96 112", shield_group(True, mono=DEEP), "Oceanides"),
  "logo-primary.svg": lockup(False),
  "logo-lockup.svg":  lockup(True),
}
OUT.mkdir(parents=True, exist_ok=True)
for name, data in files.items():
    (OUT / name).write_text(data)
    print(f"  {name:16s} {len(data):5d} bytes")
print(f"\nwrote {len(files)} files to {OUT}")
