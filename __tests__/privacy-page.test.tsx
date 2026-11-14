// __tests__/privacy-page.test.tsx
// The privacy page has to stay true. It used to say Deadeye "only uses the
// cookies needed to keep you logged in" while lesson videos loaded YouTube's
// player (S27). It now names YouTube and says what YouTube gets, and when.
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

import PrivacyPage from '@/app/privacy/page';

describe('the privacy page', () => {
  it('names YouTube and Google, what they receive, and that it is only after tapping play', () => {
    render(<PrivacyPage />);

    const section = screen.getByRole('heading', { name: 'Cookies and videos' }).closest('section')!;
    const text = section.textContent ?? '';
    expect(text).toMatch(/Deadeye's own cookies are only there to keep you logged in/);
    expect(text).toMatch(/play from YouTube, which is owned by Google/);
    expect(text).toMatch(/Nothing loads from YouTube until you tap play/);
    expect(text).toMatch(/IP address/);
    expect(text).toMatch(/may store data on your device/);
    expect(screen.getByRole('link', { name: "Google's privacy policy" }).getAttribute('href')).toBe('https://policies.google.com/privacy');
  });

  it('no longer says Deadeye only uses login cookies as if nothing else stored data', () => {
    const { container } = render(<PrivacyPage />);
    expect(container.textContent).not.toMatch(/only uses the cookies needed to keep you logged in/);
  });

  it('lists YouTube with the other companies that receive data', () => {
    render(<PrivacyPage />);
    const list = screen.getByRole('heading', { name: 'Who processes it' }).closest('section')!;
    expect(list.textContent).toMatch(/YouTube, which is owned by Google, plays the lesson, drill and exercise videos and the film clips, and only\s+when you tap play/);
  });

  it('says what Film keeps, that notes are private, and that head coaches see done and score, never the answers (F3)', () => {
    const { container } = render(<PrivacyPage />);
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toMatch(/Film: the clips you save, your notes on clips \(only you can ever see them\)/);
    expect(text).toMatch(/film clip or pack a head coach sets: they see whether you answered its questions and your score/);
    expect(text).toMatch(/never which answers you picked/);
    expect(text).toMatch(/nobody but you sees your notes on clips/);
    expect(text).toMatch(/film clips play from YouTube/);
  });
});
