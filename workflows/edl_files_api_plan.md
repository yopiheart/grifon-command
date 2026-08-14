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

### ✅ ANSWERED 2026-08-14 — **48 hours. Take option A.**

Google's Files API docs, checked live this session: *"Files are stored for 48 hours."*
Free, 2 GB per file, 20 GB per project.

**48h does not survive a parked run.** The pilot itself **stalled 21 hours** at the EDL
stage, and a run can sit in `review` on a `gate_park` indefinitely — a Monday render
resumed Wednesday is entirely ordinary. Option B would persist a URI onto `producer_scenes`
that is dead on exactly the resumed runs where losing the edit hurts most, and it would
fail *silently into the same blind branch we are trying to leave*. Not worth a migration to
buy a bug with a 48-hour fuse.

**So: A.** Upload at EDL time, one clip per `api/gemini/files/upload.ts` call, client fans
out in parallel, fresh URIs every run. No schema change, no expiry class of bug, and the
20 GB project ceiling self-cleans on the same 48h clock.

Two properties worth keeping in the brief:

- **It degrades into today's behavior, not into a failure.** If a clip misses its 60s
  budget, that scene simply goes to the EDL as `videoAttached: no` — the branch the tuned
  prompt already has and is running on right now. Partial eyes beat no eyes; nothing needs
  an all-or-nothing gate.
- **It does NOT fix R2 presign expiry** the way the constant's doc comment claims a Files
  API move would. Under A we still fetch from R2 at EDL time, so a presign that expired
  before the EDL runs still fails — it just fails at our own `502`
  (`omni_source_download_failed` shape) instead of inside Gemini. Worth knowing before
  someone closes that concern as solved.

Sources: [ai.google.dev/gemini-api/docs/files](https://ai.google.dev/gemini-api/docs/files)

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

1. ~~Look up the Files API retention window.~~ **Done — 48h, option A.**
2. ~~Brief `code-executor`.~~ **Done** — [edl_files_api_brief.md](edl_files_api_brief.md).
3. ~~Fix + live one-part assertion.~~ **Done, SHIPPED 2026-08-14.**
4. ~~Raise the cap, retarget the two unit tests.~~ **Done — cap is 8.**
5. **← NEXT: add the live assertion to the Tier 3 nightly loop.** The regression test
   exists (`tests/regression/edl-video-part.regression.test.ts`, `RUN_REGRESSION=1`) but
   nothing runs it on a schedule yet, so the blackout class of failure is still only
   *detectable*, not *detected*. Wire it into
   [.github/workflows/nightly-regression.yml](../.github/workflows/nightly-regression.yml).

---

## ✅ LIVE CANARY PASSED — 2026-08-14 17:37

`RUN_REGRESSION=1 npx vitest run tests/regression/edl-video-part.regression.test.ts`

```
[edl] video attachments — eligible: 1  selected: 1  attached: 1  cap: 10
✓ returns 200 (not 429) with exactly ONE Files-API video part attached   23020ms
```

One `files/*` part on the wire, **200 not 429**, usable EDL returned, 23s. The exact
inverse of the 08-14 isolation. The root-cause diagnosis was right and the fix works.

## ✅ FULL-CAP PROBE PASSED — 2026-08-14 17:42

`RUN_EDL_FULL_CAP=1 npx vitest run tests/regression/edl-video-part.regression.test.ts`

```
[edl] video attachments — eligible: 10  selected: 10  attached: 10  cap: 10
✓ returns 200 (not 429) with 10 Files-API video parts attached   30897ms
```

**Ten parts, 200, 30.9s.** And deliberately harsher than production: the fixture is 15.5s,
so this put ~155s of video in one call against roughly 60s for a real 10-scene ad. A real
run clears with room to spare.

The cap of 10 is now measured, not assumed. **Nothing testable is left unmeasured before
merge** — what remains needs the merge itself (a real end-to-end run on deployed code).

Gate is `RUN_EDL_FULL_CAP`, deliberately NOT `RUN_REGRESSION`, so the Tier 3 nightly loop
keeps paying only for the cheap one-part canary. Re-run this one by hand after any change to
the cap, the attach path, or the EDL model id.

## Known follow-ups (recorded 2026-08-14, none blocking)

**1. `tests/regression/research-tier.ab.test.ts` now degrades silently.** That opt-in
harness (`RUN_AB=1`) pre-mints `files/*` URIs in `beforeAll` and passes them as
`renderedUrl`. They now get re-uploaded through `/api/gemini/files/upload`, which the
harness does not stub — so `allSettled` degrades every scene and the EDL arm runs
prompt-only **while the report still prints `videoPartsIncluded: true`.** A wrong A/B
result that looks right, which is the exact failure class this whole change exists to kill.
Fix by stubbing the upload seam in that harness. **Deliberately NOT fixed by adding a
`files/`-prefix passthrough to `proxyUploadFile`** — that would mask real upload failures in
production to make a test pass. Nobody is running `RUN_AB=1` today; fix it before anyone does.

**2. The download in `api/gemini/files/upload.ts` has no size cap.** It buffers the whole
response into memory (`Buffer.from(await dl.arrayBuffer())`) before writing to `/tmp`. Any
authenticated user can POST a URL to an arbitrarily large public file and OOM the function.
`assertSafeMediaUrl` blocks internal hosts but says nothing about size. Low severity —
self-inflicted, costs the caller their own rate-limit budget — and `omni-video.ts` has had
the same shape all along, so this is pre-existing, not a regression. A `content-length`
check plus a streamed write is a few lines whenever someone is in there.

**3. `omni-video.ts` is still unpinned in `vercel.json`** (see §4 above). The new handler is
pinned; its neighbour is not.
