# Instruction Stack Audit — every always-loaded line, tagged

**Run 2026-08-12.** Question that prompted it (Neil): *do the skills and rules in this repo
suppress the judgment of a strong model (Opus 5 / Fable 5), the way the Boris Cherny
"delete the system prompt" advice implies?*

This file answers it with a line-by-line tag of everything that loads before you type.
It is an **audit, not an edit** — nothing in `CLAUDE.md` or `agent_lessons.md` was changed.
The delete-list at the bottom is Neil's call, item by item.

---

## What actually loads, measured

| File | Words | ≈ Tokens | How it loads |
|---|---|---|---|
| `CLAUDE.md` | 5,951 | ~7,900 | auto, every session |
| `agent_lessons.md` | 4,714 | ~6,300 | "read at session start" (CLAUDE.md L65) |
| skill frontmatter (28 skills) | 1,924 | ~2,600 | auto, every session |
| `NOW.md` | 905 | ~1,200 | printed by the SessionStart hook |
| **Total** | **13,494** | **~18,000** | **before the first instruction** |

`UBIQUITOUS_LANGUAGE.md` (4,218 w) and `DESIGN.md` (2,861 w) are **not** in this set — they
are load-on-demand per CLAUDE.md L62. Correctly placed; excluded from this audit.

~18k tokens is ~9% of the window. The harm is not that it "uses up" the window — it is that
CLAUDE.md L144 says 80% of historical usage burned above 150k context, and every always-on
token moves the session toward that wall sooner.

---

## Tag legend

| Tag | Meaning | Default verdict |
|---|---|---|
| **FACT** | Environment/architecture truth the model cannot derive | **KEEP** — near-zero decision cost |
| **GATE** | Neil's veto or policy, written down | **KEEP** — a stronger model does not make a veto redundant |
| **PROC** | Tells the model *how to think* or in what order | **SUSPECT** — this is the only category the Cherny advice targets |
| **CONV** | Prose a verifier already enforces, or could | **DELETE once the check exists** |
| *+NARR* | Narrative justification attached to a rule | modifier — compressible |
| *+NAV* | Pointer/index to another file | modifier — cheap individually, adds up |

Only **PROC** is the thing Neil was worried about. The audit's headline finding is that PROC
is the *smallest* category in this repo — and that the real waste is duplication, not
over-constraint.

---

## CLAUDE.md — 267 lines, every line accounted for

