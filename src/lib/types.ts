

import { Timestamp } from "firebase/firestore";

export type VehicleStatus = 'Available' | 'On Demo' | 'Charging' | 'Scheduled' | 'Needs Attention' | 'Sold';
export type VehicleModel = 'Model S' | 'Model 3' | 'Model X' | 'Model Y' | 'Cybertruck' | 'Roadster';
export type SeatConfiguration = '4-seater' | '5-seater' | '6-seater' | '7-seater';
export type UserRole = 'advisor' | 'manager' | 'moderator';
export type SortKey = 'model' | 'battery-desc' | 'battery-asc' | 'date-added' | 'popularity';
export type SentimentLabel = 'positive' | 'negative' | 'neutral';
export type FleetView = 'grid' | 'compact' | 'list' | 'carousel';
export type GoalMetric = 'drives' | 'positive_feedback' | 'charging_sessions' | 'fsd_attaches';
export type GoalTimeframe = 'daily' | 'weekly' | 'monthly';
export type CardHoverEffect = 'holographic' | 'blur';
export type ButtonHoverEffect = 'default' | 'arrow';
export type BatterySource = 'manual' | 'fleet_api';
export type FsdOrderSource = 'order_placement' | 'follow_up_call' | 'demo_checkin';


export interface Vehicle {
  id: string;
  storeId: string;
  vin: string;
  model: VehicleModel;
  trim: string;
  exteriorColor: string;
  interiorColor: string;
  wheelSize: string;
  status: VehicleStatus;
  batteryLevel: number;
  seats: SeatConfiguration;
  imageUrl: string;
  currentDriveId?: string;
  overdue?: boolean;
  driveStartedAt?: number;
  expectedDuration?: number;
  sold?: boolean;
  soldDate?: Timestamp;
  /** Stored for ops/export only - not shown on the public Fleet view */
  licensePlate?: string;
  /** OEM / manual telemetry */
  latitude?: number;
  longitude?: number;
  locationUpdatedAt?: Timestamp | number;
  batterySource?: BatterySource;
  telemetrySyncedAt?: Timestamp | number;
  /** Last known FSD/autopilot engaged flag from Fleet API sync (best-effort). */
  fsdActiveTelemetry?: boolean;
}

export type ThemePreference = 'system' | 'light' | 'dark' | 'high-contrast';
export type FontSizePreference = 'sm' | 'base' | 'lg';
export type DefaultTab = 'my-hub' | 'fleet' | 'schedule' | 'finish' | 'analytics';
export type FsdSubscriptionAnswer = 'Y' | 'N' | 'NA';
export type YnAnswer = 'Y' | 'N';

export interface Advisor {
  id: string;
  storeId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role?: UserRole;
  defaultTab?: DefaultTab;
  themePreference?: ThemePreference;
  fontSize?: FontSizePreference;
  fleetView?: FleetView;
  compactHistoryView?: boolean;
  defaultSortOrder?: SortKey;
  cardHoverEffect?: CardHoverEffect;
  buttonHoverEffect?: ButtonHoverEffect;
  /** When true, disables decorative motion (hovers, sidebar transitions, sheet animations). */
  reduceMotion?: boolean;
  overdueGlowColor?: string;
  xp?: number; // Total XP earned
  level?: number; // Current level (calculated from XP)
}

export interface StoreSettings {
  autoCheckInEnabled: boolean;
  autoCheckInThresholdMinutes: number;
  /** After Manager Access, land on Analytics Morning Brief. Managers/Moderators only. */
  landOnMorningBrief?: boolean;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  autoCheckInEnabled: false,
  autoCheckInThresholdMinutes: 30,
  landOnMorningBrief: false,
};

export interface StoreInfo {
  code: string;
  name: string;
  password?: string;
  region: string;
}
export interface Store extends StoreInfo {
  advisors: Advisor[];
  vehicles: Vehicle[];
}

