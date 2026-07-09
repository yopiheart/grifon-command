# UGC Pro — Slice 4 Phase B: TUNED drafts (AWAITING NEIL APPROVAL)

**Status: DRAFT — not applied.** No byte below exists in `api/_lib/prompts.ts` yet.
Per the Slice-4 plan (`~/.claude/plans/reflective-wandering-conway.md`, Execution
shape): Phase B is shown to Neil verbatim before any tuned edit; Phase C (tests +
docs) + A4 (classifier clamp) follow via `code-executor` after approval.

Committed to the repo because the cafe-PC defreezer kills `~/.claude/plans/` and
the conversation — this doc is the durable copy of both the Phase-B brief and the
drafts under review. **Delete this file when the Slice-4 Execution Log lands.**

## Gating invariant (the core acceptance criterion)

Every block gates on `const bt = businessInfo.businessType ?? 'product'`. The
product path stays **byte-for-byte unchanged** — guarded by a Phase-C invariance
test (`businessType: 'product'` output identical to `businessType: undefined`).
Legal non-product combos (enforced upstream by Phase A's pickers + A4's clamp):
`service × {transformation, tutorial}`, `realestate × {tutorial}`.

---

## B1 — `buildAdScriptPrompt`, `isUGCPro` branch

### B1.1 Header lines (bt-gated label swap only)

- `bt === 'service'` → `Role: Viral UGC Creator-Scriptwriter (TikTok/Reels service content).` and `Service: "${businessInfo.product}"`
- `bt === 'realestate'` → `Role: Viral UGC Creator-Scriptwriter (TikTok/Reels real-estate content).` and `Listing: "${businessInfo.product}"`

### B1.2 VOICE override (replaces the FIRST-PERSON CREATOR block when bt !== 'product')

`bt === 'service'`:

```
**VOICE — FIRST-PERSON OPERATOR (the business films its OWN work; this overrides the
Services customer-voice rule for UGC Pro only):**
The speaker is the operator/practitioner filming themselves ON THE JOB, mid-work —
casual, hands busy, talking to camera like a vlog, never a pitch. NOT a customer
testimonial, NOT a faceless company announcer. "Ako si [name]" intros are BANNED —
no name, no life story; the work IS the content. First-person-plural operator speech
is CORRECT here ("tinatanggal namin 'to sa apat na hakbang", "ganito kami maglinis")
— this is the ONE format where the business speaks as itself, because the viewer is
watching them actually do the work. Present tense. Show, then say.
```

`bt === 'realestate'`:

```
**VOICE — FIRST-PERSON AGENT ON-SITE (phone-shot, walking the property):**
The speaker is the agent/broker filming themselves AT the property right now —
walking, pointing, phone-in-hand energy. NOT a customer, NOT a polished announcer.
"Ako si [name]" intros are BANNED — no name-tag; open on the place or the tip, never
a self-introduction. A kasama showing you around, present tense.
```

### B1.3 TRANSFORMATION skeleton — SERVICE variant (replaces the product B&A skeleton when bt === 'service')

```
**TRANSFORMATION 4-BEAT — SERVICE VARIANT (the WORK is the mechanism; there is no
held product):**
0. **Hook (<=2s, 5-8 words):** The problem state, shown and named — the client's
   mess/damage/before, real and specific. Pattern: "Tingnan mo 'tong sofa. Grabe
   'to." / "Three years walang linis itong aircon." NO brand mention in the hook.
   (adapt to the service and audience — do NOT copy these exemplars literally)
   PROVIDE 2 VARIATIONS — populate hook1 AND hook2.
1. **The Work:** The operator's hands + tool mid-action with a COMPLETE verb
   construction — "steam muna namin, tapos deep vacuum" — the METHOD entering,
   never a posed crew shot. If your line has no verb, REWRITE it — a posed
   introduction ("Kami ang [brand]...") is BANNED in this beat.
2. **Instant Reveal:** The line that rides the hard-cut after-state — short awe,
   3-8 words ("Ayan. Parang bago ulit."). HONESTY RULE: realistic, representative
   result; never fabricate a guaranteed outcome.
3. **Verdict + Book CTA:** Land the payoff + ONE soft conversational close driving
   BOOK / MESSAGE / INQUIRE. Obey the CTA price-leak guard; in Taglish, the
   TAGLISH ACCENT LOCK.

**APPEARANCE-CLAIM GUARDRAIL (Meta policy):** If the transformation is on a PERSON —
including derma, aesthetic, dental, salon, and clinic results — frame the result as
glow / fresh / feel / confidence, NEVER medical or corrective claims ("removes
wrinkles", "cures acne", "whitens in 7 days" — all BANNED). Surfaces, spaces,
fabrics, and objects may show dramatic before/after freely.
```

