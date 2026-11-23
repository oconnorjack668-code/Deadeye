// src/components/Logo.tsx
// The Deadeye ball from logo C (public/logo.webp, built by scripts/build-app-icons.mjs).
// Shown at 36-64px, so pages load the 256px WebP (6 KB, sharp on 3x screens) instead of
// the PNG (15 KB).
import React from 'react';

export function Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny pre-sized static asset, no optimisation needed
    <img
      src="/logo.webp"
      alt="Deadeye logo"
      width={size}
      height={size}
      className={`rounded-full shadow-lg shadow-black/40 ${className}`}
    />
  );
}
