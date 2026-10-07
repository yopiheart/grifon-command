# Motion Director action guidance: proposed exact diff

Status: prepared for review; not applied to the installed skill. The reusable action contract and pilot can be used directly without this wording update.

Target: .agents/skills/grifon-motion-director/SKILL.md. Frontmatter, provider settings, identity rules, and permission boundaries stay unchanged. Apply only after the user approves this specific diff, as required by AGENTS.md's tuned-content rule.

```diff
--- a/.agents/skills/grifon-motion-director/SKILL.md
+++ b/.agents/skills/grifon-motion-director/SKILL.md
@@ -29,0 +30,2 @@
+For a scene-based composition with synchronized sound, start from the [shared action pilot](../../../workflows/assets/grifon-motion-action-pilot/README.md). Give each scene a viewer purpose and a readable interval. Keep action intervals, easing, transitions, and contact events in one editable specification; derive animation, audio cue placement, and timing checks from it. Choreography remains authored for the brief. Validate the composition's actual target/action bindings so a renamed or unsupported action fails clearly.
+
@@ -45,0 +48,2 @@
+For a shared action composition, check one contact-time revision against both its visible landing and its derived sound cue, and render a copy-only revision without changing action timing. For shader layers, await completed GPU work before frame capture and compare non-linear and fresh-browser seeks; a preview that merely appears stable is insufficient evidence.
+
```

This is intentionally narrow. It does not require shaders, sound, continuous movement, a fixed duration, a new engine, or a new provider for every motion request. The evidence supporting it is the action pilot's contract tests, rendered mutation probes, deterministic seek checks, and independent review. Record actual results in the pilot report; do not treat the existence of this proposal as validation or automatic activation.
