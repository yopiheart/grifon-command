/**
 * Outbound contact channels. Wired into the Messenger float and the footer.
 * Replace the handles with the real Grifon / Zam pages before launch.
 */
export const CONTACT = {
  /** Opens Facebook Messenger to the Grifon page. */
  messengerUrl: 'https://m.me/grifonai',
  messengerLabel: 'Chat with us',
  /** Facebook page (m.me/grifonai resolves to this same page). */
  facebookUrl: 'https://facebook.com/grifonai',
  /** TODO(Neil): confirm real IG / TikTok handles (assumed @grifonai). */
  instagramUrl: 'https://instagram.com/grifonai',
  tiktokUrl: 'https://www.tiktok.com/@grifonai',
  /** Opens a Viber 1:1 chat with the Grifon line (+63 926 681 0142). */
  viberUrl: 'viber://chat?number=%2B639266810142',
} as const;
