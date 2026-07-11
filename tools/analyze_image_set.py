#!/usr/bin/env python3
"""Reference-Stack batch analysis: grade the dual-reference technique triplet by
triplet with Gemini vision, then tally cross-triplet patterns locally — so the
believability playbook is built from measured %s + concrete evidence, never from
"it looks good".

Subcommands:
  analyze    — per triplet in the pairing manifest, ONE Gemini call with the 3
               labelled images (MODEL REF + STYLE REF + OUTPUT) + the prompt ->
               .tmp/refstack/analysis/<id>.json  (style-replication %s, identity
               consistency, believability register + AI-tells, style-ref realism
               verdict, prompt-move breakdown). A specificity gate rejects vague
               output (exit 3 if ANY triplet failed). Incremental. Supports
               --judge-mode for blind shootout judging (no prompt, no model id).
  aggregate  — LOCAL tally over the analysis JSONs (register split, avg style /
               identity %s, AI-tell frequency, style-ref real-human vs likely-ai
               counts, prompt-move lift) -> .tmp/refstack/aggregate.json.
               --synthesize adds ONE text-only Gemini pass over compact summaries.

Usage:
  python tools/analyze_image_set.py analyze --manifest workflows/believability-refstack/manifest.json
  python tools/analyze_image_set.py analyze --manifest ... --only t01,t02 --limit 3
  python tools/analyze_image_set.py analyze --judge-mode --case c01 \
      --model-ref refs/m.png --style-ref refs/s.png --candidate judging/c01-A.png
  python tools/analyze_image_set.py aggregate --synthesize

Exit codes: 0 ok, 1 usage/input error, 2 API failure, 3 GENERIC_OUTPUT
(one or more triplets failed the specificity validator).

Secrets: GEMINI_API_KEY from environment or repo-root .env (never hardcoded).
google-genai self-installs via pip (cafe-PC defreezer wipes site-packages).
"""

import argparse
import importlib
import json
import os
import re
import subprocess
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MANIFEST = REPO_ROOT / "workflows" / "believability-refstack" / "manifest.json"
DEFAULT_RAW_DIR = REPO_ROOT / ".tmp" / "refstack" / "raw"
DEFAULT_ANALYSIS_DIR = REPO_ROOT / ".tmp" / "refstack" / "analysis"
DEFAULT_AGGREGATE = REPO_ROOT / ".tmp" / "refstack" / "aggregate.json"
DEFAULT_MODEL = "gemini-3.5-flash"

REGISTER_VALUES = {"raw-ugc", "polished-ugc", "production-content-look", "cinematic", "archival-dv"}
REALISM_VERDICT_VALUES = {"real-human", "likely-ai", "mixed"}
STYLE_DIMENSIONS = ["lighting", "skin_realism", "posing", "camera_angle", "background"]

# The forensic instruction shared by normal + judge mode. The three image parts
# are prepended (each with its own label text part) before this block.
ANALYSIS_PROMPT_HEAD = """You are a forensic image analyst grading a dual-reference AI-UGC generation. You are given three images, labelled above:
- IMAGE 1 = MODEL REF (the real person — identity ground truth)
- IMAGE 2 = STYLE REF (the aesthetic to replicate — lighting, skin rendering, posing, camera angle, background)
- IMAGE 3 = OUTPUT (the AI generation to grade)

Compare IMAGE 3 against IMAGE 2 for STYLE replication and against IMAGE 1 for IDENTITY. Judge from concrete visual evidence only."""

PROMPT_SECTION = """

The prompt used to make IMAGE 3 was:
\"\"\"{prompt}\"\"\"
Analyse how that prompt drove identity, style transfer, and realism in prompt_analysis below."""

NO_PROMPT_SECTION = """

No prompt text is available for IMAGE 3. Emit prompt_analysis with empty arrays and set prompt_missing to true."""

