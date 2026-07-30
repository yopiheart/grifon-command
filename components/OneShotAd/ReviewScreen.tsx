import React, { useState } from 'react';
import { ChevronLeft, Check, Copy, Package, Plus, Video, Image as ImageIcon, User } from 'lucide-react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import type { AllData } from '../../types';
import type { SceneTrim } from '../../hooks/useOneShotGeneration';
import { GlassPanel } from '../ui/GlassPanel';
import { GoldButton } from '../ui/GoldButton';
import ImageModal from '../ui/ImageModal';
import { MAT_PLATE_INSET } from '../ui/materialTokens';
import { SceneReveal } from './motion';
import { useSubscription } from '../../hooks/useSubscription';
import { watermarkImage } from '../../utils/watermark';
import { computeUpgradeNudge } from '../../config/upgradeNudge';

/**
 * The CONSUMER review surface — where every non-dev path lands once the ad plan
 * is built (one-shot completion, Concierge, resume, return-to-ad).
 *
 * It is deliberately NOT Step7FinalOutput: the 8-step wizard is Neil's admin
 * cockpit, and its Step 8 leaks the machinery (image prompts, video prompts,
 * storyboard JSON) at the funnel's highest-intent moment. This screen shows the
 * ad, not the pipeline — script, scene stills, spokesperson, cover frame — in the
 * One-Shot world (same header/film-strip/actions language as FirstCutScreen),
 * and carries the same free→paid bridge Step 8 does.
 */

interface ReviewScreenProps {
  allData: AllData;
  /** Free-tier scene trim from the run — when `shown < full` the scenes strip
      carries a quiet "some scenes held back" note. Absent/null = nothing trimmed. */
  sceneTrim?: SceneTrim | null;
  /** Free user holds a purchased ₱499 video credit — the CTA then points at the
      credit instead of quoting Starter. `null` = still loading: the bridge holds
      back entirely rather than flash the wrong price (same contract as Step 8). */
  hasVideoCredit?: boolean | null;
  onGenerateVideo: () => void;
  /** Clear the session and start a fresh ad. */
  onMakeAnother: () => void;
  /** Leave the review surface (back to the Command Center). */
  onBack: () => void;
}

/**
 * One asset still with a mono caption above it. `frame` carries BOTH the width
 * and the aspect, because a 9:16 portrait and a 16:9 cover need different widths
 * to read at a sane size.
 */
