import React, { useState, useCallback, useRef } from 'react';
import { BusinessInfo, Avatar } from '../types';
import { generateAvatarImage, describeImage } from '../services/geminiService';
import { compressImageForUpload } from '../utils/imageCompression';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import ImageModal from './ui/ImageModal';
import { AlertTriangle, RefreshCw, Upload } from 'lucide-react';
import { StepShell } from './ui/StepShell';
import { StepFooter } from './ui/StepFooter';
import { TitledCard } from './ui/TitledCard';
import { FieldLabel } from './ui/FieldLabel';
import { TextField } from './ui/TextField';
import { SegButton } from './ui/SegButton';

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
  // Smart validator: flips true once the user forces Confirm without an avatar. Presentational.
  const [triedNext, setTriedNext] = useState(false);

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

  // A forced Confirm without an avatar (or aspect ratio) flags the gap + scrolls to the preview,
  // instead of sitting silently disabled. The handleNext gate stays the source of truth.
  const missingLabels: string[] = [
    ...(!aspectRatio ? ['Aspect Ratio (set in Step 2)'] : []),
    ...(!generatedAvatar ? ['Generate or upload an avatar'] : []),
  ];
  const guardedNext = () => {
    if (generatedAvatar && aspectRatio) { handleNext(); return; }
    setTriedNext(true);
    document.getElementById('avatar-preview')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <StepShell sublabel="STEP 4 · MARKETING AVATAR" title="Create Marketing Avatar">
      <p className="-mt-4 mb-6 text-[11px] font-mono leading-relaxed text-on-surface-sublabel">
        Generate or upload an avatar that represents your target audience.
      </p>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {!aspectRatio && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-[#FFCC00]/50 bg-[#FFCC00]/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#FFCC00]" />
          <p className="text-xs text-zinc-300">
            <span className="font-bold text-[#FFCC00]">Aspect ratio not set.</span> Go back to{' '}
            <span className="font-bold text-white">Business Info (Step 2)</span> to select a project aspect ratio before generating an avatar.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <TitledCard title="Option 1 · Generate with AI">
          <div className="space-y-5">
            <p className="text-xs text-on-surface-sublabel font-mono">Define the avatar for your target audience.</p>
            <div>
              <FieldLabel className="mb-2" marker={false}>Gender</FieldLabel>
              <SegButton
                value={gender}
                onChange={setGender}
                options={[
                  { value: 'Any', label: 'Any' },
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                ]}
              />
            </div>

            <TextField
              label="Ethnicity"
              id="ethnicity"
              name="ethnicity"
              value={ethnicity}
              onChange={(e) => setEthnicity(e.target.value)}
              placeholder="e.g., Filipino, Caucasian, East Asian"
            />

            <TextField
              label="Age Range"
              id="ageRange"
              name="ageRange"
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              placeholder="e.g., 25-30"
            />

            <GoldButton onClick={fetchAvatar} disabled={isGenerateDisabled} className="w-full mt-1 flex items-center justify-center gap-2 py-3">
              {generatedAvatar ? <><RefreshCw className="w-4 h-4" /> RE-SYNTHESIZE AVATAR</> : 'INITIALIZE GENERATION'}
            </GoldButton>
          </div>
        </TitledCard>

        <TitledCard title="Option 2 · Upload Your Own" className="h-full">
          <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
            <p className="text-xs text-on-surface-sublabel font-mono">Use your own photo or a pre-generated character.</p>
            <button
              onClick={handleUploadClick}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-6 py-3 text-xs font-bold uppercase tracking-widest text-zinc-400 transition-colors hover:border-[#FFCC00] hover:text-[#FFCC00]"
            >
              <Upload className="h-4 w-4 shrink-0" /> Upload Biometric Source
            </button>
          </div>
        </TitledCard>
      </div>

      <div id="avatar-preview" className="mt-8 flex flex-col items-center justify-center space-y-6 min-h-[300px]">
        {loading && <Loader message={loadingMessage} />}
        {error && <p className="text-red-500 text-center font-mono border border-red-900 bg-red-900/10 p-2 rounded-xl">{error}</p>}

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
            <div className={`text-center p-8 flex items-center justify-center h-full border-2 border-dashed rounded-xl bg-zinc-950/50 w-full transition-colors ${triedNext ? 'border-red-500/60' : 'border-white/10'}`}>
                <p className={`font-mono text-[10px] tracking-widest uppercase ${triedNext ? 'text-red-400' : 'text-on-surface-sublabel'}`}>[AVATAR_PREVIEW_AREA]</p>
            </div>
        )}
      </div>

      {triedNext && isNextDisabled && !loading && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs font-mono text-red-200">
            <span className="font-bold uppercase tracking-widest text-red-400">Incomplete — </span>
            {missingLabels.join(' · ')}
          </p>
        </div>
      )}

      <StepFooter onBack={onBack} onNext={guardedNext} nextLabel="CONFIRM & PROCEED" />
    </StepShell>
  );
};

export default Step4Avatar;
