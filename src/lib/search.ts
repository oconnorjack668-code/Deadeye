// src/lib/search.ts
// App search: the search icon in the top bar. Two halves:
//
//   1. Things to do and places to go, written out here with the words players
//      actually type, so "camera" finds the shot tracker and "rest" finds
//      streak freezes. Searched on the phone, so it is instant and works
//      offline.
//   2. Drills, exercises, IQ lessons, programmes and guides, searched by
//      /api/search under the player's own session.
//
// Players are deliberately not searchable. Most are under 18, and a name
// search would let anyone, adults included, find players they do not know.
// Players are reached through the leaderboard, friend codes and teams.

import type { AppMode } from '@/lib/supabase/types';

export interface SearchEntry {
  id: string;
  title: string;
  hint: string;
  href: string;
  group: 'do' | 'go';
  /** Other words for it: synonyms, US and Irish spellings, what it is for */
  keywords: string[];
  /** Playing unless it says otherwise */
  modes?: AppMode[];
  ownerOnly?: boolean;
}

export interface SearchResult {
  title: string;
  hint: string;
  href: string;
}

const BOTH: AppMode[] = ['playing', 'coaching'];
const COACHING: AppMode[] = ['coaching'];

export const SEARCH_ENTRIES: SearchEntry[] = [
  // Things to do
  { id: 'log-shots', group: 'do', title: 'Log shots', hint: 'Tap where you shot from, then how many went in', href: '/basketball/new', keywords: ['shooting', 'session', 'hoops', 'makes', 'record', 'free throws', 'threes', 'practice', 'practise', 'new session'] },
  { id: 'tracker', group: 'do', title: 'Track shots with the camera', hint: 'The shot tracker counts makes and misses for you', href: '/video?tab=shots', keywords: ['camera', 'shot tracker', 'video', 'record', 'film', 'ai', 'automatic', 'phone'] },
  { id: 'form-check', group: 'do', title: 'Check your shooting form', hint: 'Film a shot and get feedback on your mechanics', href: '/video?tab=form', keywords: ['form', 'technique', 'mechanics', 'release', 'elbow', 'video'] },
  { id: 'jump-test', group: 'do', title: 'Test your jump', hint: 'Measure your vertical with the camera', href: '/video?tab=jump', keywords: ['vertical', 'jump', 'leap', 'bounce', 'hops', 'dunk'] },
  { id: 'log-workout', group: 'do', title: 'Log a gym workout', hint: 'Sets, reps and weights', href: '/workouts/new', keywords: ['gym', 'lift', 'weights', 'strength', 'workout', 'reps', 'sets', 'training'] },
  { id: 'log-game', group: 'do', title: 'Log a game', hint: 'Your points, rebounds and assists from a match', href: '/games/new', keywords: ['game', 'match', 'box score', 'stats', 'points', 'rebounds', 'assists'] },
  { id: 'iq-question', group: 'do', title: "Answer today's IQ question", hint: 'One question a day about reads, rules and decisions', href: '/study', keywords: ['iq', 'quiz', 'daily', 'question', 'rules', 'decisions'] },
  { id: 'plan', group: 'do', title: 'Make a training plan', hint: 'A session built for what you want to work on', href: '/train/generate', keywords: ['plan', 'generate', 'routine', 'schedule', 'what to train', 'build'] },
  { id: 'ask-coach', group: 'do', title: 'Ask the AI coach', hint: 'Chat about your game', href: '/ai-coach/chat', keywords: ['coach', 'ai', 'chat', 'help', 'advice', 'question'] },
  { id: 'perf-test', group: 'do', title: 'Run a performance test', hint: 'Sprints, agility and more, to track over time', href: '/workouts/tests/new', keywords: ['test', 'sprint', 'speed', 'agility', 'benchmark', 'fitness', 'metres', 'meters'] },
  { id: 'add-friend', group: 'do', title: 'Add a friend', hint: 'Swap friend codes', href: '/friends', keywords: ['friend', 'friend code', 'invite', 'add', 'mates'] },
  { id: 'join-team', group: 'do', title: 'Join a team', hint: 'With the code your coach gave you', href: '/teams', keywords: ['team', 'team code', 'club', 'join', 'squad'] },
  { id: 'home-club', group: 'do', title: 'Pick your club', hint: 'The club you play for, private unless you show it', href: '/settings#club', keywords: ['club', 'home club', 'team', 'badge'], modes: BOTH },
  { id: 'reminders', group: 'do', title: 'Set a reminder', hint: 'A nudge on the days you want to train', href: '/settings#notifications', keywords: ['reminder', 'notification', 'notifications', 'push', 'alert', 'nudge'], modes: BOTH },
  { id: 'sample', group: 'do', title: 'Watch the tracker call a session', hint: 'A 30-second sample clip', href: '/welcome/sample', keywords: ['sample', 'demo', 'try', 'example', 'how it works'] },
  { id: 'install', group: 'do', title: 'Add Deadeye to your home screen', hint: 'It opens full screen, like any app', href: '/install', keywords: ['install', 'home screen', 'app', 'download', 'iphone', 'android', 'shortcut'], modes: BOTH },
  { id: 'founder-post', group: 'do', title: 'Write a founder post', hint: 'For the players who follow you', href: '/admin/posts', keywords: ['post', 'announcement', 'followers', 'founder'], modes: BOTH, ownerOnly: true },

  // Places to go
  { id: 'home', group: 'go', title: 'Home', hint: 'Today, your level and your week', href: '/dashboard', keywords: ['dashboard', 'today', 'start'] },
  { id: 'hoops', group: 'go', title: 'Hoops sessions', hint: 'Every session you have logged, and your shot chart', href: '/basketball', keywords: ['history', 'sessions', 'shot chart', 'shooting', 'percentage', 'zones'] },
  { id: 'gym', group: 'go', title: 'Gym', hint: 'Your workouts and routines', href: '/workouts', keywords: ['workouts', 'routines', 'lifting', 'weights'] },
  { id: 'exercises', group: 'go', title: 'Exercise library', hint: 'Every exercise, by muscle group', href: '/workouts/exercises', keywords: ['exercises', 'muscles', 'legs', 'core', 'upper body'] },
  { id: 'fuel', group: 'go', title: 'Fuel', hint: 'Food and water around training', href: '/workouts/fuel', keywords: ['food', 'nutrition', 'water', 'hydration', 'eating', 'diet', 'drink'] },
  { id: 'tests', group: 'go', title: 'Performance tests', hint: 'Your test results over time', href: '/workouts/tests', keywords: ['tests', 'results', 'sprint', 'agility'] },
  { id: 'train', group: 'go', title: 'Train', hint: 'Programmes, drills, guides and video', href: '/train', keywords: ['training', 'practice', 'practise'] },
  { id: 'programmes', group: 'go', title: 'Programmes', hint: 'Week-by-week plans for a goal', href: '/programs', keywords: ['program', 'programs', 'programme', 'plan', 'weeks', 'schedule'] },
  { id: 'drills', group: 'go', title: 'Drill library', hint: 'Every drill, by skill and level', href: '/drills', keywords: ['drills', 'skills', 'ball handling', 'dribbling', 'finishing', 'defence', 'defense'], modes: BOTH },
  { id: 'guides', group: 'go', title: 'Guides', hint: 'Recovery, growing pains and more', href: '/guides', keywords: ['articles', 'advice', 'injury', 'recovery', 'growing pains', 'sleep', 'warm up'], modes: BOTH },
  { id: 'style-match', group: 'go', title: 'Play style match', hint: 'Which player your game is most like', href: '/style-match', keywords: ['style', 'nba', 'player', 'compare', 'like'] },
  { id: 'video', group: 'go', title: 'Video AI', hint: 'Shot tracker, form check, jump test and film', href: '/video', keywords: ['video', 'camera', 'ai'] },
  { id: 'game-film', group: 'go', title: 'Game film', hint: 'Tag plays in your game videos', href: '/video?tab=film', keywords: ['film', 'game video', 'tag', 'plays'] },
  { id: 'clips', group: 'go', title: 'Saved clips', hint: 'Your saved videos', href: '/video?tab=clips', keywords: ['clips', 'videos', 'highlights', 'saved'] },
  { id: 'iq', group: 'go', title: 'Basketball IQ', hint: 'Lessons and quizzes on reads and rules', href: '/study', keywords: ['iq', 'study', 'lessons', 'quiz', 'rules', 'learn'] },
  { id: 'film-questions', group: 'go', title: 'Film questions', hint: 'Was that the right read? Ask your coach', href: '/film-questions', keywords: ['film', 'question', 'read', 'coach'] },
  { id: 'ai-coach', group: 'go', title: 'AI Coach', hint: 'Reports on your sessions', href: '/ai-coach', keywords: ['coach', 'ai', 'reports', 'feedback'] },
  { id: 'games', group: 'go', title: 'Games', hint: 'Every game you have logged', href: '/games', keywords: ['games', 'matches', 'stats', 'box scores'] },
  { id: 'goals', group: 'go', title: 'Goals', hint: 'What you are working towards', href: '/goals', keywords: ['goals', 'targets', 'aims'] },
  { id: 'leaderboard', group: 'go', title: 'Leaderboard', hint: 'Season points, with friends, county and country', href: '/leaderboard', keywords: ['ranks', 'rank', 'points', 'season', 'top', 'standings', 'ranking'] },
  { id: 'friends', group: 'go', title: 'Friends', hint: 'Your friends and their week', href: '/friends', keywords: ['friends', 'mates', 'requests'] },
  { id: 'teams', group: 'go', title: 'Teams', hint: 'Your teams and teammates', href: '/teams', keywords: ['teams', 'club', 'squad', 'teammates'], modes: BOTH },
  { id: 'streak', group: 'go', title: 'Streaks', hint: 'Days in a row, rest days and streak freezes', href: '/streak', keywords: ['streak', 'freeze', 'rest day', 'days in a row', 'fire'] },
  { id: 'achievements', group: 'go', title: 'Achievements', hint: 'Badges, levels and XP', href: '/achievements', keywords: ['badges', 'level', 'xp', 'awards', 'trophies'] },
  { id: 'profile', group: 'go', title: 'Profile', hint: 'Your card, photo and stats', href: '/profile', keywords: ['me', 'avatar', 'photo', 'picture', 'emoji', 'card'], modes: BOTH },
  { id: 'pro', group: 'go', title: 'Deadeye Pro', hint: 'What Pro adds, and the price', href: '/pro', keywords: ['pro', 'upgrade', 'premium', 'price', 'subscription', 'pay'] },
  { id: 'settings', group: 'go', title: 'Settings', hint: 'Account, privacy, units and more', href: '/settings', keywords: ['settings', 'options', 'preferences'], modes: BOTH },
  { id: 'settings-account', group: 'go', title: 'Account', hint: 'Settings: display name, sign out', href: '/settings#account', keywords: ['name', 'display name', 'change name', 'sign out', 'log out', 'logout', 'email', 'account role'], modes: BOTH },
  { id: 'settings-privacy', group: 'go', title: 'Privacy', hint: 'Settings: who sees you, friend requests', href: '/settings#privacy', keywords: ['private', 'public', 'visibility', 'friend requests', 'hide', 'show position', 'show height'], modes: BOTH },
  { id: 'settings-ai', group: 'go', title: 'AI coaching settings', hint: 'Settings: turn the AI coach on or off', href: '/settings#ai-coaching', keywords: ['ai', 'coach', 'turn off', 'off'] },
  { id: 'settings-sounds', group: 'go', title: 'Shot sounds', hint: 'Settings: the sound for each make and miss', href: '/settings#sounds', keywords: ['sound', 'sounds', 'audio', 'voice', 'mute', 'volume'] },
  { id: 'settings-region', group: 'go', title: 'Region', hint: 'Settings: country, county and time zone', href: '/settings#region', keywords: ['country', 'county', 'location', 'time zone', 'timezone'], modes: BOTH },
  { id: 'settings-units', group: 'go', title: 'Units', hint: 'Settings: metres or feet, kg or lbs', href: '/settings#units', keywords: ['units', 'metric', 'imperial', 'metres', 'meters', 'feet', 'kg', 'lbs', 'height'], modes: BOTH },
  { id: 'settings-subscription', group: 'go', title: 'Subscription', hint: 'Settings: your plan, billing and cancelling', href: '/settings#subscription', keywords: ['subscription', 'billing', 'cancel', 'plan', 'payment', 'pro'], modes: BOTH },
  { id: 'settings-data', group: 'go', title: 'Your data', hint: 'Settings: download your data, delete your account', href: '/settings#data', keywords: ['data', 'download', 'export', 'delete account', 'delete', 'gdpr'], modes: BOTH },
  { id: 'settings-about', group: 'go', title: 'Help and about', hint: 'Settings: report a problem, contact, version', href: '/settings#about', keywords: ['help', 'report', 'problem', 'bug', 'support', 'contact', 'version', 'feedback'], modes: BOTH },
  { id: 'privacy-policy', group: 'go', title: 'Privacy policy', hint: 'What Deadeye stores and why', href: '/privacy', keywords: ['privacy', 'policy', 'data', 'gdpr'], modes: BOTH },
  { id: 'terms', group: 'go', title: 'Terms of use', hint: 'The rules for using Deadeye', href: '/terms', keywords: ['terms', 'rules', 'conditions'], modes: BOTH },

  // Coaching
  { id: 'coach-home', group: 'go', title: 'Coach home', hint: 'Your teams at a glance', href: '/coach', keywords: ['coach', 'home', 'dashboard'], modes: COACHING },
  { id: 'assignments', group: 'go', title: 'Assignments', hint: 'Set drills and sessions for your teams', href: '/coach/assignments', keywords: ['assignments', 'homework', 'set', 'tasks'], modes: COACHING },
  { id: 'coach-setup', group: 'go', title: 'Coach setup', hint: 'Your club and safeguarding details', href: '/coach/setup', keywords: ['setup', 'club', 'vetting', 'safeguarding'], modes: COACHING },

  // Owner tools
  { id: 'admin', group: 'go', title: 'Owner tools', hint: 'Reports, crashes, funnel and posts', href: '/admin', keywords: ['owner', 'admin', 'tools'], modes: BOTH, ownerOnly: true },
  { id: 'admin-funnel', group: 'go', title: 'Player funnel', hint: 'Owner: where new players stop', href: '/admin/funnel', keywords: ['funnel', 'activation', 'counts', 'stats'], modes: BOTH, ownerOnly: true },
  { id: 'admin-reports', group: 'go', title: 'Player reports', hint: 'Owner: problems players reported', href: '/admin/errors#reports', keywords: ['reports', 'problems', 'feedback'], modes: BOTH, ownerOnly: true },
  { id: 'admin-crashes', group: 'go', title: 'Crash reports', hint: 'Owner: errors players hit', href: '/admin/errors#crashes', keywords: ['crashes', 'errors', 'bugs'], modes: BOTH, ownerOnly: true },
];

