import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { funnelConfig } from './funnel.config';
import { applyBrand } from './theme/brand';
import { Presyo } from './pages/Presyo';
import './index.css';

// Ang ikaapat na MPA entry: ang presyo cheat sheet nina Zam at Ejay.
// Kapareho ng ops-main: walang initPixel (hindi customer si Zam) at walang
// documentMeta (nakalimbag na sa presyo.html ang pamagat, may noindex sya).
applyBrand(funnelConfig.brand);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Presyo />
  </StrictMode>
);
