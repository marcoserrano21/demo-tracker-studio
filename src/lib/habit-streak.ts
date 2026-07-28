import type { DriveLog } from './types';
import { getDriveStartDate } from './drive-log-utils';

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function endDateOfLog(log: DriveLog): Date | null {
  if (!log.endTime) return null;
  if (log.endTime instanceof Date) return log.endTime;
  if (typeof log.endTime === 'number') return new Date(log.endTime);
  if (typeof log.endTime === 'object' && 'toDate' in log.endTime) {
    return (log.endTime as { toDate: () => Date }).toDate();
  }
  if (typeof log.endTime === 'object' && 'seconds' in log.endTime) {
    return new Date((log.endTime as { seconds: number }).seconds * 1000);
  }
  return getDriveStartDate(log.startTime);
}

function isOnTime(log: DriveLog): boolean {
  if (!log.endTime || !log.expectedDuration) return false;
  const start = getDriveStartDate(log.startTime)?.getTime();
  const end = endDateOfLog(log)?.getTime();
  if (start == null || end == null) return false;
  return end <= start + log.expectedDuration * 60 * 1000;
}

function hasFsdSub(log: DriveLog): boolean {
  return log.fsdSubscriptionAttached === 'Y' || !!log.fsdSubscribed;
}

/**
 * Habit streak: consecutive calendar days with ≥1 completed demo that was
 * on-time AND logged an FSD-sub answer of Y (attach).
 */
export function calculateHabitStreak(
  driveLogs: DriveLog[],
  advisorName: string,
  now = new Date(),
): { current: number; longest: number; todayCompleted: boolean } {
  const demos = driveLogs.filter(
    (log) =>
      log.purpose === 'Demo' &&
      log.endTime &&
      (log.coPilot === advisorName || log.advisorIn === advisorName) &&
      isOnTime(log) &&
      hasFsdSub(log),
  );

  const daysWithHabit = new Set<string>();
  for (const log of demos) {
    const end = endDateOfLog(log);
    if (end) daysWithHabit.add(dayKey(end));
  }

  const todayCompleted = daysWithHabit.has(dayKey(now));

  let current = 0;
  const cursor = new Date(now);
  if (!todayCompleted) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (daysWithHabit.has(dayKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sortedDays = [...daysWithHabit]
    .map((k) => {
      const [y, m, d] = k.split('-').map(Number);
      return new Date(y, m, d);
    })
    .sort((a, b) => a.getTime() - b.getTime());

  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const day of sortedDays) {
    if (prev) {
      const diff = Math.round((day.getTime() - prev.getTime()) / 86400000);
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = day;
  }

  return { current, longest, todayCompleted };
}

/** Classic any-demo streak (for XP bonus fallback). */
export function calculateDemoDayStreak(
  driveLogs: DriveLog[],
  advisorName: string,
  now = new Date(),
): number {
  const demos = driveLogs.filter(
    (log) =>
      log.purpose === 'Demo' &&
      log.endTime &&
      (log.coPilot === advisorName || log.advisorIn === advisorName),
  );
  const days = new Set<string>();
  for (const log of demos) {
    const end = endDateOfLog(log);
    if (end) days.add(dayKey(end));
  }
  let current = 0;
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return current;
}
