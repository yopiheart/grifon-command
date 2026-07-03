#!/usr/bin/env python3
"""Seedance 2.0 video render: submit an image-to-video job to the BytePlus
ModelArk (Seedance 2.0) API and poll until the clip is ready.

One job: a first frame (+ optional last frame) image + a prompt -> an MP4.
This is the deterministic execution layer; the cinematic_pipeline.py driver
(and the seedance-shotlist-director skill) decide WHAT to render.

Local prototyping tool — run it on your PC to validate quality cheaply BEFORE
wiring Seedance into the app. Images come from Codex CLI (gpt-image-2); this
script only handles the video step.

Usage:
  python tools/seedance_render.py --first-frame <img> --prompt "<prompt>" \
      [--last-frame <img>] [--aspect 9:16] [--duration 5] [--mode standard] \
      [--out-dir .tmp/cinematic-renders] [--dry-run]

  --first-frame  local image path OR http(s) URL (required) — the start keyframe
  --last-frame   optional end keyframe (loops: same as first frame)
  --prompt       Seedance prompt text, English, < ~1000 words (required)
  --aspect       9:16 | 16:9 | 21:9 | 1:1 | 4:5  (default 9:16)
  --duration     clip seconds (default 5)         # TODO confirm allowed values
  --mode         standard | fast | mini           # quality vs speed/cost
  --model-id     override the model id (else $SEEDANCE_MODEL_ID)
  --base-url     override the API base (else $SEEDANCE_BASE_URL)
  --out-dir      where to write the .mp4 (default .tmp/cinematic-renders)
  --dry-run      print the request that WOULD be sent and exit (no key needed)
  --poll-interval / --timeout  polling cadence + cap (seconds)

Output: the saved .mp4 path on stdout (and the task JSON beside it).
Exit codes: 0 ok, 1 usage/input error, 2 auth/API/download failure,
            3 render failed (task returned an error status).

Secrets: ARK_API_KEY or SEEDANCE_API_KEY from environment or repo-root .env.
Never hardcode keys.

>>> STATUS: SCAFFOLD. The BytePlus ModelArk docs are not reachable from this
>>> environment (403). The endpoint paths, request body field names, and the
>>> response shape below follow the documented ModelArk content-generation
>>> pattern (create-task -> poll-task) but are marked `# TODO confirm` — verify
>>> them against the live console once the API key is in hand, then delete the
>>> TODOs. Until then, use --dry-run to inspect/iterate the request offline.
"""

import argparse
import base64
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT_DIR = REPO_ROOT / ".tmp" / "cinematic-renders"

# TODO confirm: BytePlus ModelArk region host + content-generation paths.
DEFAULT_BASE_URL = "https://ark.ap-southeast.bytepluses.com"
CREATE_PATH = "/api/v3/contents/generations/tasks"          # TODO confirm
POLL_PATH = "/api/v3/contents/generations/tasks/{task_id}"   # TODO confirm
# TODO confirm: the actual Seedance 2.0 model id (e.g. "seedance-2-0-*").
DEFAULT_MODEL_ID = "seedance-2-0"


def load_dotenv(path: Path) -> None:
    """Minimal .env loader (mirrors the other tools/* scripts). Does not
    overwrite vars already set in the environment."""
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key, val = key.strip(), val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


def get_api_key() -> str:
    return os.environ.get("ARK_API_KEY") or os.environ.get("SEEDANCE_API_KEY") or ""


