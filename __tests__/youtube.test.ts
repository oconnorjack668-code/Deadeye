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
    expect(youtubeEmbedUrl('dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('trims whitespace from the stored id', () => {
    expect(youtubeEmbedUrl(' dQw4w9WgXcQ ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
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
