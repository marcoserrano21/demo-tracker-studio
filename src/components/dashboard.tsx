import type { DashboardLayoutProps } from '@/components/dashboard/dashboard-shell-types';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import MobileLayout from './mobile-layout';
import TabletLayout from './tablet-layout';
import DesktopLayout from './desktop-layout';
import { DashboardLoadingSkeleton } from '@/components/dashboard/dashboard-loading-skeleton';

export default function Dashboard(props: DashboardLayoutProps) {
  const breakpoint = useBreakpoint();

  if (!breakpoint) {
    return <DashboardLoadingSkeleton />;
  }

  if (breakpoint === 'sm') {
    return <MobileLayout {...props} />;
  }

  if (breakpoint === 'md') {
    return <TabletLayout {...props} />;
  }

  return <DesktopLayout {...props} />;
}
