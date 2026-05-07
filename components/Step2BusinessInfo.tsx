
import React, { useState } from 'react';
import { BusinessInfo } from '../types';
import { describeBusinessAsset } from '../services/geminiService';
import { compressImageForUpload } from '../utils/imageCompression';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import { Check, ShoppingBag, UploadCloud, X } from 'lucide-react';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleScriptTypeSelect = (type: 'MrBeast' | 'Testimonial' | 'Temu' | 'Custom') => {
    setFormData(prev => ({ ...prev, scriptType: type }));
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

        if (!formData.productImageDescription && compressed.length > 0) {
            const first = compressed[0];
            const description = await describeBusinessAsset(first.base64, first.mimeType);
            setFormData(prev => ({ ...prev, productImageUrls: updatedImages, productImageDescription: description }));
        } else {
             setFormData(prev => ({ ...prev, productImageUrls: updatedImages }));
        }

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
  
  const requiredFields: (keyof BusinessInfo)[] = ['product', 'audience', 'goal', 'benefit', 'problem', 'painPoint', 'separator', 'features'];
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
          { id: 'product', label: 'Service/Product', placeholder: 'e.g., Eco-friendly home cleaning service' },
          { id: 'audience', label: 'Target Audience', placeholder: 'e.g., Busy young professionals' },
          { id: 'goal', label: 'What it helps them Achieve/Eliminate', placeholder: 'e.g., Achieve a spotless home without lifting a finger' },
          { id: 'benefit', label: 'Main Benefit', placeholder: 'e.g., More free time for hobbies and family' },
          { id: 'problem', label: 'Main Problem it Solves', placeholder: 'e.g., Lack of time and energy to clean' },
          { id: 'painPoint', label: 'Main Pain Point of Audience', placeholder: 'e.g., Feeling stressed and overwhelmed by mess' }
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
                <div className="grid grid-cols-5 gap-2 mb-2">
                    {formData.productImageUrls!.map((url, idx) => (
                        <div key={idx} className="relative group aspect-square border border-white/10 bg-zinc-950 rounded-xl overflow-hidden">
                            <img src={url} alt={`Upload ${idx}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            <button 
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 bg-red-600/90 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            
             <div 
                onClick={() => handleScriptTypeSelect('Temu')}
                className={`p-6 rounded-xl border cursor-pointer transition-all hover:translate-y-[-2px] ${formData.scriptType === 'Temu' ? 'bg-zinc-900 border-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.2)]' : 'bg-zinc-950 border-white/10 hover:border-[#FFCC00]'}`}
            >
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-[#FFCC00]"/>
                        <h4 className="font-bold text-white uppercase font-mono text-xs">Temu / Haul</h4>
                    </div>
                    {formData.scriptType === 'Temu' && <Check className="w-4 h-4 text-[#FFCC00]" />}
                </div>
                <p className="text-[10px] text-zinc-500 font-mono">High-energy Unboxing. Gadgets, Toys, Decor.</p>
            </div>

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
