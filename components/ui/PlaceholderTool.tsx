
import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PlaceholderToolProps {
  moduleName: string;
  onBack: () => void;
}

const PlaceholderTool: React.FC<PlaceholderToolProps> = ({ moduleName, onBack }) => {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 border-t-4 border-red-500">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-block p-4 rounded-full bg-red-900/20 border border-red-500/50 mb-4 animate-pulse">
            <RefreshCw className="w-12 h-12 text-red-500" />
        </div>
        
        <h1 className="text-3xl font-black text-white uppercase tracking-widest">
          SYSTEM OFFLINE
        </h1>
        
        <div className="bg-zinc-900 border border-white/10 p-6 rounded-xl">
            <p className="text-[#FFCC00] font-mono text-sm mb-2">MODULE: {moduleName ? moduleName.replace('_', ' ').toUpperCase() : 'UNKNOWN'}</p>
            <p className="text-zinc-400 font-mono text-xs">
                This tactical module is currently under development by Engineering. 
                Check back for firmware updates.
            </p>
        </div>

        <button onClick={onBack} className="w-full py-3 rounded-full border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 text-xs font-bold uppercase transition-all">
            &lt; RETURN TO COMMAND
        </button>
      </div>
    </div>
  );
};

export default PlaceholderTool;
