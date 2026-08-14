# EXECUTOR BRIEF — EDL Files API restore (option A)

**Lane: `code-executor`.** NOT the Sol lane — this lands inside `services/geminiService.ts`,
a TUNED file, and edits `vercel.json`.

Design + the evidence behind every constraint: [edl_files_api_plan.md](edl_files_api_plan.md).
Read it first. Root cause: [pilot_run_2026-08-13.md](pilot_run_2026-08-13.md).

---

## Goal

The EDL is blind for every user. `EDL_MAX_ATTACHED_VIDEOS = 0` because Gemini rejects our R2
object URL as `fileData.fileUri` — it only accepts URIs minted by its own Files API. Mint
them, attach them, raise the cap.

**Option A was chosen on a verified fact: Files API retention is 48 hours.** Do not persist
URIs to the database — a parked run resumed after 48h would get a dead URI. Upload fresh at
EDL time, every run.

---

## 1. NEW — `api/gemini/files/upload.ts`

One clip per request. The client fans out.

Copy the proxy envelope and the upload mechanics verbatim from
[api/gemini/omni-video.ts](../api/gemini/omni-video.ts) — lines 1–24 (imports) and 259–300
(the upload block). It is production-proven; do not reinvent it.

- **Imports** (ESM `.js` extensions are MANDATORY — see [tests/CLAUDE.md](../tests/CLAUDE.md)):
  `GoogleGenAI, FileState` from `@google/genai`; `getUserFromAccessToken` from
  `../_lib/supabaseAdmin.js`; `rateLimitCheck` from `../_lib/rateLimit.js`;
  `assertSafeMediaUrl` from `../_lib/ssrfGuard.js`; `mkdtempSync, writeFileSync, rmSync`,
  `tmpdir`, `join`.
- **Pipeline:** `POST` only → auth via `getUserFromAccessToken` → `rateLimitCheck` →
  `assertSafeMediaUrl(url)` → fetch → `/tmp` → `files.upload` → poll `files.get` while
  `PROCESSING` → return.
- **Body:** `z.object({ url: z.string().url() })`.
- **Response:** `{ uri, name }`. Errors use the house shape `{ error: 'CODE', detail? }`.
- **Rate limit:** key `gemini:files:${user.id}`. Budget must absorb a full fan-out —
  **30 / 60s** (a 10-scene run fires 10 at once, and a retry must not trip it).
- **Cleanup:** `rmSync(tmpDir, {recursive:true, force:true})` in `finally`. Non-negotiable.

### ⚠ The deadline is NOT omni-video's

`omni-video.ts` uses `FILE_ACTIVE_DEADLINE_MS = 5 * 60 * 1000`. **Do not copy that number.**
This handler is pinned to 60s (below), so a 5-minute deadline can never fire — the platform
kills the function first and the caller gets an opaque timeout instead of our JSON error.

Use **45s**, and return `{ error: 'files_upload_timeout' }` when it trips, so the caller sees
a real error with headroom to spare.

## 2. `vercel.json` — pin the new function

Add `"api/gemini/files/upload.ts": { "maxDuration": 60 }` to the `functions` block.
Every other long-running handler there is pinned; an unpinned one is the latent bug this
plan already flagged against `omni-video.ts`.

## 3. `services/geminiService.ts` — TRANSPORT ONLY

Fair game per [services/CLAUDE.md](../services/CLAUDE.md): transport, error wrapping, type
signatures. **Do not touch any prompt string, `responseSchema`, `responseMimeType`, or model
ID.** The `videoAttached:` line format stays byte-identical.

1. Add a helper that POSTs one `renderedUrl` to `/api/gemini/files/upload` and returns the
   `files/*` URI, following the existing `proxyCall` auth/error conventions in this file.
2. Fan out with **`Promise.allSettled`** over the eligible scenes. One clip failing must
   never fail the EDL.
3. At [line 1533](../services/geminiService.ts#L1533), replace
   `fileData: { fileUri: scene.renderedUrl, ... }` with the minted `files/*` URI.
4. Raise `EDL_MAX_ATTACHED_VIDEOS` from `0` to **`8`**. Rewrite its doc comment to describe
   the shipped design (keep the 2026-08-14 root-cause history — it is why the cap exists).
   8 is a payload-size knob, not a fix for the 429; the 429 was never about count.

### 🔴 THE INVARIANT THAT MUST NOT BREAK

The existing comment at [geminiService.ts:1131-1134](../services/geminiService.ts#L1131-L1134)
says the per-scene `videoAttached` line and the `fileData` parts must not drift apart. With
`allSettled` they now CAN, and that is the one way this change ships a silent bug.

**The set of successfully-uploaded scenes must feed back into `attachedIdx` before the
prompt is built** — not just into the parts array. A scene whose upload rejected must say
`videoAttached: no` and contribute no part. Build the prompt from the post-upload result,
never from the pre-upload eligibility list.

This degrades into today's exact behavior per scene, which is the desired failure mode:
partial eyes beat no eyes, so there is no all-or-nothing gate anywhere in this change.

## 4. Tests

**Retarget (do not delete) — both currently assert the dark state:**
- [tests/unit/edlVideoAttachCap.test.ts](../tests/unit/edlVideoAttachCap.test.ts) — asserts
  zero `fileData` parts. Flip to: parts present, and **every** `fileUri` matches `/^files\//`.
- [tests/unit/edit-decision-list.test.ts:322-327](../tests/unit/edit-decision-list.test.ts#L322-L327)
  — same flip from the part-ordering side.

**New unit test — the drift guard (the important one).** Mock the upload helper so a mixed
set resolves and rejects. Assert: `count(videoAttached: yes) === count(fileData parts)`, and
every rejected scene's block reads `videoAttached: no`. Table-drive it: all-succeed,
all-fail, and a mixed case.

**New live assertion — the one whose absence hid this for two weeks.** In
[tests/regression/](../tests/regression/), behind `RUN_REGRESSION=1`: an EDL call carrying
**exactly one** video part returns 200, not 429. This is the canary; it goes into the Tier 3
nightly loop in a follow-up.

---

## Acceptance criteria

1. `npm run build` passes (tsc + Vite) — the build-gate Stop hook reports its pass message.
2. `npm run test` passes, including all three test groups above.
3. `grep -n "EDL_MAX_ATTACHED_VIDEOS" services/geminiService.ts` shows `= 8`.
4. `git diff` touches **no** prompt string, schema, or model ID. Verify with
   `npm run check:bundle-leak`.
5. `api/gemini/files/upload.ts` is present in `vercel.json`'s `functions` block.

## Hard don'ts

- ⛔ No prompt / schema / model-ID edits. Escalate instead — do not decide.
- ⛔ No new DB column, no migration. 48h retention is why.
- ⛔ Do not copy `FILE_ACTIVE_DEADLINE_MS = 5 min`.
- ⛔ Do not make a failed upload fail the EDL.
- ⛔ Do not delete the two existing tests to make them pass.
- ⛔ Do not commit. The main loop reviews and commits (builder ≠ reviewer).

## Known limit to state in the hand-off

This does **not** fix R2 presign expiry, contrary to the claim in the constant's current doc
comment. We still fetch from R2 at EDL time; an expired presign now fails at our own 502
instead of inside Gemini. Fix that separately or not at all — but do not report it as solved.
