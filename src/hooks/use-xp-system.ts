'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { showXPGainToast, LevelUpModal } from '@/components/xp-toast';
import { calculateDriveXP, countParagraphs, XP_REWARDS } from '@/lib/xp-system';
import { awardXP } from '@/lib/xp-client';
import { useFirebase } from '@/firebase';

interface XPEventData {
  type: 'drive' | 'achievement' | 'issue' | 'review';
  rating?: number;
  reviewText?: string;
  issueFound?: boolean;
  streakDays?: number;
  achievementCount?: number;
}

export function useXPSystem(storeCode: string, advisorId: string) {
  const pathname = usePathname();
  const { firestore } = useFirebase();
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ level: number; xpGained: number } | null>(null);
  const onMyHubPage = pathname?.includes('/my-hub') || false;
  const processingRef = useRef(false);

  /**
   * Award XP for a completed drive with all bonuses
   */
  const awardDriveXP = async (driveData: {
    rating?: number;
    reviewText?: string;
    issueFound?: boolean;
    streakDays?: number;
    isWeekend?: boolean;
  }) => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      // Calculate XP with all bonuses
      const paragraphCount = driveData.reviewText ? countParagraphs(driveData.reviewText) : 0;
      const xpCalculation = calculateDriveXP({
        rating: driveData.rating,
        reviewLength: paragraphCount,
        issueFound: driveData.issueFound,
        streakDays: driveData.streakDays,
        isWeekend: driveData.isWeekend,
      });

      // Award XP to advisor
      if (!firestore) return;
      const result = await awardXP(firestore, storeCode, advisorId, xpCalculation.totalXP);

      if (result.success) {
        // Show level up modal if leveled up
        if (result.leveledUp) {
          setLevelUpData({
            level: result.newLevel,
            xpGained: xpCalculation.totalXP,
          });
          setShowLevelUpModal(true);
        } else {
          // Show XP gain toast (only on My Hub page)
          showXPGainToast({
            xpGained: xpCalculation.totalXP,
            bonuses: xpCalculation.bonuses,
            onMyHubPage,
          });
        }
      }
    } catch (error) {
      console.error('Error awarding drive XP:', error);
    } finally {
      processingRef.current = false;
    }
  };

  /**
   * Award XP for achievement unlock
   */
  const awardAchievementXP = async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      if (!firestore) return;
      const xpAmount = XP_REWARDS.ACHIEVEMENT_UNLOCKED;
      const result = await awardXP(firestore, storeCode, advisorId, xpAmount);

      if (result.success) {
        if (result.leveledUp) {
          setLevelUpData({
            level: result.newLevel,
            xpGained: xpAmount,
          });
          setShowLevelUpModal(true);
        } else {
          showXPGainToast({
            xpGained: xpAmount,
            onMyHubPage,
          });
        }
      }
    } catch (error) {
      console.error('Error awarding achievement XP:', error);
    } finally {
      processingRef.current = false;
    }
  };

  /**
   * Award XP for issue discovery
   */
  const awardIssueXP = async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      if (!firestore) return;
      const xpAmount = XP_REWARDS.ISSUE_DISCOVERED;
      const result = await awardXP(firestore, storeCode, advisorId, xpAmount);

      if (result.success && onMyHubPage) {
        showXPGainToast({
          xpGained: xpAmount,
          onMyHubPage,
        });
      }
    } catch (error) {
      console.error('Error awarding issue XP:', error);
    } finally {
      processingRef.current = false;
    }
  };

  return {
    awardDriveXP,
    awardAchievementXP,
    awardIssueXP,
    showLevelUpModal,
    levelUpData,
    setShowLevelUpModal,
  };
}
