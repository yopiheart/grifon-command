# Handoff — 2026-05-12 Evening Session (cozy-flask continuation)

**Created so the next-session agent has durable context after the cafe-PC reboot wipes `~/.claude/`.**

This was a continuation of the morning's MrBeast session (see `handoff_2026-05-12-mrbeast.md`). That session ended with the beta-merge gated pending Neil's call. This evening session shipped the beta-merge plus a long chain of UX polish on Step 2 + MarketResearch + OfferOptimizer.

---

## Where we are

- **Branch:** `main`
- **HEAD:** `b491cbf` (pushed, matches `origin/main`)
- **Working tree:** clean (untracked `.png` screenshots + `.playwright-mcp/` are debug artifacts — ignore)
- **Beta-merge:** ✅ SHIPPED (this morning's 73 commits + this evening's 10 polish commits all on `main`)

## What shipped this session (11 commits)

| Commit | Summary |
|---|---|
| `8b41f83` | **Beta-merge** — 73 commits from `combined-preview` → `main` |
| `c1e940e` | Phase 5 voice consolidation plan committed to `workflows/phase5_voice_consolidation.md` |
| `6658512` | Step 2 product-scale hints — initial ship of roadmap item #4 |
| `3a6197b` | Step 2 helper-field pattern (persistent helper over placeholder) — adopted the prior session's better UX after Neil pointed out the placeholder approach was inferior |
| `e161662` | Plain-English Pro Tip + upstream MarketResearch hint — replaced "hand-for-scale" jargon with "Show your product being held"; added the same hint to MarketResearch's `productDescription` textarea so it reaches users who auto-fill via "SEND TO DIRECTOR AI" |
| `5ea69fa` | Step 2 example tiles + service-business 2-line Pro Tip — 3 icon tiles above the dropzone (Product / Storefront / Service) + two parallel Pro Tip lines covering products AND service businesses (salon/gym/restaurant) |
| `8f7a89e` | Step 2 describes ALL uploaded photos (`[Photo N]` labels) — closes the architectural gap where `productImageDescription` was generated from `compressed[0]` only. Now all uploads get described and concatenated, feeding storyboard/video-prompt text prompts |
| `812d769` | Step 2 photo order awareness — HERO badge with Sparkles icon + gold border + glow on `productImageUrls[0]`; numeric badges (2,3,4,5) on the rest; "Photo 1 (HERO) anchors all scene visuals" hint above the grid; FIRST emphasis in both Pro Tip lines |
| `16a7bad` | `PreviousResearchCard` — new reusable component renders above the form in MarketResearch + OfferOptimizer entry views. Reads `localStorage.marketMindReport` + `localStorage.offerOptimizerResult` (+ new `savedAt` and `subject` sidecar keys). Click LOAD → restores results view directly, skipping the form |
| `9bc2075` | Two-button card — `VIEW REPORT` + `DIRECTOR AI →` 1-click express. Primary gold button bypasses the results review and navigates straight to creative_director; secondary ghost button opens the saved report inline for review first |
| `b491cbf` | MarketResearch secondary CTA — "Or build stronger offer first →" subtle text link below the existing `SEND TO DIRECTOR AI` button. Surfaces OfferOptimizer for power users without nagging the 90%+ of Filipino SMB users who have a simple offer already |

## Key architectural facts discovered this session

These were confirmed via Explore-agent audits and should NOT be re-investigated:

