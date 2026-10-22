// src/lib/githubFile.ts
// SERVER-ONLY: writes one file to a branch of this repository through the
// GitHub contents API, for the weekly counts job (api/cron/agent-counts).
// AGENT_DATA_GITHUB_TOKEN is a fine-grained token for this repository only,
// with Contents read and write and nothing else.

/** Creates or replaces one file on a branch through the GitHub contents API */
export async function saveToGitHub(path: string, content: string, message: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = process.env.AGENT_DATA_GITHUB_TOKEN;
  if (!token) return { ok: false, error: 'AGENT_DATA_GITHUB_TOKEN is not set' };
  const repo = process.env.AGENT_DATA_REPO || 'oconnorjack668-code/deadeye';
  const branch = process.env.AGENT_DATA_BRANCH || 'agent-os';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };

  // Replacing a file needs its current sha; a new file has none
  const existing = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers });
  const sha = existing.ok ? ((await existing.json()) as { sha?: string }).sha : undefined;
  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ message, content: Buffer.from(content, 'utf8').toString('base64'), branch, ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) return { ok: false, error: `GitHub answered ${res.status}` };
  return { ok: true };
}
