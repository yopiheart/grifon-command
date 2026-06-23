
import React, { useState, useEffect } from 'react';
import { VideoPrompt, Scene, BusinessInfo } from '../types';
import { generateVideoPrompts } from '../services/geminiService';
import Loader from './ui/Loader';
import { AlertTriangle, Camera, User, Copy, Sparkles, RefreshCw } from 'lucide-react';
import { StepShell } from './ui/StepShell';
import { StepFooter } from './ui/StepFooter';

interface Step6Props {
  storyboard: Scene[];
  videoPrompts: VideoPrompt[];
  setVideoPrompts: (prompts: VideoPrompt[]) => void;
  onNext: () => void;
  onBack: () => void;
  businessInfo: BusinessInfo;
}

const Step6VideoPrompts: React.FC<Step6Props> = ({ storyboard, videoPrompts, setVideoPrompts, onNext, onBack, businessInfo }) => {
  const [loading, setLoading] = useState(videoPrompts.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<VideoPrompt[]>(videoPrompts);
  // Smart validator: flips true once the user forces Confirm with no prompts. Presentational.
  const [triedNext, setTriedNext] = useState(false);

  useEffect(() => {
    const fetchPrompts = async () => {
      // Don't re-fetch if we already have matching prompts
      if (videoPrompts.length > 0 && videoPrompts.length === storyboard.length) {
        setPrompts(videoPrompts);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        // Pass storyboard AND full businessInfo
        const data = await generateVideoPrompts(storyboard, businessInfo);
        setPrompts(data);
        setVideoPrompts(data);
      } catch (err) {
        setError('Failed to generate video prompts. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrompts();
  }, [storyboard, setVideoPrompts, videoPrompts, businessInfo]);

  const handleRegenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await generateVideoPrompts(storyboard, businessInfo);
      setPrompts(data);
      setVideoPrompts(data);
    } catch (err) {
      setError('Failed to regenerate video prompts. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (prompts.length === 0) return;

    const content = prompts.map((p, index) => {
        const displayLine = storyboard[index]?.scriptLine || p.scriptLine;
        const formattedPrompt = p.prompt.replace(/\\n/g, '\n'); // Ensure newlines render correctly
        return `[SCENE ${index + 1}: "${displayLine}"]\nType: ${p.type}\n\n${formattedPrompt}`;
    }).join('\n\n========================================\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Video Prompts.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'talking':
        return <User className="w-6 h-6 text-blue-400" />;
      case 'cinematic':
        return <Sparkles className="w-6 h-6 text-[#FFCC00]" />;
      default:
        return <Camera className="w-6 h-6 text-zinc-400" />;
    }
  };

  const getTypeLabelClass = (type: string) => {
    switch (type) {
      case 'talking':
        return 'border-blue-400 text-blue-400';
      case 'cinematic':
        return 'border-[#FFCC00] text-[#FFCC00]';
      default:
        return 'border-zinc-400 text-zinc-400';
    }
  };

  // A forced Confirm with no prompts flags it, instead of sitting disabled. The onNext gate
  // (prompts present) stays the source of truth.
  const guardedNext = () => {
    if (loading) return;
    if (prompts.length > 0) { onNext(); return; }
    setTriedNext(true);
  };

  return (
    <StepShell sublabel="STEP 7 · VIDEO PROMPTS" title="Create Video Prompts" panelClassName="max-w-6xl mx-auto">
      <p className="-mt-4 mb-6 text-[11px] font-mono leading-relaxed text-zinc-500">
        The AI has generated video prompts for each line, deciding between a talking avatar, B-roll, or cinematic relay.
      </p>

      {loading && <Loader message="TRANSLATING SCENES TO VIDEO PROMPTS..." />}
      {error && <p className="text-red-500 text-center mb-4 font-mono border border-red-900/50 bg-red-900/20 p-3 rounded-xl">{error}</p>}

      {!loading && prompts.length > 0 && (
        <>
            <div className="flex justify-end mb-4 gap-2">
                <button
                  onClick={handleRegenerate}
                  disabled={loading}
                  className="py-2 px-4 text-xs font-bold uppercase tracking-widest text-zinc-400 border border-white/10 rounded-full hover:bg-white/5 hover:text-[#FFCC00] hover:border-[#FFCC00] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Re-run the prompt generator (e.g. after a template change)"
                >
                    <RefreshCw className="w-4 h-4" /> REGENERATE
                </button>
                <button onClick={handleDownload} className="py-2 px-4 text-xs font-bold uppercase tracking-widest text-zinc-400 border border-white/10 rounded-full hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2">
                    <Copy className="w-4 h-4" /> DOWNLOAD .TXT
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {prompts.map((p, index) => {
                const displayLine = storyboard[index]?.scriptLine || p.scriptLine;

                return (
                <div key={index} className="p-6 bg-zinc-900/50 rounded-2xl border border-white/10 hover:border-[#FFCC00]/50 transition-colors">
                    <h4 className="text-[#FFCC00] font-bold mb-2 text-[10px] uppercase tracking-widest font-mono">// Scene {index + 1}</h4>
                    <p className="font-semibold text-white text-lg">"{displayLine}"</p>
                    <div className="flex items-start mt-6 space-x-4">
                    <div className="flex-shrink-0 pt-1">
                        {getIcon(p.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${getTypeLabelClass(p.type)}`}>
                        {p.type.replace('-', ' ')}
                        </span>
                        <pre className="text-sm text-zinc-300 mt-4 whitespace-pre-wrap font-mono leading-relaxed bg-zinc-950 p-4 rounded-xl border border-white/10">{p.prompt}</pre>
                    </div>
                    </div>
                </div>
                );
            })}
            </div>
        </>
      )}

      {triedNext && !loading && prompts.length === 0 && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs font-mono text-red-200">
            <span className="font-bold uppercase tracking-widest text-red-400">Incomplete — </span>
            generate video prompts before proceeding
          </p>
        </div>
      )}

      <StepFooter onBack={onBack} onNext={guardedNext} nextLabel="CONFIRM & PROCEED" />
    </StepShell>
  );
};

export default Step6VideoPrompts;
