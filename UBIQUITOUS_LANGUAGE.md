# Ubiquitous Language

The canonical vocabulary for Grifon Command. Extracted from `types.ts`, the eleven dashboard modules, and the wizard pipeline. When code, prompts, UI copy, or planning conversations refer to these concepts, use the **bold** term and avoid the listed aliases.

## The canonical end-to-end ad creation flow (7 steps)

The complete Grifon journey from "I have a product" to "I have a ready-to-post ad with caption." Crosses both the wizard and several Dashboard modules; users move through these in order to produce one finished ad campaign.

| # | Step | Module(s) | What the customer GETS |
| --- | --- | --- | --- |
| 1 | **Find the dream customer** | Market Research | A research report identifying who buys, why they buy, and what makes them say yes. |
| 2 | **Build the offer** | Offer Optimizer | A value-stacked offer (tripwire + core + high-ticket) that makes saying no feel stupid. |
| 3 | **Direct the ad** | Director AI (the 8-step wizard) | Character, script, storyboard, thumbnail, and per-scene video prompts. |
| 4 | **Generate the video** | Generate Video | The actual rendered video clips for each storyboard scene. |
| 5 | **Lock the character voice** | Signal Modulator | A consistent voiceover per scene so the on-camera character sounds like one person across the entire ad. |
| 6 | **Edit the final ad** | Edit Video | All scene clips merged, trimmed, and pacing-adjusted into one ready-to-post ad. |
| 7 | **Write the post copy** | Caption Headline | Caption + headline written like a copywriting expert who knows the dream customer and the offer. |

Bryan-outcome of the full chain: *"I started with a product idea. I ended with an ad I can post today."* No agency, no freelancers, no handoffs.

The sections below are the technical-vocabulary deep dives — wizard internals (Step 3), per-module data shapes, Influencer Forge mechanics, etc. The 7-step flow above is the canonical user-facing journey; everything below is supporting detail.

## Wizard pipeline (the 8-step ad creation flow)

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Client Details** | The brand identity inputs collected in Step 1 (brand name, offer, services). | Brand profile, account info |
| **Business Info** | The product, audience, problem, and benefit inputs collected in Step 2; drives every downstream prompt. | Brief, product spec |
| **Script** | The wizard ad copy: two competing **Hooks** plus a shared **Body**, optionally with a **Strategic Audit**. | Copy, ad text |
| **Hook** | A short opening line of a **Script**; the wizard generates two competing variants (`hook1`, `hook2`). | Opener, attention line |
| **Body** | The post-hook lines of a **Script**, shared across both **Hooks**. | Main copy, script body |
| **Strategic Audit** | A short critique appended to a **Script**, **Storyboard**, or **Influencer Script** explaining the strategic choices made. | Reasoning, notes, rationale |
| **Avatar** | The single on-camera AI-generated person used in *one* wizard ad (`Avatar` interface). Distinct from **Influencer**. | Persona, talent, model |
| **Storyboard** | An ordered list of **Scenes** that together render a wizard ad. | Shot list, scene plan |
| **Scene** | One unit of a **Storyboard**: a script line, a description, optional start/end frame prompts, and an optional **Chain Role**. | Shot, frame, beat |
| **Chain Role** | A **Scene**'s position in the cinematic relay chain: `Metaphor_A`, `Anchor_B`, `Action_C`, `Hero_D`. | Slot, sequence position |
| **Video Prompt** | The final per-line prompt sent to the video model; tagged `talking`, `b-roll`, or `cinematic`. | Generation prompt |
| **Visual Theme** | A reusable look-and-feel preset (vibe, texture prompt, color palette) applied across **Storyboard** generation. | Style, aesthetic |
| **AllData** | The bundled wizard state passed downstream — Client Details + Business Info + Script + Avatar + Storyboard + Video Prompts + thumbnail + aspect ratio. | Project, session, payload |

