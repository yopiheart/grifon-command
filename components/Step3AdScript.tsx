
import React, { useState, useEffect, useMemo } from 'react';
import { BusinessInfo, Script, VisualTheme } from '../types';
import { generateAdScript, generateCinematicThemes } from '../services/geminiService';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import { AlertTriangle, Check, RefreshCw, Copy, ChevronLeft } from 'lucide-react';
import { StepShell } from './ui/StepShell';
import { StepFooter } from './ui/StepFooter';
import { TitledCard } from './ui/TitledCard';
import { FieldLabel } from './ui/FieldLabel';
import { TextArea } from './ui/TextField';
import { SegButton } from './ui/SegButton';

interface Step3Props {
  businessInfo: BusinessInfo;
  script: Script | null;
  setScript: (script: Script | null) => void;
  setFinalScript: (script: string[]) => void;
  language: 'English' | 'Taglish' | null;
  setLanguage: (language: 'English' | 'Taglish') => void;
  onNext: () => void;
  onBack: () => void;
  brandName: string;
  offer: string;
  directorAngleBrief: string | null;
  setDirectorAngleBrief: (brief: string | null) => void;
}

type AngleOption =
  | { kind: 'headline'; lever: string; text: string; brief: string }
  | { kind: 'hook'; style: string; visual: string; spokenLine: string; brief: string }
  | { kind: 'ad'; format: string; angle: string; openingLine: string; whyItWorks: string; brief: string };

const HEADLINE_LEVERS = ['PAIN', 'DREAM', 'CURIOSITY', 'SOCIAL_PROOF', 'CONTRARIAN'] as const;

