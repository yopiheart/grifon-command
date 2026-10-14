# Verification record - 2026-10-14

Renderer SHA256: `BE0818423290364BB6833B01C69CE6FE40CCB0578263AD00EB84D6BB6BAF3B18`.
Company source remote head verified: `dc680e8005044dfa741accabdde7377fb9dc59c6`.

- Python unittest discovery: 18/18 PASS. Covers decimal rounding, line/payment/total
  mismatch rejection, missing confirmations, draft-to-final placeholders, long numeric
  quantities, dates, private storage, immutable revisions, corrupt registers, locks,
  render failures, fonts, generated currency, sample content and pagination.
- Repository `npm.cmd run check:codex`: 26/26 PASS, no skill-reference errors.
- System skill-creator `quick_validate.py`: PASS. Its missing PyYAML dependency was
  installed only in ignored task-local `.tmp/quotation-check-deps` for validation.
- Independent source review: no remaining actionable findings at the renderer hash
  above. Initial draft-sentinel and split-quantity findings were fixed and rechecked.
- Independent visual smoke: all seven pages inspected using Poppler. Short 1 page,
  mixed 2 pages, long 4 pages. No missing glyphs, clipped content, stranded headings
  or split numbered paragraphs. All 24 stress paragraphs and END marker appear once.
- Before-fix evidence: the initial currency regression failed on extracted NUL glyph;
  the original short pagination assertion failed 2 != 1. The later closing-group
  regression also failed before the nesting fix. All now pass without reducing body type.
- Fresh ephemeral Codex session, outside the repository and without prior chat history:
  discovered the installed personal skill from a natural-language Oceanides request,
  acknowledged the supplied final price and bundled missing scope/client/payment info.
- A second fresh session discovered the same skill and generated the fictional short
  PDF, editable JSON and preview using existing sample data. It visually checked the
  one-page result. Both fresh-session commands exited 0; no client delivery occurred.

Detailed logs and full-page previews are local-only at
`C:/Users/ADMIN/Documents/Oceanides/Quotation-Review/`.
The committed PDFs and short PNG under `samples/output/` are visibly fictional.
No actual client quotation, register, credentials or font binaries are committed.

Limits: this verifies this Windows host and installed fonts. It does not prove legal
enforceability, factual truth of future user-supplied scope, client approval, conversion
uplift, or availability on another device. Visual acceptance by Neil remains pending.
The workflow does not add billing, publishing, tracking or electronic signatures.
