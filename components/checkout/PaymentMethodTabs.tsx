import React from 'react';
import { CreditCard, Wallet } from 'lucide-react';

export type PaymentMethod = 'card' | 'gcash' | 'paymaya' | 'grab_pay';

interface PaymentMethodTabsProps {
  active: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

const TABS: Array<{ id: PaymentMethod; label: string; icon: React.ReactNode }> = [
  { id: 'card', label: 'Card', icon: <CreditCard aria-hidden="true" className="w-5 h-5 shrink-0" /> },
  {
    id: 'gcash',
    label: 'GCash',
    icon: (
      <Wallet aria-hidden="true" className="w-5 h-5 shrink-0" />
    ),
  },
  {
    id: 'paymaya',
    label: 'Maya',
    icon: (
      <Wallet aria-hidden="true" className="w-5 h-5 shrink-0" />
    ),
  },
  {
    id: 'grab_pay',
    label: 'GrabPay',
    icon: (
      <Wallet aria-hidden="true" className="w-5 h-5 shrink-0" />
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
          aria-pressed={isActive}
          className={`flex min-h-12 items-center justify-center gap-3 py-3 px-3 rounded-full border text-sm transition-colors ${
            isActive
              ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-white'
              : 'border-white/10 bg-zinc-950 text-zinc-400 hover:border-[#FFCC00] hover:text-white'
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      );
    })}
  </div>
);