## Dashboard modules (the eleven standalone tools)

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Market Research** | The module that ingests product info and uploads to produce a competitive/audience report. | Research tool |
| **Offer Optimizer** | The module that rewrites pricing/positioning given market research text. | Pricing tool |
| **Edit Video** | The module that generates an edit plan from a script + scene screenshots. | Video editor |
| **Image Editor** | The module that edits/regenerates images from user description and uploads. | Photo editor |
| **Caption Headline** | The module that generates captions and headlines for an existing ad asset. | Copy tool |
| **Organic Calendar** | The module that produces a multi-day organic-content plan with daily images and captions. | Content planner |
| **Image Ads Gen** | The module that produces multiple ad image variants from an **Uplink**. | Static ad tool |
| **Cinematic Spec Studio** | The module that generates a four-image cinematic relay (Metaphor / Anchor / Action / Hero) from an **Uplink** and a **Cinematic Spec Config**. | Cinematic tool |
| **Generate Video** | The module that runs the final video model with a **Video Gen Config**. | Video gen |
| **Signal Modulator** | The module that synthesizes a consistent character voice per scene (ElevenLabs-powered) so the on-camera persona sounds like one person across the entire ad — in either **Broadcast** or **Conversion** **Audio Mode**. The module name is engine-internal; user-facing labels should describe the outcome (e.g., "Voice Studio" / "Character Voice Lock"). | Voiceover tool, audio gen |
| **Influencer Forge** | The module that creates and runs an **Influencer** persona through an **Odyssey** of daily content. Distinct from the wizard's **Avatar** flow. | Persona tool, creator gen |

## Influencer Forge & Odyssey

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Influencer** | A persistent AI-generated creator persona used across an **Odyssey**, configured by `InfluencerConfig`. Distinct from a wizard **Avatar**. | Avatar (in this module), creator, persona |
| **Odyssey** | A multi-day content series for a single **Influencer**, scoped to one **Monetization Game**. | Series, campaign, journey |
| **Odyssey Day** | One numbered day within an **Odyssey**: has a **Mission**, a status (`LOCKED` / `PENDING` / `SYNTHESIZED`), and optionally an **Influencer Script** and **Storyboard**. | Episode, daily entry |
| **Mission** | The strategic objective for a single **Odyssey Day**. | Daily brief, prompt |
| **Monetization Game** | The strategic mode of an **Odyssey**: `MEDIA_GAME`, `COMMODITY_VIBE`, `PRODUCT_EDUCATION`, or `B2B_AUTHORITY`. | Mode, channel strategy |
| **Archetype** | The **Influencer**'s on-screen persona type: `AUTHORITY`, `STORYTELLER`, or `TREND_HACKER`. | Character type |
| **Influencer Script** | The script object returned for one **Odyssey Day** (`hook` + `body[]` + **Strategic Audit** + `daySummary`). Shape differs from the wizard's **Script**. | Script (when ambiguous) |

## Strategic input vocabulary (Influencer Forge brief)

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Dream Customer** | The ideal buyer the **Influencer** speaks to. | Target audience, ICP, demographic |
| **Bleeding Neck** | The customer's most urgent, painful problem (the one they're actively trying to solve right now). | Pain point, problem |
| **Deep Fear** | The customer's underlying fear that fuels the **Bleeding Neck**. | Anxiety, worry |
| **Magic Genie** | The fantasy outcome the customer wishes for — used to anchor benefit framing. | Dream outcome, wish |
| **Raw Evidence** | Unfiltered proof (testimonials, screenshots, data) that grounds claims. | Social proof, testimonials |
| **Contrarian Truth** | The non-obvious, often counterintuitive claim that differentiates the offer. | Unique angle, hot take |

## Cinematic Spec Studio vocabulary

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Slot** | A named asset position in `CinematicSpecConfig`: `SIDE_PROFILE`, `FRONT_PERSPECTIVE`, `HERO_FINALE`, `MACRO_DETAIL`, `BRAND_LOGO`. | Reference image, asset slot |
| **Cinematic Relay** | The four-image output sequence: **Metaphor → Anchor → Action → Hero**. | Storyboard (in this module) |
| **Subject Filter** | Whether the relay is centered on the `product` or on `lifestyle`. | Focus, mode |

## Audio & voice (Signal Modulator)

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Audio Mode** | The voiceover delivery mode: `BROADCAST` (high-fidelity narration) or `CONVERSION` (sales-led delivery). | Voice mode |

