#!/usr/bin/env python3
"""Gemini Omni Flash edit-task driver (roadmap item #18 bake-off + preset runner).

Subcommands:
  probe                       Step 0 — does GEMINI_API_KEY reach the Omni Flash
                              edit task at all? Costs nothing: sends a deliberately
                              incomplete request and classifies the rejection.
  edit <video> "<prompt>"     Upload a clip via the Files API, run one edit
                              interaction, download the result. PAID (~$0.10/sec
                              of output) — requires --yes. Honours --budget and
                              --font-ref.
  refine <interaction_id> "<prompt>"
                              Stateful follow-up edit via previous_interaction_id
                              (iterate without re-uploading). PAID — requires --yes.
                              Prints a loud face-degradation warning (b-roll only).
  preset <id> <clip>          Assemble a tuned prompt from the preset registry
                              (workflows/omni_edit_presets.md) by filling {{slots}},
                              then --dry-run to print it (free) or --yes to fire the
                              PAID edit call. Honours --budget and --font-ref.
  upscale <video>             FREE ffmpeg 720p->1080p upscale (lanczos + light
                              unsharp, H.264 CRF 18, audio copy). No API call.

Usage:
  python tools/omni_edit.py probe
  python tools/omni_edit.py edit clip.mp4 "..." --yes --budget 2.00 --font-ref f.png
  python tools/omni_edit.py refine v1_abc123 "push in slower" --yes --est-seconds 4
  python tools/omni_edit.py preset premium-reel-v1 clip.mp4 --slot transcript="..." \
      --slot emphasis_words="SOBRANG SULIT" --slot brand_primary_hex="#FFCC00" --dry-run
  python tools/omni_edit.py upscale clip.mp4 -o clip.1080p.mp4

Output videos land in .tmp/omni-poc/edits/. The interaction id is printed for
refine chaining. Exit codes: 0 ok, 1 usage/input/budget/gate error, 2 API/ffmpeg
failure, 3 probe says NO_ACCESS (so the agent can branch to the manual fallback).

Secrets: GEMINI_API_KEY from environment or repo-root .env (never hardcoded).
google-genai / pyyaml self-install via pip (cafe-PC defreezer wipes site-packages).
"""

import argparse
import base64
import importlib
import json
import math
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
PRESETS_MD = REPO_ROOT / "workflows" / "omni_edit_presets.md"
MODEL = "gemini-omni-flash-preview"
BASE = "https://generativelanguage.googleapis.com/v1beta"
RATE_USD_PER_SEC = 0.10
DEFAULT_BUDGET_USD = 2.00


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


def require_api_key() -> str:
    api_key = load_env_key("GEMINI_API_KEY")
    if not api_key:
        fail(1, "GEMINI_NOT_CONFIGURED", "GEMINI_API_KEY not in environment or .env")
    return api_key


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


# ---------------------------------------------------------------------------
# ffmpeg helpers (ffmpeg-static npm binary; no ffprobe available, so parse
# duration/resolution out of `ffmpeg -i` stderr).
# ---------------------------------------------------------------------------

def ffmpeg_bin() -> str:
    for name in ("ffmpeg.exe", "ffmpeg"):
        cand = REPO_ROOT / "node_modules" / "ffmpeg-static" / name
        if cand.is_file():
            return str(cand)
    return "ffmpeg"  # fall back to PATH


def probe_media(path: Path) -> tuple[float | None, int | None, int | None]:
    """Return (duration_seconds, width, height) by parsing `ffmpeg -i` stderr."""
    proc = subprocess.run(
        [ffmpeg_bin(), "-hide_banner", "-i", str(path)],
        capture_output=True, text=True,
    )
    err = proc.stderr or ""
    duration = None
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", err)
    if m:
        duration = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    width = height = None
    mline = re.search(r"Video:.*", err)
    if mline:
        mres = re.search(r"(\d{2,5})x(\d{2,5})", mline.group(0))
        if mres:
            width, height = int(mres.group(1)), int(mres.group(2))
    return duration, width, height


