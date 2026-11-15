// __tests__/plays-limits.test.ts
// The Free and Pro limits for coaches live in three places: the numbers in
// src/lib/plays/limits.ts, the database triggers in 00061, and the plan
// wording players read before paying (src/lib/plans.ts). This keeps all
// three saying the same thing.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { FREE_COACH_PLAYS, FREE_PLAYBOOK_TEAMS, PRO_PLAYBOOK_TEAMS } from '@/lib/plays/limits';
import { FREE_PLAN, PRO_PLAN } from '@/lib/plans';

const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '00061_play_editor.sql'), 'utf8');

describe('coach play limits', () => {
  it('match the 00061 triggers', () => {
    expect(sql).toMatch(new RegExp(`IF made >= ${FREE_COACH_PLAYS} THEN`));
    expect(sql).toMatch(new RegExp(`IF teams_used >= ${FREE_PLAYBOOK_TEAMS} AND NOT pro THEN`));
    expect(sql).toMatch(new RegExp(`IF teams_used >= ${PRO_PLAYBOOK_TEAMS} THEN`));
  });

  it('are what the Free and Pro plans say', () => {
    expect(FREE_PLAN.features).toContain(`As a coach, draw and keep ${FREE_COACH_PLAYS} plays, with a playbook for ${FREE_PLAYBOOK_TEAMS} team`);
    expect(FREE_PLAN.features).toContain('The free plays in the library with a quiz on your role, and every play your coach sets');
    expect(PRO_PLAN.features).toContain(`As a coach, as many plays as you like, with playbooks for up to ${PRO_PLAYBOOK_TEAMS} teams`);
    expect(PRO_PLAN.features).toContain('Every play in the library, each with a quiz on your role');
  });
});
