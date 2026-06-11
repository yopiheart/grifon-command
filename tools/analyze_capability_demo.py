#!/usr/bin/env python3
"""Capability-demo analyzer: have Gemini watch an AI-editor tool demo (e.g. a
Higgsfield x Adobe Premiere plugin Short) and inventory every capability shown,
classified by what Grifon's renderer/pipeline can match.

One job: demo video in (YouTube URL or local file) -> capability matrix JSON out.
This is PRODUCT RESEARCH, not viral-ad Edit DNA — winning ads go through
tools/analyze_video.py and the viral-autopsy skill instead. Findings land in
workflows/edit_like_this_video.md (capability matrix), never the Swipe File.

Usage:
  python tools/analyze_capability_demo.py <youtube-url-or-path> [--label LABEL]
                                          [--model MODEL] [--out-dir DIR]

  youtube-url-or-path  youtube.com/youtu.be URL (Gemini ingests it natively —
                       no download) or a local video file (Files API upload)
  --label              short slug for the output file, e.g. higgsfield-demo-1
  --model              Gemini model id (default: gemini-3.5-flash)
  --out-dir            artifact dir (default: .tmp/viral-intel)

Output: capability JSON on stdout, also written to <out-dir>/<label>.json.
Exit codes: 0 ok, 1 usage/input error, 2 API failure,
            3 GENERIC_OUTPUT (no timestamps / too few capabilities found).

Secrets: GEMINI_API_KEY from environment or repo-root .env (never hardcoded).
google-genai self-installs via pip (cafe-PC defreezer wipes site-packages).

NOTE (TUNED guardrail): ANALYSIS_PROMPT below is a NEW prompt awaiting Neil's
sign-off — see workflows/edit_like_this_video.md "Gated items".
"""

import argparse
import importlib
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT_DIR = REPO_ROOT / ".tmp" / "viral-intel"
DEFAULT_MODEL = "gemini-3.5-flash"

YOUTUBE_URL_RE = re.compile(
    r"^https?://(www\.)?(youtube\.com/(watch\?v=|shorts/)|youtu\.be/)[\w-]{11}"
)

ANALYSIS_PROMPT = """You are a video-pipeline engineer doing competitive product research. This video is a DEMO of an AI video editing tool (likely a Higgsfield plugin inside Adobe Premiere Pro / After Effects). Watch AND listen to the whole video before answering.

Your job: inventory every distinct capability the demo shows, then classify each one against a renderer that can ONLY do the following (call it "the ffmpeg renderer"): burned-in animated text captions (pop / word-pop / karaoke, preset fonts), SFX placement from a fixed sound bank, music bed with ducking, hard cuts, flash/dip/whip/film-burn transitions, and digital zoom/pan on existing footage. Anything that changes the CONTENT of frames (adding/removing objects or people, backgrounds, VFX composited into the scene, upscaling, reframing with outpainting) is beyond it.

Return ONLY a JSON object with this exact shape (no markdown fence, no prose):

{
  "video": {"duration_s": <number>, "tool_demoed": "<product/plugin name as shown or said>", "host_app": "<Premiere Pro | After Effects | web | other>", "language": "<spoken language(s)>"},
  "claimed_models": ["<every AI model named on screen or in VO, e.g. Seedance 2.0, Kling, Veo — empty if none>"],
  "capabilities": [
    {
      "name": "<short capability name, e.g. 'prompt-based object removal'>",
      "timestamp": "<the second(s) where it is demoed, e.g. 12.5-18.0>",
      "what_happens_on_screen": "<exactly what the user does and what the result looks like>",
      "inputs": "<what the user provides: prompt text, brush stroke, drag-and-drop, clip selection>",
      "classification": "<ffmpeg-replicable-today | ffmpeg-with-new-filter-work | generation-side | out-of-scope>",
      "grifon_mapping": "<which part of an ad-render pipeline this maps to: a caption/text preset field, transition/SFX, video generation prompt, image-edit-then-regenerate loop, or 'none — <why>'>",
      "confidence": "<high | medium | low>"
    }
  ],
  "text_overlays": {"shown": <bool>, "style": "<font weight/size/placement of any big overlay text demoed, e.g. 'Canva-style extra-bold centered'>", "animated": <bool>, "timestamp": "<where>"},
  "vfx_shown": ["<each VFX/effect demoed + timestamp + whether it is composited INTO the scene (looks real) or an overlay>"],
  "workflow_narrative": "<2-4 sentences: the end-to-end workflow the demo sells, in order>",
  "transcript": "<verbatim VO/dialogue transcript, or '<no speech>' if none>",
  "weaknesses_or_caveats": ["<anything the demo glosses over: render wait, credits cost, artifacts visible on screen — with timestamp>"]
}

HARD RULES:
- Every capability and VFX entry MUST cite a timestamp. A capability list without timestamps is a failed analysis.
- Report what IS demoed, not what the product page claims. If a feature is only mentioned in text on screen but not shown working, mark confidence low and say so in what_happens_on_screen.
- classification must use exactly one of the four allowed values.
- transcript must be verbatim, not summarized.
"""

