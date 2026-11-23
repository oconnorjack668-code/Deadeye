// __tests__/share-sheet.test.tsx
// The share sheet (D7): the card is previewed before anything leaves the
// phone, and the player's name is off until they turn it on.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ShareCardButton, cardUrl } from '@/components/ShareCardButton';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => ({ ok: true, status: 200, blob: async () => new Blob(['png'], { type: 'image/png' }) }));
  vi.stubGlobal('fetch', fetchMock);
  // jsdom has neither
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
  URL.createObjectURL = vi.fn(() => 'blob:card');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const cardFetches = () => fetchMock.mock.calls.map((c) => String(c[0])).filter((u) => u.startsWith('/api/share/'));

describe('cardUrl', () => {
  it('adds the name only when asked, and the feed size only when picked', () => {
    expect(cardUrl('/api/share/session?id=abc', { showName: false, size: 'story' })).toBe('/api/share/session?id=abc');
    expect(cardUrl('/api/share/session?id=abc', { showName: true, size: 'feed' })).toBe('/api/share/session?id=abc&name=1&format=feed');
    // a caller's own name=1 cannot switch the name on
    expect(cardUrl('/api/share/rank?name=1', { showName: false, size: 'story' })).toBe('/api/share/rank');
  });
});

describe('share sheet', () => {
  it('opens with the name switched off and previews the card without it', async () => {
    render(<ShareCardButton path="/api/share/session?id=abc" text="6/10" label="Share this result" variant="quiet" />);
    fireEvent.click(screen.getByRole('button', { name: 'Share this result' }));

    const nameSwitch = screen.getByRole('switch', { name: /show my name/i }) as HTMLInputElement;
    expect(nameSwitch.checked).toBe(false);
    await screen.findByRole('img', { name: 'Preview of your share card, no name on it' });
    expect(cardFetches()).toEqual(['/api/share/session?id=abc']);
  });

  it('fetches the card with the first name only after the player turns the switch on', async () => {
    render(<ShareCardButton path="/api/share/session?id=abc" text="6/10" />);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await screen.findByRole('img', { name: /^Preview of your share card/ });

    fireEvent.click(screen.getByRole('switch', { name: /show my name/i }));
    await waitFor(() => expect(cardFetches()).toContain('/api/share/session?id=abc&name=1'));
  });

  it('turns the name back off every time the sheet is opened on a new screen', async () => {
    const first = render(<ShareCardButton path="/api/share/rank" text="rank" />);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    fireEvent.click(screen.getByRole('switch', { name: /show my name/i }));
    first.unmount();

    render(<ShareCardButton path="/api/share/rank" text="rank" />);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect((screen.getByRole('switch', { name: /show my name/i }) as HTMLInputElement).checked).toBe(false);
  });

  it('saves the image when the phone cannot share files', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<ShareCardButton path="/api/share/session?id=abc" text="6/10" />);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await screen.findByRole('img', { name: /^Preview of your share card/ });
    fireEvent.click(screen.getByRole('button', { name: 'Save image' }));
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});

describe('share sheet name default', () => {
  it('turns the name off again each time the sheet opens', async () => {
    render(<ShareCardButton path="/api/share/session?id=abc" text="6/10" />);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    fireEvent.click(screen.getByRole('switch', { name: /show my name/i }));
    expect((screen.getByRole('switch', { name: /show my name/i }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect((screen.getByRole('switch', { name: /show my name/i }) as HTMLInputElement).checked).toBe(false);
  });
});
