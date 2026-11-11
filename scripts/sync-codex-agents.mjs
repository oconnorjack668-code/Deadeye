#!/usr/bin/env node
// Generates .codex/agents/<name>.toml from .claude/agents/<name>.md, so Codex
// and Claude Code run the same agents. Run after changing any agent file:
//   node scripts/sync-codex-agents.mjs          write the files
//   node scripts/sync-codex-agents.mjs --check  exit 1 if any file is stale
// The Claude file is the source; never edit the .toml by hand.
import fs from 'node:fs';
import path from 'node:path';

const SRC = '.claude/agents';
const OUT = '.codex/agents';
const check = process.argv.includes('--check');

function frontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('no frontmatter');
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2];
  }
  const skills = [...m[1].matchAll(/^skills:\n((?:\s+- .*\n?)+)/gm)]
    .flatMap((s) => s[1].split('\n').map((l) => l.replace(/^\s+- /, '').trim()).filter(Boolean));
  return { fm, skills, body: m[2] };
}

function tomlBasic(s) {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

let stale = 0;
fs.mkdirSync(OUT, { recursive: true });
for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith('.md')).sort()) {
  const src = fs.readFileSync(path.join(SRC, file), 'utf8').replace(/\r\n/g, '\n');
  const { fm, skills, body } = frontmatter(src);
  const name = fm.name || file.replace(/\.md$/, '');
  const playbook = `.claude/skills/${name}-playbook/SKILL.md`;
  const note = [
    `Codex note: this file is generated from \`.claude/agents/${name}.md\` by`,
    '`scripts/sync-codex-agents.mjs`; edit that file, not this one.',
    skills.length ? `The skills it names are Claude Code skills: ${skills.join(', ')}.` : '',
    fs.existsSync(playbook) ? `Read \`${playbook}\` and its \`examples.md\` yourself before you start: they are your method and standards.` : '',
    'Where it asks for a `Skills:` line, write the skills files you read.',
  ].filter(Boolean).join('\n');
  let text = body.trim();
  if (text.includes("'''")) throw new Error(`${file}: body contains ''' and cannot be a TOML literal string`);
  const toml = `name = ${tomlBasic(name)}\ndescription = ${tomlBasic(fm.description || '')}\ndeveloper_instructions = '''\n${note}\n\n${text}\n'''\n`;
  const out = path.join(OUT, `${name}.toml`);
  const old = fs.existsSync(out) ? fs.readFileSync(out, 'utf8').replace(/\r\n/g, '\n') : null;
  if (old === toml) continue;
  stale++;
  if (check) console.log(`stale: ${out}`);
  else { fs.writeFileSync(out, toml); console.log(`wrote ${out}`); }
}
if (check && stale) process.exit(1);
