// Curated allowlist of admin-cloned voices exposed under // FILIPINO_LIBRARY
// in the Signal Modulator picker. Voices not in this list are NEVER returned
// to the client — even if they exist on the ElevenLabs account.
//
// This is the security boundary that prevents:
//   1. Admin's personal clones (e.g. "Zam Grifon voice") leaking to users.
//   2. User A's clones leaking to User B (since clones live on a shared
//      ElevenLabs workspace and aren't auto-scoped per user).
//   3. ElevenLabs Voice Library voices the admin saved for personal reference
//      (e.g. James, Ellen — English voices that aren't Filipino) accidentally
//      appearing under a "Filipino" label.
//
// To add a voice for shared user access:
//   1. Clone it on ElevenLabs and verify acceptable Tag-lish performance.
//   2. Append a new entry below with a clear displayName + description.
//   3. Redeploy.
//
// Display names override whatever is set in the ElevenLabs dashboard so the
// admin's internal labels (e.g. "SEAMAN TIKTOK") stay private and users see a
// curated, persona-driven label instead.
//
// Order = display order in the picker.

export interface FilipinoLibraryEntry {
  voice_id: string;
  displayName: string;
  description: string;
}

export const FILIPINO_LIBRARY: FilipinoLibraryEntry[] = [
  {
    voice_id: 'PKbMtaWYBHcnO1CK4WcR',
    displayName: 'Pinay Spokesperson',
    description: 'Female, 30s · Polished brand voiceover',
  },
  {
    voice_id: 'dYyGSlRIJpFhfgqtqiF9',
    displayName: 'Pinoy Reviewer',
    description: 'Male, 30s · Confident testimonial / DR pitch',
  },
  {
    voice_id: 'mPEHjC4AussYOrtIPSUB',
    displayName: 'Pinay Vlogger',
    description: 'Female, 20s · Bubbly TikTok / IG creator',
  },
  {
    voice_id: 'fH6D32IX4zlu35JrIpxf',
    displayName: 'Pinoy TikToker',
    description: 'Male, 20s · Fast-paced short-form hook',
  },
  {
    voice_id: 'hEXLVIK39FEDRaONh6dY',
    displayName: 'Pinoy Kid Voice',
    description: 'Child, 8–14 · Kids, family & cartoon ads',
  },
];

export const FILIPINO_LIBRARY_BY_ID = new Map(
  FILIPINO_LIBRARY.map(v => [v.voice_id, v])
);
