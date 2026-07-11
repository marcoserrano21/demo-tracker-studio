'use client';

import { useCallback, useEffect, Suspense } from 'react';
import type { Advisor, Store, UserRole, Vehicle } from '@/lib/types';
import { stores as allStores } from '@/lib/data';
import StoreSelector from '@/components/store-selector';
import Dashboard from '@/components/dashboard';
import AdvisorSelectorDialog from '@/components/advisor-selector-dialog';
import { DashboardLoadingSkeleton } from '@/components/dashboard/dashboard-loading-skeleton';
import { useFirebase } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { clearStoreSession, revokeManagerAccess } from '@/app/auth/actions';
import { DDHUB_KEYS, setSessionItem, clearDdhubSession } from '@/lib/auth/session-keys';
import { seedDemoStoreIfNeeded } from '@/lib/demo-seed';
import { useHomeSession } from '@/hooks/home/use-home-session';
import { useStoreData } from '@/hooks/home/use-store-data';
import { useAdvisorSession } from '@/hooks/home/use-advisor-session';
import { useAdvisorPreferences } from '@/hooks/home/use-advisor-preferences';
import { useDashboardPolicies } from '@/hooks/home/use-dashboard-policies';

function HomePageContent() {
  const { auth, user, isUserLoading, firestore } = useFirebase();
  const { currentStore, setCurrentStore, userRole, setUserRole, isLoading } = useHomeSession();

  const {
    advisors,
    setAdvisors,
    vehicles,
    setVehicles,
    driveLogs,
    areAdvisorsLoading,
    areVehiclesLoading,
    areDriveLogsLoading,
    isAdvisorsFallbackLoading,
    todaysScheduledDrivesCount,
  } = useStoreData(currentStore);

  const {
    currentAdvisor,
    setCurrentAdvisor,
    isAdvisorDialogOpen,
    setAdvisorDialogOpen,
    isSwitchingAdvisor,
    setIsSwitchingAdvisor,
  } = useAdvisorSession({ currentStore, advisors, areAdvisorsLoading });

  useAdvisorPreferences(currentAdvisor);

  useDashboardPolicies({
    vehicles,
    driveLogs,
    currentAdvisor,
    currentStore,
    userRole,
  });

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'http:' &&
      !window.location.hostname.includes('localhost')
    ) {
      window.location.protocol = 'https:';
    }
  }, []);

  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [isUserLoading, user, auth]);

  useEffect(() => {
    if (!firestore || !currentStore || !user) return;
    if (typeof window === 'undefined' || sessionStorage.getItem(DDHUB_KEYS.demoMode) !== 'true') return;

    let cancelled = false;
    void seedDemoStoreIfNeeded(firestore, currentStore.code).then(() => {
      if (!cancelled) {
        /* seeded */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [firestore, currentStore, user]);

  const handleStoreSelect = (storeCode: string) => {
    const storeData = allStores.find((s) => s.code === storeCode);
    if (!storeData) return;
    setCurrentStore(storeData as Store);
    setUserRole('advisor');
    setSessionItem(DDHUB_KEYS.store, storeCode);
    sessionStorage.removeItem('notified-overdue-vehicles');
  };

  const handleAdvisorSelect = (advisor: Advisor) => {
    setCurrentAdvisor(advisor);
    setSessionItem(DDHUB_KEYS.advisor, advisor.id);
    handleSetUserRole('advisor');
    setAdvisorDialogOpen(false);
    if (isSwitchingAdvisor) setIsSwitchingAdvisor(false);
  };

  const clearStore = () => {
    setCurrentStore(null);
    setCurrentAdvisor(null);
    setAdvisors([]);
    setVehicles([]);
    clearDdhubSession();
    void clearStoreSession();
    handleSetUserRole('advisor');
  };

  const handleSetUserRole = useCallback((role: UserRole) => {
    setUserRole(role);
    setSessionItem(DDHUB_KEYS.role, role);
    if (role === 'advisor') void revokeManagerAccess();
  }, [setUserRole]);

  const handleVehicleUpdate = useCallback(
    (updatedVehicle: Partial<Vehicle> & { id: string }) => {
      setVehicles((prev) =>
        prev.map((v) => (v.id === updatedVehicle.id ? { ...v, ...updatedVehicle } : v))
      );
    },
    [setVehicles]
  );

  const handleAdvisorUpdate = (updatedAdvisors: Advisor[]) => {
    setAdvisors(updatedAdvisors);
    if (currentAdvisor) {
      const updatedSelf = updatedAdvisors.find((a) => a.id === currentAdvisor.id);
      if (updatedSelf) setCurrentAdvisor(updatedSelf);
    }
  };

  const pageIsLoading =
    isLoading ||
    isUserLoading ||
    (currentStore && (areAdvisorsLoading || areVehiclesLoading || !currentAdvisor));

  if (pageIsLoading) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <main id="main-content" className="min-h-screen bg-background">
      {!currentStore ? (
        <StoreSelector onStoreSelect={handleStoreSelect} />
      ) : !currentAdvisor ? (
        <AdvisorSelectorDialog
          isOpen
          advisors={advisors}
          onAdvisorSelect={handleAdvisorSelect}
          onBack={clearStore}
          isLoading={areAdvisorsLoading && !isAdvisorsFallbackLoading && advisors.length === 0}
          storeCode={currentStore.code}
        />
      ) : (
        <>
          <Dashboard
            store={currentStore}
            advisor={currentAdvisor}
            vehicles={vehicles}
            advisors={advisors}
            driveLogs={driveLogs ?? []}
            driveLogsLoading={areDriveLogsLoading}
            userRole={userRole}
            setUserRole={handleSetUserRole}
            onStoreChange={clearStore}
            onVehicleUpdate={handleVehicleUpdate}
            onSwitchAdvisor={() => {
              setIsSwitchingAdvisor(true);
              setAdvisorDialogOpen(true);
            }}
            todaysScheduledDrivesCount={todaysScheduledDrivesCount}
            onAdvisorsUpdate={handleAdvisorUpdate}
            onVehiclesUpdate={setVehicles}
          />
          <AdvisorSelectorDialog
            isOpen={isAdvisorDialogOpen}
            advisors={advisors}
            onAdvisorSelect={handleAdvisorSelect}
            onBack={clearStore}
            allowClose={!isSwitchingAdvisor && !!currentAdvisor}
            onClose={() => {
              setAdvisorDialogOpen(false);
              if (isSwitchingAdvisor) setIsSwitchingAdvisor(false);
            }}
          />
        </>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<DashboardLoadingSkeleton />}>
      <HomePageContent />
    </Suspense>
  );
}
