#!/usr/bin/env python3
"""Cinematic pipeline driver: turn a shot manifest into rendered Seedance clips.

This is a thin ORCHESTRATOR — it owns no image/video logic of its own. It chains
the two real execution layers, per shot, resumably:

  1) keyframe(s)  ->  Codex CLI gpt-image-2  (.claude/skills/codex-image/generate.mjs)
  2) video        ->  Seedance 2.0 API       (tools/seedance_render.py)

Local prototyping tool: validate a whole ad cheaply on your PC before any in-app
wiring. Codex images bill to your ChatGPT plan (no API charge); only the Seedance
step spends video credits — so iterate keyframes first, render last.

Usage:
  python tools/cinematic_pipeline.py --manifest <shots.json> [--out-dir DIR]
                                     [--force] [--keyframes-only] [--dry-run]

Manifest (JSON):
  {
    "project": "bukidnon-brew-launch",
    "shots": [
      {
        "id": "scene1",
        "keyframe_prompt": "Codex gpt-image-2 prompt for the FIRST frame…",
        "keyframe_size": "1024x1536",          // optional, default 1024x1536
        "last_frame_prompt": "…",               // optional end keyframe
        "video_prompt": "Seedance prompt (English, < ~1000 words)…",
        "aspect": "9:16", "duration": 5, "mode": "standard"
      }
    ]
  }

Outputs land in <out-dir>/<project>/ : <id>.png (+ <id>.end.png), <id>.mp4.
Re-runnable: existing keyframes/clips are skipped unless --force.
--keyframes-only stops after images (cheap pass to lock assets first).
--dry-run prints every command without running anything (no Codex/key needed).

Exit codes: 0 ok, 1 usage/manifest error, 2 a sub-step failed.
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CODEX_GEN = REPO_ROOT / ".claude" / "skills" / "codex-image" / "generate.mjs"
SEEDANCE = REPO_ROOT / "tools" / "seedance_render.py"
DEFAULT_OUT_DIR = REPO_ROOT / ".tmp" / "cinematic"


def run(cmd: list[str], dry: bool) -> bool:
    printable = " ".join(str(c) for c in cmd)
    if dry:
        print(f"  DRY  {printable}")
        return True
    print(f"  RUN  {printable}", file=sys.stderr)
    return subprocess.run(cmd).returncode == 0


def keyframe(prompt: str, out: Path, size: str, dry: bool, force: bool) -> bool:
    if out.exists() and not force:
        print(f"  skip keyframe (exists): {out}", file=sys.stderr)
        return True
    return run(["node", str(CODEX_GEN), "--prompt", prompt, "--out", str(out), "--size", size], dry)


def main() -> int:
    ap = argparse.ArgumentParser(description="Drive Codex keyframes -> Seedance renders from a shot manifest.")
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR))
    ap.add_argument("--force", action="store_true", help="regenerate even if outputs exist")
    ap.add_argument("--keyframes-only", action="store_true", help="stop after images (lock assets first)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    mpath = Path(args.manifest)
    if not mpath.exists():
        sys.exit(f"[pipeline] manifest not found: {mpath}")
    try:
        manifest = json.loads(mpath.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        sys.exit(f"[pipeline] bad manifest JSON: {e}")

    project = manifest.get("project", "untitled")
    shots = manifest.get("shots", [])
    if not shots:
        sys.exit("[pipeline] manifest has no shots[]")

    proj_dir = Path(args.out_dir) / project
    proj_dir.mkdir(parents=True, exist_ok=True)
    print(f"[pipeline] project '{project}' — {len(shots)} shot(s) -> {proj_dir}", file=sys.stderr)

    rendered, failed = [], []
    for i, shot in enumerate(shots, 1):
        sid = str(shot.get("id") or f"shot{i}")
        size = shot.get("keyframe_size", "1024x1536")
        print(f"\n[pipeline] {sid} ({i}/{len(shots)})", file=sys.stderr)

        first_png = proj_dir / f"{sid}.png"
        if not shot.get("keyframe_prompt"):
            print(f"  [skip] {sid}: no keyframe_prompt", file=sys.stderr)
            failed.append(sid)
            continue
        if not keyframe(shot["keyframe_prompt"], first_png, size, args.dry_run, args.force):
            failed.append(sid)
            continue

        last_png = None
        if shot.get("last_frame_prompt"):
            last_png = proj_dir / f"{sid}.end.png"
            if not keyframe(shot["last_frame_prompt"], last_png, size, args.dry_run, args.force):
                failed.append(sid)
                continue

        if args.keyframes_only:
            continue

        mp4 = proj_dir / f"{sid}.mp4"
        if mp4.exists() and not args.force:
            print(f"  skip render (exists): {mp4}", file=sys.stderr)
            rendered.append(str(mp4))
            continue

        cmd = [sys.executable, str(SEEDANCE),
               "--first-frame", str(first_png),
               "--prompt", shot.get("video_prompt", ""),
               "--aspect", shot.get("aspect", "9:16"),
               "--duration", str(shot.get("duration", 5)),
               "--mode", shot.get("mode", "standard"),
               "--out-dir", str(proj_dir), "--slug", sid]
        if last_png:
            cmd += ["--last-frame", str(last_png)]
        if args.dry_run:
            cmd.append("--dry-run")
        if run(cmd, args.dry_run):
            rendered.append(str(mp4))
        else:
            failed.append(sid)

    print(f"\n[pipeline] done — {len(rendered)} clip(s); {len(failed)} failed: {failed}", file=sys.stderr)
    for m in rendered:
        print(m)
    return 2 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
