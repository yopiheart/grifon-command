import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { funnelConfig } from './funnel.config';
import { applyBrand } from './theme/brand';
import { Ops } from './pages/Ops';
import './index.css';

// Ang ikatlong MPA entry. Panloob na page, kaya dalawang bagay ang SINADYANG
// wala dito, hindi nakalimutan:
//
//   initPixel        — hindi customer si Zam. Ang PageView mula sa talaan nya
//                      ay nagpapataba ng bilang na ginagamit natin sa pag-
//                      optimize, at tuturuan nito si Meta na maghanap ng mga
//                      taong kamukha nya sa halip na kamukha ng bumibili.
//   applyDocumentMeta — nakalimbag na sa ops.html ang pamagat, at may
//                      `noindex` sya. Walang OG tags: walang link preview ang
//                      isang page na may pangalan at numero ng totoong tao.
//
// Ang brand lang ang inaangkat, kaya iisang mundo pa rin sya ng landing page.
applyBrand(funnelConfig.brand);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Ops />
  </StrictMode>
);