SCHEMA_BLOCK = """

Return ONLY a JSON object with this exact shape (no markdown fence, no prose):

{{
  "style_replication": {{
    "lighting": {{"match_pct": <0-100>, "evidence": "<concrete visual evidence comparing IMAGE 3 to IMAGE 2>"}},
    "skin_realism": {{"match_pct": <0-100>, "evidence": "<...>"}},
    "posing": {{"match_pct": <0-100>, "evidence": "<...>"}},
    "camera_angle": {{"match_pct": <0-100>, "evidence": "<...>"}},
    "background": {{"match_pct": <0-100>, "evidence": "<...>"}},
    "overall_pct": <0-100>
  }},
  "identity_consistency": {{"score_pct": <0-100>, "drift_notes": "<what drifted from IMAGE 1, if anything>", "evidence": "<concrete facial/identity evidence>"}},
  "believability": {{
    "observed_register": "raw-ugc | polished-ugc | production-content-look | cinematic | archival-dv",
    "ai_tells": [{{"tell": "<the artifact>", "location": "<where in frame>", "severity": "minor | damning"}}],
    "image_realism": {{"observation": "<skin texture/pores, hands, lived-in detail vs plastic/over-clean>", "evidence": "<...>", "confidence": "low | medium | high"}}
  }},
  "style_ref_realism_verdict": {{"verdict": "real-human | likely-ai | mixed", "evidence": "<the tells that decided whether IMAGE 2 is a real photo>", "confidence": "low | medium | high"}},
  "prompt_analysis": {{"identity_moves": [], "style_transfer_moves": [], "realism_directives": [], "negative_constraints": [], "notable_verbatim_fragments": []}}{prompt_missing_field}
}}

HARD RULES:
- Every match_pct / score_pct is a NUMBER 0-100 and MUST be paired with non-empty, concrete evidence. A % without evidence is a failed analysis.
- Every ai_tell needs a location in the frame. If there are no AI tells, ai_tells is an empty array.
- observed_register MUST be exactly one of the five enum values (raw-ugc = phone selfie / available light / unretouched; polished-ugc = creator-grade ring light, clean-but-real; production-content-look = branded content, styled but not glossy; cinematic = premium/studio, reads as an ad; archival-dv = degraded/handheld camcorder look).
- style_ref_realism_verdict judges whether IMAGE 2 (the STYLE REF) is a real photograph or itself AI — from concrete tells, not vibes.
- prompt_analysis: quote VERBATIM fragments in notable_verbatim_fragments. If no prompt was provided, all arrays are empty."""

# Judge mode: model-ref + style-ref + a single anonymized candidate. No prompt,
# no model identity — the schema drops prompt_analysis entirely so the judge
# can't be led. The three image parts are labelled above this block.
JUDGE_PROMPT_HEAD = """You are a BLIND forensic judge grading one anonymized AI-UGC generation. You are given three images, labelled above:
- IMAGE 1 = MODEL REF (the real person — identity ground truth)
- IMAGE 2 = STYLE REF (the aesthetic to replicate — lighting, skin rendering, posing, camera angle, background)
- IMAGE 3 = CANDIDATE (the anonymized generation to grade)

You do NOT know which model produced IMAGE 3, and there is no prompt. Judge purely from concrete visual evidence: compare IMAGE 3 to IMAGE 2 for STYLE and to IMAGE 1 for IDENTITY."""

JUDGE_SCHEMA_BLOCK = """

Return ONLY a JSON object with this exact shape (no markdown fence, no prose):

{{
  "style_replication": {{
    "lighting": {{"match_pct": <0-100>, "evidence": "<...>"}},
    "skin_realism": {{"match_pct": <0-100>, "evidence": "<...>"}},
    "posing": {{"match_pct": <0-100>, "evidence": "<...>"}},
    "camera_angle": {{"match_pct": <0-100>, "evidence": "<...>"}},
    "background": {{"match_pct": <0-100>, "evidence": "<...>"}},
    "overall_pct": <0-100>
  }},
  "identity_consistency": {{"score_pct": <0-100>, "drift_notes": "<...>", "evidence": "<...>"}},
  "believability": {{
    "observed_register": "raw-ugc | polished-ugc | production-content-look | cinematic | archival-dv",
    "ai_tells": [{{"tell": "<...>", "location": "<where in frame>", "severity": "minor | damning"}}],
    "image_realism": {{"observation": "<...>", "evidence": "<...>", "confidence": "low | medium | high"}}
  }},
  "style_ref_realism_verdict": {{"verdict": "real-human | likely-ai | mixed", "evidence": "<...>", "confidence": "low | medium | high"}}
}}

HARD RULES:
- Every match_pct / score_pct is a NUMBER 0-100 paired with non-empty concrete evidence.
- Every ai_tell needs a location. No tells -> empty array.
- observed_register MUST be exactly one of the five enum values."""


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