export interface DriveLog {
  id: string;
  vehicleId: string;
  vehicleModel: string;
  vehicleTrim: string;
  vehicleVin: string;
  vehicleSeats: string;
  coPilot: string;
  advisorIn?: string;
  purpose: 'Demo' | 'Charging' | 'Scheduled' | 'Other';
  startTime: number | Date | Timestamp;
  endTime?: number | Date | Timestamp;
  expectedDuration: number;
  feedback?: string;
  rating?: number;
  startBattery: number;
  endBattery?: number;
  issueDetected?: boolean;
  createdAt?: Timestamp;
  sentimentScore?: number;
  sentimentLabel?: SentimentLabel;
  analyzedAt?: Timestamp;
  autoCheckedIn?: boolean;
  /** Advisor noted the customer purchased (or ordered) this model after the demo. */
  customerPurchased?: boolean;
  purchaseModel?: string;
  purchaseTrim?: string;
  /** Demo finished via check-in (always true when a demo is ended). */
  demoCompleted?: boolean;
  /** FSD (Supervised) was activated during the demo (advisor or Fleet API). */
  fsdActivated?: boolean;
  /** Source of FSD activation signal. */
  fsdActivatedSource?: 'advisor' | 'fleet_api';
  /** FSD Monthly Subscription attached (check-in keywords or explicit). */
  fsdSubscribed?: boolean;
  /** FSD subscription attached to order: Y / N / NA. */
  fsdSubscriptionAttached?: FsdSubscriptionAnswer;
}

/** Lightweight CRM outcome - no PII; soft labels only. */
export interface DemoOutcomeRecord {
  id: string;
  storeId: string;
  driveLogId: string;
  vehicleModel: string;
  vehicleTrim: string;
  vehicleVinLast6: string;
  advisorName: string;
  customerPurchased: boolean;
  fsdSubscribed: boolean;
  fsdActivated: boolean;
  /** Soft ops label e.g. "Demo · Model Y ···1002" - never real customer PII */
  outcomeLabel: string;
  createdAt: Timestamp | number | Date;
  createdBy: string;
}

export interface FsdOrderRecord {
  id: string;
  storeId: string;
  /** Soft identifier for ops (initials / order ref) - avoid PII in portfolio demos */
  customerLabel: string;
  orderedAt: Timestamp | number | Date;
  fsdSubscribed: boolean;
  source: FsdOrderSource;
  advisorId?: string;
  advisorName?: string;
  driveLogId?: string;
  convertedAt?: Timestamp | number | Date;
  notes?: string;
  createdAt?: Timestamp | number | Date;
  createdBy: string;
}

export interface Goal {
    id: string;
    storeId: string;
    targetType: 'store' | 'advisor';
    targetIds: string[];
    targetNames: string[];
    metric: GoalMetric;
    targetValue: number;
    startDate: Timestamp;
    endDate: Timestamp;
    createdBy: string;
    createdAt: Timestamp;
}


export interface VehicleIssue {
    id: string;
    vehicleId: string;
    storeId: string;
    vehicleModel: string;
    vehicleVin: string;
    description: string;
    dateReported: any;
    status: 'Open' | 'Resolved';
    resolutionDate?: any;
    resolutionNotes?: string;
}

export interface ManualAward {
    id: string;
    storeId: string;
    advisorId: string;
    advisorName: string;
    achievementId: string;
    achievementTitle: string;
    awardedBy: string;
    awardedAt: any;
}

export interface AuditLogChange {
  field: string;
  previous: unknown;
  next: unknown;
}

export interface AuditLog {
  id: string;
  storeId: string;
  userName: string;
  action: 'edit_log' | 'delete_log' | 'resolve_issue' | 'delete_advisor' | 'delete_vehicle' | 'reset_store';
  timestamp: any;
  details: {
    targetId: string;
    targetType: 'DriveLog' | 'VehicleIssue' | 'Advisor' | 'Vehicle' | 'DemoOutcome';
    description: string;
    /** Field-level before/after for history edits (especially Sales Outcome). */
    changes?: AuditLogChange[];
  };
}
