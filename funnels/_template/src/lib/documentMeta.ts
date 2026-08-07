import type { FunnelConfig } from '../config.types';

// The HTML entries ship neutral placeholder <title>/<meta> so the files stay
// funnel-agnostic; the real values come from config at boot, before render.

const setMeta = (attr: 'name' | 'property', key: string, content: string): void => {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

export const applyDocumentMeta = (meta: FunnelConfig['meta'], titleSuffix?: string): void => {
  // `·` hindi em dash: lumalabas ang title sa browser tab, kaya user-facing sya
  // at sakop ng typography rule (taglish-voice.md). Naayos na to sa paolo at sa
  // price-page noon pa, hindi lang nakabalik dito sa template.
  const title = titleSuffix ? `${titleSuffix} · ${meta.title}` : meta.title;
  document.title = title;
  setMeta('name', 'description', meta.description);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', meta.description);
  if (meta.ogImage) setMeta('property', 'og:image', meta.ogImage);
};
