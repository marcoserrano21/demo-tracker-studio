

'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from './ui/button';
import type { UserRole } from '@/lib/types';
import { HubLogo } from './hub-logo';
import { Car, History, BarChart, Calendar, Settings, Users, LogOut, Trophy, User, Cog, Bell, Shield, ShieldCheck, UserCog } from 'lucide-react';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';

interface Tab {
  value: string;
  label: string;
  icon: string;
}

interface HamburgerMenuProps {
  primaryTabs: Tab[];
  secondaryTabs: Tab[];
  userRole: UserRole;
  activeTab: string;
  handleTabChange: (tab: string) => void;
  onStoreChange: () => void;
  onSwitchAdvisor: () => void;
  onManagerClick: () => void;
  onSwitchToAdvisor: () => void;
  todaysScheduledDrivesCount: number;
  allowManagerAccess?: boolean;
}

const ICONS: { [key: string]: React.ElementType } = {
    Car,
    History,
    BarChart,
    Calendar,
    Trophy,
    User,
    Cog,
    Settings,
    Bell,
    Shield,
    ShieldCheck,
    UserCog
};

export function HamburgerMenu({ 
    primaryTabs, 
    secondaryTabs,
    userRole,
    activeTab, 
    handleTabChange, 
    onStoreChange, 
    onSwitchAdvisor,
    onManagerClick,
    onSwitchToAdvisor,
    todaysScheduledDrivesCount,
    allowManagerAccess = true,
}: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const onTabClick = (tab: string) => {
    handleTabChange(tab);
    setIsOpen(false);
  };
  
  const createMenuButton = (tab: Tab) => {
    const Icon = ICONS[tab.icon];
    const isActive = activeTab === tab.value;
    
    return (
      <Button
        key={tab.value}
        variant="ghost"
        className={`w-full justify-start transition-all duration-300 rounded-xl font-medium ${
          isActive 
            ? "bg-gradient-to-r from-primary/15 to-primary/8 shadow-lg shadow-primary/20 border border-primary/30 text-sidebar-accent-foreground" 
            : "hover:bg-gradient-to-r hover:from-primary/10 hover:via-primary/8 hover:to-primary/10 hover:shadow-lg hover:shadow-primary/10"
        }`}
        onClick={() => onTabClick(tab.value)}
      >
        <div className="flex justify-between w-full items-center">
          <div className="flex items-center">
            <Icon className={`mr-3 h-4 w-4 transition-all duration-300 ${
              isActive ? "text-primary scale-105" : "group-hover:text-primary"
            }`} />
            <span className="transition-all duration-300">{tab.label}</span>
          </div>
          {tab.value === 'schedule' && todaysScheduledDrivesCount > 0 && (
            <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs ml-2 bg-primary/20 text-primary border border-primary/30 pulse-animation">{todaysScheduledDrivesCount}</Badge>
          )}
        </div>
      </Button>
    );
  };

  return (
    <div>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button className="burger flex h-14 w-14 items-center justify-center rounded-md p-2 transition-all group">
            <div className="burger-strip strip">
              <div />
              <div />
              <div />
            </div>
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0 flex flex-col top-16 h-auto rounded-b-lg border-l border-border/40 backdrop-blur-md bg-background/95">
          <SheetHeader className='p-4 border-b border-border/40 bg-gradient-to-r from-primary/5 via-transparent to-primary/5'>
             <SheetTitle className='flex items-center gap-3'>
                <HubLogo />
            </SheetTitle>
          </SheetHeader>
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            <nav className="flex flex-col space-y-1">
              <p className="px-3 py-1.5 text-xs font-semibold text-foreground/60 uppercase tracking-wider bg-accent/30 rounded-lg mb-2 border border-border/30">Navigation</p>
              {primaryTabs.map(createMenuButton)}
            </nav>
            <div className="my-3">
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent"/>
            </div>
            <nav className="flex flex-col space-y-1">
              <p className="px-3 py-1.5 text-xs font-semibold text-foreground/60 uppercase tracking-wider bg-gradient-to-r from-accent/40 via-accent/30 to-accent/40 rounded-lg mb-2 border border-border/30">
                Workspace
              </p>
              {userRole === 'manager' ? (
                 <Button 
                   variant="ghost" 
                   className="justify-start w-full transition-all duration-300 rounded-xl hover:bg-gradient-to-r hover:from-green-500/10 hover:via-green-500/8 hover:to-green-500/10 hover:shadow-lg hover:shadow-green-500/10" 
                   onClick={() => { onSwitchToAdvisor(); setIsOpen(false); }}
                 >
                    <div className="flex items-center">
                      <Shield className="mr-3 h-4 w-4 transition-all duration-300 group-hover:text-green-500" />
                      <span className="transition-all duration-300">Switch to Advisor</span>
                    </div>
                 </Button>
              ) : allowManagerAccess ? (
                 <Button 
                   variant="ghost" 
                   className="justify-start w-full transition-all duration-300 rounded-xl hover:bg-gradient-to-r hover:from-blue-500/10 hover:via-blue-500/8 hover:to-blue-500/10 hover:shadow-lg hover:shadow-blue-500/10" 
                   onClick={() => { onManagerClick(); setIsOpen(false); }}
                 >
                    <div className="flex items-center">
                      <ShieldCheck className="mr-3 h-4 w-4 transition-all duration-300 group-hover:text-blue-500" />
                      <span className="transition-all duration-300">Manager Access</span>
                    </div>
                 </Button>
              ) : null}
              <div className="my-1">
                <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent"/>
              </div>
              {secondaryTabs.map(createMenuButton)}
            </nav>
          </div>
          <SheetFooter className='p-4 border-t border-border/40 mt-auto bg-gradient-to-r from-accent/20 via-transparent to-accent/20'>
            <div className="w-full flex flex-col space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start transition-all duration-300 rounded-xl border-border/40 hover:border-border/60 hover:bg-accent/40" 
                onClick={() => { setIsOpen(false); onSwitchAdvisor(); }}
              >
                <Users className="mr-3 h-4 w-4" />
                Switch Advisor
              </Button>
               <Button 
                 variant="outline" 
                 className="w-full justify-start transition-all duration-300 rounded-xl border-border/40 hover:border-border/60 hover:bg-accent/40 no-underline hover:no-underline" 
                 onClick={() => { setIsOpen(false); onStoreChange(); }}
               >
                <LogOut className="mr-3 h-4 w-4" />
                Logout
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
