
import React, { useEffect, useState } from 'react';
import { BusinessInfo } from '../types';
import { describeBusinessAsset } from '../services/geminiService';
import { compressImageForUpload } from '../utils/imageCompression';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import { Check, Package, ShoppingBag, Sparkles, Store, UploadCloud, X } from 'lucide-react';

type ServiceArchetype = NonNullable<BusinessInfo['serviceArchetype']>;

// Services "primary hero" qualifier. Bryan-facing labels (outcome, not jargon) + a recognition
// sub-caption + the "lead with" statement + the upload samples to teach (all humble/PH per the
// CMO realism guardrail). Internal values stay engine-clean (venue|work|practitioner).
const ARCHETYPE_META: Record<ServiceArchetype, {
  label: string; sub: string; lead: string; samples: { src: string; caption: string }[];
}> = {
  venue: {
    label: 'Show off my place', sub: 'Salon, gym, resto, clinic', lead: 'Your place',
    samples: [{ src: '/examples/services-venue-clear.png', caption: 'Your place — clear & bright' }],
  },
  work: {
    label: 'Show the results', sub: 'Cleaning, repair, pest', lead: 'Your results',
    samples: [
      { src: '/examples/services-work-before.png', caption: 'Before' },
      { src: '/examples/services-work-after.png', caption: 'After' },
    ],
  },
  practitioner: {
    label: 'Feature me & my team', sub: 'Coach, consultant, agency', lead: 'You & your team',
    samples: [{ src: '/examples/services-practitioner.png', caption: 'You — friendly & clear' }],
  },
};
const ARCHETYPE_ORDER: ServiceArchetype[] = ['venue', 'work', 'practitioner'];
const BAD_SAMPLE = { src: '/examples/services-blurry-bad.png', caption: 'Dark & blurry' };

// Smart-default the archetype from the user's own words. SCORE each bucket by keyword hits and
// take the highest — first-match-by-order misrouted "Naya Boutique Spa … maintenance for your body"
// to 'work' on the broad word "maintenance" (2026-06-21 smoke), even though "spa"+"massage" are
// stronger venue signals. Ties / no match → 'venue' (most common PH service SMB + safest visual).
const inferServiceArchetype = (text: string): ServiceArchetype => {
  const t = (text || '').toLowerCase();
  const score = (...words: string[]) => words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
  // Place-as-draw. Strong, specific nouns only (dropped broad 'store'/'shop' — they hit retail).
  const venue = score('spa', 'salon', 'barber', 'gym', 'fitness', 'clinic', 'derma', 'dental',
    'restaurant', 'resto', 'cafe', 'café', 'hotel', 'resort', 'parlor', 'massage', 'hilot',
    'kainan', 'eatery', 'lounge', 'studio');
  // Result-as-draw. Dropped over-broad 'ayos'/'maintenance' — they fire on non-trade benefit copy.
  const work = score('clean', 'linis', 'pest', 'peste', 'siphon', 'malaban', 'repair', 'laundr',
    'labada', 'plumb', 'aircon', 'disinfect', 'declog', 'detailing', 'carwash', 'car wash',
    'exterm', 'hauling', 'pickup', 'pick-up', 'moving');
  // Person-as-draw. Unambiguous professional-service nouns only.
  const practitioner = score('coach', 'consult', 'advisor', 'tutor', 'agency', 'accountant',
    'lawyer', 'freelanc', 'mentor', 'strategist');
  if (venue >= work && venue >= practitioner && venue > 0) return 'venue';
  if (work >= practitioner && work > 0) return 'work';
  if (practitioner > 0) return 'practitioner';
  return 'venue';
};

