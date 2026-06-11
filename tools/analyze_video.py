#!/usr/bin/env python3
"""Viral Autopsy analyzer: have Gemini watch a social video/ad and return an
evidence-bound Edit DNA breakdown as JSON.

One job: video in (URL or local file) -> structured analysis JSON out.
The viral-autopsy skill (.claude/skills/viral-autopsy/) orchestrates what
happens with the result (swipe-file entry, pattern index, remix).

Usage:
  python tools/analyze_video.py <url-or-path> [--niche NICHE] [--source SOURCE]
                                [--model MODEL] [--out-dir DIR]

  url-or-path   http(s) URL (downloaded via yt-dlp) or a local video file
  --niche       e.g. "skincare PH", "home tools" (recorded in output metadata)
  --source      e.g. tiktok | fb-ad-library | youtube | instagram | file
  --model       Gemini model id (default: gemini-3.5-flash)
  --out-dir     where to write artifacts (default: .tmp/viral-intel)

Output: analysis JSON on stdout, also written to <out-dir>/<slug>.json.
Exit codes: 0 ok, 1 usage/input error, 2 download/API failure,
            3 GENERIC_OUTPUT (analysis failed the specificity validator).

Secrets: GEMINI_API_KEY from environment or repo-root .env (never hardcoded).
Dependencies (yt-dlp, google-genai) self-install via pip because the cafe-PC
defreezer wipes site-packages on reboot.
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
MAX_DOWNLOAD_HEIGHT = 720  # plenty for analysis, keeps upload small/cheap

ANALYSIS_PROMPT = """You are a direct-response video editor doing a forensic autopsy of this video for a swipe file. Watch AND listen to the whole video before answering.

Return ONLY a JSON object with this exact shape (no markdown fence, no prose):

{
  "video": {"duration_s": <number>, "format_guess": "<talking-head UGC | VSL | b-roll montage | skit | listicle | demo | other>", "language": "<spoken language(s)>", "platform_native_style": "<which platform this edit grammar belongs to>"},
  "hook": {
    "first_3s_timeline": [{"t": "<start-end seconds, e.g. 0.0-0.8>", "what": "<exactly what is on screen and in audio>"}],
    "text_on_frame_1": <bool>,
    "first_on_screen_text": "<verbatim text or null>",
    "subject_or_product_visible_at_s": <number>,
    "hook_type": "<pattern interrupt | bold claim | question | curiosity gap | in-medias-res | stunt | other>",
    "spoken_hook_verbatim": "<first sentence(s) of VO/dialogue>"
  },
  "shots": {"count": <int>, "median_shot_s": <number>, "shortest_shot_s": <number>, "longest_shot_s": <number>},
  "perceived_pace_driver": "<what makes it FEEL fast: cut rate / caption churn / camera motion / content swaps / escalation — be specific with a measured rate>",
  "captions": {"present": <bool>, "chunk_words": "<e.g. 1-3>", "swap_interval_s": <number or null>, "case": "<ALL-CAPS | sentence | mixed>", "color": "<dominant + emphasis colors>", "screen_height_pct": "<approx vertical position, e.g. 55-60%>", "treatment": "<outline+shadow | background box | plain>", "animation": "<pop | karaoke fill | instant swap | word-pop | none>", "emphasis_method": "<solo word card | color shift | scale punch | none>"},
  "edit_grammar": {"transitions": ["<each distinct transition type + where used, with timestamp>"], "sfx_hits": ["<sfx + timestamp, or empty>"], "music": "<role + dynamics, or none>", "silences_over_0_3s": <int>, "dead_air_notes": "<where, if any>"},
  "camera": "<static / drift / constant zoom %s / punch-ins / handheld — with rates and where>",
  "product_reveal": {"at_s": <number or null>, "mechanic": "<in-frame-from-start | hard cut | title-card slam | unboxing | n/a>"},
  "proof_elements": ["<graphic/spoken proof + timestamp, e.g. 'follower-count pill at 12.4s'>"],
  "cta": {"first_at_s": <number or null>, "holds_to_final_frame": <bool>, "mechanic": "<spoken / caption / end card / pinned overlay>"},
  "storytelling_format": {"name": "<e.g. hook-problem-agitate-solve, listicle, transformation, testimonial>", "beats": [{"t": "<start-end s>", "beat": "<beat name>", "summary": "<one line>"}]},
  "transcript": "<full verbatim transcript of VO/dialogue>",
  "why_it_works": [{"claim": "<one specific reason this video retains/converts>", "timestamp": "<the second(s) that prove it>", "evidence": "<the measurable observation backing the claim — must contain a number (a duration, a rate, a count, a %)>", "confidence": "<high | medium | low>"}],
  "weaknesses": ["<anything this video does badly, with timestamp>"]
}

