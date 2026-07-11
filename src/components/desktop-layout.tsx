

'use client';

import React, { useState, Suspense } from 'react';
import type { Advisor } from '@/lib/types';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, useSidebar, SidebarGroup, SidebarGroupLabel, SidebarSeparator, SidebarInset } from '@/components/ui/sidebar';
import { Tabs } from '@/components/ui/tabs';
import { useSearchParams } from 'next/navigation';
import { Settings, LogOut, ShieldCheck, Shield, UserCog, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { PRIMARY_DASHBOARD_TABS } from '@/lib/dashboard-tabs';
import { HubLogo } from './hub-logo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import ManagerAuthDialog from './manager-auth-dialog';
import RedirectingLoader from './redirecting-loader';
import Footer from './footer';
import { DemoBanner } from './demo-banner';
import { TabContentLoader } from './dashboard/tab-content-loader';
import { CONFIRMATION_DETAILS, type ConfirmationAction } from './dashboard/confirmation-details';
import { DashboardTabPanels } from './dashboard/dashboard-tab-panels';
import type { DashboardLayoutProps } from './dashboard/dashboard-shell-types';
import { useDashboardShell } from '@/hooks/dashboard/use-dashboard-shell';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { canRequestManagerAccess } from '@/lib/demo-users';

const DesktopSidebarTrigger = () => {
    const { state, toggleSidebar } = useSidebar();
    return (
        <Button variant="ghost" onClick={toggleSidebar} className="hidden md:flex items-center gap-2">
            {state === 'expanded' ? <PanelLeftClose /> : <PanelLeftOpen />}
            {state === 'expanded' ? <span>Collapse</span> : <span>Expand</span>}
        </Button>
    )
}

const DynamicSidebarLogo = () => {
    const { state } = useSidebar();
    return <HubLogo expanded={state === 'expanded'} />;
}

function DesktopLayoutContent(props: DashboardLayoutProps) {
  const {
    store,
    advisor,
    vehicles,
    advisors,
    driveLogs,
    driveLogsLoading = false,
    userRole,
    setUserRole,
    onStoreChange,
    onVehicleUpdate,
    onSwitchAdvisor,
    todaysScheduledDrivesCount,
    onAdvisorsUpdate,
    onVehiclesUpdate,
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

  const primaryTabs = PRIMARY_DASHBOARD_TABS;
  const allowManagerAccess = canRequestManagerAccess(advisor);

  const handleManagerLoginSuccess = () => {
    setUserRole('manager');
    setAuthDialogOpen(false);
  };

  const handleSwitchToAdvisor = () => {
    setUserRole('advisor');
  };

  const handleConfirmation = () => {
    if (!confirmationAction) return;
    if (confirmationAction === 'switchAdvisor') onSwitchAdvisor();
    if (confirmationAction === 'changeStore' || confirmationAction === 'logout') onStoreChange();
    setConfirmationAction(null);
  };

  const renderContent = () => (
    <Tabs
      defaultValue={initialTab}
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
      />
    </Tabs>
  );

  return (
    <>
      <Sidebar>
        <SidebarHeader className="p-0 border-b border-sidebar-border/50">
          <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="relative flex items-center justify-center h-16 bg-gradient-to-r from-primary/[0.08] via-primary/[0.06] to-primary/[0.08] backdrop-blur-sm overflow-hidden transition-all duration-300 hover:from-primary/[0.12] hover:via-primary/[0.08] hover:to-primary/[0.12] group">
                        <div className="relative z-10">
                            <DynamicSidebarLogo />
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="right" align="center" className="font-medium">
                    <p>{store.name}</p>
                </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </SidebarHeader>
        <SidebarContent className="px-2 overflow-hidden flex flex-col">
            <SidebarGroup className="py-0 flex-shrink-0">
                <SidebarGroupLabel className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider bg-sidebar-accent/30 rounded-lg mb-1 border border-sidebar-border/30">Navigation</SidebarGroupLabel>
                <SidebarMenu className="space-y-0.5 min-h-0">
                    {primaryTabs.map(tab => (
                        <SidebarMenuItem key={tab.value}>
                            <SidebarMenuButton 
                                onClick={() => shell.handleTabChange(tab.value)}
                                isActive={shell.activeTab === tab.value}
                                tooltip={tab.label}
                                className={cn(
                                    "group relative transition-all duration-300 rounded-xl pl-1.5",
                                    "hover:bg-gradient-to-r hover:from-primary/10 hover:via-primary/8 hover:to-primary/10",
                                    "hover:shadow-lg hover:shadow-primary/10 hover:border-primary/20",
                                    "active:scale-[0.98] active:transition-transform active:duration-150",
                                    shell.activeTab === tab.value && "bg-gradient-to-r from-primary/15 to-primary/8 shadow-lg shadow-primary/20 border border-primary/30 text-sidebar-accent-foreground"
                                )}
                                icon={React.createElement(tab.icon, { 
                                    className: cn(
                                        "transition-all duration-300",
                                        shell.activeTab === tab.value && "text-primary scale-105"
                                    )
                                })}
                            >
                                <div className="flex justify-between w-full items-center">
                                    <span className="transition-all duration-300">{tab.label}</span>
                                     {tab.value === 'schedule' && todaysScheduledDrivesCount > 0 && (
                                        <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs ml-2 bg-primary/20 text-primary border border-primary/30 pulse-animation">{todaysScheduledDrivesCount}</Badge>
                                    )}
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroup>
            
            <div className="mt-2 flex-shrink-0">
                <SidebarSeparator className="mb-2 bg-gradient-to-r from-transparent via-sidebar-border to-transparent"/>
                <SidebarGroup className="py-0">
                    <SidebarGroupLabel className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider bg-sidebar-accent/30 rounded-lg mb-1 border border-sidebar-border/30">Workspace</SidebarGroupLabel>
                    <SidebarMenu className="space-y-0.5 min-h-0">
                        {userRole === 'manager' ? (
                            <SidebarMenuItem>
                                <SidebarMenuButton 
                                    onClick={handleSwitchToAdvisor} 
                                    tooltip="Switch to Advisor View" 
                                    className="group transition-all duration-300 rounded-xl hover:bg-gradient-to-r hover:from-amber-500/10 hover:via-amber-500/8 hover:to-amber-500/10 hover:shadow-lg hover:shadow-amber-500/10 active:scale-[0.98] pl-1.5"
                                    icon={React.createElement(Shield, { className: "transition-all duration-300 group-hover:text-amber-500" })}
                                >
                                    Switch to Advisor
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ) : allowManagerAccess ? (
                            <SidebarMenuItem>
                                <SidebarMenuButton 
                                    onClick={() => setAuthDialogOpen(true)} 
                                    tooltip="Manager Access" 
                                    className="group transition-all duration-300 rounded-xl hover:bg-gradient-to-r hover:from-emerald-500/10 hover:via-emerald-500/8 hover:to-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/10 active:scale-[0.98] pl-1.5"
                                    icon={React.createElement(ShieldCheck, { className: "transition-all duration-300 group-hover:text-emerald-500" })}
                                >
                                    Manager Access
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ) : null}
                        {userRole === 'manager' && (
                            <SidebarMenuItem>
                                <SidebarMenuButton 
                                    onClick={() => shell.handleTabChange('management')} 
                                    isActive={shell.activeTab === 'management'} 
                                    tooltip="Management" 
                                    className={cn(
                                        "group relative transition-all duration-300 rounded-xl pl-1.5",
                                        "hover:bg-gradient-to-r hover:from-purple-500/10 hover:via-purple-500/8 hover:to-purple-500/10",
                                        "hover:shadow-lg hover:shadow-purple-500/10 active:scale-[0.98]",
                                        shell.activeTab === 'management' && "bg-gradient-to-r from-purple-500/15 to-purple-500/8 shadow-lg shadow-purple-500/20 border border-purple-500/30"
                                    )}
                                    icon={React.createElement(UserCog, { 
                                        className: cn(
                                            "transition-all duration-300",
                                            shell.activeTab === 'management' ? "text-purple-500 scale-105" : "group-hover:text-purple-500"
                                        )
                                    })}
                                >
                                    Management
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )}
                        <SidebarMenuItem>
                           <SidebarMenuButton 
                                onClick={() => shell.handleTabChange('settings')} 
                                isActive={shell.activeTab === 'settings'} 
                                tooltip="Settings" 
                                className={cn(
                                    "group relative transition-all duration-300 rounded-xl pl-1.5",
                                    "hover:bg-gradient-to-r hover:from-cyan-500/10 hover:via-cyan-500/8 hover:to-cyan-500/10",
                                    "hover:shadow-lg hover:shadow-cyan-500/10 active:scale-[0.98]",
                                    shell.activeTab === 'settings' && "bg-gradient-to-r from-cyan-500/15 to-cyan-500/8 shadow-lg shadow-cyan-500/20 border border-cyan-500/30"
                                )}
                                icon={React.createElement(Settings, { 
                                    className: cn(
                                        "transition-all duration-300",
                                        shell.activeTab === 'settings' ? "text-cyan-500 scale-105" : "group-hover:text-cyan-500"
                                    )
                                })}
                            >
                                Settings
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </div>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border/50 mt-auto">
            <div className="mt-1 mb-2">
                <SidebarSeparator className="bg-gradient-to-r from-transparent via-sidebar-border to-transparent mb-2"/>
            </div>
            <SidebarMenu className="footer-menu space-y-1">
                 <SidebarMenuItem>
                    <DropdownMenu>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <SidebarMenuButton
                                tooltip={advisor ? advisor.name : ''}
                                className="group relative h-auto py-3 px-3 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-primary/10 hover:via-primary/8 hover:to-primary/10 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/20 active:scale-[0.98] active:transition-transform active:duration-150 bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5 border border-primary/20 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center"
                                icon={
                                    <Avatar className="h-10 w-10 ring-2 ring-primary/20 transition-all duration-300 group-hover:ring-primary/30 ml-2 group-data-[collapsible=icon]:ml-0">
                                        <AvatarImage src={advisor?.avatarUrl} className="object-cover object-center" />
                                        <AvatarFallback className="text-sm bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
                                            {advisor ? advisor.name.split(' ').map(n => n[0]).join('') : ''}
                                        </AvatarFallback>
                                    </Avatar>
                                }
                              >
                                <div className="flex flex-col items-start min-w-0 ml-2 flex-1 overflow-hidden">
                                  {advisor && <span className="text-sm font-semibold text-sidebar-foreground truncate w-full block">{advisor.name}</span>}
                                  <span className="text-xs text-sidebar-foreground/60 capitalize font-medium">
                                    {advisor?.role || 'advisor'}
                                  </span>
                                  {advisor && <span className="text-xs text-sidebar-foreground/60 font-normal truncate w-full block" title={advisor.email}>{advisor.email}</span>}
                                </div>
                              </SidebarMenuButton>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                           {advisor && (
                            <TooltipContent side="right" align="center" className="font-medium">
                              <p>{advisor.name}</p>
                              <p className="text-xs text-muted-foreground">{advisor?.role || 'advisor'}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                      <DropdownMenuContent side="right" align="end" className="w-48">
                        <DropdownMenuItem 
                            onClick={() => setConfirmationAction('switchAdvisor')} 
                            className="group transition-all duration-300 rounded-xl hover:bg-gradient-to-r hover:from-blue-500/10 hover:via-blue-500/8 hover:to-blue-500/10 hover:shadow-lg hover:shadow-blue-500/10 active:scale-[0.98] py-3"
                        >
                          <UserCog className="mr-3 h-4 w-4 transition-all duration-300 group-hover:text-blue-500" />
                          <span>Switch Advisor</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <SidebarMenuButton 
                        onClick={() => setConfirmationAction('logout')} 
                        tooltip="Logout" 
                        className="group relative transition-all duration-300 rounded-xl font-medium pl-1.5 py-3 px-3 hover:bg-gradient-to-r hover:from-red-500/10 hover:via-red-500/8 hover:to-red-500/10 hover:shadow-lg hover:shadow-red-500/10 hover:border-red-500/20 active:scale-[0.98] active:transition-transform active:duration-150 bg-gradient-to-r from-red-500/5 via-red-500/3 to-red-500/5 border border-red-500/20 text-red-500"
                        icon={React.createElement(LogOut, { 
                            className: "transition-all duration-300 text-red-500 group-hover:scale-105"
                        })}
                    >
                        <span className="font-medium transition-all duration-300">Logout</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <DemoBanner />
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm">
            <div className="flex items-center gap-2">
                <DesktopSidebarTrigger />
            </div>
            <ThemeToggle storeCode={store.code} />
        </header>
        <main className="flex-grow p-2 sm:p-4 md:p-8">
            {shell.isRedirecting && <RedirectingLoader />}
            <div className={shell.isRedirecting ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
              {renderContent()}
            </div>
        </main>
        <Footer />
      </SidebarInset>
      <ManagerAuthDialog 
        isOpen={isAuthDialogOpen}
        setIsOpen={setAuthDialogOpen}
        onSuccess={handleManagerLoginSuccess}
        storeCode={store.code}
        currentAdvisor={advisor}
      />
       <AlertDialog open={!!confirmationAction} onOpenChange={() => setConfirmationAction(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{confirmationAction ? CONFIRMATION_DETAILS[confirmationAction].title : ''}</AlertDialogTitle>
                <AlertDialogDescription>
                    {confirmationAction ? CONFIRMATION_DETAILS[confirmationAction].description : ''}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmationAction(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmation}>
                    Continue
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function DesktopLayout(props: DashboardLayoutProps) {
    return (
        <Suspense fallback={<TabContentLoader />}>
            <SidebarProvider>
                <DesktopLayoutContent {...props} />
            </SidebarProvider>
        </Suspense>
    )
}
