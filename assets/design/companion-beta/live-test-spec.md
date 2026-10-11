# Proposed live test: Sunrise Mango Juice

**Not approved; not run.** This exact spec requires Neil's approval. It does not authorize
deployment, account-plan/credit changes, invitations, or publication. The free audit uses mocks.

## Purpose and pass/fail

Prove that Companion Chat can produce one real ad, preserve the supplied product's identity,
deliver intelligible audio and playable video, download it, and reopen the same result without
restarting generation or charging again. A mock file cannot pass this test.

Fail on a wrong product/brand, visibly substituted bottle/label, unsupported claims, missing or
unintelligible audio, unplayable/truncated file, failed download, lost history, duplicate debit,
unexpected generation, or a cost-cap violation. A failed creative is evidence, not permission
for another roll. No regeneration, reshoot, style pass or automatic test retry is authorized.

## Exact entry and inputs

Use the reviewed readiness candidate in a separately approved environment with the required
billing migration installed and verified. Enter `/app`, sign in with the existing authorized
smoke account, create a fresh chat and use the actual production UI. No developer allowance
bypass or plan/credit mutation. Record confirmed plan/allowances before starting; if unavailable,
stop. Account credentials and auth headers must never appear in evidence.

Answer the five guided fields verbatim:

| Field | Value |
| --- | --- |
| Brief | Make a short product ad for Sunrise Mango Juice for adults looking for a refreshing mango drink. Show the supplied bottle clearly. Invite viewers to try it. Do not invent health claims, discounts, endorsements, or product specifications. |
| Brand | Sunrise |
| Product | Mango Juice |
| Offer / benefit | A refreshing mango drink. Try Sunrise Mango Juice. |
| Price / promotion | No public price. |
| Language | English |
| Format | Vertical, 9:16 |
| Voice | Sarah (`EXAVITQu4vr4xnSDxMaL`) |

Upload exactly `public/examples/ex-product-handheld.png` from the frozen repository.
SHA-256: `67e680855b78e25ae3cbf13a65279159d9270aac3ba094da60689d25fd41b9cd`.
Visually checked 2026-10-09: single yellow mango-juice bottle, yellow cap, white Sunrise
Mango Juice label, held in one hand outdoors. No asset substitution or image generation for inputs.
Use the existing Companion defaults (Testimonial, product business, default resolution/routing);
this spec proposes no tuned configuration change. Presenter is the flow's normal auto-cast
female presenter associated with Sarah; the exact generated presenter must be frozen at review.

## Capped, two-stage execution

This is one ad test with a mandatory storyboard approval boundary. A full live run cannot be
pre-approved against unknown generated script/scene assets under the repository's Veo rules.

1. **Storyboard stage — proposed maximum US$3**, one Generate storyboard click, one run,
   no manual Retry/Regenerate. Before that click, verify the current provider prices and the
   maximum automatic calls/retries against this cap. If the ordinary pipeline cannot enforce
   or conservatively bound that total, do not start; request a revised spec. Record server
   request counts/costs and stop at storyboard review. Save exact generated script, scene images,
   presenter and route/duration per scene as the stage-two input manifest. They are not known yet.
2. **Video stage — proposed maximum US$12**, inside the **US$15 maximum for the entire test**.
   At most six video rolls total (`maxPaidRolls: 6`, inclusive of provider retries/fallbacks),
   one explicit Approve storyboard click and one finished-ad credit maximum. If the confirmed
   plan or storyboard has fewer scenes, the roll cap becomes that smaller count. No extra rolls
   to repair failures. Freeze all inputs, write the nearby `script.spec.json`, run
   `node tools/ad_preflight.mjs --script <exact-path>`, show the passing result and exact manifest
   to Neil, and obtain approval before video production. Any changed script/asset/model/duration
   or increased cap needs a new approval. If the preflight does not apply correctly to this
   English consumer-flow script, report that mismatch; do not fabricate a passing script.

The dollar figures above are **proposed spend ceilings, not current price estimates**. The
repository's dry cost estimator uses historical and partly inferred rates; it cannot certify
today's bill or enforce this budget. A UI Stop click cannot cancel/refund requests already
submitted. Both stages therefore remain blocked until their maximum can be enforced/verified
before dispatch. Ordinary unit/browser checks leave all paid/live switches unset.

## Evidence and cleanup

- Record candidate SHA, approved spec hash, input hash, timestamps, confirmed plan/allowance,
  anonymized run reference and operation counts. Capture no tokens, headers, raw briefs from
  other users, provider payloads or unredacted network traces.
- Save screenshots of filled brief, storyboard review, approval, progress, first cut, and
  reopened read-only history. Record exactly one finished-ad debit and no debit/generation when
  reopening history; use authorized read-only account/run evidence.
- Download the actual MP4. Inspect duration, dimensions, decoding and audio stream using the
  existing FFmpeg tools; watch and listen start to finish. Confirm product/offer visually,
  intelligible complete speech, no black tail/frozen output, and working download on both phones.
- Refresh and return to the saved chat; verify the same finished file without paid requests.
  Deliberate provider errors/double-click races stay in mocks, avoiding needless paid retries.
- Keep the smoke run private as evidence. No deletion of production records, publishing,
  sharing externally or credit adjustments. Record actual spend even if the run fails.

Approval requirement: root `AGENTS.md`, “Any paid AI/render operation requires a user-approved
test spec covering purpose, pass/fail criteria, exact inputs/assets, evidence, and maximum cost.”
Paid Veo additionally needs the nearby script spec, passing preflight and approved roll cap.
