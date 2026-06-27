import React, { useState, useEffect, useRef } from 'react';
import { Avatar, BusinessInfo } from '../types';
import { generateThumbnail } from '../services/geminiService';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import ImageModal from './ui/ImageModal';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { StepShell } from './ui/StepShell';
import { StepFooter } from './ui/StepFooter';

interface Step6ThumbnailProps {
  script: string[];
  avatar: Avatar | null;
  businessInfo: BusinessInfo;
  aspectRatio: '9:16' | '16:9' | null;
  thumbnailUrl: string | null;
  setThumbnailUrl: (url: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step6Thumbnail: React.FC<Step6ThumbnailProps> = ({ script, avatar, businessInfo, aspectRatio, thumbnailUrl, setThumbnailUrl, onNext, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Smart validator: flips true once the user forces Confirm with no thumbnail. Presentational.
  const [triedNext, setTriedNext] = useState(false);
  const hasFetchedRef = useRef(false);

  const handleGenerate = async () => {
    if (!avatar || !aspectRatio) {
      setError('Avatar and Aspect Ratio are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const brandColors = businessInfo.brandColors ? businessInfo.brandColors.split(',').map(c => c.trim()) : [];

      const url = await generateThumbnail(
          script,
          avatar.description,
          businessInfo,
          aspectRatio,
          avatar.url,
          '1K',
          brandColors
      );
      setThumbnailUrl(url);
    } catch (err) {
      setError('Failed to generate thumbnail. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
     if (!thumbnailUrl && !loading && !hasFetchedRef.current && avatar && aspectRatio) {
         handleGenerate();
         hasFetchedRef.current = true;
     }
  }, [thumbnailUrl, avatar, aspectRatio]);

  const missingVisuals = !businessInfo.productImageUrls || businessInfo.productImageUrls.length === 0;

  // A forced Confirm without a thumbnail flags it + scrolls to the preview, instead of sitting
  // disabled. The onNext gate (thumbnailUrl present) stays the source of truth.
  const guardedNext = () => {
    if (loading) return;
    if (thumbnailUrl) { onNext(); return; }
    setTriedNext(true);
    document.getElementById('thumbnail-area')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <StepShell sublabel="STEP 6 · VIRAL THUMBNAIL" title="Generate Viral Thumbnail">
      <p className="-mt-4 mb-6 text-[11px] font-mono leading-relaxed text-zinc-500">
        Create a MrBeast-style thumbnail to maximize clicks. This visual is crucial for grabbing attention.
      </p>

      {missingVisuals && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-[#FFCC00]/30 bg-[#FFCC00]/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#FFCC00]" />
          <p className="text-[11px] text-zinc-400 font-mono leading-tight">
            <span className="font-black uppercase tracking-widest text-[#FFCC00]">Visual assets missing.</span>{' '}
            The AI will generate a generic placeholder for the product. For brand-accurate results, upload your product photos in Step 2.
          </p>
        </div>
      )}

      {error && <p className="text-red-500 text-center mb-4 font-mono border border-red-900/50 bg-red-900/20 p-3 rounded-xl">{error}</p>}

      <div id="thumbnail-area" className="flex flex-col items-center justify-center space-y-6 min-h-[400px]">
        {loading && <Loader message="GENERATING HIGH-CTR THUMBNAIL..." />}

        {thumbnailUrl && !loading && (
          <>
            <div
              className={`overflow-hidden border-2 border-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.3)] rounded-xl cursor-pointer transition-transform hover:scale-105 bg-zinc-950 ${aspectRatio === '16:9' ? 'w-full max-w-[480px] aspect-video' : 'w-full max-w-[280px] aspect-[9/16]'}`}
              onClick={() => setIsModalOpen(true)}
              role="button"
              aria-label="View thumbnail in fullscreen"
            >
              <img src={thumbnailUrl} alt="Thumbnail Preview" className="w-full h-full object-contain" />
            </div>

            <button onClick={handleGenerate} className="rounded-full px-8 py-2 flex items-center gap-3 border border-[#FFCC00]/40 hover:border-[#FFCC00] text-[#FFCC00] transition-colors bg-transparent">
                <RefreshCw className="w-5 h-5"/> REGENERATE THUMBNAIL
            </button>

            {isModalOpen && <ImageModal imageUrl={thumbnailUrl} onClose={() => setIsModalOpen(false)} filename="thumbnail-image.png" />}
          </>
        )}

        {!thumbnailUrl && !loading && (
          <div className={`text-center p-12 flex flex-col items-center justify-center h-full bg-zinc-950/50 border-2 border-dashed rounded-xl w-full transition-colors ${triedNext ? 'border-red-500/60' : 'border-white/10'}`}>
              <p className={`mb-6 font-mono text-[10px] tracking-widest uppercase ${triedNext ? 'text-red-400' : 'text-zinc-500'}`}>[THUMBNAIL_PLACEHOLDER_AREA]</p>
              <GoldButton onClick={handleGenerate} disabled={!aspectRatio} className="rounded-full px-12">
                  SYNTHESIZE THUMBNAIL
              </GoldButton>
              {!aspectRatio && <p className="text-[10px] text-[#FFCC00] mt-4 font-mono tracking-widest uppercase">ERROR: ASPECT RATIO MISSING</p>}
          </div>
        )}
      </div>

      {triedNext && !thumbnailUrl && !loading && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs font-mono text-red-200">
            <span className="font-bold uppercase tracking-widest text-red-400">Incomplete — </span>
            synthesize a thumbnail before proceeding
          </p>
        </div>
      )}

      <StepFooter onBack={onBack} onNext={guardedNext} nextLabel="CONFIRM & PROCEED" />
    </StepShell>
  );
};

export default Step6Thumbnail;
