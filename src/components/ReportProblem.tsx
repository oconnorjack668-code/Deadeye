// src/components/ReportProblem.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { REPORT_KINDS } from '@/lib/reportKinds';
import type { ReportKind } from '@/lib/supabase/types';

/**
 * "Report a problem": a player tells us something went wrong (/api/reports).
 *
 * Crashes already report themselves (reportError). This is for what does not
 * crash: the tracker calling a make a miss, a button that does nothing, a
 * screen that makes no sense. It opens in place rather than in a dialog, so the
 * same component works as a Settings row and as a link on the crash screen.
 *
 * In Settings it also takes feedback and ideas (chooseKind): the player picks
 * Feedback, Idea or Problem, and the kind goes with the message (00067).
 * Everywhere else sends no kind, which the server stores as a problem.
 */
export function ReportProblem({
  label = 'Report a problem',
  question = 'What went wrong?',
  placeholder = 'What happened, and what were you trying to do?',
  context,
  className,
  panelClassName,
  chooseKind = false,
}: {
  label?: React.ReactNode;
  /** The form's heading and hint, e.g. when reporting a coach's post */
  question?: string;
  placeholder?: string;
  /** Sent with the report, e.g. which crash it followed */
  context?: string;
  /** The closed button */
  className?: string;
  /** The open form and the thank-you that replaces it */
  panelClassName?: string;
  /** Offer Feedback / Idea / Problem, starting on Feedback */
  chooseKind?: boolean;
}) {
  const [kind, setKind] = useState<ReportKind>('feedback');
  const picked = chooseKind ? REPORT_KINDS.find((k) => k.id === kind)! : null;
  const heading = picked?.question ?? question;
  const hint = picked?.placeholder ?? placeholder;
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError(chooseKind ? 'Write something first.' : 'Tell us what went wrong first.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context, url: window.location.pathname, ...(chooseKind ? { kind } : {}) }),
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
        <p className="text-sm font-semibold text-emerald-400">{chooseKind ? 'Thanks. We read every message.' : 'Thanks. We read every report.'}</p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setOpen(true);
          }}
          className="mt-1 text-xs text-zinc-400 underline"
        >
          {chooseKind ? 'Send something else' : 'Report something else'}
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
      {chooseKind && (
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wider text-zinc-400">What is it?</legend>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {REPORT_KINDS.map((k) => (
              <label
                key={k.id}
                className={`flex h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-orange-500 ${
                  kind === k.id ? 'border-orange-500 bg-orange-600/15 text-white' : 'border-zinc-800 bg-zinc-950 text-zinc-300'
                }`}
              >
                <input type="radio" name="report-kind" value={k.id} checked={kind === k.id} onChange={() => setKind(k.id)} className="sr-only" />
                {k.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className="block">
        <span className="text-sm font-semibold text-zinc-100">{heading}</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          rows={4}
          autoFocus
          placeholder={hint}
          className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
        />
      </label>
      {/* Many players are under 18: ask for what they think, not for who they are */}
      <p className="text-sm text-zinc-500">
        We see the page you are on and your type of device. Please leave out your name, email, phone number, address, school
        and club.
      </p>
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-400">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" isLoading={sending}>
          {chooseKind ? 'Send' : 'Send report'}
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
