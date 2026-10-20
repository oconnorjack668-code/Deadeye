// src/app/(app)/ai-coach/chat/CoachChat.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { CHAT_STARTERS, FREE_CHAT_PER_DAY, MAX_CHAT_MESSAGE } from '@/lib/ai/chat';
import { parseCoachText, parseInline } from '@/lib/ai/coachText';
import { Send, Sparkles, Trash2 } from 'lucide-react';

export interface ChatEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((p, i) =>
        p.bold ? (
          <strong key={i} className="font-semibold text-white">
            {p.text}
          </strong>
        ) : p.italic ? (
          <em key={i}>{p.text}</em>
        ) : (
          <React.Fragment key={i}>{p.text}</React.Fragment>
        )
      )}
    </>
  );
}

/** Coach replies: headings, numbered and bulleted lists (one level of nesting), paragraphs, bold and italics. */
function Formatted({ text }: { text: string }) {
  return (
    <>
      {parseCoachText(text).map((block, i) => {
        if (block.type === 'heading') {
          return (
            <p key={i} className="mt-3 mb-1 first:mt-0.5 font-semibold text-white">
              <Inline text={block.text} />
            </p>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={i} className="my-1.5 space-y-1">
              {block.items.map((item, j) => (
                <li key={j} className={`flex gap-2 ${item.depth ? 'ml-6 text-zinc-300' : ''}`}>
                  <span aria-hidden className={`shrink-0 tabular-nums ${item.marker ? 'min-w-[1.1rem] text-zinc-400' : 'text-zinc-500'}`}>
                    {item.marker ?? (item.depth ? '–' : '•')}
                  </span>
                  <span>
                    <Inline text={item.text} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="my-1 whitespace-pre-wrap">
            <Inline text={block.text} />
          </p>
        );
      })}
    </>
  );
}

export function CoachChat({ initial, remaining: initialRemaining }: { initial: ChatEntry[]; remaining: number | null }) {
  const [messages, setMessages] = useState<ChatEntry[]>(initial);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{ text: string; limit?: boolean } | null>(null);
  const [remaining, setRemaining] = useState(initialRemaining);
  const bottom = useRef<HTMLDivElement>(null);
  const localId = useRef(0);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    setError(null);
    setInput('');
    const optimistic: ChatEntry = { id: `local-${++localId.current}`, role: 'user', content: message, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    try {
      const res = await fetch('/api/ai-coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; remaining?: number | null; error?: string; limit?: boolean };
      if (!res.ok || !data.reply) {
        setMessages((m) => m.filter((x) => x.id !== optimistic.id));
        setInput(message);
        setError({ text: data.error || 'The coach could not answer. Please try again.', limit: data.limit });
        return;
      }
      setMessages((m) => [...m, { id: `reply-${++localId.current}`, role: 'assistant', content: data.reply!, created_at: new Date().toISOString() }]);
      if (data.remaining !== undefined) setRemaining(data.remaining);
    } catch {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setInput(message);
      setError({ text: 'Network error. Check your connection and try again.' });
    } finally {
      setSending(false);
    }
  }

  async function clearChat() {
    if (!window.confirm('Clear your whole conversation with the coach?')) return;
    const { data } = await createClient().auth.getUser();
    if (!data.user) return;
    const { error: deleteError } = await createClient().from('coach_messages').delete().eq('user_id', data.user.id);
    if (deleteError) setError({ text: `Could not clear the chat: ${deleteError.message}` });
    else setMessages([]);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <p className="font-semibold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-red-400" /> Ask anything about your game
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                The coach sees your recent sessions, shooting zones, workouts, goals and latest form check.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {CHAT_STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-full bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                  m.role === 'user' ? 'bg-orange-600 text-white rounded-br-md' : 'bg-zinc-800 text-zinc-100 rounded-bl-md'
                }`}
              >
                {m.role === 'assistant' ? <Formatted text={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-zinc-800 px-4 py-3 text-sm text-zinc-400 animate-pulse">Coach is thinking…</div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-3 text-sm text-red-200">
              {error.text}{' '}
              {error.limit && (
                <Link href="/pro" className="underline font-semibold">
                  See Pro
                </Link>
              )}
            </div>
          )}
          <div ref={bottom} />
        </div>
      </div>

      <div className="border-t border-zinc-800 bg-zinc-950/95">
        <form
          className="max-w-3xl mx-auto p-3 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_CHAT_MESSAGE))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder="Ask the coach…"
            aria-label="Message the coach"
            className="flex-1 max-h-32 resize-none rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Send"
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-600 text-white disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <div className="max-w-3xl mx-auto px-4 pb-2 flex justify-between text-[11px] text-zinc-500">
          <span>
            {remaining === null ? 'Unlimited with Pro' : `${remaining} of ${FREE_CHAT_PER_DAY} free questions left today`} · Not medical advice
          </span>
          {messages.length > 0 && (
            <button type="button" onClick={() => void clearChat()} className="flex items-center gap-1 hover:text-zinc-300">
              <Trash2 className="h-3 w-3" /> Clear chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
