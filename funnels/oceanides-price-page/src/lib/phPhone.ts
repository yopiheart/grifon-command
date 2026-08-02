// ===========================================================================
// phPhone — Philippine mobile numbers, shared by the form and the API.
//
// Neil, 2026-08-01: "pag kulang or mali ung philippine mobile number di sila
// makakaproceed." A booking that cannot be called is not a booking, and this
// funnel's entire promise is that somebody rings you back to confirm the price
// before a truck moves. A mistyped number is the one input error that silently
// destroys the lead — the row still lands in Supabase looking perfectly fine.
//
// 🔴 SHAPE ONLY, NEVER A CARRIER PREFIX WHITELIST.
// It is tempting to check the number against the list of known PH prefixes
// (0917 Globe, 0918 Smart, and so on). Do not. New prefixes are issued as
// carriers grow — DITO alone added the 099x and 089x blocks — and a whitelist
// that has gone stale REJECTS A REAL PAYING CUSTOMER at the form. That failure
// is silent, permanent, and strictly worse than the failure it prevents: a
// wrong-but-well-shaped number gets caught on the callback anyway, when a human
// hears it ring out. So this validates length and leading digits, nothing more.
//
// Accepted, all the ways a Filipino actually writes their own number:
//   09XX XXX XXXX   0917-123-4567   +63 917 123 4567   639171234567   9171234567
// ===========================================================================

export type PhPhoneResult =
  | { ok: true; /** 09XXXXXXXXX, the storage + display form */ local: string; /** +639XXXXXXXXX */ e164: string; /** 09XX XXX XXXX */ pretty: string }
  | { ok: false };

/** Everything a human uses as a separator. `+` survives: it carries meaning. */
const SEPARATORS = /[\s()\-.]/g;

export const normalizePhMobile = (raw: string): PhPhoneResult => {
  const cleaned = raw.replace(SEPARATORS, '');

  // Each branch peels the country/trunk prefix off and keeps the SUBSCRIBER
  // part: a leading 9 plus nine digits. Everything downstream is built from it,
  // so there is one canonical form no matter how it was typed.
  let subscriber: string | null = null;
  if (/^09\d{9}$/.test(cleaned)) subscriber = cleaned.slice(1);
  else if (/^\+639\d{9}$/.test(cleaned)) subscriber = cleaned.slice(3);
  else if (/^639\d{9}$/.test(cleaned)) subscriber = cleaned.slice(2);
  else if (/^9\d{9}$/.test(cleaned)) subscriber = cleaned;

  if (!subscriber) return { ok: false };

  const local = `0${subscriber}`;
  return {
    ok: true,
    local,
    e164: `+63${subscriber}`,
    pretty: `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`,
  };
};
