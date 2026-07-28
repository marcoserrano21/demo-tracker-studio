import type { UserRole } from '@/lib/types';
import {
  Search,
  Play,
  CheckCircle2,
  User,
  History,
  BarChart,
  Trophy,
  Settings,
  UserCog,
  type LucideIcon,
} from 'lucide-react';

export type DashboardTabValue =
  | 'my-hub'
  | 'fleet'
  | 'finish'
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

/** Advisor primary path: Find → Start → Finish */
export const PRIMARY_DASHBOARD_TABS: DashboardTabDefinition[] = [
  { value: 'fleet', label: 'Find', icon: Search },
  { value: 'schedule', label: 'Start', icon: Play },
  { value: 'finish', label: 'Finish', icon: CheckCircle2 },
];

/** Demoted / grouped under More */
export const MORE_DASHBOARD_TABS: DashboardTabDefinition[] = [
  { value: 'my-hub', label: 'My Hub', icon: User },
  { value: 'history', label: 'History', icon: History },
  { value: 'analytics', label: 'Analytics', icon: BarChart },
  { value: 'hall-of-fame', label: 'Hall of Fame', icon: Trophy },
];

export function getSecondaryDashboardTabs(userRole: UserRole): DashboardTabDefinition[] {
  const tabs: DashboardTabDefinition[] = [
    ...MORE_DASHBOARD_TABS,
    { value: 'settings', label: 'Settings', icon: Settings },
  ];

  if (userRole === 'manager' || userRole === 'moderator') {
    tabs.push({ value: 'management', label: 'Management', icon: UserCog });
  }

  return tabs;
}

const MOBILE_ICON_BY_TAB: Record<DashboardTabValue, string> = {
  fleet: 'Search',
  schedule: 'Play',
  finish: 'CheckCircle2',
  'my-hub': 'User',
  history: 'History',
  analytics: 'BarChart',
  'hall-of-fame': 'Trophy',
  settings: 'Settings',
  management: 'UserCog',
};

/** String icon names for mobile/tablet hamburger nav. */
export const PRIMARY_MOBILE_TAB_ICONS = PRIMARY_DASHBOARD_TABS.map((tab) => ({
  value: tab.value,
  label: tab.label,
  icon: MOBILE_ICON_BY_TAB[tab.value],
}));

export function getSecondaryMobileTabIcons(userRole: UserRole) {
  const tabs = getSecondaryDashboardTabs(userRole);
  return tabs.map((tab) => ({
    value: tab.value,
    label: tab.label,
    icon: MOBILE_ICON_BY_TAB[tab.value],
  }));
}
