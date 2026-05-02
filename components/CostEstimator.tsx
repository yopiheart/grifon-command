import React from 'react';
import { DollarSign } from 'lucide-react';

interface CostEstimatorProps {
  cost: number;
}

const CostEstimator: React.FC<CostEstimatorProps> = ({ cost }) => {
  return (
    <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
      <DollarSign className="w-3 h-3 text-[#FFCC00]" />
      <span>Estimated API Cost:</span>
      <span className="font-bold text-white tabular-nums">${cost.toFixed(2)}</span>
      <a href="https://ai.google.dev/pricing" target="_blank" rel="noopener noreferrer" className="ml-2 text-zinc-600 hover:text-white transition-colors">
        [PRICING INFO]
      </a>
    </div>
  );
};

export default CostEstimator;
