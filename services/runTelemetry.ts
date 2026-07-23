// Client-side active-run correlator (P2 observability). Holds the id of the producer
// run currently in flight so the shared Gemini proxy transport (geminiService's
// proxyFetch) can stamp `x-run-id` on every generation call made during a run — that
// header lets the server join per-call COGS + node events back to the run.
//
// Module singleton, mirroring the lazy-singleton service style. Pure, browser-safe,
// side-effect-free: the orchestrator sets the id when a run starts/resumes and clears
// it (null) when the run parks at a gate, errors, or completes.

let activeRunId: string | null = null;

/** Set (or clear, with null) the run id stamped on subsequent proxy calls. */
export const setActiveRunId = (id: string | null): void => {
  activeRunId = id;
};

/** The run id currently in flight, or null when no producer run is active. */
export const getActiveRunId = (): string | null => activeRunId;
