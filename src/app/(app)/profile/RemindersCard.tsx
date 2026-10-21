// src/app/(app)/profile/RemindersCard.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { ProBadge } from '@/components/ProGate';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function vapidKeyToBytes(base64: string): Uint8Array {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** showWeekly: false on the welcome screen, where a Pro report is not what a brand-new player came for. */
export function RemindersCard({ isPro = false, showWeekly = true }: { isPro?: boolean; showWeekly?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [time, setTime] = useState('18:00');
  const [deviceOn, setDeviceOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [weekly, setWeekly] = useState<boolean | null>(null);

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const isIos = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches;

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('notification_preferences')
        .select('reminder_enabled, reminder_days, reminder_time')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setEnabled(data.reminder_enabled);
        setDays(data.reminder_days || [1, 3, 5]);
        setTime(String(data.reminder_time || '18:00').slice(0, 5));
      }
      // Separate query: the column only exists after migration 00021
      const { data: weeklyRow, error: weeklyError } = await supabase
        .from('notification_preferences')
        .select('weekly_report')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!weeklyError && weeklyRow) setWeekly(!!weeklyRow.weekly_report);
      if (supported) {
        const reg = await navigator.serviceWorker.getRegistration();
        setDeviceOn(!!(await reg?.pushManager.getSubscription()));
      }
      setLoaded(true);
    })();
  }, [supported]);

  async function savePrefs(next: { enabled?: boolean; days?: number[]; time?: string }) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('notification_preferences')
      .update({
        reminder_enabled: next.enabled ?? enabled,
        reminder_days: next.days ?? days,
        reminder_time: next.time ?? time,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
    if (error) setMessage(`Could not save: ${error.message}`);
  }

  async function saveWeekly(next: boolean) {
    setWeekly(next);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('notification_preferences').update({ weekly_report: next }).eq('user_id', user.id);
    if (error) setMessage(`Could not save: ${error.message}`);
  }

  async function turnOnDevice() {
    setMessage(null);
    if (!vapidKey) {
      setMessage('Notifications are not set up on the server yet.');
      return;
    }
    if (isIos && !standalone) {
      setMessage('On iPhone, add Deadeye to your home screen first (Share → Add to Home Screen), then open it from there.');
      return;
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setMessage('Notifications are blocked. Allow them for Deadeye in your phone or browser settings.');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyToBytes(vapidKey) as BufferSource }));
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(data.error || 'Could not set up notifications.');
        return;
      }
      setDeviceOn(true);
      setEnabled(true);
      await savePrefs({ enabled: true });
      setMessage('Reminders are on for this device.');
    } catch {
      setMessage('Could not set up notifications on this device.');
    } finally {
      setBusy(false);
    }
  }

  async function turnOffDevice() {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setDeviceOn(false);
    setMessage('Notifications are off for this device.');
  }

  async function sendTest() {
    setMessage(null);
    const res = await fetch('/api/push/test', { method: 'POST' });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setMessage(res.ok ? 'Test sent. It should arrive in a few seconds.' : data.error || 'Could not send a test.');
  }

  if (!loaded) return null;

  return (
    <Card className="border-zinc-800 bg-zinc-900/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-orange-400" /> Training reminders
        </CardTitle>
        <CardDescription>A nudge on your training days, only if you haven&apos;t trained yet.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!supported ? (
          <p className="text-sm text-zinc-400">This browser doesn&apos;t support notifications. Try Chrome on Android, or Deadeye installed on your iPhone home screen.</p>
        ) : (
          <>
            <label className="flex items-center justify-between gap-4 text-sm text-zinc-200">
              Remind me
              <input
                type="checkbox"
                role="switch"
                checked={enabled}
                onChange={(e) => {
                  setEnabled(e.target.checked);
                  savePrefs({ enabled: e.target.checked });
                }}
                className="h-5 w-5 accent-orange-500"
              />
            </label>
            <div className="flex gap-1.5">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={days.includes(i)}
                  onClick={() => {
                    const next = days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort();
                    setDays(next);
                    savePrefs({ days: next });
                  }}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${days.includes(i) ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-3 text-sm text-zinc-300">
              At
              <input
                type="time"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  savePrefs({ time: e.target.value });
                }}
                className="rounded-lg bg-zinc-800 px-2 py-1 text-white"
              />
            </label>
            <p className="text-xs text-zinc-500">
              If your streak would end tonight, you also get one warning at this time, even on a day you did not pick.
            </p>
            <div className="flex flex-wrap gap-2">
              {deviceOn ? (
                <>
                  <Button variant="secondary" size="sm" onClick={sendTest}>
                    Send a test
                  </Button>
                  <Button variant="outline" size="sm" onClick={turnOffDevice}>
                    Turn off on this device
                  </Button>
                </>
              ) : (
                <Button variant="primary" size="sm" isLoading={busy} onClick={turnOnDevice}>
                  Turn on notifications on this device
                </Button>
              )}
            </div>
          </>
        )}
        {showWeekly && weekly !== null && isPro && (
          <label className="flex items-center justify-between gap-4 border-t border-zinc-800 pt-4 text-sm text-zinc-200">
            <span>
              Weekly AI report
              <span className="block text-xs text-zinc-500">Every Sunday: your week in review and next week&apos;s focus, in AI Coach.</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={weekly}
              onChange={(e) => void saveWeekly(e.target.checked)}
              className="h-5 w-5 accent-orange-500"
            />
          </label>
        )}
        {/* Shown, not hidden: on Free the switch is replaced by what the report is
            and that it comes with Pro, so a player knows it exists */}
        {showWeekly && !isPro && (
          <div className="flex items-start justify-between gap-4 border-t border-zinc-800 pt-4 text-sm text-zinc-200">
            <span>
              Weekly AI report
              <span className="block text-xs text-zinc-500">
                Every Sunday: your week in review and next week&apos;s focus, written by the AI coach.
              </span>
            </span>
            <Link href="/pro" className="flex-shrink-0">
              <ProBadge />
            </Link>
          </div>
        )}
        {message && <p className="text-xs text-zinc-300">{message}</p>}
      </CardContent>
    </Card>
  );
}
