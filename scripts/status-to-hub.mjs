#!/usr/bin/env node
// scripts/status-to-hub.mjs
//
// Builds Deadeye HQ's to-do list from docs/STATUS.md and the open pull
// requests, so the hub never keeps a second, hand-written list that drifts
// (founder, 2026-11-18: HQ still listed PRs merged days earlier as waiting).
// Every open STATUS row becomes one task card (id = its S id), and every open
// pull request one "ready to go live" card (id = pr-<number>); nothing else.
//
// Usage (a session runs this after its STATUS pull request merges, and the
// hub worker runs it at each run):
//   node scripts/status-to-hub.mjs --snapshot <hub snapshot.json> --out <file>
//     [--status <STATUS.md>]   default: origin/main's copy (git show)
//     [--no-prs]               skip the open pull requests (GitHub's public API)
// Then write <file> to the hub with ArtifactData set hub/snapshot (if_version).
// The artifact page cannot read GitHub itself: its sandbox blocks every
// outside site.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const REPO = 'https://github.com/oconnorjack668-code/Deadeye';

/** Agent keys the hub page knows (AGENT in docs/agent-os/hub/index.html). */
const AGENTS = [
  ['activation-analyst', /activation/i],
  ['safety-reviewer', /safety/i],
  ['release-checker', /release/i],
  ['support-triage', /support/i],
  ['club-growth', /club/i],
  ['video-editor', /video editor/i],
  ['player-outreach', /outreach/i],
  ['qa-tester', /\bqa\b/i],
  ['marketing', /marketing/i],
  ['designer', /designer/i],
  ['builder', /builder/i],
];

/** Markdown inline marks out, so the card reads as plain text. */
export function plain(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\\\|/g, '|')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Splits one markdown table row into its cells (keeps escaped pipes). */
function cells(row) {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());
}

/**
 * The rows of the "## Open" table: [{ id, next, what, owner, since, checked }].
 * Columns are found by their header names, so one can be added later.
 */
