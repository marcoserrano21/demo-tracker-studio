import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  Timestamp,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { Advisor, DriveLog, FsdOrderRecord, Vehicle } from './types';
import { getVehicleImage, PREMIUM_LONG_WHEELBASE_TRIM } from './data';
import { getLevelFromXP } from './xp-system';
import { stripUndefined } from './utils';
import {
  DEMO_MANAGER_ADVISOR_NAME,
  DEMO_RANDOM_ADVISOR_PROFILES,
  getDemoAdvisorEmail,
} from './demo-users';
import { DEMO_STORE_CODE } from './demo-store';

export { DEMO_STORE_CODE } from './demo-store';
const MIN_DEMO_DRIVE_LOGS = 20;

const DEMO_ADVISOR_NAMES = [
  DEMO_MANAGER_ADVISOR_NAME,
  ...DEMO_RANDOM_ADVISOR_PROFILES.map((profile) => profile.name),
  'Fiona Garcia',
  'George Rodriguez',
] as const;

const FEEDBACK_SAMPLES = [
  'Customer loved the acceleration and one-pedal driving.',
  'Great demo — they are comparing trims this weekend. FSD subscribed.',
  'Smooth highway merge impressed the family.',
  'Charging stop went well; customer asked about home install. Full self-driving attached.',
  'Quiet cabin and screen UX were the highlights.',
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function getDemoVehicles(storeCode: string): Array<Vehicle & { id: string }> {
  const base = [
    {
      id: 'demo-vehicle-01',
      model: 'Model S' as const,
      trim: 'Plaid',
      exteriorColor: 'Pearl White Multi-Coat',
      interiorColor: 'Cream',
      status: 'Available' as const,
      seats: '5-seater' as const,
      imageUrl: getVehicleImage('Model S', 'Plaid'),
      batteryLevel: 88,
    },
    {
      id: 'demo-vehicle-02',
      model: 'Model Y' as const,
      trim: 'Performance',
      exteriorColor: 'Frost Blue Metallic',
      interiorColor: 'Black and White',
      status: 'On Demo' as const,
      seats: '5-seater' as const,
      imageUrl: getVehicleImage('Model Y', 'Performance'),
      batteryLevel: 72,
      driveStartedAt: Date.now() - 35 * 60 * 1000,
      expectedDuration: 60,
      currentDriveId: 'demo-log-active-01',
    },
    {
      id: 'demo-vehicle-03',
      model: 'Cybertruck' as const,
      trim: 'Premium All-Wheel Drive',
      exteriorColor: 'Stainless Steel',
      interiorColor: 'White Decor',
      status: 'Charging' as const,
      seats: '5-seater' as const,
      imageUrl: getVehicleImage('Cybertruck', 'Premium All-Wheel Drive'),
      batteryLevel: 34,
      currentDriveId: 'demo-log-active-02',
      wheelSize: '20" Core Wheels',
    },
    {
      id: 'demo-vehicle-04',
      model: 'Model X' as const,
      trim: 'All-Wheel Drive',
      exteriorColor: 'Solid Black',
      interiorColor: 'Black',
      status: 'Available' as const,
      seats: '6-seater' as const,
      imageUrl: getVehicleImage('Model X', 'All-Wheel Drive'),
      batteryLevel: 91,
    },
    {
      id: 'demo-vehicle-05',
      model: 'Model Y' as const,
      trim: PREMIUM_LONG_WHEELBASE_TRIM,
      exteriorColor: 'Cosmic Silver',
      interiorColor: 'Black',
      status: 'Available' as const,
      seats: '6-seater' as const,
      imageUrl: getVehicleImage('Model Y', PREMIUM_LONG_WHEELBASE_TRIM),
      batteryLevel: 79,
      wheelSize: '19" Machina 2.0 Wheels',
    },
    {
      id: 'demo-vehicle-06',
      model: 'Model 3' as const,
      trim: 'Performance',
      exteriorColor: 'Ultra Red',
      interiorColor: 'Black and White',
      status: 'Available' as const,
      seats: '5-seater' as const,
      imageUrl: getVehicleImage('Model 3', 'Performance'),
      batteryLevel: 84,
    },
    {
      id: 'demo-vehicle-07',
      model: 'Model Y' as const,
      trim: 'All-Wheel Drive',
      exteriorColor: 'Stealth Grey',
      interiorColor: 'Black',
      status: 'Scheduled' as const,
      seats: '5-seater' as const,
      imageUrl: getVehicleImage('Model Y', 'All-Wheel Drive'),
      batteryLevel: 95,
    },
    {
      id: 'demo-vehicle-08',
      model: 'Model 3' as const,
      trim: 'Premium All-Wheel Drive',
      exteriorColor: 'Pearl White Multi-Coat',
      interiorColor: 'Black',
      status: 'Available' as const,
      seats: '5-seater' as const,
      imageUrl: getVehicleImage('Model 3', 'Premium All-Wheel Drive'),
      batteryLevel: 67,
    },
  ];

  return base.map((v, index) => ({
    ...v,
    storeId: storeCode,
    vin: `DEMO${(1001 + index).toString()}`,
    licensePlate: `EV${(200 + index).toString()}DM`,
    wheelSize: v.wheelSize ?? '20" Wheels',
  }));
}

function getDemoAdvisors(storeCode: string): Array<Advisor> {
  return DEMO_ADVISOR_NAMES.map((name, index) => {
    const baseXp = [4200, 3100, 2800, 2400, 2100, 1900, 1600, 1200][index] ?? 1000;
    const xp = baseXp;
    const isManagerDemo = name === DEMO_MANAGER_ADVISOR_NAME;
    return {
      id: `demo-advisor-${slugify(name)}`,
      storeId: storeCode,
      name,
      email: getDemoAdvisorEmail(name),
      role: isManagerDemo ? 'moderator' : 'advisor',
      defaultTab: 'fleet',
      themePreference: 'dark',
      fontSize: 'base',
      fleetView: 'grid',
      xp,
      level: getLevelFromXP(xp),
    } satisfies Advisor;
  });
}

function generateDemoDriveLogs(
  vehicles: Array<Vehicle & { id: string }>,
  advisors: Advisor[],
): Array<Omit<DriveLog, 'id'> & { id: string }> {
  const logs: Array<Omit<DriveLog, 'id'> & { id: string }> = [];
  const advisorNames = advisors.map((a) => a.name);
  const purposes: DriveLog['purpose'][] = ['Demo', 'Demo', 'Demo', 'Charging', 'Scheduled'];
  const durations = [40, 60, 1440, 2880];
  const now = Date.now();

  for (let i = 0; i < 48; i++) {
    const vehicle = vehicles[i % vehicles.length];
    const advisor = advisorNames[i % advisorNames.length];
    const purpose = purposes[i % purposes.length];
    const daysAgo = Math.floor(i / 2);
    const hour = 9 + (i % 8);
    const start = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    start.setHours(hour, (i % 4) * 15, 0, 0);
    const expectedDuration = purpose === 'Charging' ? 120 : durations[i % durations.length];
    const durationMs = expectedDuration * 60 * 1000;
    const end = new Date(start.getTime() + durationMs);
    const startBattery = 55 + (i % 40);
    const endBattery = Math.max(12, startBattery - (purpose === 'Charging' ? -25 : 8 + (i % 15)));
    const isCompleted = i > 2;
    const rating = purpose === 'Demo' && isCompleted ? (i % 5 === 0 ? 4 : 5) : undefined;
    const customerPurchased = purpose === 'Demo' && isCompleted && i % 7 === 0;
    const fsdSubscribed =
      purpose === 'Demo' && isCompleted && (i % 7 === 0 || i % 11 === 0 || feedbackIncludesFsd(i));

    logs.push({
      id: `demo-log-${String(i + 1).padStart(3, '0')}`,
      vehicleId: vehicle.id,
      vehicleModel: vehicle.model,
      vehicleTrim: vehicle.trim,
      vehicleVin: vehicle.vin,
      vehicleSeats: vehicle.seats,
      coPilot: advisor,
      advisorIn: advisor,
      purpose,
      startTime: Timestamp.fromDate(start),
      endTime: isCompleted ? Timestamp.fromDate(end) : undefined,
      expectedDuration,
      startBattery,
      endBattery: isCompleted ? endBattery : undefined,
      feedback: isCompleted && purpose === 'Demo' ? FEEDBACK_SAMPLES[i % FEEDBACK_SAMPLES.length] : undefined,
      rating,
      issueDetected: isCompleted && i % 11 === 0,
      customerPurchased: customerPurchased || fsdSubscribed || undefined,
      purchaseModel: customerPurchased || fsdSubscribed ? vehicle.model : undefined,
      purchaseTrim: customerPurchased || fsdSubscribed ? vehicle.trim : undefined,
      fsdSubscribed: fsdSubscribed || undefined,
      sentimentLabel: rating && rating >= 4 ? 'positive' : 'neutral',
    });
  }

  logs.push({
    id: 'demo-log-active-01',
    vehicleId: 'demo-vehicle-02',
    vehicleModel: 'Model Y',
    vehicleTrim: 'Performance',
    vehicleVin: 'DEMO1002',
    vehicleSeats: '5-seater',
    coPilot: 'Alice Johnson',
    purpose: 'Demo',
    startTime: Timestamp.fromDate(new Date(now - 35 * 60 * 1000)),
    expectedDuration: 60,
    startBattery: 78,
  });

  logs.push({
    id: 'demo-log-active-02',
    vehicleId: 'demo-vehicle-03',
    vehicleModel: 'Cybertruck',
    vehicleTrim: 'Premium All-Wheel Drive',
    vehicleVin: 'DEMO1003',
    vehicleSeats: '5-seater',
    coPilot: 'Ethan Davis',
    purpose: 'Charging',
    startTime: Timestamp.fromDate(new Date(now - 90 * 60 * 1000)),
    expectedDuration: 120,
    startBattery: 22,
  });

  return logs;
}

function feedbackIncludesFsd(i: number): boolean {
  const sample = FEEDBACK_SAMPLES[i % FEEDBACK_SAMPLES.length].toLowerCase();
  return sample.includes('fsd') || sample.includes('self-driving') || sample.includes('self driving');
}

function generateDemoFsdOrders(
  advisors: Advisor[],
  driveLogs: Array<Omit<DriveLog, 'id'> & { id: string }>,
  storeCode: string,
): Array<Omit<FsdOrderRecord, 'id'> & { id: string }> {
  const now = Date.now();
  const records: Array<Omit<FsdOrderRecord, 'id'> & { id: string }> = [];

  for (let i = 0; i < 18; i++) {
    const advisor = advisors[i % advisors.length];
    const daysAgo = i * 2;
    const orderedAt = Timestamp.fromDate(new Date(now - daysAgo * 24 * 60 * 60 * 1000));
    const source =
      i % 3 === 0 ? 'order_placement' : i % 3 === 1 ? 'follow_up_call' : 'demo_checkin';
    const fsdSubscribed = i % 4 !== 0 || source === 'demo_checkin';
    records.push({
      id: `demo-fsd-${String(i + 1).padStart(3, '0')}`,
      storeId: storeCode,
      customerLabel: `Cust ${String.fromCharCode(65 + (i % 26))}.${i + 1}`,
      orderedAt,
      fsdSubscribed,
      source,
      advisorId: advisor.id,
      advisorName: advisor.name,
      createdAt: orderedAt,
      createdBy: advisor.name,
      ...(source === 'follow_up_call' && fsdSubscribed
        ? { convertedAt: orderedAt }
        : {}),
    });
  }

  driveLogs
    .filter((log) => log.fsdSubscribed && log.endTime)
    .slice(0, 6)
    .forEach((log, idx) => {
      records.push({
        id: `demo-fsd-checkin-${String(idx + 1).padStart(3, '0')}`,
        storeId: storeCode,
        customerLabel: `Demo · ${log.vehicleModel} ···${log.vehicleVin.slice(-4)}`,
        orderedAt: log.endTime as Timestamp,
        fsdSubscribed: true,
        source: 'demo_checkin',
        advisorName: log.coPilot,
        driveLogId: log.id,
        notes: log.feedback,
        createdAt: log.endTime as Timestamp,
        createdBy: log.coPilot,
      });
    });

  return records;
}

/**
 * Seeds the demo store with advisors (max 8), fleet, and drive history when data is sparse.
 * Idempotent: uses stable document IDs and merge writes.
 */
export async function seedDemoStoreIfNeeded(
  firestore: Firestore,
  storeCode: string,
): Promise<boolean> {
  if (storeCode !== DEMO_STORE_CODE) return false;

  const logsSnap = await getDocs(
    query(collection(firestore, `stores/${storeCode}/demo_drives`), limit(30)),
  );

  if (logsSnap.size >= MIN_DEMO_DRIVE_LOGS) {
    return false;
  }

  const vehicles = getDemoVehicles(storeCode);
  const advisors = getDemoAdvisors(storeCode);
  const driveLogs = generateDemoDriveLogs(vehicles, advisors);
  const fsdOrders = generateDemoFsdOrders(advisors, driveLogs, storeCode);

  const batch = writeBatch(firestore);

  for (const advisor of advisors) {
    const { id, ...data } = advisor;
    batch.set(doc(firestore, `stores/${storeCode}/advisors`, id), stripUndefined(data), { merge: true });
  }

  for (const vehicle of vehicles) {
    const { id, ...data } = vehicle;
    batch.set(doc(firestore, `stores/${storeCode}/vehicles`, id), stripUndefined(data), { merge: true });
  }

  for (const log of driveLogs) {
    const { id, ...data } = log;
    batch.set(doc(firestore, `stores/${storeCode}/demo_drives`, id), stripUndefined(data), { merge: true });
  }

  for (const order of fsdOrders) {
    const { id, ...data } = order;
    batch.set(doc(firestore, `stores/${storeCode}/fsd_orders`, id), stripUndefined(data), { merge: true });
  }

  await batch.commit();
  return true;
}
