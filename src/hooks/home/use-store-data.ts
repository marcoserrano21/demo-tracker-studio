'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Advisor, DriveLog, FsdOrderRecord, Store, Vehicle } from '@/lib/types';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, getDocs, limit, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { subDays, isToday } from 'date-fns';
import { DRIVE_LOGS_DASHBOARD_LIMIT, FSD_ORDERS_LIMIT } from '@/lib/firestore-query-limits';
import { filterDriveLogsForDashboard, useLocalDemoStore } from '@/local-demo/store';
import { isLocalDemoClient } from '@/lib/local-demo/config';

export function useStoreData(currentStore: Store | null) {
  const isLocalDemo = isLocalDemoClient();
  const localAdvisors = useLocalDemoStore((s) => s.advisors);
  const localVehicles = useLocalDemoStore((s) => s.vehicles);
  const localDriveLogs = useLocalDemoStore((s) => s.driveLogs);
  const localFsdOrders = useLocalDemoStore((s) => s.fsdOrders);
  const setLocalAdvisors = useLocalDemoStore((s) => s.setAdvisors);
  const setLocalVehicles = useLocalDemoStore((s) => s.setVehicles);

  const { firestore, user, isLocalDemo: isLocalFirebase } = useFirebase();
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isAdvisorsFallbackLoading, setIsAdvisorsFallbackLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const localFilteredLogs = useMemo(
    () => filterDriveLogsForDashboard(localDriveLogs),
    [localDriveLogs],
  );

  const localTodaysScheduled = useMemo(() => {
    return localFilteredLogs.filter((log) => {
      if (log.purpose !== 'Scheduled' || log.endTime) return false;
      const startTime =
        log.startTime instanceof Timestamp
          ? log.startTime.toDate()
          : new Date(log.startTime as number | Date);
      return isToday(startTime);
    }).length;
  }, [localFilteredLogs]);

  const setVehiclesLocal = useCallback(
    (value: Vehicle[] | ((prev: Vehicle[]) => Vehicle[])) => {
      const next = typeof value === 'function' ? value(localVehicles) : value;
      setLocalVehicles(next);
    },
    [localVehicles, setLocalVehicles],
  );

  const setAdvisorsLocal = useCallback(
    (value: Advisor[] | ((prev: Advisor[]) => Advisor[])) => {
      const next = typeof value === 'function' ? value(localAdvisors) : value;
      setLocalAdvisors(next);
    },
    [localAdvisors, setLocalAdvisors],
  );

  const useRemote = !isLocalDemo && !isLocalFirebase;

  const advisorsQuery = useMemoFirebase(
    () =>
      useRemote && currentStore && firestore && user
        ? collection(firestore, `stores/${currentStore.code}/advisors`)
        : null,
    [useRemote, currentStore, firestore, user],
  );
  const {
    data: fetchedAdvisors,
    isLoading: areAdvisorsLoading,
    error: advisorsError,
  } = useCollection<Advisor>(advisorsQuery);

  useEffect(() => {
    if (fetchedAdvisors) setAdvisors(fetchedAdvisors);
  }, [fetchedAdvisors]);

  useEffect(() => {
    if (!useRemote || !currentStore || !firestore || !user || !areAdvisorsLoading) return;

    const timeoutId = setTimeout(async () => {
      setIsAdvisorsFallbackLoading(true);
      try {
        const snapshot = await getDocs(
          collection(firestore, `stores/${currentStore.code}/advisors`),
        );
        setAdvisors(
          snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Advisor),
        );
        setDataError(null);
      } catch (error) {
        console.error('[Fallback] Error fetching advisors:', error);
        setDataError('Could not load store data. Check your connection and try again.');
      } finally {
        setIsAdvisorsFallbackLoading(false);
      }
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [useRemote, currentStore, firestore, user, areAdvisorsLoading]);

  const vehiclesQuery = useMemoFirebase(
    () =>
      useRemote && currentStore && firestore && user
        ? collection(firestore, `stores/${currentStore.code}/vehicles`)
        : null,
    [useRemote, currentStore, firestore, user],
  );
  const { data: fetchedVehicles, isLoading: areVehiclesLoading, error: vehiclesError } =
    useCollection<Vehicle>(vehiclesQuery);

  useEffect(() => {
    if (fetchedVehicles) setVehicles(fetchedVehicles);
  }, [fetchedVehicles]);

  const driveLogsQuery = useMemoFirebase(() => {
    if (!useRemote || !currentStore || !firestore || !user) return null;
    const thirtyDaysAgo = subDays(new Date(), 30);
    return query(
      collection(firestore, `stores/${currentStore.code}/demo_drives`),
      where('startTime', '>=', thirtyDaysAgo),
      orderBy('startTime', 'desc'),
      limit(DRIVE_LOGS_DASHBOARD_LIMIT),
    );
  }, [useRemote, currentStore, firestore, user]);

  const { data: driveLogs, isLoading: areDriveLogsLoading, error: driveLogsError } =
    useCollection<DriveLog>(driveLogsQuery);

  const fsdOrdersQuery = useMemoFirebase(() => {
    if (!useRemote || !currentStore || !firestore || !user) return null;
    const ninetyDaysAgo = subDays(new Date(), 90);
    return query(
      collection(firestore, `stores/${currentStore.code}/fsd_orders`),
      where('orderedAt', '>=', ninetyDaysAgo),
      orderBy('orderedAt', 'desc'),
      limit(FSD_ORDERS_LIMIT),
    );
  }, [useRemote, currentStore, firestore, user]);

  const { data: fsdOrders, isLoading: areFsdOrdersLoading } =
    useCollection<FsdOrderRecord>(fsdOrdersQuery);

  useEffect(() => {
    if (!useRemote) return;
    const err = advisorsError || vehiclesError || driveLogsError;
    if (err) {
      setDataError('Could not load store data. Check your connection and try again.');
    } else {
      setDataError(null);
    }
  }, [useRemote, advisorsError, vehiclesError, driveLogsError]);

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

  if (isLocalDemo || isLocalFirebase) {
    return {
      advisors: localAdvisors,
      setAdvisors: setAdvisorsLocal,
      vehicles: localVehicles,
      setVehicles: setVehiclesLocal,
      driveLogs: localFilteredLogs,
      fsdOrders: localFsdOrders,
      areAdvisorsLoading: false,
      areVehiclesLoading: false,
      areDriveLogsLoading: false,
      areFsdOrdersLoading: false,
      isAdvisorsFallbackLoading: false,
      todaysScheduledDrivesCount: localTodaysScheduled,
      dataError: null,
    };
  }

  return {
    advisors,
    setAdvisors,
    vehicles,
    setVehicles,
    driveLogs,
    fsdOrders: fsdOrders ?? [],
    areAdvisorsLoading,
    areVehiclesLoading,
    areDriveLogsLoading,
    areFsdOrdersLoading,
    isAdvisorsFallbackLoading,
    todaysScheduledDrivesCount,
    dataError,
  };
}
