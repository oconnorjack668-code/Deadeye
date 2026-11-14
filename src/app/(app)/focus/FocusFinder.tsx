'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, BookOpen, ChevronDown, Clapperboard, Film, Lock, Send, Sparkles, Target, Video, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { addDays, localDateString } from '@/lib/dates';
import { GROUP_LABELS, WEAKNESSES, matchWeaknesses, weaknessById, type WeaknessGroup } from '@/lib/focus/weaknesses';
import { buildFocusPlan, focusLink, subSkillLabel, type FocusContent, type FocusLevel, type FocusMode } from '@/lib/focus/plan';
import type { DataSignal } from '@/lib/focus/signals';
import type { FocusAiPlan } from '@/lib/focus/ai';
import { MAX_FOCUS_TEXT } from '@/lib/focus/ai';
import { mentionsPain, needsSupportLine, SUPPORT_LINE } from '@/lib/ai/safety';
import { AiPlanView } from './AiPlanView';

export interface CoachTeam {
  id: string;
  name: string;
  level: FocusLevel | null;
  ageGroup: string | null;
}

const MAX_PICKS = 6;


const label = (id: string) => weaknessById(id)?.label ?? id;

/** "For: Free throws · Weak hand", every weakness an item works on, so a shared item says so */
const forText = (ids: string[]) => `For: ${ids.map(label).join(' · ')}`;

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        selected
          ? 'inline-flex min-h-10 items-center gap-1.5 rounded-full border border-zinc-100 bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-900 active:scale-[0.98]'
          : 'inline-flex min-h-10 items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 active:scale-[0.98]'
      }
    >
      {children}
      {selected && <X className="h-3.5 w-3.5" aria-hidden />}
    </button>
  );
}

function SectionLabel({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
      <Icon className="h-4 w-4" />
      {children}
    </h3>
  );
}

