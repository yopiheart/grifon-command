import { useEffect, useId, type RefObject } from 'react';

const namespace = 'http://www.w3.org/2000/svg';
const selector = '[data-companion-glass]';
const property = '--companion-lens-filter';

interface LensRecord {
  filter: SVGFilterElement;
  width: number;
  height: number;
  radius: number;
}

function svgNode<K extends keyof SVGElementTagNameMap>(name: K, attributes: Record<string, string | number>) {
  const node = document.createElementNS(namespace, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function roundedDistance(x: number, y: number, width: number, height: number, radius: number) {
  const qx = Math.abs(x - width / 2) - (width / 2 - radius);
  const qy = Math.abs(y - height / 2) - (height / 2 - radius);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

export function useCompanionGlass(root: RefObject<HTMLElement | null>, enabled = true) {
  const scope = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  useEffect(() => {
    const container = root.current;
    if (!enabled || !container || typeof ResizeObserver === 'undefined' || !document.body) return;
    const canvas = document.createElement('canvas');
    let context: CanvasRenderingContext2D | null;
    try { context = canvas.getContext('2d'); } catch { return; }
    if (!context) return;

    const preferences = typeof window.matchMedia === 'function' ? [
      '(prefers-reduced-transparency: reduce)',
      '(prefers-contrast: more), (prefers-contrast: less), (prefers-contrast: custom)',
      '(forced-colors: active)',
    ].map(query => window.matchMedia(query)) : [];
    const blocked = () => preferences.some(preference => preference.matches);
    const optics = svgNode('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' });
    optics.style.cssText = 'position:absolute;overflow:hidden;pointer-events:none';
    const definitions = svgNode('defs', {});
    optics.append(definitions);
    document.body.append(optics);
    const observed = new Set<HTMLElement>();
    const records = new Map<HTMLElement, LensRecord>();
    const pending = new Set<HTMLElement>();
    let frame = 0;
    let nextId = 0;
    let disposed = false;

    const clear = (element: HTMLElement) => {
      pending.delete(element);
      records.get(element)?.filter.remove();
      records.delete(element);
      element.style.removeProperty(property);
    };
    const refresh = (element: HTMLElement) => {
      if (disposed || blocked() || !observed.has(element)) return;
      const box = element.getBoundingClientRect();
      const width = Math.round(box.width), height = Math.round(box.height);
      if (width < 2 || height < 2) { clear(element); return; }
      const corner = getComputedStyle(element).borderTopLeftRadius;
      const parsedRadius = parseFloat(corner);
      const radius = Math.min(Number.isFinite(parsedRadius) ? parsedRadius * (corner.includes('%') ? Math.min(width, height) / 100 : 1) : 24, width / 2, height / 2);
      const previous = records.get(element);
      if (previous?.width === width && previous.height === height && previous.radius === radius) return;

      try {
        // Map pixels are bounded; the SVG stretches them to the measured surface.
        canvas.width = Math.min(256, width); canvas.height = Math.min(128, height);
        const map = context.createImageData(canvas.width, canvas.height);
        const edge = Math.min(15, Math.max(6, radius * .67));
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          const px = (x + .5) * width / canvas.width, py = (y + .5) * height / canvas.height;
          const inside = -roundedDistance(px, py, width, height, radius);
          let dx = 0, dy = 0;
          if (inside >= 0 && inside < edge) {
            const nx = roundedDistance(px + .5, py, width, height, radius) - roundedDistance(px - .5, py, width, height, radius);
            const ny = roundedDistance(px, py + .5, width, height, radius) - roundedDistance(px, py - .5, width, height, radius);
            const length = Math.hypot(nx, ny) || 1, progress = inside / edge;
            const bend = Math.pow(1 - progress, 1.7) * Math.sin(Math.min(1, progress * 3.8) * Math.PI / 2);
            dx = nx / length * bend; dy = ny / length * bend;
          }
          const at = (y * canvas.width + x) * 4;
          map.data[at] = Math.round(128 + dx * 126); map.data[at + 1] = Math.round(128 + dy * 126);
          map.data[at + 2] = 128; map.data[at + 3] = 255;
        }
        context.putImageData(map, 0, 0);
        const source = canvas.toDataURL('image/png');
        if (!/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(source)) { clear(element); return; }
        const id = previous?.filter.id ?? `companion-lens-${scope}-${nextId++}`;
        const filter = previous?.filter ?? svgNode('filter', { id, x: -18, y: -18, width: width + 36, height: height + 36,
          filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' });
        filter.setAttribute('width', String(width + 36)); filter.setAttribute('height', String(height + 36));
        filter.replaceChildren(
          svgNode('feImage', { href: source, x: 0, y: 0, width, height, preserveAspectRatio: 'none', result: 'edge-map' }),
          svgNode('feDisplacementMap', { in: 'SourceGraphic', in2: 'edge-map', scale: 18, xChannelSelector: 'R', yChannelSelector: 'G' }),
        );
        if (!previous) definitions.append(filter);
        records.set(element, { filter, width, height, radius });
        element.style.setProperty(property, `url(#${id})`);
      } catch { clear(element); }
    };
    const schedule = (element: HTMLElement) => {
      if (disposed || blocked() || !observed.has(element)) return;
      pending.add(element);
      if (frame) return;
      // Resize delivery only queues work; geometry and styles settle next frame.
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const surfaces = [...pending]; pending.clear();
        for (const surface of surfaces) refresh(surface);
      });
    };
    const resize = new ResizeObserver(entries => {
      for (const entry of entries) if (entry.target instanceof HTMLElement) schedule(entry.target);
    });
    const sync = () => {
      if (disposed) return;
      const surfaces = new Set(container.querySelectorAll<HTMLElement>(selector));
      for (const element of observed) if (!surfaces.has(element)) {
        resize.unobserve(element); observed.delete(element); clear(element);
      }
      for (const element of surfaces) if (!observed.has(element)) {
        observed.add(element); resize.observe(element); schedule(element);
      }
    };
    const preferenceChanged = () => {
      for (const element of observed) {
        clear(element);
        if (!blocked()) schedule(element);
      }
    };
    // Definitions live outside the observed root; style updates cannot retrigger this.
    const mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(sync);
    mutations?.observe(container, { childList: true, subtree: true });
    for (const preference of preferences) preference.addEventListener('change', preferenceChanged);
    sync();
    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      pending.clear();
      resize.disconnect(); mutations?.disconnect();
      for (const preference of preferences) preference.removeEventListener('change', preferenceChanged);
      for (const element of observed) clear(element);
      optics.remove();
    };
  }, [root, enabled, scope]);
}
