import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { funnelConfig } from './funnel.config';
import { applyBrand } from './theme/brand';
import { applyDocumentMeta } from './lib/documentMeta';
import { initPixel } from './lib/pixel';
import { Landing } from './pages/Landing';
import './index.css';

// Brand + head are applied BEFORE render so there is no flash of template
// defaults on a re-skinned funnel. The pixel is a no-op unless configured.
applyBrand(funnelConfig.brand);
applyDocumentMeta(funnelConfig.meta);
initPixel(funnelConfig.tracking.metaPixelId);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Landing config={funnelConfig} />
  </StrictMode>
);