def cost_for(duration_s: float) -> float:
    """Estimated USD, rounded up to the cent."""
    return math.ceil(duration_s * RATE_USD_PER_SEC * 100) / 100


def enforce_budget(duration_s: float, budget: float) -> None:
    """Exit non-zero BEFORE any network/upload if the estimate blows the cap."""
    est = cost_for(duration_s)
    if est > budget:
        fail(1, "BUDGET_EXCEEDED", f"estimated ${est:.2f} > cap ${budget:.2f}")


# ---------------------------------------------------------------------------
# Files API + interaction plumbing.
# ---------------------------------------------------------------------------

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


def _upload(client, path: Path, label: str) -> str:
    """Upload one file via the Files API, wait for ACTIVE, return its uri."""
    print(f"[upload:{label}] {path.name} ({path.stat().st_size // 1024} KB)", file=sys.stderr)
    uploaded = client.files.upload(file=str(path))
    deadline = time.time() + 300
    while uploaded.state and uploaded.state.name == "PROCESSING":
        if time.time() > deadline:
            fail(2, "UPLOAD_TIMEOUT", f"Gemini file '{label}' stuck in PROCESSING for 5 minutes")
        time.sleep(4)
        uploaded = client.files.get(name=uploaded.name)
    if uploaded.state and uploaded.state.name == "FAILED":
        fail(2, "UPLOAD_FAILED", f"Gemini Files API reported FAILED state for '{label}'")
    print(f"[upload:{label}] ready: {uploaded.uri}", file=sys.stderr)
    return uploaded.uri


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


def run_edit_call(api_key: str, video_path: Path, prompt: str, aspect_ratio: str,
                  font_ref: str | None, budget: float, out_stem: str) -> None:
    """Shared PAID path for `edit` and `preset`. Budget gate fires BEFORE any
    upload or network call."""
    duration, _, _ = probe_media(video_path)
    if duration is None:
        fail(1, "PROBE_FAILED", f"could not read duration from {video_path} via ffmpeg")
    enforce_budget(duration, budget)

    genai = ensure_package("google.genai", "google-genai")
    client = genai.Client(api_key=api_key)

    video_uri = _upload(client, video_path, "video")
    input_parts: list[dict] = [{"type": "document", "uri": video_uri}]
    if font_ref:
        fr_path = Path(font_ref)
        if not fr_path.is_file():
            fail(1, "INPUT_NOT_FOUND", f"no such font-ref file: {fr_path}")
        input_parts.append({"type": "image", "uri": _upload(client, fr_path, "font-ref")})
    input_parts.append({"type": "text", "text": prompt})

    _run_interaction(client, {
        "input": input_parts,
        "response_format": {"type": "video", "aspect_ratio": aspect_ratio},
    }, out_stem)


def cmd_edit(api_key: str, video: str, prompt: str, aspect_ratio: str,
             font_ref: str | None, budget: float) -> None:
    video_path = Path(video)
    if not video_path.is_file():
        fail(1, "INPUT_NOT_FOUND", f"no such file: {video_path}")
    run_edit_call(api_key, video_path, prompt, aspect_ratio, font_ref, budget,
                  re.sub(r"[^a-zA-Z0-9]+", "-", video_path.stem)[:40])


def _print_refine_warning() -> None:
    bar = "=" * 72
    for line in (
        bar,
        "!! REFINE WARNING — read before you fire this",
        "",
        "Refine chains (previous_interaction_id) DEGRADE FACES: mouth warp and",
        "plastic skin appear by generation 2. Per the talking-scene rule in",
        "workflows/omni_edit_presets.md, refine is B-ROLL ONLY — NEVER chain a",
        "talking-head output. This is a warning, not a block.",
        bar,
    ):
        print(line, file=sys.stderr)


def cmd_refine(api_key: str, interaction_id: str, prompt: str,
               budget: float, est_seconds: float | None) -> None:
    _print_refine_warning()
    if est_seconds is not None:
        enforce_budget(est_seconds, budget)
    else:
        print("[budget] WARNING: refine has no local video to probe — budget cap NOT "
              "enforced. Pass --est-seconds <n> to enable the magnitude gate.",
              file=sys.stderr)

    genai = ensure_package("google.genai", "google-genai")
    client = genai.Client(api_key=api_key)
    _run_interaction(client, {
        "previous_interaction_id": interaction_id,
        "input": prompt,
    }, f"refine-{re.sub(r'[^a-zA-Z0-9]+', '-', interaction_id)[-12:]}")


