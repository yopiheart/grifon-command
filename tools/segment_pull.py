#!/usr/bin/env python3
"""Segment pull — Phase 3 of the Data-Driven Growth Loop (workflows/growth_loop.md).

READ-ONLY + LEAST-PII: joins public.subscriptions + public.events + public.feedback
into retargeting SEGMENTS, so Neil can build the next creative per audience. This is
the segmentation half of Phase 3; the `retargeting-briefs` skill turns each segment
into a grifon-cmo brief. INGEST-ONLY doctrine holds: this tool never publishes, never
pushes to Meta, never spends. It only *describes* audiences.

Two outputs, by design:
  1. stdout JSON  — per-segment counts + PII-FREE signal (the analysis). Default.
  2. roster files — per-segment SHA-256-hashed emails for a Meta Custom Audience
     UPLOAD, written to --out-dir ONLY when emails are available (fixture, or the
     explicit --with-emails opt-in). Neil uploads them by hand. No automated push.

Segments (all tunable; see --power-threshold):
  checkout_abandoners     fired InitiateCheckout, no Purchase            (highest intent)
  power_users_still_free  plan=free, engaged-event count >= threshold    (hottest upgrade)
  free_not_converted      plan=free, >=1 engaged event, no Purchase, NOT power
  detractors              feedback nps_score <= 6                        (save / winback)
  promoters               feedback nps_score >= 9                        (referral / LAL seed)

Usage:
  # No creds — verify segmentation + roster hashing against the committed fixture:
  python tools/segment_pull.py --fixture tools/fixtures/segment_sample.json --out-dir .tmp/growth/audiences

  # Live, PII-FREE analysis only (no emails pulled, no rosters written):
  python tools/segment_pull.py --days 30

  # Live, ALSO build hashed rosters (pulls emails via the auth admin endpoint):
  python tools/segment_pull.py --days 30 --with-emails --out-dir .tmp/growth/audiences

Output: one JSON object {window, segments, thresholds, pii_included} to stdout;
[stage] logs to stderr. Exit: 0 ok, 1 usage/config, 2 API/network, 3 validation.

Secrets (from .env or env; NEVER hardcoded, NEVER logged):
  SUPABASE_URL (or VITE_SUPABASE_URL)
  SUPABASE_SERVICE_ROLE_KEY   bypasses RLS + authorizes the auth admin endpoint; SERVER-ONLY
"""

import argparse
import hashlib
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Funnel-top events that do NOT count as "engaged" usage (everything else does).
NON_ENGAGED = {"PageView", "ViewContent"}


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


def hash_email(email: str) -> str:
    """Meta Custom Audience normalization: trim + lowercase, then SHA-256 hex."""
    return hashlib.sha256(email.strip().lower().encode("utf-8")).hexdigest()


# ── data sources ───────────────────────────────────────────────────────────────
def _get(url: str, key: str, label: str):
    req = urllib.request.Request(url, method="GET")
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:500] if exc.fp else str(exc.code)
        fail(2, "SUPABASE_READ_ERROR", f"{label}: HTTP {exc.code}: {detail}")
    except urllib.error.URLError as exc:
        fail(2, "SUPABASE_NETWORK_ERROR", f"{label}: {exc.reason}")


def fetch_supabase(sb_url: str, sb_key: str, since: str) -> dict:
    base = sb_url.rstrip("/") + "/rest/v1"
    rows = {}
    print("[read] subscriptions", file=sys.stderr)
    rows["subscriptions"] = _get(
        f"{base}/subscriptions?select=user_id,plan_id,status&limit=50000", sb_key, "subscriptions")
    print("[read] events", file=sys.stderr)
    rows["events"] = _get(
        f"{base}/events?ts=gte.{since}T00:00:00Z&select=user_id,event,ts&order=ts.desc&limit=200000",
        sb_key, "events")
    print("[read] feedback", file=sys.stderr)
    rows["feedback"] = _get(
        f"{base}/feedback?ts=gte.{since}T00:00:00Z&select=user_id,nps_score,ts&order=ts.desc&limit=50000",
        sb_key, "feedback")
    for table in ("subscriptions", "events", "feedback"):
        if not isinstance(rows[table], list):
            fail(3, "SUPABASE_SHAPE", f"{table}: expected a JSON array")
    return rows


