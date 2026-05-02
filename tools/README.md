# Tools

Deterministic Python (or Node) scripts that do the actual work. Invoked by the agent per workflow instructions.

Conventions:

- One job per script. Clear name.
- Read secrets from `.env`, never hardcoded.
- Print structured output (JSON when piping to another step).
- Exit non-zero on failure with a readable error on stderr.
