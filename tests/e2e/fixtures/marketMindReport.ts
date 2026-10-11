import type { MarketResearchReport } from '../../../types';

// Synthetic saved data only. URLs are reserved examples, not verified research.
export const savedMarketMindReport: MarketResearchReport = {
  subject: 'Northstar Bakery delivery brief',
  winningAvatar: 'Busy neighbourhood office teams',
  demographics: 'Hypothesis: office teams near the bakery.',
  dayInTheLife: 'A team organiser needs breakfast before the morning meeting.',
  bleedingNeck: 'Coordinating individual breakfast orders takes time.',
  deepFear: 'Letting the team down with a late order.',
  threeAmThought: 'Will the order arrive before the meeting?',
  graveyard: [{ tried: 'Individual orders', whyFailed: 'Hypothesis: too many delivery windows.' }],
  objectionToUs: 'Will everyone find something they like?',
  magicGenie: 'One breakfast order for the whole team.',
  emotionalPayoff: 'A calmer start to the workday.',
  statusUpgrade: 'The organiser who makes meetings easier.',
  bigIdea: 'Plan team breakfast in one order.',
  headlines: ['One order. A calmer morning.', 'Breakfast before the meeting.'],
  videoHooks: [{ type: 'Direct Pain', visual: 'An organiser checks several order messages.', spokenLine: 'Still collecting everyone’s breakfast order?' }],
  villain: 'The extra coordination between individual orders.',
  competitorMatrix: [{ competitor: 'Individual delivery orders', weakness: 'Hypothesis: separate arrival times.', exploitationAngle: 'Show one organised group order.' }],
  fbAdLibraryAngles: [{ format: 'Demo', angle: 'Convenience', openingLine: 'Here is how we plan team breakfast.', whyItWorks: 'Hypothesis: a clear process reduces uncertainty.' }],
  rawEvidence: [
    '[Source-backed] Delivery zones are listed on the menu | https://example.com/menu | Fixture only',
    '[User-provided] Minimum group order is ten boxes | supplied input field: productDescription',
    'Customers always buy more after trying one box.',
    '[Source-backed] Unsupported result | javascript:alert(1)',
  ],
  contrarianTruth: 'Hypothesis: simplify ordering before expanding the menu.',
  narrativeReport: 'Original saved narrative: these are synthetic campaign hypotheses, not real customer research. <script>window.__unsafeNarrative=true</script>',
};

export const sparseMarketMindReport: Pick<MarketResearchReport, 'subject' | 'narrativeReport'> = {
  subject: 'Older saved report',
  narrativeReport: 'An older narrative remains available even without structured fields.',
};
