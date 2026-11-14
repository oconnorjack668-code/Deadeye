import { describe, it, expect } from 'vitest';
import { isRealYoutubeId, youtubeEmbedUrl, youtubeIdFromLink, youtubeSearchUrl } from '@/lib/video/youtube';

describe('isRealYoutubeId', () => {
  it('accepts a genuine 11-character id', () => {
    expect(isRealYoutubeId('dQw4w9WgXcQ')).toBe(true);
    expect(isRealYoutubeId('_-aBc123XYZ')).toBe(true);
  });

  it('rejects the seeded placeholder, which is what most lessons hold', () => {
    expect(isRealYoutubeId('placeholder')).toBe(false);
    expect(isRealYoutubeId('PLACEHOLDER')).toBe(false);
    expect(isRealYoutubeId('  placeholder  ')).toBe(false);
  });

  it('rejects other stand-in values', () => {
    for (const v of ['', 'tbd', 'none', 'null']) expect(isRealYoutubeId(v), v).toBe(false);
  });

  it('rejects null and undefined', () => {
    expect(isRealYoutubeId(null)).toBe(false);
    expect(isRealYoutubeId(undefined)).toBe(false);
  });

  it('rejects ids of the wrong length', () => {
    expect(isRealYoutubeId('tooshort')).toBe(false);
    expect(isRealYoutubeId('waytoolongforanid')).toBe(false);
  });

  it('rejects a full URL pasted into the column', () => {
    expect(isRealYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe(false);
  });

  it('rejects characters YouTube ids never contain', () => {
    expect(isRealYoutubeId('abc def1234')).toBe(false);
    expect(isRealYoutubeId('abc/def1234')).toBe(false);
  });
});

describe('youtubeEmbedUrl', () => {
  it('uses the no-cookie host, since the audience starts at 13', () => {
    expect(youtubeEmbedUrl('dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0');
  });

  it('trims whitespace from the stored id', () => {
    expect(youtubeEmbedUrl(' dQw4w9WgXcQ ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0');
  });
});

describe('youtubeEmbedUrl options', () => {
  const id = 'dQw4w9WgXcQ';
  const base = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';

  it('only turns off other channels suggestions when no option is set', () => {
    expect(youtubeEmbedUrl(id, {})).toBe(base + '?rel=0');
  });

  it('turns captions on and plays after the tap', () => {
    const url = new URL(youtubeEmbedUrl(id, { captions: true, autoplay: true }));
    expect(url.origin + url.pathname).toBe(base);
    expect(url.searchParams.get('cc_load_policy')).toBe('1');
    expect(url.searchParams.get('autoplay')).toBe('1');
  });

  it('starts and ends a clip at whole seconds', () => {
    const url = new URL(youtubeEmbedUrl(id, { start: 42.9, end: 61.2 }));
    expect(url.searchParams.get('start')).toBe('42');
    expect(url.searchParams.get('end')).toBe('61');
  });

  it('leaves out a start or end that makes no sense', () => {
    expect(youtubeEmbedUrl(id, { start: -5, end: Number.NaN })).toBe(base + '?rel=0');
    expect(youtubeEmbedUrl(id, { start: 0 })).toBe(base + '?rel=0');
    // An end at or before the start would play nothing
    expect(youtubeEmbedUrl(id, { start: 30, end: 30 })).toBe(base + '?rel=0&start=30');
    expect(youtubeEmbedUrl(id, { start: 30, end: 10 })).toBe(base + '?rel=0&start=30');
  });

  it('never leaves the no-cookie host, whatever the options', () => {
    const url = new URL(youtubeEmbedUrl(id, { start: 5, end: 9, captions: true, autoplay: true }));
    expect(url.hostname).toBe('www.youtube-nocookie.com');
  });
});

describe('youtubeSearchUrl', () => {
  it('escapes the query', () => {
    expect(youtubeSearchUrl('pick & roll reads')).toContain('pick%20%26%20roll%20reads');
  });
});

describe('youtubeIdFromLink', () => {
  const id = 'dQw4w9WgXcQ';

  it('reads every kind of link the owner might paste', () => {
    expect(youtubeIdFromLink(`https://www.youtube.com/watch?v=${id}&t=42s`)).toBe(id);
    expect(youtubeIdFromLink(`https://youtu.be/${id}?si=abc123`)).toBe(id);
    expect(youtubeIdFromLink(`https://m.youtube.com/watch?v=${id}`)).toBe(id);
    expect(youtubeIdFromLink(`https://www.youtube.com/shorts/${id}`)).toBe(id);
    expect(youtubeIdFromLink(`https://www.youtube-nocookie.com/embed/${id}`)).toBe(id);
    expect(youtubeIdFromLink(`youtube.com/watch?v=${id}`)).toBe(id);
    expect(youtubeIdFromLink(`  ${id}  `)).toBe(id);
  });

  it('refuses anything that is not a YouTube video', () => {
    expect(youtubeIdFromLink('https://vimeo.com/123456789')).toBeNull();
    expect(youtubeIdFromLink(`https://evil.example/watch?v=${id}`)).toBeNull();
    expect(youtubeIdFromLink('https://www.youtube.com/@somechannel')).toBeNull();
    expect(youtubeIdFromLink('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(youtubeIdFromLink('javascript:alert(1)')).toBeNull();
    expect(youtubeIdFromLink('')).toBeNull();
  });
});