export function FocusFinder(props: {
  content: FocusContent;
  signals: DataSignal[];
  teams: CoachTeam[];
  initialIds: string[];
  initialMode: FocusMode;
  initialTeamId: string | null;
  fromCoach: boolean;
  playerLevel: FocusLevel | null;
  savedPlan: { id: string; plan: FocusAiPlan } | null;
  recentPlans: Array<{ id: string; createdAt: string; summary: string }>;
  aiBlocked: string | null;
  /** The company AI requests go to, for the notice by the button (null when AI is off) */
  aiCompany: string | null;
  reportsLeft: number | null;
  myId: string;
}) {
  const { content, signals, teams } = props;
  const router = useRouter();

  const [text, setText] = useState('');
  const [manual, setManual] = useState<string[]>(props.initialIds);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [mode, setMode] = useState<FocusMode>(props.initialMode);
  const [teamId, setTeamId] = useState<string | null>(props.initialTeamId);
  const [limitHint, setLimitHint] = useState(false);

  const [ai, setAi] = useState(props.savedPlan);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [sendBusy, setSendBusy] = useState(false);
  const [sent, setSent] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  // What the text picks up is added automatically, as chips that can be removed
  const fromText = useMemo(() => matchWeaknesses(text), [text]);
  const selected = useMemo(() => {
    const out = [...manual];
    for (const id of fromText) if (!out.includes(id) && !dismissed.includes(id)) out.push(id);
    return out.slice(0, MAX_PICKS);
  }, [manual, fromText, dismissed]);

  const team = teams.find((t) => t.id === teamId) ?? null;
  const level = mode === 'team' ? (team?.level ?? null) : props.playerLevel;
  const plan = useMemo(() => buildFocusPlan(selected, content, { mode, level }), [selected, content, mode, level]);

  const drillsById = useMemo(() => new Map(content.drills.map((d) => [d.id, d])), [content.drills]);
  const lessonsById = useMemo(() => new Map(content.lessons.map((l) => [l.id, l])), [content.lessons]);
  const guidesBySlug = useMemo(() => new Map(content.guides.map((g) => [g.slug, g])), [content.guides]);

  function toggle(id: string) {
    setSent(null);
    if (selected.includes(id)) {
      setManual((m) => m.filter((x) => x !== id));
      if (fromText.includes(id)) setDismissed((d) => [...d, id]);
      setLimitHint(false);
      return;
    }
    if (selected.length >= MAX_PICKS) {
      setLimitHint(true);
      return;
    }
    setManual((m) => [...m, id]);
    setDismissed((d) => d.filter((x) => x !== id));
  }

  async function makeAiPlan() {
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch('/api/focus/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, weaknessIds: selected, mode, teamId: mode === 'team' ? teamId : null }),
      });
      const body = (await res.json().catch(() => null)) as { id?: string; plan?: FocusAiPlan; error?: string } | null;
      if (!res.ok || !body?.id || !body.plan) {
        setAiError(body?.error || 'Could not make the plan. Please try again.');
        return;
      }
      setAi({ id: body.id, plan: body.plan });
      router.replace(`/focus?plan=${body.id}`, { scroll: false });
    } catch {
      setAiError('No connection. Check your signal and try again.');
    } finally {
      setAiBusy(false);
    }
  }

  async function sendToTeam() {
    if (!team || selected.length === 0) return;
    setSendBusy(true);
    setSent(null);
    const lines = [
      plan.film.length ? `Watch: ${plan.film.map((f) => f.item.title).join('; ')}` : '',
      plan.drills.length ? `Drills: ${plan.drills.map((d) => d.item.name).join('; ')}` : '',
      'Open the link for the videos, quizzes and drills.',
    ].filter(Boolean);
    const { error } = await createClient()
      .from('team_assignments')
      .insert({
        team_id: team.id,
        created_by: props.myId,
        title: `Focus: ${selected.map(label).join(' + ')}`.slice(0, 120),
        details: lines.join('\n').slice(0, 2000),
        link: focusLink(selected, 'team'),
        due_date: addDays(localDateString(), 7),
      });
    setSendBusy(false);
    setSent(
      error
        ? { tone: 'error', text: error.message }
        : { tone: 'success', text: `Sent to ${team.name}, due in a week. Players open this plan from the assignment.` }
    );
  }

  const groups = Object.keys(GROUP_LABELS) as WeaknessGroup[];
  const suggestions = signals.filter((s) => weaknessById(s.weaknessId));
  const hasPlan = plan.weaknesses.length > 0;

  return (
    <div className="space-y-4">
      {props.fromCoach && (
        <Alert variant="info" title="From your coach">
          Your coach picked these to work on. Watch the film, take the quizzes and do the drills below.
        </Alert>
      )}

      {/* 1. What needs work */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
        {teams.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label="Who is this for" className="inline-flex rounded-xl border border-zinc-800 bg-zinc-950/60 p-1">
              {(['player', 'team'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${mode === m ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-white'}`}
                >
                  {m === 'player' ? 'For me' : 'For my team'}
                </button>
              ))}
            </div>
            {mode === 'team' && teams.length > 1 && (
              <select
                value={teamId ?? ''}
                onChange={(e) => setTeamId(e.target.value)}
                aria-label="Team"
                className="min-h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-sm text-white"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
            {mode === 'team' && teams.length === 1 && <span className="text-sm text-zinc-400">{teams[0].name}</span>}
          </div>
        )}

        <label htmlFor="focus-text" className="block font-bold text-white">
          {mode === 'team' ? 'What is your team struggling with?' : 'What do you struggle with?'}
        </label>
        <textarea
          id="focus-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSent(null);
          }}
          rows={3}
          maxLength={MAX_FOCUS_TEXT}
          placeholder={
            mode === 'team'
              ? 'e.g. We give up open corner threes, never box out, and panic against a press'
              : 'e.g. I get blocked at the rim, my left hand is weak and I miss free throws late in games'
          }
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-base text-white placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none"
        />
        <p className="text-sm text-zinc-400">Leave out names, yours or anyone else&apos;s.</p>

        {/* From the words themselves, in the browser: the help line must not
            depend on an AI plan succeeding, or on asking for one at all
            (safety review, 13 Nov 2026). safety.ts has no server imports. */}
        {needsSupportLine(text) && (
          <Alert variant="warning" title="You are not on your own">
            {SUPPORT_LINE}
          </Alert>
        )}
        {mentionsPain(text) && (
          <Alert variant="info" title="If something hurts">
            Stop and see a doctor or physio before you train it. These drills are for skills, never for playing through pain.
          </Alert>
        )}

        {selected.length > 0 ? (
          <div>
            <p className="mb-2 text-sm text-zinc-400">Working on ({selected.length} of {MAX_PICKS}). Tap one to remove it.</p>
            <div className="flex flex-wrap gap-2">
              {selected.map((id) => (
                <Chip key={id} selected onClick={() => toggle(id)}>
                  {label(id)}
                </Chip>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Write it in your own words, or pick from the list below. What you write is matched as you type.</p>
        )}
        {limitHint && <p className="text-sm text-amber-400">Six at a time keeps the week focused. Remove one to add another.</p>}
      </section>

      {/* 2. Suggestions from the player's own log */}
      {mode === 'player' && suggestions.length > 0 && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <SectionLabel icon={BarChart3}>Suggested for you</SectionLabel>
          <ul className="space-y-2">
            {suggestions.map((s) => {
              const on = selected.includes(s.weaknessId);
              return (
                <li key={s.weaknessId} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-950/60 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{label(s.weaknessId)}</div>
                    {/* Each reason already says where it came from: logged shots, daily IQ, coach verdicts or setup */}
                    <div className="text-sm text-zinc-400">{s.reason}</div>
                  </div>
                  <Button type="button" size="sm" variant={on ? 'secondary' : 'outline'} onClick={() => toggle(s.weaknessId)} aria-pressed={on}>
                    {on ? 'Added' : 'Add'}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 3. The whole list */}
      <details className="group rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4" open={selected.length === 0 && !text}>
        <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-white">
          Pick from the list
          <ChevronDown className="h-5 w-5 text-zinc-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-3">
          {groups.map((g) => (
            <div key={g}>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">{GROUP_LABELS[g]}</div>
              <div className="flex flex-wrap gap-2">
                {WEAKNESSES.filter((w) => w.group === g).map((w) => (
                  <Chip key={w.id} selected={selected.includes(w.id)} onClick={() => toggle(w.id)}>
                    {w.label}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>

      {/* 4. The AI week plan, when there is one */}
      {ai && (
        <AiPlanView
          plan={ai.plan}
          drillsById={drillsById}
          lessonsById={lessonsById}
          guidesBySlug={guidesBySlug}
          onClose={() => {
            setAi(null);
            router.replace('/focus', { scroll: false });
          }}
        />
      )}

      {/* 5. The instant plan */}
      {hasPlan && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-5">
          <div>
            <h2 className="text-xl font-black text-white">{mode === 'team' ? 'Your team’s focus' : 'Your focus'}</h2>
            <p className="text-sm text-zinc-400">From Deadeye’s drills, film and lessons, picked for {selected.length === 1 ? 'this' : 'these'}.</p>
          </div>

          {plan.film.length > 0 && (
            <div>
              <SectionLabel icon={Film}>Film and IQ</SectionLabel>
              <p className="mb-2 text-sm text-zinc-500">Watch the clip, then take its quiz to check you can read it.</p>
              <ul className="space-y-2">
                {plan.film.map(({ item: l, for: ids }) => (
                  <li key={l.id} className="rounded-xl bg-zinc-950/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-white">{l.title}</div>
                        <div className="text-sm text-zinc-400">
                          {l.topicTitle} · {l.channel}
                          {l.durationMinutes ? ` · ${l.durationMinutes} min` : ''}
                        </div>
                      </div>
                      {!l.canOpen && (
                        <Badge variant="outline" className="flex-shrink-0 gap-1 text-xs">
                          <Lock className="h-3 w-3" /> Pro
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">{forText(ids)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        href={`/study/${l.topicId}#lesson-${l.id}`}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
                      >
                        <Film className="h-4 w-4" /> {l.hasVideo ? 'Watch' : 'Open lesson'}
                      </Link>
                      {l.questionCount > 0 && l.canOpen && (
                        <Link
                          href={`/study/${l.topicId}/quiz?item=${l.id}`}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
                        >
                          Quiz ({l.questionCount})
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plan.drills.length > 0 && (
            <div>
              <SectionLabel icon={Target}>Drills</SectionLabel>
              <ul className="space-y-2">
                {plan.drills.map(({ item: d, for: ids }) => (
                  <li key={d.id}>
                    <Link href={`/drills/${d.slug}`} className="block rounded-xl bg-zinc-950/60 p-3 hover:bg-zinc-900">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-white">{d.name}</span>
                        <span className="flex-shrink-0 text-sm text-zinc-400 tabular-nums">{d.duration_minutes} min</span>
                      </div>
                      <div className="text-sm capitalize text-zinc-400">
                        {subSkillLabel(d.sub_skill)} · {d.level} · {d.players}
                        {d.demo_video_id && (
                          <span className="ml-2 inline-flex items-center gap-1 normal-case text-cyan-400">
                            <Video className="h-3.5 w-3.5" /> demo video
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">{forText(ids)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plan.guides.length > 0 && (
            <div>
              <SectionLabel icon={BookOpen}>Read</SectionLabel>
              <ul className="space-y-2">
                {plan.guides.map(({ item: g, for: ids }) => (
                  <li key={g.slug}>
                    <Link href={`/guides/${g.slug}`} className="block rounded-xl bg-zinc-950/60 p-3 hover:bg-zinc-900">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-white">{g.title}</span>
                        <span className="flex-shrink-0 text-sm text-zinc-400 tabular-nums">{g.readingMinutes} min</span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">{forText(ids)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plan.ownFilm && (
            <div className="rounded-xl border border-zinc-800 p-3">
              <SectionLabel icon={Clapperboard}>Your own film</SectionLabel>
              {mode === 'team' ? (
                <p className="text-sm text-zinc-300">
                  Decisions are learned on real possessions. Ask players to film a game and send you the moments they are unsure about;{' '}
                  <Link href="/coach" className="text-cyan-400 underline">
                    they arrive in your film queue
                  </Link>
                  .
                </p>
              ) : (
                <p className="text-sm text-zinc-300">
                  Decisions are learned on your own possessions. Film your next game, pick a moment, write what you were thinking and{' '}
                  <Link href="/film-questions" className="text-cyan-400 underline">
                    ask your coach if it was the right read
                  </Link>
                  .
                </p>
              )}
            </div>
          )}

          {/* The one action: the AI week plan, or for a coach, sending it to the team */}
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            {mode === 'team' && team && (
              <div className="space-y-2">
                {sent && (
                  <Alert variant={sent.tone} title={sent.tone === 'success' ? 'Sent' : 'Not sent'}>
                    {sent.text}{' '}
                    {sent.tone === 'success' && (
                      <Link href={`/teams/${team.id}`} className="underline">
                        See the team
                      </Link>
                    )}
                  </Alert>
                )}
                <Button type="button" onClick={sendToTeam} isLoading={sendBusy} className="w-full sm:w-auto">
                  <Send className="mr-2 h-5 w-5" /> Send to {team.name} as an assignment
                </Button>
              </div>
            )}

            {props.aiBlocked ? (
              <p className="text-sm text-zinc-500">{props.aiBlocked}</p>
            ) : (
              <div className="space-y-2">
                {aiError && (
                  <Alert variant="error" title="No plan this time">
                    {aiError}
                  </Alert>
                )}
                <Button
                  type="button"
                  variant={mode === 'team' ? 'secondary' : 'primary'}
                  onClick={makeAiPlan}
                  isLoading={aiBusy}
                  disabled={props.reportsLeft === 0}
                  className="w-full sm:w-auto"
                >
                  <Sparkles className="mr-2 h-5 w-5" /> {ai ? 'Make a new week plan with AI' : 'Make it a week plan with AI'}
                </Button>
                <p className="text-sm text-zinc-400">
                  Deadeye Coach reads {mode === 'team' ? 'what you wrote' : 'what you wrote and your logged numbers'}, then picks and orders these drills and lessons
                  into a week, saying why each one fits. It only uses what is in the app. What you wrote goes to{' '}
                  {props.aiCompany ?? 'our AI provider'}, which deletes it within 30 days; Deadeye keeps the plan, not your words.{' '}
                  {props.reportsLeft === null
                    ? 'Unlimited on your plan.'
                    : props.reportsLeft === 0
                      ? 'You have used this month’s free AI reports; they refill on the 1st.'
                      : `Uses 1 of your ${props.reportsLeft} AI report${props.reportsLeft === 1 ? '' : 's'} left this month.`}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {props.recentPlans.length > 0 && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <SectionLabel icon={Sparkles}>Your earlier plans</SectionLabel>
          <ul className="space-y-2">
            {props.recentPlans.map((p) => (
              <li key={p.id}>
                <Link href={`/focus?plan=${p.id}`} className="block rounded-xl bg-zinc-950/60 p-3 hover:bg-zinc-900">
                  <div className="text-xs text-zinc-500">
                    {new Date(p.createdAt).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                  <div className="line-clamp-2 text-sm text-zinc-300">{p.summary}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
