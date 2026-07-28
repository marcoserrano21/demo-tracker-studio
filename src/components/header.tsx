
'use client';

import { useState } from 'react';
import type { Advisor, UserRole } from '@/lib/types';
import { Button } from './ui/button';
import { LogOut, ShieldCheck, Shield } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ManagerAuthDialog from './manager-auth-dialog';
import { ThemeToggle } from './theme-toggle';
import { canRequestManagerAccess } from '@/lib/demo-users';
import type { LucideIcon } from 'lucide-react';

interface HeaderProps {
  storeName: string;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  onStoreChange: () => void;
  storeCode: string;
  children: React.ReactNode;
  currentAdvisor: Advisor;
  /** Optional override when elevating (e.g. land on Morning Brief). */
  onManagerLoginSuccess?: () => void;
}

export default function Header({ storeName, userRole, setUserRole, onStoreChange, storeCode, children, currentAdvisor, onManagerLoginSuccess }: HeaderProps) {
  const [isAuthDialogOpen, setAuthDialogOpen] = useState(false);
  const allowManagerAccess = canRequestManagerAccess(currentAdvisor);

  const handleManagerLoginSuccess = () => {
    if (onManagerLoginSuccess) {
      onManagerLoginSuccess();
      setAuthDialogOpen(false);
      return;
    }
    setUserRole('manager');
    setAuthDialogOpen(false);
  };

  const handleSwitchToAdvisor = () => {
    setUserRole('advisor');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          {children}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-lg font-semibold px-2 sm:px-4">{storeName}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={onStoreChange}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Change Store</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center space-x-2">
            <ThemeToggle />
            {userRole === 'manager' ? (
                <Button variant="outline" size="sm" onClick={handleSwitchToAdvisor}>
                    <ShieldCheck className="mr-2 h-4 w-4 text-green-500" />
                    <span className="hidden sm:inline">Manager Mode</span>
                </Button>
            ) : allowManagerAccess ? (
                <Button variant="outline" size="sm" onClick={() => setAuthDialogOpen(true)}>
                    <Shield className="mr-2 h-4 w-4"/>
                    <span className="hidden sm:inline">Manager Access</span>
                </Button>
            ) : null}
        </div>
      </div>
      <ManagerAuthDialog 
        isOpen={isAuthDialogOpen}
        setIsOpen={setAuthDialogOpen}
        onSuccess={handleManagerLoginSuccess}
        storeCode={storeCode}
        currentAdvisor={currentAdvisor}
      />
    </header>
  );
}
