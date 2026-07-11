'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Advisor, DriveLog, Store, Vehicle } from '@/lib/types';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, getDocs, limit, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { subDays, isToday } from 'date-fns';
import { DRIVE_LOGS_DASHBOARD_LIMIT } from '@/lib/firestore-query-limits';

export function useStoreData(currentStore: Store | null) {
  const { firestore, user } = useFirebase();
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isAdvisorsFallbackLoading, setIsAdvisorsFallbackLoading] = useState(false);

  const advisorsQuery = useMemoFirebase(
    () =>
      currentStore && firestore && user
        ? collection(firestore, `stores/${currentStore.code}/advisors`)
        : null,
    [currentStore, firestore, user]
  );
  const {
    data: fetchedAdvisors,
    isLoading: areAdvisorsLoading,
  } = useCollection<Advisor>(advisorsQuery);

  useEffect(() => {
    if (fetchedAdvisors) setAdvisors(fetchedAdvisors);
  }, [fetchedAdvisors]);

  useEffect(() => {
    if (!currentStore || !firestore || !user || !areAdvisorsLoading) return;

    const timeoutId = setTimeout(async () => {
      setIsAdvisorsFallbackLoading(true);
      try {
        const snapshot = await getDocs(
          collection(firestore, `stores/${currentStore.code}/advisors`)
        );
        setAdvisors(
          snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Advisor)
        );
      } catch (error) {
        console.error('[Fallback] Error fetching advisors:', error);
      } finally {
        setIsAdvisorsFallbackLoading(false);
      }
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [currentStore, firestore, user, areAdvisorsLoading]);

  const vehiclesQuery = useMemoFirebase(
    () =>
      currentStore && firestore && user
        ? collection(firestore, `stores/${currentStore.code}/vehicles`)
        : null,
    [currentStore, firestore, user]
  );
  const { data: fetchedVehicles, isLoading: areVehiclesLoading } =
    useCollection<Vehicle>(vehiclesQuery);

  useEffect(() => {
    if (fetchedVehicles) setVehicles(fetchedVehicles);
  }, [fetchedVehicles]);

  const driveLogsQuery = useMemoFirebase(() => {
    if (!currentStore || !firestore || !user) return null;
    const thirtyDaysAgo = subDays(new Date(), 30);
    return query(
      collection(firestore, `stores/${currentStore.code}/demo_drives`),
      where('startTime', '>=', thirtyDaysAgo),
      orderBy('startTime', 'desc'),
      limit(DRIVE_LOGS_DASHBOARD_LIMIT)
    );
  }, [currentStore, firestore, user]);

  const { data: driveLogs, isLoading: areDriveLogsLoading } =
    useCollection<DriveLog>(driveLogsQuery);

  const todaysScheduledDrivesCount = useMemo(() => {
    if (!driveLogs) return 0;
    return driveLogs.filter((log) => {
      if (log.purpose !== 'Scheduled' || log.endTime) return false;
      const startTime =
        log.startTime instanceof Timestamp
          ? log.startTime.toDate()
          : new Date(log.startTime);
      return isToday(startTime);
    }).length;
  }, [driveLogs]);

  return {
    advisors,
    setAdvisors,
    vehicles,
    setVehicles,
    driveLogs,
    areAdvisorsLoading,
    areVehiclesLoading,
    areDriveLogsLoading,
    isAdvisorsFallbackLoading,
    todaysScheduledDrivesCount,
  };
}
