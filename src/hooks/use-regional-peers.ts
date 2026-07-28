'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import { subDays } from 'date-fns';
import { useFirebase } from '@/firebase';
import type { Advisor, DriveLog, Vehicle } from '@/lib/types';

const PEER_VEHICLES_LIMIT = 80;
const PEER_DRIVES_LIMIT = 120;
const PEER_ADVISORS_LIMIT = 40;

export type RegionalPeerLiveData = {
  vehicles: Vehicle[];
  driveLogs: DriveLog[];
  advisors: Advisor[];
  /** True when at least one vehicle or drive document was returned. */
  hasLiveData: boolean;
};

async function fetchPeerStore(
  firestore: Firestore,
  storeCode: string,
): Promise<RegionalPeerLiveData> {
  const thirtyDaysAgo = subDays(new Date(), 30);

  const [vehiclesSnap, drivesSnap, advisorsSnap] = await Promise.all([
    getDocs(query(collection(firestore, `stores/${storeCode}/vehicles`), limit(PEER_VEHICLES_LIMIT))),
    getDocs(
      query(
        collection(firestore, `stores/${storeCode}/demo_drives`),
        where('startTime', '>=', thirtyDaysAgo),
        orderBy('startTime', 'desc'),
        limit(PEER_DRIVES_LIMIT),
      ),
    ).catch(() =>
      // Fallback without composite index: capped collection scan
      getDocs(query(collection(firestore, `stores/${storeCode}/demo_drives`), limit(PEER_DRIVES_LIMIT))),
    ),
    getDocs(query(collection(firestore, `stores/${storeCode}/advisors`), limit(PEER_ADVISORS_LIMIT))),
  ]);

  const vehicles = vehiclesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Vehicle);
  const driveLogs = drivesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as DriveLog);
  const advisors = advisorsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Advisor);

  return {
    vehicles,
    driveLogs,
    advisors,
    hasLiveData: vehicles.length > 0 || driveLogs.length > 0,
  };
}

/**
 * Try live Firestore reads for peer stores (capped). Empty / denied → no live data.
 */
export function useRegionalPeers(peerCodes: string[]) {
  const { firestore, user } = useFirebase();
  const [data, setData] = useState<Record<string, RegionalPeerLiveData>>({});
  const [loading, setLoading] = useState(false);

  const codesKey = peerCodes.filter(Boolean).sort().join(',');

  useEffect(() => {
    if (!firestore || !user || !codesKey) {
      setData({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const codes = codesKey.split(',').filter(Boolean);

    void (async () => {
      const next: Record<string, RegionalPeerLiveData> = {};
      await Promise.all(
        codes.map(async (code) => {
          try {
            next[code] = await fetchPeerStore(firestore, code);
          } catch {
            next[code] = {
              vehicles: [],
              driveLogs: [],
              advisors: [],
              hasLiveData: false,
            };
          }
        }),
      );
      if (!cancelled) {
        setData(next);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [firestore, user, codesKey]);

  return { data, loading };
}
