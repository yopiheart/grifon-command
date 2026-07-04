#!/usr/bin/env python3
"""Gemini Omni Flash edit-task PoC driver (roadmap item #18 bake-off).

Three jobs, one per subcommand:
  probe                       Step 0 — does GEMINI_API_KEY reach the Omni Flash
                              edit task at all? Costs nothing: sends a deliberately
                              incomplete request and classifies the rejection.
  edit <video> "<prompt>"     Upload a clip via the Files API, run one edit
                              interaction, download the result. PAID (~$0.10/sec
                              of output) — requires --yes.
  refine <interaction_id> "<prompt>"
                              Stateful follow-up edit via previous_interaction_id
                              (iterate without re-uploading). PAID — requires --yes.

Usage:
  python tools/omni_edit_poc.py probe
  python tools/omni_edit_poc.py edit .tmp/omni-poc/scene-broll-beans-pour.mp4 "..." --yes
  python tools/omni_edit_poc.py refine v1_abc123 "push in slower" --yes

Output videos land in .tmp/omni-poc/edits/. The interaction id is printed for
refine chaining. Exit codes: 0 ok, 1 usage/input error, 2 API failure,
3 probe says NO_ACCESS (so the agent can branch to the manual fallback).

Secrets: GEMINI_API_KEY from environment or repo-root .env (never hardcoded).
google-genai self-installs via pip (cafe-PC defreezer wipes site-packages).
"""

import argparse
import base64
import importlib
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = REPO_ROOT / ".tmp" / "omni-poc" / "edits"
MODEL = "gemini-omni-flash-preview"
BASE = "https://generativelanguage.googleapis.com/v1beta"


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


def ensure_package(import_name: str, pip_name: str):
    try:
        return importlib.import_module(import_name)
    except ImportError:
        print(f"[setup] installing {pip_name} (defreezer wiped it?)", file=sys.stderr)
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "--quiet", "--upgrade", pip_name],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            fail(2, "DEPENDENCY_INSTALL_FAILED", f"{pip_name}: {result.stderr.strip()[-500:]}")
        return importlib.import_module(import_name)


def _http(method: str, url: str, body: dict | None, api_key: str) -> tuple[int, str]:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url, data=data, method=method,
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="replace")
    except urllib.error.URLError as exc:
        fail(2, "NETWORK_ERROR", str(exc))


def cmd_probe(api_key: str) -> None:
    """Zero-cost access check. An incomplete interactions request that the
    endpoint REJECTS AS MALFORMED (400) proves the key reaches the model —
    nothing is generated, nothing is billed. 403/404 = no access / not rolled
    out to this key."""
    print(f"[probe] GET models/{MODEL}", file=sys.stderr)
    status_get, body_get = _http("GET", f"{BASE}/models/{MODEL}", None, api_key)
    print(f"  -> {status_get}: {body_get[:300]}", file=sys.stderr)

    print(f"[probe] POST interactions (deliberately incomplete body)", file=sys.stderr)
    status_post, body_post = _http("POST", f"{BASE}/interactions", {"model": MODEL}, api_key)
    print(f"  -> {status_post}: {body_post[:500]}", file=sys.stderr)

    if status_post == 400:
        verdict = "ACCESS_OK"
        note = "endpoint accepted the model and rejected only the malformed body — the key reaches the Omni edit task"
    elif status_post in (401, 403):
        verdict = "NO_ACCESS"
        note = "key is refused at the interactions endpoint (preview not rolled out to this key)"
    elif status_post == 404:
        verdict = "NOT_AVAILABLE"
        note = "interactions endpoint or model id not found for this key/region"
    elif status_post == 429:
        verdict = "ACCESS_OK"
        note = "rate-limited, which means the key is recognized by the endpoint"
    else:
        verdict = "UNKNOWN"
        note = f"unexpected status {status_post} — read the raw body above"

    print(json.dumps({
        "verdict": verdict, "note": note,
        "models_get_status": status_get, "interactions_post_status": status_post,
    }, indent=2))
    if verdict in ("NO_ACCESS", "NOT_AVAILABLE"):
        sys.exit(3)


def _extract_video(interaction) -> bytes | None:
    """Pull video bytes out of an interaction across the response shapes the
    docs show (output_video.data, or steps[].content[] type=video)."""
    out = getattr(interaction, "output_video", None)
    if out is not None and getattr(out, "data", None):
        data = out.data
        return data if isinstance(data, bytes) else base64.b64decode(data)
    for step in getattr(interaction, "steps", None) or []:
        if getattr(step, "type", "") != "model_output":
            continue
        for part in getattr(step, "content", None) or []:
            if getattr(part, "type", "") == "video" and getattr(part, "data", None):
                data = part.data
                return data if isinstance(data, bytes) else base64.b64decode(data)
    return None


