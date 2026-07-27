# TwelveLabs "Video Memory" Decision (2026-07-24)

Verdict on the James Le / TwelveLabs "Video Has No Memory" brief (sources: the
shared summary + twelvelabs.io), evaluated against Grifon with Neil. Pattern
sibling of [hyperframes_decision.md](hyperframes_decision.md) — open this before
any TwelveLabs work.

**Neil's scoping answers (2026-07-24):** TwelveLabs account = free/trial only ·
scope = **workflow layer ONLY** (Hyperframes precedent — never product runtime) ·
first corpus = **Swipe File videos**. The **Jockey by TwelveLabs MCP connector**
is already attached via claude.ai (needs re-auth per session — interactive only,
absent in headless/cron runs).

## Verdict — YES, but narrowly

Adopt TwelveLabs as a **corpus-memory layer under the existing Swipe File loop**
— an accelerator, not a replacement for anything. ~⅔ of the brief is philosophy
Grifon already implements by hand; the missing ⅓ — durable, queryable memory
over the *videos themselves* — is a real gap that also neutralizes a cafe-PC
constraint: autopsied MP4s die in `.tmp/` + defreezer, only markdown survives,
so cross-video questions ("of all winners, which show product in ≤3s?") mean
re-downloading and re-watching everything. A Jockey knowledge store = a video
vault that survives the wipe (cloud-side) — "ingest once, reason many times."

## What the brief validates (already built — do NOT rebuild)

| Brief concept | Grifon equivalent |
| --- | --- |
| Tier 1 moments / "ground every claim" | Timestamped entries + specificity gate (`viral-autopsy` Step 3) |
| Tier 4–5 relationships / corpus context | Pattern Index + ≥3-corroboration gate + Gated Proposals (`viral_swipe_file.md`) |
| "Store primitives, not answers" | Edit-DNA JSON (shots, captions, believability block) |
| Video Worker Harness (envelope/contract/eval) | ai-editor budget caps + dry-run gates + eval-gate-per-output |
| "Don't trust model timing" | `tools/render_audit.mjs` deterministic ffmpeg + OCR |

## Ranked moves

1. **M1 — Swipe File video vault (pilot first).** Optional ingest step in
   viral-autopsy (after Step 2): `jockey_add_media` → `grifon-swipe-file` store;
   asset/item ID recorded in the entry. Backfill re-downloadable winners.
2. **M2 — Corpus-query assist for the Pattern Index.** On a new
   `PATTERN_CANDIDATE`, `jockey_search`/`jockey_query` the store for
   corroborating moments — hits are *candidates for Neil to confirm*, they NEVER
   auto-increment counts (render_audit Step 3c chain stays mandatory).
3. **M3 — ai-editor Mode B reference-moment retrieval** (cheap once M1 exists).
4. **M4 — CMO/CD/ads-strategist:** no direct integration — they consume the
   Swipe File, not raw video; the ledger is MER-driven, join stays via autopsy.
5. **M5 (parked) — Oceanides/Kuya Marvin footage store**, only if M1–M2 prove out.

