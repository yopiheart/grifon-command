#!/usr/bin/env node
import { readFile, writeFile, stat } from 'node:fs/promises';
import { parseReferencePacket, referenceLimits, conceptIsUsable, MAX_REFERENCE_PACKET_BYTES } from '../services/adReconBrief.ts';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node tools/ad-recon-brief.mjs --input packet.json [--output review.md]\nOffline validation and review export only. No credentials, network or production approval.');
} else {
  try {
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!['--input', '--output'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || options[args[i]]) throw new Error('Use --input packet.json [--output review.md].');
      options[args[i]] = args[i + 1];
    }
    if (!options['--input']) throw new Error('Missing --input packet.json.');
    if ((await stat(options['--input'])).size > MAX_REFERENCE_PACKET_BYTES) throw new Error('Packet exceeds 64 KiB.');
    const packet = parseReferencePacket(await readFile(options['--input'], 'utf8'));
    const lines = [`# ${packet.subject.brandName}: ad reference review`, '',
      `Evidence mode: **${packet.evidenceMode}**${packet.evidenceMode === 'synthetic' ? ' — fixture, not production-ready' : ' — operator-recorded; import validates consistency only'}.`,
      `Observed: ${packet.observedAt}`, `Offer: ${packet.subject.offer}`, `Audience: ${packet.subject.audience}`, '',
      '## Collection limits', '', ...referenceLimits(packet).map(line => `- ${line}`)];
    for (const concept of packet.concepts) {
      lines.push('', `## ${concept.title}`, '', `Review readiness: ${conceptIsUsable(packet, concept) ? 'usable with explicit review of limits' : 'blocked'}.`,
        `Format: ${concept.format}`, `Customer problem: ${concept.customerProblem}`, `Selling angle: ${concept.sellingAngle}`, `Hook idea: ${concept.hook}`,
        `Original proof plan: ${concept.originalProof}`, `Required assets: ${concept.requiredAssets.join('; ')}`, `Test hypothesis: ${concept.testHypothesis}`, '', 'Recorded observations:');
      for (const source of packet.sources.filter(source => concept.sourceIds.includes(source.id))) {
        lines.push(`- Source ${source.id}: ${source.sourceUrl} (${source.scope}, ${source.activity}, observed ${source.observedAt}; displayed start ${source.startDate ?? 'unknown'})`);
        for (const observation of source.observations.filter(o => concept.observationIds.includes(o.id))) lines.push(`  - ${observation.id}: ${observation.text}`);
      }
    }
    lines.push('', 'Review export does not authorize paid generation, publishing or campaign changes.', '');
    if (options['--output']) await writeFile(options['--output'], lines.join('\n'), 'utf8');
    console.log(JSON.stringify({ valid: true, packetId: packet.id, evidenceMode: packet.evidenceMode,
      usableConcepts: packet.concepts.filter(c => conceptIsUsable(packet, c)).map(c => c.id), output: options['--output'] ?? null }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
