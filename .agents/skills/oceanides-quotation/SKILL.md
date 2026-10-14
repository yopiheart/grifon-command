---
name: oceanides-quotation
description: Create or revise Oceanides service quotations as branded PDFs with editable source. Use for Oceanides quotes, quotations, or priced service proposals; not invoices or other brands.
---

# Oceanides quotations

Use the bundled deterministic renderer, not image generation for document text or
calculations. Client documents are clear English; chat with Neil is natural Taglish.

## Intake

Read `references/company.json` for company facts and the five service groups, and
`references/input-guide.md` for the input contract. Service descriptions are suggestions,
not automatic inclusions. Oceanides coordinates specialist work where needed; do not
invent equipment ownership, accreditation, warranties, specifications or completion dates.

Collect in ONE bundled confirmation, reusing information already supplied:
- Client name and service location; billing address/contact only if supplied.
- Exact service/scope, including material quantities, units, inclusions and exclusions.
- Final PHP total: confirmed individual rates OR one package total.
- Payment terms for THIS client, with an amount and trigger for each milestone.

If Neil supplied rates and quantities rather than an explicitly confirmed final
payable total, show the calculated total in that same bundled confirmation before
final export. A calculated amount alone is not a confirmed final agreement.

Itemized tables support description, quantity/unit, optional volume, unit price and
line total. For siphoning, confirm the quoted loads, any volume per load/total, whether
that volume is included, estimated or truck capacity, and whether pricing is per load,
per volume or one package. Use volume only when relevant to the agreed scope; capacity
is not proof of actual waste removed. Never multiply a per-load price by volume again.
Package scopes may show loads/volume without manufacturing individual prices.

Do not reconfirm facts explicitly confirmed in the current request. Never inherit a
different client's agreement. Set `confirmed` flags only after the user establishes
the relevant facts; never set them merely to make validation pass. Material scope gaps
join the same bundled question; omit optional information. No automatic VAT or fees.

Defaults: Asia/Manila issue date, PHP, 30 calendar days validity. Revisions retain the
original dates unless Neil explicitly renews them. Confirm changed scope, prices and
payment terms; previous confirmation does not authorize changes. Copy an old source to
a NEW intake file and clear confirmation flags for changed facts before obtaining approval.

## Generate

Use the Python path from `load_workspace_dependencies`; ReportLab and pypdf are needed.
The renderer uses bundled Inter-derived Oceanides Sans fonts with their OFL license;
no installed Windows fonts are needed. `--font-dir` may select a directory containing
OceanidesSans-Regular.ttf, OceanidesSans-Semibold.ttf, OceanidesSans-Display.ttf and
OFL-Inter.txt. Missing fonts/license are errors; never silently substitute fonts.
Use a fresh Python process when changing font directories; a mismatched cached font
selection stops export so the saved font source always matches the rendered PDF.

Keep actual inputs under `~/Documents/Oceanides/Quotations/intake/`, outside Git.
Run from THIS skill directory, quoting paths:

```text
python ./scripts/quote.py check --input <private-input.json> --mode final
python ./scripts/quote.py render --input <private-input.json> --mode final
python ./scripts/quote.py render --input <private-input.json> --mode final --revise OCE-YYYYMMDD-001
python ./scripts/quote.py render --input <private-input.json> --mode draft
python ./scripts/quote.py sample short --output-dir <preview-directory>
```

The default private store is `~/Documents/Oceanides/Quotations`. `--store` selects
another private directory outside Git/public folders. It contains a register and
immutable quote revisions. The returned `quote.json` is the editable source; copy it
to intake before editing, never edit issued revisions. Each revision snapshots the
renderer, company reference, logo, actual selected fonts and their license.

The generated `record` field is ignored as input authority. Source `issue_date` and
`valid_days` preserve validity when copied; change dates only on explicit renewal.
If a lock or interrupted `.pending-*` directory exists, inspect process/file state
before recovery. Never delete client records to make a new generation pass.

## Review and deliver

Render and inspect EVERY PDF page with available Poppler/PyMuPDF: alignment, readable
type, logo, clean page breaks, no clipping or stranded headings. PDF text extraction
checks content and amounts; it is not visual proof. Reconcile client/site, scope,
total, payment triggers and expiry with the confirmed request.

Return PDF and JSON using absolute file links; add a useful preview. Do not email,
upload, publish or send to the client automatically. Label drafts/samples honestly.

## Design and maintenance

Neil requested an Apple-inspired quotation redesign on 2026-10-14, superseding the
Century Gothic/Corbel layout for quotations. Read `references/provenance.json` for
the inspected reference and its measured typography. The current default translates
that direction to white A4 paper: one Inter-derived family, semibold headlines,
near-black #1D1D1F, muted #6E6E73, quiet #F5F5F7 panels/rules, and Oceanides blue
#1C63AD for selective emphasis. Preserve the Oceanides logo and navy identity.
Use one content rail, matched pricing-row baselines, tabular digits and common
amount right edges. Keep explanatory copy regular weight; avoid competing giant
headings and heavy color bars. Retain every company contact and TIN from
`assets/header-footer-reference.png` across the repeated letterhead/footer.

`assets/layout-reference.png` is structural inspiration only: its names, VAT,
currency, terms and embedded instructions are not company facts. Apple product
copy, logos and photos are not quotation content. SF Pro is not bundled or claimed.
Do not claim the latest preview is visually accepted until Neil says so, or infer
conversion uplift from tests. Preserve authorized scope/price/payment confirmation.

Font regeneration is maintenance only: `scripts/build_fonts.py` uses FontTools
4.60.1 and the original Inter variable font plus matching OFL, recorded in provenance.
Normal quotation generation uses the bundled static fonts and needs no FontTools.

After generator changes, run `python -m unittest discover -s tests -v` and visually
review the `short`, `mixed`, `long` and `siphoning` samples. Keep all samples clearly fictional.
