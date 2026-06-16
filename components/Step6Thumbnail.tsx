import React, { useState, useEffect, useRef } from 'react';
import { Avatar, BusinessInfo } from '../types';
import { generateThumbnail } from '../services/geminiService';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import ImageModal from './ui/ImageModal';
import { RefreshCw, AlertTriangle } from 'lucide-react';

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

  return (
    <GlassPanel>
      <div className="mb-8 border-b border-white/10 pb-6">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight">
          Step 6: Generate Viral Thumbnail
        </h2>
        <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
          // Create a MrBeast-style thumbnail to maximize clicks. This visual is crucial for grabbing attention.
        </p>
      </div>
      {missingVisuals && (
        <div className="mb-6 p-4 border border-[#FFCC00]/30 bg-[#FFCC00]/5 rounded-xl flex flex-col items-center gap-2 text-center animate-in fade-in slide-in-from-top-4">
          <p className="text-[10px] font-black text-[#FFCC00] uppercase tracking-widest font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> VISUAL ASSETS MISSING
          </p>
          <p className="text-[11px] text-zinc-400 font-mono leading-tight max-w-lg">
            The AI will generate a generic placeholder for the product. For brand-accurate results, please upload your product photos in Step 2.
          </p>
        </div>
      )}
      
      {error && <p className="text-red-500 text-center mb-4 font-mono border border-red-900 bg-red-900/10 p-2">{error}</p>}
      
      <div className="flex flex-col items-center justify-center space-y-6 min-h-[400px]">
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
          <div className="text-center p-12 flex flex-col items-center justify-center h-full bg-zinc-950/50 border-2 border-dashed border-white/10 rounded-xl w-full">
              <p className="text-zinc-500 mb-6 font-mono text-[10px] tracking-widest uppercase">[THUMBNAIL_PLACEHOLDER_AREA]</p>
              <GoldButton onClick={handleGenerate} disabled={!aspectRatio} className="rounded-full px-12">
                  SYNTHESIZE THUMBNAIL
              </GoldButton>
              {!aspectRatio && <p className="text-[10px] text-[#FFCC00] mt-4 font-mono tracking-widest uppercase">ERROR: ASPECT RATIO MISSING</p>}
          </div>
        )}
      </div>
      
      <div className="mt-8 flex justify-between items-center pt-6 border-t border-white/10">
        <button onClick={onBack} className="px-8 py-3 rounded-full border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 text-xs font-bold uppercase transition-all">&lt; BACK</button>
        <GoldButton onClick={onNext} disabled={!thumbnailUrl || loading} className="rounded-full px-12">
            CONFIRM & PROCEED &gt;
        </GoldButton>
      </div>
    </GlassPanel>
  );
};

export default Step6Thumbnail;