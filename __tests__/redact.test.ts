// @vitest-environment node
// __tests__/redact.test.ts
// Reports copied for support-triage keep the bug and lose the player.
import { describe, it, expect } from 'vitest';
import { redact, reportsForAgents } from '@/lib/redact';

const NAMES = ['Sam Murphy', 'Sam', 'Aoife', 'Player', 'Al'];

describe('redact', () => {
  it('takes out emails, links, handles, ids and phone numbers', () => {
    expect(redact('mail me at sam.m+1@gmail.com or 087 123 4567', [])).toBe('mail me at [email] or [number]');
    expect(redact('see https://tiktok.com/@x and www.site.ie', [])).toBe('see [link] and [link]');
    expect(redact('my insta is @sam_hoops', [])).toBe('my insta is [handle]');
    expect(redact('user 6f22fc5a-0bbb-41eb-96cc-ddee1ed5666d broke', [])).toBe('user [id] broke');
  });

  it('takes out player names, whole words only, and keeps the bug', () => {
    expect(redact('Hi its Sam Murphy, the tracker missed 3 shots', NAMES)).toBe('Hi its [name], the tracker missed 3 shots');
    expect(redact('aoife and SAM both saw it', NAMES)).toBe('[name] and [name] both saw it');
    // Not inside other words, and short or default names are left alone
    expect(redact('Samples load slowly for every player', NAMES)).toBe('Samples load slowly for every player');
    expect(redact('the ball always bounces', NAMES)).toBe('the ball always bounces');
  });
});

describe('reportsForAgents', () => {
  it('lists reports and crashes with pages and counts, redacted', () => {
    const text = reportsForAgents(
      '2026-10-22',
      [{ created_at: '2026-10-21T10:00:00Z', message: 'Aoife here, save button does nothing', context: 'email aoife@x.ie', page: '/basketball/new', device: 'iPhone/iPad' }],
      [{ message: 'TypeError: x is undefined', count: 4, players: 2, pages: ['/video'] }],
      NAMES
    );
    expect(text).toContain('### 1. 2026-10-21 · /basketball/new · iPhone/iPad');
    expect(text).toContain('[name] here, save button does nothing');
    expect(text).toContain('Context: email [email]');
    expect(text).toContain('- 4× from 2 players on /video: TypeError: x is undefined');
    expect(text).not.toMatch(/Aoife|aoife@/);
  });
});

describe('holding back what could still say who someone is', () => {
  const held = (message: string) =>
    reportsForAgents('2026-10-22', [{ created_at: '2026-10-21T10:00:00Z', message, context: null, page: '/p', device: 'Android' }], [], NAMES);

  it('passes an ordinary bug report through whole', () => {
    const text = held('The Save button on Log shots does nothing on my iPhone. I tapped MAKE twice and Undo broke.');
    expect(text).toContain('The Save button on Log shots does nothing on my iPhone.');
    expect(text).not.toContain('Held back');
  });

  it('holds back a school, a class year, a town or county, an address or an unknown name', () => {
    for (const message of [
      'the tracker broke at training in St Peters College',
      'me and my mates in 3rd year cant log in',
      'happened in Gorey on the outdoor court',
      'cant see my friends from wexford',
      'my eircode is Y25 AB12 for the parcel',
      'my coach Declan said to report it',
    ]) {
      const text = held(message);
      expect(text, message).toContain('Held back');
      expect(text, message).not.toContain(message);
    }
  });

  it('takes out ages but keeps the report', () => {
    expect(redact("i'm 14 and the quiz froze", [])).toBe("i'm [age] and the quiz froze");
    expect(redact('im 13 years old', [])).toBe('im [age]');
  });

  it('does not hold back a crash for its code words, only for a place or school', () => {
    const crash = (message: string) => reportsForAgents('2026-10-22', [], [{ message, count: 1, players: 1, pages: ['/video'] }], NAMES);
    expect(crash("TypeError: Cannot read properties of undefined (reading 'Shots')")).toContain("TypeError: Cannot read properties");
    expect(crash('Failed to load team Wexford Blazers')).toContain('held back');
  });
});
