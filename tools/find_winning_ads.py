#!/usr/bin/env python3
"""Ad Recon: find a competitor brand's WINNING ads in the Meta Ad Library and
emit a ranked shortlist for Viral Autopsy.

One job: brand/advertiser in -> ranked shortlist of Winning Ads out (JSON).
The `ad-recon` skill (.claude/skills/ad-recon/) orchestrates the handoff:
shortlist -> Neil one-click downloads the MP4s -> `viral-autopsy` dissects them.

"Winning" = LONGEVITY, not impressions. Advertisers kill losers fast, so an ad
still ACTIVE after many days is profit-proven. Thresholds: >=30d = winner,
>=60-90d = scaled. (The Ad Library has no "sort by days running", so the pinned
URL sorts by total_impressions as the best-available proxy; THIS tool then
re-ranks the scraped ads by days_active, which is the signal we actually trust.)

Key lesson baked in (2026-06-26 manual slice): search the ADVERTISER, not a
keyword. `q=im8` returns ~3,400 contaminated results; pinning the page
(`search_type=page&view_all_page_id=<id>`) returns only that brand's ads.

Usage:
  # 1) Just print the canonical advertiser-pinned URL (agent scrapes via MCP):
  python tools/find_winning_ads.py --page-id 345914995276546 --print-url

  # 2) Full run via Firecrawl (needs FIRECRAWL_API_KEY in env or .env):
  python tools/find_winning_ads.py --page-id 345914995276546 --top 5 --min-days 30

  # 3) Rank ads the agent already scraped (no network, always works):
  python tools/find_winning_ads.py --from-json scraped.json --top 5 --min-days 30

  --page-id   numeric advertiser Page ID (the `view_all_page_id` in the
              browser URL after you click a brand in the Ad Library)
  --brand     brand name; used only for labelling/slug (resolution to a page-id
              is not automated yet -- paste --page-id from the browser, 5s)
  --country   Ad Library viewing-audience country (default: US; 'ALL' is flaky)
  --top       how many Winning Ads to keep (default: 5)
  --min-days  minimum days-active to count as a winner (default: 30)
  --print-url print the pinned URL and exit
  --from-json rank a pre-scraped ad-records JSON instead of scraping

Output: shortlist JSON on stdout, also written to
  .tmp/ad-recon/<brand-or-pageid>-<date>.json
A human-readable ranked table is printed to stderr.
Exit codes: 0 ok, 1 usage/input error, 2 scrape/API failure,
            3 NO_WINNERS (nothing cleared --min-days, or the scrape was blocked).

Secrets: FIRECRAWL_API_KEY from environment or repo-root .env (never hardcoded).
firecrawl-py self-installs via pip (the cafe-PC defreezer wipes site-packages).
"""

import argparse
import datetime
import importlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT_DIR = REPO_ROOT / ".tmp" / "ad-recon"
AD_LIBRARY_BASE = "https://www.facebook.com/ads/library/"
# The earliest date the Ad Library "Impressions by date" FROM picker offers;
# we leave FROM at this floor and only move TO (start_date[max]).
AD_LIBRARY_DATE_FLOOR = "2019-06-26"

# What we ask the scraper to pull out of each ad card.
SCRAPE_SCHEMA = {
    "type": "object",
    "properties": {
        "page_state": {"type": "string"},
        "result_count_header": {"type": "string"},
        "ads": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "advertiser": {"type": "string"},
                    "library_id": {"type": "string"},
                    "started_running": {"type": "string"},
                    "impressions": {"type": "string"},
                    "low_impression_badge": {"type": "boolean"},
                    "primary_text": {"type": "string"},
                    "media_type": {"type": "string"},
                },
            },
        },
    },
}

SCRAPE_PROMPT = (
    "This is a Meta Ad Library advertiser page (one brand's ads). For EACH ad "
    "card visible, return: advertiser/page name, library_id, the 'Started "
    "running on' date exactly as shown, impressions range if shown, "
    "low_impression_badge true if the ad carries a 'Low Impression Count' "
    "badge, the primary ad text/copy (the caption/headline), and media_type "
    "(video/image/carousel). Also return result_count_header (e.g. '~2,400 "
    "results') and page_state = one of 'results_loaded', 'login_wall', "
    "'captcha', 'no_results'."
)


def fail(code: int, tag: str, message: str):
    print(json.dumps({"error": tag, "message": message}), file=sys.stderr)
    sys.exit(code)


def load_env_key(name: str):
    if os.environ.get(name):
        return os.environ[name]
    env_file = REPO_ROOT / ".env"
    if env_file.is_file():
        for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if line.startswith(f"{name}="):
                return line.split("=", 1)[1].strip().strip("'\"")
    return None


def ensure_package(import_name: str, pip_name: str):
    try:
        return importlib.import_module(import_name)
    except ImportError:
        print(f"[setup] installing {pip_name} (defreezer wiped it?)", file=sys.stderr)
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "--quiet", pip_name],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            fail(2, "DEPENDENCY_INSTALL_FAILED", f"{pip_name}: {result.stderr.strip()[-500:]}")
        return importlib.import_module(import_name)


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", str(text)).strip("-").lower()
    return slug[:60] or "brand"


