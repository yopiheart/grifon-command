// Pure businessType→scriptType helper for Step 2 (Advanced Mode). Extracted into its own
// React-free module so it's unit-testable without importing the whole Step2BusinessInfo
// component tree (which pulls geminiService/supabase at import). No React here.

import type { BusinessInfo } from '../types';

export type Step2ScriptType = NonNullable<BusinessInfo['scriptType']>;

/** The scriptType a Physical-Product / Service / Real-Estate toggle should land on: keep the
 * current pick when it's still valid for the chosen group, otherwise fall to the group's
 * default. UGC Pro and Custom are valid in ALL groups, so a restored UGC Pro draft SURVIVES a
 * toggle (fixes the silent MrBeast clobber — a UGCPro draft used to reset on one tap of the
 * already-active segment). */
export function scriptTypeForBusinessType(
  bt: 'product' | 'service' | 'realestate',
  current: Step2ScriptType | undefined,
): Step2ScriptType {
  const productOk: string[] = ['MrBeast', 'Testimonial', 'UGCPro', 'Custom'];
  const serviceOk: string[] = ['Services', 'UGCPro', 'Custom'];
  const realEstateOk: string[] = ['RealEstate', 'UGCPro', 'Custom'];
  const ok = bt === 'service' ? serviceOk : bt === 'realestate' ? realEstateOk : productOk;
  const fallback: Step2ScriptType = bt === 'service' ? 'Services' : bt === 'realestate' ? 'RealEstate' : 'MrBeast';
  return current && ok.includes(current) ? current : fallback;
}
