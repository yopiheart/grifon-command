#!/usr/bin/env python3
"""Ad Recon: find a competitor brand's WINNING ads in the Meta Ad Library and
emit a ranked shortlist for Viral Autopsy.

One job: brand/advertiser in -> ranked shortlist of Winning Ads out (JSON).
The `ad-recon` skill (.claude/skills/ad-recon/) orchestrates the handoff:
shortlist -> Neil one-click downloads the MP4s -> `viral-autopsy` dissects them.

The shortlist contains research candidates, not profit-proven winners. Age is
elapsed time from the displayed start date to the recorded observation; it
does not establish continuous delivery, spend, sales, or profitability. Source
filter membership never supplies a missing date or increases an ad's age.
Reviewed collection metadata is separate from the unchanged scraper schema.

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
  --top       how many research candidates to keep (default: 5)
  --min-days  minimum displayed age for the shortlist (default: 30)
  --print-url print the pinned URL and exit
  --from-json rank a pre-scraped ad-records JSON instead of scraping

Output: shortlist JSON on stdout, also written to
  .tmp/ad-recon/<brand-or-pageid>-<date>.json
A human-readable ranked table is printed to stderr.
Exit codes: 0 ok, 1 usage/input error, 2 scrape/API failure,
            3 NO_CANDIDATES (no eligible references in the collected subset).

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
from urllib.parse import parse_qs, urlparse

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
    # Advertiser-pinned discovery, using Meta's requested display order.
    # Neither this order nor an impression range proves performance.
    url = (
        f"{AD_LIBRARY_BASE}?active_status=active&ad_type=all&country={country}"
        f"&is_targeted_country=false&media_type={media_type}&search_type=page"
        f"&sort_data[direction]=desc&sort_data[mode]=total_impressions"
        f"&view_all_page_id={page_id}"
    )
    # This filter narrows discovery only. Its membership does not establish an
    # individual ad's age; ranking requires a displayed date and observation.
    if started_before:
        url += (f"&start_date[min]={AD_LIBRARY_DATE_FLOOR}"
                f"&start_date[max]={started_before}")
    return url


def parse_days_active(started_running: str, observed_on=None):
    """'Started running on Jun 9, 2026' / 'Jun 9, 2026' -> days since, or None."""
    if not started_running:
        return None
    text = re.sub(r"(?i)^\s*started running on\s*", "", started_running).strip()
    for fmt in ("%b %d, %Y", "%B %d, %Y", "%d %b %Y", "%d %B %Y", "%Y-%m-%d"):
        try:
            d = datetime.datetime.strptime(text, fmt).date()
            return ((observed_on or datetime.date.today()) - d).days
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


def numeric_id(value):
    return isinstance(value, str) and re.fullmatch(r"[1-9][0-9]{0,31}", value) is not None


def library_query(value):
    """Validate a Meta source URL without fetching or certifying its contents."""
    if not isinstance(value, str):
        raise ValueError("source URL must be a string")
    url = urlparse(value)
    if (url.scheme != "https" or url.hostname not in ("facebook.com", "www.facebook.com")
            or url.username or url.password or url.port or url.fragment
            or url.path.rstrip("/") != "/ads/library"):
        raise ValueError("source must be an HTTPS Meta Ad Library URL")
    query = parse_qs(url.query, keep_blank_values=True)
    if any(len(values) != 1 for values in query.values()):
        raise ValueError("ambiguous duplicate source URL parameters")
    return {key: values[0] for key, values in query.items()}


def observation_time(value):
    if not isinstance(value, str):
        raise ValueError("observed_at must be an ISO timestamp with timezone")
    try:
        timestamp = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("invalid observed_at timestamp") from exc
    if timestamp.tzinfo is None:
        raise ValueError("observed_at requires a timezone")
    if timestamp > datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=5):
        raise ValueError("observed_at cannot be in the future")
    return timestamp


def reviewed_collection(value, requested_page_id=None):
    """Operator-recorded provenance; validation does not verify the operator."""
    if value is None:
        return {"status": "unknown", "limitations": ["No reviewed collection metadata."]}
    if not isinstance(value, dict):
        raise ValueError("collection must be an object")
    status = value.get("status", "unknown")
    if status not in ("complete", "partial", "blocked", "unknown"):
        raise ValueError("invalid collection status")
    page_id = value.get("page_id")
    if not numeric_id(page_id) or (requested_page_id and requested_page_id != page_id):
        raise ValueError("collection Page ID missing, invalid, or different from --page-id")
    query = library_query(value.get("source_url"))
    if query.get("search_type") != "page" or query.get("view_all_page_id") != page_id:
        raise ValueError("collection source must be pinned to the reviewed Page ID")
    timestamp = observation_time(value.get("observed_at"))
    advertiser = value.get("advertiser", "")
    method = value.get("method", "")
    limitations = value.get("limitations", [])
    if not isinstance(advertiser, str) or not advertiser.strip() or len(advertiser) > 200:
        raise ValueError("reviewed advertiser name is required")
    if not isinstance(method, str) or not method.strip() or len(method) > 1000:
        raise ValueError("collection method is required")
    if (not isinstance(limitations, list) or len(limitations) > 30
            or any(not isinstance(x, str) or not x.strip() or len(x) > 2000 for x in limitations)):
        raise ValueError("invalid collection limitations")
    identity_evidence = value.get("identity_evidence", "")
    if status in ("complete", "partial"):
        identity_query = library_query(value.get("identity_source_url"))
        if identity_query.get("view_all_page_id") != page_id:
            raise ValueError("identity source must identify the same Page")
        if value.get("identity_reviewed") is not True or not isinstance(identity_evidence, str) or not identity_evidence.strip():
            raise ValueError("eligible collections need a recorded identity review")
    completion = value.get("completion_evidence", "")
    if status == "complete" and (not isinstance(completion, str) or not completion.strip()):
        raise ValueError("complete collection requires recorded termination/coverage evidence")
    if status != "complete" and not limitations:
        raise ValueError("incomplete collection requires limitations")
    return {"status": status, "page_id": page_id, "advertiser": advertiser.strip(),
            "observed_at": timestamp.isoformat(), "source_url": value["source_url"],
            "identity_source_url": value.get("identity_source_url", ""),
            "identity_reviewed": value.get("identity_reviewed") is True,
            "identity_evidence": identity_evidence, "method": method,
            "limitations": limitations, "completion_evidence": completion}


def rank(ads, top, min_days, trust_membership=False, collection=None):
    # Kept for older callers, deliberately ignored: URL membership is not age.
    del trust_membership
    if not 1 <= top <= 100 or not 0 <= min_days <= 3650:
        raise ValueError("top must be 1..100 and min_days must be 0..3650")
    if not isinstance(ads, list) or len(ads) > 10000:
        raise ValueError("ads must be a bounded list")
    collection = reviewed_collection(collection)
    eligible_collection = collection["status"] in ("complete", "partial")
    observed_on = observation_time(collection["observed_at"]).date() if "observed_at" in collection else None
    counts = {}
    for ad in ads:
        if isinstance(ad, dict) and numeric_id(ad.get("library_id")):
            key = ad["library_id"]
            counts[key] = counts.get(key, 0) + 1
    enriched, excluded = [], []
    for index, ad in enumerate(ads):
        reasons = []
        if not isinstance(ad, dict):
            excluded.append({"index": index, "library_id": "", "reasons": ["invalid_record"]})
            continue
        library_id = ad.get("library_id", "")
        if not numeric_id(library_id):
            reasons.append("invalid_library_id")
        elif counts[library_id] > 1:
            reasons.append("duplicate_library_id")
        if not eligible_collection:
            reasons.append("collection_not_reviewable")
        advertiser = ad.get("advertiser", "")
        if not isinstance(advertiser, str) or advertiser.strip().casefold() != collection.get("advertiser", "").casefold():
            reasons.append("advertiser_mismatch")
        if ad.get("page_id") != collection.get("page_id") or not numeric_id(ad.get("page_id")):
            reasons.append("page_id_not_confirmed")
        if ad.get("activity") != "active":
            reasons.append("activity_not_active")
        start = ad.get("started_running", "")
        days = parse_days_active(start, observed_on) if isinstance(start, str) and observed_on else None
        if days is None:
            reasons.append("missing_or_invalid_date")
        elif days < 0:
            reasons.append("future_start_date")
        elif days < min_days:
            reasons.append("below_min_days")
        if ad.get("low_impression_badge"):
            reasons.append("low_impression_badge")
        if ad.get("ad_permalink"):
            try:
                if library_query(ad["ad_permalink"]).get("id") != library_id:
                    reasons.append("permalink_id_mismatch")
            except ValueError:
                reasons.append("invalid_permalink")
        if reasons:
            excluded.append({"index": index, "library_id": library_id if numeric_id(library_id) else "",
                             "reasons": reasons})
            continue
        enriched.append({
            "advertiser": advertiser.strip(), "page_id": ad["page_id"], "library_id": library_id,
            "started_running": start, "elapsed_days_since_displayed_start": days,
            "activity": "active", "observed_at": collection["observed_at"],
            "impressions": str(ad.get("impressions", ""))[:200],
            "media_type": str(ad.get("media_type", ""))[:50],
            "caption": str(ad.get("primary_text") or "").strip()[:10000],
            "ad_permalink": f"{AD_LIBRARY_BASE}?id={library_id}",
        })
    enriched.sort(key=lambda a: (-a["elapsed_days_since_displayed_start"], a["library_id"]))
    return enriched[:top], {"scanned": len(ads), "eligible_in_collected_subset": len(enriched),
                              "excluded": excluded, "collection": collection}


def main():
    p = argparse.ArgumentParser(description="Ad Recon: shortlist sourced research candidates.")
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
                        "Default: today - min_days. Discovery filter only; not proof of age.")
    p.add_argument("--no-date-filter", action="store_true",
                   help="disable the start_date[max] longevity filter (debug / wide scan)")
    p.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR))
    args = p.parse_args()

    if args.page_id and not numeric_id(args.page_id):
        fail(1, "INVALID_PAGE_ID", "--page-id must contain only digits (1..32).")
    if not 1 <= args.top <= 100 or not 0 <= args.min_days <= 3650:
        fail(1, "INVALID_BOUNDS", "--top must be 1..100 and --min-days 0..3650.")
    if not re.fullmatch(r"ALL|[A-Z]{2}", args.country) or args.media_type not in ("all", "video", "image", "meme"):
        fail(1, "INVALID_FILTER", "Invalid country or media-type.")

    if not args.page_id and not args.from_json:
        fail(1, "MISSING_TARGET",
             "Provide --page-id (the view_all_page_id from the browser URL) or --from-json.")

    # The longevity TO date: today - min_days unless overridden / disabled.
    if args.no_date_filter:
        started_before = ""
    elif args.started_before:
        started_before = args.started_before
        try:
            if datetime.date.fromisoformat(started_before).isoformat() != started_before:
                raise ValueError()
        except ValueError:
            fail(1, "INVALID_DATE", "--started-before must be YYYY-MM-DD.")
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
            input_path = Path(args.from_json)
            if input_path.stat().st_size > 1024 * 1024:
                raise ValueError("input exceeds 1 MiB")
            raw = json.loads(input_path.read_text(encoding="utf-8-sig"))
        except Exception as exc:
            fail(1, "BAD_INPUT_JSON", f"{args.from_json}: {exc}")
        ads = raw.get("ads", []) if isinstance(raw, dict) else raw
        page_state = (raw.get("page_state") if isinstance(raw, dict) else "from_json") or "from_json"
        result_header = raw.get("result_count_header", "") if isinstance(raw, dict) else ""
        collection_input = raw.get("collection") if isinstance(raw, dict) else None
    else:
        api_key = load_env_key("FIRECRAWL_API_KEY")
        url = build_pinned_url(args.page_id, args.country, args.media_type, started_before)
        if not api_key:
            fail(2, "FIRECRAWL_NOT_CONFIGURED",
                 "No FIRECRAWL_API_KEY. Either set it, or scrape this URL with the "
                 "agent's web tools and re-run with --from-json:\n" + url)
        data = scrape_via_firecrawl(url, api_key)
        ads = data.get("ads", [])
        page_state = data.get("page_state", "unknown")
        result_header = data.get("result_count_header", "")
        # The unchanged scraper cannot establish active status, Page identity
        # or coverage. Save its records for manual review, not a ready shortlist.
        collection_input = None

    try:
        collection = reviewed_collection(collection_input, args.page_id)
        if page_state in ("login_wall", "captcha"):
            collection = {**collection, "status": "blocked",
                          "limitations": [*collection.get("limitations", []), f"Page state: {page_state}"]}
        # rank revalidates; unknown bare imports have no reviewed Page metadata.
        shortlist, stats = rank(ads, args.top, args.min_days,
                                collection=collection if "page_id" in collection else None)
        stats["collection"] = collection
    except (ValueError, TypeError) as exc:
        fail(1, "INVALID_PROVENANCE", str(exc))

    label = args.brand or (f"page-{args.page_id}" if args.page_id else "from-json")
    out = {
        "version": 2,
        "brand": args.brand,
        "page_id": collection.get("page_id", args.page_id or ""),
        "country": args.country,
        "source_url": collection.get("source_url", ""),
        "generated": datetime.date.today().isoformat(),
        "started_before": started_before,
        "result_count_header": result_header,
        "status": "blocked" if page_state in ("login_wall", "captcha") else collection["status"],
        "signal": f"Displayed start age >= {args.min_days} days at the recorded observation.",
        "interpretation_limits": ["Not proof of continuous delivery, spend, sales or profitability.",
                                  "Partial/unknown scans cannot establish the brand's best ads or absence of ads.",
                                  "Provenance is recorded by the operator; validation does not authenticate it."],
        "stats": stats,
        "shortlist": shortlist,
        "records_for_review": ads,
    }

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{slugify(label)}-{out['generated']}.json"
    out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")

    # Human-readable table -> stderr (stdout stays clean JSON for piping).
    print(f"\nAd Recon: {label}  ({result_header or 'count n/a'})", file=sys.stderr)
    print(f"  {out['status']} collection | scanned {stats['scanned']} | "
          f"eligible in collected subset: {stats['eligible_in_collected_subset']}", file=sys.stderr)
    if not shortlist:
        print("  No eligible candidates in this collection; see exclusions and coverage.", file=sys.stderr)
    for i, a in enumerate(shortlist, 1):
        hook = (a["caption"][:70] + "...") if len(a["caption"]) > 70 else a["caption"]
        print(f"  {i}. {a['elapsed_days_since_displayed_start']:>4}d  {a['advertiser'][:22]:22}  {a['ad_permalink']}",
              file=sys.stderr)
        print(f"        hook: {hook}", file=sys.stderr)
    print(f"  -> {out_path}", file=sys.stderr)

    print(json.dumps(out, indent=2, ensure_ascii=False))
    if out["status"] == "blocked":
        sys.exit(2)
    if not shortlist:
        sys.exit(3)


if __name__ == "__main__":
    main()
