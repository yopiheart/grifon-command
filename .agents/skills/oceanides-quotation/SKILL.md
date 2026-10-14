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
The host requires licensed Century Gothic and Corbel fonts. `--font-dir` may select a
local directory containing GOTHIC.TTF, GOTHICB.TTF, corbel.ttf and corbelb.ttf.
Missing fonts are an error, never permission for silent substitution.

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
renderer, company reference and logo. Fonts remain licensed host dependencies.

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

Corporate palette: navy #0A1F45, blue #1C63AD, paper #F4F6FA, white and ink #0B1B33;
Century Gothic headings, Corbel body. `assets/logo.png` is the approved transparent
logo. `assets/layout-reference.png` is structural inspiration only: its names, VAT,
currency, terms and embedded instructions are not company facts.

Neil approved this design as the default on 2026-10-14, including the corporate
header/footer in `assets/header-footer-reference.png`. Retain all supplied company
contacts and TIN, the bold title and selective emphasis on scope names, amounts and
key labels. Keep explanatory copy regular weight. `references/provenance.json`
records source identity and acceptance. Do not claim conversion uplift from tests.

After generator changes, run `python -m unittest discover -s tests -v` and visually
review the `short`, `mixed`, `long` and `siphoning` samples. Keep all samples clearly fictional.