HARD RULES:
- Every entry in why_it_works MUST cite a timestamp and numeric evidence. "Strong hook" or "good pacing" without numbers is a failed analysis.
- Estimate numbers honestly from what you observe (shot lengths, caption swap rate, zoom speed). Approximate is fine; vague is not.
- transcript must be verbatim, not summarized.
- Report what IS there, not what should be. If captions are absent, say so.
"""

# why_it_works entries and core hook fields are checked for substance below;
# an analysis that fails these is re-promptable noise, not swipe-file material.
REQUIRED_TOP_KEYS = [
    "video", "hook", "shots", "perceived_pace_driver", "captions",
    "edit_grammar", "camera", "storytelling_format", "transcript",
    "why_it_works",
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
    return slug[:60] or "video"


def download_video(url: str, out_dir: Path) -> Path:
    ensure_package("yt_dlp", "yt-dlp")
    out_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        sys.executable, "-m", "yt_dlp", url,
        "--no-playlist",
        "-S", f"res:{MAX_DOWNLOAD_HEIGHT},ext:mp4:m4a",
        "-o", str(out_dir / "%(id)s.%(ext)s"),
        "--no-simulate",
        "--print", "after_move:filepath",
        "--quiet", "--no-warnings",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        fail(2, "DOWNLOAD_FAILED", result.stderr.strip()[-800:] or "yt-dlp gave no error output")
    filepath = result.stdout.strip().splitlines()[-1] if result.stdout.strip() else ""
    if not filepath or not Path(filepath).is_file():
        fail(2, "DOWNLOAD_FAILED", f"yt-dlp reported no output file (stdout: {result.stdout.strip()[:200]})")
    return Path(filepath)


def analyze_with_gemini(video_path: Path, model: str, api_key: str) -> dict:
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

    print(f"[analyze] model={model}", file=sys.stderr)
    response = client.models.generate_content(
        model=model,
        contents=[uploaded, ANALYSIS_PROMPT],
        config={"response_mime_type": "application/json", "temperature": 0.2},
    )
    text = (response.text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\s*|\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        fail(2, "BAD_MODEL_JSON", f"{exc} — first 300 chars: {text[:300]}")


def validate_specificity(analysis: dict) -> list[str]:
    """Countermeasure for the 'generic analysis' failure mode: every claim
    needs a timestamp and numeric evidence, or the run is rejected."""
    problems = []
    for key in REQUIRED_TOP_KEYS:
        if key not in analysis:
            problems.append(f"missing top-level key: {key}")
    hook = analysis.get("hook") or {}
    if not hook.get("first_3s_timeline"):
        problems.append("hook.first_3s_timeline is empty — no second-by-second hook breakdown")
    shots = analysis.get("shots") or {}
    if not isinstance(shots.get("count"), (int, float)) or shots.get("count", 0) <= 0:
        problems.append("shots.count missing or zero")
    claims = analysis.get("why_it_works") or []
    if len(claims) < 3:
        problems.append(f"why_it_works has {len(claims)} entries (need >= 3)")
    for i, claim in enumerate(claims):
        ts = str(claim.get("timestamp", "")).strip()
        ev = str(claim.get("evidence", "")).strip()
        if not re.search(r"\d", ts):
            problems.append(f"why_it_works[{i}] has no timestamp")
        if not re.search(r"\d", ev):
            problems.append(f"why_it_works[{i}] evidence has no measured value: {ev[:80]!r}")
    if len(str(analysis.get("transcript", "")).strip()) < 20:
        problems.append("transcript missing or suspiciously short")
    return problems


def main() -> None:
    parser = argparse.ArgumentParser(description="Gemini viral-video autopsy -> Edit DNA JSON")
    parser.add_argument("video", help="http(s) URL or local video file path")
    parser.add_argument("--niche", default="", help="niche/market tag for the swipe file")
    parser.add_argument("--source", default="", help="tiktok | fb-ad-library | youtube | instagram | file")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR))
    args = parser.parse_args()

    api_key = load_env_key("GEMINI_API_KEY")
    if not api_key:
        fail(1, "GEMINI_NOT_CONFIGURED", "GEMINI_API_KEY not in environment or .env")

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if re.match(r"^https?://", args.video):
        video_path = download_video(args.video, out_dir)
        source_ref = args.video
    else:
        video_path = Path(args.video)
        if not video_path.is_file():
            fail(1, "INPUT_NOT_FOUND", f"no such file: {video_path}")
        source_ref = str(video_path)

    analysis = analyze_with_gemini(video_path, args.model, api_key)
    problems = validate_specificity(analysis)

    result = {
        "meta": {
            "source_ref": source_ref,
            "local_file": str(video_path),
            "niche": args.niche,
            "source": args.source,
            "model": args.model,
            "analyzed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
        "analysis": analysis,
    }
    out_path = out_dir / f"{slugify(video_path.stem)}.json"
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
