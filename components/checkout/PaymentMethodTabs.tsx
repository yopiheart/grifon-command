import React from 'react';
import { CreditCard } from 'lucide-react';

export type PaymentMethod = 'card' | 'gcash' | 'paymaya' | 'grab_pay';

interface PaymentMethodTabsProps {
  active: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

const TABS: Array<{ id: PaymentMethod; label: string; icon: React.ReactNode }> = [
  { id: 'card', label: 'Card', icon: <CreditCard className="w-4 h-4" /> },
  {
    id: 'gcash',
    label: 'GCash',
    icon: (
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black">
        G
      </span>
    ),
  },
  {
    id: 'paymaya',
    label: 'Maya',
    icon: (
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-black">
        M
      </span>
    ),
  },
  {
    id: 'grab_pay',
    label: 'GrabPay',
    icon: (
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-700 text-white text-[10px] font-black">
        Gr
      </span>
    ),
  },
];

export const PaymentMethodTabs: React.FC<PaymentMethodTabsProps> = ({ active, onChange }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
    {TABS.map((tab) => {
      const isActive = active === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-sm font-medium transition-all ${
            isActive
              ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-white'
              : 'border-white/10 bg-zinc-950 text-zinc-400 hover:border-white/30 hover:text-white'
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      );
    })}
  </div>
);
