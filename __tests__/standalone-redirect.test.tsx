// __tests__/standalone-redirect.test.tsx
// The landing page is the website for everyone now, signed in or not. The one
// place it must not appear by itself is the installed app, which has to open
// on the dashboard - unless the website was opened from inside it on purpose.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

import { StandaloneRedirect } from '@/components/StandaloneRedirect';

function asInstalledApp(installed: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: installed && q === '(display-mode: standalone)',
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

describe('StandaloneRedirect', () => {
  beforeEach(() => {
    replace.mockClear();
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('leaves the website alone in a normal browser, signed in or not', () => {
    asInstalledApp(false);
    render(<StandaloneRedirect signedIn />);
    render(<StandaloneRedirect signedIn={false} />);
    expect(replace).not.toHaveBeenCalled();
  });

  it('opens the installed app on the dashboard, or on log in when signed out', () => {
    asInstalledApp(true);
    render(<StandaloneRedirect signedIn />);
    expect(replace).toHaveBeenLastCalledWith('/dashboard');
    render(<StandaloneRedirect signedIn={false} />);
    expect(replace).toHaveBeenLastCalledWith('/login');
  });

  it('shows the website inside the app when it was asked for from Settings', () => {
    asInstalledApp(true);
    window.history.replaceState(null, '', '/?site=1');
    render(<StandaloneRedirect signedIn />);
    expect(replace).not.toHaveBeenCalled();
  });
});
