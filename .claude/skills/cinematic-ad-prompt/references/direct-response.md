# Direct-Response Ad Layer (Grifon)

This is what turns a beautiful shot into a *selling* shot. Use in DIRECT-RESPONSE AD mode. The deep copy/offer/funnel work belongs to `grifon-cmo` — this file is the minimum DR craft needed to make the **shot prompt** sell: a scroll-stopping hook frame, a believable arc, and a clean CTA, in the right register and aspect. When the user needs the full script/offer, write the shot and hand off to `grifon-cmo`.

Frameworks behind this (from `grifon-cmo`): Cialdini's 7 Principles, Sabri Suby's $100M copywriting, MrBeast's retention playbook, Filipino SMB Taglish direct-response.

## Who the shot is for (address ONE person)

- **Bryan — Burned-Out Business Owner (PH):** 27–42, 1–15 staff, ₱40K–₱150K/mo. Pain: "I spend 80% of my time making content instead of running my business, and it doesn't convert." 3AM fear: "₱15K on ads, 2 sales." #1 objection: "another AI tool that makes garbage."
- **Olivia — Overwhelmed E-com Operator (Global):** same pains, $3K–$15K/mo. English register.
- Write to one of them, by name in your head. Never "Hey guys." The face/voice on screen should feel like a peer, not a polished spokesmodel.

> Canonical avatars + pricing live in `.claude/skills/grifon-cmo/SKILL.md`, `workflows/pricing_unit_economics.md`, and `config/planFeatures.ts`. Re-read those before pitching any tier/price/feature — do not inline prices here (they drift).

## The first-3-seconds hook (the whole ballgame)

The HOOK FRAME (see `structure.md`) is a *frame*, not a fade-in. At 0:00 something arresting is already happening. Pick ONE hook engine:

- **Named pain** — the exact frustration spoken/shown ("Puro ka content, walang benta?").
- **Curiosity gap** — an open loop the brain must close ("This is why your ads don't convert…").
- **Contrarian claim** — flips a belief ("Stop boosting posts. It's burning your budget.").
- **Visual disruptor** — a pattern interrupt: product slammed on the table, a "stop scrolling" gesture, a fast macro event, a surprising before-state.

Rules:
- **Never** open on "Hi", "Hello", or the brand name.
- For talking hooks, the speaker is already mid-sentence at frame 0 (Veo Frame-0 rule, `seedance-4k.md`).
- If the hook could run for any SaaS, it's too generic — tie it to Bryan's specific pain.
- Test of a good hook: it earns the next 2 seconds.

## The arc (keep it tight)

`HOOK → PAIN (agitate) → DESIRE/OUTCOME → OFFER (the mechanism) → CTA`. In a short shot you'll compress: open on hook+pain, turn to outcome, land the CTA. **Outcome before feature** — "replaces your ₱30K agency" beats "40 workflows". Lead with what they *get*, not what it *has*.

## The CTA / end card

- One clear action only. CTA by traffic temperature: cold → **"Try It Free"**; warm upsell → **"Upgrade to Pro"**; Autopilot → **"Apply for Autopilot"**. (Confirm current CTAs against `grifon-cmo`.)
- **Never show price on screen** (Grifon house rule). The CTA carries the action; pricing lives on the landing page.
- The end card can be a clean brand lockup or the product/result in hand — premium, on-brand (gold `#FFCC00` on near-black `zinc-950` per `DESIGN.md`; never neon, never pure black).

## Engine note — spoken Tagalog is NOT Seedance

Seedance 2.0 cannot speak Filipino/Tagalog (it supports EN/JA/ID/ES/PT audio only) and blocks raw real-face uploads. So a **Taglish *spoken* ad** (UGC, testimonial, founder) routes to the **in-app avatar pipeline** (Veo + ElevenLabs voice) — see `seedance-4k.md`. Seedance still carries the **cinematic/b-roll/visual layer** and any **on-screen captions/overlays/end cards** (text is image, not speech). The hook/offer/CTA/register craft below applies to both: it shapes the spoken line for the in-app talking ad AND the on-screen copy for a Seedance visual ad.

## Language register (premium Taglish)

- **Taglish (premium, not street):** matches Bryan's vocabulary, organic, conversational. Good for UGC, founder, testimonial aimed at PH.
- **English (4th–5th grade):** Olivia / global, landing-style clarity.
- **Never mix registers inside one asset.** Pick one and hold it.
- **Opening-accent lock (for TTS/Veo reads):** the first words set the accent for the whole line. To keep a Filipino read, don't start a Tagalog line with 3+ English words; ≤2 English words before the first Tagalog word keeps it Filipino (see `agent_lessons.md` 2026-06-13). Keep spoken lines short — one line per shot here; full scripts → `grifon-cmo`.

## Platform / aspect presets

- **9:16 — default for DR.** Mobile-first (Reels/TikTok/Shorts). Subject + action in the top two-thirds; keep the **bottom ~20% caption-safe** (captions/UI added later). Fast pacing, hook at 0:00.
- **1:1** — feed posts where needed.
- **16:9** — YouTube/landing/in-stream.
- Pacing for paid social: relentless forward motion, no dead beats, the payoff visible early. MrBeast rule — every second justifies the next.

## Honesty (protects the ad account + the brand)

No fabricated proof, fake urgency/scarcity, fake endorsements, or on-screen medical/financial guarantees; no real third-party logos/public figures as endorsers (see `content-policy.md`). Real mechanism, real outcome, real offer — it converts better and survives Meta/TikTok review. Trust is Grifon's core asset.

## DR pre-flight (add to the discipline checklist)

- [ ] HOOK FRAME stops the scroll at 0:00 (named pain / curiosity / contrarian / visual disruptor); not "Hi"/brand name.
- [ ] Addresses ONE avatar (Bryan or Olivia); outcome-before-feature.
- [ ] One clear CTA by temperature; **no price on screen**.
- [ ] One language register, held throughout; spoken line short and accent-locked.
- [ ] 9:16 default; bottom 20% caption-safe; subject in top two-thirds.
- [ ] No fabricated proof / fake urgency / fake endorsement / on-screen guarantee.
- [ ] If the user wants the full campaign/script → hand off to `grifon-cmo`.
