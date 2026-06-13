# Supabase Storage Egress Audit — 2026-06-13

**Why this exists:** The free-tier Supabase org hit its egress quota and all project services
are 402-restricted. Numbers from the dashboard this billing cycle:

| Metric | Used | Limit | % |
|---|---|---|---|
| Egress (bandwidth) | 17.8 GB | 5 GB | 356% |
| Cached egress | 6.85 GB | 5 GB | 137% |
| **Storage volume** | **0.22 GB** | 1 GB | 22% |
| Database size | 0.028 GB | 0.5 GB | 6% |

**Headline conclusion:** The bill is **transfer, not storage**. 0.22 GB stored vs ~24 GB
transferred is the signature of the same heavy files being **downloaded over and over**, not of
files piling up. The hourly 48 h-TTL cron already reaps old objects, so deletion will **not**
lower the bill — the fix is on the **read/serve** path. Quota refills ~June 18, 2026.

---

## 1. Where we UPLOAD to Storage

One **private** bucket: `gemini-videos`. All writes go through the service-role admin client
(`api/_lib/supabaseAdmin.ts`). No second bucket, no dev/prod suffix (isolation is per project).

| Upload site | Content | Object path |
|---|---|---|
| [api/gemini/video/poll.ts](api/gemini/video/poll.ts) | Veo MP4 + `.meta.json` sidecar | `{uid}/{uuid}.mp4` |
| [api/kling/video/poll.ts](api/kling/video/poll.ts) | Kling V3 MP4 + sidecar | `{uid}/{uuid}.mp4` |
| [api/kling/omni-video/poll.ts](api/kling/omni-video/poll.ts) | Kling Omni MP4 + sidecar | `{uid}/{uuid}.mp4` |
| [api/voice/consolidate.ts](api/voice/consolidate.ts) | ElevenLabs MP3 (one per scene) | `{uid}/audio/{uuid}.mp3` |
| [api/render/final.ts](api/render/final.ts) | Final composited MP4 (`upsert:true`) | `{uid}/final/{jobId}.mp4` |
| [api/_lib/renderJob.ts](api/_lib/renderJob.ts) | Render-job status JSON | `{uid}/final/{jobId}.status.json` |

Heavy media is stored as **files**, never base64-inlined to the client. The browser only ever
receives **signed URLs** (24 h TTL). Objects are deleted at 48 h by the hourly cron
[api/cron/cleanup-gemini-videos.ts](api/cron/cleanup-gemini-videos.ts).

## 2. Where we READ/serve from Storage — this is the egress

### PRIMARY DRIVER — GenerateVideo "Rendered Rail" gallery
[components/GenerateVideo/index.tsx](components/GenerateVideo/index.tsx) (~L1375–1525):

- **Full videos, not thumbnails.** Every library item renders a live `<video src={signedUrl}>` tile.
- **No pagination / virtualization / lazy-load** — all items become live DOM nodes. The server
  caps the list at `MAX_ITEMS = 100` ([api/gemini/video/library.ts](api/gemini/video/library.ts)).
- **Hover-to-play** (`onMouseEnter → play()`) downloads the **full MP4** on hover, despite
  `preload="metadata"`. Scrubbing the gallery streams many full files.
- **Main preview canvas (~L1231)** uses `autoPlay` + default `preload="auto"` → full file on
  every tile click.
- **`refreshLibrary()` fires repeatedly** (mount + after every render / resume / delete — ~6
  call sites). Each call re-lists and **re-mints signed URLs**; because the URL changes, the CDN
  cannot serve a cache hit, forcing fresh origin egress.

### SECONDARY (server-side) — final-render input fetch
[api/render/final.ts](api/render/final.ts) composites with ffmpeg, which must pull each scene's
MP4 + voice MP3 **back out of Storage** into the Vercel function. ~8 scenes × 10–30 MB ≈
80–240 MB Supabase egress **per final render** — heavy if many test renders were run. (Exact
fetch path to be confirmed in Phase 2.)

### Not egress
Storyboard thumbnails (`SceneQueue.tsx`), InfluencerForge / ImageEditor images (base64), and the
SignalModulator voice list (ElevenLabs API) are local or off-Supabase.

## 3. Re-fetch loops / subscriptions

- **No leaks found.** Every `setInterval` (timestamp tick, omnibox rotation, elapsed timer,
  rate-limit countdown) is cleared in its `useEffect` cleanup.
- **Realtime:** the `subscriptions` channel in [hooks/useSubscription.ts](hooks/useSubscription.ts)
  is correctly `removeChannel()`-ed on unmount.
- `refreshLibrary()` is refresh-heavy but bounded — not an infinite loop.
- **Correction worth flagging:** the `pollUntilDone()` 10 s loop in `services/geminiService.ts`
  downloads from *Gemini* and uploads *into* Supabase — that's **ingress**, not the egress on the
  bill. A max-deadline guard is good hygiene for Vercel/Gemini bandwidth, but it is **not** the
  Supabase egress culprit. Do not chase it for this bill.

## 4. Is any bucket PUBLIC?

**No.** There are no `getPublicUrl()` calls anywhere; all access is `createSignedUrl()` against a
private bucket. Egress is authenticated signed-URL traffic, not open-URL bot hammering.

> **Caveat (dashboard check needed):** the bucket's `public` flag is not set in any committed
> migration or script, so it cannot be 100% verified from code. Confirm in the Supabase dashboard
> (Storage → `gemini-videos` → settings). The dashboard stays reachable while project services
> are 402-restricted.

## 5. Single biggest egress driver (best guess)

**Repeated full-MP4 downloads from the GenerateVideo Rendered Rail** — hover-to-play + autoplay
preview, no virtualization, and signed URLs re-minted on every library refresh so the CDN can't
cache. The 0.22 GB-stored vs ~24 GB-transferred ratio is the fingerprint of re-download. The
server-side final-render input fetch is the likely #2.

---

## Recommended fixes (Phase 2 — pending Neil's go-ahead)

1. **Stop the gallery bleed:** `preload="none"`, drop hover-to-play, click-to-play with a static
   poster; remove `autoPlay` on the preview; virtualize/paginate the rail; debounce
   `refreshLibrary()` and cache signed URLs ~30–60 min so the CDN can serve cached egress; drop
   server `MAX_ITEMS` 100 → ~30.
2. **Real thumbnails:** store a first-frame JPEG poster (KBs) at render time, serve that in the
   gallery, fetch the full MP4 only on explicit play.
3. **Architecture (design only this pass):** move heavy media to Cloudflare R2 (zero egress) with
   Supabase holding metadata + links, *or* make test outputs non-persistent by default. R2 needs
   presigned direct-to-client URLs to keep dodging Vercel's 4.5 MB response cap.
4. **Hygiene:** add a max-deadline to `pollUntilDone()`.
5. **Cleanup script (write, don't run):** `scripts/list-old-storage.mjs` to list old objects for
   review. **Honest caveat:** storage is only 0.22 GB and the cron already reaps — deleting files
   will not lower the egress bill. With services 402-restricted, its Storage API calls may fail
   until quota refills (~June 18) or must be run from the dashboard.