/** What the search shows before anything is typed */
export const SEARCH_SUGGESTIONS: Record<AppMode, string[]> = {
  playing: ['log-shots', 'tracker', 'iq-question', 'drills', 'leaderboard'],
  coaching: ['assignments', 'drills', 'teams', 'guides'],
};

/**
 * Lower case, no accents, and only letters, digits and spaces, so "Défense"
 * matches "defense" and "free-throw" matches "free throw".
 */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * A search as typed, cut down to letters, digits, spaces, hyphens and
 * apostrophes. It goes inside a PostgREST filter, where commas, brackets and
 * wildcards would mean something.
 */
export function cleanSearch(raw: string | null | undefined): string | undefined {
  const q = (raw || '').replace(/[^\p{L}\p{N} '-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  return q || undefined;
}

function entryScore(entry: SearchEntry, tokens: string[], query: string): number {
  const title = normalize(entry.title);
  const titleWords = title.split(' ');
  const keywordWords = entry.keywords.flatMap((k) => normalize(k).split(' '));
  const phrases = entry.keywords.map(normalize);
  let score = 0;
  for (const token of tokens) {
    if (titleWords.some((w) => w.startsWith(token))) score += 3;
    else if (keywordWords.some((w) => w.startsWith(token))) score += 2;
    else if (title.includes(token)) score += 1;
    else return 0; // every word typed has to match something
  }
  if (title.startsWith(query)) score += 4;
  if (phrases.includes(query)) score += 3;
  return score;
}

/** The things to do and places to go that match, best first */
export function searchEntries(
  raw: string,
  { mode, isOwner }: { mode: AppMode; isOwner: boolean }
): { do: SearchEntry[]; go: SearchEntry[] } {
  const query = normalize(raw);
  const empty = { do: [], go: [] };
  if (!query) return empty;
  const tokens = query.split(' ');
  const scored = SEARCH_ENTRIES.filter((e) => (e.modes ?? ['playing']).includes(mode) && (!e.ownerOnly || isOwner))
    .map((entry) => ({ entry, score: entryScore(entry, tokens, query) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return {
    do: scored.filter((s) => s.entry.group === 'do').slice(0, 4).map((s) => s.entry),
    go: scored.filter((s) => s.entry.group === 'go').slice(0, 5).map((s) => s.entry),
  };
}

export function suggestedEntries(mode: AppMode): SearchEntry[] {
  return SEARCH_SUGGESTIONS[mode].map((id) => SEARCH_ENTRIES.find((e) => e.id === id)).filter((e): e is SearchEntry => !!e);
}
