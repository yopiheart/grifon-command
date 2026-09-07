---
name: generate-zam-images
description: Generate identity-consistent Zam images and batches using the approved master and body-integration anchors. Use for Zam UGC, lifestyle scenes, outfits, or character variants. This entrypoint routes to the preserved Zam workflow and its exact assets.
---

Read [the Codex desktop adapter](../_shared/codex-runtime.md), then follow the [canonical Zam workflow](../../../workflows/believability-samples/generate-zam-images/SKILL.md).

Resolve all canonical relative paths from `workflows/believability-samples/generate-zam-images/`, not from this alias directory. In particular preserve the [approved master](../../../workflows/believability-samples/zam-master/opt-C-presenter.png), [body-integration anchor](../../../workflows/believability-samples/generate-zam-images/assets/zam-approved-scene-reference.png), and [prompt blueprint](../../../workflows/believability-samples/generate-zam-images/references/prompt-blueprint.md). Do not substitute chat photos or other generated identities when an anchor is unavailable.

Use the installed imagegen skill and native generation/editing tool. The original crop helper is available only when the user explicitly requests programmatic cropping; otherwise use the image editing tool. Missing exact assets block dependent generation. Paid operations require the approved test spec and cost limit in AGENTS.md; this alias authorizes no paid call by itself.
