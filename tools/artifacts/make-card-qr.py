#!/usr/bin/env python3
"""Regenerate the business-card QR path baked into data/oceanides-card-qr.json.

    pip install segno && python3 tools/artifacts/make-card-qr.py

The card art embeds the QR as an inline SVG <path> (one rect run per row) so the
artifact and its standalone twin stay self-contained -- no image host, no CDN.
Change URL below and rerun; the builder picks the new path up automatically.

Error correction is M (~15%). Do NOT drop to L: the printed card is matte
laminated and gets handled, and L has no headroom for a scuff across a finder
pattern. Version 5 (37x37) at 16mm square keeps the module size above the
~0.4mm floor most phone cameras need in poor lobby light.
"""
import json, pathlib, segno

URL = "https://oceanidesph.com/?utm_source=card&utm_medium=print&utm_campaign=canvass-01"

q = segno.make(URL, error="m")
m = [list(r) for r in q.matrix]
n = len(m)
runs = []
for y in range(n):
    x = 0
    while x < n:
        if m[y][x]:
            x2 = x
            while x2 + 1 < n and m[y][x2 + 1]:
                x2 += 1
            runs.append(f"M{x} {y}h{x2 - x + 1}v1h-{x2 - x + 1}z")
            x = x2 + 1
        else:
            x += 1

out = pathlib.Path(__file__).parent / "data" / "oceanides-card-qr.json"
out.write_text(json.dumps({
    "_generator": "tools/artifacts/make-card-qr.py",
    "url": URL, "version": q.version, "error": "M",
    "modules": n, "path": "".join(runs),
}, indent=1) + "\n")
print(f"wrote {out} -- version {q.version}, {n}x{n} modules")
