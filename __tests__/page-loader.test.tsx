// __tests__/page-loader.test.tsx
// The loading pill's slogan: the visit's line on the first pill of a load,
// then a different line on each pill after that, never changing while shown.
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PageLoader, nextLoaderSlogan, resetLoaderSlogan } from '@/components/brand/PageLoader';
import { SHORT_SLOGANS } from '@/lib/slogans';

beforeEach(() => {
  resetLoaderSlogan();
  document.documentElement.setAttribute('data-sl', '3');
});

describe('the loading pill slogan', () => {
  it("starts on the visit's line, then moves on each time", () => {
    expect(nextLoaderSlogan()).toBe(3);
    expect(nextLoaderSlogan()).toBe(4);
    const seen = new Set<number>();
    for (let i = 0; i < SHORT_SLOGANS.length; i++) seen.add(nextLoaderSlogan());
    expect(seen.size).toBe(SHORT_SLOGANS.length); // every line gets a turn
  });

  it('shows a different line on the next pill', () => {
    const first = render(<PageLoader />);
    const a = SHORT_SLOGANS[3].text;
    expect(screen.getByText(a)).toBeTruthy();
    first.unmount();
    render(<PageLoader />);
    expect(screen.queryByText(a)).toBeNull();
    expect(screen.getByText(SHORT_SLOGANS[4].text)).toBeTruthy();
  });
});
