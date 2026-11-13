// src/app/(app)/study/[id]/page.tsx
import React from 'react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, BookOpen, Play, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isRealYoutubeId, youtubeSearchUrl } from '@/lib/video/youtube';
import { TapToLoadYouTube } from '@/components/video/TapToLoadYouTube';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Study Topic - Deadeye',
};

export default async function StudyTopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  // Topic and its lessons load in parallel
  const [{ data: topic }, { data: items }] = await Promise.all([
    supabase.from('study_topics').select('*').eq('id', id).maybeSingle(),
    supabase.from('study_items').select('*').eq('topic_id', id).order('display_order', { ascending: true }),
  ]);

  if (!topic) {
    notFound();
  }

  // Fetch items this user has completed (quiz passed at 80%+)
  const itemIds = items?.map((item) => item.id) || [];
  const { data: completedItems } = itemIds.length > 0
    ? await supabase
        .from('study_progress')
        .select('item_id')
        .eq('user_id', user.id)
        .in('item_id', itemIds)
        .not('completed_at', 'is', null)
    : { data: [] as { item_id: string }[] };

  const completedItemIds = new Set(completedItems?.map((c) => c.item_id) || []);
  const completionPercentage = items && items.length > 0
    ? Math.round((completedItemIds.size / items.length) * 100)
    : 0;
  const hasQuiz = items?.some((item) => Array.isArray(item.quiz_questions) && item.quiz_questions.length > 0);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Link href="/study" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 mb-3">
              <ArrowLeft className="h-4 w-4" />
              Back to Topics
            </Link>
            <h1 className="text-3xl font-black tracking-tight text-white">{topic.title}</h1>
            <p className="text-sm text-zinc-400">{topic.description}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <Card className="border-zinc-800 bg-zinc-900/70 mb-8">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-zinc-300">Progress</span>
              <span className="text-sm font-bold text-blue-400">{completionPercentage}%</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="text-xs text-zinc-500 mt-2">
              {completedItemIds.size} of {items?.length || 0} items completed
            </div>
          </CardContent>
        </Card>

        {/* Study Items */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-blue-400" />
            Learning Materials
          </h2>

          {items && items.length > 0 ? (
            items.map((item) => {
              const isCompleted = completedItemIds.has(item.id);
              const hasVideo = isRealYoutubeId(item.youtube_video_id);
              const questionCount = Array.isArray(item.quiz_questions) ? item.quiz_questions.length : 0;
              return (
                <Card key={item.id} className="border-zinc-800 bg-zinc-900/70">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <Play className="h-5 w-5 text-zinc-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-white">{item.title}</h3>
                          {isCompleted && <Badge variant="success" className="text-xs flex-shrink-0">Completed</Badge>}
                        </div>
                        <p className="text-sm text-zinc-400 mt-1">{item.description}</p>
                      </div>
                    </div>

                    {Array.isArray(item.key_takeaways) && item.key_takeaways.length > 0 && (
                      <div className="rounded-lg bg-zinc-950/60 p-3">
                        <div className="text-xs font-semibold uppercase text-zinc-500 mb-1">Key takeaways</div>
                        <ul className="space-y-1 text-sm text-zinc-300">
                          {item.key_takeaways.map((t: string) => (
                            <li key={t}>• {t}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.reflection_prompt && (
                      <p className="text-sm text-zinc-400 italic">
                        <span className="not-italic font-semibold text-zinc-300">Reflect: </span>
                        {item.reflection_prompt}
                      </p>
                    )}

                    {/* A curated lesson plays in place, once the player taps
                        play: nothing loads from YouTube before that. One that
                        was seeded with 'placeholder' still falls back to a
                        YouTube search, and says so rather than pretending to
                        be a lesson video. */}
                    {hasVideo && <TapToLoadYouTube id={item.youtube_video_id} title={item.title} />}

                    <div className="flex flex-wrap gap-2">
                      {!hasVideo && (
                        <a
                          href={youtubeSearchUrl(`${item.title} basketball`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          {item.duration_minutes ? `${item.duration_minutes} min · ` : ''}Search videos
                        </a>
                      )}
                      {questionCount > 0 && (
                        <Link
                          href={`/study/${id}/quiz?item=${item.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                        >
                          Quiz this lesson ({questionCount})
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-8 text-center">
                <p className="text-sm text-zinc-400">No materials available yet</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quiz Section */}
        {hasQuiz && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-red-400" />
              Test Your Knowledge
            </h2>
            <Link href={`/study/${id}/quiz`}>
              <Button variant="primary" size="lg" className="w-full">
                Take the full section quiz
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
