import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  onStepClick: (step: number) => void;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps, onStepClick }) => {
  const steps = [
    "Details",
    "Business",
    "Script",
    "Avatar",
    "Scenes",
    "Thumb",
    "Prompts",
    "Assets",
  ];

  return (
    <div className="flex items-center w-full overflow-x-auto pb-4 hide-scrollbar snap-x mb-10">
      <div className="flex items-center justify-between min-w-[600px] w-full px-4">
        {steps.slice(0, totalSteps).map((name, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <React.Fragment key={stepNumber}>
              <div 
                className={`flex flex-col items-center text-center relative z-10 shrink-0 min-w-[60px] snap-center ${isCompleted ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={() => isCompleted && onStepClick(stepNumber)}
              >
                <div 
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border transition-all duration-300
                    ${isActive 
                      ? 'bg-[#FFCC00] border-transparent text-black shadow-[0_0_15px_rgba(255,204,0,0.5)] scale-110' 
                      : isCompleted 
                        ? 'bg-zinc-800 border-[#FFCC00] text-white' 
                        : 'bg-zinc-950 border-white/10 text-on-surface-sublabel'
                    }
                  `}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : stepNumber}
                </div>
                <p className={`mt-3 text-[10px] font-mono uppercase tracking-widest transition-all duration-300 ${isActive ? 'text-[#FFCC00] font-bold' : 'text-on-surface-sublabel'}`}>
                  {name}
                </p>
              </div>
              
              {stepNumber < totalSteps && (
                <div className="flex-1 h-[2px] mx-2 relative">
                   {/* Background Line */}
                   <div className="absolute top-0 left-0 w-full h-full bg-white/5 rounded"></div>
                   {/* Active/Completed Laser Line */}
                   <div 
                      className={`absolute top-0 left-0 h-full rounded transition-all duration-500 ease-out shadow-[0_0_8px_rgba(255,204,0,0.5)]`}
                      style={{ 
                        width: isCompleted ? '100%' : '0%',
                        backgroundColor: '#FFCC00' 
                      }}
                   ></div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;