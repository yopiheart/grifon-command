---
name: tldr
description: Restate the previous response in plain language — what happened, did it work, what now. Use when Neil types /tldr, or says "in plain English", "ano ba talaga", "shorten that", "summarize that". Condenses what was ALREADY said; it does not redo the work or run new tools.
disable-model-invocation: true
---

# /tldr

Neil just read a long response and wants the short version. Give it to him.

## Scope

Rewrite **the previous assistant message**. Nothing else.

- Do not run tools, re-verify, or investigate further. If the answer isn't already in the
  transcript, say what's missing in one line instead of going to find it.
- Do not add new claims, caveats, or recommendations that weren't in the original. A TL;DR
  that introduces information is not a TL;DR.
- If the previous message was already short, say so and stop. Don't pad it into a summary.

## Shape

Three beats, in this order, no headers:

1. **What happened** — what was done or found.
2. **Did it work** — verified / failed / unverified. Use the same verdict the original used;
   if the original hedged, keep the hedge, don't upgrade it to certainty.
3. **What now** — the single next action, or the one decision Neil owns.

Then stop. No preamble, no "here's the summary."

## Rules

- **Keep the register.** Reply in the language the thread is already in. If Neil has been
  writing Taglish, the TL;DR is Taglish — the full spec is
  `.claude/skills/_shared/taglish-voice.md`, and the LANGUAGE LOCK applies here exactly as
  it does anywhere else. Condensing is not a licence to switch to English.
- **Exact things stay exact.** File paths, commands, env var names, branch names, prices,
  IDs, and numbers are copied verbatim. `EDL_MAX_ATTACHED_VIDEOS = 0` does not become
  "the video cap." A shortened path is a broken path.
- **Plain words, honest verdict.** Drop the jargon, keep the bad news. If something failed,
  the short version still says it failed. Never let compression turn a partial result into
  a clean one.
- **One screen.** If it doesn't fit, the previous message had more than one decision in it —
  say that, and TL;DR only the decision Neil is standing on right now.

## Not this skill

- Re-explaining a *concept* Neil didn't follow → answer the question directly.
- Summarizing a file, doc, or PR → just read it and summarize; that's ordinary work.
- Session state or where work stopped → `NOW.md` owns that.
