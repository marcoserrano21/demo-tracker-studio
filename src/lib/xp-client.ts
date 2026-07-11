'use client';

import { doc, updateDoc, getDoc, type Firestore } from 'firebase/firestore';
import { getLevelFromXP } from '@/lib/xp-system';

export async function awardXP(
  firestore: Firestore,
  storeCode: string,
  advisorId: string,
  xpAmount: number
): Promise<{
  success: boolean;
  newTotalXP: number;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
}> {
  try {
    const advisorRef = doc(firestore, `stores/${storeCode}/advisors/${advisorId}`);

    const advisorSnap = await getDoc(advisorRef);
    if (!advisorSnap.exists()) {
      throw new Error('Advisor not found');
    }

    const currentData = advisorSnap.data();
    const oldXP = currentData.xp || 0;
    const oldLevel = getLevelFromXP(oldXP);
    const newTotalXP = oldXP + xpAmount;
    const newLevel = getLevelFromXP(newTotalXP);
    const leveledUp = newLevel > oldLevel;

    await updateDoc(advisorRef, {
      xp: newTotalXP,
      level: newLevel,
    });

    return {
      success: true,
      newTotalXP,
      oldLevel,
      newLevel,
      leveledUp,
    };
  } catch (error) {
    console.error('Error awarding XP:', error);
    return {
      success: false,
      newTotalXP: 0,
      oldLevel: 1,
      newLevel: 1,
      leveledUp: false,
    };
  }
}

export async function migrateAdvisorXP(
  firestore: Firestore,
  storeCode: string,
  advisorId: string,
  historicalXP: number
): Promise<boolean> {
  try {
    const advisorRef = doc(firestore, `stores/${storeCode}/advisors/${advisorId}`);
    const level = getLevelFromXP(historicalXP);

    await updateDoc(advisorRef, {
      xp: historicalXP,
      level,
    });

    return true;
  } catch (error) {
    console.error('Error migrating advisor XP:', error);
    return false;
  }
}
