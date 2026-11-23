// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** The word for a count: "day" for 1, "days" otherwise (0 days, 2 days). */
export function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}

export function formatPercentage(makes: number, attempts: number): string {
  if (attempts <= 0) return '0.0%';
  return `${((makes / attempts) * 100).toFixed(1)}%`;
}

export function calculatePercentageNumber(makes: number, attempts: number): number {
  if (attempts <= 0) return 0;
  return Number(((makes / attempts) * 100).toFixed(1));
}
