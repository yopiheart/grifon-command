
import React, { useState, useRef, useMemo } from 'react';
import { UplinkData, BusinessInfo, ClientDetails } from '../types';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import { UploadCloud, Image as ImageIcon, Camera, ChevronLeft } from 'lucide-react';
import { compressImageForUpload } from '../utils/imageCompression';
import { AD_STYLE_PRESETS } from '../utils/adTheme';

interface IntelligenceUplinkProps {
  onComplete: (data: UplinkData) => void;
  onBack: () => void;
  globalBusinessInfo?: BusinessInfo;
  globalClientDetails?: ClientDetails;
  mode: 'ADS' | 'ORGANIC';
}

const IntelligenceUplink: React.FC<IntelligenceUplinkProps> = ({ onComplete, onBack, globalBusinessInfo, globalClientDetails, mode }) => {
  const [formData, setFormData] = useState<UplinkData>({
    brandIdentityName: globalClientDetails?.brandName || '',
    originalPrice: '',
    offerPrice: globalClientDetails?.offer || '',
    inventoryList: globalBusinessInfo?.product || '',
    targetDemographic: globalBusinessInfo?.audience || '',
    ageRange: '',
    ethnicityProfile: '',
    primaryBenefit: globalBusinessInfo?.benefit || '',
    problemSolved: '',
    marketPainPoint: globalBusinessInfo?.painPoint || '',
    uvp: globalBusinessInfo?.separator || '',
    keyFeatures: globalBusinessInfo?.features || '',
    hexCodes: globalBusinessInfo?.brandColors || '',
    aspectRatio: mode === 'ADS' ? '4:5' : '1:1',
    resolution: '1K',
    language: 'ENGLISH',
    productAssets: globalBusinessInfo?.productImageUrls || [],
    logoAsset: globalBusinessInfo?.logoImageUrl || undefined,
    family: 'product',
    brandVibe: 'Bold',
  });

  const logoRef = useRef<HTMLInputElement>(null);
  const productRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);


  // Data Integrity Calculation
  const integrity = useMemo(() => {
    const requiredFields = [
      formData.brandIdentityName,
      formData.targetDemographic,
      formData.primaryBenefit,
      formData.marketPainPoint
    ];
    const filledCount = requiredFields.filter(f => f.trim() !== '').length;
    return Math.round((filledCount / requiredFields.length) * 100);
  }, [formData.brandIdentityName, formData.targetDemographic, formData.primaryBenefit, formData.marketPainPoint]);

  const isFormValid = integrity === 100;

  const handleSync = () => {
    if (globalBusinessInfo || globalClientDetails) {
      setFormData(prev => ({
        ...prev,
        brandIdentityName: globalClientDetails?.brandName || prev.brandIdentityName,
        offerPrice: globalClientDetails?.offer || prev.offerPrice,
        inventoryList: globalBusinessInfo?.product || prev.inventoryList,
        targetDemographic: globalBusinessInfo?.audience || prev.targetDemographic,
        primaryBenefit: globalBusinessInfo?.benefit || prev.primaryBenefit,
        problemSolved: prev.problemSolved,
        marketPainPoint: globalBusinessInfo?.painPoint || prev.marketPainPoint,
        uvp: globalBusinessInfo?.separator || prev.uvp,
        keyFeatures: globalBusinessInfo?.features || prev.keyFeatures,
        hexCodes: globalBusinessInfo?.brandColors || prev.hexCodes,
        productAssets: globalBusinessInfo?.productImageUrls || prev.productAssets,
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'product' | 'avatar') => {
    const files = Array.from(e.target.files || []) as File[];
    for (const file of files) {
      const { dataUrl } = await compressImageForUpload(file);
      if (type === 'logo') setFormData(prev => ({ ...prev, logoAsset: dataUrl }));
      else if (type === 'avatar') setFormData(prev => ({ ...prev, avatarAsset: dataUrl }));
      else if (type === 'product') setFormData(prev => ({ ...prev, productAssets: [...prev.productAssets, dataUrl].slice(0, 5) }));
    }
  };

  const renderInput = (id: string, label: string, value: string, placeholder: string, isTextarea = false, rows = 3) => (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
        // {label.replace(/\s+/g, '_').toUpperCase()}
      </label>
      {isTextarea ? (
        <textarea
          id={id}
          name={id}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          rows={rows}
          className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] min-h-[100px] font-sans text-sm"
        />
      ) : (
        <input
          id={id}
          name={id}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] font-sans text-sm"
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-6xl mx-auto pb-20">
        {/* HUD HEADER */}
        <header className="flex flex-col items-start gap-4 mb-8 w-full border-b border-white/10 pb-6 relative">
          <div className="flex items-center justify-between w-full">
            <button onClick={onBack} className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-on-surface-sublabel hover:text-white uppercase tracking-widest transition-colors">
              <ChevronLeft className="w-4 h-4" /> <span className="hidden md:inline">COMMAND CENTER</span><span className="md:hidden">BACK</span>
            </button>
            <button 
              onClick={handleSync}
              className="flex items-center gap-2 text-[10px] md:text-xs text-[#FFCC00] border border-[#FFCC00]/20 px-3 py-2 md:px-4 md:py-2 rounded-full hover:bg-[#FFCC00]/10 transition-colors uppercase font-mono tracking-widest"
            >
              <span className="hidden md:inline">SYNC GLOBAL CONTEXT</span><span className="md:hidden">SYNC</span>
            </button>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight break-words whitespace-normal leading-tight">
              {mode === 'ADS' ? 'AD GENERATOR UPLINK' : 'ORGANIC PRO UPLINK'}
            </h1>
            <p className="text-[10px] text-on-surface-sublabel font-mono tracking-widest uppercase mt-2">
              // UPLOAD STRATEGIC DATA FOR TARGETING ALGORITHMS
            </p>
          </div>
        </header>

        <GlassPanel className="mb-12">
          {/* INPUT STACK */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6 p-6">
            <div className="space-y-6">
              {renderInput('brandIdentityName', 'Brand Identity Name', formData.brandIdentityName, 'e.g., EcoClean Solutions')}
              <div className="grid grid-cols-2 gap-4">
                {renderInput('originalPrice', 'Original Price', formData.originalPrice, 'e.g., ₱2,500')}
                {renderInput('offerPrice', 'Offer Price', formData.offerPrice, 'e.g., ₱1,999')}
              </div>
              {renderInput('inventoryList', 'Inventory List / Products', formData.inventoryList, 'e.g., Dish soap, All-purpose spray...', true, 3)}
              <div className="grid grid-cols-2 gap-4">
                {renderInput('targetDemographic', 'Target Demographic', formData.targetDemographic, 'e.g., Busy urban moms')}
                {renderInput('ageRange', 'Target Age Range', formData.ageRange, 'e.g., 28-45')}
              </div>
              {renderInput('ethnicityProfile', 'Ethnicity Profile', formData.ethnicityProfile, 'e.g., Filipino / Southeast Asian')}
            </div>

            <div className="space-y-6">
              {renderInput('primaryBenefit', 'Primary Benefit', formData.primaryBenefit, 'e.g., Save 4 hours of cleaning')}
              <div className="grid grid-cols-2 gap-4">
                {renderInput('problemSolved', 'Problem Solved', formData.problemSolved, 'e.g., Chemical residues')}
                {renderInput('marketPainPoint', 'Market Pain Point', formData.marketPainPoint, 'e.g., Back pain')}
              </div>
              {renderInput('uvp', 'Unique Value Proposition', formData.uvp, 'e.g., Only cleaner using recycled ocean plastics', true, 2)}
              {renderInput('keyFeatures', 'Key Features', formData.keyFeatures, 'e.g., Non-toxic, Pet-safe...', true, 3)}
              {renderInput('hexCodes', 'Visual Hex Codes', formData.hexCodes, 'e.g., #2D5A27, #FFFFFF')}
            </div>
          </div>
        </GlassPanel>

        {/* HOLOGRAPHIC ASSET DROP ZONES */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-12">
          {[
            { id: 'logo', label: 'DROP LOGO', ref: logoRef, data: formData.logoAsset, multiple: false, icon: ImageIcon },
            { id: 'product', label: 'PRODUCT IMG', ref: productRef, data: formData.productAssets, multiple: true, icon: UploadCloud },
            { id: 'avatar', label: 'AVATAR DATA', ref: avatarRef, data: formData.avatarAsset, multiple: false, icon: Camera }
          ].map((zone) => {
            const Icon = zone.icon;
            return (
              <GlassPanel 
                key={zone.id}
                onClick={() => zone.ref.current?.click()}
                className="aspect-square relative group cursor-pointer hover:border-[#FFCC00] transition-all flex flex-col items-center justify-center p-4 text-center overflow-hidden bg-zinc-950/50 border-2 border-dashed border-white/10 rounded-xl hover:bg-zinc-800/80"
              >
                <input type="file" ref={zone.ref} hidden multiple={zone.multiple} onChange={(e) => handleFileUpload(e, zone.id as any)} accept="image/*" />
                
                {zone.data && (Array.isArray(zone.data) ? zone.data.length > 0 : !!zone.data) ? (
                  <div className="w-full h-full relative z-10">
                    <img src={Array.isArray(zone.data) ? zone.data[0] : zone.data} className="w-full h-full object-contain opacity-70 rounded-xl" />
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 p-1">
                      <span className="text-[9px] font-bold font-mono uppercase tracking-tighter bg-zinc-900 px-3 py-1.5 rounded-lg border border-white/10 text-[#FFCC00]">
                        {Array.isArray(zone.data) ? `[ ${zone.data.length}_ASSETS_LOADED ]` : '[ SYNC_COMPLETE ]'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <Icon className="w-8 h-8 md:w-12 md:h-12 text-on-surface-sublabel group-hover:text-[#FFCC00] transition-colors" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold font-mono text-zinc-400 group-hover:text-[#FFCC00] uppercase tracking-widest">{zone.label}</p>
                      <p className="text-[8px] font-mono text-on-surface-sublabel uppercase tracking-tighter">[ INJECT_SOURCE_DATA ]</p>
                    </div>
                  </div>
                )}
              </GlassPanel>
            );
          })}
        </div>

        {/* FOOTER CONFIG BAR */}
        <GlassPanel className="p-6 md:p-8 flex flex-col gap-8">
          <div className="flex flex-wrap gap-x-12 gap-y-6 items-start">
            <div className="space-y-2">
              <p className="text-[10px] font-mono text-on-surface-sublabel uppercase tracking-widest">CREATIVE_FAMILY</p>
              <div className="flex gap-2 bg-zinc-950 p-1 rounded-xl border border-white/10">
                {[{ id: 'product', label: 'PRODUCT' }, { id: 'saas-offer', label: 'SAAS-UPSELL' }, { id: 'callout', label: 'NICHE CALLOUT' }].map(fam => (
                  <button
                    key={fam.id}
                    onClick={() => setFormData({...formData, family: fam.id as any})}
                    className={`text-[10px] px-4 py-2 rounded-lg font-bold font-mono transition-all ${(formData.family ?? 'product') === fam.id ? 'bg-[#FFCC00] text-black' : 'text-on-surface-sublabel hover:text-white'}`}
                  >
                    {fam.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Style Preset gallery — one-click swipe-file looks for users who
                don't know their brand color/vibe. A preset overrides hex+vibe;
                "MY BRAND COLORS" falls back to the hex field + the vibe selector.
                Only the text-composited families consume it. */}
            {(formData.family === 'saas-offer' || formData.family === 'callout') && (
              <div className="space-y-2 w-full">
                <p className="text-[10px] font-mono text-on-surface-sublabel uppercase tracking-widest">STYLE_PRESET</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFormData({ ...formData, stylePreset: undefined })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold font-mono transition-all ${!formData.stylePreset ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]' : 'border-white/10 text-zinc-400 hover:text-white'}`}
                  >
                    <span className="w-4 h-4 rounded-full border border-white/30 bg-gradient-to-br from-zinc-200 to-zinc-600" />
                    MY BRAND COLORS
                  </button>
                  {AD_STYLE_PRESETS.map(p => (
                    <button
                      key={p.id}
                      title={p.description}
                      onClick={() => setFormData({ ...formData, stylePreset: p.id })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold font-mono transition-all ${formData.stylePreset === p.id ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]' : 'border-white/10 text-zinc-400 hover:text-white'}`}
                    >
                      <span className="w-4 h-4 rounded-full border border-white/20" style={{ background: p.swatch.bg }}>
                        <span className="block w-1.5 h-1.5 rounded-full m-[3px]" style={{ background: p.swatch.accent }} />
                      </span>
                      {p.label.toUpperCase()}
                    </button>
                  ))}
                </div>
                {/* Vibe refinement only matters when using your own brand colors. */}
                {!formData.stylePreset && (
                  <div className="flex gap-2 bg-zinc-950 p-1 rounded-xl border border-white/10 w-fit mt-2">
                    {(['Bold', 'Premium', 'Playful', 'Clean'] as const).map(vibe => (
                      <button
                        key={vibe}
                        onClick={() => setFormData({ ...formData, brandVibe: vibe })}
                        className={`text-[10px] px-4 py-2 rounded-lg font-bold font-mono transition-all ${(formData.brandVibe ?? 'Bold') === vibe ? 'bg-[#FFCC00] text-black' : 'text-on-surface-sublabel hover:text-white'}`}
                      >
                        {vibe.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <p className="text-[10px] font-mono text-on-surface-sublabel uppercase tracking-widest">ASPECT_RATIO</p>
              <div className="flex gap-2 bg-zinc-950 p-1 rounded-xl border border-white/10">
                {['9:16', '4:5', '1:1', '16:9'].map(r => (
                  <button 
                    key={r} 
                    onClick={() => setFormData({...formData, aspectRatio: r as any})}
                    className={`text-[10px] px-4 py-2 rounded-lg font-bold font-mono transition-all ${formData.aspectRatio === r ? 'bg-[#FFCC00] text-black' : 'text-on-surface-sublabel hover:text-white'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-mono text-on-surface-sublabel uppercase tracking-widest">RESOLUTION</p>
              <div className="flex gap-2 bg-zinc-950 p-1 rounded-xl border border-white/10">
                {['1K', '2K'].map(res => (
                  <button 
                    key={res} 
                    onClick={() => setFormData({...formData, resolution: res as any})}
                    className={`text-[10px] px-6 py-2 rounded-lg font-bold font-mono transition-all ${formData.resolution === res ? 'bg-[#FFCC00] text-black' : 'text-on-surface-sublabel hover:text-white'}`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-mono text-on-surface-sublabel uppercase tracking-widest">LOCALIZATION</p>
              <div className="flex gap-2 bg-zinc-950 p-1 rounded-xl border border-white/10">
                {['ENGLISH', 'TAGLISH'].map(lang => (
                  <button 
                    key={lang} 
                    onClick={() => setFormData({...formData, language: lang as any})}
                    className={`text-[10px] px-6 py-2 rounded-lg font-bold font-mono transition-all ${formData.language === lang ? 'bg-[#FFCC00] text-black' : 'text-on-surface-sublabel hover:text-white'}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ARMED COMPLETION METER & FINAL PAYOFF */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-t border-white/10 pt-6">
            <div className="flex items-center gap-4">
               <button 
                onClick={() => setFormData({...formData, brandIdentityName: '', targetDemographic: '', primaryBenefit: '', marketPainPoint: ''})}
                className="text-[10px] font-mono text-on-surface-sublabel uppercase hover:text-red-500 transition-colors px-3 py-1 border border-transparent hover:border-red-900/40 rounded-lg"
               >
                 [ RESET_UPLINK ]
               </button>
               <div className="h-6 w-px bg-white/10 hidden md:block"></div>
               <p className="text-[10px] font-mono text-on-surface-sublabel uppercase tracking-widest">
                  // DATA_INTEGRITY: <span className={`${integrity === 100 ? 'text-[#FFCC00]' : 'text-[#FFCC00]'}`}>[ {integrity}% ]</span>
               </p>
            </div>

            <GoldButton 
              onClick={() => onComplete(formData)}
              disabled={!isFormValid}
              className={`w-full md:w-auto px-12 py-4 text-xs tracking-widest ${!isFormValid ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
            >
              {integrity === 100 ? 'ARMED: INITIATE SEQUENCE' : 'WAITING FOR DATA PARITY...'}
            </GoldButton>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

export default IntelligenceUplink;

