import React, { useState } from 'react';
import { ClientDetails } from '../types';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';

interface Step1Props {
  data: ClientDetails;
  setData: (data: ClientDetails) => void;
  onNext: () => void;
}

const Step1ClientDetails: React.FC<Step1Props> = ({ data, setData, onNext }) => {
  const [formData, setFormData] = useState(data);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleNext = () => {
    setData(formData);
    onNext();
  };
  
  const isFormValid = formData.brandName && formData.offer && formData.services;

  return (
    <GlassPanel>
      <div className="mb-8 border-b border-white/10 pb-6">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight">
          Step 1: Collect Client Details
        </h2>
        <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
          // Start by providing some basic information about the client and their offerings.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="brandName" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
            // Brand Name / Page Name
          </label>
          <input
            id="brandName" 
            name="brandName"
            value={formData.brandName}
            onChange={handleChange}
            placeholder="e.g., SparkleClean"
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="offer" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
            // Current Offer / Pricing
          </label>
          <input
            id="offer"
            name="offer"
            value={formData.offer}
            onChange={handleChange}
            placeholder="e.g., 50% off first cleaning for new customers"
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="services" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
            // List of Products / Services
          </label>
          <textarea
            id="services"
            name="services"
            value={formData.services}
            onChange={handleChange}
            placeholder="e.g., Deep cleaning, regular maintenance, window washing"
            rows={4}
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all resize-none text-sm"
          />
        </div>
      </div>
      
      <div className="mt-10 flex justify-end pt-6 border-t border-white/10">
        <GoldButton onClick={handleNext} disabled={!isFormValid} className="px-8 py-3">
          CONFIRM & PROCEED &gt;
        </GoldButton>
      </div>
    </GlassPanel>
  );
};

export default Step1ClientDetails;