def mime_for(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in (".jpg", ".jpeg"):
        return "image/jpeg"
    if ext == ".webp":
        return "image/webp"
    return "image/png"


def _strip_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\s*|\s*```$", "", text)
    return text.strip()


class ModelCallError(Exception):
    """A Gemini call failed after retries (API error or unparseable JSON)."""

    def __init__(self, label: str, cause, raw_text=None):
        super().__init__(f"{label}: {cause}")
        self.label = label
        self.cause = cause
        self.raw_text = raw_text


class Gemini:
    """Lazily-initialised google-genai client with an image-part helper."""

    def __init__(self, model: str):
        api_key = load_env_key("GEMINI_API_KEY")
        if not api_key:
            fail(1, "GEMINI_NOT_CONFIGURED", "GEMINI_API_KEY not in environment or .env")
        genai = ensure_package("google.genai", "google-genai")
        self.types = importlib.import_module("google.genai.types")
        self.client = genai.Client(api_key=api_key)
        self.model = model

    def image_part(self, path: Path):
        if not path.is_file():
            fail(1, "IMAGE_NOT_FOUND", f"no such image: {path}")
        return self.types.Part.from_bytes(data=path.read_bytes(), mime_type=mime_for(path))

    def json_call(self, contents: list, label: str, temperature: float = 0.2) -> dict:
        last_err = None
        last_raw = None
        for attempt in range(3):
            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=contents,
                    config={"response_mime_type": "application/json", "temperature": temperature},
                )
                text = _strip_fence(response.text or "")
                last_raw = text
                return json.loads(text)
            except json.JSONDecodeError as exc:
                # malformed JSON (unescaped quote, truncation) is model
                # nondeterminism, not a hard failure — retry a touch warmer
                last_err = exc
                temperature = min(temperature + 0.1, 0.5)
                print(f"  [retry] {label}: bad JSON from model ({exc})", file=sys.stderr)
                time.sleep(2)
            except Exception as exc:  # noqa: BLE001 — SDK raises varied types
                last_err = exc
                msg = str(exc)
                retryable = any(c in msg for c in ("429", "500", "502", "503", "504")) \
                    or "RESOURCE_EXHAUSTED" in msg or "UNAVAILABLE" in msg
                if attempt < 2 and retryable:
                    print(f"  [retry] {label}: {msg[:120]}", file=sys.stderr)
                    time.sleep(6)
                    continue
                break
        raise ModelCallError(label, last_err, last_raw)


# ---------------------------------------------------------------------------
# specificity gate (mirrors analyze_video.validate_specificity)
# ---------------------------------------------------------------------------

def validate_specificity(analysis: dict, judge_mode: bool) -> list:
    problems = []

    style = analysis.get("style_replication")
    if not isinstance(style, dict):
        return ["missing style_replication block"]
    for dim in STYLE_DIMENSIONS:
        node = style.get(dim)
        if not isinstance(node, dict):
            problems.append(f"style_replication.{dim} missing")
            continue
        if not isinstance(node.get("match_pct"), (int, float)):
            problems.append(f"style_replication.{dim}.match_pct not numeric")
        if not str(node.get("evidence", "")).strip():
            problems.append(f"style_replication.{dim}.evidence empty")
    if not isinstance(style.get("overall_pct"), (int, float)):
        problems.append("style_replication.overall_pct not numeric")

    ident = analysis.get("identity_consistency")
    if not isinstance(ident, dict):
        problems.append("missing identity_consistency block")
    else:
        if not isinstance(ident.get("score_pct"), (int, float)):
            problems.append("identity_consistency.score_pct not numeric")
        if not str(ident.get("evidence", "")).strip():
            problems.append("identity_consistency.evidence empty")

    bel = analysis.get("believability")
    if not isinstance(bel, dict):
        problems.append("missing believability block")
    else:
        register = bel.get("observed_register")
        if register not in REGISTER_VALUES:
            problems.append(f"believability.observed_register not in enum: {register!r}")
        tells = bel.get("ai_tells")
        if not isinstance(tells, list):
            problems.append("believability.ai_tells not a list")
        else:
            for i, tell in enumerate(tells):
                if not isinstance(tell, dict) or not str(tell.get("location", "")).strip():
                    problems.append(f"believability.ai_tells[{i}] has no location")

    verdict = (analysis.get("style_ref_realism_verdict") or {}).get("verdict") \
        if isinstance(analysis.get("style_ref_realism_verdict"), dict) else None
    if verdict not in REALISM_VERDICT_VALUES:
        problems.append(f"style_ref_realism_verdict.verdict not in enum: {verdict!r}")

    if not judge_mode and "prompt_analysis" not in analysis:
        problems.append("missing prompt_analysis block")

    return problems


# ---------------------------------------------------------------------------
# analyze
# ---------------------------------------------------------------------------

def build_analysis_contents(gem: Gemini, model_ref: Path, style_ref: Path,
                            output: Path, prompt: str, judge_mode: bool) -> list:
    if judge_mode:
        return [
            "IMAGE 1 = MODEL REF (identity ground truth):",
            gem.image_part(model_ref),
            "IMAGE 2 = STYLE REF (style ground truth):",
            gem.image_part(style_ref),
            "IMAGE 3 = CANDIDATE (the anonymized generation to grade):",
            gem.image_part(output),
            JUDGE_PROMPT_HEAD + JUDGE_SCHEMA_BLOCK,
        ]
    prompt = (prompt or "").strip()
    if prompt:
        mid = PROMPT_SECTION.format(prompt=prompt)
        pm_field = ',\n  "prompt_missing": false'
    else:
        mid = NO_PROMPT_SECTION
        pm_field = ',\n  "prompt_missing": true'
    tail = SCHEMA_BLOCK.format(prompt_missing_field=pm_field)
    return [
        "IMAGE 1 = MODEL REF (identity ground truth):",
        gem.image_part(model_ref),
        "IMAGE 2 = STYLE REF (style ground truth):",
        gem.image_part(style_ref),
        "IMAGE 3 = OUTPUT (the generation to grade):",
        gem.image_part(output),
        ANALYSIS_PROMPT_HEAD + mid + tail,
    ]


def resolve_image(raw_dir: Path, rel_or_abs: str) -> Path:
    p = Path(rel_or_abs)
    if p.is_absolute() and p.is_file():
        return p
    cand = raw_dir / rel_or_abs
    if cand.is_file():
        return cand
    # also try repo-root-relative (judge refs live under workflows/)
    cand2 = REPO_ROOT / rel_or_abs
    if cand2.is_file():
        return cand2
    return cand  # let the missing-file check downstream report it


def cmd_analyze(args) -> None:
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.judge_mode:
        _run_judge(args, out_dir)
        return

    man_path = Path(args.manifest)
    if not man_path.is_file():
        fail(1, "MANIFEST_NOT_FOUND", f"no such file: {man_path} (run ingest_refstack pair first)")
    manifest = json.loads(man_path.read_text(encoding="utf-8"))
    triplets = manifest.get("triplets", [])
    raw_dir = Path(args.raw_dir)

    only = set(s.strip() for s in args.only.split(",")) if args.only else None
    selected = [t for t in triplets if (only is None or t.get("id") in only)]
    if only and not selected:
        fail(1, "NO_MATCH", f"--only {args.only} matched no triplet ids")

    gem = None
    any_failed = False
    processed = 0
    failures = []

    for t in selected:
        tid = t.get("id", "t??")
        out_path = out_dir / f"{tid}.json"
        if out_path.is_file() and not args.force:
            print(f"[skip] {tid} already analyzed ({out_path.name})", file=sys.stderr)
            continue
        if args.limit is not None and processed >= args.limit:
            break
        if not t.get("model_ref") or not t.get("style_ref") or not t.get("output"):
            print(f"[skip] {tid} incomplete triplet (missing a slot)", file=sys.stderr)
            continue

        if gem is None:
            gem = Gemini(args.model)

        model_ref = resolve_image(raw_dir, t["model_ref"])
        style_ref = resolve_image(raw_dir, t["style_ref"])
        output = resolve_image(raw_dir, t["output"])
        print(f"[analyze] {tid}", file=sys.stderr)
        contents = build_analysis_contents(gem, model_ref, style_ref, output, t.get("prompt", ""), False)
        try:
            analysis = gem.json_call(contents, tid)
        except ModelCallError as exc:
            processed += 1
            any_failed = True
            failures.append(f"{tid}: model call failed ({exc.cause})")
            print(f"  [error] {tid}: {exc.cause}", file=sys.stderr)
            if exc.raw_text:
                (out_dir / f"{tid}.raw.txt").write_text(exc.raw_text, encoding="utf-8")
            time.sleep(1.0)
            continue
        processed += 1

        problems = validate_specificity(analysis, judge_mode=False)
        record = {
            "meta": {
                "id": tid,
                "model_ref": t.get("model_ref"),
                "style_ref": t.get("style_ref"),
                "output": t.get("output"),
                "prompt_source": t.get("prompt_source"),
                "model": args.model,
                "analyzed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            },
            "analysis": analysis,
        }
        if problems:
            record["_generic"] = True
            record["_problems"] = problems
            any_failed = True
            failures.append(f"{tid}: {problems[0]}" + (f" (+{len(problems)-1} more)" if len(problems) > 1 else ""))
            print(f"  [generic] {tid} failed specificity: {problems[0]}", file=sys.stderr)
        out_path.write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")
        time.sleep(1.0)

    print(f"[done] analyzed {processed} triplet(s) -> {out_dir}", file=sys.stderr)
    if any_failed:
        fail(3, "GENERIC_OUTPUT",
             "specificity gate rejected:\n  - " + "\n  - ".join(failures))


def _run_judge(args, out_dir: Path) -> None:
    if not args.candidate:
        fail(1, "JUDGE_USAGE", "--judge-mode needs --candidate <anonymized output path>")
    if not args.case:
        fail(1, "JUDGE_USAGE", "--judge-mode needs --case <id>")
    raw_dir = Path(args.raw_dir)

    # Refs come from explicit flags, or from the named triplet in the manifest.
    model_ref_arg, style_ref_arg = args.model_ref, args.style_ref
    if (not model_ref_arg or not style_ref_arg):
        man_path = Path(args.manifest)
        if man_path.is_file():
            manifest = json.loads(man_path.read_text(encoding="utf-8"))
            match = next((t for t in manifest.get("triplets", [])
                          if t.get("id") == args.case or t.get("output")), None)
            # prefer a triplet whose id matches --case, else the explicit flags win
            by_id = next((t for t in manifest.get("triplets", []) if t.get("id") == args.case), None)
            src = by_id or match
            if src:
                model_ref_arg = model_ref_arg or src.get("model_ref")
                style_ref_arg = style_ref_arg or src.get("style_ref")
    if not model_ref_arg or not style_ref_arg:
        fail(1, "JUDGE_USAGE",
             "could not resolve model-ref/style-ref — pass --model-ref and --style-ref "
             "or a --case id that exists in --manifest")

    gem = Gemini(args.model)
    model_ref = resolve_image(raw_dir, model_ref_arg)
    style_ref = resolve_image(raw_dir, style_ref_arg)
    candidate = resolve_image(raw_dir, args.candidate)
    cand_stem = Path(args.candidate).stem
    print(f"[judge] case={args.case} candidate={cand_stem}", file=sys.stderr)
    contents = build_analysis_contents(gem, model_ref, style_ref, candidate, "", True)
    try:
        analysis = gem.json_call(contents, f"judge-{args.case}-{cand_stem}")
    except ModelCallError as exc:
        fail(2, "API_FAILED", str(exc))
    problems = validate_specificity(analysis, judge_mode=True)
    record = {
        "meta": {
            "case": args.case,
            "candidate": args.candidate,
            "model": args.model,
            "judged_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "blind": True,
        },
        "analysis": analysis,
    }
    if problems:
        record["_generic"] = True
        record["_problems"] = problems
    out_path = out_dir / f"judge-{args.case}-{cand_stem}.json"
    out_path.write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[done] wrote {out_path}", file=sys.stderr)
    if problems:
        fail(3, "GENERIC_OUTPUT", "judge output failed specificity:\n  - " + "\n  - ".join(problems))


# ---------------------------------------------------------------------------
# aggregate (local tally + optional synthesis)
# ---------------------------------------------------------------------------

def _avg(nums: list):
    vals = [n for n in nums if isinstance(n, (int, float))]
    return round(sum(vals) / len(vals), 1) if vals else None


def _norm_move(text: str) -> str:
    return re.sub(r"\s+", " ", str(text).strip().lower())


def cmd_aggregate(args) -> None:
    analysis_dir = Path(args.analysis_dir)
    if not analysis_dir.is_dir():
        fail(1, "ANALYSIS_DIR_NOT_FOUND", f"no such directory: {analysis_dir} (run analyze first)")

    # Only triplet analyses (exclude judge-*.json from the corpus tally).
    records = []
    for p in sorted(analysis_dir.glob("*.json")):
        if p.name.startswith("judge-"):
            continue
        try:
            records.append(json.loads(p.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, OSError):
            print(f"[aggregate] skipping unreadable {p.name}", file=sys.stderr)

    if not records:
        fail(1, "NO_ANALYSES", f"no triplet analysis JSONs in {analysis_dir}")

    register_counts = Counter()
    style_overall = []
    dim_scores = defaultdict(list)
    identity_scores = []
    ai_tell_counter = Counter()
    verdict_counts = Counter()
    move_present = defaultdict(list)   # move -> list of overall_pct where present
    all_overalls_by_id = []
    move_all_ids = set()

    # first pass: collect every distinct move so we can compute present-vs-absent lift
    per_triplet = []
    for rec in records:
        a = rec.get("analysis", {})
        meta = rec.get("meta", {})
        tid = meta.get("id", "?")
        style = a.get("style_replication", {}) or {}
        overall = style.get("overall_pct")
        if isinstance(overall, (int, float)):
            style_overall.append(overall)
            all_overalls_by_id.append((tid, overall))
        for dim in STYLE_DIMENSIONS:
            node = style.get(dim, {}) or {}
            if isinstance(node.get("match_pct"), (int, float)):
                dim_scores[dim].append(node["match_pct"])
        ident = a.get("identity_consistency", {}) or {}
        if isinstance(ident.get("score_pct"), (int, float)):
            identity_scores.append(ident["score_pct"])
        bel = a.get("believability", {}) or {}
        reg = bel.get("observed_register")
        if reg:
            register_counts[reg] += 1
        for tell in (bel.get("ai_tells") or []):
            if isinstance(tell, dict) and tell.get("tell"):
                ai_tell_counter[_norm_move(tell["tell"])] += 1
        verdict = (a.get("style_ref_realism_verdict") or {}).get("verdict")
        if verdict:
            verdict_counts[verdict] += 1

        pa = a.get("prompt_analysis", {}) or {}
        moves = set()
        for bucket in ("identity_moves", "style_transfer_moves", "realism_directives",
                       "negative_constraints", "notable_verbatim_fragments"):
            for m in (pa.get(bucket) or []):
                nm = _norm_move(m)
                if nm:
                    moves.add(nm)
        per_triplet.append({"id": tid, "overall": overall, "moves": moves,
                            "register": reg, "verdict": verdict})
        for m in moves:
            move_all_ids.add(m)

    # move lift: avg overall where the move is present vs where it is absent
    move_lift = {}
    all_overall_vals = [t["overall"] for t in per_triplet if isinstance(t["overall"], (int, float))]
    for move in move_all_ids:
        present = [t["overall"] for t in per_triplet
                   if move in t["moves"] and isinstance(t["overall"], (int, float))]
        absent = [t["overall"] for t in per_triplet
                  if move not in t["moves"] and isinstance(t["overall"], (int, float))]
        move_lift[move] = {
            "count": sum(1 for t in per_triplet if move in t["moves"]),
            "avg_overall_present": _avg(present),
            "avg_overall_absent": _avg(absent),
        }

    ranked = sorted(
        [(tid, ov) for tid, ov in all_overalls_by_id],
        key=lambda t: (t[1] is not None, t[1] or 0), reverse=True,
    )

    aggregate = {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "triplet_count": len(records),
        "register_counts": dict(register_counts.most_common()),
        "style_replication": {
            "avg_overall_pct": _avg(style_overall),
            "avg_by_dimension": {dim: _avg(vals) for dim, vals in dim_scores.items()},
        },
        "identity": {"avg_score_pct": _avg(identity_scores)},
        "ai_tell_frequency": dict(ai_tell_counter.most_common()),
        "style_ref_realism_verdict": dict(verdict_counts.most_common()),
        "corroboration_note": (
            f"real-human style refs: {verdict_counts.get('real-human', 0)} "
            f"(only these count toward >=3 corroboration); "
            f"likely-ai: {verdict_counts.get('likely-ai', 0)}; "
            f"mixed: {verdict_counts.get('mixed', 0)}"
        ),
        "prompt_move_lift": dict(sorted(
            move_lift.items(),
            key=lambda kv: (kv[1]["count"], kv[1]["avg_overall_present"] or 0),
            reverse=True,
        )),
        "ranked_triplets": [{"id": tid, "overall_pct": ov} for tid, ov in ranked],
    }

    if args.synthesize:
        aggregate["synthesis"] = _synthesize(per_triplet, args.model)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(aggregate, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[done] aggregated {len(records)} analyses -> {out_path}", file=sys.stderr)


def _synthesize(per_triplet: list, model: str) -> dict:
    """ONE text-only Gemini pass over compact per-triplet summaries (NO images)."""
    gem = Gemini(model)
    summaries = []
    for t in per_triplet:
        summaries.append({
            "id": t["id"],
            "overall_pct": t["overall"],
            "register": t["register"],
            "style_ref_verdict": t["verdict"],
            "prompt_moves": sorted(t["moves"]),
        })
    prompt = (
        "You are distilling cross-triplet patterns from a batch of dual-reference "
        "AI-UGC gradings. Below is a compact JSON summary per triplet (id, overall "
        "style-replication %, observed register, whether the style ref was a real "
        "human, and the prompt moves used). NO images.\n\n"
        "Return ONLY a JSON object:\n"
        "{\n"
        '  "winning_prompt_moves": [{"move": "", "corroboration_count": 0, "avg_overall_when_present": 0, "why": ""}],\n'
        '  "style_ref_transfers_reliably": ["what the style ref pins WITHOUT prompt language"],\n'
        '  "needs_prompt_language": ["what the style ref does NOT transfer and must be prompted"],\n'
        '  "candidate_fragments": [{"fragment": "", "corroboration_count": 0}]\n'
        "}\n\n"
        "Only count real-human style-ref triplets toward corroboration_count.\n\n"
        "DATA:\n" + json.dumps(summaries, ensure_ascii=False)
    )
    try:
        return gem.json_call([prompt], "synthesize", temperature=0.3)
    except ModelCallError as exc:
        fail(2, "API_FAILED", str(exc))


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Reference-Stack batch analysis: analyze -> aggregate.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_an = sub.add_parser("analyze", help="grade triplets (or judge blind candidates)")
    p_an.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    p_an.add_argument("--raw-dir", default=str(DEFAULT_RAW_DIR))
    p_an.add_argument("--only", default=None, help="comma-separated triplet ids, e.g. t01,t02")
    p_an.add_argument("--limit", type=int, default=None)
    p_an.add_argument("--model", default=DEFAULT_MODEL)
    p_an.add_argument("--out-dir", default=str(DEFAULT_ANALYSIS_DIR))
    p_an.add_argument("--force", action="store_true", help="re-analyze triplets whose JSON exists")
    p_an.add_argument("--judge-mode", action="store_true", help="blind shootout judging")
    p_an.add_argument("--candidate", default=None, help="[judge] anonymized output path")
    p_an.add_argument("--case", default=None, help="[judge] case id")
    p_an.add_argument("--model-ref", default=None, help="[judge] explicit model-ref path")
    p_an.add_argument("--style-ref", default=None, help="[judge] explicit style-ref path")
    p_an.set_defaults(func=cmd_analyze)

    p_ag = sub.add_parser("aggregate", help="local tally over analysis JSONs")
    p_ag.add_argument("--analysis-dir", default=str(DEFAULT_ANALYSIS_DIR))
    p_ag.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    p_ag.add_argument("--out", default=str(DEFAULT_AGGREGATE))
    p_ag.add_argument("--synthesize", action="store_true", help="one text-only Gemini synthesis pass")
    p_ag.add_argument("--model", default=DEFAULT_MODEL)
    p_ag.set_defaults(func=cmd_aggregate)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
