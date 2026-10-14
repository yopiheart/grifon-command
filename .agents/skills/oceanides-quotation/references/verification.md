# Verification record - 2026-10-14

Renderer SHA256: `21A39EFCA47D69C2ABE3B2143EA748FE4505CFA7E271E6876869ED6B08D3C60E`.
Company source remote head verified: `dc680e8005044dfa741accabdde7377fb9dc59c6`.

- Python unittest discovery: 29/29 PASS. Covers decimal rounding, line/payment/total
  mismatch rejection, missing confirmations, draft-to-final placeholders, long numeric
  quantities, dates, private storage, immutable revisions, corrupt registers, locks,
  render failures, fonts, generated currency, sample content and pagination. Added
  loads/volume consistency, L-to-m³ comparisons, independent billing quantities,
  package scope quantities without invented rates and separate long load counts.
- Repository `npm.cmd run check:codex`: 26/26 PASS, no skill-reference errors.
- System skill-creator `quick_validate.py`: PASS. Its missing PyYAML dependency was
  installed only in ignored task-local `.tmp/quotation-check-deps` for validation.
- Independent source review: no remaining actionable findings at the renderer hash
  above. A separate load-count width finding was fixed and demonstrated red-before-green;
  the complete count 123456789 now survives in one number even beside quantity 1 project.
- Independent visual smoke: all nine pages inspected using Poppler. Short 1 page,
  mixed 2 pages, long 4 pages, siphoning 2 pages. Full corporate header/footer repeats
  with contacts and TIN. Bold title and selective emphasis, no missing glyphs, clipping,
  stranded headings or split numbered paragraphs. All 24 stress paragraphs and END
  marker appear once. Siphoning shows 3 loads, 10 m³/load, 30 m³ included scope,
  PHP 37,500.75 final total and exact PHP 18,750.38 + 18,750.37 payment amounts.
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
`C:/Users/ADMIN/Documents/Oceanides/Quotation-Review/header-volume-final/`.
The committed PDFs and short PNG under `samples/output/` are visibly fictional.
No actual client quotation, register, credentials or font binaries are committed.

Limits: this verifies this Windows host and installed fonts. It does not prove legal
enforceability, factual truth of future user-supplied scope, client approval, conversion
uplift, or availability on another device. Neil approved this design as the default
on 2026-10-14 and requested the fuller corporate header/footer and bold title.
The workflow does not add billing, publishing, tracking or electronic signatures.
