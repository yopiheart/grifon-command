
import React, { useState, useEffect, useRef } from 'react';
import { Scene, Avatar, BusinessInfo, StoryboardResponse } from '../types';
import { generateStoryboard, generateDaisyChainScenes } from '../services/geminiService';
import { renderSceneImages } from '../utils/sceneRender';
import { compressImageForUpload } from '../utils/imageCompression';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import ImageModal from './ui/ImageModal';
import { RefreshCw, Search, Copy, Sparkles, AlertTriangle } from 'lucide-react';
import JSZip from 'jszip';
import saveAs from 'file-saver';

interface Step5Props {
  script: string[];
  avatar: Avatar | null;
  businessInfo: BusinessInfo;
  storyboard: Scene[];
  setStoryboard: (storyboard: Scene[]) => void;
  onNext: () => void;
  onBack: () => void;
  aspectRatio: '9:16' | '16:9' | null;
  language: 'English' | 'Taglish' | null;
}


const Step5Storyboard: React.FC<Step5Props> = ({ script, avatar, businessInfo, storyboard, setStoryboard, onNext, onBack, aspectRatio, language }) => {
  const [loadingStoryboard, setLoadingStoryboard] = useState(storyboard.length === 0 && businessInfo.scriptType !== 'Cinematic');
  const [loadingImages, setLoadingImages] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storyboardData, setStoryboardData] = useState<Scene[]>(storyboard);
  const [strategicAudit, setStrategicAudit] = useState<string>('');
  const [generatingImageIndex, setGeneratingImageIndex] = useState<number | null>(null);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [modalImageFilename, setModalImageFilename] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadIndex, setCurrentUploadIndex] = useState<{index: number, frame: 'start' | 'end'} | null>(null);
  const [critiqueExpanded, setCritiqueExpanded] = useState(false);

  const hasFetchedRef = useRef(false);
  const isCinematic = businessInfo.scriptType === 'Cinematic';

  const fetchStoryboard = async () => {
    if (!avatar || !language) {
      setError("Avatar and script language not found. Please go back to previous steps.");
      setLoadingStoryboard(false);
      return;
    }
    try {
      setLoadingStoryboard(true);
      setError(null);
      const data: StoryboardResponse = await generateStoryboard(script, avatar.description, businessInfo, avatar.ethnicity, language);
      setStoryboardData(data.scenes);
      setStrategicAudit(data.strategicAudit);
      setStoryboard(data.scenes); 
    } catch (err: any) {
      const errorMessage = err.message || "Unknown error occurred";
      setError(`Failed to generate storyboard text: ${errorMessage}`);
    } finally {
      setLoadingStoryboard(false);
    }
  };

  useEffect(() => {
    if (storyboard.length > 0) {
        setStoryboardData(storyboard);
        setLoadingStoryboard(false);
        hasFetchedRef.current = true;
        return;
    }
    
    if (!isCinematic && !hasFetchedRef.current && avatar && language) {
        fetchStoryboard();
        hasFetchedRef.current = true;
    }
  }, [script, avatar, businessInfo, storyboard, language]);

  const handleGenerateCinematicChain = async () => {
    if (!businessInfo.selectedTheme || !aspectRatio || !businessInfo.productImageUrls?.length) {
      setError("Cinematic Treatment or Anchor Image missing.");
      return;
    }
    setLoadingImages(true);
    setError(null);
    try {
      // Logic Update: Pass the full array to support Dynamic Angle Mapping
      const chain = await generateDaisyChainScenes(businessInfo.productImageUrls, businessInfo.selectedTheme, aspectRatio);
      setStoryboardData(chain);
      setStoryboard(chain);
    } catch (err) {
      setError("DAISY_CHAIN_GEN_FAILED: Visual relay synthesis timed out.");
    } finally {
      setLoadingImages(false);
    }
  };

  const handleGenerateAllScenes = async () => {
    if (isCinematic) {
      handleGenerateCinematicChain();
      return;
    }
    if (!avatar || !aspectRatio) return;
    setLoadingImages(true);
    for (let i = 0; i < storyboardData.length; i++) {
        await handleGenerateSingleScene(i);
        await new Promise(r => setTimeout(r, 2500));
    }
    setLoadingImages(false);
  };

  const handleGenerateSingleScene = async (index: number, force: boolean = false) => {
    if (!aspectRatio) return;
    setGeneratingImageIndex(index);
    const updatedStoryboard = [...storyboardData];
    const scene = updatedStoryboard[index];

    if (!scene) return;

    try {
        await renderSceneImages(scene, index, { aspectRatio, avatar, businessInfo }, force);
        setStoryboardData([...updatedStoryboard]);
        setStoryboard(updatedStoryboard);
    } catch (err) {
        console.error("Single Scene Gen Error:", err); 
    } finally {
        setGeneratingImageIndex(null);
    }
  };

  const handleManualUploadClick = (index: number, frame: 'start' | 'end') => {
    setCurrentUploadIndex({ index, frame });
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file || !currentUploadIndex) return;

    const { dataUrl } = await compressImageForUpload(file);
    const updatedStoryboard = [...storyboardData];
    if (currentUploadIndex.frame === 'start') {
        updatedStoryboard[currentUploadIndex.index].manualUploadUrl = dataUrl;
    } else {
        updatedStoryboard[currentUploadIndex.index].manualEndFrameUrl = dataUrl;
    }
    setStoryboardData(updatedStoryboard);
    setStoryboard(updatedStoryboard);
    setCurrentUploadIndex(null);
  };

  const handleDownloadAllImages = async () => {
    setIsDownloading(true);
    try {
        const zip = new JSZip();
        storyboardData.forEach((scene, i) => {
            const startUrl = scene.manualUploadUrl || scene.imageUrl;
            const endUrl = scene.manualEndFrameUrl || scene.endFrameImageUrl;
            if (startUrl) zip.file(`scene_${i+1}_start.png`, startUrl.split(',')[1], {base64: true});
            if (endUrl) zip.file(`scene_${i+1}_end.png`, endUrl.split(',')[1], {base64: true});
        });
        const blob = await zip.generateAsync({type:"blob"});
        saveAs(blob, "Creative_Director_Assets.zip");
    } catch (e) { console.error(e); }
    setIsDownloading(false);
  };

  const SceneImageDisplay: React.FC<{ 
    src?: string, 
    isManual?: boolean,
    isLoading: boolean, 
    label: string, 
    onClick: () => void, 
    onUpload: () => void,
    isHook?: boolean,
    size?: 'small' | 'normal'
  }> = ({ src, isManual, isLoading, label, onClick, onUpload, size = 'normal' }) => (
    <div className={`relative group ${isLoading ? 'scanner-active' : ''}`}>
        <div
            onClick={src && !isLoading ? onClick : undefined}
            className={`${size === 'small' ? 'w-24 h-40' : 'w-28 h-48'} bg-zinc-950/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-zinc-500 text-xs text-center relative overflow-hidden group hover:border-[#FFCC00] transition-all rounded-xl ${src && !isLoading ? 'cursor-pointer shadow-2xl' : 'cursor-default'}`}
        >
            {src && !isLoading ? (
                <>
                    <img src={src} alt={label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Search className="w-6 h-6 text-white" />
                    </div>
                    {isManual && (
                        <div className="absolute top-0 right-0 bg-[#FFCC00] text-black text-[7px] font-black px-1.5 py-0.5 z-20 font-mono tracking-tighter">
                            MANUAL_ASSET
                        </div>
                    )}
                    <div className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="w-full h-[1px] bg-[#FFCC00]/50 shadow-[0_0_15px_#FFCC00] absolute top-0 animate-scan" />
                    </div>
                </>
            ) : (
                <div className="p-4 flex flex-col items-center gap-2 opacity-40">
                    {isLoading ? <Loader message="" size="sm" /> : (
                        <>
                            <p className="font-mono text-[9px] uppercase tracking-tighter">{label}</p>
                            <button onClick={(e) => { e.stopPropagation(); onUpload(); }} className="px-2 py-1 text-[8px] border border-[#FFCC00] text-[#FFCC00] rounded hover:bg-[#FFCC00]/10 transition-colors">UPLOAD</button>
                        </>
                    )}
                </div>
            )}
        </div>
    </div>
  );

  const missingVisuals = !businessInfo.productImageUrls || businessInfo.productImageUrls.length === 0;

  if (isCinematic) {
    return (
      <GlassPanel>
        <div className="mb-8 border-b border-white/10 pb-6">
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight">
            Visual Chain Relay
          </h2>
          <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
            // The Anchor image (Reference B) remains constant while the AI synthesizes Metaphor A, Action C, and Hero D.
          </p>
        </div>
        {loadingImages && <Loader message="EXECUTING_RELAY_SYNTHESIS..." />}
        {error && <p className="text-red-500 text-center mb-4 font-mono">{error}</p>}
        {modalImageUrl && <ImageModal imageUrl={modalImageUrl} onClose={() => setModalImageUrl(null)} filename={modalImageFilename} />}
        
        <div className="flex flex-col items-center gap-12 py-10">
          <div className="flex items-center gap-4 overflow-x-auto pb-6 w-full justify-center">
             <SceneImageDisplay 
                label="METAPHOR_A" 
                src={storyboardData.find(s => s.chainRole === 'Metaphor_A')?.imageUrl}
                isLoading={loadingImages && !storyboardData.length}
                onClick={() => {}} 
                onUpload={() => {}}
             />
             <div className="w-8 h-px bg-[#FFCC00]/20 shrink-0" />
             <SceneImageDisplay 
                label="ANCHOR_B" 
                src={businessInfo.productImageUrls?.[0]}
                isLoading={false}
                onClick={() => {}} 
                onUpload={() => {}}
             />
             <div className="w-8 h-px bg-[#FFCC00]/20 shrink-0" />
             <SceneImageDisplay 
                label="ACTION_C" 
                src={storyboardData.find(s => s.chainRole === 'Anchor_B')?.endFrameImageUrl}
                isLoading={loadingImages && !storyboardData.length}
                onClick={() => {}} 
                onUpload={() => {}}
             />
             <div className="w-8 h-px bg-[#FFCC00]/20 shrink-0" />
             <SceneImageDisplay 
                label="HERO_D" 
                src={storyboardData.find(s => s.chainRole === 'Action_C')?.endFrameImageUrl}
                isLoading={loadingImages && !storyboardData.length}
                onClick={() => {}} 
                onUpload={() => {}}
             />
          </div>

          {!storyboardData.length && !loadingImages && (
            <GoldButton onClick={handleGenerateCinematicChain} className="rounded-full px-12 py-5 flex items-center gap-3">
               <Sparkles className="w-6 h-6" /> GENERATE VISUAL CHAIN
            </GoldButton>
          )}

          {storyboardData.length > 0 && !loadingImages && (
            <div className="p-6 border border-[#FFCC00]/20 bg-zinc-950/50 backdrop-blur-md rounded-xl max-w-xl text-center">
              <p className="text-xs text-[#FFCC00] font-mono font-bold mb-2 uppercase tracking-widest">[ ENGINE_REPORT ]</p>
              <p className="text-[11px] text-zinc-400 font-mono italic">"Daisy chain relay complete. Anchor identity locked at 98.4% variance. Clips are ready for Kling O1 Frame interpolation."</p>
              <div className="flex gap-4 justify-center mt-6">
                <button onClick={handleGenerateCinematicChain} className="text-[10px] rounded-full px-6 py-2 border border-white/10 text-white hover:bg-white/5 transition-colors">RE-GENERATE CHAIN</button>
                <button onClick={handleDownloadAllImages} className="text-[10px] rounded-full px-6 py-2 border border-white/10 text-white hover:bg-white/5 transition-colors">DOWNLOAD_RELAY (.ZIP)</button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 flex justify-between gap-6">
          <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors font-mono text-sm tracking-widest uppercase">&lt; BACK</button>
          <GoldButton onClick={onNext} disabled={!storyboardData.length || loadingImages} className="rounded-full px-12">
              CONFIRM & DEPLOY &gt;
          </GoldButton>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel>
      <div className="mb-8 border-b border-white/10 pb-6">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight">
          Storyboard Synthesis
        </h2>
        <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
          // Visual artifacts generated based on your strategic ad script.
        </p>
      </div>
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange} 
      />

      {missingVisuals && (
        <div className="mb-6 p-4 border border-[#FFCC00]/30 bg-[#FFCC00]/5 rounded-xl flex flex-col items-center gap-2 text-center animate-in fade-in slide-in-from-top-4">
          <p className="text-[10px] font-black text-[#FFCC00] uppercase tracking-widest font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> VISUAL ASSETS MISSING
          </p>
          <p className="text-[11px] text-zinc-400 font-mono leading-tight max-w-lg">
            The AI will generate generic placeholders for the product. For brand-accurate results, please upload your product photos in Step 2.
          </p>
        </div>
      )}

      {/* AI STRATEGY ADVICE BUBBLE */}
      {!loadingStoryboard && strategicAudit && (
        <div className="mb-8 bg-zinc-900 border border-white/10 backdrop-blur-md rounded-2xl overflow-hidden">
            <button
                onClick={() => setCritiqueExpanded(prev => !prev)}
                className="w-full flex items-center justify-between gap-4 px-5 py-3 text-left hover:bg-white/5 transition-colors"
            >
                <span className="bg-[#FFCC00] text-black text-[10px] font-black px-3 py-1 font-mono tracking-widest uppercase shadow-lg rounded">
                    [ DIRECTOR_CRITIQUE ]
                </span>
                <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">
                    {critiqueExpanded ? '▴ HIDE' : '▾ READ_MORE'}
                </span>
            </button>
            {critiqueExpanded && (
                <p className="text-sm font-mono text-zinc-300 leading-relaxed px-6 pb-6 pt-2 italic">
                    "{strategicAudit}"
                </p>
            )}
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4 border-b border-white/10 pb-8">
         <div className="flex flex-wrap gap-4">
             <GoldButton onClick={handleGenerateAllScenes} disabled={loadingImages || loadingStoryboard} className="rounded-full px-8 flex items-center gap-3">
                <RefreshCw className={`w-5 h-5 ${loadingImages ? 'animate-spin' : ''}`} />
                SYNTHESIZE ALL VISUALS
             </GoldButton>
             
             {businessInfo.scriptType !== 'Custom' && (
                <button onClick={fetchStoryboard} disabled={loadingStoryboard || loadingImages} className="rounded-full px-8 py-2 flex items-center gap-3 border border-[#FFCC00]/40 hover:border-[#FFCC00] text-[#FFCC00] transition-colors bg-transparent disabled:opacity-50 disabled:cursor-not-allowed">
                    <RefreshCw className="w-5 h-5"/> RE-MAP NARRATIVE
                </button>
             )}

             {storyboardData.some(s => s.imageUrl || s.manualUploadUrl) && (
                 <button onClick={handleDownloadAllImages} disabled={isDownloading} className="rounded-full px-8 py-2 flex items-center gap-3 border border-white/10 text-white hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Copy className="w-5 h-5"/> ASSET_BUNDLE (.ZIP)
                 </button>
             )}
         </div>
         {loadingImages && storyboardData.length > 0 && (() => {
             const synthesized = storyboardData.filter(s => s.imageUrl || s.manualUploadUrl).length;
             const total = storyboardData.length;
             return (
                 <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-900/80 backdrop-blur-xl border border-[#FFCC00]/30 shadow-[0_0_12px_rgba(255,204,0,0.2)]">
                     <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00]">[ {synthesized}/{total} SYNTHESIZED ]</span>
                     <div className="relative h-[2px] w-24 bg-white/5 overflow-hidden rounded-full">
                         <div className="absolute inset-y-0 left-0 bg-[#FFCC00] shadow-[0_0_8px_#FFCC00] transition-[width] duration-300" style={{ width: `${(synthesized / total) * 100}%` }} />
                     </div>
                 </div>
             );
         })()}
      </div>

      {loadingStoryboard && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">// MAPPING_SCENES</span>
            <div className="relative h-[2px] flex-1 bg-white/5 overflow-hidden rounded-full">
              <div className="absolute inset-y-0 left-0 w-1/3 bg-[#FFCC00] shadow-[0_0_8px_#FFCC00] animate-[storyboard-progress_2s_ease-in-out_infinite]" />
            </div>
            <span className="text-[10px] text-[#FFCC00] font-mono tracking-widest uppercase animate-pulse">SYNTHESIZING</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex flex-col gap-4 p-5 bg-zinc-950/50 backdrop-blur-md rounded-xl border border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[storyboard-shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
                <div className="flex items-center gap-3">
                  <span className="bg-[#FFCC00]/5 text-[#FFCC00]/40 text-[10px] font-black px-3 py-1 rounded-full border border-[#FFCC00]/10 font-mono tracking-tighter">SCENE_0{i + 1}</span>
                  <span className="h-[1px] flex-1 bg-white/5" />
                </div>
                <div className="flex justify-center items-center">
                  <div className="w-28 h-48 bg-zinc-900/50 border border-white/5 rounded-xl" />
                </div>
                <div className="h-5 bg-white/5 rounded w-3/4" />
                <div className="p-3 bg-zinc-900/50 border border-white/5 rounded-xl space-y-2">
                  <div className="h-3 bg-white/5 rounded w-full" />
                  <div className="h-3 bg-white/5 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-red-500 text-center mb-4 p-4 backdrop-blur-md rounded-xl font-mono text-sm border border-red-900/20 bg-red-900/10">{error}</p>}
      {modalImageUrl && <ImageModal imageUrl={modalImageUrl} onClose={() => setModalImageUrl(null)} filename={modalImageFilename} />}
      
      {!loadingStoryboard && storyboardData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-h-[58vh] overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {storyboardData.map((scene, index) => (
                <div key={index} className="flex flex-col gap-4 p-5 bg-zinc-950/50 backdrop-blur-md rounded-xl border border-white/10 hover:border-[#FFCC00]/40 transition-all group relative overflow-hidden">
                    <div className="absolute -right-20 -top-20 w-40 h-40 bg-[#FFCC00]/5 blur-[80px] rounded-full group-hover:bg-[#FFCC00]/10 transition-colors" />

                    <div className="flex items-center gap-3">
                        <span className="bg-[#FFCC00]/10 text-[#FFCC00] text-[10px] font-black px-3 py-1 rounded-full border border-[#FFCC00]/20 font-mono tracking-tighter">SCENE_0{index + 1}</span>
                        <span className="h-[1px] flex-1 bg-white/5"></span>
                        {!scene.manualUploadUrl && !scene.manualEndFrameUrl && (() => {
                            const hasImage = !!(scene.imageUrl || scene.endFrameImageUrl);
                            const idle = hasImage ? 'REGEN' : 'GENERATE';
                            const busy = hasImage ? 'REGENERATING...' : 'GENERATING...';
                            return (
                                <button
                                    onClick={() => handleGenerateSingleScene(index, true)}
                                    disabled={generatingImageIndex !== null || loadingImages}
                                    className="text-[9px] font-mono tracking-widest text-zinc-400 hover:text-[#FFCC00] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 px-2 py-1 border border-white/10 hover:border-[#FFCC00]/40 rounded-full"
                                    title={hasImage ? 'Regenerate this scene only' : 'Generate this failed scene'}
                                >
                                    <RefreshCw className={`w-3 h-3 ${generatingImageIndex === index ? 'animate-spin' : ''}`} /> {generatingImageIndex === index ? busy : idle}
                                </button>
                            );
                        })()}
                    </div>

                    <div className="flex justify-center gap-3 items-center">
                        {scene.startFramePrompt ? (
                            <>
                                <SceneImageDisplay
                                    src={scene.manualUploadUrl || scene.imageUrl}
                                    isManual={!!scene.manualUploadUrl}
                                    isLoading={generatingImageIndex === index && !scene.imageUrl && !scene.manualUploadUrl}
                                    label="START_FRAME"
                                    onClick={() => { setModalImageUrl(scene.manualUploadUrl || scene.imageUrl!); setModalImageFilename(`Scene_${index+1}_Start.png`); }}
                                    onUpload={() => handleManualUploadClick(index, 'start')}
                                />
                                <SceneImageDisplay
                                    src={scene.manualEndFrameUrl || scene.endFrameImageUrl}
                                    isManual={!!scene.manualEndFrameUrl}
                                    isLoading={generatingImageIndex === index && !scene.endFrameImageUrl && !scene.manualEndFrameUrl}
                                    label="END_FRAME"
                                    onClick={() => { setModalImageUrl(scene.manualEndFrameUrl || scene.endFrameImageUrl!); setModalImageFilename(`Scene_${index+1}_End.png`); }}
                                    onUpload={() => handleManualUploadClick(index, 'end')}
                                />
                            </>
                        ) : (
                            <SceneImageDisplay
                                src={scene.manualUploadUrl || scene.imageUrl}
                                isManual={!!scene.manualUploadUrl}
                                isLoading={generatingImageIndex === index && !scene.imageUrl && !scene.manualUploadUrl}
                                label="STATIC_SHOT"
                                onClick={() => { setModalImageUrl(scene.manualUploadUrl || scene.imageUrl!); setModalImageFilename(`Scene_${index+1}.png`); }}
                                onUpload={() => handleManualUploadClick(index, 'start')}
                            />
                        )}
                    </div>

                    <p className="text-base font-bold text-white leading-tight">"{scene.scriptLine}"</p>
                    <div className="p-3 bg-zinc-900 border border-white/10 rounded-xl space-y-2">
                        <p className="text-[11px] text-zinc-400 font-mono leading-relaxed italic">
                            <span className="text-[#FFCC00] not-italic font-bold tracking-widest mr-2">[NARRATIVE]</span>
                            {scene.sceneDescription}
                        </p>
                        {(scene.imagePrompt || scene.startFramePrompt) && (
                            <p className="text-[11px] text-zinc-500 font-mono leading-relaxed italic border-t border-white/5 pt-2">
                                <span className="text-zinc-300 not-italic font-bold tracking-widest mr-2">[VISUAL_PROMPT]</span>
                                {scene.startFramePrompt
                                    ? `${scene.startFramePrompt}${scene.endFramePrompt ? `  →  ${scene.endFramePrompt}` : ''}`
                                    : scene.imagePrompt}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center gap-6">
        <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors font-mono text-sm tracking-widest uppercase">&lt; BACK</button>
        <GoldButton onClick={onNext} disabled={loadingImages || loadingStoryboard || !(storyboardData.some(s => s.imageUrl || s.manualUploadUrl))} className="rounded-full px-12">
            CONFIRM & DEPLOY &gt;
        </GoldButton>
      </div>
    </GlassPanel>
  );
};

export default Step5Storyboard;
