---
name: viral-autopsy
description: Analyze supplied social videos or ads and record hook, Edit DNA, and storytelling evidence in the Swipe File. Use for video teardowns or remixes; excludes trend discovery and grading Grifon outputs.
disable-model-invocation: true
---

For Codex tool execution, read [the desktop adapter](../_shared/codex-runtime.md) before following the workflow below.

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
5. **AI-slop source guardrail (Believability DNA).** A long-running winner may
   *itself* be AI slop — copying it wholesale amplifies slop. A **believability**
   proposal may draw corroboration **only** from `real-human`
   (`source_realism_verdict`) sources; `likely-ai` sources are **excluded from the
   count** and instead feed the **AI-tells / avoid anti-pattern catalog** in the
   Swipe File (what makes *theirs* fake = what to avoid in ours). Longevity
   qualifies a candidate; human-authenticity qualifies a *believability* source.
   (Full spec: `workflows/believability_dna.md`.)

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
- **The canonical source URL/ID, recorded even when analyzing a local file**
  (permalink, IG shortcode, or Ad Library id — NOT a signed fbcdn/CDN URL,
  those expire). It goes in the entry's **Source:** line. Lesson 2026-07-27:
  the E15–E18 TEMU batch is unrecoverable because only `.tmp` filenames were
  recorded — the defreezer ate the MP4s and there is no way back to the
  originals for vault backfill or re-verification.
- **Niche** (e.g. "skincare PH") and **source** (e.g. `fb-ad-library`).
- *Why this video* — what made it worth autopsying (views vs channel size,
  longest-running ad, Neil's gut). Record this; it's the outlier rationale.

### Step 2 — Run the analyzer

```bash
python tools/analyze_video.py <url-or-path> --niche "<niche>" --source <source>
```

Output JSON lands in `.tmp/viral-intel/<slug>.json` and stdout. The script
self-installs `yt-dlp` / `google-genai` and reads `GEMINI_API_KEY` from `.env`.

### Step 2b — Download fallback ladder (when the tool exits `DOWNLOAD_FAILED`)

The tool already exhausted rungs 1–3 internally (plain yt-dlp → logged-in
browser cookies → generic extractor). The agent climbs the rest — the goal is
always a real MP4 **with audio**, because Gemini must hear the VO/music:

4. **Resolve a direct .mp4 via a downloader service.** Use web tools
   (firecrawl/WebFetch/browser) against a snaptik-class service — e.g.
   snaptik.app or ssstik.io (TikTok), fdown.net or getfvid (Facebook reels),
   snapinsta-class (Instagram) — paste the original link, extract the direct
   .mp4 URL from the result page, then **re-run the tool with that direct
   URL** (the generic extractor downloads plain .mp4 links fine). These
   services churn and grow popups: when one works, record it here as the
   known-good (WAT learn-and-adapt); when one dies, replace it.
5. **Ask Neil for a manual download** (browser extension, or the service above
   driven by hand) and take the file path instead.
6. **Last resort — screen recording, WITH audio.** Windows Game Bar
   (`Win+Alt+R`) and OBS both capture **system audio**, so sound is preserved;
   phone screen recorders also capture audio. Tell Neil to play the video
   full-screen, record, and hand over the file. Caveat for the entry: cropped
   UI/watermarks may slightly distort caption-position and height% readings —
   note `screen-recorded` in the entry's source field.

Never skip the audio: a muted capture invalidates `edit_grammar` (SFX, music,
silences) and the transcript — half the Edit DNA. If only a silent capture is
possible, analyze anyway but mark those fields `LOW_CONFIDENCE` in the entry.

### Step 3 — Specificity gate

Exit code 3 (`GENERIC_OUTPUT`) means the analysis lacked timestamps/numbers:
- Re-run **once** (temperature is low; a retry usually lands).
- If it fails again, STOP and tell Neil what was vague rather than writing a
  fluffy entry. A generic entry is worse than no entry — it rots the Swipe File.

Spot-check 2–3 claims yourself against the JSON's own timeline fields (e.g. a
`why_it_works` claim about caption churn should be consistent with
`captions.swap_interval_s`). Internal contradictions → flag, don't transcribe.

### Step 3c — Ground-truth the timing/captions (REQUIRED for pattern-driving entries)

`analyze_video.py` uploads the whole clip but Gemini samples visuals at ~1 fps,
so the *timing* fields (shot count, cut times, caption swap-rate, zoom %) are
soft estimates — fine for a passing read, NOT for deciding whether a video
corroborates a Pattern. Before an entry increments/blocks a Pattern Index count,
cross-check with the deterministic auditor:

```bash
node tools/render_audit.mjs <mp4-path> --focus "exact shot/cut count, caption text + swap rate, verbatim transcript"
```

It fuses **ffmpeg** (model-free exact duration + scene cuts) + **still-frame OCR**
(catches sub-second captions the 1 fps watch misses) + a 2nd transcript read.
Diff its `deterministic` block + `timeline` against the autopsy's `shots`,
`captions`, and `transcript`. Within tolerance → record "verified via
render_audit" in the entry (see E6). A material mismatch (e.g. ffmpeg finds 18
cuts where Gemini said 6) → trust ffmpeg for timing, re-read captions off the
frames, and correct the entry before it pollutes a pattern decision. (Node, not
Python; the same engine backs FINAL_RENDER smoke.)

