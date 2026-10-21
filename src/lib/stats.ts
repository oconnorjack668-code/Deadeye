// src/lib/stats.ts
import type { ShotZone } from '@/lib/supabase/types';

export function calculateShootingPercentage(makes: number, attempts: number): number {
  if (attempts <= 0) return 0;
  return Math.round((makes / attempts) * 1000) / 10; // One decimal place
}

export function formatShootingPercentage(makes: number, attempts: number): string {
  // Before any shot there is no percentage, and "0.0%" read as a bad one
  if (attempts <= 0) return '–';
  return `${calculateShootingPercentage(makes, attempts)}%`;
}

export const SHOT_ZONES: { id: ShotZone; label: string; x: number; y: number }[] = [
  { id: 'paint', label: 'Paint', x: 50, y: 75 },
  { id: 'free-throw', label: 'Free Throw', x: 50, y: 45 },
  { id: 'mid-left-corner', label: 'Mid Left Corner', x: 15, y: 95 },
  { id: 'mid-left-wing', label: 'Mid Left Wing', x: 20, y: 60 },
  { id: 'mid-center', label: 'Mid Center', x: 50, y: 30 },
  { id: 'mid-right-wing', label: 'Mid Right Wing', x: 80, y: 60 },
  { id: 'mid-right-corner', label: 'Mid Right Corner', x: 85, y: 95 },
  { id: 'three-left-corner', label: '3pt Left Corner', x: 5, y: 95 },
  { id: 'three-left-wing', label: '3pt Left Wing', x: 10, y: 35 },
  { id: 'three-top', label: '3pt Top', x: 50, y: 5 },
  { id: 'three-right-wing', label: '3pt Right Wing', x: 90, y: 35 },
  { id: 'three-right-corner', label: '3pt Right Corner', x: 95, y: 95 },
  { id: 'deep-three', label: 'Deep 3pt', x: 50, y: -5 },
  { id: 'all-around', label: 'All-Around', x: 50, y: 50 },
];

export function getZoneColor(attempts: number, makes: number): string {
  if (attempts === 0) return 'bg-zinc-800';
  const pct = (makes / attempts) * 100;
  if (pct >= 50) return 'bg-emerald-500';
  if (pct >= 40) return 'bg-blue-500';
  if (pct >= 30) return 'bg-yellow-500';
  return 'bg-red-500';
}