def build_pinned_url(page_id: str, country: str, media_type: str,
                     started_before: str = "") -> str:
    # Advertiser-pinned (search_type=page), sorted by impressions desc as the
    # best-available high-performer proxy; we re-rank by days_active after.
    url = (
        f"{AD_LIBRARY_BASE}?active_status=active&ad_type=all&country={country}"
        f"&is_targeted_country=false&media_type={media_type}&search_type=page"
        f"&sort_data[direction]=desc&sort_data[mode]=total_impressions"
        f"&view_all_page_id={page_id}"
    )
    # Longevity gate at the SOURCE (2026-06-26 live finding): the Ad Library
    # "Impressions by date: on or before <TO>" filter only returns ads already
    # running by that date. Set TO = today - min_days, leave FROM at the floor,
    # and even ads whose displayed "Started running" date reset on edit still
    # surface here iff they are provably >= min_days old. Far cleaner than
    # trusting the (resettable) displayed date alone.
    if started_before:
        url += (f"&start_date[min]={AD_LIBRARY_DATE_FLOOR}"
                f"&start_date[max]={started_before}")
    return url


def parse_days_active(started_running: str):
    """'Started running on Jun 9, 2026' / 'Jun 9, 2026' -> days since, or None."""
    if not started_running:
        return None
    text = re.sub(r"(?i)^\s*started running on\s*", "", started_running).strip()
    for fmt in ("%b %d, %Y", "%B %d, %Y", "%d %b %Y", "%d %B %Y", "%Y-%m-%d"):
        try:
            d = datetime.datetime.strptime(text, fmt).date()
            return (datetime.date.today() - d).days
        except ValueError:
            continue
    return None


def scrape_via_firecrawl(url: str, api_key: str):
    firecrawl = ensure_package("firecrawl", "firecrawl-py")
    # Support both the current and older client class names.
    Client = getattr(firecrawl, "Firecrawl", None) or getattr(firecrawl, "FirecrawlApp", None)
    if Client is None:
        fail(2, "FIRECRAWL_CLIENT_MISSING", "firecrawl-py present but no Firecrawl/FirecrawlApp class")
    client = Client(api_key=api_key)
    scrape = getattr(client, "scrape", None) or getattr(client, "scrape_url", None)
    if scrape is None:
        fail(2, "FIRECRAWL_API_MISMATCH", "firecrawl client exposes no scrape method")
    try:
        res = scrape(
            url,
            formats=[{"type": "json", "prompt": SCRAPE_PROMPT, "schema": SCRAPE_SCHEMA}],
            only_main_content=True,
            wait_for=14000,
            proxy="stealth",
        )
    except TypeError:
        # Older signature: dict-style params.
        res = scrape(url, params={
            "formats": ["json"],
            "jsonOptions": {"prompt": SCRAPE_PROMPT, "schema": SCRAPE_SCHEMA},
            "waitFor": 14000, "proxy": "stealth",
        })
    except Exception as exc:  # network / API / timeout
        fail(2, "SCRAPE_FAILED", f"firecrawl scrape error: {str(exc)[-400:]}")
    data = res.get("json") if isinstance(res, dict) else getattr(res, "json", None)
    if not data:
        fail(2, "SCRAPE_EMPTY", "scrape returned no structured json (page may be JS-blocked)")
    return data


def rank(ads, top, min_days, trust_membership=False):
    enriched, skipped_low_imp, skipped_no_date = [], 0, 0
    for ad in ads or []:
        if ad.get("low_impression_badge"):
            skipped_low_imp += 1
            continue
        days = parse_days_active(ad.get("started_running", ""))
        if trust_membership:
            # The server-side "on or before" date filter already proved this ad
            # has run >= min_days; the displayed date may read younger (resets on
            # edit), so floor it to min_days rather than drop a real winner.
            if days is None or days < min_days:
                days = min_days
        else:
            if days is None:
                skipped_no_date += 1
                continue
            if days < min_days:
                continue
        permalink = (
            f"{AD_LIBRARY_BASE}?id={ad['library_id']}" if ad.get("library_id") else ""
        )
        enriched.append({
            "advertiser": ad.get("advertiser", ""),
            "library_id": ad.get("library_id", ""),
            "started_running": ad.get("started_running", ""),
            "days_active": days,
            "impressions": ad.get("impressions", ""),
            "media_type": ad.get("media_type", ""),
            "caption": (ad.get("primary_text") or "").strip(),
            "ad_permalink": permalink,
        })
    enriched.sort(key=lambda a: a["days_active"], reverse=True)
    return enriched[:top], {
        "scanned": len(ads or []),
        "skipped_low_impression": skipped_low_imp,
        "skipped_no_date": skipped_no_date,
        "passed_min_days": len(enriched),
    }


