// src/components/AuthBrand.tsx
// The logo block above every sign-up, sign-in and password card (polish round,
// docs/agent-os/design/2026-11-22-polish.md). Red is the brand, so the slogan
// stays red; the page itself is plain black with one soft glow on the logo.
import React from 'react';
import { Logo } from '@/components/Logo';

export function AuthBrand({ slogan = true }: { slogan?: boolean }) {
  return (
    <div className="mb-6 flex flex-col items-center text-center">
      <div className="mb-3 rounded-full shadow-[0_0_48px_rgba(220,38,38,0.35)]">
        <Logo size={56} />
      </div>
      <h1 className="text-2xl font-black uppercase tracking-tight text-white">Deadeye</h1>
      {slogan && <p className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Aim is earned</p>}
    </div>
  );
}