export function openRows(status) {
  const start = status.search(/^## Open\s*$/m);
  if (start < 0) throw new Error('docs/STATUS.md has no "## Open" section');
  const rest = status.slice(start).split('\n').slice(1);
  const end = rest.findIndex((l) => /^## /.test(l));
  const section = end < 0 ? rest : rest.slice(0, end);
  const header = section.find((l) => /^\|\s*Id\s*\|/i.test(l));
  const names = header ? cells(header).map((h) => h.toLowerCase()) : ['id', 'what', 'owner', 'since', 'last checked'];
  const col = (row, name) => (names.indexOf(name) >= 0 ? row[names.indexOf(name)] ?? '' : '');
  return section
    .filter((l) => /^\|\s*S\d+\s*\|/.test(l))
    .map((l) => {
      const row = cells(l);
      return {
        id: col(row, 'id'),
        next: col(row, 'next step'),
        what: col(row, 'what'),
        owner: col(row, 'owner'),
        since: col(row, 'since'),
        checked: col(row, 'last checked'),
      };
    });
}

/**
 * Which part of the to-do list a card sits in: "live" (a pull request to
 * approve), "decide" (an idea or a choice for the founder), "yours" (a job
 * only the founder can do), "agents" (an agent does it next).
 */
export function groupOf(call, owner = '') {
  if (call.kind === 'merge') return 'live';
  if (/decides/i.test(owner) || /^(Decide|Say|Idea)\b/.test(call.title)) return 'decide';
  return call.agent === 'founder' ? 'yours' : 'agents';
}

/** Title: the first clause of the item, cut at a word boundary. */
export function titleOf(what) {
  // "Idea from the founder (17 Nov): a blur option..." names the idea, not who had it
  const text = plain(what).replace(/^Idea from [^:]{1,60}:\s*(.)/, (_, c) => 'Idea: ' + c.toUpperCase());
  const m = text.match(/^(.{12,110}?)(?::\s|\.\s|;\s| \(|$)/);
  let t = (m ? m[1] : text).trim();
  if (t.length > 110) t = t.slice(0, 107).replace(/\s+\S*$/, '') + '...';
  return t;
}

/** The first owner named ("Builder, then founder" is the builder's). */
function agentOf(owner) {
  const named = [['founder', /founder/i], ...AGENTS]
    .map(([key, re]) => ({ key, at: owner.search(re) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at);
  return named.length ? named[0].key : plain(owner) || 'founder';
}

/** One hub task card for one STATUS row. */
export function callOf(row) {
  const text = plain(row.what);
  const next = plain(row.next || '');
  // The Next step column is the card's title; a row without one falls back to
  // the first clause of What.
  const title = next || titleOf(row.what);
  const lead = title.replace(/\.\.\.$/, '');
  let detail = !next && text.startsWith(lead) ? text.slice(lead.length) : text;
  detail = detail.replace(/^[\s:.;,-]+/, '').trim();
  if (detail.length > 600) detail = detail.slice(0, 597).replace(/\s+\S*$/, '') + '...';
  const checked = plain(row.checked);
  if (checked) detail = (detail ? detail + ' ' : '') + `Last checked: ${checked}.`;
  const agent = agentOf(row.owner);
  const call = {
    id: row.id,
    kind: agent === 'founder' ? 'task' : 'approve',
    agent,
    title: `${title}`,
    detail: detail || title,
  };
  if (agent !== 'founder') call.onApprove = `${plain(row.owner)} picks this up in the next session and records the result in STATUS (${row.id}).`;
  const pr = row.what.match(/(?:PR\s*)?#(\d{2,4})\b/);
  call.link = pr ? `${REPO}/pull/${pr[1]}` : `${REPO}/blob/main/docs/STATUS.md`;
  const due = row.what.match(/\bby (\d{4}-\d{2}-\d{2})\b/);
  if (due) call.due = due[1];
  call.group = groupOf(call, row.owner);
  return call;
}

/** One "ready to go live" card for one open pull request (GitHub API shape). */
export function prCallOf(pr) {
  return {
    id: `pr-${pr.number}`,
    kind: 'merge',
    agent: 'release-checker',
    title: `Merge PR #${pr.number}: ${plain(pr.title)}`,
    detail: `Opened ${String(pr.created_at || '').slice(0, 10)} from ${pr.head?.ref || 'a branch'}. Check its safety verdict and checks on GitHub before approving.`,
    onApprove: `The next Claude Code session merges PR #${pr.number} if its checks are green and it is up to date with main.`,
    link: pr.html_url || `${REPO}/pull/${pr.number}`,
    words: `merge ${pr.number}`,
    group: 'live',
  };
}

/** Open, non-draft pull requests from GitHub's public API (the repo is public). */
export async function openPulls() {
  const res = await fetch('https://api.github.com/repos/oconnorjack668-code/Deadeye/pulls?state=open&per_page=50', {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'deadeye-status-to-hub' },
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  return (await res.json()).filter((pr) => !pr.draft);
}

/**
 * The hub snapshot with its calls rebuilt from STATUS and the open pull
 * requests. Every other part of the snapshot is kept as it was. `now`, `sha`
 * and `pulls` are passed in (tests pass a fixed list).
 * @param {{ calls?: any[], log?: any[], [key: string]: any }} snapshot
 * @param {string} status
 * @param {{ now?: Date, sha?: string, pulls?: any[] }} [opts]
 * @returns {{ calls: any[], log: any[], updatedAt: string, updatedBy: string, [key: string]: any }}
 */
export function syncSnapshot(snapshot, status, { now = new Date(), sha = '', pulls = [] } = {}) {
  // The PR check routine writes the safety verdict and checks into a pull
  // request's card (id pr-<n>; older cards merge-<n>): keep that detail while
  // the pull request is open.
  const old = new Map();
  for (const c of snapshot.calls || []) {
    const n = String(c.id).match(/^(?:pr|merge)-(\d+)$/) || String(c.words || '').match(/^merge #?(\d+)$/);
    if (n) old.set(n[1], c);
  }
  const prCards = pulls.map((pr) => {
    const card = prCallOf(pr);
    const prev = old.get(String(pr.number));
    return prev?.detail ? { ...card, detail: prev.detail } : card;
  });
  const calls = [...prCards, ...openRows(status).map(callOf)];
  const at = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const before = new Set((snapshot.calls || []).map((c) => c.id));
  const added = calls.filter((c) => !before.has(c.id)).length;
  const removed = [...before].filter((id) => !calls.some((c) => c.id === id)).length;
  const log = [
    {
      at,
      text: `To-do list rebuilt from STATUS${sha ? ` (main ${sha})` : ''}: ${calls.length} open (${pulls.length} pull requests), ${added} new, ${removed} gone since the last update.`,
      tone: 'ok',
    },
    ...(snapshot.log || []).filter((l) => !/^To-do list rebuilt from STATUS/.test(l.text)),
  ].slice(0, 20);
  return { ...snapshot, calls, log, updatedAt: at, updatedBy: 'status-to-hub (from STATUS on main)' };
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const snapPath = arg('--snapshot');
  const out = arg('--out');
  if (!snapPath || !out) {
    console.error('Usage: node scripts/status-to-hub.mjs --snapshot <in.json> --out <out.json> [--status <STATUS.md>]');
    process.exit(2);
  }
  const git = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  let status;
  let sha = '';
  if (arg('--status')) {
    status = fs.readFileSync(arg('--status'), 'utf8');
  } else {
    try {
      git('git fetch -q origin main');
    } catch {
      console.error('Warning: could not fetch origin/main; using the last fetched copy.');
    }
    status = git('git show origin/main:docs/STATUS.md');
    sha = git('git rev-parse --short origin/main');
  }
  const raw = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
  const snapshot = raw.data && raw.data.calls ? raw.data : raw;
  let pulls = [];
  if (!process.argv.includes('--no-prs')) {
    try {
      pulls = await openPulls();
    } catch (e) {
      console.error(`Warning: open pull requests not read (${e.message}); their cards are left out this time.`);
    }
  }
  const next = syncSnapshot(snapshot, status, { sha, pulls });
  fs.writeFileSync(out, JSON.stringify(next, null, 2) + '\n');
  console.log(`${next.calls.length} open items written to ${out}: ${next.calls.map((c) => c.id).join(', ')}`);
}
