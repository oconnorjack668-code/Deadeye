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

  it('says what a competition entry keeps, why, and when it is deleted (00067)', () => {
    const { container } = render(<PrivacyPage />);
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toMatch(/founding competition: your entry, the feedback you write for it and, for players under 18, the parent or guardian's email/);
    expect(text).toMatch(/judge the competition, contact winners \(through a parent for under-18s\) and send the 25% offer/);
    expect(text).toMatch(/parent names and emails are deleted after the offer closes on 31 March 2027, and the entry list is deleted 6 months after that \(by 30 September 2027\)/);
    expect(text).toMatch(/they read entries with names hidden/);
    expect(text).toMatch(/For players under 18 the offer is emailed to their parent or guardian, not to them/);
    expect(text).toMatch(/Feedback, ideas and problem reports/);
  });

  it('names the Home screen (E6), the Today card taps and the other noted steps, and no longer says "No page tracking" (#126, S46)', () => {
    const { container } = render(<PrivacyPage />);
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toMatch(/which link you tap on the Today card \(log shots, track with the camera, or your program\)/);
    expect(text).toMatch(/Opening the Video AI page/);
    expect(text).toMatch(/Opening a play or a film clip on the IQ tab, finishing a play quiz or a film clip/);
    expect(text).toMatch(/saving a play you drew/);
    expect(text).toMatch(/A few steps you reach in the app, at most once a day each: [^.]*opening the Home screen before you have saved a shooting session/);
    expect(text).toMatch(/only to see where players get stuck so we can fix it/);
    expect(text).toMatch(/We record only the steps named here, not the other pages you open; no device details, nothing shared with anyone\./);
    expect(text).not.toMatch(/No page tracking/);
  });
});
