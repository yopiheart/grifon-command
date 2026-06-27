// Marketing / retargeting consent — shared constants.
//
// POLICY_VERSION records WHICH privacy-policy version a user agreed to when they
// granted marketing/retargeting consent. It is server-stamped onto the
// marketing_consent row (api/consent.ts) and proves the scope of consent.
//
// BUMP THIS when a material change to the retargeting / third-party-ad-partner
// disclosure in components/PrivacyPolicy.tsx changes what the user is consenting
// to. Keep the value an ISO date for a human-auditable trail. Existing rows keep
// their old policy_version until the user re-grants under the new policy.
//
// WHEN YOU BUMP: move the current value into PRIOR_POLICY_VERSIONS below so the
// consent endpoint still recognizes it as a legitimate historical version.
export const POLICY_VERSION = '2026-06-25';

// Every policy version we have ever shipped, besides the current one. The signup
// flow stamps the version a user SAW at signup into user_metadata; that intent is
// reconciled into a server record on first login (App.tsx), which can be days
// later and after a bump. The consent endpoint therefore accepts a client-
// asserted signup-time version ONLY if it is a version we actually published —
// this allowlist — otherwise it falls back to the current POLICY_VERSION. This
// keeps an arbitrary/forged version string out of the legal record while still
// recording the accurate historical version the user really agreed to.
const PRIOR_POLICY_VERSIONS: readonly string[] = [];

// POLICY_VERSION is always known by construction, so a bump can never desync.
export const KNOWN_POLICY_VERSIONS: readonly string[] = [
  POLICY_VERSION,
  ...PRIOR_POLICY_VERSIONS,
];

export const isKnownPolicyVersion = (v: unknown): v is string =>
  typeof v === 'string' && KNOWN_POLICY_VERSIONS.includes(v);
