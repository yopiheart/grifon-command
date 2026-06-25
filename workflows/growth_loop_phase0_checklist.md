# Growth Loop — Phase 0 Build Checklist (plug-and-play)

> **What this is:** the one-sitting build sheet for **Phase 0** of [`growth_loop.md`](growth_loop.md)
> — give Grifon eyes via Meta Pixel + server-side Purchase CAPI + an in-app `events` telemetry table,
> shipped as **one thin vertical slice** (pixel + Purchase CAPI + one telemetry event end-to-end).
> Prepped 2026-06-24 (mobile) so the PC-cafe session is plug-and-play. Branch:
> `claude/data-feedback-loop-ads-app-yqqyer`.

---

## 0. Before you sit down (gather on mobile — Neil's task)

These are the only true blockers. Nothing fires without them.

- [x] **Meta Pixel ID** — `1921429268517231` (created 2026-06-24, dataset "Grifon Pixel" under
      business "Zam Grifon - Personal Brand", id 2055039121369832). **Not secret** — public client-side
      ID → `VITE_META_PIXEL_ID`. Business confirmed correct for Grifon (personal-brand account that
      runs the UGC/content promoting the Grifon app).
- [x] **CAPI access token** — generated 2026-06-24 (direct integration, Dataset Quality API, scoped to
      the Grifon Pixel dataset only). **Server-only secret — lives in `.env` + Vercel env, never
      committed/chatted.** → `META_CAPI_ACCESS_TOKEN`.
- [ ] **Test Event Code** (optional but recommended) — Events Manager → *Test Events* tab → copy the
      `TEST#####` code. Lets us watch `Lead`/`Purchase` land live during the smoke test.

Drop the Pixel ID to me in chat (it's not secret). Hand the token + test code straight into `.env`
on the PC — don't paste them here.

---

## 1. Env vars to add (PC: `.env` locally + Vercel project env)

| Name | Where | Notes |
|---|---|---|
| `VITE_META_PIXEL_ID` | client (bundled) | `1921429268517231` — Pixel ID for the browser snippet |
| `META_PIXEL_ID` | server (no prefix) | `1921429268517231` — same ID, read by `api/_lib/metaCapi.ts` |
| `META_CAPI_ACCESS_TOKEN` | server (no prefix) | **secret** — server-only, CAPI auth |
| `META_CAPI_TEST_EVENT_CODE` | server (no prefix) | optional — only set while testing, remove for prod |

Dev note: `vercelApiDevPlugin` reads all `.env` keys into `process.env`, so the server handlers see the
unprefixed secrets in `npm run dev` exactly as on Vercel (see CLAUDE.md → Dev Commands).

---

## 2. The vertical slice (build in this order — one feature through every layer)

- [ ] **DB:** apply [`supabase/events.sql`](../supabase/events.sql) (Supabase SQL editor, or the
      Supabase MCP `apply_migration`). Already written + idempotent — just run it. Telemetry sink is
      **service-role-only** (RLS on, no policies — like `rate_limits`, *not* user-owned).
- [ ] **Server CAPI helper:** new `api/_lib/metaCapi.ts` — posts a Conversions API event (access token
      **server-only**, never bundled). Small, single-purpose; matches the `api/_lib` proxy style.
- [ ] **Purchase via CAPI:** wire a server `Purchase` into **`api/webhook.ts`** (the PayMongo webhook —
      already authoritative on payment). **Reuse the existing event-claim/dedup pattern** so a retried
      webhook doesn't double-count, and so the pixel's browser-side `Purchase` and the server `Purchase`
      dedup on the same `event_id`.
- [ ] **Client pixel:** base pixel snippet (`PageView`) + **one** funnel event end-to-end — pick the
      cheapest real signal (`Lead` on signup, or `InitiateCheckout` when checkout opens). Gate behind
      consent (step 3).
- [ ] **Telemetry service + endpoint:** new `services/analyticsService.ts` (mirror
      `recentWorkService.ts`) that POSTs to a tiny `api/events` handler writing on the **service role**
      (do NOT write to `events` directly from the client — keep it server-side, consistent with the
      app's "all writes via `api/`" architecture). Emit **one** real event (e.g. a wizard-step row) to
      prove the path.
- [ ] **Consent surface:** minimal cookie/consent note before the pixel fires. Must use DESIGN.md
      tokens (`bg-zinc-950`, Grifon Gold `#FFCC00`, `GlassPanel`/`GoldButton`, lucide icons).

> Keep it to **one** event per layer. Full event taxonomy is later-phase scope creep (see
> `growth_loop.md` Phase 1 note). Touch tuned files in `services/geminiService.ts` / `api/_lib/prompts.ts`
> — you won't need to here, and they're off-limits without Neil's sign-off.

---

## 3. Verification (from growth_loop.md → Verification → Phase 0)

- [ ] Test signup → **`Lead`** shows in Meta **Test Events**.
- [ ] PayMongo **test** payment → server **`Purchase`** via CAPI, **deduped** against the pixel.
- [ ] Query `public.events` → the wizard-step row is there.
- [ ] Run **`verify-changes`** (build-gate + tests + smoke).
- [ ] Run **`straw-man-audit`** on the new `api/_lib/metaCapi.ts` + `api/events` + consent surface
      (token-leak, anon-write, dedup/replay on the webhook path).
- [ ] Run **`brand-check`** on the consent surface.
- [ ] Smoke via the **`smoke-tester`** subagent (foreground) — pixel fires after consent, event lands.

Touches `api/` + `components/` → this is a **`/goal`-eligible** build, not direct execution.

---

## 4. Ready-to-fire `/goal` (paste after the plan is approved tomorrow)

> Per CLAUDE.md Plan→Goal pipeline: approve the plan first, then approve this goal. Edit as needed.

```
/goal Phase 0 of growth_loop.md is shipped as one vertical slice on branch
claude/data-feedback-loop-ads-app-yqqyer — supabase/events.sql applied, api/_lib/metaCapi.ts +
a server Purchase in api/webhook.ts (reusing the event-claim dedup), a consent-gated client
pixel firing PageView + one funnel event, and services/analyticsService.ts emitting one
wizard-step row via a service-role api/events handler — verified by: the build-gate Stop hook
reporting its pass message, verify-changes passing build+tests+smoke, straw-man-audit returning
no Critical findings on the new api/ + consent surface, and brand-check clean on the consent UI,
with NO edits to services/geminiService.ts or api/_lib/prompts.ts, OR stop after 20 turns.
```

---

## 5. Secret hygiene (cafe PC + defreezer)

- Secrets live in `.env` (gitignored) + Vercel env **only** — never in the repo, never in chat.
- The defreezer wipes the PC on reboot, so re-add `.env` each session (or keep them in Vercel and pull).
- Remove `META_CAPI_TEST_EVENT_CODE` from prod env once the smoke test passes.

---

*Next file after Phase 0 lands: `growth_loop.md` → Phase 1 (client feedback loop).*