def fetch_emails(sb_url: str, sb_key: str) -> dict:
    """user_id -> email via the GoTrue admin endpoint (service role). Paginated."""
    base = sb_url.rstrip("/") + "/auth/v1/admin/users"
    out: dict = {}
    page, per_page = 1, 1000
    while True:
        print(f"[emails] admin users page {page} (collected {len(out)})", file=sys.stderr)
        body = _get(f"{base}?page={page}&per_page={per_page}", sb_key, "auth_admin_users")
        users = body.get("users", []) if isinstance(body, dict) else (body or [])
        for u in users:
            uid, email = u.get("id"), u.get("email")
            if uid and email:
                out[uid] = email
        if len(users) < per_page:
            break
        page += 1
    return out


def load_fixture(path: str) -> tuple[dict, dict]:
    p = Path(path)
    if not p.is_file():
        fail(1, "FIXTURE_NOT_FOUND", f"no file at {path}")
    try:
        payload = json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(3, "FIXTURE_BAD_JSON", str(exc))
    if not isinstance(payload, dict):
        fail(3, "FIXTURE_SHAPE", "expected an object with subscriptions/events/feedback arrays")
    rows = {}
    for table in ("subscriptions", "events", "feedback"):
        data = payload.get(table, [])
        if not isinstance(data, list):
            fail(3, "FIXTURE_SHAPE", f"`{table}` must be an array")
        rows[table] = data
    # Optional email map for testing the roster path offline: [{user_id, email}, ...].
    emails = {u["user_id"]: u["email"] for u in payload.get("auth_users", [])
              if u.get("user_id") and u.get("email")}
    return rows, emails


# ── segmentation (deterministic; the skill owns the creative judgment) ──────────
def build_segments(rows: dict, power_threshold: int) -> tuple[dict, int]:
    subs = {s["user_id"]: s for s in rows["subscriptions"] if s.get("user_id")}

    purchasers, checkout = set(), set()
    engaged_count: dict = {}
    anon_skipped = 0
    for e in rows["events"]:
        uid = e.get("user_id")
        ev = e.get("event")
        if not uid:
            anon_skipped += 1  # anonymous (pre-auth) events can't be retargeted by email
            continue
        if ev == "Purchase":
            purchasers.add(uid)
        elif ev == "InitiateCheckout":
            checkout.add(uid)
        if ev and ev not in NON_ENGAGED:
            engaged_count[uid] = engaged_count.get(uid, 0) + 1

    def is_free(uid):
        s = subs.get(uid)
        return s and s.get("plan_id") == "free" and s.get("status") == "active"

    # Latest NPS per user (feedback is fetched ts-desc, so first seen = most recent).
    nps_latest: dict = {}
    for f in rows["feedback"]:
        uid, score = f.get("user_id"), f.get("nps_score")
        if uid and score is not None and uid not in nps_latest:
            nps_latest[uid] = score

    checkout_abandoners = {u for u in checkout if u not in purchasers}
    power_users = {u for u in subs if is_free(u) and engaged_count.get(u, 0) >= power_threshold}
    # Mid-tier free: engaged but not already in a hotter bucket (abandoner / power),
    # so the segments don't double-target the same user.
    free_not_converted = {u for u in subs
                          if is_free(u) and u not in purchasers
                          and engaged_count.get(u, 0) >= 1
                          and u not in power_users and u not in checkout_abandoners}
    detractors = {u for u, s in nps_latest.items() if s <= 6}
    promoters = {u for u, s in nps_latest.items() if s >= 9}

    def signal(uids):
        counts = [engaged_count.get(u, 0) for u in uids]
        return {
            "count": len(uids),
            "avg_engaged_events": round(sum(counts) / len(counts), 2) if counts else 0,
            "on_free": sum(1 for u in uids if is_free(u)),
        }

    segments = {
        "checkout_abandoners": {"intent": "highest", "members": checkout_abandoners,
                                "signal": signal(checkout_abandoners)},
        "power_users_still_free": {"intent": "upgrade-hot", "members": power_users,
                                   "signal": signal(power_users)},
        "free_not_converted": {"intent": "upgrade-nudge", "members": free_not_converted,
                               "signal": signal(free_not_converted)},
        "detractors": {"intent": "save/winback", "members": detractors,
                       "signal": signal(detractors)},
        "promoters": {"intent": "referral/lookalike-seed", "members": promoters,
                      "signal": signal(promoters)},
    }
    return segments, anon_skipped


