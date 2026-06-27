import React, { useEffect, useState } from 'react';
import { ClientDetails } from '../types';
import { AlertTriangle, Check } from 'lucide-react';
import { StepShell } from './ui/StepShell';
import { StepFooter } from './ui/StepFooter';
import { FieldLabel } from './ui/FieldLabel';
import { TextField } from './ui/TextField';

interface Step1Props {
  data: ClientDetails;
  setData: (data: ClientDetails) => void;
  onNext: () => void;
  prefilled?: boolean;
  prefilledFrom?: 'marketResearch' | 'offerOptimizer' | null;
}

const Step1ClientDetails: React.FC<Step1Props> = ({ data, setData, onNext, prefilled, prefilledFrom }) => {
  const [formData, setFormData] = useState(data);
  const [forceEdit, setForceEdit] = useState(false);
  // Smart validator: flips true once the user forces Confirm with gaps. Presentational UI state.
  const [triedNext, setTriedNext] = useState(false);

  // Without this, useState(data) freezes the prop at mount and silently
  // ignores subsequent parent updates (e.g. wizard auto-prefill).
  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    setData(formData);
    onNext();
  };

  const isFormValid = formData.brandName && formData.offer;

  // A forced Confirm with anything missing flags the gaps + scrolls to the first, instead of
  // sitting silently disabled. isFormValid stays the source of truth — this only surfaces it.
  const missingLabels: string[] = [
    ...(!formData.brandName ? ['Brand Name'] : []),
    ...(!formData.offer ? ['Current Offer'] : []),
  ];
  const guardedNext = () => {
    if (isFormValid) { handleNext(); return; }
    setTriedNext(true);
    const firstId = !formData.brandName ? 'brandName' : 'offer';
    document.getElementById(firstId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (prefilled && !forceEdit && formData.brandName && formData.offer) {
    const sourceLabel = prefilledFrom === 'offerOptimizer' ? 'OFFER OPTIMIZER' : 'MARKET RESEARCH';
    return (
      <StepShell
        sublabel="STEP 1 · CONFIRM BRAND"
        title="Confirm Brand"
        headerRight={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFCC00]/40 bg-[#FFCC00]/10 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-[#FFCC00]">
            <Check className="h-3 w-3 shrink-0" /> Auto-prefilled · {sourceLabel}
          </span>
        }
      >
        <div className="space-y-5">
          <div>
            <FieldLabel className="mb-2">Brand Name / Page Name</FieldLabel>
            <div className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white">
              {formData.brandName}
            </div>
          </div>
          <div>
            <FieldLabel className="mb-2">Current Offer / Pricing</FieldLabel>
            <div className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white">
              {formData.offer}
            </div>
          </div>
        </div>

        <StepFooter
          onBack={() => setForceEdit(true)}
          backLabel="// Edit fields instead"
          onNext={handleNext}
          nextLabel="CONFIRM & PROCEED"
        />
      </StepShell>
    );
  }

  return (
    <StepShell sublabel="STEP 1 · CLIENT DETAILS" title="Collect Client Details">
      <p className="-mt-4 mb-6 text-[11px] font-mono leading-relaxed text-zinc-500">
        Start by providing some basic information about the client and their offerings.
      </p>

      <div className="space-y-5">
        <TextField
          label="Brand Name / Page Name"
          id="brandName"
          name="brandName"
          value={formData.brandName}
          onChange={handleChange}
          placeholder="e.g., SparkleClean"
          invalid={triedNext && !formData.brandName}
        />
        <TextField
          label="Current Offer / Pricing"
          id="offer"
          name="offer"
          value={formData.offer}
          onChange={handleChange}
          placeholder="e.g., 50% off first cleaning for new customers"
          invalid={triedNext && !formData.offer}
        />
      </div>

      {triedNext && !isFormValid && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs font-mono text-red-200">
            <span className="font-bold uppercase tracking-widest text-red-400">Incomplete — </span>
            please complete: {missingLabels.join(' · ')}
          </p>
        </div>
      )}

      <StepFooter hideBack onNext={guardedNext} nextLabel="CONFIRM & PROCEED" />
    </StepShell>
  );
};

export default Step1ClientDetails;
