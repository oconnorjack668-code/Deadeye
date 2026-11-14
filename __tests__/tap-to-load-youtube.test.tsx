// __tests__/tap-to-load-youtube.test.tsx
// A YouTube video must not reach YouTube until the player taps play (S27):
// no player, no thumbnail, nothing with an address on it before the tap.
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TapToLoadYouTube } from '@/components/video/TapToLoadYouTube';
import { DemoVideo } from '@/components/DemoVideo';

const ID = 'dQw4w9WgXcQ';

/** Anything in the markup that could make the browser fetch from somewhere. */
function thingsThatLoad(container: HTMLElement) {
  return container.querySelectorAll('iframe, img, picture, video, source, script, link, object, embed, [src], [srcset], [href], [style*="url("]');
}

describe('TapToLoadYouTube', () => {
  it('loads nothing from YouTube or Google before the tap', () => {
    const { container } = render(<TapToLoadYouTube id={ID} title="Help defence" />);

    expect(container.querySelector('iframe')).toBeNull();
    expect(thingsThatLoad(container)).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/youtube\.com|youtube-nocookie\.com|youtu\.be|ytimg\.com|ggpht\.com|google|gstatic/i);
    expect(container.innerHTML).not.toContain(ID);
  });

  it('says where the video plays from before the player chooses', () => {
    render(<TapToLoadYouTube id={ID} title="Help defence" />);

    const play = screen.getByRole('button', { name: 'Play video: Help defence' });
    const note = document.getElementById(play.getAttribute('aria-describedby') ?? '');
    expect(note?.textContent).toMatch(/This plays from YouTube; YouTube sees that you watched it/);
    // The words on the button are in its name, so voice control can find it
    expect(play.textContent).toContain('Play video');
  });

  it('loads the no-cookie player, with captions, only after the tap', () => {
    const { container } = render(<TapToLoadYouTube id={ID} title="Help defence" />);

    fireEvent.click(screen.getByRole('button', { name: /play video/i }));

    const frame = screen.getByTitle('Help defence') as HTMLIFrameElement;
    expect(frame.tagName).toBe('IFRAME');
    const src = new URL(frame.src);
    expect(src.origin + src.pathname).toBe(`https://www.youtube-nocookie.com/embed/${ID}`);
    expect(src.searchParams.get('cc_load_policy')).toBe('1');
    expect(src.searchParams.get('autoplay')).toBe('1');
    expect(src.searchParams.has('start')).toBe(false);
    // Only origin is sent to YouTube, never the page the player was on
    expect(frame.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
    expect(container.querySelectorAll('iframe')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /play video/i })).toBeNull();
  });

  it('works from the keyboard and keeps focus on the video', () => {
    render(<TapToLoadYouTube id={ID} title="Help defence" />);

    const play = screen.getByRole('button', { name: /play video/i });
    // A real <button>, so Enter and Space work without any key handling
    expect(play.tagName).toBe('BUTTON');
    expect(play.getAttribute('type')).toBe('button');
    play.focus();
    expect(document.activeElement).toBe(play);
    fireEvent.click(play);

    expect(document.activeElement).toBe(screen.getByTitle('Help defence'));
  });

  it('plays only the clip when given a start and end', () => {
    render(<TapToLoadYouTube id={ID} title="Closeout clip" start={42} end={61} />);

    fireEvent.click(screen.getByRole('button', { name: /play video/i }));

    const src = new URL((screen.getByTitle('Closeout clip') as HTMLIFrameElement).src);
    expect(src.searchParams.get('start')).toBe('42');
    expect(src.searchParams.get('end')).toBe('61');
  });

  it('shows nothing for an id that is not a YouTube video', () => {
    const { container } = render(<TapToLoadYouTube id="https://evil.example/x" title="Not a video" />);
    expect(container.innerHTML).toBe('');
  });
});

describe('DemoVideo (drills and exercises)', () => {
  it('waits for the tap too', () => {
    const { container } = render(<DemoVideo id={ID} title="Mikan drill" />);

    expect(container.querySelector('iframe')).toBeNull();
    expect(thingsThatLoad(container)).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Play video: Mikan drill demo' }));

    const frame = screen.getByTitle('Mikan drill demo') as HTMLIFrameElement;
    expect(new URL(frame.src).hostname).toBe('www.youtube-nocookie.com');
  });
});
