
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Vehicle, Advisor, UserRole, VehicleModel, DriveLog, VehicleStatus, SortKey, FleetView } from '@/lib/types';
import { Input } from './ui/input';
import { Search, Filter, X, LayoutGrid, View, LayoutList, RectangleHorizontal } from 'lucide-react';
import VehicleCardItem from './vehicle-card';
import VehicleListItem from './vehicle-list-item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { vehicleOptions, getExteriorColorsForVehicle, getInteriorColorsForVehicle, getWheelsForVehicle, normalizeTrim } from '@/lib/data';
import { cn } from '@/lib/utils';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Table, TableBody, TableHeader, TableRow, TableHead } from './ui/table';
import VehicleCarousel from './vehicle-carousel';
import { FleetAttentionStrip } from './fleet-attention-strip';
import { OverdueNudgeBanner } from './overdue-nudge-banner';
import { LowBatteryQueue } from './low-battery-queue';
import { isOverdueVehicle } from '@/lib/overdue';
import { EmptyState } from './empty-state';
import CheckoutSheet from './checkout-sheet';
import { Car } from 'lucide-react';

interface VehicleGridProps {
  vehicles: Vehicle[];
  advisors: Advisor[];
  currentAdvisor: Advisor;
  storeCode: string;
  userRole: UserRole;
  driveLogs: DriveLog[];
  onVehicleUpdate: (updatedVehicle: Partial<Vehicle> & { id: string }) => void;
  storeName: string;
  advisorName: string;
  isMobile: boolean | undefined;
  onNavigateTab?: (tab: string) => void;
}

const modelOrder: VehicleModel[] = ['Model S', 'Model 3', 'Model X', 'Model Y', 'Cybertruck', 'Roadster'];
const statusOptions: (VehicleStatus | 'All')[] = ['All', 'Available', 'On Demo', 'Charging', 'Scheduled', 'Needs Attention'];

type AttentionFilter = 'low-battery' | 'overdue' | 'Needs Attention' | null;

const trimOrder: Record<VehicleModel, string[]> = {
    'Model S': ['All-Wheel Drive', 'Plaid'],
    'Model 3': ['Rear-Wheel Drive', 'Premium Rear-Wheel Drive', 'Premium All-Wheel Drive', 'Performance'],
    'Model X': ['All-Wheel Drive', 'Plaid'],
    'Model Y': ['Rear-Wheel Drive', 'All-Wheel Drive', 'Premium Rear-Wheel Drive', 'Premium All-Wheel Drive', 'Performance', 'Premium Long Wheelbase'],
    'Cybertruck': ['Dual Motor All-Wheel Drive', 'Premium All-Wheel Drive', 'Cyberbeast'],
    'Roadster': ["Founder's Series"],
};

