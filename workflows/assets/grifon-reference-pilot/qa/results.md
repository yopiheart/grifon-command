# Pilot verification — 2026-09-27

Scope: 10.10-second closing-sequence study (source 22.80–32.90), not the full remake.
No final MP4, audio, paid generation, AE operation or production deployment.

## Observed checks

- Hyperframes 0.7.68 `check --at 0.15,1.5,2.8,3.7,4.4,5.7,6.3,7.5,9.4 --snapshots`:
  exit 0; zero lint/runtime/layout errors or warnings; 10/10 sampled text contrast
  checks passed. One informational off-canvas finding during a deliberate card
  entrance. No motion assertion sidecar was supplied; its zero-error result alone
  is not evidence that the choreography matches the reference.
- CUA: inspected reference and composition side-by-side at representative points;
  played the local comparison. Corrected early rule visibility, prefix centering,
  center-card scale and side-card reveal direction/timing after visual inspection.
- Independent smoke-tester: 390×844 viewport, both panels loaded, muted playback
  advanced reference 22.8→32.89 seconds, all five chapter buttons, frame scrub and
  restart passed. Scroll/client/viewport widths all 390px. Mobile screenshots were
  emitted through CUA; that API exposed no saved path. This check preceded the last
  choreography-only adjustments. The comparator controls were unchanged afterward.
- Editability: in a disposable copy, replaced only “Shape your message.” with
  “Find your message.”. Both original and changed composition captured at t=5.7
  using the same fresh-seek protocol. Exact pixel comparison shows differences
  only inside the edited text line; see editability-result.json. No video encoded.
  An earlier unequal-seek-history comparison failed due small center-card raster
  differences; the test was corrected to compare matching capture protocols.
- `npm.cmd run check:artifact-anchors`: exit 0.
- Standalone builder: exit 0; assets and reference embedded in a 15.1 MiB HTML.

## Remaining limits

The geometry is closely measured, but gradient lighting, font identity and easing
are reconstructed approximations. Gradients in this first study are smoother and
less luminous than the original. The Grifon lockup, shorter feature copy and two
semantic icons intentionally differ. This is not yet a user-approved close match.

CUA emitted a MutationObserver.observe error without a source URL during mobile
testing. No MutationObserver call exists in the authored HTML or bundled GSAP;
Hyperframes reported zero runtime errors. Attribution remains unconfirmed.

The standalone file was built, but browser automation refused file:// URLs.
No alternate surface was used to circumvent that restriction. The original
localhost source comparison is the verified playback route; portable-file
playback still needs a normal user open. No local-file playback claim is made.

## Research context retained

Higgsfield screenshot prompts ask for style inspiration, new motion and rendering.
Those are third-party examples and do not override Neil's fidelity/no-render brief.
The shneural setup post describes SEPARATE Astra and Opus trials on the same machine,
not a combined-model pipeline. Creator-reported tools: skia-python, Blender scripts,
sample-library sequencing/mixing in Python; Blender MCP and audio tools available.

Sources:
- https://x.com/shneural/status/2103151003272962130
- https://x.com/shneural/status/2103441806532706655
- https://github.com/latent-spaces/brag

No model ranking was established by this task. No external skill was installed or
copied into the Grifon instruction stack.
