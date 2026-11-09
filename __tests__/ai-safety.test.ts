// __tests__/ai-safety.test.ts
// The support line under a coach reply must not depend on the AI model.
import { describe, it, expect } from 'vitest';
import { needsSupportLine, SUPPORT_LINE, withSupportLine } from '@/lib/ai/safety';

describe('needsSupportLine', () => {
  const flagged = [
    'honestly I want to kill myself after that game',
    'I have been self harming again',
    'sometimes I feel suicidal',
    'I want to die',
    'I keep cutting myself',
    'there is no point in living',
    'I am being bullied at training',
    'my coach touched me and I did not like it',
    'I am going to stop eating so I get lighter',
  ];
  for (const m of flagged) {
    it(`flags: "${m}"`, () => expect(needsSupportLine(m)).toBe(true));
  }

  const ordinary = [
    'how do I fix my elbow on my jump shot',
    'I killed it at practice today',
    'what drills help my left hand',
    'my shot is dead from the corner, any tips',
    'can I train if my ankle hurts a bit',
  ];
  for (const m of ordinary) {
    it(`leaves alone: "${m}"`, () => expect(needsSupportLine(m)).toBe(false));
  }
});

describe('withSupportLine', () => {
  it('adds Childline, 50808, Samaritans and 112/999 once, at the end', () => {
    const out = withSupportLine('I want to die', 'I am sorry you feel like this.');
    expect(out.endsWith(SUPPORT_LINE)).toBe(true);
    for (const n of ['1800 66 66 66', '50101', '50808', '116 123', '112']) expect(out).toContain(n);
  });

  it('does not repeat it if the reply already gives Childline', () => {
    const reply = 'Please call Childline on 1800 66 66 66.';
    expect(withSupportLine('I want to die', reply)).toBe(reply);
  });

  it('changes nothing for an ordinary question', () => {
    expect(withSupportLine('fix my free throw', 'Bend your knees.')).toBe('Bend your knees.');
  });
});
