export const meta = {
  name: 'regression-fanout',
  description: 'Read-only regression sweep: one Explore agent per dashboard module verifies its generation path still produces on-spec output; reports failures.',
  whenToUse: 'When post_beta_roadmap.md item #1 triggers (beta live AND a second post-beta change shipped without manual re-test). Authored ahead of time — do not run before that trigger.',
  phases: [
    { title: 'Sweep', detail: 'one read-only Explore agent per module' },
    { title: 'Report', detail: 'collate failures' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// FENCE (see CLAUDE.md → Parallel Background Agents):
//   • Every agent here is agentType 'Explore' → read-only by construction. It
//     CANNOT Edit/Write, so it can never touch services/geminiService.ts or
//     api/_lib/prompts.ts. Keep it that way — do not switch to a writing agent.
//   • This workflow REPORTS regressions; it never fixes or merges them. A human
//     reviews the report and decides. (agent_lessons.md 2026-05-09)
//   • Each agent must assess the load-bearing OUTPUT of the module, not merely
//     that a call returned 200. A green intermediate with a regressed artifact
//     is a false pass. (agent_lessons.md 2026-05-19)
// ─────────────────────────────────────────────────────────────────────────────

// Dashboard modules per CLAUDE.md → Architecture. Each `focus` names the
// load-bearing output an agent must actually inspect.
const MODULES = [
  { key: 'MarketResearch',      focus: 'avatar profiles + pain points + competitor matrix + headline concepts are populated and coherent' },
  { key: 'OfferOptimizer',      focus: 'three-tier offer ladder (Tripwire / Core / High-Ticket) is generated and internally consistent' },
  { key: 'CaptionHeadline',     focus: 'caption + headline variants returned, on-brand, non-empty' },
  { key: 'OrganicCalendar',     focus: 'calendar entries span the requested period with distinct, usable post ideas' },
  { key: 'ImageAdsGen',         focus: 'image ad concept(s) generated and returned without error' },
  { key: 'CinematicSpecStudio', focus: 'cinematic spec JSON is well-formed and matches the expected schema' },
  { key: 'GenerateVideo',       focus: 'video job fires, returns a job id, and poll path reaches a terminal state' },
  { key: 'EditVideo',           focus: 'edit pipeline accepts input and returns a valid output reference' },
  { key: 'ImageEditor',         focus: 'image edit returns a modified image, not the untouched input' },
  { key: 'SignalModulator',     focus: 'per-scene TTS hand-off produces audio for each scene' },
  { key: 'InfluencerForge',     focus: 'influencer persona avatar renders, then routes to script/storyboard/video' },
  { key: 'IntelligenceUplink',  focus: 'brand-identity context is captured and synced to global state' },
];

const RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['module', 'status', 'loadBearingOutput', 'findings'],
  properties: {
    module: { type: 'string' },
    status: { type: 'string', enum: ['pass', 'fail', 'unknown'] },
    loadBearingOutput: {
      type: 'string',
      description: 'The actual artifact inspected and what was observed — not "the call succeeded".',
    },
    findings: {
      type: 'array',
      items: { type: 'string' },
      description: 'Specific regressions or risks; empty if pass.',
    },
  },
};

phase('Sweep');

const results = await parallel(
  MODULES.map((m) => () =>
    agent(
      [
        `You are auditing the "${m.key}" dashboard module of Grifon Command (React + Vite + TS).`,
        `Read components/${m.key}.tsx and trace its generation call path through services/geminiService.ts (and any api/* handler it hits).`,
        `Verify the LOAD-BEARING OUTPUT: ${m.focus}.`,
        `Judge whether the module still produces correct, on-spec output. A call returning without error is NOT a pass on its own — inspect the artifact's shape/content.`,
        `Do not edit anything. Report findings only.`,
      ].join('\n'),
      {
        label: `sweep:${m.key}`,
        phase: 'Sweep',
        agentType: 'Explore',
        schema: RESULT_SCHEMA,
      },
    ),
  ),
);

phase('Report');

const checked = results.filter(Boolean);
const failures = checked.filter((r) => r.status === 'fail');
const unknown = checked.filter((r) => r.status === 'unknown');

log(`Swept ${checked.length}/${MODULES.length} modules — ${failures.length} fail, ${unknown.length} unknown.`);

return {
  summary: {
    total: MODULES.length,
    checked: checked.length,
    failed: failures.length,
    unknown: unknown.length,
  },
  failures,
  unknown,
  all: checked,
};
