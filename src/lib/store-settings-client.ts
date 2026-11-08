import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { estimateDemoEndBattery } from '@/lib/drive-log-utils';
import { DEFAULT_STORE_SETTINGS, type StoreSettings } from '@/lib/types';

const settingsPath = (storeCode: string) => `stores/${storeCode}/settings/operations`;

export async function getStoreSettingsClient(
  firestore: Firestore,
  storeCode: string
): Promise<StoreSettings> {
  const snap = await getDoc(doc(firestore, settingsPath(storeCode)));
  if (!snap.exists()) return DEFAULT_STORE_SETTINGS;
  return { ...DEFAULT_STORE_SETTINGS, ...(snap.data() as Partial<StoreSettings>) };
}

export async function updateStoreSettingsClient(
  firestore: Firestore,
  storeCode: string,
  patch: Partial<StoreSettings>
): Promise<void> {
  await setDoc(
    doc(firestore, settingsPath(storeCode)),
    {
      ...patch,
      updatedAt: serverTimestamp(),
      updatedBy: 'manager',
    },
    { merge: true }
  );
}

export type AutoCheckInPayload = {
  storeCode: string;
  vehicleId: string;
  driveLogId: string;
  driveStartedAt: number;
  expectedDurationMinutes: number;
  startBattery: number;
};

export async function performAutoCheckInClient(
  firestore: Firestore,
  payload: AutoCheckInPayload,
  settings: StoreSettings
): Promise<{ success: boolean; skipped?: boolean }> {
  if (!settings.autoCheckInEnabled) {
    return { success: true, skipped: true };
  }

  const thresholdMs = (settings.autoCheckInThresholdMinutes ?? 30) * 60 * 1000;
  const endTime = payload.driveStartedAt + payload.expectedDurationMinutes * 60 * 1000;
  if (Date.now() - endTime < thresholdMs) {
    return { success: true, skipped: true };
  }

  const vehicleRef = doc(
    firestore,
    `stores/${payload.storeCode}/vehicles/${payload.vehicleId}`
  );
  const driveRef = doc(
    firestore,
    `stores/${payload.storeCode}/demo_drives/${payload.driveLogId}`
  );

  try {
    await runTransaction(firestore, async (transaction) => {
      const vehicleSnap = await transaction.get(vehicleRef);
      const driveSnap = await transaction.get(driveRef);
      if (!vehicleSnap.exists() || !driveSnap.exists()) {
        throw new Error('stale');
      }

      const vehicle = vehicleSnap.data();
      const drive = driveSnap.data();
      if (vehicle.status !== 'On Demo' || drive.endTime) {
        throw new Error('skip');
      }

      const estimatedEnd = estimateDemoEndBattery(
        typeof vehicle.batteryLevel === 'number' ? vehicle.batteryLevel : payload.startBattery,
        { startTime: drive.startTime ?? payload.driveStartedAt },
      );

      transaction.update(vehicleRef, {
        status: 'Available',
        batteryLevel: estimatedEnd,
        batterySource: 'manual',
        currentDriveId: null,
        driveStartedAt: null,
        expectedDuration: null,
      });
      transaction.update(driveRef, {
        endTime: serverTimestamp(),
        endBattery: estimatedEnd,
        advisorIn: 'System',
        feedback: `Auto-checked in after ${settings.autoCheckInThresholdMinutes} minutes overdue`,
        autoCheckedIn: true,
      });
    });
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === 'skip') {
      return { success: true, skipped: true };
    }
    return { success: false };
  }
}
