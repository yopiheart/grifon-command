// OAuth providers shown on the auth gateway. Flip a flag to hide a button
// without touching App.tsx. A visible provider MUST also be enabled in
// Supabase Dashboard → Authentication → Providers, or sign-in errors:
//   - google: live since launch.
//   - github: needs a free GitHub OAuth App (Settings → Developer settings →
//     OAuth Apps; callback URL = https://<project-ref>.supabase.co/auth/v1/callback).
//   - apple: needs a paid Apple Developer account ($99/yr) — Services ID,
//     Sign in with Apple key, and domain verification. Keep false until done.
export const OAUTH_PROVIDERS = {
  google: true,
  github: true,
  apple: true,
} as const;
