// src/components/DemoVideo.tsx
import React from 'react';
import { youtubeEmbedUrl } from '@/lib/video/youtube';

/** A drill or exercise demo, played in the page. Loads only when scrolled to. */
export function DemoVideo({ id, title }: { id: string; title: string }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black">
      <iframe
        src={youtubeEmbedUrl(id)}
        title={`${title} demo`}
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}
