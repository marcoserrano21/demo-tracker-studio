import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { DriveLog, Vehicle } from '@/lib/types';
import { buildIntervalFromMs, findOverlappingSchedule } from '@/lib/schedule-overlap';

export async function commitScheduledDriveFirestore(params: {
  firestore: Firestore;
  storeCode: string;
  vehicle: Vehicle;
  scheduleTime: Date;
  durationMinutes: number;
  coPilot: string;
  startBattery: number;
}): Promise<void> {
  const { firestore, storeCode, vehicle, scheduleTime, durationMinutes, coPilot, startBattery } =
    params;
  const scheduleMs = scheduleTime.getTime();
  const candidate = buildIntervalFromMs(scheduleMs, durationMinutes);

  const openSnap = await getDocs(
    query(
      collection(firestore, `stores/${storeCode}/demo_drives`),
      where('vehicleId', '==', vehicle.id),
      where('purpose', '==', 'Scheduled'),
    ),
  );

  await runTransaction(firestore, async (transaction) => {
    const vehicleRef = doc(firestore, `stores/${storeCode}/vehicles/${vehicle.id}`);
    const vehicleSnap = await transaction.get(vehicleRef);
    if (!vehicleSnap.exists()) {
      throw new Error('Vehicle could not be found. Please refresh.');
    }

    const openLogs: DriveLog[] = [];
    for (const docSnap of openSnap.docs) {
      const fresh = await transaction.get(docSnap.ref);
      if (!fresh.exists()) continue;
      const data = fresh.data() as DriveLog;
      if (data.endTime) continue;
      openLogs.push({ ...data, id: docSnap.id });
    }

    const overlap = findOverlappingSchedule(candidate, openLogs, vehicle.id);
    if (overlap) {
      throw new Error(
        'This vehicle already has a scheduled drive overlapping that time. Pick another slot.',
      );
    }

    const newLogRef = doc(collection(firestore, `stores/${storeCode}/demo_drives`));
    const newLog: Omit<DriveLog, 'id'> = {
      vehicleId: vehicle.id,
      vehicleModel: vehicle.model,
      vehicleTrim: vehicle.trim,
      vehicleVin: vehicle.vin,
      vehicleSeats: vehicle.seats,
      coPilot,
      purpose: 'Scheduled',
      startTime: scheduleTime,
      expectedDuration: durationMinutes,
      startBattery,
      createdAt: serverTimestamp() as DriveLog['createdAt'],
      feedback: '',
    };
    transaction.set(newLogRef, newLog);

    const current = vehicleSnap.data() as Vehicle;
    if (current.status !== 'On Demo') {
      transaction.update(vehicleRef, { status: 'Scheduled' });
    }
  });
}
