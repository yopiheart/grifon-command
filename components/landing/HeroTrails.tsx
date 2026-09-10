import React, { useEffect, useRef } from 'react';
import { motion, useTransform, type MotionValue } from 'motion/react';

const smooth = (value: number) => {
  const p = Math.max(0, Math.min(1, value));
  return p * p * (3 - 2 * p);
};

/** Scroll unfolds the ribbons; their internal current continues during the film hold. */
export const HeroTrails: React.FC<{ progress: MotionValue<number> }> = ({ progress }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const opacity = useTransform(() => smooth((progress.get() - 0.31) / 0.09));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;

    const draw = (now: number) => {
      frame = 0;
      if (!visible || document.hidden) return;
      ctx.clearRect(0, 0, width, height);
      const p = progress.get();
      if (p <= 0.31) return;
      const time = now / 1000;
      for (const side of [-1, 1]) {
        const opening = smooth((p - 0.32) / 0.31);
        // Broad, low-opacity gold light gives the fine ribbons a visible body.
        ctx.save();
        ctx.translate(width * (0.5 + side * opening * 0.48), height * (0.51 + Math.sin(time * 0.6 + side) * 0.035));
        ctx.scale(Math.max(20, width * 0.115), height * 0.46);
        const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        aura.addColorStop(0, `rgba(255,204,0,${0.12 + Math.sin(time * 0.8 + side) * 0.025})`);
        aura.addColorStop(0.4, 'rgba(255,204,0,0.045)');
        aura.addColorStop(1, 'rgba(255,204,0,0)');
        ctx.fillStyle = aura;
        ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();

        for (let lane = 0; lane < 6; lane++) {
          const unfold = smooth((p - 0.32 - lane * 0.014) / 0.24);
          const reach = smooth((p - 0.31 - lane * 0.012) / 0.13);
          const phase = time * 0.85 + lane * 0.66 + side * 0.4;
          const point = (t: number) => {
            const wave = Math.sin(t * 7.5 - phase) * 0.017 + Math.sin(t * 15 + phase * 0.7) * 0.006;
            const foldedX = 0.008 + t * 0.045 + Math.sin(t * Math.PI) * 0.04;
            const edgeX = 0.437 + Math.sin(t * Math.PI) * 0.036 + (lane - 2.5) * 0.007 + wave;
            const spread = unfold * (0.7 + 0.3 * smooth(t * 2));
            return {
              x: width * (0.5 + side * (foldedX * (1 - spread) + edgeX * spread)),
              y: height * ((0.73 - t * 0.18) * (1 - unfold) + (1.02 - t * 1.09 + Math.sin(t * 6 + phase) * 0.022) * unfold),
            };
          };
          const trace = (from: number, to: number) => {
            ctx.beginPath();
            for (let step = 0; step <= 48; step++) {
              const pointOnRibbon = point(from + (to - from) * step / 48);
              if (step === 0) ctx.moveTo(pointOnRibbon.x, pointOnRibbon.y);
              else ctx.lineTo(pointOnRibbon.x, pointOnRibbon.y);
            }
          };
          const start = point(0);
          const end = point(reach);
          const ribbon = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
          ribbon.addColorStop(0, 'rgba(255,204,0,0)');
          ribbon.addColorStop(0.25, 'rgba(255,204,0,0.3)');
          ribbon.addColorStop(0.65, 'rgba(255,204,0,0.65)');
          ribbon.addColorStop(1, 'rgba(255,204,0,0)');
          trace(0, reach);
          ctx.strokeStyle = ribbon;
          ctx.lineWidth = 6 + Math.sin(phase) * 2;
          ctx.globalAlpha = 0.1;
          ctx.stroke();
          ctx.globalAlpha = 0.75;
          ctx.lineWidth = lane % 3 === 0 ? 1.5 : 0.8;
          ctx.stroke();

          // A short luminous crest travels along each changing ribbon, never blinking.
          const head = (time * 0.16 + lane * 0.17 + (side + 1) * 0.13) % 1;
          const tail = Math.max(0, head - 0.2);
          const from = point(tail * reach);
          const to = point(head * reach);
          const crest = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
          crest.addColorStop(0, 'rgba(255,204,0,0)');
          crest.addColorStop(0.75, 'rgba(255,228,125,0.95)');
          crest.addColorStop(1, 'rgba(255,204,0,0)');
          trace(tail * reach, head * reach);
          ctx.strokeStyle = crest;
          ctx.lineWidth = 2.2;
          ctx.globalAlpha = Math.sin(head * Math.PI);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      frame = requestAnimationFrame(draw);
    };
    const wake = () => {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const resize = new ResizeObserver(() => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      wake();
    });
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      wake();
    });
    resize.observe(canvas);
    visibility.observe(canvas);
    const unsubscribe = progress.on('change', wake);
    document.addEventListener('visibilitychange', wake);
    wake();
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
      resize.disconnect();
      visibility.disconnect();
      document.removeEventListener('visibilitychange', wake);
    };
  }, [progress]);

  return <motion.div className="landing-hero-trails" aria-hidden="true" style={{ opacity }}>
    <canvas ref={canvasRef} />
  </motion.div>;
};
