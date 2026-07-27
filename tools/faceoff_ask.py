#!/usr/bin/env python3
"""faceoff_ask.py — Gemini lane runner for the Pegasus vs Gemini face-off.

Uploads a local video once via the Gemini Files API, then asks each question in
an independent generate_content call (mirrors the one-jockey_query-per-question
shape of the TwelveLabs lane). Plain-text answers, no schema — the questions ARE
the protocol (workflows/pegasus_gemini_faceoff.md).

Usage:
  python tools/faceoff_ask.py --video .tmp/faceoff/op2.mp4 \
      --questions .tmp/faceoff/questions.json --out .tmp/faceoff/lane-g.json

  --questions   JSON list of {"id": "Q1", "question": "..."}
  --model       Gemini model id (default: gemini-3.5-flash)
"""

import argparse
import importlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DEFAULT_MODEL = "gemini-3.5-flash"
REPO_ROOT = Path(__file__).resolve().parent.parent


def fail(code: int, tag: str, message: str) -> None:
    print(json.dumps({"error": tag, "detail": message}), file=sys.stderr)
    sys.exit(code)


def ensure_package(module: str, pip_name: str):
    try:
        return importlib.import_module(module)
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", pip_name])
        return importlib.import_module(module)


def load_api_key() -> str:
    key = os.environ.get("GEMINI_API_KEY", "")
    if not key:
        env_file = REPO_ROOT / ".env"
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
                if line.startswith("GEMINI_API_KEY="):
                    key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    if not key:
        fail(2, "NO_API_KEY", "GEMINI_API_KEY not in environment or .env")
    return key


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--questions", required=True)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    video_path = Path(args.video)
    if not video_path.exists():
        fail(2, "NO_VIDEO", f"{video_path} does not exist")
    questions = json.loads(Path(args.questions).read_text(encoding="utf-8"))

    genai = ensure_package("google.genai", "google-genai")
    client = genai.Client(api_key=load_api_key())

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

    answers = []
    for q in questions:
        print(f"[ask] {q['id']} model={args.model}", file=sys.stderr)
        response = client.models.generate_content(
            model=args.model,
            contents=[uploaded, q["question"]],
            config={"temperature": 0.2},
        )
        answers.append({"id": q["id"], "question": q["question"],
                        "answer": (response.text or "").strip()})

    out = {"lane": "G", "model": args.model, "video": str(video_path), "answers": answers}
    Path(args.out).write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[done] {len(answers)} answers -> {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
