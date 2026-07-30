import React, { useEffect } from 'react';
import { FORM_SECTION_TYPES, type FunnelConfig, type SectionInstance } from '../config.types';
import { SECTION_REGISTRY } from '../sections/registry';
import { StickyCta } from '../primitives/StickyCta';

interface LandingProps {
  config: FunnelConfig;
}

/**
 * TS can't correlate `section.type` with `section.props` across an index into
 * the registry, so the pairing is asserted exactly here — one cast, in one
 * place, guarded by the mapped type on SECTION_REGISTRY itself.
 */
const renderSection = (section: SectionInstance, index: number) => {
  const Component = SECTION_REGISTRY[section.type] as React.FC<Record<string, unknown>>;
  return <Component key={`${section.type}-${index}`} {...(section.props as Record<string, unknown>)} />;
};

export const Landing: React.FC<LandingProps> = ({ config }) => {
  // L8 is a design rule, not a type — a config CAN express zero or two forms,
  // and both are silent conversion bugs in production. Catch them at authoring
  // time, in dev only (the check strips out of the shipped bundle).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const formSections = config.sections.filter((section) => FORM_SECTION_TYPES.includes(section.type));
    if (formSections.length !== 1) {
      console.warn(
        `[funnel] Expected exactly ONE form section (${FORM_SECTION_TYPES.join(' | ')}), found ${formSections.length}. ` +
          'Every CTA scrolls to #lead-form — zero means the CTAs go nowhere, two means the anchor is ambiguous.'
      );
    }
  }, [config.sections]);

  // The hero owns the label + number; the sticky bar reuses them so there is
  // one place to change the CTA copy and the phone.
  const hero = config.sections.find((s) => s.type === 'hero');
  const heroProps = hero?.type === 'hero' ? hero.props : undefined;

  return (
    <>
      <main>{config.sections.map(renderSection)}</main>
      {heroProps && <StickyCta label={heroProps.ctaLabel} phone={heroProps.phone} />}
    </>
  );
};
