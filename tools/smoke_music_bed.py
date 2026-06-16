#!/usr/bin/env python3
"""Generate two sample music beds via ElevenLabs Music for a quick listen test.

This is the dependency-free, app-free version of the PRD's A/B listen gate for
the generative-music-bed feature (api/music/compose). It calls the SAME
ElevenLabs Music endpoint the server uses, so what you hear here is what the
render would duck under the VO.

Usage:
    ELEVEN_LABS_API_KEY=sk_... python3 tools/smoke_music_bed.py

Output:
    .tmp/smoke-music-mrbeast.mp3
    .tmp/smoke-music-testimonial.mp3

Then listen and compare against the tuned static beds in
api/_lib/assets/music/*.mp3 before flipping GRIFON_MUSIC_GEN_ENABLED on.

Stdlib only (urllib) — no pip install, matches the tools/ convention.
"""

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

# The two most-contrasting styles. KEEP IN SYNC with MUSIC_STYLE_PROMPTS in
# api/_lib/musicPrompts.ts (that file is the source of truth; this is a listen
# aid). If you tune a prompt there, mirror it here before re-running the test.
PROMPTS = {
    "mrbeast": (
        "High-energy instrumental hype background music for a fast-paced social ad. "
        "Driving electronic drums, punchy bass, rising tension, ~120 BPM, modern and "
        "exciting. Strictly instrumental — no vocals, no lyrics, no vocal chops. Keep "
        "the midrange clean and the dynamics steady so a spoken voiceover sits clearly "
        "on top."
    ),
    "testimonial": (
        "Warm, sincere instrumental background music for a trustworthy testimonial ad. "
        "Soft piano or warm pads, gentle pulse, understated and emotional, ~90 BPM. "
        "Strictly instrumental — no vocals, no lyrics. Low and supportive, leaving plenty "
        "of headroom for a calm spoken voiceover."
    ),
}

MUSIC_LENGTH_MS = 30_000  # ~30s sample
ENDPOINT = "https://api.elevenlabs.io/v1/music"
OUT_DIR = Path(".tmp")


def compose(api_key: str, prompt: str) -> bytes:
    body = json.dumps({
        "prompt": prompt,
        "music_length_ms": MUSIC_LENGTH_MS,
        "force_instrumental": True,
        "output_format": "mp3_44100_128",
    }).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        method="POST",
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def main() -> int:
    api_key = os.environ.get("ELEVEN_LABS_API_KEY")
    if not api_key:
        print("ERROR: set ELEVEN_LABS_API_KEY in your environment first.", file=sys.stderr)
        print("  ELEVEN_LABS_API_KEY=sk_... python3 tools/smoke_music_bed.py", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    failures = 0
    for style, prompt in PROMPTS.items():
        out = OUT_DIR / f"smoke-music-{style}.mp3"
        print(f"[{style}] generating {MUSIC_LENGTH_MS // 1000}s bed …", flush=True)
        try:
            audio = compose(api_key, prompt)
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:300]
            print(f"[{style}] FAILED: HTTP {e.code} — {detail}", file=sys.stderr)
            failures += 1
            continue
        except Exception as e:  # noqa: BLE001 — surface any transport error plainly
            print(f"[{style}] FAILED: {e}", file=sys.stderr)
            failures += 1
            continue
        out.write_bytes(audio)
        print(f"[{style}] wrote {out}  ({len(audio):,} bytes)")

    if failures:
        print(f"\n{failures} of {len(PROMPTS)} beds failed.", file=sys.stderr)
        return 1
    print(f"\nDone. Listen to the beds in {OUT_DIR}/ and compare against "
          "api/_lib/assets/music/*.mp3.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