### B1.4 TUTORIAL skeleton — SERVICE variant (replaces the product tutorial skeleton when bt === 'service')

```
**TUTORIAL 5-BEAT — SERVICE VARIANT (authority-builder: "ganito namin ginagawa"):**
0. **Hook (<=2s, 5-8 words):** The pain or myth the method fixes, spoken to camera.
   Pattern: "Bakit bumabalik ang ipis pagkatapos mag-spray? Ganito kasi." / "Mali
   ang paglilinis mo ng aircon." (adapt to the service and audience — do NOT copy
   these exemplars literally) PROVIDE 2 VARIATIONS — populate hook1 AND hook2.
1-3. **Steps 1-2-3 (ONE line per step, each speakable in <=3s):** Open each line
   with the step number spoken ("Una," / "Step two —" / "Pangatlo,"), then ONE
   concrete action from the ACTUAL work with a real verb. The steps demonstrate
   mastery — the viewer should think "alam nila 'to", not necessarily DIY it.
   Anchor at least one step on the top 1-2 features from the FEATURE FILTER.
4. **Result + Book CTA:** The finished work in one line, then ONE soft
   conversational close driving BOOK / MESSAGE / INQUIRE. Obey the CTA price-leak
   guard; in Taglish, the TAGLISH ACCENT LOCK.
```

### B1.5 TUTORIAL skeleton — REAL-ESTATE variant (replaces the product tutorial skeleton when bt === 'realestate')

The `PRICE RULE:` line renders the SAME `PRICE_RULE` string computed exactly as in
the RealEstate arm (`priceGiven` off `businessInfo.listingPrice`, prompts.ts:665-668).

```
**TUTORIAL 5-BEAT — REAL-ESTATE VARIANT (agent-authority listicle):**
0. **Hook (<=2s, 5-8 words):** The question or mistake the tips solve. Pattern:
   "Bibili ka ng condo? Check mo muna 'to." / "Tatlong bagay bago ka mag-
   downpayment." (adapt to the listing and audience — do NOT copy these exemplars
   literally) PROVIDE 2 VARIATIONS — populate hook1 AND hook2.
1-3. **Tips 1-2-3 (ONE line per tip, each speakable in <=3s):** Open each line with
   the number spoken ("Una," / "Pangalawa," / "Pangatlo,"), then ONE concrete,
   checkable thing (clean title, transparent terms, developer track record, natural
   light, flood history, assoc dues). Ground at least one tip in THIS listing's
   real features from "${businessInfo.features}" — the property is the running
   example, never a prop. HONESTY RULE: do NOT fabricate a license number, award,
   or accreditation the user never provided.
4. **Takeaway + Inquiry CTA:** The takeaway in one line, then ONE soft close
   driving MESSAGE / VIEWING — an info-first keyword DM is the preferred pattern
   ("Message mo ako ng 'CHECKLIST'"). Obey the CTA price-leak guard; in Taglish,
   the TAGLISH ACCENT LOCK.

**PRICE RULE:** [rendered from the same priceGiven logic as the RealEstate arm]
```

### B1.6 SOFT CTA GUARD — one added line (rendered only when bt !== 'product')

