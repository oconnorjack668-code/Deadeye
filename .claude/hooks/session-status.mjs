#!/usr/bin/env node
// SessionStart hook: puts docs/STATUS.md (what is open and recently done)
// into every new Claude Code chat, so a session never starts from an old
// handoff's "Open" list. Prints a warning when STATUS.md is older than the
// work on this branch. Never fails the session: any error prints nothing.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
try {
  const file = path.join(dir, 'docs', 'STATUS.md');
  const status = fs.readFileSync(file, 'utf8');
  let note = '';
  try {
    const run = (cmd) => execSync(cmd, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
    const last = run('git log -1 --format=%H -- docs/STATUS.md');
    const since = last ? Number(run(`git rev-list --count ${last}..HEAD`)) : 0;
    if (since >= 5) {
      note = `\nWARNING: ${since} commits have landed since docs/STATUS.md last changed. Check its open items against those commits (git log --oneline ${last.slice(0, 7)}..HEAD) before relying on it, and update it.\n`;
    }
  } catch {
    // not a git checkout, or git missing: skip the freshness check
  }
  process.stdout.write(
    `Current project status (docs/STATUS.md). It wins over old handoffs and memory notes; never call an item broken or still to do from an old note without checking.${note}\n\n${status}`,
  );
} catch {
  // no STATUS.md: say nothing
}