export default function VehicleGrid({ vehicles, advisors, currentAdvisor, storeCode, userRole, driveLogs, onVehicleUpdate, storeName, advisorName, isMobile, onNavigateTab }: VehicleGridProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'All'>('All');
    const [sortKey, setSortKey] = useState<SortKey>(currentAdvisor.defaultSortOrder || 'model');
    const [fleetView, setFleetView] = useState<FleetView>(currentAdvisor.fleetView || 'grid');

    const [trimFilter, setTrimFilter] = useState<string>('all');
    const [exteriorColorFilter, setExteriorColorFilter] = useState<string>('all');
    const [interiorColorFilter, setInteriorColorFilter] = useState<string>('all');
    const [wheelFilter, setWheelFilter] = useState<string>('all');
    const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>(null);
    const [chargeVehicle, setChargeVehicle] = useState<Vehicle | null>(null);
    
    const { firestore } = useFirebase();

    useEffect(() => {
        setSortKey(currentAdvisor.defaultSortOrder || 'model');
        setFleetView(currentAdvisor.fleetView || 'grid');
    }, [currentAdvisor]);


    const handleFleetViewChange = (view: FleetView) => {
        setFleetView(view);
        if (firestore) {
            const advisorRef = doc(firestore, `stores/${storeCode}/advisors/${currentAdvisor.id}`);
            updateDocumentNonBlocking(advisorRef, { fleetView: view });
        }
    };

    const filterOptions = useMemo(() => {
        const uniqueModelsInFleet = [...new Set(vehicles.map(v => v.model))];

        const trims = new Set<string>();
        const exteriorColors = new Set<string>();
        const interiorColors = new Set<string>();
        const wheels = new Set<string>();

        uniqueModelsInFleet.forEach(model => {
            vehicleOptions.trims[model]?.forEach(t => trims.add(t));
            if (model === 'Model 3' || model === 'Model Y') {
                vehicleOptions.trims[model]?.forEach(t => {
                    getExteriorColorsForVehicle(model, t).forEach(c => exteriorColors.add(c));
                    getInteriorColorsForVehicle(model, t).forEach(i => interiorColors.add(i));
                    getWheelsForVehicle(model, t).forEach(w => wheels.add(w));
                });
            } else {
                vehicleOptions.exteriorColors[model as keyof typeof vehicleOptions.exteriorColors]?.forEach(c => exteriorColors.add(c));
                vehicleOptions.interiorColors[model as keyof typeof vehicleOptions.interiorColors]?.forEach(i => interiorColors.add(i));
                vehicleOptions.wheels[model as keyof typeof vehicleOptions.wheels]?.forEach(w => wheels.add(w));
            }
        });

        return {
            trims: Array.from(trims).sort(),
            exteriorColors: Array.from(exteriorColors).sort(),
            interiorColors: Array.from(interiorColors).sort(),
            wheels: Array.from(wheels).sort(),
        };
    }, [vehicles]);

    const scheduledDemos = useMemo(() => {
        return driveLogs.filter(log => log.purpose === 'Scheduled' && !log.endTime);
    }, [driveLogs]);
    
    const hasAdvancedFilters = trimFilter !== 'all' || exteriorColorFilter !== 'all' || interiorColorFilter !== 'all' || wheelFilter !== 'all';
    const hasAnyFilter = searchTerm !== '' || statusFilter !== 'All' || hasAdvancedFilters || attentionFilter !== null;

    const resetFilters = () => {
        setSearchTerm('');
        setStatusFilter('All');
        setTrimFilter('all');
        setExteriorColorFilter('all');
        setInteriorColorFilter('all');
        setWheelFilter('all');
        setAttentionFilter(null);
    };

    const handleAttentionFilter = (id: 'low-battery' | 'overdue' | 'Needs Attention') => {
        setAttentionFilter((prev) => (prev === id ? null : id));
        if (id === 'Needs Attention') {
            setStatusFilter('Needs Attention');
        } else {
            setStatusFilter('All');
        }
    };

    const sortedAndFilteredVehicles = useMemo(() => {
        const filtered = vehicles
            .filter((vehicle) => {
                // Filter out sold vehicles from fleet page
                if (vehicle.sold) return false;
                
                const searchMatch =
                    vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    vehicle.vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (vehicle.trim && vehicle.trim.toLowerCase().includes(searchTerm.toLowerCase()));
                
                const statusMatch = statusFilter === 'All' || vehicle.status === statusFilter;
                const trimMatch = trimFilter === 'all' || normalizeTrim(vehicle.trim) === trimFilter || vehicle.trim === trimFilter;
                const exteriorColorMatch = exteriorColorFilter === 'all' || vehicle.exteriorColor === exteriorColorFilter;
                const interiorColorMatch = interiorColorFilter === 'all' || vehicle.interiorColor === interiorColorFilter;
                const wheelMatch = wheelFilter === 'all' || vehicle.wheelSize === wheelFilter;

                let attentionMatch = true;
                if (attentionFilter === 'low-battery') {
                    attentionMatch = vehicle.batteryLevel < 30;
                } else if (attentionFilter === 'overdue') {
                    attentionMatch = isOverdueVehicle(vehicle);
                } else if (attentionFilter === 'Needs Attention') {
                    attentionMatch = vehicle.status === 'Needs Attention';
                }

                return searchMatch && statusMatch && trimMatch && exteriorColorMatch && interiorColorMatch && wheelMatch && attentionMatch;
            });
        
        if (sortKey === 'date-added') {
            return filtered;
        }

        // Calculate popularity if needed
        if (sortKey === 'popularity') {
            const vehicleUsageCount = driveLogs.reduce((acc, log) => {
                const vehicleId = log.vehicleId;
                acc[vehicleId] = (acc[vehicleId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            return [...filtered].sort((a, b) => {
                const countA = vehicleUsageCount[a.id] || 0;
                const countB = vehicleUsageCount[b.id] || 0;
                return countB - countA;
            });
        }

        return filtered.sort((a, b) => {
                // Floor habit: Available first unless sorting purely by battery/popularity/date
                if (sortKey === 'model') {
                    const statusOrder: Record<string, number> = {
                        Available: 0,
                        Scheduled: 1,
                        'On Demo': 2,
                        Charging: 3,
                        'Needs Attention': 4,
                        Sold: 5,
                    };
                    const sa = statusOrder[a.status] ?? 99;
                    const sb = statusOrder[b.status] ?? 99;
                    if (sa !== sb) return sa - sb;
                }
                switch(sortKey) {
                    case 'battery-desc':
                        return b.batteryLevel - a.batteryLevel;
                    case 'battery-asc':
                        return a.batteryLevel - b.batteryLevel;
                    case 'model':
                    default:
                        const modelAIndex = modelOrder.indexOf(a.model);
                        const modelBIndex = modelOrder.indexOf(b.model);
                        if (modelAIndex !== modelBIndex) {
                            return modelAIndex - modelBIndex;
                        }
                        const trimAIndex = trimOrder[a.model]?.indexOf(normalizeTrim(a.trim)) ?? trimOrder[a.model]?.indexOf(a.trim) ?? -1;
                        const trimBIndex = trimOrder[b.model]?.indexOf(normalizeTrim(b.trim)) ?? trimOrder[b.model]?.indexOf(b.trim) ?? -1;
                        return trimAIndex - trimBIndex;
                }
            });
    }, [vehicles, searchTerm, statusFilter, sortKey, trimFilter, exteriorColorFilter, interiorColorFilter, wheelFilter, driveLogs, attentionFilter]);
    
    const gridUlClass = cn(
        "grid grid-cols-1 gap-4 sm:gap-6",
        { 'card-list blur-effect': currentAdvisor.cardHoverEffect === 'blur' && (fleetView === 'grid' || fleetView === 'compact') },
        fleetView === 'grid' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-1 lg:grid-cols-2'
    );

    const renderGrid = () => (
        <ul className={gridUlClass} key={`grid-${sortKey}`}>
            {sortedAndFilteredVehicles.map((vehicle, index) => (
                <li key={vehicle.id} className="animate-card-reveal" style={{ animationDelay: `${index * 50}ms` }}>
                    <VehicleCardItem
                        vehicle={vehicle}
                        advisors={advisors}
                        currentAdvisor={currentAdvisor}
                        storeCode={storeCode}
                        userRole={userRole}
                        scheduledDrives={scheduledDemos}
                        driveLogs={driveLogs}
                        priority={index < 3}
                        onVehicleUpdate={onVehicleUpdate}
                        isCompact={fleetView === 'compact'}
                    />
                </li>
            ))}
        </ul>
    );
    
    const renderList = () => (
        <div className="space-y-3" key={`list-${sortKey}`}>
          {sortedAndFilteredVehicles.map((vehicle, index) => (
            <VehicleListItem
              key={vehicle.id}
              vehicle={vehicle}
              advisors={advisors}
              currentAdvisor={currentAdvisor}
              storeCode={storeCode}
              userRole={userRole}
              driveLogs={driveLogs}
              scheduledDrives={scheduledDemos}
              onVehicleUpdate={onVehicleUpdate}
              className="animate-card-reveal"
              style={{ animationDelay: `${index * 50}ms` }}
            />
          ))}
        </div>
    );

    const renderCarousel = () => (
      <VehicleCarousel 
          vehicles={sortedAndFilteredVehicles}
          advisors={advisors}
          currentAdvisor={currentAdvisor}
          storeCode={storeCode}
          userRole={userRole}
          driveLogs={driveLogs}
          scheduledDrives={scheduledDemos}
          onVehicleUpdate={onVehicleUpdate}
      />
    );

    const renderContent = () => {
        if (sortedAndFilteredVehicles.length === 0) {
            return (
                <EmptyState
                    icon={Search}
                    title="No vehicles match your search"
                    description="Try adjusting filters or search terms. Clear filters to see the full floor, or search by VIN or model."
                    action={{
                        label: 'Clear filters',
                        onClick: resetFilters,
                    }}
                />
            );
        }
        
        switch (fleetView) {
            case 'list': return renderList();
            case 'carousel': return renderCarousel();
            case 'grid':
            case 'compact':
            default: return renderGrid();
        }
    }


    return (
        <div className="space-y-6">
            <div className="space-y-2 mb-6">
                 <div className="flex flex-col">
                    <div className="text-3xl font-bold tracking-tight">Find · {advisorName}</div>
                    <div className="text-muted-foreground">Floor availability for {storeName}. Available first - Start a demo in one tap.</div>
                </div>
            </div>
            <OverdueNudgeBanner
              vehicles={vehicles}
              onGoFinish={onNavigateTab ? () => onNavigateTab('finish') : undefined}
            />
            <LowBatteryQueue vehicles={vehicles} onCharge={(v) => setChargeVehicle(v)} />
            <FleetAttentionStrip
              vehicles={vehicles}
              activeFilter={attentionFilter}
              onFilterStatus={handleAttentionFilter}
            />
            {chargeVehicle && (
              <CheckoutSheet
                isOpen={!!chargeVehicle}
                setIsOpen={(open) => { if (!open) setChargeVehicle(null); }}
                vehicle={chargeVehicle}
                vehicles={vehicles}
                advisors={advisors}
                currentAdvisor={currentAdvisor}
                storeCode={storeCode}
                userRole={userRole}
                scheduledDrives={scheduledDemos}
                onVehicleUpdate={onVehicleUpdate}
                initialPurpose="Charging"
              />
            )}
            <div className="flex flex-col gap-3 md:flex-row md:gap-4 md:justify-between">
                <div className="flex items-center justify-between gap-2 md:hidden">
                    <span className="text-sm font-medium text-muted-foreground">Fleet view</span>
                    <div className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 p-0.5">
                        <Button variant={fleetView === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9" onClick={() => handleFleetViewChange('grid')} aria-label="Grid view"><LayoutGrid className="h-4 w-4" /></Button>
                        <Button variant={fleetView === 'compact' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9" onClick={() => handleFleetViewChange('compact')} aria-label="Compact view"><View className="h-4 w-4" /></Button>
                        <Button variant={fleetView === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9" onClick={() => handleFleetViewChange('list')} aria-label="List view"><LayoutList className="h-4 w-4" /></Button>
                        <Button variant={fleetView === 'carousel' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9" onClick={() => handleFleetViewChange('carousel')} aria-label="Carousel view"><RectangleHorizontal className="h-4 w-4" /></Button>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <div className="relative w-full sm:w-auto md:flex-1 md:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search by model, VIN..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                     <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as VehicleStatus | 'All')}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent>
                            {statusOptions.map(status => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="model">Sort by Model</SelectItem>
                            <SelectItem value="battery-desc">Sort by Battery (High to Low)</SelectItem>
                            <SelectItem value="battery-asc">Sort by Battery (Low to High)</SelectItem>
                            <SelectItem value="date-added">Sort by Date Added</SelectItem>
                            <SelectItem value="popularity">Sort by Popularity</SelectItem>
                        </SelectContent>
                    </Select>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto relative">
                                <Filter className="mr-2 h-4 w-4" />
                                Filters
                                {hasAdvancedFilters && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64" align="end">
                            <DropdownMenuLabel>Advanced Filters</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <div className="p-2 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Trim</label>
                                    <Select value={trimFilter} onValueChange={setTrimFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Filter by Trim" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Trims</SelectItem>
                                            {filterOptions.trims.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Exterior Color</label>
                                    <Select value={exteriorColorFilter} onValueChange={setExteriorColorFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Filter by Exterior" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Exterior Colors</SelectItem>
                                            {filterOptions.exteriorColors.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                     <label className="text-sm font-medium">Interior Color</label>
                                    <Select value={interiorColorFilter} onValueChange={setInteriorColorFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Filter by Interior" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Interior Colors</SelectItem>
                                            {filterOptions.interiorColors.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Wheels</label>
                                    <Select value={wheelFilter} onValueChange={setWheelFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Filter by Wheels" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Wheels</SelectItem>
                                            {filterOptions.wheels.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                     {hasAnyFilter && (
                        <Button variant="ghost" onClick={resetFilters}>
                            <X className="mr-2 h-4 w-4" />
                            Reset
                        </Button>
                    )}
                </div>
                <div className="hidden md:flex items-center gap-2">
                    <Button variant={fleetView === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleFleetViewChange('grid')} aria-label="Grid view"><LayoutGrid /></Button>
                    <Button variant={fleetView === 'compact' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleFleetViewChange('compact')} aria-label="Compact view"><View /></Button>
                    <Button variant={fleetView === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleFleetViewChange('list')} aria-label="List view"><LayoutList /></Button>
                    <Button variant={fleetView === 'carousel' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleFleetViewChange('carousel')} aria-label="Carousel view"><RectangleHorizontal /></Button>
                </div>
            </div>

            {renderContent()}

        </div>
    );
}