```
BOOK, DON'T SELL (service/real-estate only): the CTA drives BOOK / MESSAGE /
INQUIRE / viewing — "buy now", "add to cart", "order now", and product-scarcity
("only 3 left") are BANNED. NO peso amount ever, and no invented free-consult/
inspection offer the "${offer}" does not state.
```

---

## B2 — `buildStoryboardPrompt`, `isUGCPro` arms

### B2.1 Before & After arm — SERVICE variant (bt === 'service' && sub === 'transformation')

```
**STRATEGY: UGC PRO — CONTINUOUS PERFORMANCE (Before & After — SERVICE)**
1. **ONE OPERATOR, ONE JOBSITE.** Every scene is the SAME operator at the SAME job
   location. No metaphor scenes, no environment-only B-roll, no branded-truck or
   gear-glamour shots.
2. **HARD CUTS ONLY.** Omit `transitionEffect` on every scene, including Scene 1.
3. **BEATS (4 scenes):**
   S1 HOOK — the PROBLEM, close-up (the stained sofa, the clogged drain, the
      damaged surface). The before-state IS the hook. NO operator, NO gear in
      this frame. venueSlot="before" if uploaded. referenceImage="none".
   S2 THE WORK — the operator's hands + tool mid-action on the problem. Honest
      working posture, NOT a posed crew shot. referenceImage="avatar" (or "none"
      if the beat is hands-only).
   S3 INSTANT REVEAL — the hard-cut after-state, framed IDENTICALLY to S1 (same
      angle, same distance, same lighting) so the change is the only variable.
      venueSlot="after" if uploaded. referenceImage="none".
   S4 VERDICT — the operator to camera, verdict + book CTA. referenceImage="avatar".

**APPEARANCE-CLAIM GUARDRAIL (Meta policy — applies to imagePrompt, not just script):**
If the transformation is on a PERSON (skin, hair, body — derma/salon/clinic services
included), the after-frame shows glow / freshness / ease — never a clinical or
corrective depiction. Do NOT render dermatological severity in the before frame and
do NOT render a "cured" after. Surfaces, spaces, fabrics, and objects may show
dramatic before/after freely.
```

