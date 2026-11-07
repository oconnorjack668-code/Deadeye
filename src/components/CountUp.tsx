// src/components/CountUp.tsx
'use client';

import React, { useEffect, useState } from 'react';

const DURATION_MS = 700;
/** The app's easing (globals.css --ease-deadeye), as a function: ease-out cubic */
const ease = (t: number) => 1 - (1 - t) ** 3;

/**
 * A number that counts up to its value once, for the moment a session is
 * saved: the result arriving rather than just being there. Shows the final
 * number straight away for anyone who asked their phone to reduce motion,
 * and on every later visit (animate false).
 */
export function CountUp({ value, suffix = '', animate = true }: { value: number; suffix?: string; animate?: boolean }) {
  const [shown, setShown] = useState(animate ? 0 : value);

  useEffect(() => {
    const still = !animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = still ? 1 : Math.min(1, (now - start) / DURATION_MS);
      setShown(Math.round(value * ease(t)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, animate]);

  return (
    <span className="tabular-nums">
      {shown}
      {suffix}
    </span>
  );
}
