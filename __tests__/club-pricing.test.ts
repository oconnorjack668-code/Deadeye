// __tests__/club-pricing.test.ts
// The landing page and the pricing sheet clubs are sent must quote the same
// prices, and the sheet the page links to must exist.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { CLUB_PLANS, CLUB_PLANS_PDF } from '@/lib/plans';

const root = path.join(__dirname, '..');
const sheet = fs.readFileSync(path.join(root, 'docs', 'sales', 'deadeye-club-plans.html'), 'utf8');

describe('club prices', () => {
  it('match the pricing sheet', () => {
    for (const plan of CLUB_PLANS) {
      expect(sheet).toContain(plan.price);
      for (const monthly of plan.alt.match(/€[\d.]+/g) ?? []) expect(sheet).toContain(monthly);
    }
  });

  it('link to a PDF that is served', () => {
    expect(fs.existsSync(path.join(root, 'public', CLUB_PLANS_PDF))).toBe(true);
  });
});
