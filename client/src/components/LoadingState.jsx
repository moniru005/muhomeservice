import React from 'react';
export default function LoadingState({ label = 'লোড হচ্ছে…' }) {
  return <div className="loading-state" role="status" aria-live="polite">{label}</div>;
}
