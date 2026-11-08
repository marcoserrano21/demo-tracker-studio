'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import {
  getStoreSettingsClient,
  performAutoCheckInClient,
} from '@/lib/store-settings-client';
import { achievements } from '@/lib/achievements';
import { AchievementIcon } from '@/components/achievement-icon';
import type { Advisor, DriveLog, Store, UserRole, Vehicle } from '@/lib/types';

const AUTO_CHECKIN_INTERVAL_MS = 5 * 60 * 1000;

export function useDashboardPolicies({
  vehicles,
  driveLogs,
  currentAdvisor,
  currentStore,
  userRole,
}: {
  vehicles: Vehicle[];
  driveLogs: DriveLog[] | null | undefined;
  currentAdvisor: Advisor | null;
  currentStore: Store | null;
  userRole: UserRole;
}) {
  const { firestore, isLocalDemo } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [previousAchievementCount, setPreviousAchievementCount] = useState(0);
  const checkedInRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!vehicles.length || !currentAdvisor) return;

    const notifiedVehicles = new Set(
      JSON.parse(sessionStorage.getItem('notified-overdue-vehicles') || '[]') as string[]
    );
    let delay = 0;

    vehicles.forEach((vehicle) => {
      if (vehicle.status === 'On Demo' && vehicle.driveStartedAt && vehicle.expectedDuration) {
        const endTime = vehicle.driveStartedAt + vehicle.expectedDuration * 60 * 1000;
        if (Date.now() > endTime && !notifiedVehicles.has(vehicle.id)) {
          setTimeout(() => {
            toast({
              title: 'Vehicle Overdue',
              description: `${vehicle.model} (VIN: ...${vehicle.vin.slice(-6)}) is overdue.`,
              variant: 'destructive',
              onClick: () => router.replace(`/?tab=fleet&vehicleId=${vehicle.id}`, { scroll: false }),
              duration: 3000,
            });
          }, delay);
          notifiedVehicles.add(vehicle.id);
          delay += 500;
        }
      }
    });

    sessionStorage.setItem('notified-overdue-vehicles', JSON.stringify([...notifiedVehicles]));
  }, [vehicles, toast, router, currentAdvisor]);

  useEffect(() => {
    if (isLocalDemo || !firestore || !vehicles.length || !currentStore || !driveLogs) return;
    if (userRole !== 'manager' && userRole !== 'moderator') return;

    const runAutoCheckIn = async () => {
      const settings = await getStoreSettingsClient(firestore, currentStore.code);

      for (const vehicle of vehicles) {
        if (
          vehicle.status !== 'On Demo' ||
          !vehicle.driveStartedAt ||
          !vehicle.expectedDuration ||
          !vehicle.currentDriveId
        ) {
          continue;
        }

        const dedupeKey = `${vehicle.id}:${vehicle.currentDriveId}`;
        if (checkedInRef.current.has(dedupeKey)) continue;

        const driveLog = driveLogs.find((log) => log.id === vehicle.currentDriveId);
        if (!driveLog || driveLog.endTime) continue;

        const driveStartedAt = vehicle.driveStartedAt;
        const expectedDurationMinutes = vehicle.expectedDuration;
        if (!driveStartedAt || !expectedDurationMinutes) continue;

        const result = await performAutoCheckInClient(
          firestore,
          {
            storeCode: currentStore.code,
            vehicleId: vehicle.id,
            driveLogId: driveLog.id,
            driveStartedAt,
            expectedDurationMinutes,
            startBattery: driveLog.startBattery,
          },
          settings
        );

        if (result.success && !result.skipped) {
          checkedInRef.current.add(dedupeKey);
        }
      }
    };

    void runAutoCheckIn();
    const interval = setInterval(runAutoCheckIn, AUTO_CHECKIN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [firestore, vehicles, currentStore, driveLogs, userRole]);

  useEffect(() => {
    if (!driveLogs || !currentAdvisor || !vehicles.length) return;

    const advisorLogs = driveLogs.filter((log) => log.coPilot === currentAdvisor.name);
    const unlockedAchievements = achievements.filter((ach) =>
      ach.checker(currentAdvisor, advisorLogs, driveLogs, vehicles)
    );
    const newAchievementCount = unlockedAchievements.length;

    if (previousAchievementCount > 0 && newAchievementCount > previousAchievementCount) {
      const previousAchievements = achievements.slice(0, previousAchievementCount);
      const newAchievement = unlockedAchievements.find(
        (ach) => !previousAchievements.some((p) => p.id === ach.id)
      );

      if (newAchievement) {
        toast({
          variant: 'achievement',
          title: 'Achievement Unlocked!',
          description: (
            <div className="flex items-center gap-3">
              <AchievementIcon
                src={newAchievement.iconUrl}
                alt={newAchievement.title}
                width={32}
                height={32}
              />
              <div className="flex flex-col">
                <span className="font-semibold">{newAchievement.title}</span>
                <span className="text-sm opacity-80">{newAchievement.description}</span>
              </div>
            </div>
          ),
          duration: 5000,
        });
      }
    }
    setPreviousAchievementCount(newAchievementCount);
  }, [driveLogs, currentAdvisor, vehicles, toast, previousAchievementCount]);

  useEffect(() => {
    if (!currentAdvisor || userRole !== 'manager') return;

    const today = new Date();
    if (today.getDay() !== 1) return;

    const todayString = today.toISOString().split('T')[0];
    const lastReminderDate = sessionStorage.getItem('last-goal-reminder-date');
    if (lastReminderDate === todayString) return;

    const timerId = setTimeout(() => {
      toast({
        title: 'Weekly Goals Reminder',
        description: 'Add new goals for the store for this week',
        duration: 6000,
        onClick: () => router.replace('/?tab=management', { scroll: false }),
      });
      sessionStorage.setItem('last-goal-reminder-date', todayString);
    }, 2000);

    return () => clearTimeout(timerId);
  }, [currentAdvisor, userRole, toast, router]);
}
