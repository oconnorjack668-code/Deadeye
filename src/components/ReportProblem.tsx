// src/components/ReportProblem.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

/**
 * "Report a problem": a player tells us something went wrong (/api/reports).
 *
 * Crashes already report themselves (reportError). This is for what does not
 * crash: the tracker calling a make a miss, a button that does nothing, a
 * screen that makes no sense. It opens in place rather than in a dialog, so the
 * same component works as a Settings row and as a link on the crash screen.
 */
export function ReportProblem({
  label = 'Report a problem',
  context,
  className,
  panelClassName,
}: {
  label?: React.ReactNode;
  /** Sent with the report, e.g. which crash it followed */
  context?: string;
  /** The closed button */
  className?: string;
  /** The open form and the thank-you that replaces it */
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError('Tell us what went wrong first.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context, url: window.location.pathname }),
      });
      if (res.ok) {
        setSent(true);
        setMessage('');
      } else {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error || 'Your report could not be sent. Please try again.');
      }
    } catch {
      // What they wrote stays in the box, so nothing is lost
      setError('No connection. Your report is still here, so send it when you are back online.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className={panelClassName}>
        <p className="text-sm font-semibold text-emerald-400">Thanks. We read every report.</p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setOpen(true);
          }}
          className="mt-1 text-xs text-zinc-400 underline"
        >
          Report something else
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
    );
  }

  return (
    <form onSubmit={send} className={`space-y-2 text-left ${panelClassName || ''}`}>
      <label className="block">
        <span className="text-sm font-semibold text-zinc-100">What went wrong?</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          rows={4}
          autoFocus
          placeholder="What happened, and what were you trying to do?"
          className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
        />
      </label>
      {/* Many players are under 18: ask for the problem, not for them */}
      <p className="text-xs text-zinc-500">
        We see the page you are on and your type of device. Please leave out your name, address and phone number.
      </p>
      {error && (
        <p role="alert" className="text-xs font-semibold text-red-400">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" isLoading={sending}>
          Send report
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
