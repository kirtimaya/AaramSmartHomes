export type MealBlock = 'Breakfast' | 'Lunch' | 'Dinner';

// Meal windows — must stay in sync with the `meal_windows` seed in
// supabase/migrations/20260709_meal_skip_cutoff.sql (Breakfast 08:00–10:00,
// Lunch 13:00–15:00, Dinner 20:30–22:30 IST). The 8h-before-window-start
// cutoff is enforced server-side by a Postgres trigger on meal_skip_requests;
// this is the client-side mirror so the UI can grey out the button before
// the write is even attempted.
const WINDOW_START_HOUR: Record<MealBlock, number> = {
  Breakfast: 8,
  Lunch: 13,
  Dinner: 20.5,
};

const CUTOFF_HOURS_BEFORE = 8;

// With these specific window times, `startHour - 8` always lands in [0, 24) —
// i.e. the cutoff is always on the SAME calendar day as the meal itself
// (Breakfast: midnight, Lunch: 05:00, Dinner: 12:30). None of them spill
// into the previous day, which keeps this comparison simple: no date-rollover
// case to handle beyond the plain "is it today, in the past, or in the future" split.
function cutoffHour(block: MealBlock): number {
  return WINDOW_START_HOUR[block] - CUTOFF_HOURS_BEFORE;
}

/** IST decimal hours-since-midnight (e.g. 10.5 = 10:30 AM) for a given epoch ms timestamp. */
function istHourOfDay(nowMs: number): number {
  const d = new Date(nowMs + 5.5 * 60 * 60 * 1000);
  return d.getUTCHours() + d.getUTCMinutes() / 60;
}

/** IST calendar date "YYYY-MM-DD" for a given epoch ms timestamp. */
function istDateStr(nowMs: number): string {
  const d = new Date(nowMs + 5.5 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/**
 * True when skip/un-skip changes for `block` on `targetDateStr` (YYYY-MM-DD,
 * IST calendar date) are locked — i.e. the 8-hours-before-window-start
 * cutoff has passed, or the date is already in the past. `nowMs` defaults to
 * Date.now() but is injectable for deterministic tests.
 */
export function isMealLocked(block: MealBlock, targetDateStr: string, nowMs: number = Date.now()): boolean {
  const todayStr = istDateStr(nowMs);

  if (targetDateStr < todayStr) return true;
  if (targetDateStr > todayStr) return false;

  return istHourOfDay(nowMs) >= cutoffHour(block);
}

/** Human-readable cutoff time for display (e.g. next to a lock icon). */
export function cutoffLabel(block: MealBlock): string {
  const h = cutoffHour(block);
  const hours24 = Math.floor(h);
  const minutes = Math.round((h - hours24) * 60);
  const period = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return minutes === 0 ? `${hours12}:00 ${period}` : `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}
