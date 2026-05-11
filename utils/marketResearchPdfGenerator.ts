import { MarketResearchReport } from '../types';
import {
  createBrandedPdf,
  drawCoverTitle,
  drawSectionHeader,
  drawWrappedText,
  drawKeyValueRow,
  drawTwoColumnTable,
  ensureSpace,
  finalizePdf,
} from './pdfTemplate';

export async function generateMarketResearchPdf(
  result: MarketResearchReport,
  productName: string
): Promise<Blob> {
  const titleProduct = productName?.trim() || result.subject?.trim() || 'Market Intelligence Report';
  const ctx = await createBrandedPdf({
    title: `Market Intelligence Report — ${titleProduct}`,
    subtitle: 'Grifon Command — MarketMind',
  });

  drawCoverTitle(ctx, 'Market Intelligence Report', titleProduct);

  // 1 — WINNING AVATAR
  drawSectionHeader(ctx, '// WINNING_AVATAR', 'Who you actually sell to');
  if (result.winningAvatar) drawWrappedText(ctx, result.winningAvatar);
  if (result.demographics) {
    ctx.cursorY += 2;
    drawKeyValueRow(ctx, 'Demographics', result.demographics);
  }
  if (result.dayInTheLife) {
    drawWrappedText(ctx, `Day in the life: ${result.dayInTheLife}`);
  }
  ctx.cursorY += 3;

  // 2 — BLEEDING NECK
  ensureSpace(ctx, 40);
  drawSectionHeader(ctx, '// BLEEDING_NECK', 'The pain that wakes them up at 3am');
  if (result.bleedingNeck) drawWrappedText(ctx, result.bleedingNeck);
  if (result.deepFear) drawKeyValueRow(ctx, 'Deep fear', result.deepFear);
  if (result.threeAmThought) drawKeyValueRow(ctx, '3am thought', result.threeAmThought);
  ctx.cursorY += 3;

  // 3 — BIG IDEA
  ensureSpace(ctx, 30);
  drawSectionHeader(ctx, '// BIG_IDEA', 'Sabri Suby — the domino that knocks the rest down');
  if (result.bigIdea) drawWrappedText(ctx, result.bigIdea);
  ctx.cursorY += 3;

  // 4 — HEADLINES
  if (result.headlines?.length) {
    ensureSpace(ctx, 30);
    const labels = ['Pain', 'Dream', 'Curiosity', 'Social Proof', 'Contrarian'];
    drawTwoColumnTable(
      ctx,
      '// HEADLINES',
      result.headlines.map((h, i) => ({ left: labels[i] ?? `H${i + 1}`, right: h }))
    );
  }

  // 5 — VIDEO HOOKS
  if (result.videoHooks?.length) {
    ensureSpace(ctx, 40);
    drawSectionHeader(ctx, '// VIDEO_HOOKS', '3-second scroll-stoppers, ordered by type');
    for (const hook of result.videoHooks) {
      drawKeyValueRow(ctx, hook.type, `"${hook.spokenLine}"`);
      if (hook.visual) drawWrappedText(ctx, `Visual: ${hook.visual}`, { italic: true });
      ctx.cursorY += 1;
    }
  }

  // 6 — FB AD LIBRARY ANGLES
  if (result.fbAdLibraryAngles?.length) {
    ensureSpace(ctx, 40);
    drawSectionHeader(ctx, '// AD_ANGLES', 'Ready-to-brief Director AI');
    for (const a of result.fbAdLibraryAngles) {
      drawKeyValueRow(ctx, a.format, a.angle);
      if (a.openingLine) drawWrappedText(ctx, `Open: "${a.openingLine}"`, { italic: true });
      if (a.whyItWorks) drawWrappedText(ctx, `Why it works: ${a.whyItWorks}`);
      ctx.cursorY += 1;
    }
  }

  // 7 — VILLAIN
  if (result.villain) {
    ensureSpace(ctx, 25);
    drawSectionHeader(ctx, '// VILLAIN', 'Name the enemy your customer rallies against');
    drawWrappedText(ctx, result.villain);
    ctx.cursorY += 3;
  }

  // 8 — COMPETITOR MATRIX
  if (result.competitorMatrix?.length) {
    ensureSpace(ctx, 40);
    drawSectionHeader(ctx, '// COMPETITOR_MATRIX', 'Three rivals + the exploit');
    for (const c of result.competitorMatrix) {
      drawKeyValueRow(ctx, c.competitor, c.weakness);
      if (c.exploitationAngle) {
        drawWrappedText(ctx, `Exploit: ${c.exploitationAngle}`, { italic: true });
      }
      ctx.cursorY += 1;
    }
  }

  // 9 — GRAVEYARD
  if (result.graveyard?.length) {
    ensureSpace(ctx, 30);
    drawTwoColumnTable(
      ctx,
      '// GRAVEYARD',
      result.graveyard.map((g) => ({ left: g.tried, right: g.whyFailed }))
    );
  }

  // 10 — OBJECTION + CONTRARIAN
  if (result.objectionToUs) {
    ensureSpace(ctx, 20);
    drawSectionHeader(ctx, '// OBJECTION_TO_US', 'The pre-emptive teardown');
    drawWrappedText(ctx, result.objectionToUs);
    ctx.cursorY += 3;
  }
  if (result.contrarianTruth) {
    ensureSpace(ctx, 20);
    drawSectionHeader(ctx, '// CONTRARIAN_TRUTH', 'What everyone else gets wrong');
    drawWrappedText(ctx, result.contrarianTruth);
    ctx.cursorY += 3;
  }

  // 11 — MAGIC GENIE / HEAVEN ISLAND
  if (result.magicGenie || result.emotionalPayoff || result.statusUpgrade) {
    ensureSpace(ctx, 30);
    drawSectionHeader(ctx, '// HEAVEN_ISLAND', 'The dream state your buyer wants');
    if (result.magicGenie) drawKeyValueRow(ctx, 'Magic genie', result.magicGenie);
    if (result.emotionalPayoff) drawKeyValueRow(ctx, 'Emotional payoff', result.emotionalPayoff);
    if (result.statusUpgrade) drawKeyValueRow(ctx, 'Status upgrade', result.statusUpgrade);
    ctx.cursorY += 3;
  }

  // 12 — RAW EVIDENCE (verbatim voice-of-customer)
  if (result.rawEvidence?.length) {
    ensureSpace(ctx, 30);
    drawSectionHeader(ctx, '// RAW_EVIDENCE', 'Voice-of-customer — quote, do not paraphrase');
    for (const ev of result.rawEvidence) {
      drawWrappedText(ctx, `“${ev}”`, { italic: true });
      ctx.cursorY += 1;
    }
  }

  return finalizePdf(ctx);
}
