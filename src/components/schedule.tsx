

'use client';

import { useState, useMemo } from 'react';
import type { DriveLog, Vehicle, Advisor, UserRole, VehicleModel } from '@/lib/types';
import ScheduleTable from './schedule-table';
import ScheduleCalendar from './schedule-calendar';
import { Button } from './ui/button';
import { List, Calendar, PlusCircle, Filter, Search, SortAsc } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CalendarClock, Clock, Car } from 'lucide-react';
import CheckoutSheet from './checkout-sheet';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface ScheduleProps {
  driveLogs: DriveLog[];
  storeCode: string;
  vehicles: Vehicle[];
  advisors: Advisor[];
  currentAdvisor: Advisor;
  userRole: UserRole;
  onVehicleUpdate: (updatedVehicle: Partial<Vehicle> & { id: string }) => void;
  storeName: string;
}

const modelOrder: VehicleModel[] = ['Model S', 'Model 3', 'Model X', 'Model Y', 'Cybertruck', 'Roadster'];

export default function Schedule({ driveLogs, storeCode, vehicles, advisors, currentAdvisor, userRole, onVehicleUpdate, storeName }: ScheduleProps) {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');

  const availableVehiclesForScheduling = useMemo(() => {
    return vehicles
      .filter(v => v.status === 'Available' || v.status === 'Scheduled' || v.status === 'On Demo')
      .sort((a, b) => {
        const modelAIndex = modelOrder.indexOf(a.model);
        const modelBIndex = modelOrder.indexOf(b.model);
        if (modelAIndex !== modelBIndex) {
            return modelAIndex - modelBIndex;
        }
        return a.trim.localeCompare(b.trim);
      });
  }, [vehicles]);

  const filteredDriveLogs = useMemo(() => {
    let filtered = driveLogs;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(log => {
        // Check vehicle model from multiple sources
        const vehicleModel = log.vehicleModel || vehicles.find(v => v.id === log.vehicleId)?.model || '';
        // Check advisor name from multiple sources (use coPilot as main field)
        const advisorName = log.coPilot || log.advisorIn || '';
        
        return vehicleModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
               advisorName.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => {
        const vehicle = vehicles.find(v => v.id === log.vehicleId);
        return vehicle?.status === statusFilter;
      });
    }

    // Sort by popularity if selected
    if (sortBy === 'popularity') {
      // Calculate usage count for each vehicle
      const vehicleUsageCount = filtered.reduce((acc, log) => {
        const vehicleId = log.vehicleId;
        acc[vehicleId] = (acc[vehicleId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Sort by usage count (descending)
      filtered = [...filtered].sort((a, b) => {
        const countA = vehicleUsageCount[a.vehicleId] || 0;
        const countB = vehicleUsageCount[b.vehicleId] || 0;
        return countB - countA;
      });
    }

    return filtered;
  }, [driveLogs, searchQuery, statusFilter, vehicles, sortBy]);

  const stats = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    // Calculate week start (Sunday)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    // Calculate week end (Saturday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const getLogDate = (log: typeof driveLogs[0]) => {
      // For DriveLog interface, we only have startTime
      if (log.startTime) {
        return (log.startTime as any)?.toDate ? (log.startTime as any).toDate() : new Date(log.startTime as any);
      }
      return new Date();
    };
    
    // Only count scheduled drives that haven't ended
    const scheduledDrives = driveLogs.filter(log => log.purpose === 'Scheduled' && !log.endTime);
    
    const todayLogs = scheduledDrives.filter(log => {
      const logDate = getLogDate(log);
      return logDate >= todayStart && logDate <= todayEnd;
    });
    
    const thisWeekLogs = scheduledDrives.filter(log => {
      const logDate = getLogDate(log);
      return logDate >= weekStart && logDate <= weekEnd;
    });
    
    return {
      total: scheduledDrives.length,
      today: todayLogs.length,
      thisWeek: thisWeekLogs.length,
    };
  }, [driveLogs]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-6 space-y-8 max-w-full overflow-hidden">
        {/* Header Section with Stats */}
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-3">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Schedule
                </h1>
                <p className="text-muted-foreground text-sm lg:text-base">{storeName} drive management</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button 
                onClick={() => setCheckoutOpen(true)} 
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-6"
                size="lg"
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                Schedule Drive
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {/* Total Scheduled */}
            <div className="group relative overflow-hidden">
              <div className="relative p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-blue-500/8 via-blue-400/4 to-transparent rounded-xl sm:rounded-2xl border border-blue-500/20 transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                  </div>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
                    <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">Total Scheduled</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Today */}
            <div className="group relative overflow-hidden">
              <div className="relative p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-green-500/8 via-emerald-400/4 to-transparent rounded-xl sm:rounded-2xl border border-green-500/20 transition-all duration-300 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/10">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  </div>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-bold">{stats.today}</div>
                    <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">Today</div>
                  </div>
                </div>
              </div>
            </div>

            {/* This Week */}
            <div className="group relative overflow-hidden">
              <div className="relative p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-purple-500/8 via-violet-400/4 to-transparent rounded-xl sm:rounded-2xl border border-purple-500/20 transition-all duration-300 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Car className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                  </div>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-bold">{stats.thisWeek}</div>
                    <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">This Week</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls and View Toggle */}
          <Card className="border-border/50 bg-gradient-to-r from-card to-card/95 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-4xl">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search drives by vehicle or advisor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background/50 border-border/60 focus:border-primary/50 transition-all"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] bg-background/50 border-border/60">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="On Demo">On Demo</SelectItem>
                      <SelectItem value="Available">Available</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] bg-background/50 border-border/60">
                      <SortAsc className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date & Time</SelectItem>
                      <SelectItem value="vehicle">Vehicle Model</SelectItem>
                      <SelectItem value="advisor">Advisor</SelectItem>
                      <SelectItem value="popularity">Popularity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 p-1.5 rounded-xl bg-muted/50 border border-border/40 shadow-inner flex-shrink-0 w-full sm:w-auto">
                  <Button 
                    variant={view === 'list' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setView('list')} 
                    className={`flex-1 sm:flex-initial rounded-lg px-3 md:px-4 py-2 transition-all duration-200 font-medium whitespace-nowrap ${
                      view === 'list' 
                        ? 'bg-primary text-primary-foreground shadow-md border-0 hover:bg-primary/90' 
                        : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <List className="mr-1 md:mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">List View</span>
                    <span className="sm:hidden">List</span>
                  </Button>
                  <Button 
                    variant={view === 'calendar' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setView('calendar')} 
                    className={`flex-1 sm:flex-initial rounded-lg px-3 md:px-4 py-2 transition-all duration-200 font-medium whitespace-nowrap ${
                      view === 'calendar' 
                        ? 'bg-primary text-primary-foreground shadow-md border-0 hover:bg-primary/90' 
                        : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Calendar className="mr-1 md:mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Calendar View</span>
                    <span className="sm:hidden">Calendar</span>
                  </Button>
                </div>
              </div>

              {/* Active Filters */}
              {(searchQuery || statusFilter !== 'all') && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/40">
                  <p className="text-sm text-muted-foreground mr-2">Active filters:</p>
                  {searchQuery && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      Search: {searchQuery}
                    </Badge>
                  )}
                  {statusFilter !== 'all' && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      Status: {statusFilter}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content */}
        <div className="space-y-6">
          {filteredDriveLogs.length === 0 && driveLogs.length === 0 ? (
            <Card className="border-border/50 bg-gradient-to-br from-card to-muted/10">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-6 rounded-3xl bg-gradient-to-br from-muted/30 to-muted/10 border border-muted-foreground/20 mb-6">
                  <CalendarClock className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No Drives Scheduled</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Get started by scheduling your first demo drive. Click the button above to begin.
                </p>
                <Button onClick={() => setCheckoutOpen(true)} size="lg" className="rounded-xl">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Schedule First Drive
                </Button>
              </CardContent>
            </Card>
          ) : filteredDriveLogs.length === 0 ? (
            <Card className="border-border/50 bg-gradient-to-br from-card to-muted/10">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-2xl bg-muted/30 border border-muted-foreground/20 mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Results Found</h3>
                <p className="text-muted-foreground">Try adjusting your search criteria or filters.</p>
              </CardContent>
            </Card>
          ) : view === 'list' ? (
            <ScheduleTable 
              driveLogs={filteredDriveLogs} 
              storeCode={storeCode} 
              vehicles={vehicles}
              advisors={advisors}
              currentAdvisor={currentAdvisor}
              userRole={userRole}
              onVehicleUpdate={onVehicleUpdate}
              searchQuery={searchQuery}
              sortBy={sortBy}
            />
          ) : (
            <ScheduleCalendar 
              driveLogs={filteredDriveLogs}
              storeCode={storeCode} 
              vehicles={vehicles}
              advisors={advisors}
              currentAdvisor={currentAdvisor}
              userRole={userRole}
              onVehicleUpdate={onVehicleUpdate}
            />
          )}
        </div>

        {/* Checkout Sheet */}
        {isCheckoutOpen && (
          <CheckoutSheet
              isOpen={isCheckoutOpen}
              setIsOpen={setCheckoutOpen}
              vehicle={null}
              vehicles={availableVehiclesForScheduling}
              advisors={advisors}
              currentAdvisor={currentAdvisor}
              storeCode={storeCode}
              userRole={userRole}
              scheduledDrives={driveLogs.filter(log => log.purpose === 'Scheduled' && !log.endTime)}
              onVehicleUpdate={onVehicleUpdate}
          />
        )}
      </div>
    </div>
  );
}
