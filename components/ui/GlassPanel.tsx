import React from 'react';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
