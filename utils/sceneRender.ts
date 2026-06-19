import type { Scene, Avatar, BusinessInfo } from '../types';
import { generateSceneImage } from '../services/geminiService';

/**
 * Shared storyboard scene-image renderer.
 *
 * Extracted verbatim from Step5Storyboard's per-scene generation so the
 * step-by-step wizard and the one-shot orchestrator (useOneShotGeneration)
 * render scenes through ONE code path — the hook-morph / product-reveal
 * heuristics below must not drift between the two surfaces.
 *
 * Mutates and returns `scene` (sets imageUrl / endFrameImageUrl). The caller
 * owns React state — copy the storyboard array and re-set it after each call.
 */

export interface SceneRenderContext {
  aspectRatio: '9:16' | '16:9';
  avatar: Avatar | null;
  businessInfo: BusinessInfo;
}

const PRODUCT_STOPWORDS = new Set(['the', 'and', 'for', 'with', 'your', 'this', 'that', 'from', 'sleek', 'clean', 'portable']);

const getBrandColors = (businessInfo: BusinessInfo): string[] =>
  businessInfo.brandColors
    ? businessInfo.brandColors.split(',').map(c => c.trim()).filter(c => c)
    : [];

const getReferenceData = (scene: Scene, avatar: Avatar | null, businessInfo: BusinessInfo) => {
  const refs: { avatarUrl?: string; productUrl?: string } = {};

  if ((scene.referenceImage === 'avatar' || scene.referenceImage === 'both') && avatar) {
    refs.avatarUrl = avatar.url;
  }

  if (
    (scene.referenceImage === 'product' || scene.referenceImage === 'both') &&
    businessInfo.productImageUrls &&
    businessInfo.productImageUrls.length > 0
  ) {
    // Always anchor product identity to photo[0]. Photos 1+ are stored but
    // unused for scene generation until a v2 per-photo tagging UX exists.
    refs.productUrl = businessInfo.productImageUrls[0];
  }

  return refs;
};

export const renderSceneImages = async (
  scene: Scene,
  index: number,
  ctx: SceneRenderContext,
  force: boolean = false,
): Promise<Scene> => {
  const { aspectRatio, avatar, businessInfo } = ctx;

  if (force) {
    scene.imageUrl = undefined;
    scene.endFrameImageUrl = undefined;
  }

  const references = getReferenceData(scene, avatar, businessInfo);
  const ethnicity = avatar?.ethnicity || 'Global/Neutral';
  const scriptType = businessInfo.scriptType || 'MrBeast';
  const productDesc = businessInfo.productImageDescription || businessInfo.product || 'the product';

  // Hook morph (start+end frame): the START frame is the "before" metaphor and
  // must stay product-free; the hero reference belongs on the END frame (reveal).
  const isHookMorph = !!scene.startFramePrompt && !!scene.endFramePrompt;
  const startFrameRefs = isHookMorph ? { ...references, productUrl: undefined } : references;

  // When the hook's END frame reveals the product, anchor it to the hero photo even
  // though the model reliably tags scenes[0].referenceImage "none" (3/3 in testing) —
  // otherwise the end frame gets no reference and img-gen invents a look-alike that
  // drifts from the uploaded hero. GUARD: only force the hero when the end-frame prompt
  // actually names the product, so a PURELY abstract-metaphor hook (reveal isn't the
  // product) stays product-free. getReferenceData uses productImageUrls[0].
  const heroProductUrl = businessInfo.productImageUrls?.[0];
  const productWords = (businessInfo.product || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 3 && !PRODUCT_STOPWORDS.has(w));
  const endFrameRevealsProduct = isHookMorph && !!heroProductUrl && !!scene.endFramePrompt
    && productWords.some(w => scene.endFramePrompt!.toLowerCase().includes(w));
  const endFrameRefs = endFrameRevealsProduct
    ? { ...references, productUrl: heroProductUrl }
    : references;
  const endFrameMode: 'avatar' | 'product' | 'both' | 'none' | undefined = endFrameRevealsProduct
    ? (references.avatarUrl ? 'both' : 'product')
    : scene.referenceImage;

  if (scene.startFramePrompt || scene.imagePrompt) {
    const prompt = scene.startFramePrompt || scene.imagePrompt;
    if ((!scene.imageUrl || force) && prompt) {
      scene.imageUrl = await generateSceneImage(
        prompt,
        aspectRatio,
        '1K',
        startFrameRefs,
        ethnicity,
        getBrandColors(businessInfo),
        scriptType,
        productDesc,
        undefined,
        index,
        scene.referenceImage,
      );
    }
  }

  if (scene.endFramePrompt && (!scene.endFrameImageUrl || force)) {
    scene.endFrameImageUrl = await generateSceneImage(
      scene.endFramePrompt,
      aspectRatio,
      '1K',
      endFrameRefs,
      ethnicity,
      getBrandColors(businessInfo),
      scriptType,
      productDesc,
      undefined,
      index + 100,
      endFrameMode,
    );
  }

  return scene;
};
