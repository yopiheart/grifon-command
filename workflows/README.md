# Workflows

Markdown SOPs that tell the agent *what* to do and *how*. Each workflow:

- Has a clear objective
- Lists required inputs
- Names the tools it uses (from `tools/`)
- Specifies expected outputs (usually to a cloud destination)
- Documents edge cases and learnings

## Index

- [launch_readiness.md](launch_readiness.md) — meta-workflow tracking all gates before taking paying users
- [app_audit.md](app_audit.md) — produce a prioritized punch list of what's broken/stubbed/risky
- [fix_broken_feature.md](fix_broken_feature.md) — SOP for fixing one item from the punch list
- [infra_setup.md](infra_setup.md) — stand up Supabase, PayMongo, Google OAuth, domain, hosting
- [archive/](archive/README.md) — finished dated session handoffs. **History, not resume
  paths.** Read [`NOW.md`](../NOW.md) for where work stopped; the archive README carries the
  rule for when a handoff moves here.

## How workflows relate

```
launch_readiness.md   (the scoreboard)
        |
        ├── app_audit.md ──> fix_broken_feature.md  (code-side work)
        └── infra_setup.md                          (external services)
```

