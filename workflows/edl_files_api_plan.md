# EDL Files API restore — the constraint that decides the design

**Status: DESIGN, not started. One decision is Neil's; everything else follows from it.**

Context: the EDL is blind for every user. `EDL_MAX_ATTACHED_VIDEOS = 0`
([geminiService.ts:1129](../services/geminiService.ts#L1129)) because Gemini stopped
accepting our R2 object URL as `fileData.fileUri`. Root cause + the live isolation are in
[pilot_run_2026-08-13.md](pilot_run_2026-08-13.md). The restore path is known — mint the
URI through Gemini's own Files API — but the constant's doc comment describes it as if it
were a swap. **It isn't.** This file is why.

---

## 1. The good news — the upload path already exists here

[api/gemini/omni-video.ts:259-300](../api/gemini/omni-video.ts#L259-L300) already does the
whole thing, in production, with error handling:

> download the clip → `/tmp` → `ai.files.upload()` → poll `files.get()` until not
> `PROCESSING` → check `FAILED`/`!uri` → `rmSync` the temp dir in `finally`

[tests/regression/research-tier.ab.test.ts:388-415](../tests/regression/research-tier.ab.test.ts#L388-L415)
has the same loop in test form, with a 120s cap. **Nobody needs to design this part.** The
restore reuses a proven path.

## 2. The bad news — it cannot live where the EDL lives

| Fact | Source |
|---|---|
| EDL runs through `proxyGenerateContent` → `api/gemini/text.ts` | [geminiService.ts:1551](../services/geminiService.ts#L1551) |
| `api/gemini/text.ts` is pinned to **60s** | [vercel.json:4](../vercel.json#L4) |
| One clip is allowed **5 minutes** to reach ACTIVE | [omni-video.ts:45](../api/gemini/omni-video.ts#L45) |
| The EDL wants up to **10** clips | the pilot run — 10 scenes |

Ten uploads, each budgeted at five minutes, inside a sixty-second function. Serial uploads
inside the EDL request are not tight — they are impossible. **The upload has to move.**

Also: the client cannot mint a `files/*` URI at all. `ai.files.upload()` needs the SDK, the
server key and a filesystem, and `services/CLAUDE.md` forbids importing `@google/genai`
from the client. So this is a new server surface either way, not an edit to the videoParts
loop.

## 3. The three shapes, and the one question that picks one

**A — upload-at-EDL-time, one clip per request.** New `api/gemini/files/upload.ts`, one
clip per call, client fans out N calls in parallel, then passes the `files/*` URIs into the
EDL call. Each upload gets its own 60s budget.
*Cost:* N extra round trips on every EDL run, every time, including re-runs.

**B — upload-at-render-time, persist the URI.** When a scene video is first produced, push
it to the Files API too and store the URI on `producer_scenes`. The EDL just reads it.
*Cost:* a schema column and a migration; uploads happen once per scene, not once per EDL.

**C — do it inside the EDL request.** Ruled out by §2. Recorded so it isn't re-proposed.

**The deciding question — and it is a fact, not a preference: how long does a Files API URI
stay valid?** Gemini's documented retention is short (on the order of days, not months) and
I have NOT verified the current number this session — do not build on my memory of it.

- If the URI outlives a typical run-to-render gap → **B wins.** Uploads once, survives
  resume, and kills the R2-presign-expiry failure mode the constant's doc comment already
  flags as a second reason to do this.
- If it expires faster than a parked run can sit in `review` → **A wins**, because B would
  hand the EDL a dead URI on exactly the resumed runs that matter most.

Check the retention number first. It costs one doc lookup and it decides the schema.

## 4. Latent finding, adjacent — omni-video's deadline is unbacked

`api/gemini/omni-video.ts` is **not in [vercel.json](../vercel.json)'s `functions` block**,
so it runs on the account default while its own code waits up to 5 minutes for a file to go
ACTIVE ([omni-video.ts:45](../api/gemini/omni-video.ts#L45)). Every other long-running
handler here is explicitly pinned. Either the deadline is unreachable and `omni_upload_timeout`
can never fire, or it is relying on a platform default nobody wrote down.

**Not verified:** this account's default `maxDuration`. Confirm before treating it as a bug —
but the asymmetry against every other handler in that file is real.

## 5. What already guards the dark state

Do not delete these when the cap is raised — retarget them.

- [tests/unit/edlVideoAttachCap.test.ts](../tests/unit/edlVideoAttachCap.test.ts) — asserts
  no `fileData` parts reach the wire and every `videoAttached` line says `no`.
- [tests/unit/edit-decision-list.test.ts:322-327](../tests/unit/edit-decision-list.test.ts#L322-L327)
  — same invariant from the part-ordering side.

**The assertion that does not exist yet, and is the whole point:** a live check that ONE
video part comes back 200. That is the test whose absence let this sit undetected for two
weeks. It cannot be added until the fix lands — today it would fail every night by design.
Add it in the same commit as the fix, then wire it into the Tier 3 nightly loop
([loops.md](loops.md) Tier 3), which already has the schedule, the API key and the
issue-filing path.

---

## Run order

1. Look up the Files API retention window. → picks A or B.
2. Brief `code-executor` (server surface + transport, not prompts — but it lands next to a
   TUNED file, so it does not go to the Sol lane).
3. Fix + live one-part assertion in the same commit.
4. Raise `EDL_MAX_ATTACHED_VIDEOS`, retarget the two unit tests.
5. Add the assertion to the nightly loop.
