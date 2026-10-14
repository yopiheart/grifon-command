# Verification record - 2026-10-14

Renderer SHA256: `E54C120FA8A0B1125044AE084882F29EF36CFF9AD19955B4730FCA60236D348A`.
Company source remote head verified: `dc680e8005044dfa741accabdde7377fb9dc59c6`.

- Python unittest discovery: 35/35 PASS. Covers decimal rounding, line/payment/total
  mismatch rejection, missing confirmations, draft-to-final placeholders, long numeric
  quantities, dates, private storage, immutable revisions, corrupt registers, locks,
  render failures, fonts, generated currency, sample content and pagination. Added
  loads/volume consistency, L-to-m³ comparisons, independent billing quantities,
  package scope quantities without invented rates and separate long load counts.
- Typography regression proof: the previous renderer at `fe8bc374` fails the new
  geometry checks (1.5 pt primary-row baseline spread, 3 pt final-total offset).
  New primary-row baselines coincide; quantity/volume/price headers and line/final
  amounts share their right edges within the tested 0.5 pt tolerance.
- Bundled Inter derivatives have tabular digits, correctly embedded peso/m³ glyphs,
  and no Windows font dependency. New revisions snapshot exact font/license bytes.
  A repeated font build from the recorded source is byte-identical. Build-only
  FontTools 4.60.1 is isolated in ignored `.tmp/quotation-font-build`.
- Repository `npm.cmd run check:codex`: 26/26 PASS, no skill-reference errors.
- System skill-creator `quick_validate.py`: PASS. Its missing PyYAML dependency was
  installed only in ignored task-local `.tmp/quotation-check-deps` for validation.
- Independent source review: no remaining actionable findings at the renderer hash
  above. A separate load-count width finding was fixed and demonstrated red-before-green;
  the complete count 123456789 now survives in one number even beside quantity 1 project.
  A font-cache/snapshot mismatch was also fixed: two independent probes (different
  face and changed bytes with the same face name) now stop before PDF/record export.
  The new regression test fails both cases on the exact pre-guard CD28FF31 source,
  without setup errors, and passes with the fix.
- Independent visual smoke: all eight pages inspected using Poppler. Short 1 page,
  mixed 2 pages, long 4 pages, siphoning 1 page. Complete contacts/TIN repeat across
  the white letterhead and quiet footer. Bold title, restrained type scale and blue
  total emphasis, no missing glyphs, clipping,
  stranded headings or split numbered paragraphs. All 24 stress paragraphs and END
  marker appear once. Siphoning shows 3 loads, 10 m³/load, 30 m³ included scope,
  PHP 37,500.75 final total and exact PHP 18,750.38 + 18,750.37 payment amounts.
- Independent design critic found no actionable typography/alignment gap in the
  redesigned short/siphoning samples. Main inspected the live Apple reference and
  measured its computed typography. The critic could not independently open that
  browser reference; its verdict covers these PDFs, not exact SF Pro matching.
- Before-fix evidence: the initial currency regression failed on extracted NUL glyph;
  the original short pagination assertion failed 2 != 1. The later closing-group
  regression also failed before the nesting fix. All now pass without reducing body type.
- Fresh ephemeral Codex session, outside the repository and without prior chat history:
  discovered the installed personal skill from a natural-language Oceanides request,
  acknowledged the supplied final price and bundled missing scope/client/payment info.
- A second fresh session discovered the same skill and generated the fictional short
  PDF, editable JSON and preview using existing sample data. It visually checked the
  one-page result. Both fresh-session commands exited 0; no client delivery occurred.
- After the header/volume update, another fresh ephemeral session discovered the
  personal skill, computed 3 × PHP 12,500.25 = PHP 37,500.75, and bundled missing
  service scope, volume basis and client-specific payment terms without export.
  Intake wording was then clarified to explicitly confirm the computed final payable
  total when only rates/quantities were supplied; explicitly confirmed totals are reused.
  Independent forward testing of that final wording returned one confirmation bundle
  covering scope, volume basis, PHP 37,500.75 final payable total and payment terms.

Detailed logs and full-page previews are local-only at
`C:/Users/ADMIN/Documents/Oceanides/Quotation-Review/apple-final/`.
The committed PDFs and short PNG under `samples/output/` are visibly fictional.
No actual client quotation, register or credentials are committed. The three static
Inter-derived font binaries and full original OFL are deliberately bundled.

Root application build/vitest were attempted by the executor but unavailable because
root TypeScript/Vitest dependencies were absent (`tsc` not recognized; Vitest package
not found). No dependency installation or manifest change was made for this standalone
PDF workflow; the applicable Python and Codex checks pass.

Limits: this verifies the local runtime with bundled fonts. It does not prove legal
enforceability, factual truth of future user-supplied scope, client approval, conversion
uplift, or availability on another device. Neil requested this Apple-inspired redesign
on 2026-10-14 after the earlier approval. The latest visual preview awaits his feedback.
The workflow does not add billing, publishing, tracking or electronic signatures.
