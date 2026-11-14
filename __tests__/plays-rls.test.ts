// __tests__/plays-rls.test.ts
// The access rules 00061_play_editor.sql adds, read from the SQL (static,
// like rls-rules.test.ts): coaches write only their own plays; staff run a
// team playbook and members read it; a coach play reaches a team only
// through its playbook or an assignment; quiz attempts are the player's own,
// read by head coaches only (never assistants or teammates), for plays set
// for their team, for 90 days after the due date, and never with the answers.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const file = path.join(__dirname, '..', 'supabase', 'migrations', '00061_play_editor.sql');
const raw = fs.readFileSync(file, 'utf8');
const sql = raw.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ');

/** The body of one CREATE POLICY, by its quoted name. */
function policy(name: string): string {
  const m = sql.match(new RegExp(`CREATE POLICY "${name}" ON ([^;]*);`));
  if (!m) throw new Error(`No policy "${name}"`);
  return m[1];
}

function fn(name: string): string {
  const m = sql.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\(([\\s\\S]*?)\\$\\$;`));
  if (!m) throw new Error(`No function ${name}`);
  return m[1];
}

describe('00061: coach plays', () => {
  it('lets a coach add, change and delete only rows they own', () => {
    expect(policy('Coaches add own plays')).toMatch(/FOR INSERT TO authenticated WITH CHECK \(\(select auth\.uid\(\)\) = owner_id\)/);
    expect(policy('Coaches change own plays')).toMatch(/USING \(\(select auth\.uid\(\)\) = owner_id\) WITH CHECK \(\(select auth\.uid\(\)\) = owner_id\)/);
    expect(policy('Coaches delete own plays')).toMatch(/FOR DELETE TO authenticated USING \(\(select auth\.uid\(\)\) = owner_id\)/);
  });

  it('never lets a coach mark a play free, give it a slug, or change its owner', () => {
    const insert = sql.match(/GRANT INSERT \(([^)]*)\) ON public\.plays/)![1];
    const update = sql.match(/GRANT UPDATE \(([^)]*)\) ON public\.plays/)![1];
    for (const cols of [insert, update]) {
      expect(cols).not.toMatch(/is_free|slug/);
    }
    expect(update).not.toMatch(/owner_id/);
  });

  it('enforces the Free limit and coach-only drawing in the database, under a lock', () => {
    const body = fn('enforce_coach_play_limit');
    expect(body).toMatch(/is_coach_account\(NEW\.owner_id\)/);
    expect(body).toMatch(/pg_advisory_xact_lock/);
    expect(body).toMatch(/user_has_pro\(NEW\.owner_id\)/);
    expect(sql).toMatch(/BEFORE INSERT ON public\.plays FOR EACH ROW EXECUTE FUNCTION public\.enforce_coach_play_limit\(\)/);
  });

  it('lets a team member read a coach play only through their playbook or an assignment', () => {
    const body = policy('Team members read their coach plays');
    expect(body).toMatch(/FOR SELECT/);
    expect(body).toMatch(/owner_id IS NOT NULL/);
    expect(body).toMatch(/team_playbook tp WHERE tp\.play_id = plays\.id AND public\.is_team_member\(tp\.team_id/);
    expect(body).toMatch(/team_assignments ta WHERE ta\.play_id = plays\.id AND public\.is_team_member\(ta\.team_id/);
  });
});

describe('00061: team playbook', () => {
  it('is read by members, and only staff add (plays they can read) or remove', () => {
    expect(policy('Members read their team playbook')).toMatch(/FOR SELECT TO authenticated USING \(public\.is_team_member\(team_id/);
    const add = policy('Staff add to their team playbook');
    expect(add).toMatch(/added_by = \(select auth\.uid\(\)\)/);
    expect(add).toMatch(/is_team_staff\(team_id/);
    expect(add).toMatch(/EXISTS \(SELECT 1 FROM public\.plays p WHERE p\.id = play_id\)/);
    expect(policy('Staff remove from their team playbook')).toMatch(/FOR DELETE TO authenticated USING \(public\.is_team_staff\(team_id/);
  });

  it('needs Pro for a Pro library play, and keeps Free to one team', () => {
    const body = fn('enforce_team_playbook_rules');
    expect(body).toMatch(/owner_id IS NULL AND NOT is_free/);
    expect(body).toMatch(/teams_used >= 1 AND NOT pro/);
    expect(body).toMatch(/teams_used >= 10/);
  });
});

describe('00061: assigning a play', () => {
  it('adds the item columns with at most one set, and a deleted play leaves the assignment', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS play_id uuid REFERENCES public\.plays\(id\) ON DELETE SET NULL/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS film_clip_id uuid,/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS film_pack_id uuid;/);
    expect(sql).toMatch(/CHECK \(num_nonnulls\(play_id, film_clip_id, film_pack_id\) <= 1\)/);
  });

  it('only lets staff set a play they can read, and links the assignment to it', () => {
    for (const name of ['Coaches add assignments', 'Coaches edit assignments']) {
      const body = policy(name);
      expect(body).toMatch(/is_team_staff\(team_id, \(select auth\.uid\(\)\)\)/);
      expect(body).toMatch(/play_id IS NULL OR EXISTS \(SELECT 1 FROM public\.plays p WHERE p\.id = play_id\)/);
    }
    expect(fn('enforce_assignment_play')).toMatch(/NEW\.link := '\/plays\/' \|\| NEW\.play_id::text/);
  });
});

describe('00061: quiz attempts', () => {
  it('belong to the player, for plays they can read', () => {
    const own = policy('Players keep own quiz attempts');
    expect(own).toMatch(/FOR ALL TO authenticated USING \(\(select auth\.uid\(\)\) = user_id\)/);
    expect(own).toMatch(/EXISTS \(SELECT 1 FROM public\.plays p WHERE p\.id = play_id\)/);
  });

  it('are read by head coaches only, for players on their team, for plays they set, since it was set, for 90 days past the due date', () => {
    expect(policy('Head coaches read attempts on plays they set')).toMatch(/FOR SELECT TO authenticated USING \(public\.coach_sees_play_attempt\(play_id, user_id, completed_at\)\)/);
    const body = fn('coach_sees_play_attempt');
    expect(body).toMatch(/is_team_coach\(a\.team_id, auth\.uid\(\)\)/);
    expect(body).not.toMatch(/is_team_staff|is_team_member/);
    expect(body).toMatch(/m\.user_id = p_player AND m\.role = 'player'/);
    expect(body).toMatch(/a\.play_id = p_play/);
    // since the play was set on the assignment, not when the row was made (safety review, 14 Nov)
    expect(body).toMatch(/p_completed_at >= a\.item_set_at/);
    expect(body).not.toMatch(/p_completed_at >= a\.created_at/);
    // item_set_at moves whenever the play, clip or pack on an assignment changes
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS item_set_at timestamptz NOT NULL DEFAULT now\(\)/);
    expect(sql).toMatch(/NEW\.play_id IS DISTINCT FROM OLD\.play_id/);
    expect(sql).toMatch(/CREATE TRIGGER team_assignments_item_set_at/);
    expect(body).toMatch(/current_date <= COALESCE\(a\.due_date, a\.created_at::date\) \+ 90/);
  });

  it('never hand anyone signed in the answers column', () => {
    expect(sql).toMatch(/REVOKE ALL ON public\.play_quiz_attempts FROM anon, authenticated/);
    const select = sql.match(/GRANT SELECT \(([^)]*)\) ON public\.play_quiz_attempts TO authenticated/)![1];
    expect(select).not.toMatch(/answers/);
    expect(sql).not.toMatch(/GRANT SELECT ON public\.play_quiz_attempts TO authenticated/);
  });

  it('give head coaches the team split as totals only, inside the same window', () => {
    const body = fn('play_assignment_split');
    expect(body).toMatch(/RETURNS TABLE \(question_key text, pick text, players integer\)/);
    expect(body).toMatch(/is_team_coach\(ta\.team_id, auth\.uid\(\)\)/);
    expect(body).toMatch(/current_date <= COALESCE\(ta\.due_date, ta\.created_at::date\) \+ 90/);
    expect(body).toMatch(/count\(\*\)::int/);
    expect(body).toMatch(/GROUP BY 1, 2/);
    // Never a user id in what comes back
    expect(body.slice(body.lastIndexOf('SELECT e'))).not.toMatch(/user_id/);
    // nothing until 3 players have answered, so 1 or 2 cannot give away a pick
    expect(body).toMatch(/WHERE \(SELECT count\(\*\) FROM firsts\) >= 3/);
    expect(body).toMatch(/ta\.item_set_at AS created_at/);
  });
});

describe('00061: housekeeping', () => {
  it('cascades every user column from auth.users, so everything goes with the account', () => {
    const refs = [...sql.matchAll(/REFERENCES auth\.users\(id\)([^,)]*)/g)].map((m) => m[1].trim());
    expect(refs.length).toBe(2);
    for (const r of refs) expect(r).toBe('ON DELETE CASCADE');
  });

  it('switches row-level security on for both new tables and gives anon nothing', () => {
    for (const t of ['team_playbook', 'play_quiz_attempts']) {
      expect(sql).toMatch(new RegExp(`ALTER TABLE public\\.${t} ENABLE ROW LEVEL SECURITY`));
      expect(sql).toMatch(new RegExp(`REVOKE ALL ON public\\.${t} FROM anon`));
    }
  });

  it('can run twice: every policy, trigger and constraint is dropped before it is made', () => {
    for (const m of sql.matchAll(/CREATE POLICY "([^"]+)" ON (public\.\w+)/g)) {
      expect(sql).toContain(`DROP POLICY IF EXISTS "${m[1]}" ON ${m[2]};`);
    }
    for (const m of sql.matchAll(/CREATE TRIGGER (\w+) /g)) expect(sql).toContain(`DROP TRIGGER IF EXISTS ${m[1]} `);
    expect(sql).not.toMatch(/CREATE TABLE (?!IF NOT EXISTS)/);
    expect(sql).not.toMatch(/CREATE (UNIQUE )?INDEX (?!IF NOT EXISTS)/);
  });

  it('has no apostrophes in its comments (see 00035)', () => {
    const comments = raw.split('\n').filter((l) => l.trim().startsWith('--'));
    expect(comments.filter((l) => l.includes("'"))).toEqual([]);
  });
});