def write_rosters(segments: dict, emails: dict, out_dir: str) -> dict:
    """Write one hashed-email file per non-empty segment. Returns {segment: {file, hashed, missing_email}}."""
    out = {}
    base = Path(out_dir)
    base.mkdir(parents=True, exist_ok=True)
    for name, seg in segments.items():
        members = seg["members"]
        if not members:
            continue
        hashed, missing = [], 0
        for uid in sorted(members):
            email = emails.get(uid)
            if email:
                hashed.append(hash_email(email))
            else:
                missing += 1
        if not hashed:
            out[name] = {"file": None, "hashed": 0, "missing_email": missing}
            continue
        path = base / f"{name}.csv"
        # Meta Custom Audience CSV: a header line then one SHA-256 email hash per row.
        path.write_text("email_sha256\n" + "\n".join(hashed) + "\n", encoding="utf-8")
        out[name] = {"file": str(path), "hashed": len(hashed), "missing_email": missing}
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="growth-loop segments -> rosters + brief input")
    parser.add_argument("--days", type=int, default=30, help="event/feedback lookback in days (default 30)")
    parser.add_argument("--power-threshold", type=int, default=5,
                        help="min engaged events for power_users_still_free (default 5)")
    parser.add_argument("--fixture", help="read a local JSON {subscriptions,events,feedback,auth_users}")
    parser.add_argument("--with-emails", action="store_true",
                        help="LIVE ONLY: pull emails via auth admin + write hashed rosters (PII)")
    parser.add_argument("--out-dir", help="write per-segment hashed rosters here (needs emails)")
    args = parser.parse_args()

    since = (date.today() - timedelta(days=max(1, args.days))).isoformat()

    emails: dict = {}
    if args.fixture:
        print(f"[source] fixture {args.fixture}", file=sys.stderr)
        rows, emails = load_fixture(args.fixture)
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
        if args.with_emails:
            emails = fetch_emails(sb_url, sb_key)

    segments, anon_skipped = build_segments(rows, args.power_threshold)

    rosters = {}
    pii_included = False
    if args.out_dir:
        if not emails:
            print("[roster] no emails available (need --fixture auth_users or live --with-emails); "
                  "writing PII-free analysis only", file=sys.stderr)
        else:
            rosters = write_rosters(segments, emails, args.out_dir)
            pii_included = True
            print(f"[roster] wrote {len(rosters)} segment file(s) to {args.out_dir}", file=sys.stderr)

    # stdout JSON is ALWAYS PII-free: counts + signal only, never user_ids or emails.
    out = {
        "window": {"since": since, "until": date.today().isoformat(), "days": args.days},
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "thresholds": {"power_events": args.power_threshold},
        "anon_events_skipped": anon_skipped,
        "pii_included": pii_included,
        "segments": {
            name: {
                "intent": seg["intent"],
                **seg["signal"],
                "roster": rosters.get(name),  # null unless a file was written
            }
            for name, seg in segments.items()
        },
    }
    print(json.dumps(out, indent=2, ensure_ascii=False, default=str))
    print(f"[done] source={source} segments="
          f"{ {n: s['signal']['count'] for n, s in segments.items()} } "
          f"anon_skipped={anon_skipped} pii={pii_included}", file=sys.stderr)


if __name__ == "__main__":
    main()