1. **`VideoPrompt.type` is `'talking' | 'b-roll' | 'cinematic'`** ([types.ts:73-77](../types.ts#L73-L77)) — scene type metadata exists today, no new tagging needed for voice consolidation routing.

2. **MarketMind prefill fills 6 businessInfo fields + offer** ([App.tsx:295-324](../App.tsx#L295-L324)):
   - `product` ← `r.subject`
   - `audience` ← `winningAvatar + demographics`
   - `painPoint` ← `r.bleedingNeck`
   - `benefit` ← `r.magicGenie`
   - `separator` ← `r.contrarianTruth || r.villain`
   - `features` ← `r.bigIdea`
   - `clientDetails.offer` ← `r.bigIdea`

3. **OfferOptimizer prefill fills 5 businessInfo fields + offer** via `r.directorPayload` ([App.tsx:326-354](../App.tsx#L326-L354)):
   - `product`, `audience`, `benefit`, `painPoint`, `separator`, `clientDetails.offer`
   - Does NOT fill `features`

4. **Both prefill effects check `wizardPristine`** — if MarketMind fires first, OfferOptimizer's pristine check fails and it silently skips. **Net: when both localStorage entries exist, MarketMind wins.**

5. **Scene image generation uses `productImageUrls[0]` only** ([services/geminiService.ts:1373](../services/geminiService.ts#L1373)) — even after Addendum 3's multi-photo description fix, photo[0] remains the visual anchor for Veo. Addendum 3 made TEXT multi-aware but not multimodal-bytes-aware. Deferred to Phase 5.2.

6. **MarketResearch is the only flow that uses all uploaded images** ([api/_lib/prompts.ts:224-235](../api/_lib/prompts.ts#L224-L235)) — `buildMarketMindParts` loops over `input.uploadedImages`.

7. **Director AI script generation has a LOGIC LOCK** ([api/_lib/prompts.ts:274](../api/_lib/prompts.ts#L274)) — "Do NOT recite the full SKU/product name verbatim" — protects against verbose product descriptions polluting ad dialogue.

## Pending / Next-Session Priorities

### P0 — Decision Gate test (~30-60 min, ~$5-10 in Veo credits)

**The critical next step.** Run a complete wizard end-to-end with all the new UX active:

1. **MarketResearch** — optionally test `PreviousResearchCard` if a saved report exists from a prior session (note: localhost port change loses localStorage)
2. **Step 1** — brand name + offer
3. **Step 2** — upload 3 photos:
   - **For products**: product-in-hand FIRST, then context shots
   - **For services**: storefront with logo FIRST, then interior + service-in-action
   - Verify the HERO badge marks photo[0] correctly
   - Verify multi-photo `[Photo N]` descriptions appear in the AI ANALYSIS panel
4. **Step 3–5** — script + avatar + storyboard
5. **Step 6 — Video Prompts** — try the **behavior/posture emotion workaround** in custom prompts:
   - Instead of "looking tired with brow furrowed" → write "shoulders slumped, hand on temple, papers strewn on desk"
   - This bypasses IDENTITY_LOCK's face-level constraints by directing posture/gesture/context cues
6. **Render All 8** — when complete, evaluate:
   - **Veo audio consistency** across 8 scenes — does the voice sound the same? → Decides Phase 5 voice consolidation priority (R5 in plan)
   - **Product scale rendering** — does the product render at realistic size with the new hints? → Validates Mitigation 1 & 2 of roadmap #4
   - **Multi-photo influence** — do scenes reference Photo 2 / Photo 3 context (storefront, service-in-action)?
   - **Behavior cue emotion** — does posture/gesture deliver the emotional tone the prompt asked for, even with IDENTITY_LOCK active?

### P1 — Phase 5 Session 1 (~3 hrs, no credits, safe regardless)

Per `workflows/phase5_voice_consolidation.md`:
- `utils/brandVoiceStorage.ts` + round-trip test
- `components/GenerateVideo/VoicePickerModal.tsx` (preset grid from `pinoyReady.ts`)
- Wire first-press flow

Sessions 2–4 of Phase 5 are gated on Decision Gate confirming Veo audio inconsistency.

### P2 — Parked items (do NOT start without explicit signal from Neil)

- Multi-history per module (Phase 6+) — last N runs instead of just last-one
- PDF/JSON re-upload (Phase 6+) — cross-browser recovery via downloaded file
- Cross-device Supabase persistence (Phase 5.2+) — `brand_profiles` table
- Multimodal storyboard with image bytes (Phase 5.2+) — pass `productImageUrls` to Gemini multimodal parts, not just text descriptions
- MarketResearch's `uploadedImages` → Step 2's `productImageUrls` auto-carry (Phase 5.2)
- Photo-removal description sync (Phase 6+) — currently removing a photo doesn't update `productImageDescription`
- Step 2 "auto-fill inputs from last research" button (Phase 6+) — inputs aren't separately persisted today
- Drag-to-reorder photos (Phase 6+)
- Lightbox preview on example tiles (Phase 6+)

## Mobile Verification — Vercel deployment status

**Vercel project is NOT linked yet on this machine.** `scripts/vercel-project.json` does not exist. First-time setup is required tomorrow before mobile verification.

### First-time Vercel setup (run once tomorrow)

```powershell
# In the grifon-command folder:
npm install -g vercel
vercel login                            # interactive browser auth
vercel link                             # pick the grifon-command project from the list
Copy-Item .vercel\project.json scripts\vercel-project.json
git add scripts/vercel-project.json
git commit -m "chore(scripts): commit vercel project link for cafe-PC restore"
git push origin main
```

After this one-time setup, [scripts/restore-vercel.ps1](../scripts/restore-vercel.ps1) handles every future cafe-PC reboot.

### Then deploy + verify on mobile

```powershell
vercel deploy --prod                    # deploys current main (b491cbf + later) to production
# Vercel returns a production URL like https://grifon-command.vercel.app/
```

Open that URL on mobile and walk the new UX:
- **MarketResearch** → if any saved report exists, confirm `PreviousResearchCard` renders with both VIEW REPORT + DIRECTOR AI → buttons
- **MarketResearch results panel** → confirm the new "Or build stronger offer first →" secondary CTA appears below SEND TO DIRECTOR AI
- **Director AI → Step 2** → confirm:
  - 3 icon tiles above the dropzone (Product / Storefront / Service)
  - Both Pro Tip lines visible
  - Helper line under the Product field (`// Physical product? Include size + color + shape + label...`)
  - After uploading, HERO badge on photo[0] with gold border + numeric badges on photos[1..N]
  - Multi-photo `[Photo N]` description in AI ANALYSIS panel
- **OfferOptimizer** → `PreviousResearchCard` renders if a saved result exists

If anything renders broken on narrow screens (notably the `flex-wrap` button row on `PreviousResearchCard`), file as Phase 6+ mobile polish.

## Cafe-PC reboot reminders

- `node_modules/` may need reinstall — `npm install`
- Dev server: `npm run dev` (typically binds to `:5174` or `:5175`; if both busy, lands on `:5176`)
- `.env` `GEMINI_API_KEY` confirmed present this session
- ~22 untracked `.png` screenshots + `.playwright-mcp/` are debug artifacts — `git status` will show them, ignore
- If git fails with "Author identity unknown" → `.\scripts\restore-git-identity.ps1`
- `~/.claude/plans/...` files DIE on reboot — this handoff doc is the durable record
- Vercel: see first-time setup section above; once linked, `.\scripts\restore-vercel.ps1` handles future reboots

## Opening prompt for the next session

Paste this into the next conversation's first message:

```
Continuing from 2026-05-12 evening session (cozy-flask continuation).

Branch: main HEAD b491cbf (pushed, working tree clean).
Read FIRST: workflows/handoff_2026-05-12-cozy-flask.md (full session record).

Top-line:
- Beta-merge SHIPPED this morning (73 commits from combined-preview → main).
- 10 follow-up UX polish commits shipped this evening — all Step 2 + MarketResearch + OfferOptimizer improvements (product-scale hints, HERO badge ordering, multi-photo descriptions, PreviousResearchCard with 1-click DIRECTOR AI button, secondary "build offer first" CTA). No architectural rewrites.
- Phase 5 voice consolidation plan committed to workflows/phase5_voice_consolidation.md.

P0 NEXT: Decision Gate test. Run a complete wizard end-to-end (use the new product-scale hints, multi-photo upload with HERO order awareness, behavior-cue emotion workaround in Step 6 prompts) → press RENDER ALL 8 → evaluate Veo audio consistency across 8 scenes. That answer decides whether Phase 5 voice consolidation is worth building. Phase 5 Session 1 (~3 hrs Foundation work) is safe regardless.

P1: If Decision Gate confirms voice inconsistency, start Phase 5 Session 1 per workflows/phase5_voice_consolidation.md.

Mobile verification via Vercel: project NOT linked yet — first-time setup needed (see handoff). After link: `vercel deploy --prod` ships today's commits, then test mobile UX on the production URL.

Cafe-PC reboot:
- npm install if needed
- npm run dev (likely :5176)
- .env GEMINI_API_KEY confirmed present in today's session
- Untracked PNGs + .playwright-mcp/ are debug artifacts, ignore
- If git identity fails: .\scripts\restore-git-identity.ps1

DO NOT auto-execute Render All — let Neil run it manually so he can grade the output in real time.
DO NOT auto-execute Vercel deploy — first-time setup is interactive (vercel login + vercel link).
```
