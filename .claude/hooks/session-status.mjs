#!/usr/bin/env node
// SessionStart hook: puts docs/STATUS.md (what is open and recently done)
// into every new Claude Code chat, so a session never starts from an old
// handoff's "Open" list.
//
// It prints main's copy (origin/main after a quick fetch), not the copy in
// this checkout: a checkout left on an old branch has an old STATUS.md, and
// on 2026-11-18 that made a session list S35 as open a day after it was
// closed on main. Warns when this checkout is behind main, and when work has
// landed on main since STATUS.md last changed. Falls back to the local file
// when git or origin/main is unavailable, and says so. Never fails the
// session: any error prints nothing.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const run = (cmd, timeout = 5000) =>
  execSync(cmd, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout }).trim();

try {
  let status = '';
  let source = 'origin/main';
  const notes = [];

  try {
    try {
      run('git fetch -q origin main', 8000);
    } catch {
      notes.push("Could not fetch origin/main; main's copy below may be slightly old.");
    }
    status = run('git show origin/main:docs/STATUS.md');

    const behind = Number(run('git rev-list --count HEAD..origin/main'));
    if (behind > 0) {
      const branch = run('git rev-parse --abbrev-ref HEAD');
      notes.push(
        `This checkout (${branch}) is ${behind} commits behind origin/main, so its local docs/STATUS.md and other files may be old. The status below is main's. Check code and docs on origin/main (git show origin/main:<path>) or in a fresh worktree before calling anything open or broken.`,
      );
    }

    const last = run('git log -1 --format=%H origin/main -- docs/STATUS.md');
    const since = last ? Number(run(`git rev-list --count --no-merges ${last}..origin/main`)) : 0;
    if (since >= 5) {
      notes.push(
        `${since} commits have landed on main since docs/STATUS.md last changed. Check its open items against them (git log --oneline ${last.slice(0, 7)}..origin/main) and update it.`,
      );
    }
  } catch {
    status = '';
  }

  if (!status) {
    status = fs.readFileSync(path.join(dir, 'docs', 'STATUS.md'), 'utf8');
    source = 'this checkout (origin/main could not be read; confirm it is current before relying on it)';
  }

  const head = `Current project status (docs/STATUS.md from ${source}). It wins over old handoffs and memory notes; never call an item broken or still to do from an old note without checking.`;
  const warn = notes.length ? `\n${notes.map((n) => `WARNING: ${n}`).join('\n')}\n` : '';
  process.stdout.write(`${head}${warn}\n\n${status}`);
} catch {
  // no STATUS.md anywhere: say nothing
}