| Lines | Words | Tag | Verdict | Note |
|---|---|---|---|---|
| 1–3 | 12 | — | **DELETE** | "This file provides guidance to Claude Code." Zero information. |
| 7–9 | 70 | FACT | KEEP | Orientation. Earns its place. |
| 11–31 | 166 | FACT | COMPRESS | The npm script list is re-derivable from `package.json`. The `RUN_REGRESSION` quota note (L23–26) is GATE — keep that half. |
| 33–42 | ~200 | FACT | KEEP | Env var *names* + what breaks without them. Load-bearing. |
| 43–48 | ~264 | FACT | **MOVE** | Deep flag mechanics (`MID_GAP_TRIM` 0.6s/0.15s/max-2, the `IMAGE_GATE` asymmetric partial state). Only needed when touching render or the image gate. → `workflows/env_flags.md`, keep a 2-line pointer + the two silent traps (build-time `VITE_` inlining, both-or-neither). |
| 50–54 | ~90 | FACT | **KEEP — highest value in the file** | The defreezer. Nothing else in the stack is more load-bearing. |
| 55 | ~140 | CONV+NARR | **COMPRESS** | Branch-check rule. Duplicated at `agent_lessons.md:23`, and the SessionStart hook already prints UNMERGED WORK IN FLIGHT. One line + pointer. |
| 56–58 | ~30 | FACT | KEEP | |
| 60–65 | ~120 | NAV | KEEP | Pointers to the two files that must load before planning. |
| 66–77 | **513** | NAV | **DELETE — biggest safe win** | A 12-skill catalog. Skill descriptions **already auto-load** (1,924 w measured). This is a near-verbatim second copy. Spot-check: L70 `director-smoke` (~70 w) vs its frontmatter (65 w) — same content, same triggers. |
| 79 | ~60 | FACT | COMPRESS | Which skills won't auto-fire. Genuinely useful; halve it. |
| 81 | 15 | GATE | KEEP | smoke-tester delegation. |
| 83 | 20 | PROC | KEEP | One line, cheap. |
| 85–91 | ~70 | GATE | KEEP | Reply in Neil's register. |
| 92–109 | ~230 | GATE | KEEP | The four rules + the banned-word list. This is Neil's voice; irreplaceable. |
| 111–113 | ~40 | GATE+NARR | KEEP | The "not exempt" carve-out. Earned. |
| 115–126 | ~130 | FACT+NARR | COMPRESS | Hook mechanics. The hook fires on its own; I don't need its trigger logic in context to comply. |
| 130 | 18 | FACT | KEEP | |
| 132–133 | ~60 | PROC | KEEP | `/clear` over `/compact`, `/btw`. Cheap, real. |
| 134 | ~130 | CONV | **COMPRESS** | NOW.md rule. Triple-covered: here + `agent_lessons.md:25` + enforced by `tools/resume_doc_check.mjs`. Keep one line here. |
| 135–136 | ~120 | GATE | KEEP | Playwright→subagent is a real cost gate. |
| 137–144 | **591** | FACT+PROC | **REWRITE — carries a live error** | Model allocation. See Contradictions below: this block assumes **Max 5x**, `NOW.md:43` says the account is **Pro** and Fable is Max-only. Also the largest PROC block. Target ~200 w. |
| 145 | 35 | PROC | KEEP | |
| 146 | 40 | PROC | **DELETE** | "Vertical slices over horizontal layers." Generic engineering advice. Opus 5 does not need to be told this — textbook bucket-3. |
| 148–163 | ~290 | PROC | **MOVE** | `/goal` mechanics. Only relevant when setting a goal. → a `/goal` doc or skill. |
| 165–175 | ~145 | PROC+GATE | **SPLIT** | The 5-step pipeline is PROC (move it). L175 "the agent never fires `/goal` on its own" is GATE — keep that one line. |
| 179–181 | ~120 | GATE+PROC | KEEP | When to offer an artifact. |
| 182–188 | **286** | FACT+NAV | **MOVE** | The artifact URL registry. Only needed when redeploying one, and it grows every session. → `workflows/artifact_registry.md`. |
| 189–191 | ~180 | NAV+GATE | COMPRESS | NOIR pointer. Quadruple-covered: here + `workflows/artifact_noir_style.md` + the `artifact-noir` skill (100 w frontmatter, auto-fires) + `DESIGN.md`. Two lines is enough. |
| 192 | ~180 | NARR | **COMPRESS to 1 line** | The "anyone with the link" story. Rule = *org-only sharing, never retry public, check docs before the 3rd platform retry.* The rest is the scar. |
| 193 | ~230 | GATE+NARR | **COMPRESS to 3 lines** | Twin rule. The gate (twin at `artifacts/<slug>.html`, built from committed sources, through `finalize()`, HTML not PDF) is 3 lines; the rest is justification. |
| 194 | ~70 | GATE | KEEP | CSP + secrets. |
| 198–216 | ~330 | FACT | KEEP | Architecture. Cheap orientation that saves a 91 KB read. L212's `phoneticNormalizer` tombstone is NARR but load-bearing — it prevents a resurrection. |
| 220 | ~50 | FACT+GATE | KEEP | Right size already: 3 lines, full rules in DESIGN.md. **This is the model the rest of the file should copy.** |
| 226 | ~60 | FACT+NAV | KEEP | |
| 230–241 | ~90 | FACT | KEEP | File tree. Cheap. |
| 243–267 | **839** | NAV | **COMPRESS to ~300** | 23 workflow files at up to 5 lines each. Most sessions open zero of them. The *when to open it* trigger is worth keeping; the summary of contents is not — that's what opening the file is for. Cut each entry to one line. |

