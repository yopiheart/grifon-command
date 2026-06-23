
import React, { useEffect, useState } from 'react';
import { BusinessInfo } from '../types';
import { describeBusinessAsset } from '../services/geminiService';
import { compressImageForUpload } from '../utils/imageCompression';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import { Building2, Check, Package, ShoppingBag, Sparkles, Store, UploadCloud, X, ZoomIn } from 'lucide-react';
import ImageModal from './ui/ImageModal';
import {
  ARCHETYPE_META, ARCHETYPE_ORDER, BAD_SAMPLE, ARCHETYPE_UPLOAD_SLOTS, inferServiceArchetype,
  RE_ARCHETYPE_META, RE_ARCHETYPE_ORDER, RE_UPLOAD_SLOTS, inferRealEstateArchetype,
  buildServiceDescription, SampleTile,
  type ServiceArchetype, type RealEstateArchetype, type ServiceSlot,
} from "./guidedPhotoSlots";


interface Step2Props {
  data: BusinessInfo;
  setData: (data: BusinessInfo) => void;
  onNext: () => void;
  onBack: () => void;
  aspectRatio: '9:16' | '16:9' | null;
  setAspectRatio: (ratio: '9:16' | '16:9') => void;
}

const Step2BusinessInfo: React.FC<Step2Props> = ({ data, setData, onNext, onBack, aspectRatio, setAspectRatio }) => {
  const [formData, setFormData] = useState(data);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleScriptTypeSelect = (type: 'MrBeast' | 'Testimonial' | 'Temu' | 'Custom' | 'Services' | 'RealEstate') => {
    setFormData(prev => ({ ...prev, scriptType: type }));
  };

  // Product / Service / Real-Estate gate. Product-formulated styles (MrBeast/Testimonial/Temu), the
  // Services style, and the RealEstate style are mutually exclusive in the picker; Custom shows in
  // all. Derived from businessType, falling back to the current scriptType for resumed drafts.
  const businessType: 'product' | 'service' | 'realestate' =
    formData.businessType
      ?? (formData.scriptType === 'Services' ? 'service'
        : formData.scriptType === 'RealEstate' ? 'realestate'
        : 'product');

  const isServices = businessType === 'service' && formData.scriptType === 'Services';
  const isRealEstate = businessType === 'realestate' && formData.scriptType === 'RealEstate';
  // Both Services and RealEstate use the guided real-photo upload + archetype picker (a property is
  // a real place → same servicePhotos/venue pipeline). isGuided toggles the shared UI fork.
  const isGuided = isServices || isRealEstate;
  // What the ad leads with. Falls back to the inferred default so the UI + sample strip have a
  // value even on the first render before the auto-select effect writes it into state.
  const effectiveArchetype: ServiceArchetype = formData.serviceArchetype
    ?? inferServiceArchetype(`${formData.product || ''} ${formData.productImageDescription || ''} ${formData.features || ''}`);

  const selectArchetype = (a: ServiceArchetype) =>
    setFormData(prev => ({ ...prev, serviceArchetype: a }));

  // RealEstate archetype — mirrors the Services pair above.
  const effectiveReArchetype: RealEstateArchetype = formData.realEstateArchetype
    ?? inferRealEstateArchetype(`${formData.product || ''} ${formData.productImageDescription || ''} ${formData.features || ''}`);
  const selectReArchetype = (a: RealEstateArchetype) =>
    setFormData(prev => ({ ...prev, realEstateArchetype: a }));

  // Auto-pre-select the archetype when Services is active and none chosen yet — never clobber a
  // prior pick (re-entry / resumed draft / manual override). Mirrors the businessType smart-default.
  useEffect(() => {
    if (formData.scriptType !== 'Services' || formData.serviceArchetype) return;
    const inferred = inferServiceArchetype(
      `${formData.product || ''} ${formData.productImageDescription || ''} ${formData.features || ''}`,
    );
    setFormData(prev =>
      prev.scriptType === 'Services' && !prev.serviceArchetype ? { ...prev, serviceArchetype: inferred } : prev,
    );
  }, [formData.scriptType, formData.serviceArchetype, formData.product, formData.productImageDescription, formData.features]);

  // RealEstate counterpart of the Services auto-select effect above.
  useEffect(() => {
    if (formData.scriptType !== 'RealEstate' || formData.realEstateArchetype) return;
    const inferred = inferRealEstateArchetype(
      `${formData.product || ''} ${formData.productImageDescription || ''} ${formData.features || ''}`,
    );
    setFormData(prev =>
      prev.scriptType === 'RealEstate' && !prev.realEstateArchetype ? { ...prev, realEstateArchetype: inferred } : prev,
    );
  }, [formData.scriptType, formData.realEstateArchetype, formData.product, formData.productImageDescription, formData.features]);

  const selectBusinessType = (bt: 'product' | 'service' | 'realestate') => {
    setFormData(prev => {
      const productOk: string[] = ['MrBeast', 'Testimonial', 'Custom'];
      const serviceOk: string[] = ['Services', 'Custom'];
      const realEstateOk: string[] = ['RealEstate', 'Custom'];
      let scriptType = prev.scriptType;
      // Keep a valid selection for the chosen group (preserve Custom across all).
      if (bt === 'service' && !serviceOk.includes(scriptType ?? '')) scriptType = 'Services';
      if (bt === 'realestate' && !realEstateOk.includes(scriptType ?? '')) scriptType = 'RealEstate';
      if (bt === 'product' && !productOk.includes(scriptType ?? '')) scriptType = 'MrBeast';
      return { ...prev, businessType: bt, scriptType };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'logo' | 'script') => {
    if (!e.target.files || e.target.files.length === 0) return;

    if (type === 'logo') {
        const file = e.target.files[0];
        const { dataUrl } = await compressImageForUpload(file);
        setFormData(prev => ({ ...prev, logoImageUrl: dataUrl }));
        return;
    }

    if (type === 'script') {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setFormData(prev => ({ ...prev, customScriptFile: content.split('\n').filter(l => l.trim()) }));
        };
        reader.readAsText(file);
        return;
    }

    setIsAnalyzing(true);
    setUploadError(null);
    const files = Array.from(e.target.files) as File[];

    try {
        const compressed = await Promise.all(files.map(f => compressImageForUpload(f)));
        const newImages = compressed.map(c => c.dataUrl);

        const currentImages = formData.productImageUrls || [];
        const updatedImages = [...currentImages, ...newImages].slice(0, 5);

        // Describe every new upload in parallel + append to existing description with [Photo N] labels
        // so the storyboard / video-prompt pipeline (which reads productImageDescription) becomes
        // multi-photo-aware instead of only seeing photo[0].
        const newDescriptions = await Promise.all(
            compressed.map(c => describeBusinessAsset(c.base64, c.mimeType))
        );
        const startIdx = currentImages.length;
        const newBlock = newDescriptions
            .map((d, i) => `[Photo ${startIdx + i + 1}] ${d}`)
            .join('\n\n');
        const combinedDescription = formData.productImageDescription
            ? `${formData.productImageDescription}\n\n${newBlock}`
            : newBlock;
        setFormData(prev => ({
            ...prev,
            productImageUrls: updatedImages,
            productImageDescription: combinedDescription,
        }));

    } catch (err) {
        console.error(err);
        setUploadError("Failed to upload/analyze images.");
    } finally {
        setIsAnalyzing(false);
        if (e.target) e.target.value = '';
    }
  };

  const removeImage = (indexToRemove: number) => {
      const currentImages = formData.productImageUrls || [];
      const updatedImages = currentImages.filter((_, index) => index !== indexToRemove);
      setFormData(prev => ({ ...prev, productImageUrls: updatedImages }));
  };

  // Phase 2 guided-slot upload: stores {url, slot} in servicePhotos (the slot IS the tag) and keeps
  // productImageUrls in sync (hero-first by the archetype's slot order) so the existing pipeline +
  // hero/anchor logic stay fed until the per-scene router (Slice 5) lands.
  const handleSlotUpload = async (e: React.ChangeEvent<HTMLInputElement>, slot: ServiceSlot) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsAnalyzing(true);
    setUploadError(null);
    try {
      const file = e.target.files[0] as File;
      const c = await compressImageForUpload(file);
      const desc = await describeBusinessAsset(c.base64, c.mimeType);
      setFormData(prev => {
        // Read the archetype from prev (not the outer closure) so an override in the same tick sorts right.
        // RealEstate and Services share this handler — pick the matching slot-order for hero-first sync.
        const blob = `${prev.product || ''} ${prev.productImageDescription || ''} ${prev.features || ''}`;
        const isRE = (prev.businessType ?? (prev.scriptType === 'RealEstate' ? 'realestate' : '')) === 'realestate'
          || prev.scriptType === 'RealEstate';
        const order = isRE
          ? RE_UPLOAD_SLOTS[prev.realEstateArchetype ?? inferRealEstateArchetype(blob)].map(s => s.slot)
          : ARCHETYPE_UPLOAD_SLOTS[prev.serviceArchetype ?? inferServiceArchetype(blob)].map(s => s.slot);
        const next = [...(prev.servicePhotos || []).filter(p => p.slot !== slot), { url: c.dataUrl, slot, description: desc }]
          .sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot));
        return {
          ...prev,
          servicePhotos: next,
          productImageUrls: next.map(p => p.url).slice(0, 5),
          productImageDescription: buildServiceDescription(next),
        };
      });
    } catch (err) {
      console.error(err);
      setUploadError('Failed to upload/analyze image.');
    } finally {
      setIsAnalyzing(false);
      if (e.target) e.target.value = '';
    }
  };

  const removeSlot = (slot: ServiceSlot) => {
    setFormData(prev => {
      const next = (prev.servicePhotos || []).filter(p => p.slot !== slot);
      return {
        ...prev,
        servicePhotos: next,
        productImageUrls: next.map(p => p.url).slice(0, 5),
        productImageDescription: buildServiceDescription(next),
      };
    });
  };

  const handleNext = () => {
    setData(formData);
    onNext();
  };
  
  const requiredFields: (keyof BusinessInfo)[] = ['product', 'audience', 'benefit', 'painPoint', 'separator', 'features'];
  const hasImages = formData.productImageUrls && formData.productImageUrls.length > 0;
  
  const isFormValid = !!aspectRatio && requiredFields.every(field => {
      const val = formData[field];
      return typeof val === 'string' && val.trim() !== '';
  });

  // Shared inputs for the "guided" upload + archetype UI (Services OR RealEstate). Same JSX, just
  // archetype-specific data — for Services these resolve to the exact prior values (rendering identical).
  const guidedSamples = isRealEstate ? RE_ARCHETYPE_META[effectiveReArchetype].samples : ARCHETYPE_META[effectiveArchetype].samples;
  const guidedLead = isRealEstate ? RE_ARCHETYPE_META[effectiveReArchetype].lead : ARCHETYPE_META[effectiveArchetype].lead;
  const guidedSlots = isRealEstate ? RE_UPLOAD_SLOTS[effectiveReArchetype] : ARCHETYPE_UPLOAD_SLOTS[effectiveArchetype];
  const guidedArchetypes: { key: string; label: string; sub: string; active: boolean; onSelect: () => void }[] = isRealEstate
    ? RE_ARCHETYPE_ORDER.map(a => ({ key: a, label: RE_ARCHETYPE_META[a].label, sub: RE_ARCHETYPE_META[a].sub, active: effectiveReArchetype === a, onSelect: () => selectReArchetype(a) }))
    : ARCHETYPE_ORDER.map(a => ({ key: a, label: ARCHETYPE_META[a].label, sub: ARCHETYPE_META[a].sub, active: effectiveArchetype === a, onSelect: () => selectArchetype(a) }));

  return (
    <>
    <GlassPanel>
      <div className="mb-8 border-b border-white/10 pb-6">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight">
          Step 2: Seed AI With Business Information
        </h2>
        <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
          // Provide detailed information to help the AI understand the product, its value, and the target audience.
        </p>
      </div>

      <div className="mb-8 p-6 border border-white/10 bg-zinc-950/50 rounded-xl">
        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4 font-mono">// Select Project Aspect Ratio</h3>
        <div className="flex justify-center gap-4">
            <button 
              onClick={() => setAspectRatio('9:16')} 
              className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${aspectRatio === '9:16' ? 'bg-[#FFCC00] text-black' : 'bg-zinc-900 text-zinc-400 border border-white/10 hover:border-white/20 hover:text-white'}`}
            >
              9:16 (Vertical)
            </button>
            <button 
              onClick={() => setAspectRatio('16:9')} 
              className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${aspectRatio === '16:9' ? 'bg-[#FFCC00] text-black' : 'bg-zinc-900 text-zinc-400 border border-white/10 hover:border-white/20 hover:text-white'}`}
            >
              16:9 (Landscape)
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { id: 'product', label: 'Service/Product', placeholder: 'e.g., Eco-friendly home cleaning service', helper: '' },
          { id: 'audience', label: 'Target Audience', placeholder: 'e.g., Busy young professionals', helper: '' },
          { id: 'benefit', label: 'Dream Result', placeholder: 'e.g., Wakes up energized, naka-2 hours back every morning, mas chill ang pasok sa work', helper: '' },
          { id: 'painPoint', label: '3 AM Worry', placeholder: 'e.g., 3 AM, hindi makatulog kasi tuition deadline na bukas — wala pang pera', helper: '' }
        ].map(field => (
          <div key={field.id} className="space-y-2">
            <label htmlFor={field.id} className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
              // {field.label}
            </label>
            <input
              id={field.id}
              name={field.id}
              value={formData[field.id as keyof BusinessInfo] as string}
              onChange={handleChange}
              placeholder={field.placeholder}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all text-sm"
            />
            {field.helper && (
              <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                // {field.helper}
              </p>
            )}
          </div>
        ))}
        
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="separator" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
            // Main Differentiator
          </label>
          <textarea
            id="separator"
            name="separator"
            value={formData.separator}
            onChange={handleChange}
            placeholder="e.g., We use 100% non-toxic, plant-based products"
            rows={3}
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all resize-none text-sm"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="features" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
            // Main Features
          </label>
          <textarea
            id="features"
            name="features"
            value={formData.features}
            onChange={handleChange}
            placeholder="e.g., Easy online booking, certified cleaners, satisfaction guarantee"
            rows={4}
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all resize-none text-sm"
          />
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="brandColors" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
            // Brand Color Palette (Hex) - Optional
          </label>
          <input
            id="brandColors"
            name="brandColors"
            value={formData.brandColors || ''}
            onChange={handleChange}
            placeholder="#FFFFFF, #000000, #FF0000"
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all text-sm"
          />
        </div>

        <div className="md:col-span-2 border-t border-white/10 my-4"></div>

        <div className="md:col-span-2 space-y-4">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                // Business Visuals (Upload 3-5 Photos)
            </label>

            {hasImages && !isGuided && (
                <>
                    <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-1">
                        // Photo 1 (HERO) anchors all scene visuals — remove + re-upload to reorder
                    </p>
                    <div className="grid grid-cols-5 gap-2 mb-2">
                        {formData.productImageUrls!.map((url, idx) => (
                            <div key={idx} className={`relative group aspect-square border bg-zinc-950 rounded-xl overflow-hidden ${idx === 0 ? 'border-[#FFCC00] shadow-[0_0_8px_rgba(255,204,0,0.25)]' : 'border-white/10'}`}>
                                <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                {idx === 0 ? (
                                    <div className="absolute top-1 left-1 bg-[#FFCC00] text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full font-mono tracking-tighter uppercase flex items-center gap-0.5">
                                        <Sparkles className="w-2.5 h-2.5" /> Hero
                                    </div>
                                ) : (
                                    <div className="absolute top-1 left-1 bg-zinc-700 text-zinc-300 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center font-mono">
                                        {idx + 1}
                                    </div>
                                )}
                                <button
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-1 right-1 bg-red-600/90 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Upload examples. For Services, the chosen archetype drives WHICH samples to teach
                (✓ humble/PH per archetype + a ✗ blurry contrast). For products, the generic icon
                strip stays. Curated PNGs live in public/examples/ with an icon fallback per tile. */}
            {isGuided ? (
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                  // What to upload — clear &amp; bright wins ↓
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {guidedSamples.map((ex, idx) => (
                    <SampleTile key={`good-${idx}`} src={ex.src} caption={ex.caption} good onZoom={setViewImage} />
                  ))}
                  <SampleTile src={BAD_SAMPLE.src} caption={BAD_SAMPLE.caption} good={false} onZoom={setViewImage} />
                </div>
                <p className="text-[9px] text-zinc-500 font-mono tracking-tighter">
                  Kahit simple — basta malinaw at maliwanag.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                  // Good upload examples ↓
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { Icon: Package, caption: 'Product in hand', imageUrl: '' },
                    { Icon: Store, caption: 'Storefront + logo', imageUrl: '' },
                    { Icon: Sparkles, caption: 'Service in action', imageUrl: '' },
                  ].map((ex, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <div className="aspect-square w-full bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden">
                        {ex.imageUrl ? (
                          <img src={ex.imageUrl} alt={ex.caption} className="w-full h-full object-cover" />
                        ) : (
                          <ex.Icon className="w-8 h-8 text-[#FFCC00]/60" />
                        )}
                      </div>
                      <p className="text-[8px] text-zinc-500 font-mono uppercase tracking-tighter mt-1.5 text-center">
                        {ex.caption}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isGuided ? (
            <label className="block p-6 border-2 border-dashed border-white/10 bg-zinc-950/50 rounded-xl text-center hover:border-[#FFCC00] hover:bg-zinc-800/80 transition-all cursor-pointer">
                 {isAnalyzing ? (
                    <Loader message="ANALYZING ASSETS..." size="sm" />
                 ) : (
                    <div className="flex flex-col items-center justify-center space-y-2">
                        <UploadCloud className="w-6 h-6 text-zinc-500 mb-2" />
                        <p className="text-sm font-mono text-white">[CLICK TO UPLOAD FILES]</p>
                        <p className="text-[10px] text-zinc-500 font-mono tracking-tighter uppercase">
                          Note: Skipping uploads will disable high-fidelity visual consistency in the Storyboard and Image Editor modules.
                        </p>
                        <p className="text-[10px] text-[#FFCC00]/80 font-mono tracking-tighter uppercase">
                          Selling products? Upload product-in-hand FIRST — anchors size + appearance for every scene.
                        </p>
                        <p className="text-[10px] text-[#FFCC00]/80 font-mono tracking-tighter uppercase">
                          Service business (salon, gym, restaurant)? Upload hero photo FIRST, then storefront / interior / service-in-action.
                        </p>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'product')}
                        />
                    </div>
                 )}
            </label>
            ) : (
            /* Phase 2: archetype-driven guided slots. The slot you drop into IS the tag, so each
               scene can later be anchored to the right real photo (per-scene routing, Slice 5). */
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                // Upload your REAL photos — tagged per slot ↓
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {guidedSlots.map(({ slot, label, hint, example }) => {
                  const existing = (formData.servicePhotos || []).find(p => p.slot === slot);
                  return (
                    <div key={slot} className="flex flex-col">
                      <label className={`relative aspect-square w-full rounded-xl border overflow-hidden cursor-pointer flex items-center justify-center transition-all ${existing ? 'border-[#FFCC00] shadow-[0_0_8px_rgba(255,204,0,0.25)]' : 'border-dashed border-white/15 bg-zinc-950/50 hover:border-[#FFCC00] hover:bg-zinc-800/60'}`}>
                        {existing ? (
                          <>
                            <img src={existing.url} alt={label} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={(ev) => { ev.preventDefault(); removeSlot(slot); }}
                              className="absolute top-1 right-1 bg-red-600/90 text-white w-5 h-5 rounded-full flex items-center justify-center"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            {example && (
                              <img
                                src={example}
                                alt={`${label} example`}
                                onError={(ev) => { (ev.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                className="absolute inset-0 w-full h-full object-cover opacity-25"
                              />
                            )}
                            <div className="relative z-10 flex flex-col items-center gap-1 p-2 text-center">
                              <UploadCloud className="w-5 h-5 text-zinc-300" />
                              <span className="text-[9px] text-zinc-300 font-mono uppercase tracking-tighter">+ Add</span>
                            </div>
                            {example && (
                              <button
                                type="button"
                                onClick={(ev) => { ev.preventDefault(); setViewImage(example); }}
                                aria-label={`Preview ${label} example`}
                                className="absolute bottom-1 right-1 z-10 flex h-5 w-5 items-center justify-center rounded-md bg-black/70 text-zinc-200 hover:text-[#FFCC00]"
                              >
                                <ZoomIn className="w-3 h-3" />
                              </button>
                            )}
                          </>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSlotUpload(e, slot)} />
                      </label>
                      <p className="text-[9px] font-bold text-white font-mono uppercase mt-1 text-center leading-tight">{label}</p>
                      <p className="text-[8px] text-zinc-500 font-mono text-center leading-tight">{hint}</p>
                    </div>
                  );
                })}
              </div>
              {isAnalyzing && <div className="pt-1"><Loader message="ANALYZING..." size="sm" /></div>}
              <p className="text-[9px] text-zinc-500 font-mono tracking-tighter">
                Tinatatak namin kung saan napupunta ang bawat photo — para tumugma ang ad sa totoong lugar mo. Skip ang ayaw mong ilagay.
              </p>
            </div>
            )}
            
            {formData.productImageDescription && (
                <div className="p-4 bg-zinc-950 border border-white/10 rounded-xl">
                    <p className="text-xs text-zinc-400 font-mono italic">
                        <span className="text-[#FFCC00] font-bold">AI ANALYSIS:</span> {formData.productImageDescription}
                    </p>
                </div>
            )}
            
             {uploadError && <p className="text-red-500 text-center font-mono text-sm border border-red-900/50 bg-red-900/20 p-4 rounded-xl">{uploadError}</p>}
        </div>

      </div>

      <div className="mt-8 border-t border-white/10 pt-6">
        <h3 className="text-[10px] font-bold text-center text-zinc-400 uppercase tracking-widest mb-6 font-mono">// Ad Script Strategy</h3>

        <div className="flex justify-center gap-2 mb-6">
            <button
                type="button"
                onClick={() => selectBusinessType('product')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase font-mono border transition-all ${businessType === 'product' ? 'bg-[#FFCC00] text-zinc-950 border-[#FFCC00]' : 'bg-zinc-950 text-zinc-400 border-white/10 hover:border-[#FFCC00]'}`}
            >
                Physical Product
            </button>
            <button
                type="button"
                onClick={() => selectBusinessType('service')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase font-mono border transition-all ${businessType === 'service' ? 'bg-[#FFCC00] text-zinc-950 border-[#FFCC00]' : 'bg-zinc-950 text-zinc-400 border-white/10 hover:border-[#FFCC00]'}`}
            >
                Service
            </button>
            <button
                type="button"
                onClick={() => selectBusinessType('realestate')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase font-mono border transition-all ${businessType === 'realestate' ? 'bg-[#FFCC00] text-zinc-950 border-[#FFCC00]' : 'bg-zinc-950 text-zinc-400 border-white/10 hover:border-[#FFCC00]'}`}
            >
                Real Estate
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {businessType === 'product' && (
            <div
                onClick={() => handleScriptTypeSelect('MrBeast')}
                className={`p-6 rounded-xl border cursor-pointer transition-all hover:translate-y-[-2px] ${formData.scriptType === 'MrBeast' ? 'bg-zinc-900 border-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.2)]' : 'bg-zinc-950 border-white/10 hover:border-[#FFCC00]'}`}
            >
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-white uppercase font-mono text-xs">Viral / MrBeast</h4>
                    {formData.scriptType === 'MrBeast' && <Check className="w-4 h-4 text-[#FFCC00]" />}
                </div>
                <p className="text-[10px] text-zinc-500 font-mono">Hook, Identity, Struggles, Results, CTA.</p>
            </div>
            )}

            {businessType === 'product' && (
            <div
                onClick={() => handleScriptTypeSelect('Testimonial')}
                className={`p-6 rounded-xl border cursor-pointer transition-all hover:translate-y-[-2px] ${formData.scriptType === 'Testimonial' ? 'bg-zinc-900 border-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.2)]' : 'bg-zinc-950 border-white/10 hover:border-[#FFCC00]'}`}
            >
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-white uppercase font-mono text-xs">Testimonial</h4>
                    {formData.scriptType === 'Testimonial' && <Check className="w-4 h-4 text-[#FFCC00]" />}
                </div>
                <p className="text-[10px] text-zinc-500 font-mono">Intro, Pain Story, Transformation, Proof.</p>
            </div>
            )}

            {businessType === 'service' && (
            <div
                onClick={() => handleScriptTypeSelect('Services')}
                className={`p-6 rounded-xl border cursor-pointer transition-all hover:translate-y-[-2px] ${formData.scriptType === 'Services' ? 'bg-zinc-900 border-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.2)]' : 'bg-zinc-950 border-white/10 hover:border-[#FFCC00]'}`}
            >
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-[#FFCC00]"/>
                        <h4 className="font-bold text-white uppercase font-mono text-xs">Services</h4>
                    </div>
                    {formData.scriptType === 'Services' && <Check className="w-4 h-4 text-[#FFCC00]" />}
                </div>
                <p className="text-[10px] text-zinc-500 font-mono">Trust, Service-in-Action, Proof, Book Now.</p>
            </div>
            )}

            {businessType === 'realestate' && (
            <div
                onClick={() => handleScriptTypeSelect('RealEstate')}
                className={`p-6 rounded-xl border cursor-pointer transition-all hover:translate-y-[-2px] ${formData.scriptType === 'RealEstate' ? 'bg-zinc-900 border-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.2)]' : 'bg-zinc-950 border-white/10 hover:border-[#FFCC00]'}`}
            >
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#FFCC00]"/>
                        <h4 className="font-bold text-white uppercase font-mono text-xs">Real Estate</h4>
                    </div>
                    {formData.scriptType === 'RealEstate' && <Check className="w-4 h-4 text-[#FFCC00]" />}
                </div>
                <p className="text-[10px] text-zinc-500 font-mono">Walkthrough, Location, Highlights, Inquire.</p>
            </div>
            )}

            {businessType === 'product' && (
             <div
                aria-disabled="true"
                title="Coming in v1.1 — beta launches with MrBeast + Testimonial only."
                className="p-6 rounded-xl border bg-zinc-950 border-white/10 cursor-not-allowed opacity-60 transition-all relative"
            >
                <div className="absolute top-2 right-2 text-[8px] font-mono text-[#FFCC00]/60 uppercase tracking-tighter select-none">
                  // COMING_IN_V1.1
                </div>
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-zinc-500"/>
                        <h4 className="font-bold text-zinc-400 uppercase font-mono text-xs">Temu / Haul</h4>
                    </div>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono">High-energy Unboxing. Gadgets, Toys, Decor.</p>
            </div>
            )}

            <div
                onClick={() => handleScriptTypeSelect('Custom')}
                className={`p-6 rounded-xl border-dashed border cursor-pointer transition-all hover:translate-y-[-2px] relative ${formData.scriptType === 'Custom' ? 'bg-zinc-900 border-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.2)]' : 'bg-zinc-950 border-white/10 hover:border-[#FFCC00]'}`}
            >
                <div className="absolute top-2 right-2 text-[8px] font-mono text-[#FFCC00]/60 uppercase tracking-tighter select-none">
                  [ MANUAL_OVERRIDE ]
                </div>
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <UploadCloud className="w-4 h-4 text-[#FFCC00]"/>
                        <h4 className="font-bold text-white uppercase font-mono text-xs">Upload Script</h4>
                    </div>
                    {formData.scriptType === 'Custom' && <Check className="w-4 h-4 text-[#FFCC00]" />}
                </div>
                <p className="text-[10px] text-zinc-500 font-mono">Provide your own script via .txt or manual input.</p>
            </div>
        </div>

        {isGuided && (
            <div className="mt-6 p-6 bg-zinc-900/50 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-4">
                {/* Statement-with-✓, not a question: we picked the lead from the description; user can override.
                    Internal values venue|work|practitioner (Services) or listing|agent|developer (RealEstate);
                    labels are Bryan-facing outcomes. */}
                <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#FFCC00]" />
                    <p className="text-sm font-bold text-white font-mono">
                        Your ad will lead with — <span className="text-[#FFCC00]">{guidedLead}</span>
                    </p>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1 mb-4">
                    // We picked this from your description. Not quite? Tap another.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {guidedArchetypes.map((a) => (
                        <button
                            key={a.key}
                            type="button"
                            onClick={a.onSelect}
                            className={`p-4 rounded-xl border text-left transition-all hover:translate-y-[-2px] ${a.active ? 'bg-zinc-900 border-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.2)]' : 'bg-zinc-950 border-white/10 hover:border-[#FFCC00]'}`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-white font-mono uppercase">{a.label}</span>
                                {a.active && <Check className="w-4 h-4 text-[#FFCC00] shrink-0" />}
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono">{a.sub}</span>
                        </button>
                    ))}
                </div>
                <p className="text-[10px] text-[#FFCC00]/80 font-mono tracking-tighter uppercase mt-3">
                    This decides what your ad shows first.
                </p>

                {/* RealEstate-only: optional listing price. If given, the ad surfaces it on the CTA beat
                    + end-card recap; if blank, the ad stays inquiry-only. (Services renders no peso.) */}
                {isRealEstate && (
                    <div className="mt-5 pt-5 border-t border-white/10 space-y-2">
                        <label htmlFor="listingPrice" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                            // Listing Price — Optional
                        </label>
                        <input
                            id="listingPrice"
                            name="listingPrice"
                            value={formData.listingPrice || ''}
                            onChange={handleChange}
                            placeholder="e.g., ₱4.2M  ·  25k/month  ·  leave blank for inquiry-only"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all text-sm"
                        />
                        <p className="text-[9px] text-zinc-500 font-mono tracking-tighter">
                            Iwanang blangko kung gusto mong &quot;DM for price&quot; lang — hindi ipapakita ang halaga.
                        </p>
                    </div>
                )}
            </div>
        )}

        {formData.scriptType === 'Custom' && (
            <div className="mt-6 space-y-4 p-6 bg-zinc-900/50 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-4">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-2">
                        <label htmlFor="customManualScript" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                          // Paste Your Script Here
                        </label>
                        <textarea 
                            id="customManualScript"
                            name="customManualScript"
                            value={formData.customScriptFile?.join('\n') || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, customScriptFile: e.target.value.split('\n') }))}
                            placeholder="Hook line 1...&#10;Hook line 2...&#10;Body line 1..."
                            rows={8}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all resize-none"
                        />
                    </div>
                    <label className="w-full md:w-64 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl bg-zinc-950/50 p-6 cursor-pointer hover:border-[#FFCC00] hover:bg-zinc-800/80 transition-all">
                        <UploadCloud className="w-6 h-6 text-zinc-500 mb-4" />
                        <p className="text-[10px] font-mono text-zinc-400 uppercase mb-4 text-center">OR UPLOAD .TXT FILE</p>
                        <input 
                            type="file" 
                            accept=".txt" 
                            className="hidden" 
                            onChange={(e) => handleFileUpload(e, 'script')} 
                        />
                        <span className="inline-block py-2 px-4 bg-zinc-900 border border-white/10 text-zinc-400 rounded-xl text-xs font-bold hover:border-[#FFCC00] hover:text-[#FFCC00] transition-colors">
                            SELECT FILE
                        </span>
                        {formData.customScriptFile && formData.customScriptFile.length > 0 && (
                            <p className="text-[10px] text-[#FFCC00] mt-4 font-mono">FILE_LOADED: {formData.customScriptFile.length} lines detected.</p>
                        )}
                    </label>
                </div>
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
        <GoldButton onClick={handleNext} disabled={!isFormValid} className="px-8 py-3">
          CONFIRM & PROCEED &gt;
        </GoldButton>
      </div>
    </GlassPanel>
    {viewImage && <ImageModal imageUrl={viewImage} onClose={() => setViewImage(null)} />}
    </>
  );
};

export default Step2BusinessInfo;
