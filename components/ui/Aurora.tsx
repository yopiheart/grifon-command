import React from 'react';
import { motion } from 'motion/react';
import { DUR, EASE } from './motionTokens';

type AuroraIntensity = 'marketing' | 'dashboard' | 'subtle';

interface AuroraProps {
  intensity?: AuroraIntensity;
  className?: string;
}

const PRESETS: Record<AuroraIntensity, { a: string; b: string; opacity: number; blur: string }> = {
  marketing: { a: 'bg-[#FFCC00]/8',  b: 'bg-[#FFCC00]/15', opacity: 0.6,  blur: 'blur-[100px] md:blur-[150px]' },
  dashboard: { a: 'bg-[#FFCC00]/5',  b: 'bg-[#FFCC00]/8',  opacity: 0.45, blur: 'blur-[120px] md:blur-[180px]' },
  subtle:    { a: 'bg-[#FFCC00]/3',  b: 'bg-[#FFCC00]/5',  opacity: 0.3,  blur: 'blur-[140px] md:blur-[200px]' },
};

export const Aurora: React.FC<AuroraProps> = ({ intensity = 'marketing', className = '' }) => {
  const preset = PRESETS[intensity];

  return (
    <div
      className={`fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    >
      <motion.div
        animate={{ x: [0, 50, -30, 0], y: [0, -50, 30, 0], scale: [1, 1.1, 0.9, 1] }}
        transition={{ duration: DUR.ambient.drift, repeat: Infinity, ease: EASE.inOut }}
        style={{ opacity: preset.opacity }}
        className={`absolute top-[-10%] left-[-10%] w-[500px] md:w-[800px] aspect-square ${preset.a} rounded-full ${preset.blur}`}
      />
      <motion.div
        animate={{ x: [0, -40, 20, 0], y: [0, 40, -20, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: DUR.ambient.slowDrift, repeat: Infinity, ease: EASE.inOut }}
        style={{ opacity: preset.opacity }}
        className={`absolute top-[20%] right-[-10%] w-[400px] md:w-[600px] aspect-square ${preset.b} rounded-full ${preset.blur}`}
      />
    </div>
  );
};
