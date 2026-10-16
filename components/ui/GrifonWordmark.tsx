import React from 'react';
import '../../assets/fonts/oxanium/oxanium.css';
import './grifonWordmark.css';

export const GrifonWordmark: React.FC<{ children?: string; className?: string }> = ({
  children = 'GRIFON',
  className = 'text-xl',
}) => (
  <span className={`grifon-wordmark ${className}`}>{children}</span>
);
