'use client';

import React, { Suspense, lazy } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import type { DriveLog, Goal, ManualAward, VehicleIssue } from '@/lib/types';
import { stores as allStores } from '@/lib/data';
import VehicleGrid from '@/components/vehicle-grid';
import FloorMode from '@/components/floor-mode';
import { TabContentLoader } from '@/components/dashboard/tab-content-loader';
import { TAB_PANEL_CLASS, type DashboardLayoutProps } from '@/components/dashboard/dashboard-shell-types';
import { isElevatedUserRole } from '@/lib/demo-users';

const History = lazy(() => import('@/components/history'));
const AnalyticsDashboard = lazy(() => import('@/components/analytics-dashboard'));
const Schedule = lazy(() => import('@/components/schedule'));
const ManagementTabs = lazy(() => import('@/components/management-tabs'));
const HallOfFame = lazy(() => import('@/components/hall-of-fame'));
const MyHub = lazy(() => import('@/components/my-hub'));
const SettingsPage = lazy(() => import('@/components/settings-page'));

type TabPanelsProps = DashboardLayoutProps & {
  driveLogsLoading: boolean;
  manualAwards: ManualAward[];
  goals: Goal[];
  scheduledDemos: DriveLog[];
  vehicleIssues: VehicleIssue[];
  onLogUpdate: (log: DriveLog, affectedVehicleId?: string) => void;
  isMobile?: boolean;
  onNavigateTab?: (tab: string) => void;
};

export function DashboardTabPanels({
  store,
  advisor,
  vehicles,
  advisors,
  driveLogs,
  driveLogsLoading,
  fsdOrders = [],
  userRole,
  onVehicleUpdate,
  manualAwards,
  goals,
  scheduledDemos,
  vehicleIssues,
  onLogUpdate,
  onAdvisorsUpdate,
  onVehiclesUpdate,
  onAdvisorPatch,
  isMobile = false,
  onNavigateTab,
}: TabPanelsProps) {
  const logsReady = !driveLogsLoading;

  return (
    <>
      <TabsContent className={TAB_PANEL_CLASS} value="my-hub">
        <Suspense fallback={<TabContentLoader />}>
          {logsReady ? (
            <MyHub
              advisor={advisor}
              driveLogs={driveLogs}
              vehicles={vehicles}
              advisors={advisors}
              storeCode={store.code}
              manualAwards={manualAwards}
            />
          ) : (
            <TabContentLoader />
          )}
        </Suspense>
      </TabsContent>

      <TabsContent className={TAB_PANEL_CLASS} value="fleet">
        <VehicleGrid
          vehicles={vehicles}
          advisors={advisors}
          currentAdvisor={advisor}
          storeCode={store.code}
          userRole={userRole}
          driveLogs={driveLogs}
          onVehicleUpdate={onVehicleUpdate}
          storeName={store.name}
          advisorName={advisor.name.split(' ')[0]}
          isMobile={isMobile}
          onNavigateTab={onNavigateTab}
          onAdvisorPatch={onAdvisorPatch}
        />
      </TabsContent>

      <TabsContent className={TAB_PANEL_CLASS} value="finish">
        <FloorMode
          vehicles={vehicles}
          advisors={advisors}
          currentAdvisor={advisor}
          storeCode={store.code}
          userRole={userRole}
          driveLogs={driveLogs}
          onVehicleUpdate={onVehicleUpdate}
          finishOnly
          onNavigateTab={onNavigateTab}
        />
      </TabsContent>

      <TabsContent className={TAB_PANEL_CLASS} value="history">
        <Suspense fallback={<TabContentLoader />}>
          {logsReady ? (
            <History
              driveLogs={driveLogs}
              userRole={userRole}
              storeCode={store.code}
              advisors={advisors}
              vehicles={vehicles}
              onUpdateLog={onLogUpdate}
              storeName={store.name}
              currentAdvisor={advisor}
            />
          ) : (
            <TabContentLoader />
          )}
        </Suspense>
      </TabsContent>

      <TabsContent className={TAB_PANEL_CLASS} value="analytics">
        <Suspense fallback={<TabContentLoader />}>
          {logsReady ? (
            <AnalyticsDashboard
              driveLogs={driveLogs}
              advisors={advisors}
              userRole={userRole}
              storeName={store.name}
              storeCode={store.code}
              vehicles={vehicles}
              fsdOrders={fsdOrders}
              onNavigateTab={onNavigateTab}
            />
          ) : (
            <TabContentLoader />
          )}
        </Suspense>
      </TabsContent>

      <TabsContent className={TAB_PANEL_CLASS} value="schedule">
        <Suspense fallback={<TabContentLoader />}>
          <Schedule
            driveLogs={scheduledDemos}
            storeCode={store.code}
            vehicles={vehicles}
            advisors={advisors}
            currentAdvisor={advisor}
            userRole={userRole}
            onVehicleUpdate={onVehicleUpdate}
            storeName={store.name}
          />
        </Suspense>
      </TabsContent>

      <TabsContent className={TAB_PANEL_CLASS} value="hall-of-fame">
        <Suspense fallback={<TabContentLoader />}>
          {logsReady ? (
            <HallOfFame
              driveLogs={driveLogs}
              advisors={advisors}
              vehicles={vehicles}
              manualAwards={manualAwards}
              allStores={allStores}
            />
          ) : (
            <TabContentLoader />
          )}
        </Suspense>
      </TabsContent>

      <TabsContent className={TAB_PANEL_CLASS} value="settings">
        <Suspense fallback={<TabContentLoader />}>
          <SettingsPage advisor={advisor} storeCode={store.code} advisors={advisors} userRole={userRole} />
        </Suspense>
      </TabsContent>

      {isElevatedUserRole(userRole) && (
        <TabsContent className={TAB_PANEL_CLASS} value="management">
          <Suspense fallback={<TabContentLoader />}>
            <ManagementTabs
              advisors={advisors}
              vehicles={vehicles}
              storeCode={store.code}
              vehicleIssues={vehicleIssues}
              storeName={store.name}
              onAdvisorsUpdate={onAdvisorsUpdate}
              onVehiclesUpdate={onVehiclesUpdate}
              currentAdvisor={advisor}
              manualAwards={manualAwards}
              goals={goals}
              driveLogs={driveLogs}
              fsdOrders={fsdOrders}
            />
          </Suspense>
        </TabsContent>
      )}
    </>
  );
}
