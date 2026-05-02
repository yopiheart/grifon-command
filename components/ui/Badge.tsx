import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ children, className = '', ...props }) => {
  return (
    <span 
      className={`px-3 py-1.5 border border-[#FFCC00]/30 rounded-full flex items-center gap-2 font-mono text-xs font-bold text-[#FFCC00] ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
