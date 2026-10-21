// src/app/(app)/film-questions/AskClient.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card, CardContent } from '@/components/ui/Card';
import { ReportProblem } from '@/components/ReportProblem';
import { Trash2, Clock, CheckCircle2 } from 'lucide-react';
import {
  questionProblem,
  answeredFirst,
  readAccuracy,
  momentClock,
  verdictLabel,
  MAX_QUESTION,
  MAX_PLAYER_READ,
  MIN_ANSWERED_FOR_RATE,
  type FilmQuestion,
} from '@/lib/filmQuestions';

interface Clip {
  id: string;
  title: string | null;
  file_name: string | null;
  storage_path: string | null;
  created_at: string;
}

export function AskClient({
  clips,
  teams,
  questions,
}: {
  clips: Clip[];
  teams: Array<{ id: string; name: string }>;
  questions: FilmQuestion[];
}) {
  const router = useRouter();
  const [clipId, setClipId] = useState(clips[0]?.id || '');
  const [teamId, setTeamId] = useState(teams[0]?.id || '');
  const [momentMs, setMomentMs] = useState(0);
  const [question, setQuestion] = useState('');
  const [playerRead, setPlayerRead] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const accuracy = readAccuracy(questions);

  /**
   * Opens one of the player's own clips.
   *
   * Signed directly rather than through /api/film-questions/[id]/clip, because
   * that route is keyed on a question and this is the screen where the question
   * does not exist yet. A player reaching their own video needs no broker: the
   * storage policies already allow it.
   */
  async function openClip(id: string) {
    setError(null);
    setClipUrl(null);
    const clip = clips.find((c) => c.id === id);
    if (!clip?.storage_path) {
      setError('That clip is no longer available.');
      return;
    }
    const { data, error: signError } = await createClient()
      .storage.from('videos')
      .createSignedUrl(clip.storage_path, 600);
    if (signError || !data?.signedUrl) {
      setError('Could not open that clip.');
      return;
    }
    setClipUrl(data.signedUrl);
  }

  async function ask() {
    const problem = questionProblem(question, playerRead);
    if (problem) {
      setError(problem);
      return;
    }
    if (!clipId) {
      setError('Upload a clip first, then come back and ask about a moment in it.');
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { error: insertError } = await supabase.from('film_questions').insert({
      player_id: user.id,
      // No team means self-review: the fallback for a player without a coach
      team_id: teamId || null,
      video_asset_id: clipId,
      moment_ms: Math.max(0, Math.round(momentMs)),
      question: question.trim().slice(0, MAX_QUESTION),
      player_read: playerRead.trim().slice(0, MAX_PLAYER_READ),
    });
    setBusy(false);
    if (insertError) {
      setError(`Could not send that: ${insertError.message}`);
      return;
    }
    setQuestion('');
    setPlayerRead('');
    router.refresh();
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from('film_questions').delete().eq('id', id);
    router.refresh();
  }

  if (clips.length === 0) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/70">
        <CardContent className="p-6">
          <p className="text-zinc-300">Upload a game clip first, then you can ask about a moment in it.</p>
          <Link href="/video" className="mt-3 inline-block font-semibold text-red-400 underline hover:text-red-300">
            Go to Video AI
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error" title="Check this">
          {error}
        </Alert>
      )}

      <Card className="border-zinc-800 bg-zinc-900/70">
        <CardContent className="space-y-3 p-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Which clip
            <select
              value={clipId}
              onChange={(e) => {
                setClipId(e.target.value);
                setClipUrl(null);
              }}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white"
            >
              {clips.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title || c.file_name || new Date(c.created_at).toLocaleDateString('en-IE')}
                </option>
              ))}
            </select>
          </label>

          {clipUrl ? (
            <>
              <video
                ref={videoRef}
                src={clipUrl}
                controls
                playsInline
                className="w-full rounded-xl bg-black"
                onTimeUpdate={(e) => setMomentMs(e.currentTarget.currentTime * 1000)}
              />
              <p className="text-xs text-zinc-400">
                Pause on the moment you want to ask about. Marked at{' '}
                <span className="font-semibold text-white tabular-nums">{momentClock(momentMs)}</span>.
              </p>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => void openClip(clipId)}>
              Load this clip
            </Button>
          )}

          {/* Asked for before the question, and required, because comparing
              what you thought with what the coach says is the whole exercise.
              Written afterwards it is just a coaching tip. */}
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            What were you thinking?
            <textarea
              value={playerRead}
              onChange={(e) => setPlayerRead(e.target.value)}
              maxLength={MAX_PLAYER_READ}
              rows={2}
              placeholder="I thought the help defender was late so the lane was open"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white placeholder:text-zinc-600"
            />
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            What do you want to ask?
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={MAX_QUESTION}
              rows={2}
              placeholder="Should I have driven here or kicked it to the corner?"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white placeholder:text-zinc-600"
            />
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Ask
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  My coach at {t.name}
                </option>
              ))}
              <option value="">Just me (no coach sees this)</option>
            </select>
          </label>

          <p className="text-xs text-zinc-500">
            {teamId
              ? 'The head coaches of this team can watch this one moment of this one clip, and all of them see the same question, so it is never a private chat. Assistant coaches cannot. Nobody can browse your other videos, and deleting the question takes their access with it.'
              : 'Nobody else sees this. Worth knowing: people are often confident and wrong in equal measure about their own decisions, so an outside answer is worth more than your own.'}
          </p>

          <Button variant="primary" className="w-full" isLoading={busy} onClick={() => void ask()}>
            {teamId ? 'Ask my coach' : 'Save for myself'}
          </Button>
        </CardContent>
      </Card>

      {accuracy.rate !== null && (
        <Card className="border-zinc-800 bg-zinc-900/70">
          <CardContent className="p-4">
            <p className="text-sm text-zinc-300">
              Your coach has agreed with your read{' '}
              <span className="font-bold text-white">
                {accuracy.right} of {accuracy.judged}
              </span>{' '}
              times.
            </p>
          </CardContent>
        </Card>
      )}
      {accuracy.rate === null && accuracy.judged > 0 && (
        <p className="text-xs text-zinc-500">
          {MIN_ANSWERED_FOR_RATE - accuracy.judged} more answers and you will see how often your read matches your
          coach.
        </p>
      )}

      <div className="space-y-2">
        {answeredFirst(questions).map((q) => (
          <Card key={q.id} className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{q.question}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                    <Clock className="h-3 w-3" /> {momentClock(q.moment_ms)}
                    {q.team_id === null && ' · just you'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(q.id)}
                  aria-label="Delete this question"
                  className="flex-shrink-0 text-zinc-500 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {q.player_read && <p className="mt-2 text-sm text-zinc-400">You thought: {q.player_read}</p>}

              {q.answered_at ? (
                <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-cyan-300">
                    <CheckCircle2 className="h-4 w-4" /> {verdictLabel(q.verdict)}
                  </p>
                  {q.coach_note && <p className="mt-1 text-sm text-zinc-300">{q.coach_note}</p>}
                  {/* Safeguarding: anything a coach writes can be reported to us (Owner tools) */}
                  {q.coach_note && (
                    <ReportProblem
                      label={<span className="mt-2 inline-block text-[11px] text-zinc-500 underline hover:text-zinc-300">Report this answer</span>}
                      question="What is wrong with this answer?"
                      placeholder="Tell us what worries you. Only the Deadeye team reads this, not your coach."
                      context={`Coach post: film answer ${q.id}: ${q.coach_note}`.slice(0, 300)}
                      panelClassName="mt-3"
                    />
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-amber-400">
                  {q.team_id ? 'Waiting on your coach' : 'Saved for you to come back to'}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
