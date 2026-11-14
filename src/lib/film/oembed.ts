// src/lib/film/oembed.ts
// SERVER: before the owner saves a film clip, ask YouTube whether the video
// may be played inside other sites. YouTube's oEmbed endpoint answers 200 for
// a public video that allows embedding, and 401 or 403 when the channel has
// switched embedding off; 404 means private or removed. Anything but 200 is a
// refusal, so a clip that would show "Video unavailable" is never saved
// (plan section 6). It needs no key and sends nothing about any player.

export type EmbedCheck = { ok: true; title: string; channel: string } | { ok: false; reason: string };

const TIMEOUT_MS = 8000;

export function oembedUrl(videoId: string): string {
  const watch = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  return `https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`;
}

export async function checkEmbeddable(videoId: string, fetchImpl: typeof fetch = fetch): Promise<EmbedCheck> {
  let res: Response;
  try {
    res = await fetchImpl(oembedUrl(videoId), { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    return { ok: false, reason: 'YouTube did not answer. Check the connection and try again.' };
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, reason: 'The channel does not allow this video to play in other apps. Pick another video.' };
  }
  if (res.status === 404) return { ok: false, reason: 'YouTube could not find that video. It may be private or removed.' };
  if (res.status !== 200) return { ok: false, reason: `YouTube did not confirm the video (status ${res.status}). Try again.` };
  try {
    const body = (await res.json()) as { title?: unknown; author_name?: unknown };
    return {
      ok: true,
      title: typeof body.title === 'string' ? body.title : '',
      channel: typeof body.author_name === 'string' ? body.author_name : '',
    };
  } catch {
    return { ok: false, reason: 'YouTube sent back something unexpected. Try again.' };
  }
}
