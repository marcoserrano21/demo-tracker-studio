import type { Store, Vehicle, Advisor, UserRole, DriveLog, FsdOrderRecord } from '@/lib/types';

export interface DashboardLayoutProps {
  store: Store;
  advisor: Advisor;
  vehicles: Vehicle[];
  advisors: Advisor[];
  driveLogs: DriveLog[];
  driveLogsLoading?: boolean;
  fsdOrders?: FsdOrderRecord[];
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  onStoreChange: () => void;
  onVehicleUpdate: (updatedVehicle: Partial<Vehicle> & { id: string }) => void;
  onSwitchAdvisor: () => void;
  todaysScheduledDrivesCount: number;
  onAdvisorsUpdate: (advisors: Advisor[]) => void;
  onVehiclesUpdate: (vehicles: Vehicle[]) => void;
  onAdvisorPatch?: (patch: Partial<Advisor>) => void;
}

/** Accessible focus ring for tab panels - never remove focus entirely. */
export const TAB_PANEL_CLASS =
  'tab-content-enter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm';
