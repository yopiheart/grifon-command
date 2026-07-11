#!/usr/bin/env python3
"""Reference-Stack ingest: turn a loose drop of ~60-70 dual-reference images
(MODEL REF + STYLE REF + OUTPUT + prompt screenshots) into a clean, paired
manifest so only distilled findings — never 70 raw images — enter context.

One job per subcommand:
  inventory  — one cheap Gemini vision call per image: classify its ROLE
               (model-ref | style-ref | output | prompt-screenshot | unknown) +
               compact face/scene descriptors + any OCR'd prompt text ->
               .tmp/refstack/inventory.json  (incremental; skips already-seen
               files unless --force).
  pair       — LOCAL only, no API: build model-ref + style-ref + output triplets
               (filename/folder heuristics first, descriptor overlap as fallback)
               + attach the prompt -> workflows/believability-refstack/manifest.json.
  report     — human-readable pairing table + unpaired list ->
               .tmp/refstack/pairing-report.md.

The believability-refstack plan (Phase 2) orchestrates what happens next; this
tool just gets the raw drop into a reviewable shape.

Usage:
  python tools/ingest_refstack.py inventory [--raw-dir .tmp/refstack/raw]
                                            [--model gemini-3.5-flash]
                                            [--out .tmp/refstack/inventory.json]
                                            [--limit N] [--force]
  python tools/ingest_refstack.py pair      [--inventory .tmp/refstack/inventory.json]
                                            [--raw-dir .tmp/refstack/raw]
                                            [--out workflows/believability-refstack/manifest.json]
  python tools/ingest_refstack.py report    [--manifest ...] [--out .tmp/refstack/pairing-report.md]

Exit codes: 0 ok, 1 usage/input error, 2 API failure, 3 GENERIC_OUTPUT
(inventory produced too many unusable classifications).

Secrets: GEMINI_API_KEY from environment or repo-root .env (never hardcoded).
google-genai / Pillow self-install via pip because the cafe-PC defreezer wipes
site-packages on reboot (Pillow is optional — dims are skipped if it won't load).
"""

import argparse
import importlib
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_RAW_DIR = REPO_ROOT / ".tmp" / "refstack" / "raw"
DEFAULT_INVENTORY = REPO_ROOT / ".tmp" / "refstack" / "inventory.json"
DEFAULT_MANIFEST = REPO_ROOT / "workflows" / "believability-refstack" / "manifest.json"
DEFAULT_REPORT = REPO_ROOT / ".tmp" / "refstack" / "pairing-report.md"
DEFAULT_MODEL = "gemini-3.5-flash"

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
TEXT_EXTS = {".txt", ".md"}

ROLE_VALUES = {"model-ref", "style-ref", "output", "prompt-screenshot", "unknown"}
AI_GUESS_VALUES = {"real-photo", "likely-ai", "unsure"}

INVENTORY_PROMPT = """You are triaging one image from a loose drop of dual-reference AI-UGC experiments. The set mixes four kinds of image, and you must classify THIS one.

Return ONLY a JSON object with this exact shape (no markdown fence, no prose):

{
  "role": "model-ref | style-ref | output | prompt-screenshot | unknown",
  "role_reasoning": "<one sentence: the concrete visual evidence that decided the role>",
  "face": {"present": <bool>, "descriptor": "<compact face descriptor: gender, age band, hair, distinguishing features — empty string if no face>", "count": <int number of distinct faces>},
  "scene": {"descriptor": "<compact scene descriptor: setting, lighting style, camera angle, background>"},
  "ocr_text": "<any visible overlaid or prompt text, VERBATIM; empty string if none>",
  "is_ai_generated_guess": "real-photo | likely-ai | unsure"
}

CLASSIFICATION HINTS:
- model-ref: a clean photo of a SINGLE person (often neutral/casual, plain framing). Across the set the SAME face tends to recur many times — this is the identity ground truth.
- style-ref: a scene/aesthetic reference — its value is the lighting, skin rendering, posing, camera angle, and background. May contain a DIFFERENT person, or no clear face emphasis at all.
- output: an AI generation that COMBINES a recurring face (the model-ref person) with a style. It will read as a produced photo of the model-ref person inside a style-ref-like scene.
- prompt-screenshot: mostly TEXT — a screenshot of a chat/prompt/UI. Put the text in ocr_text.
- unknown: genuinely cannot tell.

HARD RULES:
- role MUST be exactly one of the five enum values.
- face.descriptor and scene.descriptor must be concrete and specific (not "a person", not "a room"). If there is truly no face, face.present is false and descriptor is "".
- ocr_text is VERBATIM. Do not summarise or invent text. Empty string when there is none.
- is_ai_generated_guess: judge from concrete tells (skin texture/pores, hands, teeth, eyes, plastic sheen, impossible lighting) — not vibes.
"""


