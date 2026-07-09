// Pure derivation helpers for the One-Shot LaunchScreen creative axes. Extracted so the
// vertical × format × strategy → scriptType/businessType mapping is unit-testable WITHOUT
// mounting the whole React screen (it pulls motion/services/audio at import). No React here.

import type { ProductionInput } from '../../services/oneShotIntake';

export type OneShotFormat = 'ugc' | 'product_ugc' | 'ugc_pro' | 'commercial';
export type OneShotStrategy = 'Testimonial' | 'MrBeast';

/** scriptType from the vertical × format × strategy axes. UGC Pro is a cross-vertical FORMAT,
 * so it is checked BEFORE the vertical mapping — service/real-estate can now pick it. Then the
 * vertical drives its own style (Services/RealEstate), then within Product the Format × Strategy
 * axes pick the formula. */
export function deriveScriptType(
  vertical: string,
  format: OneShotFormat,
  strategy: OneShotStrategy,
): NonNullable<ProductionInput['scriptType']> {
  return format === 'ugc_pro' ? 'UGCPro'
    : vertical === 'service' ? 'Services'
      : vertical === 'real_estate' ? 'RealEstate'
        : format === 'product_ugc' ? 'Temu'
          : strategy;
}

/** businessType emitted straight from the vertical (note real_estate → 'realestate'). WINS over
 * the scriptType-derived fallback in oneShotIntake's businessTypeFor. */
export function deriveBusinessType(vertical: string): NonNullable<ProductionInput['businessType']> {
  return vertical === 'real_estate' ? 'realestate' : vertical === 'service' ? 'service' : 'product';
}