**CLAUDE.md totals:** ~2,700 words identified as deletable / movable / compressible out of
5,951 — roughly **45% of the file, ~3,600 tokens**, none of it a gate.

---

## agent_lessons.md — 105 lines

| Lines | Words | Tag | Verdict | Note |
|---|---|---|---|---|
| 1–5 | 108 | GATE+PROC | **KEEP** | This is the anti-bloat rule itself ("can this be a check instead of prose?"). It is the thing keeping this file from doubling. |
| 9 | ~110 | GATE+CONV | COMPRESS | TUNED files. The PreToolUse hook now enforces it — so the prose can shrink to the rule + "enforced by hook, re-run `hook_gate_test.sh` after settings edits." |
| 10 | ~85 | GATE | KEEP | Paid test spec. Money gate. |
| 11 | ~60 | CONV | **DELETE** | **Duplicate of L104**, which is the same rule, longer, and names the hook that now enforces it. Keep L104, drop L11. |
| 12 | ~55 | GATE | KEEP | Render default is a tuned system. |
| 13–14 | ~90 | GATE | KEEP | |
| 15 | ~250 | GATE+NARR | COMPRESS | Two scars fused into one bullet. Rule = *a guardrail in prose is not enforced — grep `settings.json`/the build script for the tools or steps a skill names.* ~60 w. |
| 16–18 | ~150 | GATE | KEEP | Never self-grant permissions; wizard-chrome; Taglish sign-off. All Neil-set. |
| 22 | ~60 | GATE | KEEP | "A document is documentation, not evidence." Load-bearing epistemics. |
| 23 | ~130 | CONV | COMPRESS | Duplicates `CLAUDE.md:55`. Pick one home — this one — and cut CLAUDE.md's. |
| 24 | ~60 | CONV | KEEP | Librarian sweep. Names a command; that's the good shape. |
| 25 | ~180 | CONV | COMPRESS | NOW.md primacy. Enforced by `resume_doc_check.mjs`. Triple-covered (here + CLAUDE.md L134 + the verifier). |
| 26–31 | ~330 | PROC | KEEP | Epistemic discipline that a strong model genuinely does skip under time pressure (re-run the subagent's claim; check the diff touches the failing path; try the API behind a gated connector). Earned by repeats. |
| 35–36 | ~200 | PROC | **KEEP — best entries in the file** | "A verifier is not done until it FAILS the original defect"; "judge by exit code, never by grepping output." Non-obvious, bit twice, verifiable. |
| 37–46 | ~390 | PROC | **THIN** | Generic engineering judgment — audit upstream before downstream, grep wiring end-to-end, don't tool-install mid-session. A strong model does most of this unprompted. Highest-density bucket-3 in the stack. Suggest keeping 3, cutting 5. |
| 50–53 | ~420 | FACT | **MOVE** | ffmpeg/Veo hard facts (no upscaling, fps+zoompan freeze, `render_audit` is the only ear, Veo burns subtitles). Un-derivable and expensive — but only needed *while rendering*. → the render skill, loaded at the moment of use. |
| 54–58 | ~180 | FACT+GATE | MOVE with the above | Same reasoning. Neil's eyeball as grader (L56) is GATE — keep that one in the live file. |
| 62 | ~290 | GATE | **KEEP — highest value in the file** | The chat/copy/repo-artifact language boundary. Neil-decided, drifted for months, nothing else states it. |
| 63 | ~90 | FACT | KEEP | Read the clock, don't infer it. |
| 64–69 | ~240 | GATE | **MOVE** | Copy-writing register rules. These are needed *when writing copy* — and `taglish-voice.md` already loads then. Redundant in the always-on file. |
| 73–74 | ~110 | GATE | KEEP | `public/` leak; `git add -A` with a live agent. Both are damage-control. |
| 76–92 | ~690 | FACT | KEEP | Repo gotchas. Cheapest, highest-value block in the whole stack: one line each, un-derivable, no procedure. **This is the format everything else should converge on.** ⚠ L87 is written in Taglish, which contradicts L62's own rule that repo artifacts are English. |
| 96–100 | ~230 | FACT+NAV | **MOVE** | Tool decision logs (code-review-graph, SkillSpector, agent-reach, codex-plugin, Sol trial). Only matter if someone proposes re-evaluating one. → the archive, with a pointer. |
| 102–105 | ~400 | — | **REFILE** | These are not decision logs — they are four lessons filed under the wrong heading, and L104 duplicates L11. |

**agent_lessons.md totals:** ~1,900 words movable/deletable out of 4,714 — **~40%, ~2,500
tokens** — again, almost none of it a gate.

---

## NOW.md — 86 lines

**Verdict: leave it alone.** Pure FACT/state, correctly scoped, and it is the one file whose
job is to be current. It sits at 86 lines against its own 90-line cap (L86), so it is at the
edge — but the discipline is working. No tags worth listing; the whole file is state.

---

## Skill descriptions — 1,924 words, and the layer that's easy to miss

`disable-model-invocation: true` stops a skill from *firing*. It does **not** remove its
description from context. All 28 descriptions load every session.

| | Count | Words |
|---|---|---|
| Auto-fire skills (description does real routing work) | 14 | ~930 |
| **User-only skills (Neil types the name)** | **14** | **~994** |

The five longest — `static-autopsy` (119 w), `growth-debrief` (112), `viral-autopsy` (110),
`retargeting-briefs` (104), `ad-recon` (103) — are **all user-only**. Their descriptions are
written to help a model decide when to fire, but they can never fire on their own. For a
skill Neil invokes by name, ~15 words is enough.

**~700 words (~950 tokens) recoverable with zero behavioral risk.** Cheapest item in this
audit.

---

## Cross-file duplication — the actual finding

Not one rule is over-constraining. Several are stated three and four times, in files that
all load at once:

| Rule | Homes | Verdict |
|---|---|---|
| Skill catalog | `CLAUDE.md:66-77` **+** 28 auto-loaded frontmatter blocks | Delete CLAUDE.md's copy |
| Branch-check before "unbuilt" | `CLAUDE.md:55` + `agent_lessons.md:23` + SessionStart hook | One home (lessons) |
| NOW.md is the one resume doc | `CLAUDE.md:134` + `agent_lessons.md:25` + `resume_doc_check.mjs` | Verifier wins; one line each |
| package-lock churn | `agent_lessons.md:11` + `:104` + `lock-sync-gate.sh` | Verifier wins; delete L11 |
| NOIR artifact style | `CLAUDE.md:189-191` + `artifact_noir_style.md` + `artifact-noir` skill + `DESIGN.md` | Two lines + pointer |
| Taglish register | `CLAUDE.md:85-126` + `agent_lessons.md:62-69` + `taglish-voice.md` + `taglish_2026_model.md` + hook | Keep chat rule + boundary; move copy rules |

**~1,500 words of the always-loaded set is a second or third copy of something else in the
same set.** That is the single largest recoverable block, and deleting a duplicate costs
nothing at all — the rule survives in its remaining home.

---

## Live contradictions found inside the always-loaded set

1. 🔴 **Max vs Pro.** `CLAUDE.md:137-144` is built on "Usage budget (Max 5x)" with Fable 5
   pinned as the main loop. `NOW.md:43-44` says the account is **Pro**, Fable is Max-only,
   and *"the Max assumption still lives in 5 files, policy, untouched."* Both load every
   session. The model reads a model-routing policy it cannot execute. **Fix this one first —
   it is a correctness bug, not bloat.**
2. **Taglish in an English-only file.** `agent_lessons.md:87` is written in Taglish;
   `agent_lessons.md:62` and `NOW.md:86` both rule that repo artifacts are English.
3. **Misfiled block.** `agent_lessons.md:102-105` sits under "Decision logs" but contains
   four lessons, one of which (L104) duplicates L11.

---

## The delete-list, ranked by tokens saved ÷ risk

| # | Action | ≈ Tokens | Risk | Loses a gate? |
|---|---|---|---|---|
| 1 | Delete the skill catalog `CLAUDE.md:66-77` | ~680 | **none** — auto-loaded elsewhere | no |
| 2 | Cut user-only skill descriptions to ~15 w | ~950 | **none** — they cannot auto-fire | no |
| 3 | Compress the Workflows Index to one line each | ~700 | low | no |
| 4 | Move the artifact URL registry out | ~380 | low | no |
| 5 | Rewrite the model-allocation block (**and fix Max→Pro**) | ~520 | low — *fixes a live error* | no |
| 6 | Move `/goal` mechanics, keep the gate line | ~380 | low | no |
| 7 | Move env-flag deep mechanics | ~350 | low | no |
| 8 | Move ffmpeg/Veo facts to the render skill | ~560 | **medium** — must land where render work loads it | no |
| 9 | Compress the artifact share/twin narrative | ~380 | low | no |
| 10 | Delete cross-file duplicates (branch-check, NOW.md, lockfile) | ~450 | low — verifiers hold them | no |
| 11 | Move tool decision logs to the archive | ~300 | low | no |
| 12 | Thin generic engineering advice `agent_lessons.md:37-46` | ~380 | **medium** — judgment call per line | no |
| 13 | Delete "vertical slices" `CLAUDE.md:146` | ~50 | none | no |
| | **Total** | **~5,700** | | **zero gates removed** |

**~5,700 of ~18,000 tokens — about a third of the always-loaded stack — with no gate
touched and no environment fact lost.** Items 1–7 and 9–11 are mechanical. Items 8 and 12
want Neil's eye.

---

## What I would not touch, at any model strength

- **Every GATE.** TUNED-file approval, the paid test spec, never-spend-autonomously,
  never-self-grant-permissions, Neil's eyeball as the believability grader, the two-gate
  plan→goal workflow, `public/` leaks, CSP/secrets. A stronger model makes an unsupervised
  mistake *faster and more confidently*. Removing the prompt removes the gate
  (`post_beta_roadmap.md:1475`).
- **The defreezer block** (`CLAUDE.md:50-54`). The highest-consequence fact in the repo.
- **Repo gotchas** (`agent_lessons.md:76-92`). One line each, un-derivable, no procedure.
  The whole file should converge on this shape.
- **The chat/copy/repo-artifact language boundary** (`agent_lessons.md:62`) and Neil's
  register rules. Not model guidance — Neil's voice.
- **The how-to-add-a-lesson rule** (`agent_lessons.md:1-5`). It is the reason this stack
  grew at prose-speed instead of doubling.

---

## Answer to the question that started this

**The stack is not suppressing model judgment.** PROC — the only category the "delete the
system prompt" advice targets — is roughly **900 of 13,494 words (~7%)**, and half of that
is discipline earned by documented repeats (verify a verifier fails first; judge by exit
code; re-run a subagent's infrastructure claim).

What the audit actually found is **duplication and situational detail that should load on
demand** — about a third of the stack, none of it a constraint on how the model thinks.

The corroborating evidence is in the lessons file itself: it records the model **skipping**
rules (branch-check 4×, lockfile 3×, Taglish drift twice in one day), not being strangled by
them. That is under-enforcement. The treatment for under-enforcement is a verifier, which
*shrinks* the prose — the same direction as the prune, for the opposite reason.

**Standing rule proposed** (the line missing from `agent_lessons.md` that made this audit
necessary): *When ablating the instruction stack, delete duplication and situational detail;
convert prose to verifiers; never delete a gate or an environment fact. Model strength
changes what must be explained, never what must be permitted.*
