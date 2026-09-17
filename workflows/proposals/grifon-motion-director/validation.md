# Candidate validation

Checked 2026-09-17. This is proposal validation, not an installed skill or automatic-trigger result.

Subsequent application: Neil approved the exact hash below; the patch was applied
unchanged. Installed static check reports 32 entrypoints and zero errors.
The earlier candidate-only results below remain the preparation record.

- `git apply --check workflows/proposals/grifon-motion-director/install.patch`: exit 0. Patch remains unapplied.
- Candidate frontmatter parsed with the repository's installed `yaml` Node package: pass. Name, allowed keys, description type and description length checked.
- Evaluation JSON parses: three dry-run tasks and ten trigger queries. The tasks cover Grifon branding, client branding, and wrong-skill routing.
- Installed-location relative links resolve to the existing adapter, AI Editor, Viral Autopsy, DESIGN.md, brand-spec.md, Hyperframes decision and launch template. The bundled treatment reference and completed demo README resolve. Full candidate static check in an isolated tree reports 32 entrypoints and zero errors; the active skill directory remains unchanged.
- `python .../quick_validate.py`: initial attempt hit the Windows Python alias. Retried with the existing bundled Python runtime; the helper cannot run because PyYAML is absent. No dependency was installed and no validator was weakened. The Node YAML check above is an alternate format check, not a claim that the Python helper passed.
- Three explicit WITH-skill behavioral dry runs were completed, with written outputs under evaluation/with-skill. Independent review caught a canonical-logo omission that original marker checks missed; candidate guidance and the Grifon plan were corrected, and its assertion now includes the exact brand lockup. Fresh-context automatic-trigger tests remain pending. No benchmark score or user creative approval is claimed.

Exact patch SHA-256: `2b542b8b135997e33a322856de8bd00d45c5bacf75fa3b37dfdbc046ce462074`.
