// __tests__/coachText.test.ts
// Coach replies are Markdown-ish text from the model. The old formatter only
// knew paragraphs and blocks made entirely of bullets, so a heading or a
// numbered item with sub-bullets showed up raw ("### Drills", "- Shoot 10...").
// The first case below is a real reply from the app.
import { describe, it, expect } from 'vitest';
import { parseCoachText, parseInline } from '@/lib/ai/coachText';

const REAL_REPLY = `To improve your 3-point shooting consistency, focus on these key areas:
### Drills
1. **Spot Shooting**
   - Shoot 10 shots from each of the 5 spots (top, left wing, right wing, left corner, right corner).
   - Track your makes and aim for at least 70% from each spot.
   - Repeat this drill 3 times a week.
- **Form Shooting**
- Spend 5-10 minutes on form shooting close to the basket.

### Cues to Focus On
- **Shooting Arc:** Aim for a higher arc on your shots.
- **Follow Through:** Hold your follow-through until the ball hits the rim.

With these drills and focus areas, you should see improvement. Keep it up!`;

describe('parseCoachText', () => {
  it('turns the real reply into headings, lists and paragraphs with no Markdown left over', () => {
    const blocks = parseCoachText(REAL_REPLY);
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'heading', 'list', 'heading', 'list', 'paragraph']);
    expect(blocks[1]).toEqual({ type: 'heading', text: 'Drills' });
    expect(blocks[3]).toEqual({ type: 'heading', text: 'Cues to Focus On' });
    const flat = JSON.stringify(blocks);
    expect(flat).not.toMatch(/###/);
    expect(flat).not.toMatch(/"- /);
  });

  it('nests indented bullets under the numbered item above them', () => {
    const list = parseCoachText(REAL_REPLY)[2];
    if (list.type !== 'list') throw new Error('expected a list');
    expect(list.items[0]).toMatchObject({ text: '**Spot Shooting**', marker: '1.', depth: 0 });
    expect(list.items[1]).toMatchObject({ text: expect.stringContaining('Shoot 10 shots'), marker: null, depth: 1 });
    expect(list.items[3]).toMatchObject({ text: 'Repeat this drill 3 times a week.', depth: 1 });
    expect(list.items[4]).toMatchObject({ text: '**Form Shooting**', marker: null, depth: 0 });
  });

  it('keeps a plain reply as paragraphs', () => {
    expect(parseCoachText('Short misses usually mean tired legs.\n\nFinish with 3x10 form shots.')).toEqual([
      { type: 'paragraph', text: 'Short misses usually mean tired legs.' },
      { type: 'paragraph', text: 'Finish with 3x10 form shots.' },
    ]);
  });

  it('reads any heading level and bold-only lines as headings, and drops rules', () => {
    expect(parseCoachText('# Plan\n---\n**Week 1**\nThree sessions.')).toEqual([
      { type: 'heading', text: 'Plan' },
      { type: 'heading', text: 'Week 1' },
      { type: 'paragraph', text: 'Three sessions.' },
    ]);
  });

  it('handles bullets written with *, • and numbers in brackets', () => {
    const [list] = parseCoachText('* one\n• two\n3) three');
    if (list.type !== 'list') throw new Error('expected a list');
    expect(list.items.map((i) => [i.text, i.marker])).toEqual([['one', null], ['two', null], ['three', '3.']]);
  });

  it('copes with Windows line endings and empty text', () => {
    expect(parseCoachText('### Tip\r\n- Bend your knees\r\n')).toHaveLength(2);
    expect(parseCoachText('   ')).toEqual([]);
  });
});

describe('parseInline', () => {
  it('finds bold and italics and leaves the rest as text', () => {
    expect(parseInline('**Shooting Arc:** aim *higher* and _hold_ it')).toEqual([
      { text: 'Shooting Arc:', bold: true, italic: false },
      { text: ' aim ', bold: false, italic: false },
      { text: 'higher', bold: false, italic: true },
      { text: ' and ', bold: false, italic: false },
      { text: 'hold', bold: false, italic: true },
      { text: ' it', bold: false, italic: false },
    ]);
  });

  it('strips inline code ticks and leaves lone asterisks alone', () => {
    expect(parseInline('Use `3x10` reps, 5 * 2 sets')).toEqual([{ text: 'Use 3x10 reps, 5 * 2 sets', bold: false, italic: false }]);
  });
});
