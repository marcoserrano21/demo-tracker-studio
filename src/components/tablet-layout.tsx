'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs } from '@/components/ui/tabs';
import Header from './header';
import { HamburgerMenu } from './hamburger-menu';
import ManagerAuthDialog from './manager-auth-dialog';
import RedirectingLoader from './redirecting-loader';
import Footer from './footer';
import { DemoBanner } from './demo-banner';
import { CONFIRMATION_DETAILS, type ConfirmationAction } from './dashboard/confirmation-details';
import { DashboardTabPanels } from './dashboard/dashboard-tab-panels';
import type { DashboardLayoutProps } from './dashboard/dashboard-shell-types';
import { useDashboardShell } from '@/hooks/dashboard/use-dashboard-shell';
import { PRIMARY_MOBILE_TAB_ICONS, getSecondaryMobileTabIcons } from '@/lib/dashboard-tabs';
import { canRequestManagerAccess } from '@/lib/demo-users';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function TabletLayout(props: DashboardLayoutProps) {
  const {
    store,
    advisor,
    vehicles,
    driveLogs,
    driveLogsLoading = false,
    userRole,
    setUserRole,
    onStoreChange,
    onVehicleUpdate,
    onSwitchAdvisor,
    todaysScheduledDrivesCount,
  } = props;

  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || advisor.defaultTab || 'my-hub';
  const [isAuthDialogOpen, setAuthDialogOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction | null>(null);

  const shell = useDashboardShell({
    storeCode: store.code,
    vehicles,
    driveLogs,
    onVehicleUpdate,
    initialTab,
  });

  const secondaryTabs = getSecondaryMobileTabIcons(userRole);
  const allowManagerAccess = canRequestManagerAccess(advisor);
  if (!secondaryTabs.some((tab) => tab.value === 'settings')) {
    secondaryTabs.push({ value: 'settings', label: 'Settings', icon: 'Settings' });
  }

  const handleConfirmation = () => {
    if (!confirmationAction) return;
    if (confirmationAction === 'switchAdvisor') onSwitchAdvisor();
    if (confirmationAction === 'changeStore' || confirmationAction === 'logout') onStoreChange();
    setConfirmationAction(null);
  };

  return (
    <>
      <Header
        storeName={store.name}
        userRole={userRole}
        setUserRole={setUserRole}
        onStoreChange={() => setConfirmationAction('changeStore')}
        storeCode={store.code}
        currentAdvisor={advisor}
      >
        <HamburgerMenu
          primaryTabs={PRIMARY_MOBILE_TAB_ICONS}
          secondaryTabs={secondaryTabs}
          userRole={userRole}
          activeTab={shell.activeTab}
          handleTabChange={shell.handleTabChange}
          onStoreChange={() => setConfirmationAction('logout')}
          onSwitchAdvisor={() => setConfirmationAction('switchAdvisor')}
          onManagerClick={() => setAuthDialogOpen(true)}
          onSwitchToAdvisor={() => setUserRole('advisor')}
          todaysScheduledDrivesCount={todaysScheduledDrivesCount}
          allowManagerAccess={allowManagerAccess}
        />
      </Header>
      <DemoBanner />
      <div className="flex-grow p-6">
        {shell.isRedirecting && <RedirectingLoader />}
        <div className={shell.isRedirecting ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
          <Tabs
            defaultValue="fleet"
            className="w-full"
            onValueChange={shell.handleTabChange}
            value={shell.activeTab}
          >
            <DashboardTabPanels
              {...props}
              driveLogsLoading={driveLogsLoading}
              manualAwards={shell.manualAwards}
              goals={shell.goals}
              scheduledDemos={shell.scheduledDemos}
              vehicleIssues={shell.vehicleIssues}
              onLogUpdate={shell.handleLogUpdate}
              isMobile
            />
          </Tabs>
        </div>
      </div>
      <ManagerAuthDialog
        isOpen={isAuthDialogOpen}
        setIsOpen={setAuthDialogOpen}
        onSuccess={() => setUserRole('manager')}
        storeCode={store.code}
        currentAdvisor={advisor}
      />
      <AlertDialog open={!!confirmationAction} onOpenChange={() => setConfirmationAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmationAction ? CONFIRMATION_DETAILS[confirmationAction].title : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationAction ? CONFIRMATION_DETAILS[confirmationAction].description : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmationAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmation}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Footer />
    </>
  );
}
