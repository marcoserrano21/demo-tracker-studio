import type { UserRole } from '@/lib/types';
import {
  User,
  Car,
  History,
  BarChart,
  Calendar,
  Trophy,
  Settings,
  UserCog,
  type LucideIcon,
} from 'lucide-react';

export type DashboardTabValue =
  | 'my-hub'
  | 'fleet'
  | 'history'
  | 'analytics'
  | 'schedule'
  | 'hall-of-fame'
  | 'settings'
  | 'management';

export interface DashboardTabDefinition {
  value: DashboardTabValue;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_DASHBOARD_TABS: DashboardTabDefinition[] = [
  { value: 'my-hub', label: 'My Hub', icon: User },
  { value: 'fleet', label: 'Fleet', icon: Car },
  { value: 'history', label: 'History', icon: History },
  { value: 'analytics', label: 'Analytics', icon: BarChart },
  { value: 'schedule', label: 'Schedule', icon: Calendar },
  { value: 'hall-of-fame', label: 'Hall of Fame', icon: Trophy },
];

export function getSecondaryDashboardTabs(userRole: UserRole): DashboardTabDefinition[] {
  const tabs: DashboardTabDefinition[] = [
    { value: 'settings', label: 'Settings', icon: Settings },
  ];

  if (userRole === 'manager') {
    tabs.unshift({ value: 'management', label: 'Management', icon: UserCog });
  }

  return tabs;
}

/** String icon names for mobile/tablet bottom nav. */
export const PRIMARY_MOBILE_TAB_ICONS = PRIMARY_DASHBOARD_TABS.map((tab) => ({
  value: tab.value,
  label: tab.label,
  icon:
    tab.value === 'my-hub'
      ? 'User'
      : tab.value === 'fleet'
        ? 'Car'
        : tab.value === 'history'
          ? 'History'
          : tab.value === 'analytics'
            ? 'BarChart'
            : tab.value === 'schedule'
              ? 'Calendar'
              : 'Trophy',
}));

export function getSecondaryMobileTabIcons(userRole: UserRole) {
  const tabs = getSecondaryDashboardTabs(userRole);
  return tabs.map((tab) => ({
    value: tab.value,
    label: tab.label,
    icon: tab.value === 'management' ? 'UserCog' : 'Settings',
  }));
}
