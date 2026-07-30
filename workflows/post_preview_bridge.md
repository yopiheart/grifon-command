# Post-Preview Bridge — L1 Unlock Audit + One-Question Segmentation (Design)

Run-sheet items 04 + 05 of the Grifon Funnel Review (artifact
`https://claude.ai/code/artifact/c064e718-e311-40a9-aa01-9af81f63e350`, twin
`artifacts/grifon-funnel-review.html`). Sources: `workflows/funnel_swipe_file.md`
(L1/L3/L6, F01–F06) + two code-map explorations 2026-07-29. **This file is the
resume doc for the build session** — the fixes below are DESIGNED, not built;
every code change here is Neil-gated (plan → approve → code-executor).

---

## Part 1 — L1 audit verdict: the attention peak leaks (FAIL)

L1 (6-of-6 corroborated, the strongest pattern in the swipe file): *the
post-opt-in moment sells exactly ONE next step.* Grifon's equivalent peak is
**Step 8 / `Step7FinalOutput`** — the moment the free ad plan finishes.
Audited free-user journey (One-Shot → `onReview()` → `App.tsx` step 8):

### Findings (file:line verified 2026-07-29)

1. **Zero upgrade language at the peak.** The completion screen shows no price,
   no plan name, no "1/1 workflows used", no watermark disclosure. The only
   money path is `GENERATE VIDEO NOW >` (`components/Step7FinalOutput.tsx:236`)
   — which reads as a free next step, not an offer.
2. **17 clickable elements, ~10 destinations, 1 money path** on the peak screen
   (full census in the exploration report / artifact Act V). Hormozi's bridge
   page has ONE.
