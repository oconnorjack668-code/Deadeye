// src/lib/tierTheme.ts
// The colours a player's level card takes on as they climb tiers. A new colour
// is part of the reward for reaching a tier: the card on the dashboard looks
// different the day it happens, and the player can see where they are headed.
// Full class names, so Tailwind keeps them when it scans the source.
import type { TierName } from '@/lib/achievements';

export interface TierTheme {
  /** Card border and background wash. */
  card: string;
  /** Accent text: the tier name, the level number's label. */
  text: string;
  /** Progress bar fill. */
  bar: string;
  /** Small chip or icon tile. */
  chip: string;
}

export const TIER_THEME: Record<TierName, TierTheme> = {
  Rookie: {
    card: 'border-zinc-600/50 bg-gradient-to-br from-zinc-500/15 to-transparent',
    text: 'text-zinc-300',
    bar: 'bg-gradient-to-r from-zinc-400 to-zinc-300',
    chip: 'bg-zinc-500/20 text-zinc-200',
  },
  Prospect: {
    card: 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 to-transparent',
    text: 'text-emerald-300',
    bar: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    chip: 'bg-emerald-500/20 text-emerald-200',
  },
  'Rotation Player': {
    card: 'border-sky-500/40 bg-gradient-to-br from-sky-500/15 to-transparent',
    text: 'text-sky-300',
    bar: 'bg-gradient-to-r from-sky-500 to-sky-400',
    chip: 'bg-sky-500/20 text-sky-200',
  },
  Starter: {
    card: 'border-blue-500/40 bg-gradient-to-br from-blue-500/15 to-transparent',
    text: 'text-blue-300',
    bar: 'bg-gradient-to-r from-blue-500 to-blue-400',
    chip: 'bg-blue-500/20 text-blue-200',
  },
  'All-Star': {
    card: 'border-violet-500/40 bg-gradient-to-br from-violet-500/15 to-transparent',
    text: 'text-violet-300',
    bar: 'bg-gradient-to-r from-violet-500 to-fuchsia-400',
    chip: 'bg-violet-500/20 text-violet-200',
  },
  MVP: {
    card: 'border-amber-500/50 bg-gradient-to-br from-amber-500/15 to-transparent',
    text: 'text-amber-300',
    bar: 'bg-gradient-to-r from-amber-500 to-yellow-300',
    chip: 'bg-amber-500/20 text-amber-200',
  },
  'Hall of Famer': {
    card: 'border-orange-500/50 bg-gradient-to-br from-orange-600/20 via-red-600/10 to-transparent',
    text: 'text-orange-300',
    bar: 'bg-gradient-to-r from-red-500 to-orange-400',
    chip: 'bg-orange-500/20 text-orange-200',
  },
  GOAT: {
    card: 'border-yellow-400/60 bg-gradient-to-br from-yellow-400/20 via-amber-500/10 to-fuchsia-500/10',
    text: 'text-yellow-300',
    bar: 'bg-gradient-to-r from-yellow-300 via-amber-400 to-fuchsia-400',
    chip: 'bg-yellow-400/20 text-yellow-100',
  },
};
