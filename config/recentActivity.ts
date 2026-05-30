/**
 * Recent-activity social proof shown as rotating popups on checkout.
 *
 * HONEST USE ONLY — these must be REAL Grifon customers/events. Seeded from the
 * existing testimonials. TODO(Neil): add/replace with your real recent signups
 * (first name + city + a true action). Do NOT pad this with invented people —
 * a trust-driven PH market will catch fabricated activity.
 */
export interface RecentActivity {
  /** First name + last initial, e.g. "Mark R." */
  name: string;
  city: string;
  /** Real, plain-language action, e.g. "started their Grifon trial". */
  action: string;
}

export const RECENT_ACTIVITY: RecentActivity[] = [
  { name: 'Mark R.', city: 'Cebu', action: 'started their Grifon trial' },
  { name: 'Jessa L.', city: 'Manila', action: 'upgraded to Pro' },
  { name: 'Carlo D.', city: 'Davao', action: 'created their first ad' },
];
