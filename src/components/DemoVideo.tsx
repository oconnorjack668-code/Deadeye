// src/components/DemoVideo.tsx
import React from 'react';
import { TapToLoadYouTube } from '@/components/video/TapToLoadYouTube';

/** A drill or exercise demo, played in the page. Nothing loads from YouTube until the player taps play. */
export function DemoVideo({ id, title }: { id: string; title: string }) {
  return <TapToLoadYouTube id={id} title={`${title} demo`} className="rounded-2xl" />;
}
