// src/app/(app)/guides/[slug]/page.tsx
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Guide - Deadeye' };

/** Renders plain-text guide bodies: blank-line paragraphs and "- " bullet lines. */
function GuideBody({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter((l) => l.trim());
        const bullets = lines.filter((l) => l.trim().startsWith('- '));
        const intro = lines.filter((l) => !l.trim().startsWith('- '));
        return (
          <div key={i} className="space-y-2">
            {intro.length > 0 && <p>{intro.join(' ')}</p>}
            {bullets.length > 0 && (
              <ul className="list-disc pl-5 space-y-1">
                {bullets.map((b) => (
                  <li key={b}>{b.trim().slice(2)}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </>
  );
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createClient();
  const { data: guide } = (await supabase.from('guides').select('*').eq('slug', slug).maybeSingle()) as {
    data: { title: string; summary: string; reading_minutes: number; sections: Array<{ heading: string; body: string }> } | null;
  };
  if (!guide) notFound();

  return (
    <div className="flex-1 overflow-auto">
      <article className="p-4 md:p-8 max-w-2xl mx-auto">
        <Link href="/guides" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-4">
          <ArrowLeft className="h-4 w-4" /> Guides
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-white">{guide.title}</h1>
        <p className="text-sm text-zinc-400 mt-2">{guide.summary}</p>
        <p className="text-sm text-zinc-500 mt-1 flex items-center gap-1">
          <Clock className="h-3 w-3" /> {guide.reading_minutes} min read
        </p>
        <div className="mt-6 space-y-6 text-sm leading-6 text-zinc-300">
          {guide.sections.map((s) => (
            <section key={s.heading} className="space-y-2">
              <h2 className="text-lg font-bold text-white">{s.heading}</h2>
              <GuideBody text={s.body} />
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
