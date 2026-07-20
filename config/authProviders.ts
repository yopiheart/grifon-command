// OAuth providers shown on the auth gateway. Flip a flag to hide a button
// without touching App.tsx. A visible provider MUST also be enabled in
// Supabase Dashboard → Authentication → Providers, or sign-in errors:
//   - google: live since launch.
//   - github: needs a free GitHub OAuth App (Settings → Developer settings →
//     OAuth Apps; callback URL = https://<project-ref>.supabase.co/auth/v1/callback).
//     Flagged OFF for audience fit — our users are Filipino SMB owners, not
//     developers; Google + email already covers the market, so the GitHub button
//     is one more decision with no payoff. Re-enable any time by flipping this
//     flag back to true (the OAuth App setup instructions above still apply).
//   - apple: needs a paid Apple Developer account ($99/yr) — Services ID,
//     Sign in with Apple key, and domain verification. Keep false until done.
export const OAUTH_PROVIDERS = {
  google: true,
  github: false, // off for audience fit — SMB owners, not devs (see note above)
  apple: false, // off until Neil enrolls in the Apple Developer Program ($99/yr)
} as const;
