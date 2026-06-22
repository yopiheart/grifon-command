import React, { useState, useCallback, useRef } from 'react';
import { BusinessInfo, Avatar } from '../types';
import { generateAvatarImage, describeImage } from '../services/geminiService';
import { compressImageForUpload } from '../utils/imageCompression';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import ImageModal from './ui/ImageModal';
import { RefreshCw } from 'lucide-react';

interface Step4Props {
  businessInfo: BusinessInfo;
  avatar: Avatar | null;
  setAvatar: (avatar: Avatar) => void;
  onNext: () => void;
  onBack: () => void;
  aspectRatio: '9:16' | '16:9' | null;
}

const Step4Avatar: React.FC<Step4Props> = ({ businessInfo, avatar, setAvatar, onNext, onBack, aspectRatio }) => {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [generatedAvatar, setGeneratedAvatar] = useState<Avatar | null>(avatar);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [gender, setGender] = useState<'Male' | 'Female' | 'Any'>('Any');
  const [ageRange, setAgeRange] = useState('');
  const [ethnicity, setEthnicity] = useState(avatar?.ethnicity || '');

  const fetchAvatar = useCallback(async () => {
    if (!aspectRatio) {
      setError("Please select a project aspect ratio in Step 2 first.");
      return;
    }
    try {
      setLoading(true);
      setLoadingMessage('GENETIC_SYNTHESIS_IN_PROGRESS...');
      setError(null);
      const { url, description } = await generateAvatarImage(
          businessInfo.audience, 
          gender, 
          ageRange, 
          ethnicity, 
          aspectRatio,
          '1K',
          [],
          businessInfo.scriptType
      );
      const newAvatar = { prompt: `An avatar for an ad targeting ${businessInfo.audience}`, url, description, ethnicity, gender };
      setGeneratedAvatar(newAvatar);
    } catch (err) {
      setError('CRITICAL_ERROR: AVATAR_GEN_FAILED');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [businessInfo.audience, gender, ageRange, ethnicity, aspectRatio]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (event.target) {
        event.target.value = '';
    }
    if (!file) return;

    try {
        setLoading(true);
        setLoadingMessage('ANALYZING_BIOMETRIC_DATA...');
        setError(null);

        const { base64, mimeType, dataUrl } = await compressImageForUpload(file);
        setGeneratedAvatar({ prompt: 'User uploaded avatar', url: dataUrl, description: '', ethnicity });

        const description = await describeImage(base64, mimeType);

        const newAvatar: Avatar = {
            prompt: 'User uploaded avatar',
            url: dataUrl,
            description: description,
            ethnicity: ethnicity,
        };
        setGeneratedAvatar(newAvatar);
    } catch (err) {
        setError('CRITICAL_ERROR: ANALYSIS_FAILED');
        console.error(err);
        setGeneratedAvatar(null);
    } finally {
        setLoading(false);
    }
  };

  const handleNext = () => {
    if (generatedAvatar && aspectRatio) {
      setAvatar(generatedAvatar);
      onNext();
    }
  };

  const isGenerateDisabled = loading || !ageRange || !ethnicity || !aspectRatio;
  const isNextDisabled = !generatedAvatar || loading || !aspectRatio;

  return (
    <GlassPanel>
      <div className="mb-8 border-b border-white/10 pb-6">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight">
          Step 4: Create Marketing Avatar
        </h2>
        <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
          // Generate or upload an avatar that represents your target audience.
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {!aspectRatio && (
        <div className="mb-6 p-4 border border-[#FFCC00]/50 bg-[#FFCC00]/10 rounded-xl text-center">
            <h3 className="text-lg font-bold text-[#FFCC00] font-mono">⚠️ Aspect Ratio Not Set</h3>
            <p className="text-sm text-zinc-400 mt-2">Please go back to the <span className="font-bold text-white">Business Info (Step 2)</span> to select a project aspect ratio before generating an avatar.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col space-y-4 p-6 border border-white/10 bg-zinc-950/50 rounded-xl hover:border-[#FFCC00] transition-colors">
          <h3 className="text-[10px] font-bold text-[#FFCC00] uppercase tracking-widest font-mono mb-2">// Option 1: Generate with AI</h3>
          <p className="text-xs text-zinc-500 font-mono">Define the avatar for your target audience.</p>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-widest font-mono">Gender</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Any', 'Male', 'Female'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${gender === g ? 'bg-[#FFCC00] text-black' : 'bg-zinc-900 text-zinc-400 border border-white/10 hover:border-white/20 hover:text-white'}`}
                >
                  {g.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="ethnicity" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
              // Ethnicity
            </label>
            <input
              id="ethnicity"
              name="ethnicity"
              value={ethnicity}
              onChange={(e) => setEthnicity(e.target.value)}
              placeholder="e.g., Filipino, Caucasian, East Asian"
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="ageRange" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
              // Age Range
            </label>
            <input
              id="ageRange"
              name="ageRange"
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              placeholder="e.g., 25-30"
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all"
            />
          </div>

          <GoldButton onClick={fetchAvatar} disabled={isGenerateDisabled} className="w-full mt-4 flex items-center justify-center gap-2 py-3">
            {generatedAvatar ? <><RefreshCw className="w-4 h-4" /> RE-SYNTHESIZE AVATAR</> : 'INITIALIZE GENERATION'}
          </GoldButton>
        </div>

        <div className="flex flex-col space-y-4 p-6 border border-white/10 bg-zinc-950/50 rounded-xl hover:border-[#FFCC00] transition-colors h-full justify-center items-center">
          <h3 className="text-[10px] font-bold text-[#FFCC00] uppercase tracking-widest font-mono mb-2">// Option 2: Upload Your Own</h3>
           <p className="text-xs text-zinc-500 font-mono text-center mb-4">Use your own photo or a pre-generated character.</p>
           <button 
            onClick={handleUploadClick} 
            disabled={loading} 
            className="w-full py-3 px-6 bg-zinc-900 border border-white/10 text-zinc-400 rounded-xl text-xs font-bold tracking-widest uppercase hover:border-[#FFCC00] hover:text-[#FFCC00] transition-colors"
           >
            UPLOAD BIOMETRIC SOURCE
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center justify-center space-y-6 min-h-[300px]">
        {loading && <Loader message={loadingMessage} />}
        {error && <p className="text-red-500 text-center font-mono border border-red-900 bg-red-900/10 p-2">{error}</p>}
        
        {generatedAvatar && !loading && (
          <div className="relative group">
            <div
              className={`overflow-hidden border-2 border-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.3)] rounded-xl cursor-pointer transition-transform hover:scale-105 ${aspectRatio === '16:9' ? 'w-80 h-48' : 'w-48 h-80'}`}
              onClick={() => setIsModalOpen(true)}
              role="button"
              aria-label="View avatar in fullscreen"
            >
              <img src={generatedAvatar.url} alt="Avatar Preview" className="w-full h-full object-cover" />
            </div>
            <button 
                onClick={fetchAvatar}
                className="absolute -top-4 -right-4 bg-[#FFCC00] text-black p-2 rounded-full shadow-lg hover:scale-110 transition-all border-2 border-zinc-950 group-hover:animate-spin-slow"
                title="Regenerate"
            >
                <RefreshCw className="w-5 h-5" />
            </button>
            {isModalOpen && <ImageModal imageUrl={generatedAvatar.url} onClose={() => setIsModalOpen(false)} filename="avatar-image.png" />}
          </div>
        )}

        {!generatedAvatar && !loading && (
            <div className="text-center p-8 flex items-center justify-center h-full border-2 border-dashed border-white/10 rounded-xl bg-zinc-950/50 w-full">
                <p className="text-zinc-500 font-mono text-[10px] tracking-widest uppercase">[AVATAR_PREVIEW_AREA]</p>
            </div>
        )}
      </div>
      
      <div className="mt-10 flex justify-between items-center pt-6 border-t border-white/10">
        <button 
          onClick={onBack} 
          className="text-[10px] font-bold tracking-widest text-zinc-400 border border-white/10 px-6 py-3 rounded-full hover:bg-white/5 hover:text-white transition-all uppercase"
        >
          &lt; BACK
        </button>
        <GoldButton onClick={handleNext} disabled={isNextDisabled} className="px-8 py-3">
          CONFIRM & PROCEED &gt;
        </GoldButton>
      </div>
    </GlassPanel>
  );
};

export default Step4Avatar;