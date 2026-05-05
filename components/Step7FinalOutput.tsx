import React, { useState } from 'react';
import { AllData } from '../types';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import ImageModal from './ui/ImageModal';
import { Copy, Check, Download, Package, Video, ChevronLeft, Search, RotateCcw } from 'lucide-react';
import JSZip from 'jszip';
import saveAs from 'file-saver';

interface Step7Props {
  allData: AllData;
  onRestart: () => void;
  onBack: () => void;
  onGenerateVideo: () => void;
}

type TabKey = 'script' | 'avatar' | 'thumbnail' | 'storyboard' | 'video_prompts';

const CopyableContent: React.FC<{ title: string; content: string }> = ({ title, content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative p-6 bg-zinc-950/50 rounded-xl border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-[10px] text-[#FFCC00] uppercase tracking-widest font-mono">// {title}</h4>
        <button
          onClick={handleCopy}
          className="p-2 rounded-lg bg-zinc-900 hover:bg-[#FFCC00]/20 text-zinc-400 hover:text-[#FFCC00] transition-colors border border-white/10"
          aria-label={`Copy ${title}`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <pre className="text-zinc-400 whitespace-pre-wrap text-sm font-mono leading-relaxed">{content}</pre>
    </div>
  );
};

const ImageAssetPanel: React.FC<{ title: string; src: string; aspectRatio: '9:16' | '16:9' | null; filename: string; onPreview: () => void }> = ({ title, src, aspectRatio, filename, onPreview }) => {
  const containerDims = aspectRatio === '16:9' ? 'w-full max-w-[480px] aspect-video' : 'w-full max-w-[280px] aspect-[9/16]';
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = filename;
    link.click();
  };
  return (
    <div className="p-6 bg-zinc-950/50 rounded-xl border border-white/10 flex flex-col items-center gap-6">
      <div className="flex items-center justify-between w-full">
        <h4 className="font-bold text-[10px] text-[#FFCC00] uppercase tracking-widest font-mono">// {title}</h4>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-[#FFCC00]/20 text-zinc-400 hover:text-[#FFCC00] transition-colors border border-white/10 text-[10px] font-mono tracking-widest uppercase"
        >
          <Download className="w-3 h-3" /> Download
        </button>
      </div>
      <button
        type="button"
        onClick={onPreview}
        className={`${containerDims} group relative bg-zinc-950 rounded-xl overflow-hidden border-2 border-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.3)] cursor-zoom-in`}
        aria-label={`Preview ${title} full-size`}
      >
        <img
          src={src}
          alt={title}
          className="w-full h-full object-contain"
        />
        <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Search className="w-7 h-7 text-white" />
        </div>
      </button>
    </div>
  );
};

const Step7FinalOutput: React.FC<Step7Props> = ({ allData, onRestart, onBack, onGenerateVideo }) => {
  const { clientDetails, finalScript, avatar, storyboard, videoPrompts, thumbnailUrl, aspectRatio } = allData;
  const [activeTab, setActiveTab] = useState<TabKey>('script');
  const [exporting, setExporting] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; filename: string } | null>(null);

  const fullScriptText = finalScript.join('\n');

  const storyboardText = storyboard
    .map((s, i) => {
      let text = `[SCENE ${i + 1}: "${s.scriptLine}"]\n`;
      text += `Description: ${s.sceneDescription}\n`;
      text += `Visual Focus: ${s.referenceImage || 'N/A'}\n`;
      if (s.imagePrompt) text += `Image Prompt: ${s.imagePrompt}`;
      if (s.startFramePrompt) {
        text += `Start Prompt: ${s.startFramePrompt}\n`;
        text += `Transition: ${s.transitionEffect}\n`;
        text += `End Prompt: ${s.endFramePrompt}`;
      }
      return text;
    })
    .join('\n\n---\n\n');

  const videoPromptsText = videoPrompts
    .map((p, i) => `[SCENE ${i + 1}: "${p.scriptLine || storyboard[i]?.scriptLine || ''}"]\nType: ${p.type}\nPrompt: ${p.prompt}`)
    .join('\n\n---\n\n');

  const exportBundle = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const zip = new JSZip();
      zip.file('script.txt', fullScriptText);
      zip.file('storyboard.json', JSON.stringify(storyboard, null, 2));
      zip.file('video_prompts.txt', videoPromptsText);
      if (avatar?.url) zip.file('avatar.png', avatar.url.split(',')[1], { base64: true });
      if (thumbnailUrl) zip.file('thumbnail.png', thumbnailUrl.split(',')[1], { base64: true });
      storyboard.forEach((s, i) => {
        if (s.imageUrl) zip.file(`scenes/scene_${i + 1}.png`, s.imageUrl.split(',')[1], { base64: true });
        if (s.endFrameImageUrl) zip.file(`scenes/scene_${i + 1}_end.png`, s.endFrameImageUrl.split(',')[1], { base64: true });
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const safeName = (clientDetails.brandName || 'GRIFON_Project').replace(/[^a-zA-Z0-9_-]+/g, '_');
      saveAs(blob, `${safeName}_Bundle.zip`);
    } catch (e) {
      console.error('EXPORT_BUNDLE_FAILED', e);
    } finally {
      setExporting(false);
    }
  };

  const tabs: { key: TabKey; label: string; available: boolean }[] = [
    { key: 'script', label: 'SCRIPT', available: finalScript.length > 0 },
    { key: 'avatar', label: 'AVATAR', available: !!avatar?.url },
    { key: 'thumbnail', label: 'THUMBNAIL', available: !!thumbnailUrl },
    { key: 'storyboard', label: 'STORYBOARD', available: storyboard.length > 0 },
    { key: 'video_prompts', label: 'VIDEO_PROMPTS', available: videoPrompts.length > 0 },
  ];

  const renderPanel = () => {
    switch (activeTab) {
      case 'script':
        return <CopyableContent title="Final Ad Script" content={fullScriptText} />;
      case 'avatar':
        return avatar?.url ? (
          <ImageAssetPanel
            title="Marketing Avatar"
            src={avatar.url}
            aspectRatio="9:16"
            filename="avatar.png"
            onPreview={() => setPreviewImage({ url: avatar.url, filename: 'avatar.png' })}
          />
        ) : (
          <p className="text-zinc-500 text-sm font-mono p-6">// AVATAR_NOT_GENERATED</p>
        );
      case 'thumbnail':
        return thumbnailUrl ? (
          <ImageAssetPanel
            title="Viral Thumbnail"
            src={thumbnailUrl}
            aspectRatio={aspectRatio ?? '9:16'}
            filename="thumbnail.png"
            onPreview={() => setPreviewImage({ url: thumbnailUrl, filename: 'thumbnail.png' })}
          />
        ) : (
          <p className="text-zinc-500 text-sm font-mono p-6">// THUMBNAIL_NOT_GENERATED</p>
        );
      case 'storyboard':
        return <CopyableContent title="Storyboard & Image Prompts" content={storyboardText} />;
      case 'video_prompts':
        return <CopyableContent title="Video Prompts" content={videoPromptsText} />;
    }
  };

  return (
    <GlassPanel>
      <div className="mb-8 border-b border-white/10 pb-6">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 uppercase tracking-tight">
          Step 8: Final Output & Assets
        </h2>
        <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
          // Review your campaign, export the bundle, ship the video.
        </p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const isActive = activeTab === t.key;
          const disabled = !t.available;
          return (
            <button
              key={t.key}
              onClick={() => !disabled && setActiveTab(t.key)}
              disabled={disabled}
              className={`shrink-0 px-4 py-2 text-[10px] font-mono tracking-widest rounded-full border transition-colors ${
                isActive
                  ? 'bg-[#FFCC00]/10 text-[#FFCC00] border-[#FFCC00]/40'
                  : disabled
                  ? 'bg-zinc-950 text-zinc-700 border-white/5 cursor-not-allowed'
                  : 'bg-zinc-950 text-zinc-400 border-white/10 hover:border-[#FFCC00]/40 hover:text-zinc-200'
              }`}
            >
              {`// ${t.label}`}
            </button>
          );
        })}
      </div>

      <div className="min-h-[420px]">{renderPanel()}</div>

      <div className="mt-10 pt-6 border-t border-white/10">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-mono text-xs tracking-widest uppercase"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={exportBundle}
              disabled={exporting}
              className="flex items-center justify-center gap-2 rounded-full px-6 py-3 border border-[#FFCC00]/40 hover:border-[#FFCC00] text-[#FFCC00] hover:bg-[#FFCC00]/5 transition-colors text-[10px] font-mono tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Package className="w-4 h-4" /> {exporting ? 'BUNDLING...' : 'EXPORT_BUNDLE (.ZIP)'}
            </button>
            <GoldButton onClick={onGenerateVideo} className="rounded-full px-6 py-3 flex items-center justify-center gap-2 text-[10px]">
              <Video className="w-4 h-4" /> GENERATE VIDEO NOW &gt;
            </GoldButton>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onRestart}
            className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-zinc-500 hover:text-zinc-200 hover:border-white/20 transition-colors border border-white/5 rounded-full px-4 py-1.5"
          >
            <RotateCcw className="w-3 h-3" /> Clear Session &amp; Restart
          </button>
        </div>
      </div>

      {previewImage && (
        <ImageModal
          imageUrl={previewImage.url}
          onClose={() => setPreviewImage(null)}
          filename={previewImage.filename}
        />
      )}
    </GlassPanel>
  );
};

export default Step7FinalOutput;
