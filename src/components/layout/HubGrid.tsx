// src/components/layout/HubGrid.tsx
// Two columns on a laptop, one on a phone, from the same three pieces.
//
// The section pages were laid out for a phone and capped at 672-768px, so on
// a laptop they sat in a narrow strip with half the screen empty either side.
// From lg (1024px) up, the main column - what to do now, then the list - takes
// the width, and the side column carries the numbers and the shortcuts beside
// it. Below lg nothing changes: top, side, rest stack in that order, which is
// the order the pages always had.
import React from 'react';

/** The page container for a hub: phone width as before, wider from lg. */
export const HUB_CONTAINER = 'p-4 md:p-8 max-w-3xl lg:max-w-6xl mx-auto';

export function HubGrid({
  top,
  side,
  rest,
  sideLabel,
}: {
  /** The main action, first on a phone and at the top of the main column. */
  top: React.ReactNode;
  /** Numbers and shortcuts: under `top` on a phone, beside the main column on a laptop. */
  side: React.ReactNode;
  /** The list or detail: last on a phone, under `top` in the main column. */
  rest: React.ReactNode;
  /** Names the side column for screen readers. */
  sideLabel: string;
}) {
  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr] lg:gap-x-8">
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">{top}</div>
      <aside aria-label={sideLabel} className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        {side}
      </aside>
      <div className="min-w-0 lg:col-start-1 lg:row-start-2">{rest}</div>
    </div>
  );
}
