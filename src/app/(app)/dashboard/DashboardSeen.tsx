// src/app/(app)/dashboard/DashboardSeen.tsx
'use client';

import { useEffect } from 'react';
import { track } from '@/lib/events';

/**
 * Records that a player with no saved session opened the dashboard (E6 in
 * docs/agent-os/backlog.md), so the funnel shows whether players who stalled
 * after setup ever come back. Shows nothing. Fired from the browser, not the
 * server render, so a link prefetch is not counted as a visit; the server keeps
 * one row per player a day however often it fires.
 */
export function DashboardSeen() {
  useEffect(() => {
    track('dashboard_seen');
  }, []);
  return null;
}