3. **The Taglish nudge written for exactly this moment is dead code.**
   `config/upgradeNudge.ts:37` ("Gawa mo na ang free ad plan mo — i-render na
   natin…") is consumed only as a boolean for a Dashboard bell dot
   (`components/Dashboard.tsx:275`); the string itself has zero render sites.
4. **The "Run Research First" banner hijacks the peak** (`App.tsx:1718-1744`):
   One-Shot never writes `marketMindReport` (`components/OneShotAd/index.tsx:120`
   vs `components/MarketResearch.tsx:116`), so most one-shot users see a banner
   routing them AWAY from their finished ad at the exact attention peak.
5. **`EXPORT_BUNDLE (.ZIP)` is a fully-satisfying free exit** co-equal with the
   money CTA (`Step7FinalOutput.tsx:233`): take everything, leave, no bridge.
6. **Both paywall exits destroy the ad.** `See plans` → route change nukes
   `activeModule`/wizard state (`App.tsx:1510`); `₱499 top-up` does a hard
   `window.location.href` (`App.tsx:1511`). A user who PAYS returns to an empty
   dashboard with no link back to the ad the paywall just showed them blurred.
7. **Watermark leak (revenue bug, documented as parked):** the lightbox
   `Download Image` hands over the raw un-watermarked asset
   (`components/ui/ImageModal.tsx:29-37`; acknowledged `utils/watermark.ts:11-12`).
8. **Two different paywalls for the same feature** depending on entry:
   Step 8 → `LockedVideoPreview` (good: user's own blurred ad) vs Dashboard
   locked tile → bare pricing grid (`Dashboard.tsx:472,227`).
9. **What's already GOOD:** `LockedVideoPreview` itself is the strongest asset
   in the flow — the user's own thumbnail blurred behind a lock is exactly the
   right L1 mechanic. It just (a) offers two competing prices at once and
   (b) both its exits lose the artifact.

### Build status (2026-07-30, Neil approved "go sa bridge fix")

**SHIPPED (code-executor slice, reviewed by main loop + fresh critic):**
state line, rendered Taglish nudge, price-naming CTA ("I-RENDER ANG VIDEO —
STARTER ₱997", free only), export demoted to ghost (all tiers), research
banner suppressed on step 8, lightbox watermark leak plugged (optional
`watermark` prop on ImageModal; all 7 call sites verified unaffected).

**RESUME ROUTING — SHIPPED 2026-07-30** (executor slice + 4 critic-driven
fixes in the main loop): the Dashboard now surfaces finished step-8 ads as a
one-click "Balikan ang ad mo" card (App provides `onResumeFinishedAd` →
`restoreFinishedAd()`); both Step-8 paywall exits (`See plans` AND the ₱499
top-up redirect) stash a `grifon_return_to_ad` intent
(`services/returnToAdService.ts`, mirrors moduleIntentService; pop effect in
App.tsx ordered after the plan-intent bail, gated on `isLoadingSession`);
`billing_success` offers "BALIK SA AD MO — I-RENDER NA" when a step-8 run
exists and both its buttons consume the intent; `restart()` now clears the
persisted session (no stale finished-ad cards); `handleLogout` clears all
three sessionStorage intent keys (shared cafe-PC hygiene).

**CREDIT-AWARE VIDEO GATE — SHIPPED 2026-07-30** (main-loop slice + critic
round): the `generate_video` gate now honors purchased ₱499 credits
(`useQuota().credits.video_ad_credits > 0` → straight to GenerateVideo; the
server was always willing via `consumeCredit`, only the client gate was
blind). Step 8 reflects it honestly — credit-holders get "I-RENDER ANG VIDEO
— GAMIT ANG CREDIT MO" + a credit line instead of the Starter pitch, via a
tri-state `hasVideoCredit` prop (`null` = loading = bridge holds back, no
wrong-price flash). The critic's biggest catch: `useQuota` fetched once per
mount, so an in-SPA checkout return (or OTP sign-in) carried stale
`credits: 0` and re-paywalled the buyer — App now refetches quota on every
landing on the app surface with a 4s second pass for webhook lag.

## Part 3 — Consumer Review repair (Neil's 2026-07-30 preview walk)

Neil's live walk of the preview exposed the deeper truth behind Part 1: the
free user should never have LANDED on Step 8 at all — the 8-step wizard
chrome is an admin/dev surface (now an agent_lessons hard rule). Two slices
shipped 2026-07-30 (both code-executor + adversarial critic):

**Slice A — ReviewScreen + routing:** new `components/OneShotAd/ReviewScreen.tsx`
(One-Shot-world review: script, scene stills, character, thumbnail — NO
prompts, any tier; assets-only ZIP; Step7's bridge mechanics reused verbatim).
New `directorMode: 'review'`; every consumer path (one-shot completion,
concierge, resume, return-to-ad, billing-success, dashboard card) lands
there; devUnlock keeps the Step-8 cockpit + wizard. LockedVideoPreview:
₱499 removed for free users (member perk lives in QuotaWallModal only),
viewport-fit side-by-side layout. RunningScreen tiles now show real scene
images as they land.

**Slice B — pipeline honesty:** generation order is now script → avatar →
THUMBNAIL → storyboard → scenes → prompts (thumbnail can no longer be starved
by the scene loop). FREE runs are budget-aware: reserve avatar+thumbnail,
greedily cap scenes (hook-morph scene costs 2 images), trim surfaced on
ReviewScreen ("N of M scenes — full storyboard on Starter"); paid never
trimmed; 13 new unit tests pin the never-overspend invariant. Talent chip
row on LaunchScreen (Auto/Filipino/Pan-Asian/Caucasian/Custom); the Auto
foreigner bug is fixed at the transport level — Taglish+Auto now derives
'Filipino' into the avatar/storyboard args (root cause: empty ethnicity →
storyboard told 'Global/Neutral'; producer engine already defaulted
'Filipino'). No tuned prompt content touched.

**GATED PROPOSAL — UGC-authentic thumbnail (needs Neil's per-diff approval,
TUNED):** the product has exactly ONE thumbnail style — hard-coded MrBeast
shock-face (`services/geminiService.ts:2323-2402`, style const at :882) — so
every UGC ad gets a hype-drop cover. Proposal: a sibling generator (or style
param) with a UGC-authentic prompt (real-person candid still, natural
expression, no shock face, no saturated rim light), selected automatically
when scriptType is a UGC Pro sub-format. This is the one piece of the repair
that cannot avoid tuned content; parked until Neil approves the exact prompt
diff.

**Future (grill-me session):** "My Campaigns" library — server-side rows
exist only for producer runs (`producer_runs`/`producer_scenes`); legacy
one-shot ads live solely in per-device IndexedDB. A cross-device,
campaign-grouped library (Gemini-Library-style, per Neil's reference
screenshots) needs a persistence path for legacy runs + a library UI.

**STILL OPEN (flagged by critics, all pre-existing — next candidates):**
1. **Top-up buyers never see billing_success** — `TopUpCheckoutPage` succeeds
   in-page; recovery now works (return intent + quota refetch) but the
   "BALIK SA AD MO" celebration surface never shows for top-ups.
2. **`BillingSuccess` hides all CTAs behind `activated` (plan ≠ free)** — a
   top-up-only buyer reaching it would spin on "Activating…" forever.
3. **MarketMind autofill hazard**: an unconsumed `grifon_pendingAutofill`
   (<10 min) can knock a just-restored step-8 ad back to Step 1
   (`App.tsx:640-704` shares deps with the restore path). Unusual sequence.
4. **`useQuota`/`useSubscription` await `getSession()` outside try/catch** —
   plausible-only permanent-loading hang; same pre-existing pattern in both
   hooks, fix them together if ever.
Paywall unification (Step-8 vs Dashboard-tile) also still open.

### Recommended fix shape (original design, for reference)

Make Step 8 an actual thank-you bridge, F03/F04-style:

- **One gold path.** Keep `GENERATE VIDEO NOW >` as the solo gold CTA, retitled
  to say what it costs to act (e.g. "I-RENDER ANG VIDEO — Starter ₱997"), and
  render the dead `upgradeNudge` Taglish line beside it at this moment.
- **State the state.** One line: "1/1 free workflow used · previews watermarked
  on export." Honesty + scarcity in the same breath.
- **Demote the exits.** Export bundle → after-the-bridge secondary (or
  post-decline); kill the Run-Research banner on step 8 for one-shot arrivals
  (or write `marketMindReport` from One-Shot's in-memory research).
- **Persist the ad across the paywall.** Stash the run (wizardSessionStore
  already exists) so both paid exits return TO THE AD, not to an empty dash.
- **Plug the lightbox watermark leak** (`ImageModal` download path).
- **Unify the two paywalls** on the `LockedVideoPreview` mechanic (own-ad
  blurred), single primary price, top-up as the quiet secondary.

## Part 2 — One-question segmentation (L3+L6): design, gate-ready

**The insight from the code map: the question already exists in-product.**
The One-Shot LaunchScreen vertical picker (`components/OneShotAd/LaunchScreen.tsx:74-79`,
`product | service | real_estate | app(locked)`) and `BusinessInfo.businessType`
(`types.ts:36`) are the same taxonomy, bridged by `deriveBusinessType`
(`components/OneShotAd/launchDerivation.ts:28-30`). **Do NOT invent a new
vocabulary** — the segmentation answer emits the existing one.

What's missing is capture BEFORE the app + a per-user home for the answer:

- **Where it lives (recommended): landing, at the moment of CTA click.**
  Hormozi/Brunson ask on the page, not after auth. When a visitor hits
  "CREATE MY FIRST AD — FREE", show one chip-row question — *"Anong business
  mo?"* → `Produkto / Serbisyo / Real Estate / Iba pa` — then continue into
  signup. One tap, no extra screen on the OTP flow itself.
- **Transport (all patterns already exist, copy them):**
  1. sessionStorage stash `grifon_intended_vertical` mirroring
     `services/moduleIntentService.ts` (allowlist-guarded pop in `App.tsx`,
     ordered after plan-intent per `App.tsx:492-494`);
  2. ride `user_metadata` on the OTP call exactly like `marketing_opt_in`
     (`services/supabaseClient.ts:67-69`), with the OAuth sessionStorage
     fallback reconciled post-auth (`App.tsx:514-561` precedent);
  3. log an `events` row (existing `/api/events` sink) for ad→LP matching,
     attributable pre-auth via `getSessionId()` (`services/analyticsService.ts:13`).
- **What it pre-fills:** LaunchScreen vertical pre-selected; Dashboard hero
  placeholder skinned per vertical; Step 2 `businessType` default. **NOT
  `MarketResearchInput`** — that schema is LOCKED (MarketMind).
- **Persistence:** `user_metadata` (client-writable, precedent, no migration).
  No new table. `subscriptions` write would need a service-role endpoint —
  deferred unless ads need server-side segment joins.
- **Downstream (the L2 payoff):** the same four answers become the ad→LP
  routing for vertical landing variants (run-sheet item 06) — one taxonomy from
  ad set → landing chip → wizard prefill.

### SHIPPED 2026-07-30 (Neil: "go sa segmentation build" — gates resolved to
the recommendations): landing placement at CTA click (`VerticalPickerModal`,
wraps Hero/ReceiptsRail/PinnedCtaPill only, once per session, fail-open —
the CTA can never die for the question); copy as designed; "Iba pa" →
`product` + raw label logged; ship-and-watch via `segmentation_answered` /
`segmentation_skipped` events (pre-auth, session-id stitched). Transport:
`services/verticalIntentService.ts` stash → App pop (after plan-intent bail,
allowlisted) → `saveBusinessVertical` to `user_metadata` + `preferredVertical`
prop into both One-Shot engines. Priority enforced at
`LaunchScreen.tsx` `useState(restored?.vertical ?? preferredVertical ?? 'product')`
— draft always wins. Critic: PASS 9/9, timing hole proven unreachable.

**Critic edges accepted as-is (low/info — revisit only if events show pain):**
F1 checkout-failure path strands the answer for the session (self-heals next
mount); F2 modal has no focus trap (same gap as ExitIntentModal); F3
cross-tab email-confirm drops the stash (inherent to the pattern); F4 logout
doesn't clear `grifon_vertical_asked` (next cafe-PC guest not re-asked —
analytics undercount only).

---

⚠ Cafe-PC rule: this file + the artifact twin are the durable record; the
exploration transcripts die with the session.