// One upload-sample tile: image with an icon fallback so a missing/late JPG never shows a broken
// image (the curated PNGs land in public/examples/; until then the tile degrades to a lucide icon).
const SampleTile: React.FC<{ src: string; caption: string; good: boolean }> = ({ src, caption, good }) => {
  const [err, setErr] = useState(false);
  const FallbackIcon = good ? Sparkles : X;
  return (
    <div className="flex flex-col items-center">
      <div className={`relative aspect-square w-full bg-zinc-900 border rounded-xl flex items-center justify-center overflow-hidden ${good ? 'border-[#FFCC00]/40' : 'border-red-900/50'}`}>
        {!err ? (
          <img src={src} alt={caption} onError={() => setErr(true)} className={`w-full h-full object-cover ${good ? '' : 'opacity-80'}`} />
        ) : (
          <FallbackIcon className={`w-8 h-8 ${good ? 'text-[#FFCC00]/60' : 'text-red-500/60'}`} />
        )}
        <span className={`absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center ${good ? 'bg-[#FFCC00] text-zinc-950' : 'bg-red-600 text-white'}`}>
          {good ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
        </span>
      </div>
      <p className="text-[8px] text-zinc-500 font-mono uppercase tracking-tighter mt-1.5 text-center">{caption}</p>
    </div>
  );
};

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

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleScriptTypeSelect = (type: 'MrBeast' | 'Testimonial' | 'Temu' | 'Custom' | 'Services') => {
    setFormData(prev => ({ ...prev, scriptType: type }));
  };

  // Product vs Service gate. Product-formulated styles (MrBeast/Testimonial/Temu) and the
  // Services style are mutually exclusive in the picker; Custom shows in both. Derived from
  // businessType, falling back to the current scriptType for resumed drafts.
  const businessType: 'product' | 'service' =
    formData.businessType ?? (formData.scriptType === 'Services' ? 'service' : 'product');

  const isServices = businessType === 'service' && formData.scriptType === 'Services';
  // What the ad leads with. Falls back to the inferred default so the UI + sample strip have a
  // value even on the first render before the auto-select effect writes it into state.
  const effectiveArchetype: ServiceArchetype = formData.serviceArchetype
    ?? inferServiceArchetype(`${formData.product || ''} ${formData.productImageDescription || ''} ${formData.features || ''}`);

  const selectArchetype = (a: ServiceArchetype) =>
    setFormData(prev => ({ ...prev, serviceArchetype: a }));

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

  const selectBusinessType = (bt: 'product' | 'service') => {
    setFormData(prev => {
      const productOk: string[] = ['MrBeast', 'Testimonial', 'Custom'];
      const serviceOk: string[] = ['Services', 'Custom'];
      let scriptType = prev.scriptType;
      // Keep a valid selection for the chosen group (preserve Custom across both).
      if (bt === 'service' && !serviceOk.includes(scriptType ?? '')) scriptType = 'Services';
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

  return (
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

            {hasImages && (
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
            {isServices ? (
              <div className="space-y-2">
                <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
                  // What to upload — clear &amp; bright wins ↓
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {ARCHETYPE_META[effectiveArchetype].samples.map((ex, idx) => (
                    <SampleTile key={`good-${idx}`} src={ex.src} caption={ex.caption} good />
                  ))}
                  <SampleTile src={BAD_SAMPLE.src} caption={BAD_SAMPLE.caption} good={false} />
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

        {isServices && (
            <div className="mt-6 p-6 bg-zinc-900/50 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-4">
                {/* Statement-with-✓, not a question: we picked the lead from the description; user can override.
                    Internal values venue|work|practitioner; labels are Bryan-facing outcomes. */}
                <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#FFCC00]" />
                    <p className="text-sm font-bold text-white font-mono">
                        Your ad will lead with — <span className="text-[#FFCC00]">{ARCHETYPE_META[effectiveArchetype].lead}</span>
                    </p>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1 mb-4">
                    // We picked this from your description. Not quite? Tap another.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {ARCHETYPE_ORDER.map((a) => {
                        const meta = ARCHETYPE_META[a];
                        const active = effectiveArchetype === a;
                        return (
                            <button
                                key={a}
                                type="button"
                                onClick={() => selectArchetype(a)}
                                className={`p-4 rounded-xl border text-left transition-all hover:translate-y-[-2px] ${active ? 'bg-zinc-900 border-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.2)]' : 'bg-zinc-950 border-white/10 hover:border-[#FFCC00]'}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-white font-mono uppercase">{meta.label}</span>
                                    {active && <Check className="w-4 h-4 text-[#FFCC00] shrink-0" />}
                                </div>
                                <span className="text-[10px] text-zinc-500 font-mono">{meta.sub}</span>
                            </button>
                        );
                    })}
                </div>
                <p className="text-[10px] text-[#FFCC00]/80 font-mono tracking-tighter uppercase mt-3">
                    This decides what your ad shows first.
                </p>
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
  );
};

export default Step2BusinessInfo;