**NOT doing:** product integration (4th AI provider — violates scope decision +
architecture truth, `concierge_director_plan.md` §2); replacing
`analyze_video.py` (tuned believability autopsy; Pegasus isn't a drop-in);
replacing `render_audit.mjs` (deterministic > model, always); anything
real-time/streaming (the brief itself flags that gap).

## Hard guardrails

- **Entries must still stand alone without the store** — free-tier stores can
  vanish; the vault is an accelerator, never a dependency. `.tmp` disposability
  doctrine unchanged.
- **Jockey output = hypothesis, not ground truth** — same status as Gemini's
  read; no Jockey-sourced claim touches TUNED files except via Gated Proposals.
- **Economics measured 2026-07-24** (twelvelabs.io/pricing + docs v1.3) —
  cheap. Free tier: 600 min indexing, 100 videos/index, no card, **but indexes
  expire 90 days after creation** → free tier is pilot-only, never the durable
  vault. Developer plan (pay-as-you-go): Marengo indexing $0.042/min (~$0.03
  one-time per 45s ad), search $4/1k queries, Pegasus analyze $0.0292/min
  input, storage $0.0015/min/mo (~$0.11/mo for a 100-video corpus). Full
  swipe-corpus index ≈ $3 one-time. Model roles via Jockey MCP: `jockey_search`
  → **Marengo 3.0** (embeddings, ≤4h/4GB per video), `jockey_query` →
  **Pegasus 1.5** (generation, ≤2h/2GB) — no direct model plumbing needed;
  standalone Embed API not needed at workflow layer.
- **Degrade gracefully when the connector is absent** (headless/cron): skip
  ingest, log a Pending Action.

## Pilot runbook (~30 min, no product code)

1. Neil re-auths the Jockey connector (claude.ai connector settings).
2. Live smoke: `jockey_list_knowledge_stores` → create `grifon-swipe-file` →
   ingest 1–2 re-downloadable Swipe File winners → `jockey_query` a known fact
   from their entries (e.g. E7's kinetic-VSL beats) → timestamps must match the
   verified entry (±1s vs render_audit numbers). That match IS the pass gate.
3. Record free-tier limits + PASS/FAIL here + close the Pending Action in
   `viral_swipe_file.md`. On PASS → edit the two skill files per M1/M2
   (docs-only, main loop, commit same session).
4. **Kill switch:** limits too tight or answers vague → log FAIL here and walk
   away. The philosophy is already implemented in markdown; the vault is a
   nice-to-have, not a foundation.

## Status

- [x] **Pilot RUN + PASSED 2026-07-25** (same night — Neil re-authed the
      connector and supplied OP2 as the live specimen). Store:
      `grifon-swipe-file` = `ks_019f94e4-8be3-70a1-98cb-bab72db8056e`; first
      item OP2 (`ksi_019f94f0-e46d-7b60-b2d4-4d4d3826d58b`, 168s One Peak
      kinetic VSL, still ACTIVE 129d). Indexing took ~8 min for 168s/53MB.
      **Query-back grade:** hook verbatim @0:00 ✅ exact; product naming
      ("Format Finder") @0:46 vs 47s ✅ ±1s; CTA @2:29 = 149s ✅ exact;
      proof-metrics question ⚠️ grabbed the hook's pain metrics (1,000/500/200
      @8–11s, themselves correctly timestamped) instead of the success proofs
      (17M/400k @82s/95s) — grounding contract held on every timestamp given,
      one interpretation miss. Confirms the standing guardrail: grounded ≠
      infallible; Jockey output stays hypothesis-grade. Bonus: on
      CTA-holds-to-end, Jockey's read (ending is a P.S. joke, not a held CTA)
      was *more* accurate than Gemini's `holds_to_final_frame: true`.
- [x] M1 (ingest step) + M2 (corpus-query assist) added to
      `.claude/skills/viral-autopsy/SKILL.md` per the approved plan.
- [x] **Face-off Round 1 vs Gemini RUN 2026-07-27** (Neil's directive: verify
      the "+13.1% over Gemini" homepage claim on our workload). Result: Gemini
      13/16, Pegasus/Jockey 11/16 on OP2 — parity band, **this verdict stands**;
      Pegasus lost hardest on cut-level temporal precision (its own marketing
      axis), both models failed long-take detection (render_audit doctrine
      confirmed), and Jockey's free plan rate-limits queries at 5/min. Full
      protocol + scoring: [pegasus_gemini_faceoff.md](pegasus_gemini_faceoff.md).
- [ ] **Graduation decision due before ~2026-10-22** (free-tier index 90-day
      expiry): if the vault has earned its keep, move to Developer plan
      (~$3 one-time full-corpus re-index + ~$0.11/mo) and backfill winners.
      Ingestion lesson: yt-dlp's native `facebook:ads` extractor + the signed
      fbcdn direct URL feed `jockey_add_media` server-side — no manual upload.
