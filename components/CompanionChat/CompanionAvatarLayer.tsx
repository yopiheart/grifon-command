import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { DUR, EASE } from '../ui/motionTokens';
import { CompanionAvatar, type CompanionReaction } from './CompanionAvatar';

export interface CompanionAvatarPresentation {
  state: CompanionReaction;
  bounds: { left: number; top: number; width: number; height: number };
  inert: boolean;
}

export function CompanionAvatarLayer({ presentation }: { presentation: CompanionAvatarPresentation | null }) {
  const layer = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (presentation?.inert) layer.current?.setAttribute('inert', '');
    else layer.current?.removeAttribute('inert');
  }, [presentation?.inert]);
  const style = {
    ...(presentation?.bounds ?? { left: 0, top: 0, width: 56, height: 56 }),
    visibility: presentation ? 'visible' : 'hidden',
    '--companion-duration': `${DUR.instant}s`,
    '--companion-ease': `cubic-bezier(${EASE.expressive.join(',')})`,
  } as CSSProperties;
  return <div ref={layer} className="companion-avatar-layer pointer-events-none absolute z-20" style={style}>
    <CompanionAvatar state={presentation?.state ?? 'idle'} className="h-full w-full" />
  </div>;
}
