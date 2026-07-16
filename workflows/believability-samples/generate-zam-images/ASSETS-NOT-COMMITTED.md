# Missing `assets/` — intentional

The original `generate-zam-images` skill (the ChatGPT/Codex-side skill that
produced the 98%-real Zam UGC results, dropped by Neil 2026-07-16 as
`generate-zam-images.zip`) bundles two identity-anchor images:

- `assets/zam-face-reference.jpg` — primary raw Zam identity reference
- `assets/zam-approved-scene-reference.png` — approved natural body-integration
  reference

They are **not committed here**: the agent's permission layer treats a real
person's face-reference photos as identity data requiring Neil's own explicit
push, and their hashes differ from the already-canonical
[`../zam-ref-source.jpg`](../zam-ref-source.jpg) (these are newer/approved
anchors, not duplicates). The text of the skill — `SKILL.md`,
`references/prompt-blueprint.md`, `scripts/crop_to_ratio.py`,
`agents/openai.yaml` — carries all the transferable knowledge and is committed
in full.

To restore the full skill: Neil commits `generate-zam-images.zip` (or just the
two asset files) himself, or re-drops the zip from his own storage next
session. The zip also lives on his ChatGPT/Codex side, so nothing is
single-copy on this defreezer PC.