def _run_interaction(client, kwargs: dict, out_stem: str) -> None:
    print(f"[interact] model={MODEL}", file=sys.stderr)
    interaction = client.interactions.create(model=MODEL, **kwargs)

    deadline = time.time() + 900
    while getattr(interaction, "status", "completed") in ("in_progress", "processing", "pending", "queued"):
        if time.time() > deadline:
            fail(2, "INTERACTION_TIMEOUT", f"still {interaction.status} after 15 min (id={interaction.id})")
        print(f"  status={interaction.status}, polling...", file=sys.stderr)
        time.sleep(10)
        interaction = client.interactions.get(interaction_id=interaction.id)

    status = getattr(interaction, "status", "completed")
    if status not in ("completed", "succeeded"):
        fail(2, "INTERACTION_FAILED", f"status={status} id={getattr(interaction, 'id', '?')} raw={interaction}")

    video = _extract_video(interaction)
    if video is None:
        fail(2, "NO_VIDEO_IN_RESPONSE",
             f"id={getattr(interaction, 'id', '?')} — response shape unrecognized, raw: {str(interaction)[:1000]}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"{out_stem}-{time.strftime('%H%M%S')}.mp4"
    out_path.write_bytes(video)
    print(json.dumps({
        "interaction_id": getattr(interaction, "id", None),
        "output": str(out_path),
        "size_kb": out_path.stat().st_size // 1024,
    }, indent=2))


def cmd_edit(api_key: str, video: str, prompt: str, aspect_ratio: str) -> None:
    video_path = Path(video)
    if not video_path.is_file():
        fail(1, "INPUT_NOT_FOUND", f"no such file: {video_path}")

    genai = ensure_package("google.genai", "google-genai")
    client = genai.Client(api_key=api_key)

    print(f"[upload] {video_path.name} ({video_path.stat().st_size // 1024} KB)", file=sys.stderr)
    uploaded = client.files.upload(file=str(video_path))
    deadline = time.time() + 300
    while uploaded.state and uploaded.state.name == "PROCESSING":
        if time.time() > deadline:
            fail(2, "UPLOAD_TIMEOUT", "Gemini file stuck in PROCESSING for 5 minutes")
        time.sleep(4)
        uploaded = client.files.get(name=uploaded.name)
    if uploaded.state and uploaded.state.name == "FAILED":
        fail(2, "UPLOAD_FAILED", "Gemini Files API reported FAILED state for the video")
    print(f"[upload] ready: {uploaded.uri}", file=sys.stderr)

    _run_interaction(client, {
        "input": [
            {"type": "document", "uri": uploaded.uri},
            {"type": "text", "text": prompt},
        ],
        "response_format": {"type": "video", "aspect_ratio": aspect_ratio},
    }, re.sub(r"[^a-zA-Z0-9]+", "-", video_path.stem)[:40])


def cmd_refine(api_key: str, interaction_id: str, prompt: str) -> None:
    genai = ensure_package("google.genai", "google-genai")
    client = genai.Client(api_key=api_key)
    _run_interaction(client, {
        "previous_interaction_id": interaction_id,
        "input": prompt,
    }, f"refine-{re.sub(r'[^a-zA-Z0-9]+', '-', interaction_id)[-12:]}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Gemini Omni Flash edit-task PoC driver")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("probe", help="zero-cost key/access check (step 0)")
    p_edit = sub.add_parser("edit", help="upload a clip + run one edit interaction (PAID)")
    p_edit.add_argument("video")
    p_edit.add_argument("prompt")
    p_edit.add_argument("--aspect-ratio", default="9:16")
    p_edit.add_argument("--yes", action="store_true", help="confirm the paid call")
    p_ref = sub.add_parser("refine", help="stateful follow-up edit (PAID)")
    p_ref.add_argument("interaction_id")
    p_ref.add_argument("prompt")
    p_ref.add_argument("--yes", action="store_true", help="confirm the paid call")
    args = parser.parse_args()

    api_key = load_env_key("GEMINI_API_KEY")
    if not api_key:
        fail(1, "GEMINI_NOT_CONFIGURED", "GEMINI_API_KEY not in environment or .env")

    if args.cmd == "probe":
        cmd_probe(api_key)
    elif args.cmd == "edit":
        if not args.yes:
            fail(1, "CONFIRM_REQUIRED",
                 "this fires a PAID Omni generation (~$0.10/sec of output) — re-run with --yes")
        cmd_edit(api_key, args.video, args.prompt, args.aspect_ratio)
    elif args.cmd == "refine":
        if not args.yes:
            fail(1, "CONFIRM_REQUIRED",
                 "this fires a PAID Omni generation (~$0.10/sec of output) — re-run with --yes")
        cmd_refine(api_key, args.interaction_id, args.prompt)


if __name__ == "__main__":
    main()
