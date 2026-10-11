export interface MarketMindEvidenceAttribution {
  status: 'Source link supplied' | 'User-provided' | 'Attribution missing';
  sources: { href: string; host: string }[];
}

export const getMarketMindEvidenceAttribution = (evidence: string): MarketMindEvidenceAttribution => {
  const sources: MarketMindEvidenceAttribution['sources'] = [];
  const candidates = evidence.match(/https?:\/\/[^\s<>"`]+/gi) ?? [];

  for (const candidate of candidates) {
    let href = candidate.replace(/[.,;!?]+$/, '');
    for (const [open, close] of [['(', ')'], ['[', ']']]) {
      while (href.endsWith(close) && href.split(close).length > href.split(open).length) {
        href = href.slice(0, -1);
      }
    }
    try {
      const url = new URL(href);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) continue;
      if (!sources.some(source => source.href === url.href)) {
        sources.push({ href: url.href, host: url.host });
      }
    } catch {
      // Keep malformed source text visible without turning it into a link.
    }
  }

  return {
    status: /\[User-provided\]/i.test(evidence)
      ? 'User-provided'
      : sources.length > 0 ? 'Source link supplied' : 'Attribution missing',
    sources,
  };
};
