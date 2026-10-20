import React from 'react';
import { Home } from 'lucide-react';

/** Single-company mark shared by public and dashboard layouts. */
export default function BrandMark({ size = 22, className = '' }) {
  return <span className={`brand-mark ${className}`.trim()} aria-label="MU Home Service"><Home size={size} /><span className="brand-dot" /></span>;
}
