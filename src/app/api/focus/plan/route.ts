// src/app/api/focus/plan/route.ts
// Focus Finder's AI plan: weaknesses in, a week of the app's own drills, film,
// IQ quizzes and guides out. One AI credit (unlimited on Pro), refunded when
// the AI call or the save fails. The free plan on /focus needs none of this.
import { getCurrentUser } from '@/lib/auth';
import { AICoachError } from '@/lib/ai/service';
import { generateFocusPlan, readFocusRequest } from '@/lib/focus/service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });

  try {
    const req = readFocusRequest(await request.json().catch(() => null));
    const saved = await generateFocusPlan(user.id, req);
    return Response.json(saved);
  } catch (err) {
    if (err instanceof AICoachError) return Response.json({ error: err.message }, { status: err.status });
    console.error('[focus/plan]', err);
    return Response.json({ error: 'Could not make the plan. Please try again.' }, { status: 500 });
  }
}
