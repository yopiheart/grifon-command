---
name: viral-autopsy
description: Run an evidence-bound breakdown of an existing social video or ad (hook anatomy, Edit DNA, storytelling format) via Gemini video analysis, append it to the Swipe File, and optionally remix findings into Grifon-voice hooks/scripts. Use when the user drops a TikTok/YouTube/Instagram/FB-ad link or a video file and wants it analyzed, asks "why does this work" / "what can we steal from this", says "viral autopsy" or "add to swipe file", or wants to know what kind of videos/ads are working so Grifon's output can learn from them. NOT for evaluating Grifon's own generated output (that's gemini-eval) or for auto-discovering trends (this skill analyzes videos the user supplies).
---

This is Grifon's answer to sandcastles.ai's research loop: the user supplies a
winning video, Gemini watches it, and the findings compound in a committed
**Swipe File** instead of evaporating with the session. Discovery stays human
(FB Ad Library sorted by longest-running, TikTok Creative Center top ads,
competitor channels); analysis is what this skill systematizes.

Three failure modes this skill is explicitly engineered against (premortem,
2026-06-11): generic analyses nobody can act on, findings that never feed back
into Grifon, and unverified findings polluting tuned prompts.

## Hard guardrails (read first)

1. **NEVER edit `services/geminiService.ts` or `api/_lib/prompts.ts`** (or any
   TUNED-tagged content) based on an autopsy. Findings that imply a tuned-prompt
   change go to the Swipe File's **Gated Proposals** section, addressed to Neil.
   (See `agent_lessons.md` 2026-05-09 — no autonomous greenlighting of tuned
   diffs.)
2. **3-video corroboration rule.** A pattern may only be *proposed* for adoption
   (preset change, prompt discussion, CMO playbook update) once **≥3
   independent analyzed videos** corroborate it. One video is an anecdote.
3. **Gemini's read is a hypothesis, not ground truth.** Carry its `confidence`
   field through to the entry; never present a `low`-confidence claim as fact.
4. Renderer/preset implications (e.g. `api/_lib/renderPresets.ts` candidates)
   are *recorded* here but *executed* under their own task with `surgical-edit`
   + `verify-changes` — never as a side effect of an autopsy run.

## Procedure

### Step 0 — Open the Swipe File

Read `workflows/viral_swipe_file.md`:
- Review **Pending Actions** — surface any that this session could close.
- Skim the **Pattern Index** so the new entry can corroborate or contradict
  existing patterns instead of rediscovering them.

### Step 1 — Collect context from the user

Required before running the tool (ask if missing):
- The video: URL (TikTok/YT/IG auto-download) or a local file path. FB Ad
  Library videos usually need a manual download first.
- **Niche** (e.g. "skincare PH") and **source** (e.g. `fb-ad-library`).
- *Why this video* — what made it worth autopsying (views vs channel size,
  longest-running ad, Neil's gut). Record this; it's the outlier rationale.

### Step 2 — Run the analyzer

```bash
python tools/analyze_video.py <url-or-path> --niche "<niche>" --source <source>
```

Output JSON lands in `.tmp/viral-intel/<slug>.json` and stdout. The script
self-installs `yt-dlp` / `google-genai` and reads `GEMINI_API_KEY` from `.env`.

### Step 3 — Specificity gate

Exit code 3 (`GENERIC_OUTPUT`) means the analysis lacked timestamps/numbers:
- Re-run **once** (temperature is low; a retry usually lands).
- If it fails again, STOP and tell Neil what was vague rather than writing a
  fluffy entry. A generic entry is worse than no entry — it rots the Swipe File.

Spot-check 2–3 claims yourself against the JSON's own timeline fields (e.g. a
`why_it_works` claim about caption churn should be consistent with
`captions.swap_interval_s`). Internal contradictions → flag, don't transcribe.

### Step 4 — Write the Swipe File entry

Append to `workflows/viral_swipe_file.md` under **Entries** using the entry
template below. Then update:
- **Pattern Index**: increment corroboration counts for patterns this video
  confirms; add new candidate patterns at count 1; note contradictions.
- **Gated Proposals**: only if a pattern just crossed ≥3 corroborations AND
  implies a tuned-prompt or preset change.
- **Pending Actions**: add any concrete follow-up with its target file/skill.

### Step 5 — Commit

Cafe-PC rule: uncommitted work dies with the reboot. Commit the Swipe File
update immediately (`viral-autopsy: add <slug> entry`). `.tmp/` artifacts are
disposable; the entry must stand alone without them.

### Step 6 — Offer the remix (on demand, not automatic)

Ask Neil if he wants findings remixed. If yes, invoke **grifon-cmo** and turn
the entry/pattern into Grifon-voice assets (hooks, script beats, caption
strategy) for the relevant avatar (Bryan/Olivia). The remix cites swipe-file
evidence ("references swap captions every 0.4–0.6s; ours holds 4s") — never
vibes.

## Entry template

```markdown
### <YYYY-MM-DD> — <title/slug> (<source>, <niche>)
**Why autopsied:** <outlier rationale>  ·  **File:** `.tmp/viral-intel/<slug>.json` (disposable)
**Format:** <storytelling_format.name>, <duration>s, <shots.count> shots (median <X>s)

| Hook | Pace driver | Captions | Edit grammar | Camera | Reveal | CTA |
| --- | --- | --- | --- | --- | --- | --- |
| <text-on-frame-1? subject @Xs, type> | <driver + rate> | <chunk/swap/style> | <transitions/SFX/silences> | <motion + rate> | <@Xs, mechanic> | <@Xs, holds-to-end?> |

**Why it works (timestamped):**
1. <claim> — @<t>, <numeric evidence> (<confidence>)
...

**Weaknesses:** <or "none noted">

**So What for Grifon:** *(mandatory — an entry without this is incomplete)*
- <finding> → target: <`renderPresets.ts` candidate | caption preset | grifon-cmo hook template | storyboard discussion (TUNED, gated) | wizard UX | none — explain why>
**Patterns:** corroborates <P-IDs>; new candidate: <or none>; contradicts: <or none>
```

## Classification

- `PATTERN_CONFIRMED` — finding corroborates an existing Pattern Index row (count +1).
- `PATTERN_CANDIDATE` — new recurring-looking mechanic, count 1, watch it.
- `CONTRADICTION` — video wins while violating a believed pattern. Gold — record it loudly; it stops us cargo-culting.
- `ONE_OFF` — works here, unlikely to generalize (stunt, IP, channel-specific).
- `LOW_CONFIDENCE` — Gemini flagged it low confidence or the spot-check wobbled. Never feeds a proposal.

## Out of scope / wrong tool

- **Grading Grifon's own generated ads** → `gemini-eval` (rules compliance) or
  `brand-check` (DESIGN.md fidelity).
- **Auto-discovering what's trending** → not built; no reliable
  engagement-ranked public APIs. Sourcing is human; this skill can suggest
  *where* to look (FB Ad Library longest-running in PH, TikTok Creative Center
  top ads, outlier videos on small channels) but never claims to know what's
  viral today.
- **Applying renderer/preset changes** → separate task via `surgical-edit` +
  `verify-changes`.
- **Marketing strategy without a video** → `grifon-cmo` directly.
- Building this into an in-app module is a post-beta idea — if proposed, it
  belongs in `workflows/post_beta_roadmap.md`, not in scope creep here.
