// __tests__/rls-rules.test.ts
// The database access rules (row-level security) are what stop one player
// reading or changing another player's data. They live only in the SQL
// migrations, and no other test touches them, so this one reads every
// migration and fails the build when a rule slips:
//   - every table has row-level security switched on;
//   - every rule that writes (insert, update, delete, all) checks auth.uid();
//   - no rule trusts user_metadata, which a player can edit about themselves;
//   - "anyone may read" rules (USING (true)) are read-only and only on the
//     shared catalogue tables listed below;
//   - a table with no rules at all (players get nothing, only the server can
//     reach it) is one of the server-only tables listed below.
// A new table that belongs in either list is added here on purpose, with the
// reason, in the same pull request. Static: it reads the SQL, it does not run it.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(__dirname, '..', 'supabase', 'migrations');
const sql = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
  .join('\n')
  // comments are prose, not rules
  .replace(/--[^\n]*/g, '');

const tables = new Set(
  [...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?(\w+)"?/gi)].map((m) => m[1].toLowerCase())
);
const rlsOn = new Set(
  [...sql.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?"?(\w+)"?\s+enable\s+row\s+level\s+security/gi)].map((m) =>
    m[1].toLowerCase()
  )
);
interface Policy {
  name: string;
  table: string;
  command: string;
  body: string;
}
// Names come quoted ("Users can view own ...") or bare (film_questions_own)
const policies: Policy[] = [
  ...sql.matchAll(/create\s+policy\s+(?:"([^"]*)"|(\w+))\s+on\s+(?:(\w+)\.)?"?(\w+)"?([\s\S]*?);/gi),
]
  .filter((m) => !m[3] || m[3].toLowerCase() === 'public') // storage.objects rules are not tables here
  .map((m) => ({
    name: m[1] ?? m[2],
    table: m[4].toLowerCase(),
    command: ((m[5].match(/\bfor\s+(select|insert|update|delete|all)\b/i) || [, 'all'])[1] as string).toLowerCase(),
    body: m[5].replace(/\s+/g, ' '),
  }));

/** Players cannot reach these at all; the server (service role) reads and writes them. */
const SERVER_ONLY = new Set([
  'app_errors', // crash reports, owner page only
  'player_reports', // problem reports, owner page only
  'app_events', // funnel steps, counts only
  'cron_runs', // scheduled job log, owner page only
  'club_challenges', // club boards, through server routes
  'leaderboard_snapshot', // built by a server function
  'leaderboard_refresh', // internal refresh bookkeeping
]);

/** Shared content every signed-in player reads; nobody but the server writes it. */
const PUBLIC_CATALOGUE = new Set([
  'leaderboard_seasons',
  'challenges',
  'drills',
  'training_programs',
  'program_days',
  'guides',
  'nba_players',
  'founder_posts',
]);

describe('database access rules (row-level security)', () => {
  it('finds the migrations', () => {
    expect(tables.size).toBeGreaterThan(50);
    expect(policies.length).toBeGreaterThan(50);
  });

  it('switches row-level security on for every table', () => {
    expect([...tables].filter((t) => !rlsOn.has(t))).toEqual([]);
  });

  it('checks the signed-in player on every rule that writes', () => {
    const open = policies.filter((p) => p.command !== 'select' && !/auth\.uid\(\)/i.test(p.body));
    expect(open.map((p) => `${p.table}: ${p.name}`)).toEqual([]);
  });

  it('never trusts user_metadata, which players can edit', () => {
    const bad = policies.filter((p) => /user_metadata|raw_user_meta_data/i.test(p.body));
    expect(bad.map((p) => `${p.table}: ${p.name}`)).toEqual([]);
  });

  it('allows "anyone may read" only on the shared catalogue, and never for writes', () => {
    const open = policies.filter((p) => /using\s*\(\s*true\s*\)|with\s+check\s*\(\s*true\s*\)/i.test(p.body));
    expect(open.filter((p) => p.command !== 'select').map((p) => `${p.table}: ${p.name}`)).toEqual([]);
    expect(open.filter((p) => !PUBLIC_CATALOGUE.has(p.table)).map((p) => `${p.table}: ${p.name}`)).toEqual([]);
  });

  it('leaves a table with no rules only when it is listed as server-only', () => {
    const withRules = new Set(policies.map((p) => p.table));
    const noRules = [...tables].filter((t) => !withRules.has(t));
    expect(noRules.filter((t) => !SERVER_ONLY.has(t))).toEqual([]);
  });
});
