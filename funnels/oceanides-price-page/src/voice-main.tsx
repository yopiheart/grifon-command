import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { funnelConfig } from './funnel.config';
import { applyBrand } from './theme/brand';
import { VoiceLab } from './voice-lab/VoiceLab';
import './index.css';
import './voice-lab/voice-lab.css';

// The lab imports brand values only. No production page, tracking, or lead bootstrap.
applyBrand(funnelConfig.brand);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VoiceLab />
  </StrictMode>,
);