def fail(code: int, label: str, detail: str) -> None:
    print(f"{label}: {detail}", file=sys.stderr)
    sys.exit(code)


def load_env_key(name: str) -> "str | None":
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


def try_import(import_name: str, pip_name: str):
    """Soft dependency: return the module or None. Unlike ensure_package this
    never aborts — used for Pillow, whose absence just means we skip pixel dims."""
    try:
        return importlib.import_module(import_name)
    except ImportError:
        print(f"[setup] attempting optional install of {pip_name}", file=sys.stderr)
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "--quiet", pip_name],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            print(f"[setup] {pip_name} unavailable — continuing without it", file=sys.stderr)
            return None
        try:
            return importlib.import_module(import_name)
        except ImportError:
            return None


def rel_posix(path: Path, root: Path) -> str:
    """Path relative to root, forward-slashed, so manifests are stable across OSes."""
    return path.resolve().relative_to(root.resolve()).as_posix()


def mime_for(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in (".jpg", ".jpeg"):
        return "image/jpeg"
    if ext == ".webp":
        return "image/webp"
    return "image/png"


# ---------------------------------------------------------------------------
# inventory
# ---------------------------------------------------------------------------

def _strip_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\s*|\s*```$", "", text)
    return text.strip()


def classify_image(client, types_mod, model: str, path: Path) -> dict:
    """One Gemini vision call -> role/descriptor JSON. Retries once on a
    rate-limit / server error with a short backoff (rate-friendly batch)."""
    raw = path.read_bytes()
    part = types_mod.Part.from_bytes(data=raw, mime_type=mime_for(path))
    last_err = None
    for attempt in range(2):
        try:
            response = client.models.generate_content(
                model=model,
                contents=[part, INVENTORY_PROMPT],
                config={"response_mime_type": "application/json", "temperature": 0.2},
            )
            text = _strip_fence(response.text or "")
            return json.loads(text)
        except Exception as exc:  # noqa: BLE001 — SDK raises varied exception types
            last_err = exc
            msg = str(exc)
            retryable = any(code in msg for code in ("429", "500", "502", "503", "504")) \
                or "RESOURCE_EXHAUSTED" in msg or "UNAVAILABLE" in msg
            if attempt == 0 and retryable:
                print(f"  [retry] {path.name}: {msg[:120]}", file=sys.stderr)
                time.sleep(6)
                continue
            break
    fail(2, "CLASSIFY_FAILED", f"{path.name}: {last_err}")


def normalize_classification(raw: dict) -> dict:
    """Coerce a model response into the inventory shape, tolerating omissions."""
    role = raw.get("role")
    if role not in ROLE_VALUES:
        role = "unknown"
    face = raw.get("face") or {}
    scene = raw.get("scene") or {}
    guess = raw.get("is_ai_generated_guess")
    if guess not in AI_GUESS_VALUES:
        guess = "unsure"
    return {
        "role": role,
        "role_reasoning": str(raw.get("role_reasoning", "")).strip(),
        "face": {
            "present": bool(face.get("present", False)),
            "descriptor": str(face.get("descriptor", "")).strip(),
            "count": int(face.get("count", 0)) if str(face.get("count", "")).strip().lstrip("-").isdigit() else 0,
        },
        "scene": {"descriptor": str(scene.get("descriptor", "")).strip()},
        "ocr_text": str(raw.get("ocr_text", "")).strip(),
        "is_ai_generated_guess": guess,
    }


def get_dims(pil_mod, path: Path):
    if pil_mod is None:
        return None
    try:
        with pil_mod.open(path) as im:
            return [im.width, im.height]
    except Exception:  # noqa: BLE001 — a corrupt file shouldn't kill the run
        return None


def cmd_inventory(args) -> None:
    raw_dir = Path(args.raw_dir)
    if not raw_dir.is_dir():
        fail(1, "RAW_DIR_NOT_FOUND", f"no such directory: {raw_dir}")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Incremental: keep prior entries whose file still exists unless --force.
    existing_by_path: dict = {}
    if out_path.is_file() and not args.force:
        try:
            prior = json.loads(out_path.read_text(encoding="utf-8"))
            for entry in prior.get("files", []):
                existing_by_path[entry.get("path")] = entry
        except (json.JSONDecodeError, OSError):
            print(f"[inventory] could not read prior {out_path}; starting fresh", file=sys.stderr)

    all_files = sorted(p for p in raw_dir.rglob("*") if p.is_file())
    pil_mod = None  # lazy: only load Pillow if we actually meet an image
    client = None
    types_mod = None

    files_out: list = []
    processed_new = 0
    generic_fails = 0

    for path in all_files:
        rel = rel_posix(path, raw_dir)
        ext = path.suffix.lower()

        # Skip already-inventoried files (that still exist) unless forced.
        if rel in existing_by_path and not args.force:
            files_out.append(existing_by_path[rel])
            continue

        if args.limit is not None and processed_new >= args.limit and ext in IMAGE_EXTS:
            # limit only caps NEW image classifications (the paid work);
            # cheap sidecar/text capture still runs so nothing is dropped.
            continue

        try:
            size_bytes = path.stat().st_size
        except OSError:
            size_bytes = None

        if ext in IMAGE_EXTS:
            if client is None:
                api_key = load_env_key("GEMINI_API_KEY")
                if not api_key:
                    fail(1, "GEMINI_NOT_CONFIGURED", "GEMINI_API_KEY not in environment or .env")
                genai = ensure_package("google.genai", "google-genai")
                types_mod = importlib.import_module("google.genai.types")
                client = genai.Client(api_key=api_key)
                pil_image = try_import("PIL.Image", "Pillow")
                pil_mod = pil_image
            print(f"[classify] {rel}", file=sys.stderr)
            classification = normalize_classification(
                classify_image(client, types_mod, args.model, path)
            )
            if classification["role"] == "unknown" and not classification["role_reasoning"]:
                generic_fails += 1
            entry = {
                "path": rel,
                "kind": "image",
                "size_bytes": size_bytes,
                "dims": get_dims(pil_mod, path),
                **classification,
            }
            files_out.append(entry)
            processed_new += 1
            time.sleep(1.0)  # rate-friendly spacing between calls
        else:
            entry = {
                "path": rel,
                "kind": "sidecar",
                "size_bytes": size_bytes,
                "dims": None,
                "role": "sidecar",
            }
            if ext in TEXT_EXTS:
                try:
                    entry["text_content"] = path.read_text(encoding="utf-8", errors="replace")
                except OSError as exc:
                    entry["text_content"] = ""
                    print(f"[inventory] could not read {rel}: {exc}", file=sys.stderr)
            files_out.append(entry)

    # Stable ordering by path so re-runs diff cleanly.
    files_out.sort(key=lambda e: e.get("path", ""))
    inventory = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "raw_dir": rel_posix(raw_dir, REPO_ROOT) if raw_dir.resolve().is_relative_to(REPO_ROOT) else str(raw_dir),
        "model": args.model,
        "files": files_out,
    }
    out_path.write_text(json.dumps(inventory, indent=2, ensure_ascii=False), encoding="utf-8")

    image_count = sum(1 for e in files_out if e.get("kind") == "image")
    print(f"[done] inventoried {len(files_out)} files ({image_count} images, "
          f"{processed_new} newly classified) -> {out_path}", file=sys.stderr)

    # GENERIC_OUTPUT gate: if the classifier bailed to bare 'unknown' on most of
    # the new images, the run is noise — surface it as exit 3.
    if processed_new >= 3 and generic_fails > processed_new / 2:
        fail(3, "GENERIC_OUTPUT",
             f"{generic_fails}/{processed_new} new images came back as blank 'unknown' — "
             "classifier likely mis-prompted or the drop is not what we expect "
             f"(inventory still saved to {out_path}).")


# ---------------------------------------------------------------------------
# pair (local only)
# ---------------------------------------------------------------------------

_STOPWORDS = {
    "a", "an", "the", "of", "in", "on", "at", "with", "and", "or", "to", "is",
    "her", "his", "their", "its", "this", "that", "for", "by", "from", "photo",
    "image", "person", "background", "wearing", "young", "man", "woman", "shot",
}


def tokenize(text: str) -> set:
    toks = re.split(r"[^a-z0-9]+", (text or "").lower())
    return {t for t in toks if t and t not in _STOPWORDS and len(t) > 1}


def overlap_score(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    if inter == 0:
        return 0.0
    return inter / min(len(a), len(b))


def stem_numbers(path: str) -> set:
    return set(re.findall(r"\d+", Path(path).stem))


def parent_dir(path: str) -> str:
    return str(Path(path).parent.as_posix())


def cmd_pair(args) -> None:
    inv_path = Path(args.inventory)
    if not inv_path.is_file():
        fail(1, "INVENTORY_NOT_FOUND", f"no such file: {inv_path} (run `inventory` first)")
    try:
        inventory = json.loads(inv_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        fail(1, "BAD_INVENTORY", f"could not parse {inv_path}: {exc}")

    files = inventory.get("files", [])
    by_path = {e["path"]: e for e in files if "path" in e}
    images = [e for e in files if e.get("kind") == "image"]

    outputs = [e for e in images if e.get("role") == "output"]
    model_refs = [e for e in images if e.get("role") == "model-ref"]
    style_refs = [e for e in images if e.get("role") == "style-ref"]
    prompt_shots = [e for e in images if e.get("role") == "prompt-screenshot"]
    text_sidecars = [e for e in files if e.get("kind") == "sidecar" and e.get("text_content")]

    # A single big prompts.txt is a common drop shape — keep it separate so we
    # can slice per-output segments out of it.
    prompts_txt = next(
        (e for e in text_sidecars if Path(e["path"]).name.lower() == "prompts.txt"), None
    )

    def match_ref(output_entry, candidates, descriptor_key):
        """Filename/folder heuristics FIRST, descriptor overlap as fallback.
        Returns (path, confidence) or (None, None)."""
        if not candidates:
            return None, None
        o_path = output_entry["path"]
        o_folder = parent_dir(o_path)
        o_nums = stem_numbers(o_path)

        # 1. Same folder AND shared numeric stem (e.g. 07-model / 07-out).
        for c in candidates:
            if parent_dir(c["path"]) == o_folder and o_nums and (o_nums & stem_numbers(c["path"])):
                return c["path"], "high"
        # 2. Shared numeric stem anywhere (numbered conventions across folders).
        for c in candidates:
            if o_nums and (o_nums & stem_numbers(c["path"])):
                return c["path"], "high"
        # 3. Same folder, single candidate -> obvious grouping.
        same_folder = [c for c in candidates if parent_dir(c["path"]) == o_folder]
        if len(same_folder) == 1:
            return same_folder[0]["path"], "high"
        # 4. Descriptor token overlap (best score wins), low confidence.
        if descriptor_key == "face":
            o_tokens = tokenize((output_entry.get("face") or {}).get("descriptor", ""))
            scored = [(overlap_score(o_tokens, tokenize((c.get("face") or {}).get("descriptor", ""))), c) for c in candidates]
        else:
            o_tokens = tokenize((output_entry.get("scene") or {}).get("descriptor", ""))
            scored = [(overlap_score(o_tokens, tokenize((c.get("scene") or {}).get("descriptor", ""))), c) for c in candidates]
        scored.sort(key=lambda t: t[0], reverse=True)
        best_score, best = scored[0]
        if best_score > 0:
            return best["path"], "low"
        # 5. Nothing matched but there IS a dominant recurring ref — fall back to
        # the most common one so the triplet is still assemblable (flag it low).
        if len(candidates) == 1:
            return candidates[0]["path"], "low"
        return None, None

    def find_prompt(output_entry):
        """Priority: sidecar .txt (stem match > same folder) > OCR from a
        prompt-screenshot in the same folder > a prompts.txt segment naming the
        output > empty."""
        o_path = output_entry["path"]
        o_stem = Path(o_path).stem
        o_folder = parent_dir(o_path)

        # 1a. Sidecar .txt whose stem matches the output stem.
        for s in text_sidecars:
            if s is prompts_txt:
                continue
            if Path(s["path"]).stem == o_stem:
                return s.get("text_content", "").strip(), "sidecar"
        # 1b. Sidecar .txt in the same folder.
        for s in text_sidecars:
            if s is prompts_txt:
                continue
            if parent_dir(s["path"]) == o_folder:
                return s.get("text_content", "").strip(), "sidecar"
        # 2. OCR text from a prompt-screenshot in the same folder.
        for ps in prompt_shots:
            if parent_dir(ps["path"]) == o_folder and ps.get("ocr_text"):
                return ps["ocr_text"].strip(), "ocr"
        # 3. A prompts.txt segment that names this output's filename or stem.
        if prompts_txt:
            text = prompts_txt.get("text_content", "")
            seg = _slice_prompts_txt(text, Path(o_path).name, o_stem)
            if seg:
                return seg, "prompts-txt"
        return "", "none"

    triplets = []
    used = set()
    for i, out in enumerate(sorted(outputs, key=lambda e: e["path"]), start=1):
        model_path, model_conf = match_ref(out, model_refs, "face")
        style_path, style_conf = match_ref(out, style_refs, "scene")
        prompt_text, prompt_source = find_prompt(out)

        confs = [c for c in (model_conf, style_conf) if c]
        confidence = "high" if confs and all(c == "high" for c in confs) and model_path and style_path else "low"
        needs_confirmation = confidence == "low" or not model_path or not style_path

        notes_bits = []
        if not model_path:
            notes_bits.append("no model-ref matched")
        if not style_path:
            notes_bits.append("no style-ref matched")
        if prompt_source == "none":
            notes_bits.append("no prompt found")

        triplets.append({
            "id": f"t{i:02d}",
            "model_ref": model_path or "",
            "style_ref": style_path or "",
            "output": out["path"],
            "prompt": prompt_text,
            "prompt_source": prompt_source,
            "confidence": confidence,
            "needs_confirmation": needs_confirmation,
            "notes": "; ".join(notes_bits),
        })
        for p in (model_path, style_path, out["path"]):
            if p:
                used.add(p)

    # Every image accounted for: anything not sitting in a triplet slot is unpaired.
    unpaired = sorted(e["path"] for e in images if e["path"] not in used)

    manifest = {
        "version": 1,
        "raw_dir": inventory.get("raw_dir", str(Path(args.raw_dir).as_posix())),
        "triplets": triplets,
        "unpaired": unpaired,
    }
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    low = sum(1 for t in triplets if t["confidence"] == "low")
    print(f"[done] {len(triplets)} triplets ({low} need confirmation), "
          f"{len(unpaired)} unpaired -> {out_path}", file=sys.stderr)


def _slice_prompts_txt(text: str, filename: str, stem: str) -> str:
    """Pull the paragraph/segment of a big prompts.txt that references the
    output's filename or stem. Splits on blank lines; returns the first block
    that names the file, minus the filename line itself."""
    if not text:
        return ""
    blocks = re.split(r"\n\s*\n", text)
    for block in blocks:
        low = block.lower()
        if filename.lower() in low or (stem and re.search(rf"\b{re.escape(stem.lower())}\b", low)):
            lines = [ln for ln in block.splitlines()
                     if filename.lower() not in ln.lower() and ln.strip()]
            return "\n".join(lines).strip() or block.strip()
    return ""


# ---------------------------------------------------------------------------
# report
# ---------------------------------------------------------------------------

def cmd_report(args) -> None:
    man_path = Path(args.manifest)
    if not man_path.is_file():
        fail(1, "MANIFEST_NOT_FOUND", f"no such file: {man_path} (run `pair` first)")
    manifest = json.loads(man_path.read_text(encoding="utf-8"))

    # Pull descriptors from inventory (if present) to annotate rows.
    inv_path = Path(args.inventory)
    descr_by_path = {}
    if inv_path.is_file():
        try:
            inv = json.loads(inv_path.read_text(encoding="utf-8"))
            for e in inv.get("files", []):
                face = (e.get("face") or {}).get("descriptor", "")
                scene = (e.get("scene") or {}).get("descriptor", "")
                descr_by_path[e.get("path")] = " / ".join(x for x in (face, scene) if x)[:60]
        except (json.JSONDecodeError, OSError):
            pass

    triplets = manifest.get("triplets", [])
    unpaired = manifest.get("unpaired", [])

    lines = ["# Reference-Stack pairing report", ""]
    lines.append(f"- Triplets: **{len(triplets)}**")
    high = sum(1 for t in triplets if t.get("confidence") == "high")
    needs = sum(1 for t in triplets if t.get("needs_confirmation"))
    lines.append(f"- High confidence: **{high}** / Needs confirmation: **{needs}**")
    lines.append(f"- Unpaired files: **{len(unpaired)}**")
    lines.append("")
    lines.append("| id | model_ref | style_ref | output | prompt_source | confidence | needs_confirmation | notes |")
    lines.append("|----|-----------|-----------|--------|---------------|------------|--------------------|-------|")
    for t in triplets:
        out_descr = descr_by_path.get(t.get("output"), "")
        notes = t.get("notes", "")
        if out_descr:
            notes = f"{notes} [{out_descr}]" if notes else f"[{out_descr}]"
        lines.append(
            f"| {t.get('id','')} | {t.get('model_ref','') or '—'} | "
            f"{t.get('style_ref','') or '—'} | {t.get('output','')} | "
            f"{t.get('prompt_source','')} | {t.get('confidence','')} | "
            f"{'yes' if t.get('needs_confirmation') else 'no'} | {notes} |"
        )
    lines.append("")
    lines.append("## Unpaired files")
    if unpaired:
        for p in unpaired:
            descr = descr_by_path.get(p, "")
            lines.append(f"- `{p}`" + (f" — {descr}" if descr else ""))
    else:
        lines.append("- (none — every image landed in a triplet)")
    lines.append("")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"[done] wrote {out_path}", file=sys.stderr)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Reference-Stack ingest: inventory -> pair -> report.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_inv = sub.add_parser("inventory", help="Gemini-classify every image in the raw drop")
    p_inv.add_argument("--raw-dir", default=str(DEFAULT_RAW_DIR))
    p_inv.add_argument("--model", default=DEFAULT_MODEL)
    p_inv.add_argument("--out", default=str(DEFAULT_INVENTORY))
    p_inv.add_argument("--limit", type=int, default=None, help="cap NEW image classifications")
    p_inv.add_argument("--force", action="store_true", help="re-classify files already in inventory.json")
    p_inv.set_defaults(func=cmd_inventory)

    p_pair = sub.add_parser("pair", help="LOCAL triplet pairing (no API)")
    p_pair.add_argument("--inventory", default=str(DEFAULT_INVENTORY))
    p_pair.add_argument("--raw-dir", default=str(DEFAULT_RAW_DIR))
    p_pair.add_argument("--out", default=str(DEFAULT_MANIFEST))
    p_pair.set_defaults(func=cmd_pair)

    p_rep = sub.add_parser("report", help="human-readable pairing table")
    p_rep.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    p_rep.add_argument("--inventory", default=str(DEFAULT_INVENTORY))
    p_rep.add_argument("--out", default=str(DEFAULT_REPORT))
    p_rep.set_defaults(func=cmd_report)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
