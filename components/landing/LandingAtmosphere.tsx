import React, { useEffect, useRef } from 'react';

/** Two composited light fields. Pointer input is decorative and desktop-only. */
export const LandingAtmosphere: React.FC = () => {
  const lightRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)');
    let frame = 0;
    let x = 0;
    let y = 0;
    const move = (event: PointerEvent) => {
      if (!media.matches || event.pointerType === 'touch') return;
      x = event.clientX;
      y = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (lightRef.current) {
          lightRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          lightRef.current.style.opacity = '1';
        }
      });
    };
    const hide = () => { if (lightRef.current) lightRef.current.style.opacity = '0'; };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);
    media.addEventListener('change', hide);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', hide);
      window.removeEventListener('blur', hide);
      media.removeEventListener('change', hide);
    };
  }, []);
  return <div className="landing-atmosphere" aria-hidden="true">
    <div className="landing-light-field" />
    <div ref={lightRef} className="landing-pointer-light"><div /></div>
  </div>;
};