## AI Editor & final render (Viral Editor 2.0)

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **EDL** | The Edit Decision List (`EditDecisionList`) the AI Editor drafts from a **Scene Batch**: per-scene keep-segments, overlay text, SFX cues, transitions, camera hints, plus `meta` + `formulaCheck`. The render contract `/api/render/final` enforces. | Edit plan, cut list |
| **Edit Style Preset** | One of the named looks in `renderPresets.ts` (`classic` / `impact` / `hype` / `clean`): hook layout, caption animation, transition style, camera energy, SFX map. Rotates deterministically per ad (seed = scene bucket paths, query-stripped) so the SAME ad always re-renders identically. | Render theme, style pack |
| **Title Stack** | The reference-grade hook layout: words pop sequentially with elastic overshoot, lines stacked in the TOP safe band, power words in the highlight color. | Hook stack, big text |
| **Hook Palette** | The metallic gradient + light-sweep fill applied to title-stack hook text, rotated per render so consecutive ads don't match. | Gradient skin |
| **Film Burn** | The light-leak transition reserved for the hook→scene-2 cut (warm overexposed wash, 3 decaying steps each side). | Light leak (as a generic) |
| **Word-Pop** | The caption animation where 1–3-word chunks swap on VO cadence, each word timed by character weight. Captions pace the FULL speech window; chunks overlapped by an overlay are sacrificed, never delayed. | Karaoke captions (that's a distinct `chunkAnim`) |
| **Razor Trim** | The last scene's tail trim at speech-end + 0.06s (vs the standard 0.18s pad) so the ad's closing frame is the CTA — never a ghost tail, dead beat, or black frame. | End trim |

## Viral intelligence (Viral Autopsy)

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Viral Autopsy** | An evidence-bound breakdown of an *existing* social video/ad (not Grifon's own output): hook anatomy, Edit DNA, storytelling format, timestamped why-it-works claims. Produced by `tools/analyze_video.py` + the `viral-autopsy` skill. | Video review, ad analysis (when ambiguous) |
| **Swipe File** | The committed database of Viral Autopsies at `workflows/viral_swipe_file.md`: Pending Actions, Pattern Index, Gated Proposals, Entries. Patterns need ≥3 corroborating videos before they may be proposed for adoption. | Research notes, inspiration folder |
| **Edit DNA** | The measured edit-mechanics profile of a video: shot stats, perceived-pace driver, caption mechanics, edit grammar, camera motion, reveal mechanic, CTA timing. (Term originates in `workflows/edit_style_research.md`.) | Edit style (that's the preset concept) |

## Paid media (Ad Strategist)

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Ad Strategist** | The senior paid-ads **Media Buyer** role: runs/optimizes Meta (via the Meta Ads CLI) and TikTok campaigns. The execution partner `grifon-cmo` directs. Never spends autonomously — drafts spend commands for human approval. Produced by the `grifon-ad-strategist` skill. | Ads guy, ad manager, marketer (when ambiguous) |
| **Meta Ads CLI** | The command-line tool (`pip install meta-ads`, invoked as `meta`) that wraps the Meta Marketing API for creating, editing, and reading FB/IG campaigns. Meta-only; TikTok has no equivalent and is run by hand. | FB Ads API, Marketing API (when referring to the CLI specifically) |
| **Ad Performance Ledger** | The committed database of every paid campaign at `workflows/ad_performance_ledger.md`: North-Star Tracker, Pattern Index, Gated Proposals, Entries. Spend-strategy changes need ≥3 corroborating campaigns before they may be proposed. | Campaign log, ad tracker (when ambiguous) |
| **MER** | **Marketing Efficiency Ratio** = total revenue ÷ total ad spend. The paid-media **North Star** (target 3–5×). Account-wide and blended; distinct from per-campaign **ROAS**. | Blended ROAS (don't conflate — ROAS is per-campaign) |
| **ROAS** | **Return on Ad Spend** = revenue ÷ spend for one campaign/ad set. **Break-even ROAS = 1 ÷ net profit margin** — the line between scaling and bleeding. | MER (account-wide), return rate |
| **Hook Rate** | 3-second video plays ÷ impressions — does the opener stop the scroll. A *diagnostic* (we scale on MER/ROAS, not hook rate). Distinct from the renderer's **Hook** layout concepts (**Title Stack** / **Hook Palette**). | Thumbstop (that's hold-rate-adjacent), scroll-stop rate |
| **Hold Rate** | 15-second plays ÷ 3-second plays (i.e. average watch vs duration) — does the body hold after the hook. | Retention, watch-through (when ambiguous), AVD |

## Inputs & outputs

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Uplink** | The bundled brief (`UplinkData`) fed into **Image Ads Gen** and **Cinematic Spec Studio**: brand identity, pricing, demographic, benefit, problem, USP, palette, and asset slots. | Brief (when ambiguous), input bundle |
| **Ad Variant** | One of the three ad image templates produced by **Image Ads Gen**: `Press Clip`, `Benefit Anatomy`, or `Split-Screen`. | Ad creative, ad format |
| **Day Content** | One day's entry in the **Organic Calendar** output (title, image prompt, caption, vibe, placement). | Daily post |
| **Offer Stack** | The three-tier output of **Offer Optimizer**: one **Tripwire**, one **Core Offer**, one **High-Ticket** — each an **Offer Tier**. | Offer ladder, value stack (when ambiguous) |
| **Offer Tier** | One rung of an **Offer Stack** (`OfferTier`): mechanism name, pitch, value stack with anchor pricing, scarcity window, guarantee, and Hormozi-equation rationale. | Offer level, package |
| **Director Payload** | The projection of an **Offer Stack** into **Director AI** wizard fields (`directorPayload` on `OfferOptimizerResult`): a one-line `offer` plus the **Business Info** fields (product, audience, benefit, pain point, USP). Powers the Send-to-Director auto-prefill. | Wizard prefill, handoff bundle |

## Relationships

- One **AllData** wraps one wizard run: one **Avatar**, one **Storyboard**, one set of **Video Prompts**.
- A **Storyboard** has many **Scenes**; each **Scene** may carry one **Chain Role**.
- An **Influencer Forge** session has one **Influencer**, one **Monetization Game**, and many **Odyssey Days**.
- An **Odyssey Day** produces one **Influencer Script** and (optionally) one **Storyboard** of **Scenes**.
- An **Uplink** feeds either **Image Ads Gen** (→ multiple **Ad Variants**) or **Cinematic Spec Studio** (→ one **Cinematic Relay**).
- **Influencer ≠ Avatar.** Two different concepts in two different modules; do not unify them.

## Example dialogue

> **Dev:** "When the user finishes Step 5, do we save the **Avatar** for reuse in **Influencer Forge**?"
>
> **Domain expert:** "No. The **Avatar** belongs to one wizard run inside **AllData**. **Influencer Forge** generates its own **Influencer** from `InfluencerConfig`. They share no state."
>
> **Dev:** "Got it. And the **Strategic Audit** that comes back with the **Script** — is that the same thing as the one on the **Influencer Script**?"
>
> **Domain expert:** "Same idea, different shape. Both critique the strategic choices, but the wizard's **Strategic Audit** comments on the two competing **Hooks**, while the **Influencer Script**'s comments on the **Mission** for that **Odyssey Day**."
>
> **Dev:** "Last one — when **Cinematic Spec Studio** produces a **Cinematic Relay**, can I drop those four images into a wizard **Storyboard** as **Scenes**?"
>
> **Domain expert:** "Yes — that's exactly what the `Chain Role` field on **Scene** is for. The relay's `Metaphor → Anchor → Action → Hero` maps onto `Metaphor_A → Anchor_B → Action_C → Hero_D`."

## Flagged ambiguities

- **"Avatar"** is overloaded. The wizard's `Avatar` interface is one on-camera person for one ad. The **Influencer Forge**'s `InfluencerConfig` describes a persistent persona for a multi-day **Odyssey**. Recommendation: never use "Avatar" inside Influencer Forge code, prompts, or UI copy — say **Influencer**. Inside the wizard, "Avatar" is fine.
- **"Script"** is overloaded. The wizard's `Script` (two **Hooks** + shared **Body**) and the **Influencer Forge**'s `InfluencerScriptResponse` (one `hook` + `body[]`) are different shapes. When the surrounding context is mixed, qualify: **wizard Script** vs **Influencer Script**.
- **"Pain point" / "problem" / "bleeding neck"** describe the same underlying concept across `BusinessInfo.painPoint`, `UplinkData.marketPainPoint`, and `InfluencerStrategicInput.bleedingNeck`. They have different connotations: **Pain Point** = generic problem (wizard, Uplink); **Bleeding Neck** = the *most urgent* pain (Influencer Forge framework). Don't conflate.
- **"Audience" / "demographic" / "Dream Customer"** — same concept, three labels. Wizard uses **Audience** (`BusinessInfo.audience`), **Uplink** uses **Target Demographic** (`UplinkData.targetDemographic`), **Influencer Forge** uses **Dream Customer**. Each is canonical *within its module*; don't substitute across modules.
- **"Storyboard"** in the wizard is an ordered list of **Scenes**. In **Cinematic Spec Studio** the equivalent is the **Cinematic Relay** (four named images). Use **Storyboard** only for the wizard concept; use **Cinematic Relay** for the Cinematic Spec Studio output.
- **"Brand color"** appears as `BusinessInfo.brandColors` (string), `UplinkData.hexCodes` (string), and `InfluencerConfig.brandColor` (single hex). Recommendation: standardize on **Brand Colors** (plural, comma-separated hex string) when documenting; the singular `brandColor` in `InfluencerConfig` is intentional (one accent color per **Influencer**).
- **"Strategic Audit"** appears on `Script`, `StoryboardResponse`, and `InfluencerScriptResponse`. Same concept (a critique field), different scopes. Always qualify in conversation: **Script's Strategic Audit**, **Storyboard's Strategic Audit**, **Influencer Script's Strategic Audit**.
