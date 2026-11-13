// src/lib/video/youtube.ts
// Deciding whether a study lesson has a real video behind it.
//
// study_items.youtube_video_id exists for every lesson, but migration 00012
// seeded the newer lessons with the literal string 'placeholder' and the page
// sent players to a YouTube *search* for the lesson title instead - out of the
// app, onto whatever happens to rank. Curated lessons should play in place;
// only the uncurated ones should fall back to a search.

/** Values that mean "no video has been chosen for this lesson yet". */
const NOT_A_VIDEO = new Set(['', 'placeholder', 'tbd', 'none', 'null']);

/** A YouTube id is exactly 11 characters of [A-Za-z0-9_-]. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export function isRealYoutubeId(id: string | null | undefined): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  if (NOT_A_VIDEO.has(trimmed.toLowerCase())) return false;
  return YOUTUBE_ID.test(trimmed);
}

export interface YoutubeEmbedOptions {
  /** Seconds into the video to start at (a film clip). */
  start?: number;
  /** Seconds into the video to stop at. Ignored unless it is after the start. */
  end?: number;
  /** Start playing at once. Only for a player the viewer has just tapped to load. */
  autoplay?: boolean;
  /** Show captions without the viewer having to switch them on. */
  captions?: boolean;
}

/**
 * Privacy-enhanced embed: youtube-nocookie does not set tracking cookies until
 * the viewer actually plays something, which matters for an app whose users
 * start at 13. Even so, the player itself sends the viewer's IP address and
 * device details to YouTube as soon as it loads, so it is only ever put on a
 * page by TapToLoadYouTube, after the viewer taps play.
 */
export function youtubeEmbedUrl(id: string, options: YoutubeEmbedOptions = {}): string {
  const base = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id.trim())}`;
  const params = new URLSearchParams();
  if (options.autoplay) params.set('autoplay', '1');
  if (options.captions) params.set('cc_load_policy', '1');
  const start = wholeSeconds(options.start);
  const end = wholeSeconds(options.end);
  if (start > 0) params.set('start', String(start));
  // An end at or before the start would play nothing
  if (end > start) params.set('end', String(end));
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

/** YouTube takes whole seconds; anything that is not a time counts as 0 (unset). */
function wholeSeconds(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/**
 * The video id from anything the owner might paste in Owner tools: a watch
 * link, a youtu.be share link, a Shorts or embed link, or the bare id. Null if
 * it is not a YouTube video, so nothing else can ever be stored or embedded.
 */
export function youtubeIdFromLink(input: string): string | null {
  const text = input.trim();
  if (YOUTUBE_ID.test(text)) return text;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else {
      const [, kind, value] = url.pathname.split('/');
      if (kind === 'shorts' || kind === 'embed' || kind === 'live' || kind === 'v') id = value ?? null;
    }
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}
