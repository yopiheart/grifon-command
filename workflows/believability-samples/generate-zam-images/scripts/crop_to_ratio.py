#!/usr/bin/env python3
"""Crop an image to an exact aspect ratio around a configurable focus point."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def parse_ratio(value: str) -> float:
    try:
        width, height = value.split(":", 1)
        ratio = float(width) / float(height)
    except (ValueError, ZeroDivisionError) as exc:
        raise argparse.ArgumentTypeError("ratio must look like 4:5, 1:1, or 9:16") from exc
    if ratio <= 0:
        raise argparse.ArgumentTypeError("ratio values must be positive")
    return ratio


def clamp(value: int, low: int, high: int) -> int:
    return max(low, min(value, high))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--ratio", required=True, type=parse_ratio)
    parser.add_argument("--focus-x", type=float, default=0.5)
    parser.add_argument("--focus-y", type=float, default=0.5)
    args = parser.parse_args()

    if not 0 <= args.focus_x <= 1 or not 0 <= args.focus_y <= 1:
        parser.error("focus values must be between 0 and 1")

    with Image.open(args.input) as source:
        image = source.convert("RGB") if source.mode not in {"RGB", "RGBA"} else source.copy()

    width, height = image.size
    source_ratio = width / height
    target_ratio = args.ratio

    if abs(source_ratio - target_ratio) < 1 / max(width, height):
        crop = image
    elif source_ratio < target_ratio:
        crop_height = max(1, round(width / target_ratio))
        center_y = round(args.focus_y * height)
        top = clamp(center_y - crop_height // 2, 0, height - crop_height)
        crop = image.crop((0, top, width, top + crop_height))
    else:
        crop_width = max(1, round(height * target_ratio))
        center_x = round(args.focus_x * width)
        left = clamp(center_x - crop_width // 2, 0, width - crop_width)
        crop = image.crop((left, 0, left + crop_width, height))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    save_kwargs = {"quality": 95} if args.output.suffix.lower() in {".jpg", ".jpeg"} else {}
    crop.save(args.output, **save_kwargs)
    out_width, out_height = crop.size
    print(f"saved {args.output} ({out_width}x{out_height})")


if __name__ == "__main__":
    main()
