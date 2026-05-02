import React, { useState } from 'react';
import { AllData } from '../types';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import { Copy, Check } from 'lucide-react';

interface Step7Props {
  allData: AllData;
  onRestart: () => void;
}

const CopyableContent: React.FC<{ title: string, content: string }> = ({ title, content }) => {
    const [copied, setCopied] = useState(false);
  
    const handleCopy = () => {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
  
    return (
      <div className="relative p-6 bg-zinc-950/50 rounded-xl border border-white/10">
        <h4 className="font-bold text-[10px] text-[#FFCC00] uppercase tracking-widest font-mono mb-4">// {title}</h4>
        <pre className="text-zinc-400 whitespace-pre-wrap text-sm font-mono">{content}</pre>
        <button
          onClick={handleCopy}
          className="absolute top-4 right-4 p-2 rounded-lg bg-zinc-900 hover:bg-[#FFCC00]/20 text-zinc-400 hover:text-[#FFCC00] transition-colors border border-white/10"
          aria-label={`Copy ${title}`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    );
};

const Step7FinalOutput: React.FC<Step7Props> = ({ allData, onRestart }) => {
  const { finalScript, avatar, storyboard, videoPrompts, thumbnailUrl, aspectRatio } = allData;

  const fullScriptText = finalScript.join('\n');
  
  const storyboardText = storyboard.map((s, i) => {
    let text = `[SCENE ${i + 1}: "${s.scriptLine}"]\n`;
    text += `Description: ${s.sceneDescription}\n`;
    text += `Visual Focus: ${s.referenceImage || 'N/A'}\n`;
    if (s.imagePrompt) {
        text += `Image Prompt: ${s.imagePrompt}`;
    }
    if (s.startFramePrompt) {
        text += `Start Prompt: ${s.startFramePrompt}\n`;
        text += `Transition: ${s.transitionEffect}\n`;
        text += `End Prompt: ${s.endFramePrompt}`;
    }
    return text;
  }).join('\n\n---\n\n');

  const videoPromptsText = videoPrompts.map((p, i) => `[SCENE ${i + 1}: "${p.scriptLine || storyboard[i]?.scriptLine || ''}"]\nType: ${p.type}\nPrompt: ${p.prompt}`).join('\n\n---\n\n');

  return (
    <GlassPanel>
      <div className="mb-8 border-b border-white/10 pb-6">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 uppercase tracking-tight">
          Step 8: Final Output & Assets
        </h2>
        <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
          // All your generated assets are ready. You can now copy them for use in your video creation tools.
        </p>
      </div>
      <div className="space-y-12">
        <div>
          <h3 className="text-[10px] font-bold mb-6 text-zinc-500 uppercase tracking-widest font-mono">// Core Assets</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <CopyableContent title="Final Ad Script" content={fullScriptText} />
            {avatar && (
              <div className="p-6 bg-zinc-950/50 rounded-xl border border-white/10 flex flex-col items-center justify-center">
                <h4 className="font-bold text-[10px] text-[#FFCC00] uppercase tracking-widest font-mono mb-4">// Marketing Avatar</h4>
                <img src={avatar.url} alt="Marketing Avatar" className="w-32 h-56 rounded-xl object-cover border-2 border-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.3)]" />
              </div>
            )}
            {thumbnailUrl && (
              <div className="p-6 bg-zinc-950/50 rounded-xl border border-white/10 flex flex-col items-center justify-center">
                <h4 className="font-bold text-[10px] text-[#FFCC00] uppercase tracking-widest font-mono mb-4">// Viral Thumbnail</h4>
                <img src={thumbnailUrl} alt="Generated Thumbnail" className={`rounded-xl object-cover border-2 border-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.3)] ${aspectRatio === '9:16' ? 'w-32 h-56' : 'w-56 h-32'}`} />
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-bold mb-6 text-zinc-500 uppercase tracking-widest font-mono">// Visuals & Prompts</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CopyableContent title="Storyboard & Image Prompts" content={storyboardText} />
            <CopyableContent title="Video Prompts" content={videoPromptsText} />
          </div>
        </div>

        <div className="mt-12 text-center pt-8 border-t border-white/10">
            <p className="text-zinc-400 font-mono text-sm mb-8">You have successfully completed the creative workflow!</p>
            <GoldButton onClick={onRestart} className="rounded-full px-12 py-4 text-xs">START NEW PROJECT</GoldButton>
        </div>
      </div>
    </GlassPanel>
  );
};

export default Step7FinalOutput;