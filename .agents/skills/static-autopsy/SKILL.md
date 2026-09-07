---
name: static-autopsy
description: Run an evidence-bound breakdown of an existing STATIC image ad (layout walk, verbatim copy, visual DNA, persuasion levers) via Gemini vision, append it to the Static Ad Swipe File, and optionally remix findings into Grifon-voice angles/copy or a Creative Director brief. Use when Neil drops one or more static ad image files (Facebook/Instagram feed or story creatives, competitor stills) and wants them decoded, asks "why does this ad work" / "what can we steal from this image", says "static autopsy" or "add to the static swipe file", or wants the winning-image-ads library grown. NOT for video (that's viral-autopsy), NOT for grading Grifon's own generated ads (gemini-eval / brand-check), NOT for scraping a competitor's FB page (ad-recon).
disable-model-invocation: true
---

For Codex tool execution, read [the desktop adapter](../_shared/codex-runtime.md) before following the workflow below.

This is the still-image counterpart to `viral-autopsy`: Neil supplies a winning
static ad, Gemini vision decodes it, and the findings compound in the committed
**Static Ad Swipe File** (`workflows/static_ad_swipe_file.md`) instead of
evaporating with the session. The source ad is compressed and committed to
`assets/ad-swipe/` so the reference survives the cafe-PC defreezer. Discovery
stays human (FB Ad Library sorted by longest-running, competitor feeds); analysis
is what this skill systematizes.

The library already holds E1–E17 (Iman Gadzhi SaaS-upsell, Grüns, IM8),
Pattern Index S1–S19, and Gated Proposals GP-1..GP-4. This skill's job is to add
to it *without* rediscovering or duplicating what's there.

## Hard guardrails (read first)

1. **NEVER edit `services/geminiService.ts` or `api/_lib/prompts.ts`** (or any
   TUNED-tagged content) based on an autopsy. A finding that implies an Image Ads
   Gen template change (`generateAdCreatives`) goes to the Swipe File's **Gated
   Proposals** section, addressed to Neil — never auto-applied. (See
   `agent_lessons.md` 2026-05-09 — no autonomous greenlighting of tuned diffs.)
2. **3-corroboration rule.** A pattern may only move `observed → proposed` (Gated
   Proposal, CMO playbook update) once **≥3 analyzed ads** corroborate it —
   **independent brands preferred** (5 Grüns ads is weaker than 3 across 3
   brands). One ad is an anecdote.
3. **Gemini's read is a hypothesis, not ground truth.** The agent can SEE the
   still itself — so verify before trusting: carry the `confidence` field through
   to the entry, and eyeball-check the verbatim quotes, palette, and layout walk
   against the stored JPG (Step 4). Never present a `low`-confidence claim as fact.
4. **The trust line.** We steal *structure and lever*, never the lie. Fabrications
   the ad uses (fake DMs, fake countdowns, invented stats, manufactured scarcity)
   are recorded in `trust_flags` and as **S7-class anti-patterns** — copy the
   layout, never the fabrication. Real guarantee, real cap, real proof, or it
   doesn't ship.

## Procedure

### Step 0 — Open the Swipe File

Read `workflows/static_ad_swipe_file.md` end to end:
- Skim the **Pattern Index** (S1–S19) so a new entry corroborates or contradicts
  existing patterns instead of rediscovering them.
- Review the **Entries** (E1–E17) — you need them for the dedupe in Step 2.
- Note the open **Gated Proposals** (GP-1..GP-4) so a newly-crossed threshold can
  feed the right one.

Pre-flight: confirm `GEMINI_API_KEY` is in `.env` (the tool fails fast with
`GEMINI_NOT_CONFIGURED` otherwise; the defreezer can wipe `.env`).

### Step 1 — Collect context from Neil

Required before running the tool (ask if missing):
- The image path(s): a single file or a folder of ads.
- **Brand** (e.g. "Gruns"), **niche** (e.g. "DTC supplement"), **source** (e.g.
  `fb-ad-library`).
- **Why swiped** — what made it worth autopsying (longest-running, scaled spend,
  Neil's gut). Record this; it's the outlier rationale.

### Step 2 — DEDUPE before any Gemini call

**View each image yourself** (Read the file) and compare its brand + headline
against the existing E1–E17 entries. **Neil's first batch very likely contains the
same Grüns / IM8 ads already decoded as E6–E17** — do NOT re-analyze them:
- **Duplicate** (an ad that IS an existing entry) → run the tool with
  `--entry E<existing> --ingest-only`: it stores the compressed image and you link
  it into the existing entry. No new entry, no new Gemini call, no Pattern bump.
- **New ad** → assign the next free E-number (E18, E19, …).

Dedupe is agent judgment (brand + headline), not a hash. When in doubt, treat as
new and note the near-match in the entry.

### Step 3 — Run the analyzer

```bash
# single new ad
node tools/analyze_ad_image.mjs <path> --brand "<Brand>" --niche "<niche>" --source <source> --entry E18

# per-brand batch (sequential numbering)
node tools/analyze_ad_image.mjs <folder> --brand "<Brand>" --niche "<niche>" --source <source> --start-entry 18

# duplicate of an existing entry — store image only, no analysis
node tools/analyze_ad_image.mjs <path> --brand "<Brand>" --ingest-only --entry E11
```

A **mixed-brand folder = one run per brand group** (the tool tags every image with
one `--brand`). Output JSON lands in `.tmp/static-intel/E<NN>-<slug>.json` +
stdout; the compressed source lands in `assets/ad-swipe/E<NN>-<slug>.jpg`. Batch is
incremental — it skips images whose output JSON already exists.

### Step 4 — Gate + eyeball cross-check

- **Exit 3 (`GENERIC_OUTPUT`)** means the analysis lacked verbatim copy / positional
  layout / hex palette. Re-run **once** (temperature is low; a retry usually lands).
  Still failing → **STOP** and tell Neil what was vague rather than writing a fluffy
  entry. A generic entry rots the Swipe File.
- **Ground-truth against your own vision** (the stills analog of render_audit): open
  the stored JPG and confirm 2–3 verbatim quotes, the palette hexes, and the
  top-to-bottom layout walk against what you actually SEE. Gemini's hex and font
  reads are approximate (`hex_approx` / `families_guess`) — correct the JSON before
  a claim touches a Pattern Index count.

### Step 5 — Write the entry(ies)

Append to `workflows/static_ad_swipe_file.md` under **Entries**, **newest on top**,
using the template below. Then update:
- **Pattern Index**: increment corroboration counts for patterns this ad confirms;
  add new candidates at count 1; note contradictions loudly (a winner that breaks a
  believed pattern is gold).
- **Gated Proposals**: only if a pattern just crossed **≥3 corroborations** AND
  implies an Image Ads Gen template or CMO-playbook change.

### Step 6 — Commit immediately

Cafe-PC rule: uncommitted work dies with the reboot. Commit the Swipe File update +
the committed image(s) right away (`swipe(static): add E18-E2x <brand> batch`). The
`.tmp/` JSONs are disposable; the entry + the committed JPG must stand alone.

### Step 7 — Offer the remix (on demand, not automatic)

Ask Neil if he wants findings remixed. If yes:
- **grifon-cmo** — turn the lever/pattern into Grifon-voice angles, hooks, or offer
  copy for Bryan/Olivia.
- **grifon-creative-director** — turn the visual DNA into a Creative Director brief
  (or a Gated Proposal for an Image Ads Gen template).

Every remix cites Swipe-File evidence (S-IDs, verbatim quotes) — never vibes.

## Entry template

```markdown
### <YYYY-MM-DD> — E<NN> <Brand> "<headline>" (<source>, <niche>)
![E<NN>](../assets/ad-swipe/E<NN>-<brand-slug>.jpg)
**Why swiped:** … · **Format:** <ratio, ad_type>
**Layout:** <top→bottom walk, focal point>
**Copy (verbatim):** "<headline>" — <CTA>
**Visual DNA:** <palette hexes+roles; type; register (S18 lane)>
**Levers:** <named levers + quoted evidence>
**Weaknesses / trust flags:** <or "none noted">
**So What for Grifon:** <finding → GP family | CMO playbook | none — why>
**Patterns:** corroborates <S-IDs>; new candidate <or none>; contradicts <or none>
```

## Out of scope / wrong tool

- **A video / reel** → `viral-autopsy` (Gemini *watches* the clip; different tool
  and different swipe file).
- **Grading Grifon's own generated ads** → `gemini-eval` (rules compliance) or
  `brand-check` (DESIGN.md fidelity).
- **Scraping a competitor's whole FB page / ad set** → `ad-recon` (static sourcing
  is parked post-v1; this skill decodes ads Neil already has in hand).
- **Applying an Image Ads Gen template change** → separate gated task via
  `surgical-edit` + `verify-changes`; this skill only *proposes*.
- Building this into an in-app module is a post-beta idea — if proposed it belongs
  in `workflows/post_beta_roadmap.md`, not scope creep here.
```
