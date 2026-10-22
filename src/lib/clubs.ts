// src/lib/clubs.ts
// The clubs a player can pick as their home club (src/data/clubs.json, built
// from docs/agent-os/clubs/directory.csv by scripts/build-clubs.mjs), and the
// rules for "my club is not listed". The club itself is stored in
// player_clubs (00051), never on the profile.
import clubsData from '@/data/clubs.json';
import { normalize } from '@/lib/search';

export interface Club {
  id: string;
  name: string;
  aka: string[];
  town: string | null;
  county: string | null;
  country: string | null;
}

export const CLUBS: Club[] = clubsData as Club[];

const byId = new Map(CLUBS.map((c) => [c.id, c]));

export function clubById(id: string | null | undefined): Club | null {
  return id ? byId.get(id) ?? null : null;
}

/** "Gorey, Wexford" or "Belfast, Northern Ireland" */
export function clubPlace(club: Club): string {
  return [club.town, club.county ?? club.country].filter((p, i, all) => p && all.indexOf(p) === i).join(', ');
}

/** Clubs whose name, other names, town or county match every word typed, best first */
export function searchClubs(raw: string, limit = 20): Club[] {
  const q = normalize(raw);
  if (q.length < 2) return [];
  const words = q.split(' ');
  const scored: Array<{ club: Club; score: number }> = [];
  for (const club of CLUBS) {
    const names = [club.name, ...club.aka].map(normalize);
    const place = normalize(`${club.town ?? ''} ${club.county ?? ''}`);
    const text = `${names.join(' ')} ${place}`;
    if (!words.every((w) => text.split(' ').some((t) => t.startsWith(w)))) continue;
    const score = names.some((n) => n.startsWith(q)) ? 3 : names.some((n) => n.includes(q)) ? 2 : 1;
    scored.push({ club, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.club.name.localeCompare(b.club.name, 'en'))
    .slice(0, limit)
    .map((s) => s.club);
}

export const SUGGESTION_OPEN_MAX = 5;

/** A "club not listed" suggestion to save, or what is wrong with it */
export function checkSuggestion(input: { clubName?: unknown; town?: unknown; county?: unknown }):
  | { clubName: string; town: string | null; county: string | null }
  | { error: string } {
  const clean = (v: unknown, max: number) =>
    typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
  const clubName = clean(input.clubName, 80);
  if (clubName.length < 2) return { error: 'Type the name of your club.' };
  // A club name, not a way to send someone a message or contact details
  if (/@|https?:\/\/|www\.|\d{6,}/i.test(`${clubName} ${input.town ?? ''} ${input.county ?? ''}`)) {
    return { error: 'Just the club name and where it is, please.' };
  }
  return { clubName, town: clean(input.town, 60) || null, county: clean(input.county, 40) || null };
}