def image_to_url(ref: str, dry: bool = False) -> str:
    """Pass through http(s) URLs; encode a local file as a data: URI. In dry-run,
    a missing local file is tolerated (returns a placeholder) so the request can
    be inspected offline."""
    if ref.startswith("http://") or ref.startswith("https://"):
        return ref
    p = Path(ref)
    if not p.exists():
        if dry:
            return f"<local-file:{ref}>"
        sys.exit(f"[seedance] image not found: {ref}")
    mime = mimetypes.guess_type(p.name)[0] or "image/png"
    b64 = base64.b64encode(p.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def build_request(args, model_id: str, dry: bool = False) -> dict:
    """Assemble the create-task body. # TODO confirm field names against the
    live ModelArk schema (content array, ratio/duration/resolution keys)."""
    content = [
        {"type": "text", "text": args.prompt},
        {"type": "image_url", "role": "first_frame",
         "image_url": {"url": image_to_url(args.first_frame, dry)}},
    ]
    if args.last_frame:
        content.append({
            "type": "image_url", "role": "last_frame",
            "image_url": {"url": image_to_url(args.last_frame, dry)},
        })
    return {
        "model": model_id,
        "content": content,
        # TODO confirm parameter names/locations (may belong under "parameters").
        "ratio": args.aspect,
        "duration": args.duration,
        "mode": args.mode,
        "resolution": "4k",
    }


def _redact_data_uris(body: dict) -> dict:
    """Shorten base64 image payloads so --dry-run output stays readable."""
    clone = json.loads(json.dumps(body))
    for item in clone.get("content", []):
        url = item.get("image_url", {}).get("url", "")
        if url.startswith("data:") and len(url) > 80:
            item["image_url"]["url"] = url[:60] + f"...<{len(url)} chars>"
    return clone


def http_json(method: str, url: str, key: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:500]
        sys.exit(f"[seedance] API {e.code} on {method} {url}: {detail}")
    except urllib.error.URLError as e:
        sys.exit(f"[seedance] network error on {method} {url}: {e}")


def main() -> int:
    ap = argparse.ArgumentParser(description="Render a Seedance 2.0 clip from a keyframe.")
    ap.add_argument("--first-frame", required=True)
    ap.add_argument("--last-frame")
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--aspect", default="9:16")
    ap.add_argument("--duration", type=int, default=5)
    ap.add_argument("--mode", default="standard", choices=["standard", "fast", "mini"])
    ap.add_argument("--model-id")
    ap.add_argument("--base-url")
    ap.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR))
    ap.add_argument("--slug", default="render")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--poll-interval", type=int, default=10)
    ap.add_argument("--timeout", type=int, default=900)
    args = ap.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    base_url = (args.base_url or os.environ.get("SEEDANCE_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
    model_id = args.model_id or os.environ.get("SEEDANCE_MODEL_ID") or DEFAULT_MODEL_ID

    if len(args.prompt.split()) > 1000:
        print("[seedance] WARNING: prompt > 1000 words — Seedance fragments long "
              "prompts; trim to key points first.", file=sys.stderr)

    body = build_request(args, model_id, dry=args.dry_run)

    if args.dry_run:
        print(json.dumps({
            "POST": base_url + CREATE_PATH,
            "headers": {"Authorization": "Bearer <ARK_API_KEY>", "Content-Type": "application/json"},
            "body": _redact_data_uris(body),
            "note": "dry-run — confirm endpoint/field names against ModelArk before the first real call",
        }, indent=2))
        return 0

    key = get_api_key()
    if not key:
        sys.exit("[seedance] no API key — set ARK_API_KEY (or SEEDANCE_API_KEY) in "
                 "the environment or repo-root .env. Use --dry-run to test offline.")

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1) create task
    created = http_json("POST", base_url + CREATE_PATH, key, body)
    task_id = created.get("id") or created.get("task_id")  # TODO confirm field
    if not task_id:
        sys.exit(f"[seedance] no task id in create response: {json.dumps(created)[:500]}")
    print(f"[seedance] task {task_id} submitted; polling…", file=sys.stderr)

    # 2) poll
    deadline = time.time() + args.timeout
    poll_url = base_url + POLL_PATH.format(task_id=task_id)
    task = {}
    while time.time() < deadline:
        task = http_json("GET", poll_url, key)
        status = (task.get("status") or "").lower()  # TODO confirm enum values
        if status in ("succeeded", "success", "done", "completed"):
            break
        if status in ("failed", "error", "cancelled"):
            print(json.dumps(task)[:800], file=sys.stderr)
            return 3
        time.sleep(args.poll_interval)
    else:
        sys.exit(f"[seedance] timed out after {args.timeout}s waiting on task {task_id}")

    # 3) download the result. # TODO confirm where the URL lives in the response.
    video_url = (task.get("content", {}).get("video_url")
                 or task.get("video_url")
                 or (task.get("content", {}) or {}).get("url"))
    if not video_url:
        sys.exit(f"[seedance] task done but no video URL found: {json.dumps(task)[:500]}")

    mp4_path = out_dir / f"{args.slug}.mp4"
    try:
        urllib.request.urlretrieve(video_url, mp4_path)
    except Exception as e:  # noqa: BLE001
        sys.exit(f"[seedance] download failed from {video_url}: {e}")
    (out_dir / f"{args.slug}.task.json").write_text(json.dumps(task, indent=2), encoding="utf-8")

    print(str(mp4_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
