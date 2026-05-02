import React, { ReactNode } from 'react';

interface AnimatedBorderProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}

export const AnimatedBorder: React.FC<AnimatedBorderProps> = ({ 
  children, 
  className = '', 
  containerClassName = '' 
}) => {
  return (
    <div className={`relative overflow-hidden rounded-3xl p-[1px] ${containerClassName}`}>
      <style dangerouslySetInnerHTML={{__html: `
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes rotate-border {
          to {
            --angle: 360deg;
          }
        }
      `}} />
      <div 
        className="absolute inset-0 z-0" 
        style={{
          background: 'conic-gradient(from var(--angle), transparent 70%, #FFCC00 85%, transparent 100%)',
          animation: 'rotate-border 4s linear infinite',
        }}
      />
      <div className={`relative z-10 h-full w-full rounded-[calc(1.5rem-1px)] ${className || 'bg-zinc-900/90'}`}>
        {children}
      </div>
    </div>
  );
};
