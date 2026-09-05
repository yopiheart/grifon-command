# GRIFON COMMAND agent instructions

These instructions are the Codex counterpart to `CLAUDE.md`. Keep the Claude
files while the migration is in progress. When the two disagree, follow this
file for Codex work and flag the discrepancy instead of silently choosing one.

## Session continuity

Before planning a substantial change, read `NOW.md`, `agent_lessons.md`,
`UBIQUITOUS_LANGUAGE.md`, and the last five commits. `NOW.md` is the only resume
document: overwrite it only when a session changes project state; never create a
second resume document. Check remote branches and repository content before
declaring work missing. Documentation is context, not runtime evidence.

## Product and architecture

GRIFON COMMAND is a React 18 + Vite + TypeScript + Tailwind AI-marketing
platform. It combines market research, offer and script generation, an
eight-stage Director wizard, storyboards, image/video generation, ElevenLabs
voice, FFmpeg rendering, dashboard tools, Supabase auth/data, PayMongo billing,
and Vercel API functions. Gemini, Kling, and ElevenLabs credentials belong only
in server handlers; browser code calls the `api/*` proxies.

- `App.tsx` owns manual URL routing, auth state, wizard state, and dashboard
  module selection. There is no React Router or global state framework.
- `components/` contains wizard UI and dashboard modules; several wizard steps
  also own local state and existing generation calls.
- `services/` contains lazy client-side service singletons and persistence.
- `api/` contains Vercel handlers and server-only shared infrastructure.
- `types.ts` is the shared type source; the main pipeline value is `AllData`.
- Long video operations are fire-then-poll jobs.
- Follow the Workflows -> Agents -> Tools discipline in
  `workflows/wat-framework.md`; prefer an existing deterministic tool over a
  new ad-hoc script.

## Working preferences

- Use Node 24 and npm 11. Install the root with `npm ci`; each project under
  `funnels/` has a separate manifest and installation.
- Before a non-trivial edit, state success, failure, and verification criteria.
- Make surgical changes. Do not bundle cleanup, speculative abstractions,
  compatibility shims, or unrelated dependency upgrades.
- Do not delete pre-existing work without explicit approval.
- Use the canonical terms in `UBIQUITOUS_LANGUAGE.md`.
- Reply in the user's language register. Before user-facing Taglish copy, read
  `.claude/skills/_shared/taglish-voice.md`; show the exact line for approval.
- For UI work, follow `DESIGN.md`, use existing `components/ui` primitives, and
  smoke-check the affected flow at a mobile viewport.
- Never bypass a failed gate with `--no-verify`, skipped tests, or type-ignore
  directives. Diagnose the failure and distinguish setup failures from product
  failures.
- Never pipe a command whose exit status matters. Record the command's own exit
  code.
- Do not deploy or merge unless the user explicitly requests it. Review the
  diff and run applicable checks before committing.

## Secrets

Never read, print, copy, commit, or place secret values in chat or artifacts.
`.env.example` provides names; processes receive values from the cloud secret
store. `VITE_*` values are browser-visible. Server secrets must never gain a
`VITE_` prefix or appear in `dist/`. It is acceptable to check whether a
variable is present, but never print its value.

## Tuned content: explicit approval required

Do not modify prompt text, system instructions, response schemas, safety rules,
model IDs, or generation knobs without the user's explicit approval of that
specific diff. This applies especially to:

- `services/geminiService.ts`
- `api/_lib/prompts.ts`

The restriction also covers duplicated tuned blocks in evaluation harnesses.
Transport, type signatures, error wrapping, and genuinely structural refactors
may be changed only when the requested task requires them; identify them as
structural before editing. Read the scoped instructions in `services/` and
`api/` first.

## Paid and externally visible operations

- Never launch, modify, pause, or fund an ad campaign autonomously. Read-only ad
  inspection is allowed; prepare write commands for the user to approve and run.
- Any paid AI/render operation requires a user-approved test spec covering
  purpose, pass/fail criteria, exact inputs/assets, evidence, and maximum cost.
  Any changed input is a new approval request.
- Paid Veo runs require a nearby `script.spec.json`, a passing
  `node tools/ad_preflight.mjs --script <path>`, and a user-approved
  `maxPaidRolls`. Never increase the cap merely to continue.
- Prefer dry runs. Do not publish artifacts, deploy, or alter production data
  unless explicitly requested.
- Keep live/paid test switches such as `RUN_REGRESSION`, `RUN_BURNIN`, and
  `RUN_IMAGE_GATE_SMOKE` unset during ordinary verification.

## Verification

For application changes, run the narrowest relevant tests and then:

```bash
npm run build
npm run test
```

Run applicable checks from `package.json`, especially bundle-leak, voice-sync,
domain-language, PowerShell ASCII, and artifact-anchor checks. Browser behavior
uses Playwright via `npm run test:e2e`; paid/live regression suites remain off by
default. A new verifier must be demonstrated to fail against the original
defect, not merely pass against the fix.
