// src/lib/film/youtubePlayer.ts
// The YouTube IFrame Player API, wrapped behind a small FilmVideo interface
// so the film player can pause at a question, seek back and change speed,
// and so tests can hand it a fake video instead.
//
// Nothing here runs before the player taps play: FilmClipPlayer only calls
// createYouTubeFilmVideo after the tap, and that is the first time the API
// script (from www.youtube.com) is fetched. The iframe itself is built by
// youtubeEmbedUrl from the stored video id, on youtube-nocookie.com, and the
// API attaches to that existing iframe (S27; plan section 8, rule 6).

export interface FilmVideo {
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
  /** Seconds from the start of the whole video, not the clip. */
  currentTime(): number;
  setRate(rate: number): void;
  /** The speeds this video offers, slowest first; always includes 1. */
  rates(): number[];
  destroy(): void;
}

export interface FilmVideoHandlers {
  onEnded(): void;
  /** A YouTube error code: 100 removed or private, 101 and 150 not allowed in other apps. */
  onError(code: number): void;
}

export type CreateFilmVideo = (iframe: HTMLIFrameElement, handlers: FilmVideoHandlers) => Promise<FilmVideo>;

/** The part of window.YT this file uses. */
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  setPlaybackRate(rate: number): void;
  getAvailablePlaybackRates(): number[];
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    el: HTMLIFrameElement,
    options: { events: { onReady?: () => void; onStateChange?: (e: { data: number }) => void; onError?: (e: { data: number }) => void } }
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_SRC = 'https://www.youtube.com/iframe_api';
/** YouTube's "ended" player state. */
const ENDED = 0;
/** Long enough for a slow phone connection, short enough that a blocked script says so. */
const LOAD_TIMEOUT_MS = 15000;

let apiPromise: Promise<YTNamespace> | null = null;

/** Fetches the API script once, on first use, and resolves when YouTube says it is ready. */
export function loadYouTubeIframeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      apiPromise = null;
      reject(new Error('The YouTube player did not load'));
    }, LOAD_TIMEOUT_MS);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      window.clearTimeout(timer);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('The YouTube player did not load'));
    };
    const script = document.createElement('script');
    script.src = API_SRC;
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timer);
      apiPromise = null;
      reject(new Error('The YouTube player did not load'));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

/** The real FilmVideo: the IFrame API attached to an iframe that is already on the page. */
export const createYouTubeFilmVideo: CreateFilmVideo = async (iframe, handlers) => {
  const YT = await loadYouTubeIframeApi();
  return new Promise<FilmVideo>((resolve) => {
    const player: YTPlayer = new YT.Player(iframe, {
      events: {
        onReady: () =>
          resolve({
            play: () => player.playVideo(),
            pause: () => player.pauseVideo(),
            seekTo: (s) => player.seekTo(s, true),
            currentTime: () => player.getCurrentTime() || 0,
            setRate: (r) => player.setPlaybackRate(r),
            rates: () => {
              const list = player.getAvailablePlaybackRates();
              return list?.length ? list : [1];
            },
            destroy: () => player.destroy(),
          }),
        onStateChange: (e) => {
          if (e.data === ENDED) handlers.onEnded();
        },
        onError: (e) => handlers.onError(e.data),
      },
    });
  });
};

/** What to tell the player when YouTube cannot play the clip. */
export function videoErrorMessage(code: number): string {
  if (code === 101 || code === 150) return 'The channel no longer lets this video play inside other apps. Try another clip.';
  if (code === 100) return 'This video has been removed from YouTube. Try another clip.';
  return 'The video could not play. Check your connection and try again.';
}

/** The speeds offered: what the video allows, kept to a sensible range for studying a play. */
export function speedChoices(available: number[]): number[] {
  const wanted = [0.25, 0.5, 0.75, 1];
  const list = wanted.filter((r) => available.includes(r));
  return list.length ? list : [1];
}
