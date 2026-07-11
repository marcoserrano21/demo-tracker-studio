import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
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

  const [vehicleSnap, driveSnap] = await Promise.all([getDoc(vehicleRef), getDoc(driveRef)]);
  if (!vehicleSnap.exists() || !driveSnap.exists()) {
    return { success: false };
  }

  const vehicle = vehicleSnap.data();
  const drive = driveSnap.data();
  if (vehicle.status !== 'On Demo' || drive.endTime) {
    return { success: true, skipped: true };
  }

  const batch = writeBatch(firestore);
  batch.update(vehicleRef, {
    status: 'Available',
    batteryLevel: payload.startBattery,
    currentDriveId: null,
    driveStartedAt: null,
    expectedDuration: null,
  });
  batch.update(driveRef, {
    endTime: serverTimestamp(),
    endBattery: payload.startBattery,
    advisorIn: 'System',
    feedback: `Auto-checked in after ${settings.autoCheckInThresholdMinutes} minutes overdue`,
    autoCheckedIn: true,
  });

  await batch.commit();
  return { success: true };
}
