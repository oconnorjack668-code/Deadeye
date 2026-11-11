#!/usr/bin/env node
// Agent OS guard: PreToolUse hook used by the agents in .claude/agents/.
// It turns the permission table in docs/agent-os/README.md into checks the
// harness enforces. Exit 0 allows the tool call; exit 2 blocks it and shows
// stderr to the agent.
//
// Modes (first argument):
//   paths <prefix>...  Edit/Write only inside these repo-relative prefixes.
//   git                Bash: no push to main/master, no force push, no .env.local.
//   push-checks        Bash: `git push` only after tsc, eslint (changed files) and tests pass.
//                      Also applies the `git` rules.
//   readonly           MCP: block tools whose name creates, updates, deletes or sends.
//   nopublish          MCP: drafting is fine; block publish, share, send, delete.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const [mode, ...args] = process.argv.slice(2);

async function stdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

function block(reason) {
  process.stderr.write(`Blocked by the Agent OS guard (.claude/hooks/guard.mjs): ${reason}\n`);
  process.exit(2);
}

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let workDir = projectDir; // set from the hook input below

// Repo-relative path; a file inside a git worktree (.claude/worktrees/<name>/)
// is judged by its path inside that worktree.
function rel(p) {
  const abs = path.isAbsolute(p) ? p : path.join(workDir, p);
  let r = path.relative(projectDir, abs).split(path.sep).join('/');
  r = r.replace(/^\.claude\/worktrees\/[^/]+\//, '');
  return r;
}

function gitRules(cmd) {
  if (/\.env\.local\b/.test(cmd)) block('.env.local is off limits (AGENTS.md).');
  // `git push`, `git -C dir push` and the like; not `git stash push`.
  if (!/\bgit\b(?:(?!\bstash\b)[^|;&])*\bpush\b/.test(cmd)) return false;
  if (/\s(--force(-with-lease)?|-f)(\s|$)/.test(cmd) || /\s\+\S+/.test(cmd)) {
    block('force pushes are not allowed.');
  }
  if (/(^|[\s:])(refs\/heads\/)?(main|master)(\s|$)/.test(cmd.split(/\bpush\b/)[1] || '')) {
    block('pushing to main or master is not allowed; push your own branch and open a pull request.');
  }
  return true;
}

function run(label, command) {
  const r = spawnSync(command, { cwd: workDir, shell: true, encoding: "utf8", timeout: 540000 });
  if (r.status !== 0) {
    const out = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').slice(-40).join('\n');
    block(`${label} failed, so the push is blocked. Fix it, then push again.\n${out}`);
  }
}

const input = JSON.parse((await stdin()) || '{}');
const tool = input.tool_name || '';
const ti = input.tool_input || {};
if (input.cwd) workDir = input.cwd;

switch (mode) {
  case 'paths': {
    const file = ti.file_path || ti.notebook_path;
    if (!file) break;
    const r = rel(file);
    if (r.startsWith('..')) block(`${file} is outside the repository.`);
    if (/(^|\/)\.env\.local$/.test(r)) block('.env.local is off limits (AGENTS.md).');
    const ok = args.some((prefix) => r === prefix || r.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`));
    if (!ok) block(`this agent may only write in: ${args.join(', ')}. Tried: ${r}`);
    break;
  }
  case 'git': {
    if (tool === 'Bash' || tool === 'PowerShell') gitRules(ti.command || '');
    break;
  }
  case 'push-checks': {
    if (tool !== 'Bash' && tool !== 'PowerShell') break;
    const cmd = ti.command || '';
    if (!gitRules(cmd)) break;
    run('Type check (npx tsc --noEmit)', 'npx tsc --noEmit');
    const diff = spawnSync('git diff --name-only --diff-filter=ACMR origin/main...HEAD', {
      cwd: workDir, shell: true, encoding: "utf8",
    });
    const files = (diff.stdout || '').split('\n').filter((f) => /\.(m?[jt]sx?)$/.test(f.trim()));
    if (files.length) run('Lint (npx eslint on changed files)', `npx eslint ${files.map((f) => `"${f.trim()}"`).join(' ')}`);
    run('Tests (npm test)', 'npm test');
    break;
  }
  case 'readonly': {
    const name = tool.split('__').pop() || '';
    if (/(^|_)(create|update|delete|remove|resolve|assign|mute|ignore|send|post|publish|share|trash|deploy|promote|rollback|edit|write|set|add|apply|execute)(_|$)/i.test(name)) {
      block(`${tool} changes something; this agent's access to it is read-only.`);
    }
    break;
  }
  case 'nopublish': {
    const name = tool.split('__').pop() || '';
    if (/(^|_)(publish|share|send|post|invite|delete|remove|trash|export_to|schedule)(_|$)/i.test(name)) {
      block(`${tool} publishes, shares, sends or deletes; this agent only drafts. The founder does that step.`);
    }
    break;
  }
  default:
    break;
}
process.exit(0);
