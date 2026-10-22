// src/lib/redact.ts
// Problem and crash reports made safe to hand to the agents (support-triage).
// Emails, phone numbers, links, @handles, ids, ages and any player display
// name are replaced. Then it fails safe: a report that could still say who
// someone is (a school, a place, an address, or a name the app does not
// know) is held back whole, and only its page and date go to the agents.
// What reaches them is the bug, never the person.

import { SEARCH_ENTRIES } from '@/lib/search';

export interface ReportForAgents {
  created_at: string;
  message: string;
  context: string | null;
  page: string;
  device: string;
}

export interface CrashForAgents {
  message: string;
  count: number;
  players: number;
  pages: string[];
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Takes out contact details and the names of players from free text */
export function redact(text: string, names: string[]): string {
  let out = text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
    .replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi, '[link]')
    .replace(/(^|\s)@[\w.]{2,}/g, '$1[handle]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[id]')
    .replace(/\+?\d[\d\s().-]{6,}\d/g, '[number]')
    .replace(/\b\d{1,2}\s*(years?\s+old|yrs?\s+old|yo|y\/o)\b/gi, '[age]')
    .replace(/\b(i'?m|i am|aged?)\s+\d{1,2}\b/gi, '$1 [age]');
  // Longest first, so "Sam Murphy" goes before "Sam" could split it
  const unique = [...new Set(names.map((n) => n.trim()).filter((n) => n.length >= 3 && n.toLowerCase() !== 'player'))];
  for (const name of unique.sort((a, b) => b.length - a.length)) {
    out = out.replace(new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(name)}(?=$|[^\\p{L}\\p{N}])`, 'giu'), '$1[name]');
  }
  return out;
}

// Words that point at a real place or school in Ireland
const SCHOOL = /\b(school|college|cbs|gaelscoil|gaelcholáiste|coláiste|colaiste|secondary|primary|academy|convent|teacher|classmates?|transition year|(1st|2nd|3rd|4th|5th|6th|first|second|third|fourth|fifth|sixth) year)\b/i;
const ADDRESS = /\b(street|road|avenue|estate|eircode|apartment|house number)\b|\b[ac-fhkn-prtv-y]\d{2}\s?[ac-fhkn-prtv-y0-9]{4}\b/i;
const PLACES = /\b(antrim|armagh|carlow|cavan|clare|cork|derry|donegal|down|dublin|fermanagh|galway|kerry|kildare|kilkenny|laois|leitrim|limerick|longford|louth|mayo|meath|monaghan|offaly|roscommon|sligo|tipperary|tyrone|waterford|westmeath|wexford|wicklow|belfast|gorey|enniscorthy|new ross|drogheda|dundalk|swords|navan|bray|athlone|tralee|ennis|letterkenny|tullamore|portlaoise|mullingar|naas|newbridge|carlow|killarney|arklow|wexford)\b/i;

// Capitalised words a bug report uses without naming anyone: the app own
// words, devices and the like. Any other capitalised word mid-sentence may
// be a name, a club or a place, and holds the report back.
const KNOWN = new Set(
  [
    ...SEARCH_ENTRIES.flatMap((e) => e.title.split(/[^\p{L}']+/u)),
    'i', "i'm", "i've", "i'd", "i'll", 'deadeye', 'iphone', 'ipad', 'ios', 'android', 'samsung', 'pixel', 'chrome', 'safari',
    'firefox', 'google', 'apple', 'wifi', 'pro', 'iq', 'ai', 'ok', 'make', 'miss', 'undo', 'save', 'finish', 'enter', 'track',
    'tracker', 'video', 'camera', 'hoops', 'gym', 'train', 'coach', 'settings', 'leaderboard', 'streak', 'level', 'xp',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april',
    'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'nba', 'fiba', 'pb', 'mins',
  ]
    .map((w) => w.toLowerCase())
    .filter(Boolean)
);

function unknownCapitalised(text: string): boolean {
  // Each sentence or line, past its first word, which is capitalised anyway
  for (const sentence of text.split(/[.!?:;\n]+/)) {
    const words = sentence.trim().split(/[^\p{L}'\[\]]+/u).slice(1);
    for (const word of words) {
      if (/^\p{Lu}/u.test(word) && !KNOWN.has(word.toLowerCase())) return true;
    }
  }
  return false;
}

/** Why a redacted text might still say who someone is, or null when it is safe */
export function mayIdentify(text: string, { technical = false }: { technical?: boolean } = {}): string | null {
  if (SCHOOL.test(text)) return 'it may name a school or class';
  if (ADDRESS.test(text)) return 'it may hold an address';
  if (PLACES.test(text)) return 'it may name a town or county';
  // Crash messages are code words (TypeError, Cannot read), not names
  if (!technical && unknownCapitalised(text)) return 'it may name a person, club or place';
  return null;
}

/** The text the founder copies from Owner tools for support-triage */
export function reportsForAgents(date: string, reports: ReportForAgents[], crashes: CrashForAgents[], names: string[]): string {
  const lines = [
    `# Problem reports, copied ${date}`,
    '',
    'Names, contact details, links, ids and ages are taken out, and any report that could still say who someone is',
    'is held back. Pages, dates and counts are kept.',
    '',
  ];
  lines.push(`## Player reports (${reports.length} open)`, '');
  if (reports.length === 0) lines.push('None open.', '');
  reports.forEach((r, i) => {
    const message = redact(r.message, names);
    const context = r.context ? redact(r.context, names) : null;
    const held = mayIdentify(message) ?? (context ? mayIdentify(context) : null);
    lines.push(`### ${i + 1}. ${r.created_at.slice(0, 10)} · ${r.page} · ${r.device}`, '');
    if (held) {
      lines.push(`Held back: ${held}. The founder reads this one in Owner tools → Player reports.`, '');
      return;
    }
    lines.push(message);
    if (context) lines.push('', `Context: ${context}`);
    lines.push('');
  });
  lines.push(`## Crash reports (${crashes.length} open, grouped)`, '');
  if (crashes.length === 0) lines.push('None open.', '');
  for (const c of crashes) {
    const message = redact(c.message, names);
    const where = `${c.count}× from ${c.players} ${c.players === 1 ? 'player' : 'players'} on ${c.pages.join(', ') || 'unknown page'}`;
    const held = mayIdentify(message, { technical: true });
    lines.push(held ? `- ${where}: held back, ${held}. Read it in Owner tools → Crash reports.` : `- ${where}: ${message}`);
  }
  lines.push('');
  return lines.join('\n');
}
