/**
 * XP & Level System
 * Award-winning progression system with ranks, tiers, and engaging rewards
 */

// XP Rewards Configuration
export const XP_REWARDS = {
  DRIVE_COMPLETED: 10,
  ACHIEVEMENT_UNLOCKED: 25,
  ISSUE_DISCOVERED: 5,
  DETAILED_REVIEW: 15, // 2+ paragraphs
  PERFECT_RATING: 5, // Bonus for 5-star rating
  STREAK_BONUS_MULTIPLIER: 0.1, // 10% bonus per streak day (max 5 days)
  WEEKEND_BONUS: 5, // Extra XP for weekend drives
  CUSTOMER_PURCHASE: 50,
  FSD_ATTACH: 35,
} as const;

// Level System Configuration
export const LEVEL_CONFIG = {
  MAX_LEVEL: 99,
  BASE_XP: 20, // XP needed for level 1 → 2
  XP_INCREMENT: 5, // Additional XP per level
  MILESTONE_LEVELS: [10, 25, 50, 75, 90, 99], // Special celebration levels
} as const;

// Rank Tiers based on level ranges
export const RANK_TIERS = [
  { min: 1, max: 9, name: 'Novice', tier: 'Bronze', color: 'amber', icon: '🌱' },
  { min: 10, max: 19, name: 'Apprentice', tier: 'Bronze', color: 'amber', icon: '⚡' },
  { min: 20, max: 29, name: 'Specialist', tier: 'Silver', color: 'slate', icon: '🔧' },
  { min: 30, max: 39, name: 'Expert', tier: 'Silver', color: 'slate', icon: '⭐' },
  { min: 40, max: 49, name: 'Veteran', tier: 'Gold', color: 'yellow', icon: '🏆' },
  { min: 50, max: 59, name: 'Master', tier: 'Gold', color: 'yellow', icon: '👑' },
  { min: 60, max: 69, name: 'Elite', tier: 'Platinum', color: 'cyan', icon: '💎' },
  { min: 70, max: 79, name: 'Champion', tier: 'Platinum', color: 'cyan', icon: '🚀' },
  { min: 80, max: 89, name: 'Legend', tier: 'Diamond', color: 'purple', icon: '🌟' },
  { min: 90, max: 98, name: 'Mythic', tier: 'Diamond', color: 'purple', icon: '⚡' },
  { min: 99, max: 99, name: 'Grandmaster', tier: 'Transcendent', color: 'pink', icon: '👑' },
] as const;

/**
 * Calculate XP required to reach a specific level
 * Formula: XP = BASE_XP + (level - 1) * XP_INCREMENT
 */
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level > LEVEL_CONFIG.MAX_LEVEL) return getXPForLevel(LEVEL_CONFIG.MAX_LEVEL);
  
  return LEVEL_CONFIG.BASE_XP + (level - 2) * LEVEL_CONFIG.XP_INCREMENT;
}

/**
 * Calculate total XP required from level 1 to reach a specific level
 */
export function getTotalXPForLevel(level: number): number {
  if (level <= 1) return 0;
  
  let totalXP = 0;
  for (let i = 2; i <= level; i++) {
    totalXP += getXPForLevel(i);
  }
  return totalXP;
}

/**
 * Calculate level from total XP
 */
export function getLevelFromXP(totalXP: number): number {
  if (totalXP <= 0) return 1;
  
  let level = 1;
  let accumulatedXP = 0;
  
  while (level < LEVEL_CONFIG.MAX_LEVEL) {
    const xpNeeded = getXPForLevel(level + 1);
    if (accumulatedXP + xpNeeded > totalXP) break;
    accumulatedXP += xpNeeded;
    level++;
  }
  
  return level;
}

/**
 * Get XP progress for current level
 */
export function getXPProgress(totalXP: number): {
  level: number;
  currentLevelXP: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
  xpToNextLevel: number;
  totalXP: number;
} {
  const level = getLevelFromXP(totalXP);
  const isMaxLevel = level >= LEVEL_CONFIG.MAX_LEVEL;
  
  const xpForCurrentLevel = getTotalXPForLevel(level);
  const currentLevelXP = totalXP - xpForCurrentLevel;
  const xpNeededForNextLevel = isMaxLevel ? 0 : getXPForLevel(level + 1);
  const xpToNextLevel = isMaxLevel ? 0 : xpNeededForNextLevel - currentLevelXP;
  const progressPercent = isMaxLevel ? 100 : (currentLevelXP / xpNeededForNextLevel) * 100;
  
  return {
    level,
    currentLevelXP,
    xpNeededForNextLevel,
    progressPercent,
    xpToNextLevel,
    totalXP,
  };
}

/**
 * Get rank information for a level
 */
export function getRankForLevel(level: number): typeof RANK_TIERS[number] {
  return RANK_TIERS.find(rank => level >= rank.min && level <= rank.max) || RANK_TIERS[0];
}

/**
 * Check if level is a milestone
 */
export function isMilestoneLevel(level: number): boolean {
  return (LEVEL_CONFIG.MILESTONE_LEVELS as readonly number[]).includes(level);
}

/**
 * Calculate XP for a completed drive with bonuses
 */
