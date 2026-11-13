// src/lib/build.ts
// The running build, set in next.config.ts at build time: the commit (first 7
// characters), production, preview or local, and when it was built (UTC).

export const BUILD = {
  sha: process.env.BUILD_SHA || 'local',
  env: process.env.BUILD_ENV || 'local',
  time: process.env.BUILD_TIME || '',
};

/** "a1b2c3d · production · 2026-11-13 14:02 UTC" */
export function buildLabel(build = BUILD): string {
  const when = build.time ? `${build.time.slice(0, 16).replace('T', ' ')} UTC` : '';
  return [build.sha, build.env, when].filter(Boolean).join(' · ');
}
