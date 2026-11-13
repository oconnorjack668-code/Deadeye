// src/components/video/TapToLoadYouTube.tsx
// A YouTube video that stays off the page until the player taps play.
//
// YouTube's player sends the viewer's IP address and device details to YouTube
// and stores data on the device as soon as it loads, even on youtube-nocookie
// and even if nothing is ever played. Players here start at 13, so nothing is
// fetched from YouTube or Google before the tap: no player, no thumbnail from
// i.ytimg.com, no preconnect. The card says where the video plays from, so
// tapping is the player's own choice (S27; docs/plans/film-and-plays.md §8).
//
// Every YouTube video in the app goes through this component. The address is
// only ever built by youtubeEmbedUrl from a stored video id, never from a link.
'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isRealYoutubeId, youtubeEmbedUrl } from '@/lib/video/youtube';

interface TapToLoadYouTubeProps {
  /** The stored 11-character YouTube video id. */
  id: string;
  /** What the video is, for screen readers: the lesson, drill or clip name. */
  title: string;
  /** Seconds to start at, for a clip cut from a longer video. */
  start?: number;
  /** Seconds to stop at. */
  end?: number;
  /** Extra classes for the frame, for example `rounded-2xl` outside a card. */
  className?: string;
}

export function TapToLoadYouTube({ id, title, start, end, className }: TapToLoadYouTubeProps) {
  const [loaded, setLoaded] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const noteId = useId();

  // The play button is gone once the player loads; without this, keyboard and
  // screen-reader focus would drop back to the top of the page.
  useEffect(() => {
    if (loaded) frame.current?.focus();
  }, [loaded]);

  if (!isRealYoutubeId(id)) return null;

  // bg-black keeps this dark in the light theme too, like every video area.
  // YouTube requires its player to be at least 200px tall; 16:9 inside a card
  // on a phone comes out near 180px, so the frame never goes below 200.
  const shell = cn('aspect-video min-h-[200px] w-full overflow-hidden rounded-xl border border-zinc-800 bg-black', className);

  if (loaded) {
    return (
      <div className={shell}>
        <iframe
          ref={frame}
          src={youtubeEmbedUrl(id, { start, end, autoplay: true, captions: true })}
          title={title}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <div className={shell}>
      {/* The whole frame is the button, so the target is far past 44px */}
      <button
        type="button"
        onClick={() => setLoaded(true)}
        aria-label={`Play video: ${title}`}
        aria-describedby={noteId}
        className="group flex h-full w-full flex-col items-center justify-center gap-3 rounded-[inherit] p-4 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500"
      >
        <span className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800 px-4 text-sm font-medium text-zinc-100 transition-colors duration-150 group-hover:bg-zinc-700 group-active:bg-zinc-900">
          <Play className="h-5 w-5" aria-hidden="true" />
          Play video
        </span>
        <span id={noteId} className="max-w-xs text-sm text-zinc-400">
          This plays from YouTube; YouTube sees that you watched it.
        </span>
      </button>
    </div>
  );
}
