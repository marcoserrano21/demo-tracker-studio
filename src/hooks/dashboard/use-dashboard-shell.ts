'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DriveLog, Goal, ManualAward, Vehicle, VehicleIssue } from '@/lib/types';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { useRouter, useSearchParams } from 'next/navigation';
import { GOALS_LIMIT, MANUAL_AWARDS_LIMIT } from '@/lib/firestore-query-limits';

type UseDashboardShellArgs = {
  storeCode: string;
  vehicles: Vehicle[];
  driveLogs: DriveLog[];
  onVehicleUpdate: (updatedVehicle: Partial<Vehicle> & { id: string }) => void;
  initialTab: string;
};

export function useDashboardShell({
  storeCode,
  vehicles,
  driveLogs,
  onVehicleUpdate,
  initialTab,
}: UseDashboardShellArgs) {
  const { firestore, user } = useFirebase();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [vehicleIssues, setVehicleIssues] = useState<VehicleIssue[]>([]);

  const manualAwardsQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(
            collection(firestore, `stores/${storeCode}/manual_awards`),
            orderBy('awardedAt', 'desc'),
            limit(MANUAL_AWARDS_LIMIT)
          )
        : null,
    [firestore, user, storeCode]
  );
  const { data: manualAwards } = useCollection<ManualAward>(manualAwardsQuery);

  const goalsQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(
            collection(firestore, `stores/${storeCode}/goals`),
            orderBy('createdAt', 'desc'),
            limit(GOALS_LIMIT)
          )
        : null,
    [firestore, user, storeCode]
  );
  const { data: goals } = useCollection<Goal>(goalsQuery);

  const scheduledDemos = useMemo(
    () => driveLogs.filter((log) => log.purpose === 'Scheduled' && !log.endTime),
    [driveLogs]
  );

  const handleLogUpdate = useCallback(
    (updatedLog: DriveLog, affectedVehicleId?: string) => {
      if (!affectedVehicleId) return;
      const vehicle = vehicles.find((v) => v.id === affectedVehicleId);
      if (!vehicle) return;

      const isVehicleStillOnDemo = driveLogs.some(
        (log) =>
          log.id !== updatedLog.id &&
          log.vehicleId === affectedVehicleId &&
          !log.endTime
      );

      if (!isVehicleStillOnDemo && vehicle.status === 'On Demo') {
        onVehicleUpdate({
          id: affectedVehicleId,
          status: 'Available',
          currentDriveId: undefined,
          driveStartedAt: undefined,
          expectedDuration: undefined,
        });
      }
    },
    [driveLogs, onVehicleUpdate, vehicles]
  );

  const handleTabChange = useCallback(
    (tab: string) => {
      if (tab === activeTab) return;
      setIsRedirecting(true);
      router.replace(`/?tab=${tab}`, { scroll: false });
      setActiveTab(tab);
    },
    [activeTab, router]
  );

  useEffect(() => {
    if (!driveLogs.length || !firestore) return;

    const now = Date.now();
    const sixtyMinutes = 60 * 60 * 1000;
    const staleDrives: DriveLog[] = [];
    const vehicleIdsToUpdate = new Map<string, string[]>();

    driveLogs.forEach((log) => {
      if (log.purpose === 'Scheduled' && !log.endTime) {
        const startTime =
          (log.startTime as Timestamp)?.toDate?.()
            ? (log.startTime as Timestamp).toDate().getTime()
            : new Date(log.startTime as number | Date).getTime();
        if (now > startTime + sixtyMinutes) {
          staleDrives.push(log);
          if (!vehicleIdsToUpdate.has(log.vehicleId)) {
            vehicleIdsToUpdate.set(log.vehicleId, []);
          }
          vehicleIdsToUpdate.get(log.vehicleId)?.push(log.id);
        }
      }
    });

    if (staleDrives.length === 0) return;

    const batch = writeBatch(firestore);
    staleDrives.forEach((log) => {
      batch.delete(doc(firestore, `stores/${storeCode}/demo_drives/${log.id}`));
    });

    Array.from(vehicleIdsToUpdate.entries()).forEach(([vehicleId, deletedLogIds]) => {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      if (vehicle?.status !== 'Scheduled') return;

      const remainingScheduled = driveLogs.some(
        (log) =>
          log.vehicleId === vehicleId &&
          log.purpose === 'Scheduled' &&
          !log.endTime &&
          !deletedLogIds.includes(log.id)
      );

      if (!remainingScheduled) {
        batch.update(doc(firestore, `stores/${storeCode}/vehicles/${vehicleId}`), {
          status: 'Available',
        });
      }
    });

    batch.commit().catch(console.error);
  }, [driveLogs, firestore, storeCode, vehicles]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) setActiveTab(tab);

    const vehicleId = searchParams.get('vehicleId');
    if (tab === 'fleet' && vehicleId) {
      const timer = setTimeout(() => {
        document.getElementById(`vehicle-${vehicleId}`)?.scrollIntoView({ block: 'center' });
        router.replace('/?tab=fleet', { scroll: false });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchParams, activeTab, router]);

  useEffect(() => {
    if (!firestore || !user || !vehicles.length) {
      setVehicleIssues([]);
      return;
    }

    let isMounted = true;
    const vehicleIdsWithIssues = vehicles
      .filter((v) => v.status === 'Needs Attention')
      .map((v) => v.id);

    if (vehicleIdsWithIssues.length === 0) {
      setVehicleIssues([]);
      return;
    }

    void (async () => {
      const issueResults = await Promise.all(
        vehicleIdsWithIssues.map(async (vehicleId) => {
          const issuesColRef = collection(
            firestore,
            `stores/${storeCode}/vehicles/${vehicleId}/vehicle_issues`
          );
          const openIssuesQuery = query(issuesColRef, where('status', '==', 'Open'));
          try {
            const snapshot = await getDocs(openIssuesQuery);
            return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as VehicleIssue);
          } catch {
            const permissionError = new FirestorePermissionError({
              path: `stores/${storeCode}/vehicles/${vehicleId}/vehicle_issues`,
              operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            return [];
          }
        })
      );

      if (isMounted) setVehicleIssues(issueResults.flat());
    })();

    return () => {
      isMounted = false;
    };
  }, [firestore, user, storeCode, vehicles]);

  useEffect(() => {
    if (!isRedirecting) return;
    const timer = setTimeout(() => setIsRedirecting(false), 10);
    return () => clearTimeout(timer);
  }, [activeTab, isRedirecting]);

  return {
    activeTab,
    isRedirecting,
    vehicleIssues,
    manualAwards: manualAwards ?? [],
    goals: goals ?? [],
    scheduledDemos,
    handleLogUpdate,
    handleTabChange,
    setActiveTab,
  };
}