# ---------------------------------------------------------------------------
# preset runner — parse workflows/omni_edit_presets.md, fill {{slots}}.
# ---------------------------------------------------------------------------

# Top-level keys the runner actually needs. Narrative fields (origin, evidence,
# validation, constraints, ffmpeg_layer, cost_estimate...) carry unquoted '#' and
# em-dashes that trip strict YAML; they are dropped before parsing so a messy
# note never aborts a run. The whitelisted keys are all clean single-line
# scalars, clean mappings, or literal ('|') blocks.
_WANTED_KEYS = {
    "id", "name", "target", "status", "model", "max_passes",
    "version", "slots", "prompt_template", "rejection",
}


def _reduce_block(raw: str) -> str:
    """Keep only the whitelisted top-level keys (with their multi-line values)."""
    kept: list[str] = []
    keep_current = False
    for line in raw.split("\n"):
        m = re.match(r"^([A-Za-z_][\w-]*):(?:\s|$)", line)  # top-level key (col 0)
        if m:
            keep_current = m.group(1) in _WANTED_KEYS
        if keep_current:
            kept.append(line)
    return "\n".join(kept)


def _find_preset(preset_id: str) -> dict:
    yaml = ensure_package("yaml", "pyyaml")
    if not PRESETS_MD.is_file():
        fail(1, "PRESETS_NOT_FOUND", f"registry missing: {PRESETS_MD}")
    text = PRESETS_MD.read_text(encoding="utf-8", errors="replace")
    blocks = re.findall(r"```yaml\n(.*?)```", text, flags=re.DOTALL)
    for raw in blocks:
        # only parse the block that claims this id, so an unrelated malformed
        # block never aborts the run.
        if not re.search(rf"^id:\s*{re.escape(preset_id)}\s*$", raw, flags=re.MULTILINE):
            continue
        try:
            data = yaml.safe_load(_reduce_block(raw))
        except Exception as exc:  # report which preset + why, per spec
            fail(1, "PRESET_PARSE_ERROR", f"preset '{preset_id}' YAML block failed to parse: {exc}")
        if isinstance(data, dict) and data.get("id") == preset_id:
            return data
    fail(1, "PRESET_NOT_FOUND", f"no preset with id '{preset_id}' in {PRESETS_MD.name}")


def _parse_slot_spec(spec) -> tuple[str, str | None]:
    """A slot's registry value is one of: 'required', 'optional', 'default X'."""
    s = str(spec).strip()
    if s == "required":
        return ("required", None)
    if s.startswith("default"):
        default = s[len("default"):].strip()
        if len(default) >= 2 and default[0] in "\"'" and default[-1] == default[0]:
            default = default[1:-1]
        return ("default", default)
    return ("optional", None)


def _parse_slot_args(slot_args: list[str]) -> dict:
    provided: dict[str, str] = {}
    for item in slot_args or []:
        if "=" not in item:
            fail(1, "BAD_SLOT_ARG", f"--slot must be key=value, got: {item!r}")
        key, value = item.split("=", 1)
        provided[key.strip()] = value
    return provided


def _render_template(template: str, values: dict) -> str:
    """Dead-simple templating: drop {{#name}}...{{/name}} sections whose slot is
    absent/empty, then substitute (or drop) bare {{name}} placeholders."""
    def repl_section(m):
        name, inner = m.group(1), m.group(2)
        return inner if values.get(name) else ""

    template = re.sub(r"\{\{#(\w+)\}\}(.*?)\{\{/\1\}\}", repl_section, template, flags=re.DOTALL)

    def repl_bare(m):
        return str(values.get(m.group(1), "") or "")

    return re.sub(r"\{\{(\w+)\}\}", repl_bare, template)


