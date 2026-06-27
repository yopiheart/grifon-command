#!/usr/bin/env python3
"""Growth-debrief pull — Phase 2b of the Data-Driven Growth Loop (workflows/growth_loop.md).

READ-ONLY: fetches the three growth-loop sinks from Supabase and shapes them into ONE
consolidated JSON that the `growth-debrief` skill reasons over to write a ranked
"why it won / why it failed" debrief. This tool does deterministic aggregation only
(the WAT split: tool = math, skill = judgment). It never writes anything and never
edits a TUNED prompt — it is the read half of the ingest-only loop.

Three sources (all service-role-only tables; see supabase/*.sql):
  - public.ad_performance  -> per-creative ad rollups (spend/CTR/CVR/ROAS/frequency)
  - public.events          -> funnel counts + checkout-abandon (InitiateCheckout w/o Purchase)
  - public.feedback        -> NPS summary + free-text

One job: Supabase (or a local fixture) -> aggregated debrief-input JSON -> stdout.

Usage:
  # No live creds needed — verify the aggregation against a committed fixture:
  python tools/growth_debrief_pull.py --fixture tools/fixtures/growth_debrief_sample.json

  # Live (when the Supabase service role is configured in .env):
  python tools/growth_debrief_pull.py --days 30
  python tools/growth_debrief_pull.py --days 7 --out .tmp/growth/debrief_input.json

Output: one JSON object {window, source, ad_performance, funnel, feedback} to stdout
(or --out file); [stage] logs to stderr.
Exit codes: 0 ok, 1 usage/config error, 2 API/network error, 3 validation error.

Secrets (from .env or env; NEVER hardcoded, NEVER logged):
  SUPABASE_URL (or VITE_SUPABASE_URL)
  SUPABASE_SERVICE_ROLE_KEY   bypasses RLS; SERVER-ONLY
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Canonical funnel order (matches the Phase-0 client pixel + metaCapi events).
FUNNEL_ORDER = ["PageView", "ViewContent", "Lead", "InitiateCheckout", "Purchase"]


def fail(code: int, label: str, detail: str) -> None:
    print(f"{label}: {detail}", file=sys.stderr)
    sys.exit(code)


def load_env_key(name: str) -> str | None:
    if os.environ.get(name):
        return os.environ[name]
    env_file = REPO_ROOT / ".env"
    if env_file.is_file():
        for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if line.startswith(f"{name}="):
                return line.split("=", 1)[1].strip().strip("'\"")
    return None


# ── numeric helpers ───────────────────────────────────────────────────────────
def _num(value, cast):
    if value is None or value == "":
        return None
    try:
        return cast(value)
    except (TypeError, ValueError):
        return None


def _add(acc: dict, key: str, value, cast=float):
    """Accumulate a nullable numeric into acc[key] (None stays None until a real value)."""
    v = _num(value, cast)
    if v is None:
        return
    acc[key] = (acc.get(key) or 0) + v


def _ratio(num, den, places=4):
    if num is None or not den:
        return None
    return round(num / den, places)


# ── data sources ───────────────────────────────────────────────────────────────
def _get(url: str, key: str, label: str) -> list:
    """GET a PostgREST collection on the service role. Returns the decoded JSON list."""
    req = urllib.request.Request(url, method="GET")
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        # Read PostgREST's error body but never echo the URL (carries no token here,
        # but the apikey header would leak in a verbose trace — keep it tight).
        detail = exc.read().decode("utf-8", "replace")[:500] if exc.fp else str(exc.code)
        fail(2, "SUPABASE_READ_ERROR", f"{label}: HTTP {exc.code}: {detail}")
    except urllib.error.URLError as exc:
        fail(2, "SUPABASE_NETWORK_ERROR", f"{label}: {exc.reason}")
    if not isinstance(body, list):
        fail(3, "SUPABASE_SHAPE", f"{label}: expected a JSON array, got {type(body).__name__}")
    return body


def fetch_supabase(sb_url: str, sb_key: str, since: str) -> dict:
    """Pull the three sinks since `since` (date for ad_performance, timestamp for the rest)."""
    base = sb_url.rstrip("/") + "/rest/v1"
    # PostgREST caps page size; 10000 is generous for a single-tenant growth window.
    rows = {}
    print("[read] ad_performance", file=sys.stderr)
    rows["ad_performance"] = _get(
        f"{base}/ad_performance?date_start=gte.{since}&order=date_start.desc&limit=10000",
        sb_key, "ad_performance")
    print("[read] events", file=sys.stderr)
    rows["events"] = _get(
        f"{base}/events?ts=gte.{since}T00:00:00Z&order=ts.desc&limit=50000",
        sb_key, "events")
    print("[read] feedback", file=sys.stderr)
    rows["feedback"] = _get(
        f"{base}/feedback?ts=gte.{since}T00:00:00Z&order=ts.desc&limit=10000",
        sb_key, "feedback")
    return rows


def load_fixture(path: str) -> dict:
    p = Path(path)
    if not p.is_file():
        fail(1, "FIXTURE_NOT_FOUND", f"no file at {path}")
    try:
        payload = json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(3, "FIXTURE_BAD_JSON", str(exc))
    if not isinstance(payload, dict):
        fail(3, "FIXTURE_SHAPE", "expected an object with ad_performance/events/feedback arrays")
    out = {}
    for table in ("ad_performance", "events", "feedback"):
        data = payload.get(table, [])
        if not isinstance(data, list):
            fail(3, "FIXTURE_SHAPE", f"`{table}` must be an array")
        out[table] = data
    return out


# ── aggregation (deterministic; the skill owns the judgment) ────────────────────
def aggregate_ads(rows: list) -> dict:
    """Roll ad_performance rows up per creative_id (the Grifon render that made the ad).
    Untagged ads (organic / non-Grifon) bucket under creative_id=None as '(untagged)'."""
    buckets: dict = {}
    for r in rows:
        cid = r.get("creative_id") or "(untagged)"
        b = buckets.setdefault(cid, {
            "creative_id": None if cid == "(untagged)" else cid,
            "ad_ids": set(), "days": set(),
        })
        if r.get("ad_id"):
            b["ad_ids"].add(r["ad_id"])
        if r.get("date_start"):
            b["days"].add(r["date_start"])
        _add(b, "spend", r.get("spend"))
        _add(b, "impressions", r.get("impressions"), int)
        _add(b, "reach", r.get("reach"), int)
        _add(b, "clicks", r.get("clicks"), int)
        _add(b, "link_clicks", r.get("link_clicks"), int)
        _add(b, "purchases", r.get("purchases"), int)
        _add(b, "purchase_value", r.get("purchase_value"))
        _add(b, "video_3s_views", r.get("video_3s_views"), int)
        _add(b, "thruplays", r.get("thruplays"), int)
        # Frequency is a point-in-time ratio, not additive — keep the max (fatigue proxy).
        f = _num(r.get("frequency"), float)
        if f is not None:
            b["frequency_max"] = max(b.get("frequency_max", 0.0), f)

    out = []
    for b in buckets.values():
        impressions = b.get("impressions")
        spend = b.get("spend")
        purchases = b.get("purchases")
        link_clicks = b.get("link_clicks")
        # Derived rates from summed totals (more honest than averaging per-row rates).
        ctr = _ratio((link_clicks or b.get("clicks") or 0) * 100, impressions, 4) if impressions else None
        hook_rate = _ratio((b.get("video_3s_views") or 0) * 100, impressions, 4) if impressions else None
        hold_rate = _ratio((b.get("thruplays") or 0) * 100, b.get("video_3s_views"), 4)
        roas = _ratio(b.get("purchase_value"), spend, 4)
        cpa = _ratio(spend, purchases, 4)
        # CVR proxy: purchases per outbound interest (link clicks). Real LP-view CVR
        # needs the events funnel; this is the ad-side proxy.
        cvr_clicks = _ratio((purchases or 0) * 100, link_clicks, 4) if link_clicks else None
        out.append({
            "creative_id": b["creative_id"],
            "ad_count": len(b["ad_ids"]),
            "days_active": len(b["days"]),
            "spend": round(spend, 2) if spend is not None else None,
            "impressions": int(impressions) if impressions is not None else None,
            "link_clicks": int(link_clicks) if link_clicks is not None else None,
            "purchases": int(purchases) if purchases is not None else None,
            "purchase_value": round(b["purchase_value"], 2) if b.get("purchase_value") is not None else None,
            "ctr_pct": ctr,
            "hook_rate_pct": hook_rate,
            "hold_rate_pct": hold_rate,
            "cvr_click_pct": cvr_clicks,
            "roas": roas,
            "cpa": cpa,
            "frequency_max": round(b["frequency_max"], 3) if "frequency_max" in b else None,
        })
    # Spend-desc so the biggest bets surface first.
    out.sort(key=lambda x: (x["spend"] or 0), reverse=True)

    totals = {
        "spend": round(sum(a["spend"] or 0 for a in out), 2),
        "purchases": sum(a["purchases"] or 0 for a in out),
        "purchase_value": round(sum(a["purchase_value"] or 0 for a in out), 2),
        "tagged_creatives": sum(1 for a in out if a["creative_id"]),
    }
    totals["blended_roas"] = _ratio(totals["purchase_value"], totals["spend"], 4)
    return {"row_count": len(rows), "by_creative": out, "totals": totals}


def aggregate_funnel(rows: list) -> dict:
    counts: dict = {}
    by_module: dict = {}
    for r in rows:
        ev = r.get("event")
        if ev:
            counts[ev] = counts.get(ev, 0) + 1
        mod = r.get("module")
        if mod:
            by_module[mod] = by_module.get(mod, 0) + 1
    initiate = counts.get("InitiateCheckout", 0)
    purchase = counts.get("Purchase", 0)
    abandon = {
        "initiate_checkout": initiate,
        "purchase": purchase,
        "abandoned": max(0, initiate - purchase),
        "abandon_rate_pct": _ratio((initiate - purchase) * 100, initiate, 2) if initiate else None,
    }
    # Step-to-step conversion along the canonical funnel (skips absent stages).
    steps = []
    prev_name, prev_n = None, None
    for name in FUNNEL_ORDER:
        n = counts.get(name)
        if n is None:
            continue
        steps.append({
            "stage": name, "count": n,
            "from_prev_pct": _ratio(n * 100, prev_n, 2) if prev_n else None,
            "prev_stage": prev_name,
        })
        prev_name, prev_n = name, n
    return {
        "row_count": len(rows),
        "event_counts": counts,
        "funnel_steps": steps,
        "checkout_abandon": abandon,
        "by_module": dict(sorted(by_module.items(), key=lambda kv: kv[1], reverse=True)),
    }


def aggregate_feedback(rows: list) -> dict:
    promoters = passives = detractors = 0
    scored = 0
    free_text = []
    for r in rows:
        s = _num(r.get("nps_score"), int)
        if s is not None:
            scored += 1
            if s >= 9:
                promoters += 1
            elif s >= 7:
                passives += 1
            else:
                detractors += 1
        txt = (r.get("free_text") or "").strip()
        if txt:
            free_text.append({
                "nps_score": s,
                "module": r.get("module"),
                "text": txt,
            })
    nps = None
    if scored:
        nps = round((promoters - detractors) * 100 / scored)  # standard NPS, -100..100
    return {
        "row_count": len(rows),
        "nps": nps,
        "scored_responses": scored,
        "promoters": promoters,
        "passives": passives,
        "detractors": detractors,
        "free_text": free_text,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="growth-loop sinks -> consolidated debrief input")
    parser.add_argument("--days", type=int, default=30, help="lookback window in days (default 30)")
    parser.add_argument("--fixture", help="read a local JSON {ad_performance,events,feedback} instead of Supabase")
    parser.add_argument("--out", help="write the JSON here instead of stdout")
    args = parser.parse_args()

    since = (date.today() - timedelta(days=max(1, args.days))).isoformat()

    if args.fixture:
        print(f"[source] fixture {args.fixture}", file=sys.stderr)
        rows = load_fixture(args.fixture)
        source = "fixture"
    else:
        sb_url = load_env_key("SUPABASE_URL") or load_env_key("VITE_SUPABASE_URL")
        sb_key = load_env_key("SUPABASE_SERVICE_ROLE_KEY")
        if not sb_url or not sb_key:
            fail(1, "SECRETS_NOT_CONFIGURED",
                 "set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env, "
                 "or use --fixture for a no-creds run.")
        print(f"[source] supabase (since={since})", file=sys.stderr)
        rows = fetch_supabase(sb_url, sb_key, since)
        source = "supabase"

    debrief = {
        "window": {"since": since, "until": date.today().isoformat(), "days": args.days},
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "ad_performance": aggregate_ads(rows["ad_performance"]),
        "funnel": aggregate_funnel(rows["events"]),
        "feedback": aggregate_feedback(rows["feedback"]),
    }

    payload = json.dumps(debrief, indent=2, ensure_ascii=False, default=str)
    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(payload, encoding="utf-8")
        print(f"[done] wrote {args.out}", file=sys.stderr)
    else:
        print(payload)
    print(f"[done] source={source} ads={debrief['ad_performance']['row_count']} "
          f"events={debrief['funnel']['row_count']} feedback={debrief['feedback']['row_count']}",
          file=sys.stderr)


if __name__ == "__main__":
    main()
