
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const Input: React.FC<InputProps> = ({ label, id, ...props }) => {
  return (
    <div className="w-full group/input">
      <label 
        htmlFor={id} 
        className="block text-sm text-zinc-400 font-sans font-semibold normal-case tracking-normal mb-2 group-focus-within/input:text-[#FFCC00] transition-colors"
      >
        // {label}
      </label>
      
      <input
        id={id}
        className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all duration-300 font-sans font-normal normal-case tracking-normal text-sm"
        {...props}
      />
    </div>
  );
};

export default Input;