def cmd_preset(args) -> None:
    preset = _find_preset(args.id)
    status = preset.get("status")
    if status == "rejected":
        rejection = (preset.get("rejection") or "(no rejection text recorded)").strip()
        print(f"PRESET_REJECTED: '{args.id}' is status=rejected — refusing to run.", file=sys.stderr)
        print(rejection, file=sys.stderr)
        sys.exit(1)

    clip_path = Path(args.clip)
    if not clip_path.is_file():
        fail(1, "INPUT_NOT_FOUND", f"no such clip: {clip_path}")

    # Assemble the prompt from the slot registry.
    slots = preset.get("slots") or {}
    provided = _parse_slot_args(args.slot)
    values: dict[str, str] = {}
    missing: list[str] = []
    for name, spec in slots.items():
        kind, default = _parse_slot_spec(spec)
        if name in provided:
            values[name] = provided[name]
        elif kind == "required":
            missing.append(name)
        elif kind == "default":
            values[name] = default
        # optional + absent → leave unset (its conditional section drops)
    # pass through any slots the caller supplied that aren't in the registry
    for key, value in provided.items():
        values.setdefault(key, value)
    # a supplied --font-ref makes the font_ref_image conditional section fire
    if args.font_ref:
        values.setdefault("font_ref_image", str(args.font_ref))
    if missing:
        fail(1, "MISSING_REQUIRED_SLOTS", "missing required --slot(s): " + ", ".join(missing))

    prompt = _render_template(preset.get("prompt_template") or "", values)
    aspect_ratio = values.get("aspect_ratio", "9:16")

    duration, _, _ = probe_media(clip_path)
    est = cost_for(duration) if duration is not None else None
    version_m = re.search(r"-(v\d+)$", str(args.id))
    version = version_m.group(1) if version_m else str(preset.get("version", "?"))

    print("=" * 72)
    print(prompt.rstrip())
    print("=" * 72)
    print(json.dumps({
        "preset_id": preset.get("id"),
        "name": preset.get("name"),
        "version": version,
        "status": status,
        "clip": str(clip_path),
        "duration_s": round(duration, 2) if duration is not None else None,
        "est_cost_usd": est,
        "budget_cap_usd": round(args.budget, 2),
    }, indent=2))
    if "{{" in prompt:
        print("[warn] unresolved {{...}} remains in the assembled prompt — check slots.",
              file=sys.stderr)
    if preset.get("max_passes") == 1:
        print("[reminder] max_passes=1 — refine is FORBIDDEN for this preset's outputs "
              "(one pass only; re-roll from raw, never chain).", file=sys.stderr)

    if args.dry_run:
        return

    # PAID path from here. Consent (magnitude-independent) then budget gate,
    # both BEFORE any key load / network.
    if not args.yes:
        fail(1, "CONFIRM_REQUIRED",
             "this fires a PAID Omni generation (~$0.10/sec of output) — re-run with --yes")
    if duration is None:
        fail(1, "PROBE_FAILED", f"could not read duration from {clip_path} via ffmpeg")
    enforce_budget(duration, args.budget)

    api_key = require_api_key()
    run_edit_call(api_key, clip_path, prompt, aspect_ratio, args.font_ref, args.budget,
                  re.sub(r"[^a-zA-Z0-9]+", "-", str(args.id))[:40])


# ---------------------------------------------------------------------------
# upscale — free, ffmpeg-only, no API.
# ---------------------------------------------------------------------------