export function calculateDriveXP(params: {
  rating?: number;
  reviewLength?: number;
  issueFound?: boolean;
  streakDays?: number;
  isWeekend?: boolean;
  customerPurchased?: boolean;
  fsdSubscribed?: boolean;
}): {
  baseXP: number;
  bonuses: Array<{ reason: string; amount: number }>;
  totalXP: number;
} {
  const bonuses: Array<{ reason: string; amount: number }> = [];
  let totalXP = XP_REWARDS.DRIVE_COMPLETED;
  
  // Perfect rating bonus
  if (params.rating === 5) {
    bonuses.push({ reason: 'Perfect Rating', amount: XP_REWARDS.PERFECT_RATING });
    totalXP += XP_REWARDS.PERFECT_RATING;
  }
  
  // Detailed review bonus
  if (params.reviewLength && params.reviewLength >= 2) {
    bonuses.push({ reason: 'Detailed Review', amount: XP_REWARDS.DETAILED_REVIEW });
    totalXP += XP_REWARDS.DETAILED_REVIEW;
  }
  
  // Issue discovered bonus
  if (params.issueFound) {
    bonuses.push({ reason: 'Issue Discovered', amount: XP_REWARDS.ISSUE_DISCOVERED });
    totalXP += XP_REWARDS.ISSUE_DISCOVERED;
  }
  
  // Streak bonus (capped at 5 days)
  if (params.streakDays && params.streakDays > 0) {
    const streakMultiplier = Math.min(params.streakDays, 5) * XP_REWARDS.STREAK_BONUS_MULTIPLIER;
    const streakBonus = Math.floor(totalXP * streakMultiplier);
    if (streakBonus > 0) {
      bonuses.push({ reason: `${Math.min(params.streakDays, 5)} Day Streak`, amount: streakBonus });
      totalXP += streakBonus;
    }
  }
  
  // Weekend bonus
  if (params.isWeekend) {
    bonuses.push({ reason: 'Weekend Drive', amount: XP_REWARDS.WEEKEND_BONUS });
    totalXP += XP_REWARDS.WEEKEND_BONUS;
  }

  // Customer purchase conversion bonus
  if (params.customerPurchased) {
    bonuses.push({ reason: 'Customer Purchase', amount: XP_REWARDS.CUSTOMER_PURCHASE });
    totalXP += XP_REWARDS.CUSTOMER_PURCHASE;
  }

  // FSD Monthly Subscription attach bonus
  if (params.fsdSubscribed) {
    bonuses.push({ reason: 'FSD Attach', amount: XP_REWARDS.FSD_ATTACH });
    totalXP += XP_REWARDS.FSD_ATTACH;
  }
  
  return {
    baseXP: XP_REWARDS.DRIVE_COMPLETED,
    bonuses,
    totalXP,
  };
}

/**
 * Calculate historical XP for existing users based on their logs
 */
export function calculateHistoricalXP(logs: Array<{
  status?: string;
  rating?: number;
  customerFeedback?: string;
  feedback?: string;
  issueDetected?: boolean;
  customerPurchased?: boolean;
  fsdSubscribed?: boolean;
  issuesReported?: string[];
  checkoutTime?: { seconds: number } | any;
  endTime?: { seconds: number } | any;
}>): number {
  let totalXP = 0;
  
  for (const log of logs) {
    // Only count completed drives (has endTime)
    if (!log.endTime) continue;
    
    // Base drive XP
    totalXP += XP_REWARDS.DRIVE_COMPLETED;
    
    // Perfect rating bonus
    if (log.rating === 5) {
      totalXP += XP_REWARDS.PERFECT_RATING;
    }
    
    // Detailed review bonus (count paragraphs by line breaks)
    const reviewText = log.customerFeedback || log.feedback;
    if (reviewText) {
      const paragraphs = reviewText.split('\n\n').filter(p => p.trim().length > 0);
      if (paragraphs.length >= 2) {
        totalXP += XP_REWARDS.DETAILED_REVIEW;
      }
    }
    
    // Issue discovered bonus
    if (log.issueDetected || (log.issuesReported && log.issuesReported.length > 0)) {
      totalXP += XP_REWARDS.ISSUE_DISCOVERED * (log.issuesReported?.length || 1);
    }

    if (log.customerPurchased) {
      totalXP += XP_REWARDS.CUSTOMER_PURCHASE;
    }

    if (log.fsdSubscribed) {
      totalXP += XP_REWARDS.FSD_ATTACH;
    }
    
    // Weekend bonus
    if (log.checkoutTime) {
      const date = new Date(log.checkoutTime.seconds * 1000);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        totalXP += XP_REWARDS.WEEKEND_BONUS;
      }
    }
  }
  
  return totalXP;
}

/**
 * Count paragraphs in review text
 */
export function countParagraphs(text: string): number {
  if (!text) return 0;
  // Split by double line breaks or single line breaks with substantial length
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  const singleLineParagraphs = text.split('\n').filter(p => p.trim().length > 50);
  return Math.max(paragraphs.length, singleLineParagraphs.length);
}

/**
 * Format XP number with commas
 */
export function formatXP(xp: number): string {
  return xp.toLocaleString();
}

/**
 * Get level up rewards/benefits description
 */
export function getLevelUpReward(level: number): string {
  const rank = getRankForLevel(level);
  
  if (isMilestoneLevel(level)) {
    return `🎉 Milestone Reached! You've unlocked the "${rank.name}" rank!`;
  }
  
  if (level % 10 === 0) {
    return `Achievement unlocked: Level ${level} ${rank.name}!`;
  }
  
  return `You're now a ${rank.name}!`;
}
