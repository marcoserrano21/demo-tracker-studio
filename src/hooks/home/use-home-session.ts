'use client';

import { useEffect, useState } from 'react';
import { getSessionAccess } from '@/app/auth/actions';
import { invokeServerAction } from '@/lib/server-action-client';
import { stores as allStores } from '@/lib/data';
import type { Store, UserRole } from '@/lib/types';
import { DDHUB_KEYS, clearDdhubSession, getSessionItem } from '@/lib/auth/session-keys';

export function useHomeSession() {
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('advisor');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const serverSession = await invokeServerAction(getSessionAccess);
        const savedStoreCode = getSessionItem(DDHUB_KEYS.store);

        if (savedStoreCode && serverSession.storeCode === savedStoreCode) {
          const storeData = allStores.find((s) => s.code === savedStoreCode);
          if (storeData) {
            setCurrentStore(storeData as Store);
            setUserRole(serverSession.isManager ? 'manager' : 'advisor');
          }
        } else if (savedStoreCode && !serverSession.storeCode) {
          clearDdhubSession();
        }
      } catch (error) {
        console.error('[session] Failed to read server session:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { currentStore, setCurrentStore, userRole, setUserRole, isLoading };
}
