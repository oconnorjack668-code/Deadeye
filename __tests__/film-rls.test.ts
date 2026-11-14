// __tests__/film-rls.test.ts
// The access rules 00062_film.sql adds, read from the SQL (static, like
// plays-rls.test.ts): the clip library is server-written and read once
// published; coaches write only their own packs; saves and notes are the
// player's own; attempts are read by head coaches only (never assistants or
// teammates), for clips set for their team on their own or in a pack, for 90
// days after the due date, and never with the answers; film set for a team
// links to it and needs Pro when it is Pro.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { FILM_LEVELS, FILM_THEMES } from '@/lib/film/catalog';
import { MAX_COACH_PACKS, MAX_NOTE, MAX_PACK_CLIPS } from '@/lib/film/limits';

const file = path.join(__dirname, '..', 'supabase', 'migrations', '00062_film.sql');
const raw = fs.readFileSync(file, 'utf8');
const sql = raw.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ');

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

function grant(kind: 'SELECT' | 'INSERT' | 'UPDATE', table: string): string | null {
  const m = sql.match(new RegExp(`GRANT ${kind} \\(([^)]*)\\) ON public\\.${table} TO authenticated`));
  return m ? m[1] : null;
}

describe('00062: the clip library', () => {
  it('checks the video id, the times, and the same themes and levels as the app', () => {
    expect(sql).toMatch(/youtube_video_id text NOT NULL CHECK \(youtube_video_id ~ '\^\[A-Za-z0-9_-\]\{11\}\$'\)/);
    expect(sql).toMatch(/end_s integer NOT NULL CHECK \(end_s > start_s AND end_s - start_s <= 600\)/);
    const themes = sql.match(/theme text NOT NULL CHECK \(theme IN \(([^)]*)\)\)/)![1];
    expect(themes.split(',').map((t) => t.trim().replace(/'/g, ''))).toEqual(FILM_THEMES.map((t) => t.id));
    const levels = sql.match(/level text NOT NULL CHECK \(level IN \(([^)]*)\)\)/)![1];
    expect(levels.split(',').map((t) => t.trim().replace(/'/g, ''))).toEqual(FILM_LEVELS.map((l) => l.id));
  });

  it('is read by anyone signed in once published, and written only by the server', () => {
    expect(policy('Signed in players read published clips')).toMatch(/FOR SELECT TO authenticated USING \(published_at IS NOT NULL AND published_at <= now\(\)\)/);
    expect(sql).toMatch(/GRANT SELECT ON public\.film_clips TO authenticated;/);
    expect(sql).not.toMatch(/GRANT (INSERT|UPDATE|DELETE|ALL)[^;]*ON public\.film_clips TO authenticated/);
    expect(sql).not.toMatch(/CREATE POLICY "[^"]+" ON public\.film_clips FOR (INSERT|UPDATE|DELETE|ALL)/);
  });
});

describe('00062: packs', () => {
  it('lets signed-in players read published library packs, owners their own, and a team its coach pack once set', () => {
    expect(policy('Signed in players read published library packs')).toMatch(/owner_id IS NULL AND published_at IS NOT NULL/);
    expect(policy('Owners read own packs')).toMatch(/USING \(\(select auth\.uid\(\)\) = owner_id\)/);
    const team = policy('Team members read packs set for their team');
    expect(team).toMatch(/owner_id IS NOT NULL/);
    expect(team).toMatch(/ta\.film_pack_id = film_packs\.id AND public\.is_team_member\(ta\.team_id, \(select auth\.uid\(\)\)\)/);
  });

  it('lets a coach write only their own packs, and never mark one free, publish it or give it a slug', () => {
    expect(policy('Coaches add own packs')).toMatch(/WITH CHECK \(\(select auth\.uid\(\)\) = owner_id\)/);
    expect(policy('Coaches change own packs')).toMatch(/USING \(\(select auth\.uid\(\)\) = owner_id\) WITH CHECK \(\(select auth\.uid\(\)\) = owner_id\)/);
    expect(policy('Coaches delete own packs')).toMatch(/USING \(\(select auth\.uid\(\)\) = owner_id\)/);
    for (const cols of [grant('INSERT', 'film_packs')!, grant('UPDATE', 'film_packs')!]) expect(cols).not.toMatch(/is_free|published_at|slug/);
    expect(grant('UPDATE', 'film_packs')).not.toMatch(/owner_id/);
  });

  it('lets only the pack owner change its clips, and only with published clips', () => {
    expect(policy('Read the clips of packs you can read')).toMatch(/EXISTS \(SELECT 1 FROM public\.film_packs p WHERE p\.id = pack_id\)/);
    const add = policy('Coaches add clips to own packs');
    expect(add).toMatch(/p\.owner_id = \(select auth\.uid\(\)\)/);
    expect(add).toMatch(/EXISTS \(SELECT 1 FROM public\.film_clips c WHERE c\.id = clip_id\)/);
    expect(policy('Coaches remove clips from own packs')).toMatch(/p\.owner_id = \(select auth\.uid\(\)\)/);
  });

  it('keeps packs to coaches, with the limits the app states, and Pro clips to coaches with Pro', () => {
    const packs = fn('enforce_coach_pack_rules');
    expect(packs).toMatch(/is_coach_account\(NEW\.owner_id\)/);
    expect(packs).toMatch(new RegExp(`made >= ${MAX_COACH_PACKS}`));
    expect(packs).toMatch(/pg_advisory_xact_lock/);
    const clips = fn('enforce_film_pack_clip_rules');
    expect(clips).toMatch(new RegExp(`held >= ${MAX_PACK_CLIPS}`));
    expect(clips).toMatch(/NOT public\.user_has_pro\(pack_owner\)/);
    expect(clips).toMatch(/NOT is_free/);
  });
});

describe('00062: saves and notes', () => {
  it('are the player own, on clips they can read', () => {
    expect(policy('Users read own saved clips')).toMatch(/USING \(\(select auth\.uid\(\)\) = user_id\)/);
    expect(policy('Users save clips they can see')).toMatch(/\(select auth\.uid\(\)\) = user_id AND EXISTS \(SELECT 1 FROM public\.film_clips c WHERE c\.id = clip_id\)/);
    for (const name of ['Users read own notes', 'Users change own notes', 'Users delete own notes']) {
      expect(policy(name)).toMatch(/\(select auth\.uid\(\)\) = user_id/);
    }
    expect(policy('Users write notes on clips they can see')).toMatch(/EXISTS \(SELECT 1 FROM public\.film_clips c WHERE c\.id = clip_id\)/);
  });

  it('keeps notes private: no rule lets anyone else read them, and they are capped at the app limit', () => {
    const noteRules = [...sql.matchAll(/CREATE POLICY "([^"]+)" ON public\.film_notes ([^;]*);/g)];
    expect(noteRules.length).toBe(4);
    for (const m of noteRules) expect(m[2]).not.toMatch(/is_team|coach/);
    expect(sql).toMatch(new RegExp(`body text NOT NULL CHECK \\(char_length\\(body\\) BETWEEN 1 AND ${MAX_NOTE}\\)`));
  });
});

describe('00062: attempts', () => {
  it('belong to the player, for clips they can read', () => {
    expect(policy('Players read own film attempts')).toMatch(/USING \(\(select auth\.uid\(\)\) = user_id\)/);
    expect(policy('Players add film attempts on clips they can see')).toMatch(/EXISTS \(SELECT 1 FROM public\.film_clips c WHERE c\.id = clip_id\)/);
  });

  it('are read by head coaches only, for clips set for their team on their own or in a pack, since it was set, for 90 days past the due date', () => {
    expect(policy('Head coaches read attempts on film they set')).toMatch(/USING \(public\.coach_sees_film_attempt\(clip_id, user_id, completed_at\)\)/);
    const body = fn('coach_sees_film_attempt');
    expect(body).toMatch(/is_team_coach\(a\.team_id, auth\.uid\(\)\)/);
    expect(body).not.toMatch(/is_team_staff|is_team_member/);
    expect(body).toMatch(/m\.user_id = p_player AND m\.role = 'player'/);
    expect(body).toMatch(/a\.film_clip_id = p_clip/);
    expect(body).toMatch(/pc\.pack_id = a\.film_pack_id AND pc\.clip_id = p_clip/);
    // since the clip was set: item_set_at, or later if it went into the pack after (safety review, 14 Nov)
    expect(body).toMatch(/p_completed_at >= a\.item_set_at/);
    expect(body).toMatch(/p_completed_at >= greatest\(a\.item_set_at, pc\.created_at\)/);
    expect(body).not.toMatch(/p_completed_at >= a\.created_at/);
    expect(body).toMatch(/current_date <= COALESCE\(a\.due_date, a\.created_at::date\) \+ 90/);
  });

  it('never hand anyone signed in the answers column', () => {
    expect(sql).toMatch(/REVOKE ALL ON public\.film_attempts FROM anon, authenticated/);
    expect(grant('SELECT', 'film_attempts')).not.toMatch(/answers/);
    expect(sql).not.toMatch(/GRANT SELECT ON public\.film_attempts TO authenticated/);
  });

  it('give head coaches the team split as totals only, inside the same window', () => {
    const body = fn('film_assignment_split');
    expect(body).toMatch(/RETURNS TABLE \(clip_id uuid, question_key text, pick text, players integer\)/);
    expect(body).toMatch(/is_team_coach\(ta\.team_id, auth\.uid\(\)\)/);
    expect(body).toMatch(/current_date <= COALESCE\(ta\.due_date, ta\.created_at::date\) \+ 90/);
    expect(body).toMatch(/GROUP BY 1, 2, 3/);
    expect(body.slice(body.lastIndexOf('SELECT fi'))).not.toMatch(/user_id/);
    // nothing for a clip until 3 players have answered it, and only since it was set
    expect(body).toMatch(/HAVING count\(\*\) >= 3/);
    expect(body).toMatch(/JOIN enough USING \(clip_id\)/);
    expect(body).toMatch(/f\.completed_at >= clips\.set_at/);
  });
});

describe('00062: setting film for a team', () => {
  it('adds the foreign keys, and a removed clip or pack leaves the assignment', () => {
    expect(sql).toMatch(/FOREIGN KEY \(film_clip_id\) REFERENCES public\.film_clips\(id\) ON DELETE SET NULL/);
    expect(sql).toMatch(/FOREIGN KEY \(film_pack_id\) REFERENCES public\.film_packs\(id\) ON DELETE SET NULL/);
  });

  it('keeps the 00061 play rule and only lets staff set film they can read', () => {
    for (const name of ['Coaches add assignments', 'Coaches edit assignments']) {
      const body = policy(name);
      expect(body).toMatch(/is_team_staff\(team_id, \(select auth\.uid\(\)\)\)/);
      expect(body).toMatch(/play_id IS NULL OR EXISTS \(SELECT 1 FROM public\.plays p WHERE p\.id = play_id\)/);
      expect(body).toMatch(/film_clip_id IS NULL OR EXISTS \(SELECT 1 FROM public\.film_clips c WHERE c\.id = film_clip_id\)/);
      expect(body).toMatch(/film_pack_id IS NULL OR EXISTS \(SELECT 1 FROM public\.film_packs fp WHERE fp\.id = film_pack_id\)/);
    }
    expect(policy('Coaches add assignments')).toMatch(/created_by = \(select auth\.uid\(\)\)/);
  });

  it('links the assignment to the clip or pack, and needs Pro for Pro film', () => {
    const body = fn('enforce_assignment_film');
    expect(body).toMatch(/NEW\.link := '\/film\/' \|\| NEW\.film_clip_id::text/);
    expect(body).toMatch(/NEW\.link := '\/film\/packs\/' \|\| NEW\.film_pack_id::text/);
    expect(body).toMatch(/user_has_pro\(auth\.uid\(\)\)/);
    expect(body).toMatch(/film_clips WHERE id = NEW\.film_clip_id AND NOT is_free/);
    expect(body).toMatch(/owner_id IS NULL AND NOT is_free/);
    expect(body).toMatch(/pc\.pack_id = NEW\.film_pack_id AND NOT c\.is_free/);
    expect(sql).toMatch(/BEFORE INSERT OR UPDATE ON public\.team_assignments FOR EACH ROW EXECUTE FUNCTION public\.enforce_assignment_film\(\)/);
  });

  it('seeds no clips (a made-up video id would be a broken video), only empty unpublished library packs', () => {
    expect(sql).not.toMatch(/INSERT INTO public\.film_clips/);
    const seed = sql.match(/INSERT INTO public\.film_packs \(([^)]*)\)/)![1];
    expect(seed).not.toMatch(/published_at/);
  });
});

describe('00062: housekeeping', () => {
  it('cascades every user column from auth.users, so everything goes with the account', () => {
    const refs = [...sql.matchAll(/REFERENCES auth\.users\(id\)([^,)]*)/g)].map((m) => m[1].trim());
    expect(refs.length).toBe(4);
    for (const r of refs) expect(r).toBe('ON DELETE CASCADE');
  });

  it('switches row-level security on for every new table and gives anon nothing', () => {
    for (const t of ['film_clips', 'film_packs', 'film_pack_clips', 'film_saves', 'film_notes', 'film_attempts']) {
      expect(sql).toMatch(new RegExp(`ALTER TABLE public\\.${t} ENABLE ROW LEVEL SECURITY`));
      expect(sql).toMatch(new RegExp(`REVOKE ALL ON public\\.${t} FROM anon`));
    }
  });

  it('can run twice: every policy, trigger and constraint is dropped before it is made', () => {
    for (const m of sql.matchAll(/CREATE POLICY "([^"]+)" ON (public\.\w+)/g)) {
      expect(sql).toContain(`DROP POLICY IF EXISTS "${m[1]}" ON ${m[2]};`);
    }
    for (const m of sql.matchAll(/CREATE TRIGGER (\w+) /g)) expect(sql).toContain(`DROP TRIGGER IF EXISTS ${m[1]} `);
    for (const m of sql.matchAll(/ADD CONSTRAINT (\w+) /g)) expect(sql).toContain(`DROP CONSTRAINT IF EXISTS ${m[1]};`);
    expect(sql).not.toMatch(/CREATE TABLE (?!IF NOT EXISTS)/);
    expect(sql).not.toMatch(/CREATE (UNIQUE )?INDEX (?!IF NOT EXISTS)/);
    expect(sql).toMatch(/ON CONFLICT \(slug\) WHERE owner_id IS NULL DO NOTHING/);
  });

  it('has no apostrophes in its comments (see 00035)', () => {
    const comments = raw.split('\n').filter((l) => l.trim().startsWith('--'));
    expect(comments.filter((l) => l.includes("'"))).toEqual([]);
  });
});
