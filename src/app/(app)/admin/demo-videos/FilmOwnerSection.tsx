// src/app/(app)/admin/demo-videos/FilmOwnerSection.tsx
// Owner tool, the film part: every clip (drafts too) with an edit link and
// the clip form, or the library packs with their clips. Read with the admin
// client; the page has already checked the owner. docs/plans/film-clips-to-pick.md
// says what kind of clip each theme wants.
import React from 'react';
import Link from 'next/link';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { themeLabel } from '@/lib/film/catalog';
import { parseFilmQuestions } from '@/lib/film/questions';
import { formatClock } from '@/lib/film/rows';
import { FilmClipForm, type FilmClipFormValues } from './FilmClipForm';
import { saveLibraryPack } from './filmActions';

const EMPTY: FilmClipFormValues = {
  link: '',
  start: '0:00',
  end: '',
  title: '',
  channel: '',
  theme: 'spacing',
  level: 'beginner',
  isFree: false,
  published: false,
  questions: [],
};

type ClipRow = {
  id: string;
  youtube_video_id: string;
  start_s: number;
  end_s: number;
  title: string;
  channel_name: string;
  theme: string;
  level: string;
  questions: unknown;
  is_free: boolean;
  published_at: string | null;
};

const input = 'w-full rounded-lg border border-zinc-700/80 bg-zinc-950 px-3 py-2 text-base text-white placeholder:text-zinc-500';

export async function FilmOwnerSection({ show, edit }: { show: 'film' | 'packs'; edit?: string }) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('film_clips')
    .select('id, youtube_video_id, start_s, end_s, title, channel_name, theme, level, questions, is_free, published_at')
    .order('theme')
    .order('title');
  if (error) {
    return (
      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
        Run 00062_film.sql in the Supabase SQL editor to turn this on. ({error.message})
      </p>
    );
  }
  const clips = (data ?? []) as ClipRow[];

  if (show === 'packs') {
    const [{ data: packs }, { data: links }] = await Promise.all([
      admin.from('film_packs').select('id, title, description, is_free, published_at').is('owner_id', null).order('title'),
      admin.from('film_pack_clips').select('pack_id, clip_id, position').order('position'),
    ]);
    const published = clips.filter((c) => c.published_at);
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-500">
          Tick the clips for each pack (published clips only). A free pack opens its clips for everyone. A pack needs at least one clip to be
          published.
        </p>
        {(packs ?? []).map((p) => {
          const inPack = new Set((links ?? []).filter((l) => l.pack_id === p.id).map((l) => l.clip_id));
          return (
            <form key={p.id} action={saveLibraryPack} className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
              <input type="hidden" name="id" value={p.id} />
              <label className="block text-sm text-zinc-300">
                Title
                <input name="title" defaultValue={p.title} maxLength={80} className={`${input} mt-1`} />
              </label>
              <label className="block text-sm text-zinc-300">
                Description
                <textarea name="description" defaultValue={p.description} maxLength={400} rows={2} className={`${input} mt-1`} />
              </label>
              <fieldset className="space-y-1">
                <legend className="text-sm text-zinc-300">Clips</legend>
                {published.length === 0 && <p className="text-sm text-zinc-500">No published clips yet.</p>}
                {published.map((c) => (
                  <label key={c.id} className="flex min-h-11 items-center gap-2 text-sm text-zinc-200">
                    <input type="checkbox" name="clip" value={c.id} defaultChecked={inPack.has(c.id)} className="h-5 w-5" />
                    {c.title} <span className="text-zinc-500">· {themeLabel(c.theme)}</span>
                  </label>
                ))}
              </fieldset>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" name="is_free" defaultChecked={p.is_free} className="h-5 w-5" /> Free
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" name="published" defaultChecked={!!p.published_at} className="h-5 w-5" /> Published
              </label>
              <button type="submit" className="h-11 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:brightness-110">
                Save pack
              </button>
            </form>
          );
        })}
      </div>
    );
  }

  const editing = edit ? clips.find((c) => c.id === edit) : undefined;
  const initial: FilmClipFormValues = editing
    ? {
        id: editing.id,
        link: `https://youtu.be/${editing.youtube_video_id}`,
        start: formatClock(editing.start_s),
        end: formatClock(editing.end_s),
        title: editing.title,
        channel: editing.channel_name,
        theme: editing.theme,
        level: editing.level,
        isFree: editing.is_free,
        published: !!editing.published_at,
        questions: parseFilmQuestions(editing.questions, editing.start_s, editing.end_s),
      }
    : EMPTY;

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-300">
        {clips.filter((c) => c.published_at).length} of {clips.length} clips are published.
      </p>
      <p className="text-sm text-zinc-500">
        Pick clips from official channels (leagues, federations, teams) that allow embedding. Store only the link, start and end; nothing is
        downloaded. What each theme wants is in docs/plans/film-clips-to-pick.md.
      </p>
      {clips.length > 0 && (
        <ul className="space-y-2">
          {clips.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/demo-videos?show=film&edit=${c.id}`}
                aria-current={c.id === edit ? 'true' : undefined}
                className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 hover:bg-zinc-900"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                    {c.published_at && <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" aria-label="Published" />}
                    {c.title}
                  </span>
                  <span className="block text-xs text-zinc-500">
                    {themeLabel(c.theme)} · {formatClock(c.start_s)} to {formatClock(c.end_s)} · {c.is_free ? 'Free' : 'Pro'}
                    {c.published_at ? '' : ' · Draft'}
                  </span>
                </span>
                <span className="text-xs text-zinc-400">Edit</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <Link href="/admin/demo-videos?show=film" className="inline-flex min-h-11 items-center text-sm font-semibold text-orange-400 hover:underline">
          Add a new clip instead
        </Link>
      )}
      <a
        href="https://www.youtube.com/results?search_query=basketball+film+breakdown"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
      >
        Find on YouTube <ExternalLink className="h-3 w-3" />
      </a>
      {/* key: a fresh form when switching between clips */}
      <FilmClipForm key={editing?.id ?? 'new'} initial={initial} />
    </div>
  );
}
