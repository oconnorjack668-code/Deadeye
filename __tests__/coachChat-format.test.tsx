// __tests__/coachChat-format.test.tsx
// The chat itself, given a reply with headings and nested lists: what a player
// reads must have no raw Markdown in it.
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
import { CoachChat } from '@/app/(app)/ai-coach/chat/CoachChat';

const reply = `### Drills
1. **Spot Shooting**
   - Shoot 10 shots from each of the 5 spots.
- **Form Shooting**

### Cues to Focus On
- **Shooting Arc:** Aim for a higher arc.`;

describe('CoachChat reply formatting', () => {
  it('shows headings and list items without the Markdown marks', () => {
    // jsdom has no scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
    const { container } = render(
      <CoachChat initial={[{ id: '1', role: 'assistant', content: reply, created_at: '2026-10-20T00:00:00Z' }]} remaining={3} />
    );
    expect(screen.getByText('Drills')).toBeTruthy();
    expect(screen.getByText('Cues to Focus On')).toBeTruthy();
    expect(screen.getByText('Spot Shooting').tagName).toBe('STRONG');
    expect(screen.getByText('Shoot 10 shots from each of the 5 spots.')).toBeTruthy();
    const shown = container.textContent ?? '';
    expect(shown).not.toContain('#');
    expect(shown).not.toContain('**');
    expect(shown).not.toMatch(/(^|\n)\s*- /);
  });
});