const Step3AdScript: React.FC<Step3Props> = ({ businessInfo, script, setScript, setFinalScript, language: propLanguage, setLanguage: setAppLanguage, onNext, onBack, brandName, offer, directorAngleBrief, setDirectorAngleBrief }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedScript, setGeneratedScript] = useState<Script | null>(script);
  const [strategicAudit, setStrategicAudit] = useState<string>(script?.strategicAudit || '');
  const [selectedHook, setSelectedHook] = useState<1 | 2 | null>(null);
  const [localLanguage, setLocalLanguage] = useState<'English' | 'Taglish' | null>(propLanguage);
  const [step3Mode, setStep3Mode] = useState<'pick' | 'review'>(script ? 'review' : 'pick');
  // Smart validator: flips true once the user forces Confirm without selecting a hook. Presentational.
  const [triedNext, setTriedNext] = useState(false);

  // Cinematic Specific State
  const [themes, setThemes] = useState<VisualTheme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(businessInfo.selectedTheme?.id || null);

  const isCinematic = businessInfo.scriptType === 'Cinematic';

  // Parse MarketMind report from localStorage for the "Pick Your Angle" picker.
  // Pattern matches InfluencerForge.tsx:212-216 — try/catch JSON.parse + shape check on .subject.
  const angleOptions = useMemo<{ headlines: AngleOption[]; hooks: AngleOption[]; ads: AngleOption[]; contrarianTruth: string } | null>(() => {
    try {
      const saved = localStorage.getItem('marketMindReport');
      if (!saved) return null;
      const r = JSON.parse(saved);
      if (!r || typeof r !== 'object' || !r.subject) return null;

      const headlines: AngleOption[] = Array.isArray(r.headlines)
        ? r.headlines.slice(0, 5).map((text: string, i: number) => {
            const lever = HEADLINE_LEVERS[i] || 'CUSTOM';
            return {
              kind: 'headline',
              lever,
              text,
              brief: `ANGLE TYPE: HEADLINE\nEMOTIONAL LEVER: ${lever}\nHEADLINE TO REINFORCE: "${text}"`,
            };
          })
        : [];

      const hooks: AngleOption[] = Array.isArray(r.videoHooks)
        ? r.videoHooks.slice(0, 5).map((h: { type?: string; visual?: string; spokenLine?: string }) => ({
            kind: 'hook',
            style: h.type || 'Custom',
            visual: h.visual || '',
            spokenLine: h.spokenLine || '',
            brief: `ANGLE TYPE: VIDEO_HOOK\nHOOK STYLE: ${h.type || 'Custom'}\nOPENING VISUAL: ${h.visual || ''}\nOPENING SPOKEN LINE: "${h.spokenLine || ''}"`,
          }))
        : [];

      const ads: AngleOption[] = Array.isArray(r.fbAdLibraryAngles)
        ? r.fbAdLibraryAngles.slice(0, 3).map((a: { format?: string; angle?: string; openingLine?: string; whyItWorks?: string }) => ({
            kind: 'ad',
            format: a.format || 'Custom',
            angle: a.angle || '',
            openingLine: a.openingLine || '',
            whyItWorks: a.whyItWorks || '',
            brief: `ANGLE TYPE: AD_CONCEPT\nFORMAT: ${a.format || 'Custom'}\nSTRATEGIC ANGLE: ${a.angle || ''}\nOPENING LINE: "${a.openingLine || ''}"\nPERSUASION MECHANISM: ${a.whyItWorks || ''}`,
          }))
        : [];

      if (headlines.length === 0 && hooks.length === 0 && ads.length === 0) return null;
      return { headlines, hooks, ads, contrarianTruth: typeof r.contrarianTruth === 'string' ? r.contrarianTruth : '' };
    } catch {
      return null;
    }
  }, []);

  const handlePickAngle = (brief: string) => {
    setDirectorAngleBrief(directorAngleBrief === brief ? null : brief);
  };

  useEffect(() => {
      if (propLanguage) {
          setLocalLanguage(propLanguage);
      }
  }, [propLanguage]);

  useEffect(() => {
      if (script) {
          setGeneratedScript(script);
          setStrategicAudit(script.strategicAudit || '');
          setStep3Mode('review');
      }
  }, [script]);

  // Fetch Cinematic Themes if necessary
  useEffect(() => {
    if (isCinematic && themes.length === 0) {
      const fetchThemes = async () => {
        setLoading(true);
        try {
          const result = await generateCinematicThemes(businessInfo.product);
          setThemes(result);
        } catch (err) {
          setError("Failed to generate cinematic treatments.");
        } finally {
          setLoading(false);
        }
      };
      fetchThemes();
    }
  }, [isCinematic, businessInfo.product]);

  useEffect(() => {
    if (businessInfo.scriptType === 'Custom' && businessInfo.customScriptFile && businessInfo.customScriptFile.length > 0 && !generatedScript) {
        const customScript: Script = {
            hook1: businessInfo.customScriptFile.slice(0, 2), 
            hook2: businessInfo.customScriptFile.slice(2, 4), 
            body: businessInfo.customScriptFile.slice(4),
            strategicAudit: 'Manual override detected. Using custom script data provided by operator.'
        };
        if (businessInfo.customScriptFile.length < 5) {
            customScript.hook1 = [businessInfo.customScriptFile[0]];
            customScript.hook2 = [businessInfo.customScriptFile[0]];
            customScript.body = businessInfo.customScriptFile.slice(1);
        }

        setGeneratedScript(customScript);
        setStrategicAudit(customScript.strategicAudit || '');
        setScript(customScript);
        setSelectedHook(1);
        setStep3Mode('review');
        if (!localLanguage) setLocalLanguage('English');
    }
  }, [businessInfo, generatedScript, setScript, localLanguage]);


  const handleGenerateScript = async () => {
    if (!localLanguage) return;

    try {
      setLoading(true);
      setError(null);
      const newScript = await generateAdScript(businessInfo, brandName, localLanguage, offer, directorAngleBrief || '', angleOptions?.contrarianTruth || '');
      setGeneratedScript(newScript);
      setStrategicAudit(newScript.strategicAudit || '');
      setScript(newScript);
      setAppLanguage(localLanguage);
      setSelectedHook(null);
      setStep3Mode('review');
    } catch (err) {
      setError('Failed to generate ad script. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleScriptUpdate = (section: keyof Script, value: string) => {
      if (generatedScript) {
          const updatedScript = {
              ...generatedScript,
              [section]: section === 'strategicAudit' ? value : value.split('\n')
          };
          if (section === 'strategicAudit') setStrategicAudit(value);
          setGeneratedScript(updatedScript);
          setScript(updatedScript);
      }
  };

  const handleSelectHook = (hookNumber: 1 | 2) => {
    setSelectedHook(hookNumber);
  };

  const handleDownloadScript = () => {
    if (!generatedScript || !selectedHook) return;

    const hookLines = selectedHook === 1 ? generatedScript.hook1 : generatedScript.hook2;
    const bodyLines = generatedScript.body;

    const content = [
        "--- GENERATED AD SCRIPT ---",
        "",
        "[STRATEGIC AUDIT]",
        strategicAudit || "N/A",
        "",
        "[HOOK]",
        ...hookLines,
        "",
        "[BODY]",
        ...bodyLines
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Ads Script.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleNext = () => {
    if (isCinematic) {
      const theme = themes.find(t => t.id === selectedThemeId);
      if (theme) {
        businessInfo.selectedTheme = theme;
        // Cinematic bypasses standard script, but we fill a placeholder for types consistency
        setFinalScript(["[CINEMATIC_SPEC_MODE]", theme.name]);
        onNext();
      }
      return;
    }

    if (generatedScript && selectedHook) {
      const final = selectedHook === 1 
        ? [...generatedScript.hook1, ...generatedScript.body]
        : [...generatedScript.hook2, ...generatedScript.body];
      setFinalScript(final);
      onNext();
    }
  };

  const handleThemeSelect = (theme: VisualTheme) => {
    setSelectedThemeId(theme.id);
  };

  // A forced Confirm without a selected hook flags it + scrolls to the hooks, instead of sitting
  // disabled. The handleNext gate (generatedScript && selectedHook) stays the source of truth.
  const guardedNext = () => {
    if (generatedScript && selectedHook) { handleNext(); return; }
    setTriedNext(true);
    document.getElementById('hook-select')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const ScriptDisplay: React.FC<{ 
    title: string, 
    lines: string[], 
    onChange: (val: string) => void, 
    onClick: () => void, 
    isSelected: boolean 
  }> = ({ title, lines, onChange, onClick, isSelected }) => (
    <div
      onClick={onClick}
      className={`p-6 bg-zinc-950/50 border transition-all duration-200 cursor-pointer backdrop-blur-md rounded-xl ${isSelected ? 'border-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.2)]' : 'border-white/10 hover:border-[#FFCC00]'}`}
    >
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
        <h4 className="font-bold text-[10px] uppercase text-[#FFCC00] tracking-widest font-mono">{title}</h4>
        {isSelected && <Check className="w-6 h-6 text-[#FFCC00]" />}
      </div>
      <textarea
        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all resize-y min-h-[120px] font-mono text-sm leading-relaxed"
        value={lines.join('\n')}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => { e.stopPropagation(); onClick(); }} 
        placeholder="Edit hook text here..."
      />
    </div>
  );

  if (isCinematic) {
    return (
      <GlassPanel>
        <div className="mb-8 border-b border-white/10 pb-6">
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight">
            Cinematic Director's Treatment
          </h2>
          <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
            // Select a visual world for your high-end product spec ad. This replaces the standard text script.
          </p>
        </div>

        {loading && <Loader message="DREAMING_VISUAL_UNIVERSES..." />}
        {error && <p className="text-red-500 text-center mb-4 font-mono">{error}</p>}
        
        {!loading && themes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-700">
            {themes.map((theme) => (
              <div 
                key={theme.id}
                onClick={() => handleThemeSelect(theme)}
                className={`p-8 bg-zinc-950/50 backdrop-blur-xl rounded-[2rem] border transition-all duration-300 cursor-pointer flex flex-col h-full relative overflow-hidden group ${selectedThemeId === theme.id ? 'border-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.2)] scale-[1.02]' : 'border-white/10 hover:border-white/20'}`}
              >
                <div className={`absolute -right-8 -top-8 w-24 h-24 blur-2xl rounded-full transition-opacity ${selectedThemeId === theme.id ? 'opacity-40' : 'opacity-10'}`} style={{ backgroundColor: theme.colorPalette.split(',')[0] }}></div>
                
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-xl font-black text-white uppercase italic tracking-tight">{theme.name}</h4>
                  {selectedThemeId === theme.id && <Check className="w-6 h-6 text-[#FFCC00]" />}
                </div>
                
                <p className="text-xs text-zinc-400 font-mono mb-6 flex-grow leading-relaxed">
                  {theme.vibe}
                </p>
                
                <div className="pt-4 border-t border-white/10">
                   <p className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest mb-1">METAPHOR_TEXTURE</p>
                   <p className="text-[10px] text-[#FFCC00] font-bold uppercase">{theme.texturePrompt}</p>
                </div>

                <div className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity">
                    <div className="w-full h-[1px] bg-white absolute top-0 animate-scan" />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 flex justify-between items-center pt-6 border-t border-white/10">
          <button 
            onClick={onBack} 
            className="text-[10px] font-bold tracking-widest text-zinc-400 border border-white/10 px-6 py-3 rounded-full hover:bg-white/5 hover:text-white transition-all uppercase"
          >
            &lt; BACK
          </button>
          <GoldButton onClick={handleNext} disabled={!selectedThemeId || loading} className="px-8 py-3">
            CONFIRM TREATMENT &gt;
          </GoldButton>
        </div>
      </GlassPanel>
    );
  }

  return (
    <StepShell sublabel="STEP 3 · AD SCRIPT" title="Generate Ad Script">
      <p className="-mt-4 mb-6 text-[11px] font-mono leading-relaxed text-zinc-500">
        Select a language, generate options, and then edit the script to perfection.
      </p>

      {loading && <Loader message="PROCESSING LANGUAGE DATA..." />}
      {error && <p className="text-red-500 text-center mb-4 font-mono border border-red-900/50 bg-red-900/20 p-3 rounded-xl">{error}</p>}

      {step3Mode === 'pick' && angleOptions && (
        <TitledCard
          title="Pick Your Angle"
          className="mb-6"
          right={directorAngleBrief ? (
            <button onClick={() => setDirectorAngleBrief(null)} className="text-[10px] text-zinc-500 hover:text-white font-mono uppercase tracking-widest transition-colors">
              Clear selection
            </button>
          ) : undefined}
        >
          <div className="space-y-5">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Pick ONE angle from your MarketMind report. Director AI will build the entire script around it. Skip to use the audience/pain prefill only.
            </p>

            {angleOptions.headlines.length > 0 && (
              <div>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">// HEADLINES</p>
                <div className="flex flex-wrap gap-2">
                  {angleOptions.headlines.map((opt, i) => {
                    if (opt.kind !== 'headline') return null;
                    const isSelected = directorAngleBrief === opt.brief;
                    return (
                      <button
                        key={`h-${i}`}
                        onClick={() => handlePickAngle(opt.brief)}
                        className={`text-left text-xs rounded-xl px-3 py-2 transition-all border ${isSelected ? 'bg-[#FFCC00]/10 border-[#FFCC00] text-[#FFCC00]' : 'bg-zinc-950 border-white/10 text-zinc-400 hover:border-white/30 hover:text-white'}`}
                      >
                        <span className="block text-[9px] font-mono uppercase tracking-widest opacity-70 mb-1">{opt.lever}</span>
                        <span className="block">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {angleOptions.hooks.length > 0 && (
              <div>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">// VIDEO_HOOKS</p>
                <div className="flex flex-wrap gap-2">
                  {angleOptions.hooks.map((opt, i) => {
                    if (opt.kind !== 'hook') return null;
                    const isSelected = directorAngleBrief === opt.brief;
                    return (
                      <button
                        key={`v-${i}`}
                        onClick={() => handlePickAngle(opt.brief)}
                        className={`text-left text-xs rounded-xl px-3 py-2 max-w-md transition-all border ${isSelected ? 'bg-[#FFCC00]/10 border-[#FFCC00] text-[#FFCC00]' : 'bg-zinc-950 border-white/10 text-zinc-400 hover:border-white/30 hover:text-white'}`}
                      >
                        <span className="block text-[9px] font-mono uppercase tracking-widest opacity-70 mb-1">{opt.style}</span>
                        <span className="block italic">"{opt.spokenLine}"</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {angleOptions.ads.length > 0 && (
              <div>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">// AD_CONCEPTS</p>
                <div className="flex flex-wrap gap-2">
                  {angleOptions.ads.map((opt, i) => {
                    if (opt.kind !== 'ad') return null;
                    const isSelected = directorAngleBrief === opt.brief;
                    return (
                      <button
                        key={`a-${i}`}
                        onClick={() => handlePickAngle(opt.brief)}
                        className={`text-left text-xs rounded-xl px-3 py-2 max-w-md transition-all border ${isSelected ? 'bg-[#FFCC00]/10 border-[#FFCC00] text-[#FFCC00]' : 'bg-zinc-950 border-white/10 text-zinc-400 hover:border-white/30 hover:text-white'}`}
                      >
                        <span className="block text-[9px] font-mono uppercase tracking-widest opacity-70 mb-1">{opt.format} · {opt.angle}</span>
                        <span className="block italic">"{opt.openingLine}"</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </TitledCard>
      )}

      {step3Mode === 'pick' && (
        <div className="mb-8 flex flex-col items-center justify-center space-y-6">
           <div className="w-full max-w-xs">
               <FieldLabel className="mb-2 text-center">Target Language</FieldLabel>
               <SegButton
                 value={(localLanguage ?? '') as 'English' | 'Taglish'}
                 onChange={(v) => setLocalLanguage(v)}
                 options={[
                   { value: 'English', label: 'English' },
                   { value: 'Taglish', label: 'Taglish' },
                 ]}
               />
           </div>

           {!loading && !generatedScript && (
              <GoldButton onClick={handleGenerateScript} disabled={!localLanguage} className="w-full md:w-auto px-8 py-3">
                  INITIALIZE SCRIPT GENERATION
              </GoldButton>
           )}
        </div>
      )}

      {step3Mode === 'review' && generatedScript && !loading && (
        <div className="space-y-6 animate-fade-in">
          {angleOptions && (
            <button
              onClick={() => {
                setStep3Mode('pick');
                setGeneratedScript(null);
                setScript(null);
                setSelectedHook(null);
              }}
              className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:text-[#FFCC00] transition-colors flex items-center gap-1.5"
            >
              <ChevronLeft className="w-3 h-3" /> TRY DIFFERENT ANGLE
            </button>
          )}
          {/* AI STRATEGY ADVICE BUBBLE */}
          {strategicAudit && (
            <div className="p-8 bg-zinc-900 border border-white/10 backdrop-blur-md relative overflow-hidden group rounded-2xl">
                <div className="absolute top-0 left-0 bg-[#FFCC00] text-black text-[10px] font-black px-4 py-1.5 font-mono tracking-widest uppercase z-10 shadow-lg">
                    [ DIRECTOR_CRITIQUE ]
                </div>
                <p className="text-sm font-mono text-zinc-300 leading-relaxed mt-6 italic relative z-10">
                    "{strategicAudit}"
                </p>
            </div>
          )}

          <div id="hook-select" className="flex justify-between items-center border-b border-white/10 pb-2">
            <h3 className="text-[#FFCC00] font-bold font-mono text-[10px] tracking-widest uppercase">// SELECT & EDIT HOOK</h3>
            <div className="flex gap-2">
                {selectedHook && (
                    <button onClick={handleDownloadScript} className="py-1.5 px-3 text-xs flex items-center gap-2 bg-zinc-900 border border-white/10 text-zinc-400 rounded-xl hover:border-[#FFCC00] hover:text-[#FFCC00] transition-colors font-bold tracking-widest">
                        <Copy className="w-4 h-4"/> EXPORT .TXT
                    </button>
                )}
                {businessInfo.scriptType !== 'Custom' && (
                    <button onClick={handleGenerateScript} className="py-1.5 px-3 text-xs flex items-center gap-2 bg-zinc-900 border border-white/10 text-zinc-400 rounded-xl hover:border-[#FFCC00] hover:text-[#FFCC00] transition-colors font-bold tracking-widest">
                         <RefreshCw className="w-4 h-4"/> REGENERATE
                    </button>
                )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ScriptDisplay
                title="Hook Variation 1"
                lines={generatedScript.hook1}
                onChange={(val) => handleScriptUpdate('hook1', val)}
                onClick={() => handleSelectHook(1)}
                isSelected={selectedHook === 1}
            />
            <ScriptDisplay
                title="Hook Variation 2"
                lines={generatedScript.hook2}
                onChange={(val) => handleScriptUpdate('hook2', val)}
                onClick={() => handleSelectHook(2)}
                isSelected={selectedHook === 2}
            />
          </div>

          <TitledCard title="Script Body (Shared)">
            <TextArea
                value={generatedScript.body.join('\n')}
                onChange={(e) => handleScriptUpdate('body', e.target.value)}
                placeholder="Edit script body here..."
                rows={6}
                className="min-h-[150px] resize-y font-mono leading-relaxed"
            />
          </TitledCard>
        </div>
      )}

      {triedNext && step3Mode === 'review' && !selectedHook && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs font-mono text-red-200">
            <span className="font-bold uppercase tracking-widest text-red-400">Incomplete — </span>
            select a hook variation to continue
          </p>
        </div>
      )}

      <StepFooter
        onBack={onBack}
        onNext={guardedNext}
        nextLabel="CONFIRM & PROCEED"
        renderNext={step3Mode !== 'review' ? <span /> : undefined}
      />
    </StepShell>
  );
};

export default Step3AdScript;