The same frame vision also **cross-checks the visual register**: confirm Gemini's
`believability.observed_register` against the still frames (raw-ugc = unretouched
skin / available light / lived-in background; cinematic = graded, clean, studio).
A mismatch (Gemini said `raw-ugc`, frames look studio-graded) → correct the
register before it feeds a Believability pattern count, exactly as you'd correct a
miscounted cut.

### Step 3b2 — Camera-angle map + b-roll inventory (Neil, 2026-07-25 — REQUIRED
kapag ang autopsy ay pang-recreation/adaptation, hindi lang pattern-counting)

Ang layunin ng recreation autopsy ay makopya hanggang ANGLE GRAMMAR — hindi
sapat ang "handheld selfie style" na isang linya. Mula sa render_audit frames
(o sariling frame-strip), itala per beat/scene:

1. **Camera-angle map:** framing (close-up/chest-up/wide) · camera height
   (eye/slight-low/slight-high) · lens feel (selfie-arm vs framed) · motion
   (locked/drift/walk) · saan nag-iiba ang angle at BAKIT (beat pivot? reveal?).
2. **B-roll inventory:** bawat non-talking shot — ano ito (kamay? produkto? UI?
   text card? lugar?), kailan pumapasok (timestamp + kasabay na linya), at ano
   ang trabaho niya sa beat (proof? micro-scene? pattern interrupt?).
3. **Recreation routing suggestion:** i-tag bawat b-roll item sa lane nito per
   ang B-ROLL ROUTING table sa `kuya-marvin-ads` (image / HTML-Hyperframes /
   image+HTML combo / gated generative motion) — para pagdating sa production,
   deretso na ang design brief kay CD at walang paid-gen na hindi kailangan.

Ilagay ang buod sa entry (bagong optional row sa entry table o sa So-What) at
ang detalyadong map sa recreation brief ng ad na gagawa (hal. km-XXX-brief.md).

### Step 3d — Vault ingest (optional accelerator — skip freely if the connector is absent)

If the Jockey by TwelveLabs MCP connector is authed (pilot PASSED 2026-07-25 —
see `workflows/twelvelabs_decision.md`), ingest the MP4 into the
`grifon-swipe-file` knowledge store so the *video itself* has a durable backup and joins the queryable corpus:

- Prefer a **direct public URL** as `jockey_add_media`'s `source` (e.g. the
  signed fbcdn URL from `yt-dlp --get-url`) — server-side fetch, no upload.
- Record the returned `ksi_…` item id in the entry's **File:** line.
- Corpus queries (`jockey_search`/`jockey_query`) may **surface corroboration
  candidates** for the Pattern Index — they are leads for Neil + Step 3c
  verification, they NEVER auto-increment counts, and Jockey output carries the
  same hypothesis-grade status as Gemini's read.
- The vault is an accelerator, never a dependency: the entry must stand alone
  without it (free-tier indexes expire ~90 days from creation).

### Step 4 — Write the Swipe File entry

Append to `workflows/viral_swipe_file.md` under **Entries** using the entry
template below. Then update:
- **Pattern Index**: increment corroboration counts for patterns this video
  confirms; add new candidate patterns at count 1; note contradictions.
- **Gated Proposals**: only if a pattern just crossed ≥3 corroborations AND
  implies a tuned-prompt or preset change.
- **Pending Actions**: add any concrete follow-up with its target file/skill.

### Step 5 — Commit

Checkpoint the reviewed Swipe File update with the completed task (`viral-autopsy: add <slug> entry`). `.tmp/` artifacts are
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
**Source:** <canonical permalink / IG shortcode / Ad Library id — the re-download path; never a signed CDN URL>
**Format:** <storytelling_format.name>, <duration>s, <shots.count> shots (median <X>s)

| Hook | Pace driver | Captions | Edit grammar | Camera | Reveal | CTA |
| --- | --- | --- | --- | --- | --- | --- |
| <text-on-frame-1? subject @Xs, type> | <driver + rate> | <chunk/swap/style> | <transitions/SFX/silences> | <motion + rate> | <@Xs, mechanic> | <@Xs, holds-to-end?> |

**Believability DNA:** *(from the `believability` block — capture-only; Surface B/C never become a tuned change here)*

| Dimension | Read | Surface |
| --- | --- | --- |
| Performance | <energy/eye-contact/gesture/affect, or n/a> (conf) | B |
| Voice delivery | <tone/pace/pauses, or n/a> (conf) | B if `talking` / C if `cinematic`-VO |
| Lighting | <available/ring/studio> (conf) | B (or A if a graded look) |
| Camera / lens | <selfie vs framed; drift vs locked> (conf) | B |
| Image realism | <skin/imperfection/background/props> (conf) | B |
| Lip-sync | <mouth↔audio match> (conf) | B (Veo-native audio — never break) |

**Realism register:** `<raw-ugc | polished-ugc | cinematic>` · **Source-authenticity:** `<real-human | likely-ai | mixed>` — <tells> (conf)

**Why it works (timestamped):**
1. <claim> — @<t>, <numeric evidence> (<confidence>)
...

**Weaknesses:** <or "none noted">

**So What for Grifon:** *(mandatory — an entry without this is incomplete)*
- <finding> → target: <`renderPresets.ts` candidate | caption preset | grifon-cmo hook template | storyboard discussion (TUNED, gated) | wizard UX | none — explain why>
- *Believability findings route by surface:* A (renderer/presets) → normal review; **B (Veo prompt) / C (TTS) → FROZEN** behind the ≥3-`real-human` + manual-A/B loop in `believability_dna.md` — record, never apply.
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
