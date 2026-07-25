
import React from 'react';

interface LoaderProps {
  message: string;
  size?: 'sm' | 'md';
}

/**
 * Honest loading state: a lens ring + the caller's real status message.
 * No fabricated process log — the message each call site passes already names
 * the actual operation (DESIGN.md "No fake proof — trust is the brand asset").
 *
 * The ring is a conic sweep masked to an annulus (`.lens-ring` in index.css):
 * a bright leading head with a tail that falls off — light travelling around a
 * lens. It replaces the old border-with-one-transparent-side spinner, a generic
 * shape that said nothing about this product, and it speaks the same specular
 * vocabulary as the CHROME material.
 *
 * The message no longer pulses. Animating the text made it harder to read the
 * one honest thing on screen; the ring already carries "working."
 */
const Loader: React.FC<LoaderProps> = ({ message, size = 'md' }) => {
    const ring = (size === 'sm'
        ? { '--lens-size': '32px', '--lens-thickness': '4px' }
        : { '--lens-size': '80px', '--lens-thickness': '8px' }) as React.CSSProperties;

    return (
        <div className="flex flex-col items-center justify-center gap-6 p-6 animate-in fade-in duration-500 w-full max-w-sm mx-auto">
            <div className="relative flex items-center justify-center">
                <div className="lens-ring" style={ring} />
                {/* The core the ring orbits. */}
                <span className="absolute w-1.5 h-1.5 rounded-full bg-[#FFE266] shadow-[0_0_10px_rgba(255,204,0,0.9)] animate-pulse" />
            </div>
            {message && (
                <p className="text-text-primary text-xl font-black italic tracking-tight font-sans text-center leading-tight">
                    {message}
                </p>
            )}
        </div>
    );
};

export default Loader;
