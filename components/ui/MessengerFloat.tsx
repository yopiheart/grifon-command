import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { CONTACT } from '../../config/contact';
import { playTick } from '../../services/uiSoundService';

/**
 * Floating "chat with us" bubble (bottom-left). Opens Messenger in a new tab —
 * a plain link, not the heavy FB Customer-Chat SDK, so there's no cookie/consent
 * weight. Sits low-left so it never covers a primary CTA on mobile.
 */
interface MessengerFloatProps {
  /** Which corner to dock in. Default 'left'; use 'right' to clear bottom-left popups. */
  side?: 'left' | 'right';
}

export const MessengerFloat: React.FC<MessengerFloatProps> = ({ side = 'left' }) => {
  const [showTip, setShowTip] = useState(true);

  return (
    <div
      className={`fixed bottom-4 z-40 flex items-end gap-2 print:hidden ${
        side === 'right' ? 'right-4 flex-row-reverse' : 'left-4'
      }`}
    >
      <a
        href={CONTACT.messengerUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => playTick()}
        aria-label={CONTACT.messengerLabel}
        className="group relative w-14 h-14 rounded-full bg-[#FFCC00] flex items-center justify-center shadow-[0_0_20px_rgba(255,204,0,0.35)] ring-4 ring-[#FFCC00]/15 hover:scale-105 active:scale-95 transition-transform"
      >
        <MessageCircle className="w-6 h-6 text-black" />
      </a>

      {showTip && (
        <div
          className={`relative mb-1 max-w-[200px] rounded-2xl bg-zinc-900/90 border border-white/10 px-3.5 py-2.5 ${
            side === 'right' ? 'rounded-br-sm' : 'rounded-bl-sm'
          }`}
        >
          <button
            onClick={() => setShowTip(false)}
            aria-label="Dismiss"
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
          <p className="text-xs text-zinc-200 leading-snug">
            May tanong? <span className="text-[#FFCC00] font-semibold">Chat with us</span> — sasagutin ka namin agad.
          </p>
        </div>
      )}
    </div>
  );
};