ALLOWED_CLASSIFICATIONS = {
    "ffmpeg-replicable-today",
    "ffmpeg-with-new-filter-work",
    "generation-side",
    "out-of-scope",
}

REQUIRED_TOP_KEYS = [
    "video", "claimed_models", "capabilities", "text_overlays",
    "vfx_shown", "workflow_narrative", "transcript",
]


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
            [sys.executable, "-m", "pip", "install", "--quiet", pip_name],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            fail(2, "DEPENDENCY_INSTALL_FAILED", f"{pip_name}: {result.stderr.strip()[-500:]}")
        return importlib.import_module(import_name)


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return slug[:60] or "demo"


def upload_local_file(client, video_path: Path):
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
    return uploaded


def analyze_with_gemini(video_ref: str, model: str, api_key: str) -> dict:
    genai = ensure_package("google.genai", "google-genai")
    client = genai.Client(api_key=api_key)

    if YOUTUBE_URL_RE.match(video_ref):
        # Native YouTube ingestion: Gemini watches the public URL directly,
        # no yt-dlp / Files API round-trip. Public videos only.
        print(f"[ingest] YouTube URL passed straight to Gemini", file=sys.stderr)
        video_part = {"file_data": {"file_uri": video_ref}}
    else:
        path = Path(video_ref)
        if not path.is_file():
            fail(1, "INPUT_NOT_FOUND",
                 f"not a YouTube URL and no such file: {video_ref} "
                 "(non-YouTube URLs: download manually or via tools/analyze_video.py's ladder, then pass the file)")
        video_part = upload_local_file(client, path)

    print(f"[analyze] model={model}", file=sys.stderr)
    try:
        response = client.models.generate_content(
            model=model,
            contents=[video_part, ANALYSIS_PROMPT],
            config={"response_mime_type": "application/json", "temperature": 0.2},
        )
    except Exception as exc:  # surface quota/ingestion errors with the right exit code
        fail(2, "GEMINI_CALL_FAILED", f"{type(exc).__name__}: {exc}")
    text = (response.text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\s*|\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        fail(2, "BAD_MODEL_JSON", f"{exc} — first 300 chars: {text[:300]}")


def validate_specificity(analysis: dict) -> list[str]:
    """Same philosophy as analyze_video.py: an inventory without timestamps or
    with mushy classifications is re-promptable noise, not matrix material."""
    problems = []
    for key in REQUIRED_TOP_KEYS:
        if key not in analysis:
            problems.append(f"missing top-level key: {key}")
    caps = analysis.get("capabilities") or []
    if len(caps) < 3:
        problems.append(f"capabilities has {len(caps)} entries (a tool demo shows >= 3)")
    for i, cap in enumerate(caps):
        if not re.search(r"\d", str(cap.get("timestamp", ""))):
            problems.append(f"capabilities[{i}] ({cap.get('name', '?')}) has no timestamp")
        cls = str(cap.get("classification", "")).strip()
        if cls not in ALLOWED_CLASSIFICATIONS:
            problems.append(f"capabilities[{i}] classification {cls!r} not in allowed set")
        if not str(cap.get("grifon_mapping", "")).strip():
            problems.append(f"capabilities[{i}] grifon_mapping is empty")
    return problems


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Gemini capability-demo analysis -> Grifon capability matrix JSON")
    parser.add_argument("video", help="youtube.com/youtu.be URL or local video file path")
    parser.add_argument("--label", default="", help="output filename slug, e.g. higgsfield-demo-1")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR))
    args = parser.parse_args()

    api_key = load_env_key("GEMINI_API_KEY")
    if not api_key:
        fail(1, "GEMINI_NOT_CONFIGURED", "GEMINI_API_KEY not in environment or .env")

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    analysis = analyze_with_gemini(args.video, args.model, api_key)
    problems = validate_specificity(analysis)

    label = args.label or slugify(args.video.rsplit("/", 1)[-1])
    result = {
        "meta": {
            "source_ref": args.video,
            "label": label,
            "kind": "capability-demo",
            "model": args.model,
            "analyzed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
        "analysis": analysis,
    }
    out_path = out_dir / f"{slugify(label)}.json"
    out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    if problems:
        print(json.dumps(result, indent=2, ensure_ascii=False))
        fail(3, "GENERIC_OUTPUT",
             "analysis failed the specificity validator (saved to "
             f"{out_path} for inspection):\n  - " + "\n  - ".join(problems))

    print(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"[done] wrote {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
