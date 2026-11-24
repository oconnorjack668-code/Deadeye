import { describe, expect, it } from 'vitest';
import { CHARSET, cardText } from '@/lib/shareCardFonts';
import { cardName } from '@/lib/shareCards';

// next/og sends any letter its fonts lack to Google Fonts by itself, so player
// text on a card must stay inside the loaded character set (safety review, PR #166).
describe('cardText', () => {
  it('keeps Irish, European and curly-quote text', () => {
    expect(cardText('Seán Ó Briain')).toBe('Seán Ó Briain');
    expect(cardText('Łukasz – St Mary’s')).toBe('Łukasz – St Mary’s');
  });

  it('drops letters the card fonts do not cover', () => {
    expect(cardText('Αλέξης vs 東京 🏀 Club')).toBe('vs Club');
    for (const ch of cardText('Αλέξης 東京 🏀 abc')) expect(CHARSET).toContain(ch);
  });

  it('handles empty input', () => {
    expect(cardText(null)).toBe('');
    expect(cardText(undefined)).toBe('');
  });
});

describe('cardName', () => {
  it('is null unless shown, then the filtered first name only', () => {
    expect(cardName('Sam Smith', false)).toBeNull();
    expect(cardName('Sam Smith', true)).toBe('Sam');
    expect(cardName('東京', true)).toBeNull();
  });
});
