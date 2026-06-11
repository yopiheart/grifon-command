
import React, { useState, useEffect } from 'react';

interface LoaderProps {
  message: string;
  size?: 'sm' | 'md';
}

const NEURAL_PLAN_STEPS = [
  "INITIALIZING_NEURAL_SYNAPSE...",
  "EXTRACTING_VISUAL_SEMANTICS...",
  "QUERYING_MARKET_DATABASE_v4.2...",
  "ANALYZING_RETENTION_METRICS...",
  "MAPPING_USER_HEURISTICS...",
  "EXECUTING_SUBY_COPY_ALGORITHM...",
  "OPTIMIZING_LUMEN_COHERENCE...",
  "FINALIZING_PIXEL_SYNTHESIS...",
  "VERIFYING_CONVERSION_PROBABILITY...",
  "DEPLOYING_ASSET_v1.0..."
];

const Loader: React.FC<LoaderProps> = ({ message, size = 'md' }) => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setStep((s) => (s + 1) % NEURAL_PLAN_STEPS.length);
        }, 800);
        return () => clearInterval(interval);
    }, []);

    const sizeClasses = {
        sm: 'w-8 h-8 border-4',
        md: 'w-20 h-20 border-8',
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in duration-500 w-full max-w-sm mx-auto">
            {/* TERMINAL HEADER */}
            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    <div className={`${sizeClasses[size]} border-[#FFCC00] border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(255,204,0,0.3)]`}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-[#FFCC00] rounded-full animate-pulse"></div>
                    </div>
                </div>
                <p className="text-white text-xl font-black italic tracking-tight font-sans animate-pulse text-center leading-tight">
                    {message}
                </p>
            </div>
            
            {/* TACTICAL LOG TERMINAL */}
            <div className="w-full flex flex-col items-center">
                <div className="bg-zinc-950/90 p-4 border border-white/10 rounded-2xl font-mono text-[9px] text-left w-full shadow-2xl relative overflow-hidden h-[180px]">
                    {/* Header Bar */}
                    <div className="flex items-center gap-1.5 mb-3 border-b border-white/10 pb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FFCC00]"></div>
                        <span className="ml-2 text-gray-500 tracking-tighter uppercase font-bold opacity-60">NEURAL_PLAN // INTERNAL_STREAM</span>
                    </div>

                    {/* Log Content */}
                    <div className="space-y-1.5">
                        {NEURAL_PLAN_STEPS.slice(0, step + 1).map((s, i) => (
                            <div 
                                key={i} 
                                className={`flex items-center gap-2 transition-all duration-300 ${i === step ? 'text-[#FFCC00] translate-x-1' : 'text-gray-600 opacity-60'}`}
                            >
                                <span className="font-bold shrink-0 w-6">[OK]</span>
                                <span className="tracking-tighter truncate">{s}</span>
                                {i === step && <span className="w-1 h-3 bg-[#FFCC00] animate-pulse ml-auto shadow-[0_0_8px_#FFCC00]"></span>}
                            </div>
                        ))}
                    </div>
                    
                    {/* Scanline Overlay */}
                    <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
                </div>
                
                <p className="mt-4 text-[8px] text-gray-700 font-mono tracking-[0.5em] uppercase opacity-40">
                    DIRECTOR_AI_FIRMWARE_v4.2
                </p>
            </div>
        </div>
    );
};

export default Loader;
