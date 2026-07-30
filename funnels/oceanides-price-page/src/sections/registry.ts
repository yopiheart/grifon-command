import type React from 'react';
import type { PropsOf, SectionType } from '../config.types';
import { HeroOptin } from './HeroOptin';
import { Hero } from './Hero';
import { SocialProofBar } from './SocialProofBar';
import { TestimonialWall } from './TestimonialWall';
import { OriginStory } from './OriginStory';
import { CaseStudyMetrics } from './CaseStudyMetrics';
import { ValueStack } from './ValueStack';
import { ObjectionReversal } from './ObjectionReversal';
import { Guarantee } from './Guarantee';
import { CtaBlock } from './CtaBlock';
import { BonusStack } from './BonusStack';
import { FaqAccordion } from './FaqAccordion';
import { PsBlock } from './PsBlock';
import { LeadFormSection } from './LeadFormSection';
import { ComplianceFooter } from './ComplianceFooter';

// The section type → component map. Because it is typed as a mapped type over
// SectionType, adding a case to the SectionInstance union without writing the
// component is a compile error, not a blank strip on a live landing page.
type SectionComponents = { [K in SectionType]: React.FC<PropsOf<K>> };

export const SECTION_REGISTRY: SectionComponents = {
  heroOptin: HeroOptin,
  hero: Hero,
  socialProofBar: SocialProofBar,
  testimonialWall: TestimonialWall,
  originStory: OriginStory,
  caseStudyMetrics: CaseStudyMetrics,
  valueStack: ValueStack,
  objectionReversal: ObjectionReversal,
  guarantee: Guarantee,
  ctaBlock: CtaBlock,
  bonusStack: BonusStack,
  faqAccordion: FaqAccordion,
  psBlock: PsBlock,
  leadFormSection: LeadFormSection,
  complianceFooter: ComplianceFooter,
};
