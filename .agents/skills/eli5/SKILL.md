---
name: eli5
description: Explain one Grifon system as a picture page for someone who knows nothing about it - big visuals, few words, published as a NOIR artifact. Use when Neil types /eli5 <topic>, or asks for a dead-simple explainer, a mental model, a "how does X actually work" walkthrough, or an onboarding page for a subsystem, flag, or pipeline. NOT for condensing the previous reply (tldr), NOT for customer-facing product copy (grifon-cmo), NOT for client work under clients/.
disable-model-invocation: true
---

For Codex tool execution, read [the desktop adapter](../_shared/codex-runtime.md) before following the workflow below.

# /eli5

Adapted from Thariq Shihipar's `eli5` plugin (`anthropics/claude-plugins-community`, MIT).
The original is one sentence: *"explain like I'm someone who knows nothing about this
topic, using a HTML artifact with big pictures and few words."* That sentence is the whole
asset. Everything below is what it takes to run it safely in this repo, where artifacts
already have a spec, a build gate, and a client carve-out.

**Do not install the upstream plugin.** It has no `disable-model-invocation`, so it fires
on any "explain how X works" and starts minting ungated artifacts.

---

## 🛑 STOP - is this client work?

**If the topic is anything under `clients/<name>/`, the NOIR look below is wrong.** Follow
that client's `DESIGN.md`. For Oceanides that is matte navy + amber, no glass, no charcoal,
no `#FFCC00`, and the copy is Taglish, not English. Read `artifact-noir`'s own STOP block
before you assume otherwise.

Everything else here is a Grifon-project explainer: English, NOIR, one screen of ideas.

---

## The constraint that IS the skill

Big pictures. Few words. Assume the reader knows nothing and has a phone.

- **One subject per page.** If you are explaining the render pipeline AND the flag matrix,
  you have two pages. Cramming both is the exact failure this skill exists to prevent.
- **The structure carries the meaning.** A truth table gets a matrix; a pipeline gets a
  flow; a before/after gets two panels. Pick the shape from the subject. Numbered markers
  (01 / 02 / 03) are a lie unless the thing is genuinely a sequence.
- **Word budget.** No paragraph over ~40 words. If a point needs more, it is a diagram you
  have not drawn yet.
- **One insight, stated once, in the largest type on the page.** Everything else supports
  it. If you cannot name that insight in a sentence, you do not understand the subject well
  enough to explain it yet - go read more code.

## Build it from the code, not from the docs about the code

**This is the Grifon-specific rule, and it is the one that pays.** `AGENTS.md`, `NOW.md` and
the `workflows/*` files describe these systems in prose that was accurate when written. An
explainer sourced from that prose inherits its drift and launders it into something that
*looks* authoritative because it is beautifully typeset.

Open the actual call sites. Every time this has been done the code was sharper than the
doc - the first page built with this skill (the image gate) found that the two halves of one
gate have opposite severity, which the prose describes as "asymmetric partial state" and the
code states as `sc.status = 'flagged'; return;` next to a swallowed 503.

If the subject spans a large file (`services/geminiService.ts` is 91 KB), fan out through the
`explorer` subagent. Reading it in the main loop consumes the smart zone for the rest of the
session, and AGENTS.md's Context Hygiene section is explicit about that.

## Never type a line number

An explainer that cites `foo.ts:412` is wrong the moment someone inserts a line above it, and
a wrong explainer is worse than none - it teaches the reader to distrust the whole page.

If the page cites source locations, resolve them in the builder from a unique **anchor string**
and fail the build when the anchor is gone or stops being unique. See
[`tools/artifacts/build-eli5-image-gate.mjs`](../../../tools/artifacts/build-eli5-image-gate.mjs)
for the pattern. Anchor on code, not comments: a comment can be reworded by anyone, but the
wiring cannot move without the behaviour moving with it, which is exactly when the page needs
rereading.

## Rendering, twins, and the mobile gate

**Do not restate the NOIR spec here.** Load `artifact-noir` and follow it: charcoal ground,
`#FFCC00`, solid display type (`background-clip:text` is banned), audited contrast floors,
`finalize()` from `_gates.mjs`, and the 390x844 `smoke-tester` screenshot before Neil sees a
URL. No mobile screenshot = not done.

### Throwaway vs kept

**Granted by Neil, 2026-08-26. `AGENTS.md` is canonical** - the rule lives beside the twin rule
it modifies, because a carve-out in a `disable-model-invocation` skill is invisible to a reader
of `AGENTS.md`, and that asymmetry cost the 2026-07-28 rebuild. What follows is the working
summary; if the two ever disagree, `AGENTS.md` wins.

| Kind | Builder + twin | Registry line |
|---|---|---|
| **Throwaway** - explaining one thing once, mid-session, to unblock a decision in front of you | not required | no |
| **Kept** - a mental model the repo will need again in a later task | required | yes, in AGENTS.md |

⚠ **Exempt from the twin ONLY.** A throwaway still goes through `finalize()`, still obeys the
NOIR mobile-safe rules, and still passes the 390x844 gate before anyone sees a URL. Speed is the
point of the carve-out; a page that mispaints on a phone is not faster, it is just wrong sooner.

**Promotion is Neil's word, not your judgement.** The trigger is him saying "keep this one" -
not your own read of how good the page is. When he does, build the builder and add the registry
line *while the sources are still in context*, because after a context reset the
reasoning that produced the page is gone and only the page is left.

(History, so nobody re-litigates it: the session that wrote this skill originally dated this
"decided 2026-08-26" while Neil had ruled on nothing. That fabricated attribution was caught in
review on PR #118, downgraded to a PROPOSAL, and then actually granted.)

## Not this skill

- **Condensing the previous reply** -> `tldr`. That skill is forbidden from running tools;
  this one is required to. They do not overlap.
- **Explaining Grifon to a customer** -> `grifon-cmo` + `grifon-creative-director`, in the
  app's DESIGN.md tokens and Taglish. An onboarding page for paying users is product surface,
  not an artifact.
- **"What broke and what did we learn"** -> `agent_lessons.md` and its archive. Those are
  grep-able; a picture page is not. Do not trade a searchable file for a pretty one.
- **A chart or dashboard of numbers** -> `dataviz` + `artifact-noir`. eli5 explains a
  mechanism, not a metric.
