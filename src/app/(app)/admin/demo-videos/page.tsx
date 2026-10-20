// src/app/(app)/admin/demo-videos/page.tsx
// Owner tool: pick the YouTube video that plays on each drill, exercise and
// IQ lesson. Players see it in the drill page, the exercise library and the
// lesson; anything without one keeps the YouTube search link.
import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { CheckCircle2, ExternalLink, PlayCircle } from 'lucide-react';
import { checkIsOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/layout/PageHeader';
import { isRealYoutubeId, youtubeIdFromLink } from '@/lib/video/youtube';
import { skillLabel } from '@/lib/drills';
import { muscleLabel } from '@/lib/exercises';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Demo videos - Deadeye' };

type Kind = 'drills' | 'exercises' | 'lessons';
const KINDS: Kind[] = ['drills', 'exercises', 'lessons'];

async function saveVideo(formData: FormData) {
  'use server';
  if (!(await checkIsOwner())) return;
  const kind: Kind = KINDS.find((k) => k === formData.get('kind')) ?? 'drills';
  const id = String(formData.get('id') || '');
  const name = String(formData.get('name') || '');
  const link = String(formData.get('link') || '').trim();
  if (!id) return;
  // Empty clears the video; anything else has to be a YouTube video
  const videoId = link ? youtubeIdFromLink(link) : null;
  if (link && !videoId) redirect(`/admin/demo-videos?show=${kind}&bad=${encodeURIComponent(name)}`);
  const admin = createAdminClient();
  if (kind === 'drills') await admin.from('drills').update({ demo_video_id: videoId }).eq('id', id);
  else if (kind === 'exercises') await admin.from('exercise_library').update({ demo_video_id: videoId }).eq('id', id).eq('is_system', true);
  // The lesson column cannot be empty; 'placeholder' is what the lesson page
  // reads as no video (see video/youtube.ts)
  else await admin.from('study_items').update({ youtube_video_id: videoId ?? 'placeholder' }).eq('id', id);
  revalidatePath('/admin/demo-videos');
}

interface Item {
  id: string;
  name: string;
  detail: string;
  video: string | null;
  search: string;
}

export default async function DemoVideosPage({ searchParams }: { searchParams: Promise<{ show?: string; bad?: string }> }) {
  if (!(await checkIsOwner())) notFound();
  const params = await searchParams;
  const show: Kind = KINDS.find((k) => k === params.show) ?? 'drills';
  const admin = createAdminClient();

  let items: Item[] = [];
  let problem: string | null = null;
  if (show === 'drills') {
    const { data, error } = await admin.from('drills').select('id, name, skill, demo_video_id').order('skill').order('name');
    if (error) problem = error.message;
    items = (data || []).map((d) => ({
      id: d.id,
      name: d.name,
      detail: skillLabel(d.skill),
      video: d.demo_video_id,
      search: `${d.name} basketball drill`,
    }));
  } else if (show === 'lessons') {
    const { data, error } = await admin
      .from('study_items')
      .select('id, title, youtube_video_id, study_topics(title)')
      .order('display_order');
    if (error) problem = error.message;
    items = ((data || []) as unknown as Array<{ id: string; title: string; youtube_video_id: string; study_topics: { title: string } | null }>).map(
      (l) => ({
        id: l.id,
        name: l.title,
        detail: l.study_topics?.title ?? 'Lesson',
        video: isRealYoutubeId(l.youtube_video_id) ? l.youtube_video_id.trim() : null,
        search: `${l.title} basketball`,
      })
    );
  } else {
    const { data, error } = await admin
      .from('exercise_library')
      .select('id, name, primary_muscle, demo_video_id')
      .eq('is_system', true)
      .order('name');
    if (error) problem = error.message;
    items = (data || []).map((e) => ({
      id: e.id,
      name: e.name,
      detail: muscleLabel(e.primary_muscle),
      video: e.demo_video_id,
      search: `${e.name} exercise form`,
    }));
  }
  const withVideo = items.filter((i) => i.video).length;
  // The ones still to do first
  items.sort((a, b) => Number(!!a.video) - Number(!!b.video));

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <PageHeader tone="hoops" icon={PlayCircle} title="Demo videos" subtitle="The video that plays on each drill, exercise and IQ lesson" />

        <div className="mb-4 flex gap-2">
          {KINDS.map((k) => (
            <Link
              key={k}
              href={`/admin/demo-videos?show=${k}`}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                show === k ? 'bg-orange-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {k}
            </Link>
          ))}
        </div>

        {problem && show !== 'lessons' ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            Run 00042_drill_favourites_and_demo_videos.sql in the Supabase SQL editor to turn this on. ({problem})
          </p>
        ) : problem ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">Could not load lessons: {problem}
          </p>
        ) : (
          <>
            <p className="mb-2 text-sm text-zinc-300">
              {withVideo} of {items.length} {show} have a video.
            </p>
            <p className="mb-4 text-xs text-zinc-500">
              Tap Find to search YouTube, copy the link of a good video, paste it here and save. Pick short, clear videos
              from channels that allow embedding. Clear the box and save to remove one.
            </p>
            {params.bad && (
              <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                That link for {params.bad} is not a YouTube video. Copy the link from the Share button on the video.
              </p>
            )}
            <div className="space-y-2">
              {items.map((item) => (
                <form key={item.id} action={saveVideo} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
                  <input type="hidden" name="kind" value={show} />
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="name" value={item.name} />
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                        {item.video && <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" aria-label="Has a video" />}
                        {item.name}
                      </div>
                      <div className="text-xs text-zinc-500">{item.detail}</div>
                    </div>
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.search)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-shrink-0 items-center gap-1 text-xs text-zinc-400 hover:text-white"
                    >
                      Find <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <input
                      name="link"
                      defaultValue={item.video ? `https://youtu.be/${item.video}` : ''}
                      placeholder="Paste a YouTube link"
                      aria-label={`YouTube link for ${item.name}`}
                      className="min-w-0 flex-1 rounded-lg border border-zinc-700/80 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
                    />
                    <button type="submit" className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-500">
                      Save
                    </button>
                  </div>
                </form>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
