# Zam avatar — face-anchored believability baseline (2026-06-26)

First real-person identity test for the Believability DNA register system
([../believability_dna.md](../believability_dna.md)). All images generated from
ONE source selfie of Zam, via Codex `gpt-image-2` **edit mode** (`--edit` anchored
to her photo) — so identity is built on her actual pixels, not text-gen.

## Files

- `zam-ref-source.jpg` — the single source selfie (the edit anchor). Keep — needed
  to reproduce / extend the set.
- `zam-register-1-raw-ugc.png` — phone selfie, window light, messy bedroom. **Trust winner.**
- `zam-register-2-polished-ugc.png` — ring-light creator grade, clean-but-real.
- `zam-register-3-cinematic.png` — studio key+rim, reads as "an ad."
- ~~`zam-var-1-kitchen.png` / `zam-var-2-car.png` / `zam-var-3-bathroom-mirror.png` /
  `zam-var-4-cafe-outdoor.png`~~ — raw-ugc identity-lock test: 4 rooms/angles/outfits.
  **DELETED 2026-07-28 (Neil: hindi pasado).** The test's *findings* below still stand;
  recover the images from git history if ever needed.

## Result (honest)

- Identity held **~90–95%** across all 7 generations — instantly reads as the same
  person; casual viewers won't clock a difference.
- Subtle **drift** in face width / jaw / apparent age across the set (kitchen =
  strongest match; car/mirror slightly leaner; cafe slightly rounder). This is the
  gap between "looks like her" (have it) and "biometric-locked" (not yet).
- Mechanism is reference-anchored image editing (gpt-image-2 edit / IP-Adapter
  class) — **not** novel tech. The potential moat is the *system* (register
  taxonomy + identity-lock + Veo talking-avatar pipeline + believability tuning),
  not the mechanism.

## Next steps (planned 2026-06-27)

1. Zam to send **3–5 reference angles** (front / 3-4 / profile / smiling) so the
   model has full face geometry, not one frozen frame → tighten drift below ~92%.
2. Regenerate registers + variations from the multi-ref set.
3. Take the single strongest frame into **ONE Veo 3.1 motion + lip-sync test** —
   the actual make-or-break for "Zam the avatar can carry video ads." Stills are
   not an avatar until she holds identity *in motion*. Render it **RAW / ungraded**
   — a LUT would mask the temporal artifacts we're judging. LUT + captions + short
   cuts are finishing (step 3), applied only after raw motion is proven. See the
   "Surface-A LUT / raw-first rule" section in [../believability_dna.md](../believability_dna.md).
