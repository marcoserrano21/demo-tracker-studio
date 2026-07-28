import type { Advisor, DriveLog } from './types';
import { calculateHistoricalXP, getLevelFromXP } from './xp-system';

/**
 * Habit-loop weights for leaderboard ranking.
 * Higher = stronger pull on rank (demos, FSD activation, FSD-sub, feedback, on-time).
 */
export const LEADERBOARD_WEIGHTS = {
  DEMO: 10,
  FSD_ACTIVATED: 8,
  FSD_SUB: 12,
  FEEDBACK_QUALITY: 5,
  ON_TIME: 4,
  PURCHASE: 15,
} as const;

export interface LeaderboardMetrics {
  driveCount: number;
  purchaseCount: number;
  fsdActivatedCount: number;
  fsdSubCount: number;
  feedbackQualityCount: number;
  onTimeCount: number;
  /** Weighted habit score used as primary sort key. */
  habitScore: number;
  totalXP: number;
  averageRating: number;
}

function isOnTime(log: DriveLog): boolean {
  if (!log.endTime || !log.expectedDuration) return false;
  const start =
    typeof log.startTime === 'number'
      ? log.startTime
      : log.startTime instanceof Date
        ? log.startTime.getTime()
        : (log.startTime as { toDate?: () => Date; seconds?: number })?.toDate?.()?.getTime?.() ??
          ((log.startTime as { seconds?: number }).seconds
            ? (log.startTime as { seconds: number }).seconds * 1000
            : null);
  const end =
    typeof log.endTime === 'number'
      ? log.endTime
      : log.endTime instanceof Date
        ? log.endTime.getTime()
        : (log.endTime as { toDate?: () => Date; seconds?: number })?.toDate?.()?.getTime?.() ??
          ((log.endTime as { seconds?: number }).seconds
            ? (log.endTime as { seconds: number }).seconds * 1000
            : null);
  if (start == null || end == null) return false;
  return end <= start + log.expectedDuration * 60 * 1000;
}

function hasQualityFeedback(log: DriveLog): boolean {
  const text = (log.feedback || '').trim();
  if (!text) return false;
  return text.length >= 40 || (log.rating != null && log.rating >= 4);
}

export function buildLeaderboardMetrics(
  advisor: Advisor,
  advisorLogs: DriveLog[],
): LeaderboardMetrics {
  const completed = advisorLogs.filter((log) => log.endTime && log.purpose === 'Demo');
  const rated = completed.filter((log) => log.rating && log.rating > 0);
  const ratingSum = rated.reduce((sum, log) => sum + (log.rating || 0), 0);

  const purchaseCount = completed.filter((log) => log.customerPurchased).length;
  const fsdActivatedCount = completed.filter((log) => log.fsdActivated === true).length;
  const fsdSubCount = completed.filter(
    (log) => log.fsdSubscriptionAttached === 'Y' || log.fsdSubscribed
  ).length;
  const feedbackQualityCount = completed.filter(hasQualityFeedback).length;
  const onTimeCount = completed.filter(isOnTime).length;
  const driveCount = completed.length;

  const habitScore =
    driveCount * LEADERBOARD_WEIGHTS.DEMO +
    fsdActivatedCount * LEADERBOARD_WEIGHTS.FSD_ACTIVATED +
    fsdSubCount * LEADERBOARD_WEIGHTS.FSD_SUB +
    feedbackQualityCount * LEADERBOARD_WEIGHTS.FEEDBACK_QUALITY +
    onTimeCount * LEADERBOARD_WEIGHTS.ON_TIME +
    purchaseCount * LEADERBOARD_WEIGHTS.PURCHASE;

  return {
    driveCount,
    purchaseCount,
    fsdActivatedCount,
    fsdSubCount,
    feedbackQualityCount,
    onTimeCount,
    habitScore,
    totalXP: advisor.xp ?? calculateHistoricalXP(completed),
    averageRating: rated.length > 0 ? ratingSum / rated.length : 0,
  };
}

/** Sort advisors by KPI habit loop, then XP / rating. */
export function compareLeaderboardEntries(
  a: LeaderboardMetrics & { advisor: Advisor; achievementCount: number },
  b: LeaderboardMetrics & { advisor: Advisor; achievementCount: number },
): number {
  if (b.habitScore !== a.habitScore) {
    return b.habitScore - a.habitScore;
  }
  if (b.fsdSubCount !== a.fsdSubCount) {
    return b.fsdSubCount - a.fsdSubCount;
  }
  if (b.fsdActivatedCount !== a.fsdActivatedCount) {
    return b.fsdActivatedCount - a.fsdActivatedCount;
  }
  if (b.driveCount !== a.driveCount) {
    return b.driveCount - a.driveCount;
  }
  if (b.achievementCount !== a.achievementCount) {
    return b.achievementCount - a.achievementCount;
  }
  if (b.purchaseCount !== a.purchaseCount) {
    return b.purchaseCount - a.purchaseCount;
  }
  if (b.totalXP !== a.totalXP) {
    return b.totalXP - a.totalXP;
  }
  if (b.averageRating !== a.averageRating) {
    return b.averageRating - a.averageRating;
  }
  const levelA = getLevelFromXP(a.totalXP);
  const levelB = getLevelFromXP(b.totalXP);
  if (levelB !== levelA) {
    return levelB - levelA;
  }
  return a.advisor.id.localeCompare(b.advisor.id);
}

/** Assign unique ranks 1…n (no tied rank numbers). */
export function withDenseRanks<T extends { advisor: Advisor }>(
  sorted: T[],
): (T & { rank: number })[] {
  return sorted.map((item, index) => ({ ...item, rank: index + 1 }));
}
