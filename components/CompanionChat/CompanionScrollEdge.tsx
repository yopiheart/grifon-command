import { useEffect, useRef, type RefObject } from 'react';

/** The edge separates the stationary identity from content that has scrolled away. */
export function CompanionScrollEdge({ scroller }: { scroller: RefObject<HTMLDivElement | null> }) {
  const edge = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = scroller.current;
    const surface = edge.current;
    if (!node || !surface) return;
    let frame = 0;
    const measure = () => {
      surface.dataset.active = String(node.scrollTop > 1 && node.scrollHeight > node.clientHeight + 1);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(() => { frame = 0; measure(); });
    };
    measure();
    node.addEventListener('scroll', schedule, { passive: true });
    const resize = new ResizeObserver(schedule);
    resize.observe(node);
    if (node.firstElementChild) resize.observe(node.firstElementChild);
    return () => {
      node.removeEventListener('scroll', schedule);
      resize.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [scroller]);
  return <div ref={edge} aria-hidden="true" className="companion-scroll-edge" data-active="false"><span /><span /><span /></div>;
}