Plus: graft the **PHILIPPINE GROUND-TRUTH REALISM** block **verbatim** from the
Services arm (prompts.ts:1143-1159, incl. the WORK-LED "de-emphasize gear, never a
shiny branded truck" rule and the FORBIDDEN AESTHETIC WORDS list). Implementation:
extract the existing block to a const (byte-identical) and interpolate into both
Services and non-product UGCPro arms.

### B2.2 Tutorial arm — SERVICE variant (bt === 'service' && sub === 'tutorial')

```
**STRATEGY: UGC PRO — CONTINUOUS PERFORMANCE (Tutorial — SERVICE)**
1. **ONE OPERATOR, ONE JOBSITE.** Same operator, same job location, every scene.
   No metaphor scenes, no environment-only B-roll, no gear glamour.
2. **HARD CUTS ONLY.** Omit `transitionEffect` on every scene, including Scene 1.
3. **BEATS (5 scenes — ONE step per scene; the caption system numbers them
   downstream):**
   S1 HOOK — the operator to camera at the jobsite. referenceImage="avatar".
   S2–S4 STEPS 1-2-3 — one step per scene, the REAL work mid-performance, tools in
      honest use. venueSlot="staff" or "interior" where the uploads fit.
      referenceImage="avatar" (or "none" if the step is hands-only).
   S5 RESULT + CTA — the finished work shown, operator closes with the book invite.
      venueSlot="after" if uploaded. referenceImage="avatar".
```

Plus the same grafted PHILIPPINE GROUND-TRUTH REALISM block (Services version).

### B2.3 Tutorial arm — REAL-ESTATE variant (bt === 'realestate')

```
**STRATEGY: UGC PRO — CONTINUOUS PERFORMANCE (Tutorial — REAL ESTATE)**
1. **ONE AGENT, ONE PROPERTY.** Same agent, same property, every scene. No metaphor
   scenes, no stock-footage skylines, no environment-only B-roll.
2. **HARD CUTS ONLY.** Omit `transitionEffect` on every scene, including Scene 1.
3. **BEATS (5 scenes — ONE tip per scene; the caption system numbers them
   downstream):**
   S1 HOOK — the agent to camera at the property (facade or doorway).
      venueSlot="facade" if uploaded. referenceImage="avatar".
   S2–S4 TIPS 1-2-3 — one tip per scene, the agent INSIDE the space the tip
      references (title talk in the sala, light check at the window, dues talk at
      the amenities). Set venueSlot to the matching uploaded room.
      referenceImage="avatar".
   S5 TAKEAWAY + CTA — the agent closes with the message/viewing invite.
      venueSlot="facade" if it fits. referenceImage="avatar".
```

Plus: graft the **PHILIPPINE GROUND-TRUTH REALISM** block **verbatim** from the
RealEstate arm (prompts.ts:1181-1192), extracted to a const the same way.

### B2.4 `slotLegend` + `venueSlotRouting` (bt-gated switch)

- `isUGCPro && bt === 'service'` → emit the existing **Services** legend
  (exterior/interior/ambiance/staff/before/after — matches `ARCHETYPE_UPLOAD_SLOTS`)
  instead of the product-state legend.
- `isUGCPro && bt === 'realestate'` → emit the existing **RealEstate** legend.
- Routing sentence for non-product UGCPro (replaces the product-state sentence at
  prompts.ts:1322):

```
 For UGC Pro, the operator/agent IS in nearly every scene, so a scene may carry BOTH
 referenceImage="avatar" AND a venueSlot — set "venueSlot" whenever the scene depicts
 a real uploaded place or state (the problem -> before, the finished work -> after, a
 toured room -> its room slot). OMIT it only on a neutral talking-head not tied to
 any place or state.
```

- The scene-type phrase at prompts.ts:1316 for non-product UGCPro reads:
  `service` → `"the JOBSITE, the WORK, or the BEFORE/AFTER"`;
  `realestate` → `"the PROPERTY, a ROOM, the VIEW, AMENITIES, or the LOCATION"`.

---

## B3 — services-constrained classifier (new sibling const in prompts.ts)

```
export const UGCPRO_SERVICE_CLASSIFIER_PROMPT = (service: string, description: string): string => `
    Analyze this SERVICE business for a UGC Pro creator-video strategy.
    Service: "${service}"
    Description: "${description}"

    Classify into ONE of these 2 formats:
    1. **TRANSFORMATION:** The service produces a visible before→after change on a
       surface, space, object, or person — cleaning, pest control, detailing,
       repair, landscaping, salon/derma results. The payoff is the INSTANT
       hard-cut reveal of the changed state. Focus: "Look at the difference."
    2. **TUTORIAL:** The multi-step METHOD is the content — "how we do X in N
       steps" authority-builders, process walkthroughs, expert tips. The payoff is
       the viewer trusting the expertise. Focus: "Here's how we do it, step by step."

    Precedence rule: a visible before→after on a surface, space, or person →
    ALWAYS TRANSFORMATION, even if the work has steps. Choose TUTORIAL only when
    the method or expertise itself is the differentiator, not the visible result.
    Output ONLY one word: TRANSFORMATION or TUTORIAL.
    `;
```

Consumed by A4 (chained, `api/gemini/text.ts`): `realestate` → force `'tutorial'`,
**no Gemini call**; `service` → this 2-way classifier on the Auto path; `product` →
unchanged 5-way.

---

## After approval (Phase C — code-executor brief lives in the Slice-4 plan)

Unit tests incl. the product-path invariance guard; classifier-clamp tests (assert
the mock was never invoked for realestate); prompt-branch substring tests; Step2
UGCPro-preserve tests (done in Phase A); regression fixtures (cleaning B&A + RE
tutorial); bundle-leak markers to add: `ONE OPERATOR, ONE JOBSITE`,
`agent-authority listicle`, `FIRST-PERSON OPERATOR`; Slice-4 Execution Log +
UBIQUITOUS_LANGUAGE.md (UGC Pro **operator** voice vs Services **customer** voice);
then delete this file.
