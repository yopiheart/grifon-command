import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { funnelConfig } from './funnel.config';
import { applyBrand } from './theme/brand';
import { applyDocumentMeta } from './lib/documentMeta';
import { initPixel } from './lib/pixel';
import { ThankYou } from './pages/ThankYou';
import './index.css';

// The second MPA entry. Same boot sequence as the landing page; the `Lead`
// conversion event itself fires from inside ThankYou, once, on mount.
applyBrand(funnelConfig.brand);
applyDocumentMeta(funnelConfig.meta, 'Thank you');
initPixel(funnelConfig.tracking.metaPixelId);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThankYou config={funnelConfig} />
  </StrictMode>
);
