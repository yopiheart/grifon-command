# Prompt-quality audit and exact fix proposals

Date: September 17, 2026. Baseline: `8754634334dc44b8d2d4768f03d8a2ba5b07b241`.
Status: audit and proposal preparation complete; patches are **not applied or approved**.

## Scope and conclusion

The saved scripts demonstrate recurring specification jargon and three complete
omissions of a required differentiator. They also expose conflicting price
instructions, contradictory fixtures, unsupported factual claims, and ambiguous
beat segmentation. These are different failure classes and need separate fixes.
No result here establishes that additional prompt wording improves live output.

This report completes the script-quality follow-up seeded by
[the September 16 audit](script_failure_audit_2026-09-16.md). It covers the 24 saved
scripts and the current prompt rules and wiring responsible for them. It is not
a quality certification of every prompt in the repository. The archive contains
no generated storyboard, image, thumbnail, or video-prompt outputs to grade.

PRs [#136](https://github.com/yopiheart/grifon-command/pull/136),
[#137](https://github.com/yopiheart/grifon-command/pull/137), and
[#138](https://github.com/yopiheart/grifon-command/pull/138) are merged, confirmed
through GitHub and fetched main. Their evaluation/reporting and steam/vacuum
detector work is complete. #138 changed only NOW.md. This package does not redo it.

## Evidence and wiring

- Primary corpus: [preserved JSON](evaluations/script-audit-2026-09-16.json), runs
  `34644107954`, `34161876539`, `34056546118`. Existing source digests and historical
  output content remain unchanged. There are 22 passing script tests and 24 saved
  outputs; two outputs arrived after their tests timed out.
- Independent `gemini-eval` critic inspected all 24 outputs against current code.
  Verdict: **GEMINI_FAIL** for the sampled outputs; no current wiring bug or
  model-level limitation established. This is a source/output audit, not a new run.
- Director path: `components/Step3AdScript.tsx:181` passes Business Info, language,
  offer, chosen angle and contrarian truth to `services/geminiService.ts:1968`.
  That function forwards them to `FLOW_REGISTRY.adscript` in `api/gemini/text.ts:207`;
  the builder is called at line 224. The regression fixture requests Taglish at
  `tests/regression/script-gen.regression.test.ts:132`.
- One-Shot likewise passes these inputs through
  `components/OneShotAd/_fable5-recovered/autopilotOrchestrator.ts:552`.
  This source trace does not independently validate live HTTP/auth or upstream
  research truthfulness.
- MalinisPH historical fixtures select ordinary MrBeast/Testimonial, not the
  separate Services formula. Their proof is semantic beat 5. The old harness
  omitted transformation retry, Temu classification and resolved-format output;
  all eight UGC outputs lack `ugcProFormatResolved`. No Temu case is in this corpus.

## Ranked findings

| Priority | Finding | Evidence and interpretation | Proposal |
| --- | --- | --- | --- |
| 1 | Required proof disappears | Malinis Testimonial Sep 6/7 and MrBeast Sep 6 replace child/pet-safe plant-based cleaning with booking/vetted cleaners. Three complete omissions. | A + B |
| 1 | Specifications copied into Taglish | Bukidnon Testimonial Sep 11 says `single-origin beans` and `resealable valve bag`; Malinis Testimonial Sep 6/7 says `Same-day booking` and `background-checked`. LANGUAGE LOCK forbids specification jargon even when supplied. | A |
| 2 | Price instructions contradict each other | Common NO PRICE at `prompts.ts:380`, monthly/DP requirement at `:511`, UGC nonproduct `NO peso amount ever` at `:781`. Both Amaia outputs omit `25k/month`; the omission is ambiguous, not independently a model defect. | C |
| 2 | Fixtures give conflicting directions | Topical dropper serum says `Inumin lang`; its benefit asks for no acne despite the appearance-claim guardrail. Condo is pre-selling but benefit says move-in ready (`script-gen.regression.test.ts:210-218,285-290`). | D |
| 2 | Unsupported factual claims | Five output rows add nonstickiness/absorption, popularity, or developer reputation absent from supplied facts. The generic objection-killer instruction does not currently define a universal claim-source policy. | E, new explicit policy |
| 3 | Ordinary beats expand into extra entries | All 9 MrBeast outputs have 6-9 entries for 5 named body beats; 3/7 Testimonials have 8/9 for 7 named beats. One Glaze MrBeast CTA splits across entries. Ordinary formulas lack UGC's explicit cardinality rule. | F, optional contract clarification |

The FEATURE FILTER at `prompts.ts:381` selects only features and says "Omit
everything else." The mandatory separator is a separate field at `:942/:1000`.
That is a plausible competing instruction, not experimentally established
causation. A/B remove this conflict and prioritize meaning-preserving proof;
they do not require reciting every clause of a long separator verbatim.

Unsupported-claim rows: Hiraya Sep 11 hook2 (`viral`, JSON line 188); Glaze
Testimonial Sep 7 (`mabilis ... ma-absorb`, 406); Glaze MrBeast Sep 6
(`walang mabigat na lagkit`, 649); Glaze Testimonial Sep 6 (`Hindi ito malagkit`,
673); Amaia Sep 6 (`developer na subok`, 745). These are provenance warnings
under existing rules. E would make the missing general policy explicit.

## Per-output scorecard

`L`: F = strict specification-language flag; A = conflict with an explicit
formula exemplar; P = no clear specification leakage. These are not whole-script
passes. F includes ingredients, `blend`, `squat-proof`, and property-spec terms;
18 flags are broader than the original obvious-jargon examples.

`Proof`: P = core differentiator preserved at its semantic proof beat;
Partial = some meaning retained with a material qualification absent;
Missing = separator absent throughout; Blocked = contradictory skincare input;
N/A = no generic separator requirement in that UGC formula. Do not score by a
fixed array index until a one-entry-per-beat contract exists.

All line numbers below refer to the preserved JSON, not current prompt code.

| Date | Brand / formula | Body entries | L | Proof | JSON lines |
| --- | --- | ---: | --- | --- | --- |
| Sep 11 | Bukidnon / MrBeast | 7 | F | P | 111 |
| Sep 11 | Bukidnon / Testimonial | 8 | F | Partial | 132-133 |
| Sep 11 | Malinis / MrBeast | 6 | F | Partial | 152-154 |
| Sep 11 | Glaze / MrBeast | 7 | F | Blocked | 173-175 |
| Sep 11 | Hiraya / Try-On | 3 | A | N/A | 188-192 |
| Sep 7 | Bukidnon / MrBeast (late output) | 7 | P | P* | 296 |
| Sep 7 | Bukidnon / Testimonial | 9 | F | P* | 319-320 |
| Sep 7 | Malinis / MrBeast | 8 | F | Partial | 339-342 |
| Sep 7 | Malinis / Testimonial | 8 | F | Missing | 363 |
| Sep 7 | Glaze / MrBeast | 7 | F | Blocked | 383-384 |
| Sep 7 | Glaze / Testimonial | 7 | F | Blocked | 405-406 |
| Sep 7 | Hiraya / Try-On | 3 | P | N/A | 422-424 |
| Sep 7 | Glaze / Transformation | 3 | P | N/A | 439 |
| Sep 7 | SofaFresh / Service Transformation | 3 | A | N/A | 456 |
| Sep 7 | Amaia / Real-estate Tutorial | 4 | F | N/A | 473-474 |
| Sep 7 | BulkPH / MrBeast | 8 | F | Partial | 495 |
| Sep 6 | Bukidnon / Testimonial | 7 | F | Partial | 607 |
| Sep 6 | Malinis / Testimonial | 7 | F | Missing | 628 |
| Sep 6 | Glaze / MrBeast | 9 | F | Blocked | 648-653 |
| Sep 6 | Glaze / Testimonial | 7 | F | Blocked | 672-673 |
| Sep 6 | Malinis / MrBeast (late output) | 6 | F | Missing | 691-693 |
| Sep 6 | Hiraya / Try-On | 3 | F | N/A | 710 |
| Sep 6 | Glaze / Transformation | 3 | P | N/A | 726-728 |
| Sep 6 | Amaia / Real-estate Tutorial | 4 | F | N/A | 743-745 |

Totals: 18 language flags, 2 exemplar conflicts, 4 without a clear language flag.
Of 16 ordinary-formula outputs, 5 skincare cases cannot cleanly be proof-graded.
The other 11 have 3 core passes, 5 partial cases and 3 complete omissions.
The two starred passes preserve direct-farmer sourcing but do not rigorously
establish "unblended." A full-proposition rubric instead yields 1 pass, 7 partial,
3 missing. Recommended scoring retains core meaning and reports missing
qualifications separately; a certification must never be silently strengthened.

All 48 hooks meet 5-8 whitespace words. All eight UGC body counts match their
formats. Punctuation-only em dashes do not count as spoken words; two apparent
13-token lines become 12. One local timing violation remains: Glaze Transformation
Sep 6 `body[1]`, "Grabe, ang fresh at kalma na ng balat ko." (JSON line 727), has
nine words against the Instant Reveal rule's 3-8 (`prompts.ts:743-744`). The general
UGC word range does not override that narrower rule. Add this case to the proposed
output rubric; one observation does not justify another prompt rewrite or retry.
No demographic-label, hook-offer, invented-scarcity, peso-price, or clear
manual-Tagalog blacklist violation was found.
These observations apply only to this corpus. Strategic Audit self-praise is
not independent evidence that the script followed its rules.

## Exact proposed diffs and acceptance conditions

Each linked patch applies independently to the pinned baseline. They are review
artifacts, not runtime instructions or approval records. If several are approved,
combine their edits against current main and recheck context; nearby hunks can
overlap after an earlier patch is applied. No schema, model, retry cap or generation
setting is proposed to change.

| ID / exact diff | Intended change | Acceptance condition after approval |
| --- | --- | --- |
| [A: language](evaluations/pq-a-language.proposed.patch) | Apply the existing spec-language rule to supplied fields too; allow omission of optional jargon, but preserve required proof meaning in natural wording. | The obvious coffee/cleaning jargon examples flag; natural meaning-preserving proof passes. English-mode scripts remain English. Explicit action-exemplar conflicts below stay separately classified. |
| [B: proof](evaluations/pq-b-proof.proposed.patch) | Exempt formula-required differentiators from feature filtering. Prioritize actual differentiator over generic features in Testimonial/MrBeast proof. | Cleaning proof conveys cleaning-material origin and relevant safety meaning; unrelated vetted-cleaner claims fail. Empty separator gets the existing feature/benefit fallback; no invented proof. Score partial qualifications separately. |
| [C: price](evaluations/pq-c-price.proposed.patch) | Give real-estate PRICE RULE precedence over blanket NO PRICE; scope the UGC real-estate peso ban to CTA. Propose monthly/DP once in UGC tip 1 or walkthrough Affordability + CTA. | Test both real-estate modes with empty/monthly/lump-sum prices. Empty stays inquiry-only; monthly/DP stays verbatim once; lump sum may be withheld; no conversion/invention. UGC hook/CTA stay price-free. Non-real-estate prompt output unchanged by C. |
| [D: fixtures](evaluations/pq-d-fixtures.proposed.patch) | Replace swallowing/medical outcome with topical appearance/confidence wording; remove move-in-ready assertion from pre-selling condo. | Review the exact three new fixture strings. Preserve original corpus. Apply identical corrected inputs to both arms of any later comparison. The retained 14-day synthetic claim is not verified real-product evidence. |
| [E: claims](evaluations/pq-e-claims.proposed.patch) | Add an explicit source requirement for factual claims and constrain the Testimonial objection beat. | Unsupported absorption, nonstickiness, popularity and reputation flag; supplied facts pass subject to appearance/speed rules. With no supported answer, objection beat must not fabricate reassurance. This does not validate upstream research or business claims. |
| [F: beat mapping](evaluations/pq-f-beat-count.proposed.patch) | Propose exactly 7 Testimonial / 5 MrBeast body entries, with explicit proof and complete CTA positions. | A new structural assertion fails extra/split entries and passes one-entry-per-beat examples. UGC unchanged. Do not retroactively call historical beat expansion a violation of an explicit rule that did not exist. |

Recommended sequence for a controlled quality comparison: review D's inputs and
the proof rubric first, then compare baseline vs A+B using identical corrected
inputs. Keep C, E and F separately attributable. A-only must not cause proof to
be dropped; B-only must not increase verbatim jargon. F may crowd compound proof
into the existing 7-12-word budget, so evaluate proof retention before adopting it.

These are hypotheses to test, not a recommendation to add automatic model retries.
A mocked model response proves plumbing only and cannot establish content quality.

## Remaining policy boundaries and separate work

- **Allowed English/action examples:** the blanket language rule conflicts with
  try-on's `squat test`/`hindi see-through` and service transformation's explicit
  `steam muna namin, tapos deep vacuum`. Proposed decision: keep explicit action
  exemplars as allowed controls, translate optional specification/marketing copy,
  and approve a precise exception list before treating these two outputs as
  language failures. A does not silently rewrite those exemplars or broaden the
  global English carve-outs. No language-ratio tuning is proposed.
- **Application detector:** recommend preserving the approved noun-fragment
  tolerance until the action contract changes. Accepted controls: `Lagay lang ng
  two drops nitong Glaze PH.`, the approved steam/vacuum line, and current
  `dalawang spray lang` exemplar. Rejected controls: `Ito ang Glaze PH serum.` and
  `Ito ang vacuum namin.` The saved `Tingnan mo, tatlong patak lang nitong Glaze PH.`
  is the explicit decision case. Requiring a complete verb would require coordinated
  example, detector and regression changes; no additional token deletion is justified.
- **Cancellation/backoff:** all 14 execution failures timed out at 120 seconds;
  retry waits alone total 124 seconds. Preserve this as the separate transport
  investigation in the prior audit. No timeout increase or provider roll is included.
- **Image evaluation provenance:** the camera-pool copy drift in
  [nightly_regression.md](nightly_regression.md#image-evaluation-audit-september-16-2026)
  is still a separate evaluator-fidelity issue. There is no new image evidence here
  establishing a production prompt defect. Do not relabel old experiments as current.
- **Rubric drift:** `gemini-eval`'s blanket price ban and fixed proof-scene summaries
  are not authoritative over current code. This audit uses current formula definitions;
  no skill/system instructions were silently changed.

## Verification performed and limits

Run from the repository root:

```powershell
node workflows/evaluations/check-prompt-proposals.mjs
git diff --check
node tools/resume_doc_check.mjs --strict
```

The offline review aid checks all six patches with `git apply --check`, then
transpiles current/proposed prompt source and builds candidate prompts in memory.
It makes no provider call and does not apply patches to disk. It is intentionally
specific to this approval package, not a permanent runtime quality gate.

Six real-estate combinations (two modes x empty/monthly/lump-sum) contain the
blanket rule on the baseline; four priced cases demonstrate the contradiction.
C removes that absolute rule in eligible branches while preserving inquiry-only
handling. Thirteen non-real-estate control prompts remain byte-identical under C.
An earlier draft changed the shared service CTA wording; the byte-equality check
failed and C was narrowed to real estate. Combined prompt candidates transpile
and build. This is not full type-checking or generated-output quality evidence.

Independent package review found two issues: E initially omitted the listingPrice
and audience/painPoint source allowances, and this report initially missed the
nine-word reveal. E now permits those fields in their proper scope, and the local
timing violation is recorded above. Review findings do not authorize the proposals.
Independent re-review confirmed both findings resolved with no remaining actionable
findings. Syntax, domain-language and strict resume-doc checks also passed.

No application source or live fixture changed. Build, full suite and browser
generation are not evidence required for a documentation/proposal-only delivery;
they remain required when approved runtime changes are implemented. No paid run,
merge, deployment, campaign operation or production-data mutation occurred.

Any future paid comparison needs a separate exact-input test spec: fixture/asset
digests, accepted patches, comparison arms and repetitions, pass/fail rubric,
evidence files, maximum cost and stop condition. No run count or budget is approved
by this report. An independent critic must grade output without seeing its arm.

Applying tuned diffs requires the user's exact-diff approval under `AGENTS.md`,
`api/AGENTS.md` and `services/AGENTS.md`. The gemini-eval skill's grill-me step
belongs before applying a tuned edit; preparation of these reviewable proposals
does not itself authorize that edit.
