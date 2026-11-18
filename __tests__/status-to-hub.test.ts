// @vitest-environment node
// __tests__/status-to-hub.test.ts
// Deadeye HQ's to-do list is built from docs/STATUS.md by
// scripts/status-to-hub.mjs, so it cannot drift from STATUS (founder,
// 2026-11-18). These check the reader on the real STATUS and on the cases
// that broke the hand-kept list.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { openRows, callOf, titleOf, syncSnapshot, prCallOf } from '../scripts/status-to-hub.mjs';

const STATUS = fs.readFileSync(path.join(__dirname, '..', 'docs', 'STATUS.md'), 'utf8');

const SAMPLE = `# Deadeye status

## Open

| Id | What | Owner | Since | Last checked |
| --- | --- | --- | --- | --- |
| S46 | Privacy page fix for #126 (safety review BLOCK, not done): the page lists the older steps. | Builder, then founder | 2026-11-18 | 2026-11-18: page read |
| S3 | Billing: deadeye.ie, then Resend, then Stripe Pro live by 2027-01-08. | Founder | 2026-11-09 | 2026-11-09 |
| S9 | \`PLAN.md\` says 150 drills; the app has 168 (\`DRILL_COUNT\`). | Marketing | 2026-11-11 | 2026-11-11 |

## Recently done (do not raise again)

- 2026-11-17 · S35 closed: videos replaced.
`;

describe('scripts/status-to-hub.mjs', () => {
  it('reads every open row of the real STATUS, and nothing from Recently done', () => {
    const rows = openRows(STATUS);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.id).toMatch(/^S\d+$/);
    const openIds = STATUS.slice(STATUS.indexOf('## Open'), STATUS.indexOf('## Recently done')).match(/^\| S\d+ \|/gm)!;
    expect(rows.length).toBe(openIds.length);
  });

  it('makes one card per open row with the S id, a plain title and the owner', () => {
    const calls = openRows(SAMPLE).map(callOf);
    expect(calls.map((c: { id: string }) => c.id)).toEqual(['S46', 'S3', 'S9']);
    expect(calls[0]).toMatchObject({ kind: 'approve', agent: 'builder', title: 'Privacy page fix for #126' });
    expect(calls[0].link).toBe('https://github.com/oconnorjack668-code/Deadeye/pull/126');
    expect(calls[1]).toMatchObject({ agent: 'founder', due: '2027-01-08' });
    expect(calls[2]).toMatchObject({ kind: 'approve', agent: 'marketing' });
    expect(calls[2].title).not.toMatch(/`/);
    expect(calls[2].detail).toMatch(/Last checked: 2026-11-11\./);
  });

  it('names an idea by what it is, not who had it', () => {
    expect(titleOf('Idea from the founder (17 Nov): a "blur my face" option in Settings. More text.')).toBe('Idea: A "blur my face" option in Settings');
  });

  it('keeps titles short and cut at a word', () => {
    const t = titleOf('A '.repeat(120));
    expect(t.length).toBeLessThanOrEqual(110);
  });

  it('replaces the whole to-do list, so finished items vanish, and keeps the rest of the snapshot', () => {
    const before = {
      calls: [{ id: 'merge-79', title: 'Merge PR 79' }, { id: 'S3', title: 'old' }],
      funnel: { joined: 35 },
      log: [{ at: '2026-11-18T08:10:00Z', text: 'Morning check', tone: 'ok' }],
    };
    const next = syncSnapshot(before, SAMPLE, { now: new Date('2026-11-18T13:00:00Z'), sha: 'abc1234' });
    expect(next.calls.map((c: { id: string }) => c.id)).toEqual(['S46', 'S3', 'S9']);
    expect(next.funnel).toEqual({ joined: 35 });
    expect(next.updatedAt).toBe('2026-11-18T13:00:00Z');
    expect(next.log[0].text).toBe('To-do list rebuilt from STATUS (main abc1234): 3 open (0 pull requests), 2 new, 1 gone since the last update.');
    expect(next.log[1].text).toBe('Morning check');
  });

  it('puts every open pull request first as a card to approve going live', () => {
    const pr = { number: 137, title: 'Privacy page: name the `Today` taps', created_at: '2026-11-18T12:50:00Z', head: { ref: 'fix/privacy-today-markers' }, html_url: 'https://github.com/oconnorjack668-code/Deadeye/pull/137' };
    expect(prCallOf(pr)).toMatchObject({ id: 'pr-137', kind: 'merge', title: 'Merge PR #137: Privacy page: name the Today taps', link: pr.html_url, words: 'merge 137' });
    const next = syncSnapshot({ calls: [] }, SAMPLE, { pulls: [pr] });
    expect(next.calls.map((c: { id: string }) => c.id)).toEqual(['pr-137', 'S46', 'S3', 'S9']);
  });

  it("keeps the PR check's verdict on a pull request's card while it is open", () => {
    const pr = { number: 137, title: 'Privacy page', created_at: '2026-11-18T12:50:00Z', head: { ref: 'fix/x' }, html_url: 'u' };
    const before = { calls: [{ id: 'pr-137', detail: 'Safety PASS, all checks green.' }, { id: 'merge-80', detail: 'old' }] };
    const next = syncSnapshot(before, SAMPLE, { pulls: [pr] });
    expect(next.calls[0]).toMatchObject({ id: 'pr-137', detail: 'Safety PASS, all checks green.' });
    expect(next.calls.some((c: { id: string }) => c.id === 'merge-80')).toBe(false);
  });
});