def main():
    p = argparse.ArgumentParser(description="Ad Recon: find a brand's Winning Ads.")
    p.add_argument("--page-id")
    p.add_argument("--brand", default="")
    p.add_argument("--country", default="US")
    p.add_argument("--media-type", default="video")
    p.add_argument("--top", type=int, default=5)
    p.add_argument("--min-days", type=int, default=30)
    p.add_argument("--print-url", action="store_true")
    p.add_argument("--from-json", help="rank a pre-scraped ads JSON file instead of scraping")
    p.add_argument("--started-before",
                   help="Ad Library 'Impressions by date' TO value (YYYY-MM-DD). "
                        "Default: today - min_days. The longevity gate, enforced server-side.")
    p.add_argument("--no-date-filter", action="store_true",
                   help="disable the start_date[max] longevity filter (debug / wide scan)")
    p.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR))
    args = p.parse_args()

    if not args.page_id and not args.from_json:
        fail(1, "MISSING_TARGET",
             "Provide --page-id (the view_all_page_id from the browser URL) or --from-json.")

    # The longevity TO date: today - min_days unless overridden / disabled.
    if args.no_date_filter:
        started_before = ""
    elif args.started_before:
        started_before = args.started_before
    else:
        started_before = (
            datetime.date.today() - datetime.timedelta(days=args.min_days)
        ).isoformat()

    if args.page_id and args.print_url:
        print(build_pinned_url(args.page_id, args.country, args.media_type, started_before))
        return

    # Gather raw ad records: from a file, or by scraping.
    if args.from_json:
        try:
            raw = json.loads(Path(args.from_json).read_text(encoding="utf-8"))
        except Exception as exc:
            fail(1, "BAD_INPUT_JSON", f"{args.from_json}: {exc}")
        ads = raw.get("ads") if isinstance(raw, dict) else raw
        page_state = (raw.get("page_state") if isinstance(raw, dict) else "from_json") or "from_json"
        result_header = raw.get("result_count_header", "") if isinstance(raw, dict) else ""
        source_url = raw.get("source_url", "") if isinstance(raw, dict) else ""
    else:
        api_key = load_env_key("FIRECRAWL_API_KEY")
        url = build_pinned_url(args.page_id, args.country, args.media_type, started_before)
        source_url = url
        if not api_key:
            fail(2, "FIRECRAWL_NOT_CONFIGURED",
                 "No FIRECRAWL_API_KEY. Either set it, or scrape this URL with the "
                 "agent's web tools and re-run with --from-json:\n" + url)
        data = scrape_via_firecrawl(url, api_key)
        ads = data.get("ads", [])
        page_state = data.get("page_state", "unknown")
        result_header = data.get("result_count_header", "")

    if page_state in ("login_wall", "captcha"):
        fail(2, "SCRAPE_BLOCKED",
             f"Ad Library returned '{page_state}'. Try the agent's browser/MCP scrape "
             "of the pinned URL, then --from-json. (Catch 2: anti-bot fragility.)")

    # Trust the server-side longevity filter (don't re-drop by displayed date)
    # whenever the scrape came from a date-filtered URL -- auto-detected from the
    # source_url so --from-json inherits it without an extra flag.
    trust_membership = "start_date[max]" in (source_url or "")
    shortlist, stats = rank(ads, args.top, args.min_days, trust_membership=trust_membership)

    label = args.brand or (f"page-{args.page_id}" if args.page_id else "from-json")
    out = {
        "brand": args.brand,
        "page_id": args.page_id or "",
        "country": args.country,
        "source_url": source_url,
        "generated": datetime.date.today().isoformat(),
        "started_before": started_before,
        "result_count_header": result_header,
        "winning_signal": (
            f"longevity: only ads running on/before {started_before} "
            f"(>= {args.min_days}d), impressions tiebreak"
            if trust_membership
            else f"longevity (>= {args.min_days} days active), impressions tiebreak"
        ),
        "stats": stats,
        "shortlist": shortlist,
    }

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{slugify(label)}-{out['generated']}.json"
    out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")

    # Human-readable table -> stderr (stdout stays clean JSON for piping).
    print(f"\nAd Recon: {label}  ({result_header or 'count n/a'})", file=sys.stderr)
    print(f"  scanned {stats['scanned']} | "
          f"dropped low-imp {stats['skipped_low_impression']} | "
          f"no-date {stats['skipped_no_date']} | "
          f">= {args.min_days}d: {stats['passed_min_days']}", file=sys.stderr)
    if not shortlist:
        print("  NO WINNERS cleared the longevity bar (or scrape was partial).", file=sys.stderr)
    for i, a in enumerate(shortlist, 1):
        hook = (a["caption"][:70] + "...") if len(a["caption"]) > 70 else a["caption"]
        print(f"  {i}. {a['days_active']:>4}d  {a['advertiser'][:22]:22}  {a['ad_permalink']}",
              file=sys.stderr)
        print(f"        hook: {hook}", file=sys.stderr)
    print(f"  -> {out_path}", file=sys.stderr)

    print(json.dumps(out, indent=2, ensure_ascii=False))
    if not shortlist:
        sys.exit(3)


if __name__ == "__main__":
    main()
