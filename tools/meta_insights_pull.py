#!/usr/bin/env python3
"""Meta Insights pull — Phase 2a of the Data-Driven Growth Loop (workflows/growth_loop.md).

INGEST-ONLY: reads ad-performance metrics from the Meta Marketing/Insights API and
UPSERTS them into the Supabase `public.ad_performance` table. Neil still publishes and
pauses ads — this tool only reads. Each ad row is joined to the Grifon creative that
produced it via `creative_id`, parsed from the Meta ad name ("grifon-<uuid>").

One job: Meta insights (or a local fixture) -> mapped ad_performance rows -> Supabase.

Usage:
  # No live creds needed — verify the map+write path against a committed fixture:
  python tools/meta_insights_pull.py --fixture tools/fixtures/meta_insights_sample.json --dry-run
  python tools/meta_insights_pull.py --fixture tools/fixtures/meta_insights_sample.json

  # Live (when an ad account + ads_read token exist):
  python tools/meta_insights_pull.py --days 7
  python tools/meta_insights_pull.py --ad-account act_123 --days 30 --dry-run

Output: JSON summary {pulled_at, source, row_count, written} to stdout; [stage] logs to stderr.
Exit codes: 0 ok, 1 usage/config error, 2 API/network error, 3 validation error.

Secrets (from .env or env; NEVER hardcoded, NEVER logged):
  META_AD_ACCOUNT_ID         e.g. act_1234567890   (or pass --ad-account)
  META_INSIGHTS_ACCESS_TOKEN ads_read scope; SERVER-ONLY; different from the Phase-0 CAPI token
  SUPABASE_URL (or VITE_SUPABASE_URL)
  SUPABASE_SERVICE_ROLE_KEY  bypasses RLS; SERVER-ONLY
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
GRAPH_API_VERSION = "v21.0"

# Insights fields we request (the growth_loop.md metrics taxonomy + identifiers).
INSIGHTS_FIELDS = [
    "ad_id", "ad_name", "adset_id", "campaign_id",
    "date_start", "date_stop",
    "impressions", "reach", "frequency", "spend",
    "clicks", "ctr", "cpc", "cpm",
    "inline_link_clicks", "outbound_clicks",
    "actions", "action_values", "purchase_roas",
    "video_3_sec_watched_actions",
    "video_thruplay_watched_actions",
    "video_avg_time_watched_actions",
]

CREATIVE_ID_RE = re.compile(r"grifon-([0-9a-fA-F-]{36})")
PURCHASE_TYPES = {"purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"}


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


# ── parsing helpers ──────────────────────────────────────────────────────────
def _num(value, cast):
    if value is None or value == "":
        return None
    try:
        return cast(value)
    except (TypeError, ValueError):
        return None


def _action_sum(items, types: set[str]):
    """Sum the `value` of entries in a Meta actions/action_values list whose
    action_type is in `types`. Returns None if nothing matched."""
    if not isinstance(items, list):
        return None
    total = 0.0
    hit = False
    for it in items:
        if isinstance(it, dict) and it.get("action_type") in types:
            v = _num(it.get("value"), float)
            if v is not None:
                total += v
                hit = True
    return total if hit else None


def _first_action_value(items, cast=float):
    """Meta returns some video metrics as a single-entry list [{action_type:..,value:..}]."""
    if not isinstance(items, list) or not items:
        return None
    return _num(items[0].get("value"), cast) if isinstance(items[0], dict) else None


def map_row(row: dict) -> dict:
    """Map one Meta insights row to an ad_performance column dict."""
    ad_name = row.get("ad_name")
    creative_id = None
    if ad_name:
        m = CREATIVE_ID_RE.search(ad_name)
        if m:
            creative_id = m.group(1).lower()

    purchases = _action_sum(row.get("actions"), PURCHASE_TYPES)
    purchase_value = _action_sum(row.get("action_values"), PURCHASE_TYPES)
    spend = _num(row.get("spend"), float)

    roas = _first_action_value(row.get("purchase_roas"))
    if roas is None and purchase_value is not None and spend not in (None, 0):
        roas = round(purchase_value / spend, 4)

    cpa = None
    if purchases not in (None, 0) and spend is not None:
        cpa = round(spend / purchases, 4)

    # outbound_clicks is a count → coerce to int so PostgREST never sees a float
    # for the bigint column.
    outbound = _action_sum(row.get("outbound_clicks"), {"outbound_click"})
    if outbound is None:
        outbound = _first_action_value(row.get("outbound_clicks"), int)
    outbound = int(outbound) if outbound is not None else None

    return {
        "creative_id": creative_id,
        "ad_id": row.get("ad_id"),
        "adset_id": row.get("adset_id"),
        "campaign_id": row.get("campaign_id"),
        "ad_name": ad_name,
        "date_start": row.get("date_start"),
        "date_stop": row.get("date_stop"),
        "impressions": _num(row.get("impressions"), int),
        "reach": _num(row.get("reach"), int),
        "frequency": _num(row.get("frequency"), float),
        "spend": spend,
        "clicks": _num(row.get("clicks"), int),
        "ctr": _num(row.get("ctr"), float),
        "cpc": _num(row.get("cpc"), float),
        "cpm": _num(row.get("cpm"), float),
        "link_clicks": _num(row.get("inline_link_clicks"), int),
        "outbound_clicks": outbound,
        "video_3s_views": _first_action_value(row.get("video_3_sec_watched_actions"), int),
        "thruplays": _first_action_value(row.get("video_thruplay_watched_actions"), int),
        "avg_watch_time": _first_action_value(row.get("video_avg_time_watched_actions")),
        "purchases": int(purchases) if purchases is not None else None,
        "purchase_value": purchase_value,
        "roas": roas,
        "cpa": cpa,
        "raw": row,
    }


# ── data sources ─────────────────────────────────────────────────────────────
def load_fixture(path: str) -> list[dict]:
    p = Path(path)
    if not p.is_file():
        fail(1, "FIXTURE_NOT_FOUND", f"no file at {path}")
    try:
        payload = json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(3, "FIXTURE_BAD_JSON", str(exc))
    data = payload.get("data") if isinstance(payload, dict) else payload
    if not isinstance(data, list):
        fail(3, "FIXTURE_SHAPE", "expected a Meta insights response with a top-level `data` array")
    return data


def pull_insights(ad_account: str, token: str, days: int) -> list[dict]:
    """GET the ad-level daily insights for the last `days` days, following paging."""
    until = date.today()
    since = until - timedelta(days=max(1, days))
    params = {
        "level": "ad",
        "time_increment": "1",  # one row per ad per day -> matches unique(ad_id, date_start)
        "time_range": json.dumps({"since": since.isoformat(), "until": until.isoformat()}),
        "fields": ",".join(INSIGHTS_FIELDS),
        "limit": "200",
        "access_token": token,
    }
    base = f"https://graph.facebook.com/{GRAPH_API_VERSION}/{ad_account}/insights"
    url = f"{base}?{urllib.parse.urlencode(params)}"
    rows: list[dict] = []
    page = 0
    while url:
        page += 1
        print(f"[pull] page {page} (collected {len(rows)})", file=sys.stderr)
        try:
            with urllib.request.urlopen(url, timeout=60) as resp:
                body = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            # Read Meta's error body but never echo the URL (it carries the token).
            detail = exc.read().decode("utf-8", "replace")[:500] if exc.fp else str(exc.code)
            fail(2, "META_API_ERROR", f"HTTP {exc.code}: {detail}")
        except urllib.error.URLError as exc:
            fail(2, "META_NETWORK_ERROR", str(exc.reason))
        rows.extend(body.get("data", []))
        url = (body.get("paging") or {}).get("next")
    return rows


def upsert_rows(sb_url: str, sb_key: str, rows: list[dict]) -> int:
    """Upsert mapped rows into public.ad_performance on (ad_id, date_start)."""
    endpoint = f"{sb_url.rstrip('/')}/rest/v1/ad_performance?on_conflict=ad_id,date_start"
    payload = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(endpoint, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("apikey", sb_key)
    req.add_header("Authorization", f"Bearer {sb_key}")
    req.add_header("Prefer", "resolution=merge-duplicates,return=minimal")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            resp.read()
            return len(rows)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:500] if exc.fp else str(exc.code)
        fail(2, "SUPABASE_WRITE_ERROR", f"HTTP {exc.code}: {detail}")
    except urllib.error.URLError as exc:
        fail(2, "SUPABASE_NETWORK_ERROR", str(exc.reason))


def main() -> None:
    parser = argparse.ArgumentParser(description="Meta Insights -> public.ad_performance")
    parser.add_argument("--ad-account", help="Meta ad account id (act_...); else META_AD_ACCOUNT_ID")
    parser.add_argument("--days", type=int, default=7, help="lookback window in days (default 7)")
    parser.add_argument("--fixture", help="read a local Meta insights JSON instead of calling Meta")
    parser.add_argument("--dry-run", action="store_true", help="print mapped rows; do NOT write")
    args = parser.parse_args()

    # 1) Source rows: fixture (no creds) or live Meta pull.
    if args.fixture:
        print(f"[source] fixture {args.fixture}", file=sys.stderr)
        raw_rows = load_fixture(args.fixture)
        source = "fixture"
    else:
        ad_account = args.ad_account or load_env_key("META_AD_ACCOUNT_ID")
        token = load_env_key("META_INSIGHTS_ACCESS_TOKEN")
        if not ad_account or not token:
            fail(1, "SECRETS_NOT_CONFIGURED",
                 "set META_AD_ACCOUNT_ID (or --ad-account) and META_INSIGHTS_ACCESS_TOKEN "
                 "(ads_read scope) in .env, or use --fixture for a no-creds dry run.")
        if not re.fullmatch(r"act_\d+", ad_account):
            fail(1, "BAD_AD_ACCOUNT", f"expected act_<digits>, got {ad_account!r}")
        print(f"[source] meta live (account={ad_account}, days={args.days})", file=sys.stderr)
        raw_rows = pull_insights(ad_account, token, args.days)
        source = "meta"

    # 2) Map -> ad_performance shape. Drop rows missing the required keys.
    mapped, skipped = [], 0
    for r in raw_rows:
        m = map_row(r)
        if not m.get("ad_id") or not m.get("date_start"):
            skipped += 1
            continue
        mapped.append(m)
    if skipped:
        print(f"[map] skipped {skipped} row(s) missing ad_id/date_start", file=sys.stderr)

    written = 0
    if args.dry_run:
        print(f"[dry-run] {len(mapped)} row(s) mapped, not written", file=sys.stderr)
    else:
        sb_url = load_env_key("SUPABASE_URL") or load_env_key("VITE_SUPABASE_URL")
        sb_key = load_env_key("SUPABASE_SERVICE_ROLE_KEY")
        if not sb_url or not sb_key:
            fail(1, "SECRETS_NOT_CONFIGURED",
                 "set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.")
        if mapped:
            print(f"[write] upserting {len(mapped)} row(s) into ad_performance", file=sys.stderr)
            written = upsert_rows(sb_url, sb_key, mapped)
        else:
            print("[write] nothing to write", file=sys.stderr)

    summary = {
        "source": source,
        "row_count": len(mapped),
        "written": written,
        "dry_run": bool(args.dry_run),
    }
    # Only dump the full mapped rows (which embed Meta's raw response) on a
    # dry run; live writes print just the summary to keep logs lean.
    out = {"summary": summary}
    if args.dry_run:
        out["rows"] = mapped
    print(json.dumps(out, indent=2, ensure_ascii=False, default=str))
    print(f"[done] {summary}", file=sys.stderr)


if __name__ == "__main__":
    main()
