'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Advisor, Store } from '@/lib/types';
import { DDHUB_KEYS, getSessionItem, removeSessionItem, setSessionItem } from '@/lib/auth/session-keys';

export function useAdvisorSession({
  currentStore,
  advisors,
  areAdvisorsLoading,
}: {
  currentStore: Store | null;
  advisors: Advisor[];
  areAdvisorsLoading: boolean;
}) {
  const [currentAdvisor, setCurrentAdvisor] = useState<Advisor | null>(null);
  const [isAdvisorDialogOpen, setAdvisorDialogOpen] = useState(false);
  const [isSwitchingAdvisor, setIsSwitchingAdvisor] = useState(false);

  const managerAsAdvisor = useMemo(() => {
    if (!currentStore) return null;
    return {
      id: 'no-advisor',
      name: 'Store Manager',
      email: '',
      storeId: currentStore.code,
    } as Advisor;
  }, [currentStore]);

  useEffect(() => {
    if (!currentStore || areAdvisorsLoading || !managerAsAdvisor) return;

    if (advisors.length > 0) {
      const savedAdvisorId = getSessionItem(DDHUB_KEYS.advisor);
      if (isSwitchingAdvisor) {
        setAdvisorDialogOpen(true);
      } else if (savedAdvisorId) {
        const advisor = advisors.find((a) => a.id === savedAdvisorId);
        if (advisor) {
          setCurrentAdvisor((prev) =>
            prev && JSON.stringify(prev) === JSON.stringify(advisor) ? prev : advisor
          );
        } else {
          removeSessionItem(DDHUB_KEYS.advisor);
          setAdvisorDialogOpen(true);
        }
      } else if (getSessionItem(DDHUB_KEYS.demoMode) === 'true') {
        const demoAdvisor = advisors.find((a) => a.name === 'Marco Serrano') ?? advisors[0];
        setCurrentAdvisor(demoAdvisor);
        setSessionItem(DDHUB_KEYS.advisor, demoAdvisor.id);
      } else {
        setAdvisorDialogOpen(true);
      }
    } else if (currentAdvisor?.id !== 'no-advisor') {
      setCurrentAdvisor(managerAsAdvisor);
    }
  }, [
    advisors,
    currentStore,
    areAdvisorsLoading,
    isSwitchingAdvisor,
    currentAdvisor,
    managerAsAdvisor,
  ]);

  return {
    currentAdvisor,
    setCurrentAdvisor,
    isAdvisorDialogOpen,
    setAdvisorDialogOpen,
    isSwitchingAdvisor,
    setIsSwitchingAdvisor,
  };
}