def cmd_upscale(video: str, output: str | None) -> None:
    video_path = Path(video)
    if not video_path.is_file():
        fail(1, "INPUT_NOT_FOUND", f"no such file: {video_path}")
    _, width, height = probe_media(video_path)
    if not width or not height:
        fail(1, "PROBE_FAILED", f"could not read resolution from {video_path} via ffmpeg")

    portrait = height >= width
    scale = "scale=-2:1920:flags=lanczos" if portrait else "scale=1920:-2:flags=lanczos"
    vf = f"{scale},unsharp=5:5:0.4:5:5:0.2"
    out_path = Path(output) if output else video_path.parent / f"{video_path.stem}.1080p.mp4"

    print(f"[upscale] {video_path.name} {width}x{height} "
          f"({'portrait' if portrait else 'landscape'}) -> 1080-tall", file=sys.stderr)
    proc = subprocess.run([
        ffmpeg_bin(), "-y", "-hide_banner", "-i", str(video_path),
        "-vf", vf, "-c:v", "libx264", "-crf", "18", "-preset", "slow",
        "-c:a", "copy", str(out_path),
    ], capture_output=True, text=True)
    if proc.returncode != 0:
        fail(2, "FFMPEG_FAILED", (proc.stderr or "").strip()[-800:])

    _, out_w, out_h = probe_media(out_path)
    print(json.dumps({
        "input": str(video_path),
        "output": str(out_path),
        "resolution": f"{out_w}x{out_h}" if out_w and out_h else None,
        "size_kb": out_path.stat().st_size // 1024,
    }, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="Gemini Omni Flash edit-task driver + preset runner")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("probe", help="zero-cost key/access check (step 0)")

    p_edit = sub.add_parser("edit", help="upload a clip + run one edit interaction (PAID)")
    p_edit.add_argument("video")
    p_edit.add_argument("prompt")
    p_edit.add_argument("--aspect-ratio", default="9:16")
    p_edit.add_argument("--font-ref", default=None, help="second image uploaded alongside the video")
    p_edit.add_argument("--budget", type=float, default=DEFAULT_BUDGET_USD,
                        help="magnitude cap in USD (default 2.00)")
    p_edit.add_argument("--yes", action="store_true", help="confirm the paid call")

    p_ref = sub.add_parser("refine", help="stateful follow-up edit (PAID, b-roll only)")
    p_ref.add_argument("interaction_id")
    p_ref.add_argument("prompt")
    p_ref.add_argument("--budget", type=float, default=DEFAULT_BUDGET_USD,
                       help="magnitude cap in USD (default 2.00); needs --est-seconds")
    p_ref.add_argument("--est-seconds", type=float, default=None,
                       help="estimated output seconds, to enable the budget gate")
    p_ref.add_argument("--yes", action="store_true", help="confirm the paid call")

    p_pre = sub.add_parser("preset", help="assemble a registry preset prompt then run it")
    p_pre.add_argument("id")
    p_pre.add_argument("clip")
    p_pre.add_argument("--slot", action="append", default=[], metavar="key=value",
                       help="fill a {{slot}} (repeatable)")
    p_pre.add_argument("--font-ref", default=None, help="second image uploaded alongside the video")
    p_pre.add_argument("--budget", type=float, default=DEFAULT_BUDGET_USD,
                       help="magnitude cap in USD (default 2.00)")
    p_pre.add_argument("--dry-run", action="store_true", help="print the assembled prompt only (free)")
    p_pre.add_argument("--yes", action="store_true", help="confirm the paid call")

    p_up = sub.add_parser("upscale", help="free ffmpeg 720p->1080p upscale (no API)")
    p_up.add_argument("video")
    p_up.add_argument("-o", "--output", default=None, help="output path (default <stem>.1080p.mp4)")

    args = parser.parse_args()

    if args.cmd == "upscale":
        cmd_upscale(args.video, args.output)
        return
    if args.cmd == "preset":
        cmd_preset(args)
        return

    api_key = require_api_key()
    if args.cmd == "probe":
        cmd_probe(api_key)
    elif args.cmd == "edit":
        if not args.yes:
            fail(1, "CONFIRM_REQUIRED",
                 "this fires a PAID Omni generation (~$0.10/sec of output) — re-run with --yes")
        cmd_edit(api_key, args.video, args.prompt, args.aspect_ratio, args.font_ref, args.budget)
    elif args.cmd == "refine":
        if not args.yes:
            fail(1, "CONFIRM_REQUIRED",
                 "this fires a PAID Omni generation (~$0.10/sec of output) — re-run with --yes")
        cmd_refine(api_key, args.interaction_id, args.prompt, args.budget, args.est_seconds)


if __name__ == "__main__":
    main()
