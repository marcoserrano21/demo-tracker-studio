import type { Advisor, DriveLog } from './types';
import { calculateHistoricalXP, getLevelFromXP } from './xp-system';

export interface LeaderboardMetrics {
  driveCount: number;
  purchaseCount: number;
  totalXP: number;
  averageRating: number;
}

export function buildLeaderboardMetrics(
  advisor: Advisor,
  advisorLogs: DriveLog[],
): LeaderboardMetrics {
  const completed = advisorLogs.filter((log) => log.endTime);
  const rated = completed.filter((log) => log.rating && log.rating > 0);
  const ratingSum = rated.reduce((sum, log) => sum + (log.rating || 0), 0);

  return {
    driveCount: completed.length,
    purchaseCount: completed.filter((log) => log.customerPurchased).length,
    totalXP: advisor.xp ?? calculateHistoricalXP(completed),
    averageRating: rated.length > 0 ? ratingSum / rated.length : 0,
  };
}

/** Sort advisors highest-to-lowest; every comparison resolves to a strict ordering. */
export function compareLeaderboardEntries(
  a: LeaderboardMetrics & { advisor: Advisor; achievementCount: number },
  b: LeaderboardMetrics & { advisor: Advisor; achievementCount: number },
): number {
  if (b.achievementCount !== a.achievementCount) {
    return b.achievementCount - a.achievementCount;
  }
  if (b.driveCount !== a.driveCount) {
    return b.driveCount - a.driveCount;
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
  // Guaranteed unique ordering — no duplicate rank numbers after withDenseRanks.
  return a.advisor.id.localeCompare(b.advisor.id);
}

/** Assign unique ranks 1…n (no tied rank numbers). */
export function withDenseRanks<T extends { advisor: Advisor }>(
  sorted: T[],
): (T & { rank: number })[] {
  return sorted.map((item, index) => ({ ...item, rank: index + 1 }));
}
