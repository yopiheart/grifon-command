import React, { useRef } from 'react';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';

interface GoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const GoldButton: React.FC<GoldButtonProps> = ({ children, className = '', onClick, ...props }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(e);
    }
    
    const text = buttonRef.current?.textContent?.toUpperCase() || '';
    const icon = <CheckCircle className="w-4 h-4 text-[#FFCC00]" />;
    
    if (text.includes('GENERATE') || text.includes('SYNTHESIZE') || text.includes('RENDER')) {
      toast('SYNTHESIS INITIATED...', { icon });
    } else if (text.includes('ANALYZE') || text.includes('OPTIMIZE') || text.includes('RESEARCH')) {
      toast('ANALYSIS STARTED...', { icon });
    } else if (text.includes('INITIATE')) {
      toast('PROCESS INITIATED...', { icon });
    }
  };

  return (
    <button 
      ref={buttonRef}
      className={`rounded-full bg-[#FFCC00] text-black font-bold uppercase py-3 text-xs md:text-sm text-center leading-tight px-4 md:px-8 shadow-[0_0_15px_rgba(255,204,0,0.3)] hover:shadow-[0_0_25px_rgba(255,204,0,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
};
