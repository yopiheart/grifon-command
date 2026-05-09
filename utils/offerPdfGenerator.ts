import { OfferOptimizerResult, OfferTier } from '../types';
import {
  createBrandedPdf,
  drawCoverTitle,
  drawSectionHeader,
  drawWrappedText,
  drawKeyValueRow,
  drawAnchorPrice,
  drawTwoColumnTable,
  drawColorSwatches,
  ensureSpace,
  finalizePdf,
  PdfDoc,
} from './pdfTemplate';

export async function generateOfferPdf(
  result: OfferOptimizerResult,
  productName: string,
): Promise<Blob> {
  const titleProduct = productName?.trim() || 'Offer Stack';
  const ctx = await createBrandedPdf({
    title: `Irresistible Offer Blueprint — ${titleProduct}`,
    subtitle: 'Grifon Command — Offer Optimizer',
  });

  drawCoverTitle(ctx, 'Irresistible Offer Blueprint', titleProduct);

  // Pricing analysis
  drawSectionHeader(ctx, '// PRICING_ANALYSIS', 'Strategy & Anchor');
  drawWrappedText(ctx, result.analysis);
  ctx.cursorY += 3;

  // Three tiers
  drawTier(ctx, '// TRIPWIRE — LOW-BARRIER ENTRY', result.tripwire);
  drawTier(ctx, '// CORE OFFER — MAIN PROFIT DRIVER', result.coreOffer);
  drawTier(ctx, '// HIGH-TICKET — VIP UPSELL', result.highTicket);

  // Conversion assets
  const a = result.conversionAssets;
  drawSectionHeader(ctx, '// CONVERSION_ASSETS', 'Brand & Avatar Brief');
  if (a) {
    drawKeyValueRow(ctx, 'Brand', a.brandName);
    drawKeyValueRow(ctx, 'Target', a.target);
    drawKeyValueRow(ctx, 'Achieves', a.achieveOrEliminate);
    drawKeyValueRow(ctx, 'Main benefit', a.mainBenefit);
    drawKeyValueRow(ctx, 'Main problem', a.mainProblem);
    drawKeyValueRow(ctx, 'Pain point', a.mainPainPoint);
    drawKeyValueRow(ctx, 'Mechanism', a.mainDifferentiator);
    if (a.productServiceList?.length) {
      drawKeyValueRow(ctx, 'Services', a.productServiceList.join(', '));
    }
    if (a.mainFeatures?.length) {
      drawKeyValueRow(ctx, 'Features', a.mainFeatures.join(' • '));
    }
    ctx.cursorY += 2;
    if (a.brandPalette?.length) {
      drawColorSwatches(ctx, '// BRAND_PALETTE', a.brandPalette);
    }
  }

  return finalizePdf(ctx);
}

function drawTier(ctx: PdfDoc, label: string, tier: OfferTier): void {
  if (!tier) return;
  // Pre-empt page break: a tier block needs ~85mm at minimum.
  ensureSpace(ctx, 85);

  drawSectionHeader(ctx, label, tier.name || 'Untitled Tier');
  if (tier.pitch) drawWrappedText(ctx, tier.pitch);
  ctx.cursorY += 1;

  if (tier.valueStack?.length) {
    drawTwoColumnTable(
      ctx,
      '// VALUE_STACK',
      tier.valueStack.map(v => ({ left: v.item || '', right: v.value || '' })),
    );
  }

  if (tier.totalValue && tier.actualPrice) {
    drawAnchorPrice(ctx, tier.totalValue, tier.actualPrice);
  }

  if (tier.noBrainerLogic) {
    drawWrappedText(ctx, `No-brainer: ${tier.noBrainerLogic}`, { italic: true });
  }
  if (tier.scarcity) drawKeyValueRow(ctx, 'Scarcity', tier.scarcity);
  if (tier.guarantee) drawKeyValueRow(ctx, 'Guarantee', tier.guarantee);
  if (tier.probability) drawKeyValueRow(ctx, 'Probability', tier.probability);

  ctx.cursorY += 4;
}
