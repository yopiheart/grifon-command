
import React from 'react';

interface LoaderProps {
  message: string;
  size?: 'sm' | 'md';
}

/**
 * Honest loading state: gold spinner + the caller's real status message.
 * No fabricated process log — the message each call site passes already names
 * the actual operation (DESIGN.md "No fake proof — trust is the brand asset").
 */
const Loader: React.FC<LoaderProps> = ({ message, size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-8 h-8 border-4',
        md: 'w-20 h-20 border-8',
    };

    return (
        <div className="flex flex-col items-center justify-center gap-6 p-6 animate-in fade-in duration-500 w-full max-w-sm mx-auto">
            <div className="relative">
                <div className={`${sizeClasses[size]} border-brand-primary border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(255,204,0,0.3)]`}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-brand-yellow rounded-full animate-pulse"></div>
                </div>
            </div>
            {message && (
                <p className="text-text-primary text-xl font-black italic tracking-tight font-sans animate-pulse text-center leading-tight">
                    {message}
                </p>
            )}
        </div>
    );
};

export default Loader;
