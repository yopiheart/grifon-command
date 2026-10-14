# Quotation input, version 1

Use `samples/short.json` (package) or `samples/mixed.json` (itemized) as a structural
example; `samples/siphoning.json` shows loads and volume. These fictional scopes,
rates and payment terms are NOT business defaults.

| Field | Contract |
| --- | --- |
| `schema_version` | Integer `1`. |
| `client` | Required `name`, `site`; optional `contact`, `billing_address`. |
| `title`, `summary` | Confirmed, concise project description in English. |
| `pricing` | `mode`: `package` or `itemized`; `total`: confirmed final PHP amount. |
| `services` | Nonempty array: `group`, `name`, `description`. |
| `payments` | Nonempty array: `trigger`, `amount`, optional `percent`. |
| `conditions` | Optional array of confirmed exclusions/conditions. No invented warranties. |
| `confirmed` | Boolean `client`, `scope`, `price`, `payment`; all must be true for final. |
| `issue_date` | Optional ISO date; default today in Manila. |
| `valid_days` | Optional integer 1-366; default 30. |
| `record` | Generated metadata, ignored on input. |

Group IDs: `siphoning`, `plumbing`, `renovation-restoration`, `pest-control`, `stp`.
Multiple groups can coexist. Do not create an arbitrary new service group without
updating the company reference with the user's confirmed change.

All money uses unsigned decimal STRINGS with at most two decimal places, no currency
signs or commas: `"99999.99"`. No floats, negative discounts or implicit tax lines.
The total must be positive. Itemized service rows additionally require `quantity`
(positive decimal string, up to three decimal places), `unit`, `unit_price`; optional
`amount` is checked. Round each quantity × rate to cents using half-up, then sum.
Package services may contain quantity/unit together, loads and volume as scope
information; they must omit unit_price/amount. The package total is the only price.

## Loads and volume

Every service may include `loads`: a positive whole-number decimal string (not a JSON
number). When quantity is billed in `load` or `loads`, it must be a whole number and
match `loads`; an omitted loads value is derived from that quantity.

Optional `volume` contains `unit` (`m³` or `L`), required `basis` (`included`,
`estimated` or `capacity`), and `per_load` and/or `total` (positive decimal strings,
at most three decimal places). `per_load` requires loads. Missing total is calculated
as loads × per_load; a supplied total must agree. Volume must fit the supported range
up to 999999999 units. Labels distinguish included scope, estimate and truck capacity;
capacity is never represented as measured waste removed.

For example, the fictional siphoning sample has quantity `"3"`, unit `"loads"`,
unit_price `"12500.25"`, and volume `{ "unit": "m³", "basis": "included",
"per_load": "10", "total": "30" }`. Its final total is PHP 37,500.75. Volume is
scope information: billing is 3 × 12,500.25, never another multiplication by 30.

For per-volume billing, quantity/unit is the billed volume and unit_price is its
price per volume unit. If volume metadata is supplied, quantity must match its total;
the validator converts L ↔ m³ for comparison. Billing unit aliases m3/cbm and
liters/litres are recognized. Any separate load count is logistical scope, not another
price multiplier. A package can show these quantities with no invented price breakdown.
If some rows have no volume, their volume cells show a dash. Without any volume data,
the column is omitted. Volume is optional for work whose scope does not require it.

Each payment amount must be positive. Payments sum exactly to the final total. If a
percentage is given, its rounded monetary equivalent must match. For a rounding-
adjusted last balance, specify its exact amount without an inaccurate percentage.
Missing/unclear triggers must be confirmed, not guessed. No bank account is inferred.

Text is plain text; line breaks are allowed. HTML is escaped. Final quotes reject
common unresolved markers including TBD, TBC, TODO, lorem ipsum, [bracketed fields]
and {{template fields}}. These checks supplement human review; they cannot prove a
scope is true or a client actually approved it. Unsupported font glyphs stop rendering.

Dates are displayed as `14 Oct 2026`. Expiry = issue date + valid days. Already expired
quotes cannot be finalized; explicit renewal is needed. A revision changes `R01` to
`R02` under the same quotation ID and preserves every prior revision. A separate
quotation receives a new ID. Drafts never allocate final quotation numbers.

Actual records are private local files, not a CRM or legally authenticated e-signature.
Generation does not publish/send anything. The generator enforces private input/store
paths outside Git/public folders; the operator must keep other cloud-synced or publicly
served directories out of `--store` as well.

If register writing fails after PDF storage, the retained directory still consumes
its number, so later runs never reuse it. Report the partial bookkeeping failure and
reconcile the register against retained `quote.json` files before relying on its index.

## Reproduce an issued PDF

Every new revision includes `source/scripts/quote.py`, `source/references/`, the logo
and `source/assets/fonts/` with the exact fonts/license used. Call that snapshot's
`render_pdf` using `quote.json`
and its saved `record`, writing a separate preview path. This preserves identity and
dates without issuing another revision. Output byte hashes can differ due to PDF
metadata timestamps; content, amounts, embedded fonts and layout are the contract.
