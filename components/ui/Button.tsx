
import React from 'react';
import { playTick } from '../../services/uiSoundService';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className, onClick, ...props }) => {

  const baseStyles = "px-6 py-3 font-bold uppercase tracking-wider text-sm transition-all duration-150 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-mono rounded-none";

  const variantStyles = {
    primary: "bg-[#FFCC00] text-black hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(255,204,0,0.4)] active:translate-y-1 rounded-full",
    secondary: "bg-transparent border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full",
    ghost: "bg-transparent text-on-surface-sublabel hover:text-white hover:bg-white/5 rounded-full"
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    playTick();
    onClick?.(e);
  };

  return (
    <button className={`${baseStyles} ${variantStyles[variant]} ${className || ''}`} onClick={handleClick} {...props}>
      {children}
    </button>
  );
};

export default Button;
