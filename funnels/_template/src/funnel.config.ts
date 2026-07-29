import type { FunnelConfig } from './config.types';
import { minimal } from './demo/minimal';

// ===========================================================================
// THE ACTIVE CONFIG — the one file a funnel instance edits.
//
// In _template this re-exports a demo config so the template builds and runs on
// its own. A real funnel replaces the import below with its own config object
// (usually inlined here, or kept beside it as `src/<client>.ts`).
//
// Everything downstream — every section, the lead form, the thank-you bridge
// and api/lead.ts's server-stamped identity — reads from this single export.
// Swap it for `./demo/longform` to exercise the long-page archetype.
// ===========================================================================

export const funnelConfig: FunnelConfig = minimal;
