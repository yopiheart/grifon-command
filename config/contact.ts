/**
 * Outbound contact channels. Wired into the Messenger float and the footer.
 * Replace the handles with the real Grifon / Zam pages before launch.
 */
export const CONTACT = {
  /** Opens Facebook Messenger to the Grifon page. TODO(Neil): real handle. */
  messengerUrl: 'https://m.me/grifon.ai',
  messengerLabel: 'Chat with us',
  facebookUrl: 'https://facebook.com/grifon.ai',
  instagramUrl: 'https://instagram.com/grifon.ai',
  tiktokUrl: 'https://www.tiktok.com/@grifon.ai',
  /** Existing Viber link used in the footer CTA. TODO(Neil): real number. */
  viberUrl: 'viber://chat?number=',
} as const;