const AssetTile: React.FC<{
  label: string;
  src?: string | null;
  emptyNote: string;
  frame: string;
  icon: React.ReactNode;
  onPreview?: () => void;
}> = ({ label, src, emptyNote, frame, icon, onPreview }) => (
  <div className="min-w-0">
    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">
      {icon} // {label}
    </p>
    {src ? (
      <button
        type="button"
        onClick={onPreview}
        className={`group relative block overflow-hidden rounded-xl border border-white/10 bg-zinc-950 ${frame} cursor-zoom-in`}
        aria-label={`Preview ${label.toLowerCase()} full-size`}
      >
        <img src={src} alt={label} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-zinc-950/0 transition-colors group-hover:bg-zinc-950/25" />
      </button>
    ) : (
      <div className={`flex items-center justify-center rounded-xl border border-white/10 bg-zinc-900/60 ${frame}`}>
        <span className="px-2 text-center text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">{emptyNote}</span>
      </div>
    )}
  </div>
);

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  allData,
  sceneTrim = null,
  hasVideoCredit = false,
  onGenerateVideo,
  onMakeAnother,
  onBack,
}) => {
  const { clientDetails, finalScript, avatar, storyboard, thumbnailUrl, aspectRatio } = allData;
  const { plan_id, loading: planLoading } = useSubscription();
  // Two gates on purpose (mirrors Step 8): watermarking rides the raw plan check
  // so the loading window fails SAFE — watermarked — while the visible bridge
  // waits for the plan to resolve so paid users never flash the free treatment.
  const isFree = plan_id === 'free';
  const showFreeBridge = !planLoading && isFree && hasVideoCredit !== null;
  // Free is 1 workflow and reaching review means it is spent, so the usage triple
  // is fixed — no quota fetch needed. A credit-holder already paid: no upsell.
  const freeNudge = showFreeBridge && !hasVideoCredit ? computeUpgradeNudge('free', { used: 1, limit: 1, remaining: 0 }) : null;

  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; filename: string } | null>(null);

  const fullScriptText = finalScript.join('\n');
  // A 16:9 cover needs a wider frame to read at all; the row is bottom-aligned so
  // the shorter landscape tile still sits on the same line as the portrait one.
  const thumbFrame = aspectRatio === '16:9' ? 'w-56 aspect-video' : 'w-32 aspect-[9/16]';

  const handleCopy = () => {
    navigator.clipboard.writeText(fullScriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * ASSETS ONLY — the things the user made, never the machinery. No
   * storyboard.json, no video_prompts.txt on any tier (that bundle stays in the
   * dev cockpit's Step 8 export). Free exports are watermarked.
   */
  const exportAssets = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const zip = new JSZip();
      zip.file('script.txt', fullScriptText);
      const markImg = async (url: string): Promise<string> => (isFree ? watermarkImage(url) : url);
      const b64 = (url: string): string => url.split(',')[1];
      if (avatar?.url) zip.file('avatar.png', b64(await markImg(avatar.url)), { base64: true });
      if (thumbnailUrl) zip.file('thumbnail.png', b64(await markImg(thumbnailUrl)), { base64: true });
      for (let i = 0; i < storyboard.length; i++) {
        const s = storyboard[i];
        if (s.imageUrl) zip.file(`scenes/scene_${i + 1}.png`, b64(await markImg(s.imageUrl)), { base64: true });
        if (s.endFrameImageUrl) zip.file(`scenes/scene_${i + 1}_end.png`, b64(await markImg(s.endFrameImageUrl)), { base64: true });
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const safeName = (clientDetails.brandName || 'GRIFON_Project').replace(/[^a-zA-Z0-9_-]+/g, '_');
      saveAs(blob, `${safeName}_Assets.zip`);
    } catch (e) {
      console.error('EXPORT_ASSETS_FAILED', e);
    } finally {
      setExporting(false);
    }
  };

  // DESIGN.md ghostButton, pill radius to match the One-Shot world's action rows.
  const ghost =
    'flex items-center justify-center gap-2 rounded-full border border-white/10 bg-zinc-950 px-6 py-3 text-[10px] font-mono uppercase tracking-widest text-zinc-400 transition-colors hover:border-[#FFCC00] hover:text-white disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-10 text-white">
      <div className="relative mx-auto w-full max-w-3xl">
        <button
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel transition-colors hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> Command Center
        </button>

        <p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">// REVIEW · YOUR AD PLAN</p>
        <h1 className="mb-2 text-3xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500">
          Your Ad Plan
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-zinc-400">
          Here is everything your AI crew built. Review it, then bring it to life as video.
        </p>

        {/* Script — clean lines only. */}
        <GlassPanel className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00]">// Script</p>
            <button
              onClick={handleCopy}
              className="rounded-lg border border-white/10 bg-zinc-900 p-2 text-zinc-400 transition-colors hover:bg-[#FFCC00]/20 hover:text-[#FFCC00]"
              aria-label="Copy script"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          {finalScript.length > 0 ? (
            <div className="space-y-2">
              {finalScript.map((line, i) => (
                <p key={i} className="text-sm leading-relaxed text-zinc-300">
                  {line}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">Script unavailable</p>
          )}
        </GlassPanel>

        {/* Scene film-strip — the stills only. No prompts, no transitions, no JSON.
            The section (and the trim note) render even with ZERO scenes — the
            worst trim case is exactly when the explanation matters most
            (critic 2026-07-30 bug 4). */}
        <div className="mt-6">
          <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">// Scenes</p>
          {storyboard.length === 0 ? (
            <div className="flex h-40 w-28 items-center justify-center rounded-xl border border-white/10">
              <p className="px-2 text-center text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">Scenes unavailable</p>
            </div>
          ) : (
            <div className="flex snap-x gap-3 overflow-x-auto pb-2">
              {storyboard.map((sc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => sc.imageUrl && setPreviewImage({ url: sc.imageUrl, filename: `scene_${i + 1}.png` })}
                  disabled={!sc.imageUrl}
                  className="relative w-28 shrink-0 snap-start overflow-hidden rounded-xl border border-white/10 disabled:cursor-default"
                  aria-label={`Preview scene ${i + 1} full-size`}
                >
                  <div className="aspect-[9/16]">
                    <SceneReveal imageUrl={sc.imageUrl} alt={`Scene ${i + 1}`} />
                  </div>
                  <div className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300">
                    {i + 1}
                  </div>
                </button>
              ))}
            </div>
          )}
          {/* Only set on a free run the image budget forced us to trim (see
              capScenesToBudget) — one quiet line, no banner. */}
          {sceneTrim && sceneTrim.shown < sceneTrim.full && (
            <p className="mt-1 text-[11px] text-on-surface-sublabel">
              {sceneTrim.shown} of {sceneTrim.full} scenes — full storyboard on Starter.
            </p>
          )}
        </div>

        {/* Spokesperson + cover frame. */}
        <div className="mt-6 flex flex-wrap items-end gap-6">
          <AssetTile
            label="Character"
            src={avatar?.url}
            emptyNote="Character unavailable"
            frame="w-32 aspect-[9/16]"
            icon={<User className="h-3 w-3" />}
            onPreview={() => avatar?.url && setPreviewImage({ url: avatar.url, filename: 'avatar.png' })}
          />
          <AssetTile
            label="Thumbnail"
            src={thumbnailUrl}
            emptyNote="Thumbnail unavailable"
            frame={thumbFrame}
            icon={<ImageIcon className="h-3 w-3" />}
            onPreview={() => thumbnailUrl && setPreviewImage({ url: thumbnailUrl, filename: 'thumbnail.png' })}
          />
        </div>

        {/* The bridge: state the state, then the one paid next step (L1). */}
        {showFreeBridge && (
          <div className={`mt-8 flex flex-col gap-3 rounded-xl border border-[#FFCC00]/30 p-6 ${MAT_PLATE_INSET}`}>
            <p className="text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">
              // 1/1 FREE WORKFLOW USED · EXPORTS WATERMARKED
            </p>
            {freeNudge && <p className="text-sm leading-relaxed text-zinc-300">{freeNudge.message}</p>}
            {hasVideoCredit && (
              <p className="text-sm leading-relaxed text-zinc-300">
                May bayad ka nang video credit — tapusin na natin: i-render ang ad mo.
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <GoldButton onClick={onGenerateVideo} className="flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-[10px]">
            <Video className="h-4 w-4 shrink-0" />
            {showFreeBridge
              ? hasVideoCredit
                ? 'I-RENDER ANG VIDEO — GAMIT ANG CREDIT MO'
                : 'I-RENDER ANG VIDEO — STARTER ₱997'
              : 'GENERATE VIDEO NOW >'}
          </GoldButton>
          <button onClick={exportAssets} disabled={exporting} className={ghost}>
            <Package className="h-4 w-4 shrink-0" /> {exporting ? 'BUNDLING...' : 'Download Assets (.zip)'}
          </button>
          <button onClick={onMakeAnother} className={ghost}>
            <Plus className="h-4 w-4 shrink-0" /> Make Another
          </button>
        </div>
      </div>

      {previewImage && (
        <ImageModal
          imageUrl={previewImage.url}
          onClose={() => setPreviewImage(null)}
          filename={previewImage.filename}
          watermark={isFree}
        />
      )}
    </div>
  );
};

export default ReviewScreen;
