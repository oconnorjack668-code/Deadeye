// src/lib/trainingLoad.ts
// A plain-language read on how hard the last week has been, compared with the
// week before it.
//
// Every other number on the dashboard only moves when you train, so there is
// nothing to come back for on a rest day. This gives one honest line that is
// still meaningful when you have not trained - and, unlike a wearable
// "recovery score", it claims nothing physiological. It counts days you logged
// training, because that is all the app actually knows.
import { addDays } from '@/lib/dates';

export type LoadStatus = 'none' | 'building' | 'easing' | 'steady' | 'heavy';

export interface TrainingLoad {
  /** Distinct days trained in the last 7, including today. */
  last7: number;
  /** Distinct days trained in the 7 days before that. */
  prev7: number;
  status: LoadStatus;
  /** One sentence the dashboard can show as-is. */
  message: string;
}

/** At or above this many days in seven, rest is the useful advice, not more work. */
const HEAVY_DAYS = 6;

/** "1 day", "3 days" - the messages said "1 days this week". */
function dayCount(n: number): string {
  return `${n} day${n === 1 ? '' : 's'}`;
}

function countBetween(days: Set<string>, from: string, to: string): number {
  let n = 0;
  for (const d of days) if (d >= from && d <= to) n += 1;
  return n;
}

export function trainingLoad(trainingDays: string[], today: string): TrainingLoad {
  const unique = new Set(trainingDays);
  const last7Start = addDays(today, -6);
  const prev7End = addDays(today, -7);
  const prev7Start = addDays(today, -13);

  const last7 = countBetween(unique, last7Start, today);
  const prev7 = countBetween(unique, prev7Start, prev7End);

  let status: LoadStatus;
  let message: string;

  if (last7 === 0) {
    status = 'none';
    message =
      prev7 > 0
        ? 'Nothing logged this week. One short session is enough to get going again.'
        : 'Nothing logged yet. Even fifteen minutes counts.';
  } else if (last7 >= HEAVY_DAYS) {
    // More is not better here, and saying so is more useful than cheering
    status = 'heavy';
    message = `${dayCount(last7)} in the last week. Take a rest day before you pick up a niggle.`;
  } else if (last7 > prev7) {
    status = 'building';
    // "up from 0" read oddly in a first week
    message =
      prev7 === 0
        ? `${dayCount(last7)} this week. That is the start: get one more in.`
        : `${dayCount(last7)} this week, up from ${prev7}. You are building nicely.`;
  } else if (last7 < prev7) {
    status = 'easing';
    message = `${dayCount(last7)} this week, down from ${prev7}. Worth getting one more in.`;
  } else {
    status = 'steady';
    message = `${dayCount(last7)} a week, two weeks running. That consistency is the whole game.`;
  }

  return { last7, prev7, status, message };
}
