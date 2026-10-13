import React from 'react';
import { GlassPanel } from './GlassPanel';

interface CardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, description, children }) => {
  return (
    <GlassPanel className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700 p-8 md:p-12 relative overflow-hidden group">
      <div className="text-center mb-10 border-b border-white/10 pb-8">
        <h2 className="text-3xl md:text-4xl font-sans font-semibold text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 normal-case tracking-[-0.02em]">
          {title}
        </h2>
        <p className="text-on-surface-sublabel mt-3 font-sans font-normal text-[13px] normal-case tracking-normal">
          // {description}
        </p>
      </div>
      <div className="relative z-10">{children}</div>
    </GlassPanel>
  );
};

export default Card;
