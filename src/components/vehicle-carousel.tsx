

'use client';

import React, { useMemo, useState } from 'react';
import type { Vehicle, Advisor, UserRole, DriveLog, VehicleModel } from '@/lib/types';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import VehicleCardItem from './vehicle-card';
import { cn } from '@/lib/utils';
import { Label } from './ui/label';
import { Switch } from './ui/switch';

interface VehicleCarouselProps {
    vehicles: Vehicle[];
    advisors: Advisor[];
    currentAdvisor: Advisor;
    storeCode: string;
    userRole: UserRole;
    driveLogs: DriveLog[];
    scheduledDrives: DriveLog[];
    onVehicleUpdate: (updatedVehicle: Partial<Vehicle> & { id: string }) => void;
}

const modelOrder: VehicleModel[] = ['Model S', 'Model 3', 'Model X', 'Model Y', 'Cybertruck', 'Roadster'];

export default function VehicleCarousel({ 
    vehicles, 
    advisors,
    currentAdvisor,
    storeCode,
    userRole,
    driveLogs,
    scheduledDrives,
    onVehicleUpdate
}: VehicleCarouselProps) {
  
  const [showDetails, setShowDetails] = useState(true);

  const vehiclesByModel = useMemo(() => {
    const grouped: Record<string, Vehicle[]> = {};

    modelOrder.forEach(model => {
        grouped[model] = [];
    });
    
    vehicles.forEach(vehicle => {
      if (grouped[vehicle.model]) {
        grouped[vehicle.model].push(vehicle);
      }
    });

    return modelOrder
      .map(model => ({ model, vehicles: grouped[model] }))
      .filter(group => group.vehicles && group.vehicles.length > 0);

  }, [vehicles]);
  
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex justify-end items-center gap-2">
        <Switch 
          id="show-details-toggle" 
          checked={showDetails} 
          onCheckedChange={setShowDetails}
        />
        <Label htmlFor="show-details-toggle">Show Details</Label>
      </div>

      {vehiclesByModel.map(({ model, vehicles: modelVehicles }) => (
        <div key={model} className="w-full min-w-0">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-3 md:mb-4">{model}</h2>
          <Carousel 
            opts={{ align: "start" }} 
            className={cn(
              "w-full vehicle-carousel overflow-visible carousel-glow-container",
              { 'card-list blur-effect': currentAdvisor.cardHoverEffect === 'blur' },
            )}
          >
            <CarouselContent className="-ml-3 md:-ml-6 px-1 md:px-2">
              {modelVehicles.map((vehicle, index) => (
                <CarouselItem key={`${vehicle.id}-${showDetails}`} className="pl-3 md:pl-6 basis-full sm:basis-1/2 md:basis-1/2 lg:basis-1/3 xl:basis-1/4 animate-card-reveal carousel-item-parent">
                  <div className="p-2 md:p-3 h-full">
                    <VehicleCardItem
                      vehicle={vehicle}
                      advisors={advisors}
                      currentAdvisor={currentAdvisor}
                      storeCode={storeCode}
                      userRole={userRole}
                      scheduledDrives={scheduledDrives}
                      driveLogs={driveLogs}
                      priority={index < 3}
                      onVehicleUpdate={onVehicleUpdate}
                      isCompact={false} 
                      isCarousel={true}
                      showCarouselDetails={showDetails}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {/* Enhanced responsive arrows - show on small screens when 2+ vehicles, on medium+ when 3+ vehicles */}
            <div className={cn(
                "justify-center items-center gap-3 md:gap-4 mt-3 md:mt-4 flex",
                modelVehicles.length <= 1 && "hidden",
                modelVehicles.length > 1 && "sm:flex",
                modelVehicles.length <= 2 && "md:hidden lg:hidden xl:hidden",
                modelVehicles.length > 2 && "md:flex"
            )}>
                <CarouselPrevious className="relative static translate-y-0" />
                <CarouselNext className="relative static translate-y-0" />
            </div>
          </Carousel>
        </div>
      ))}
    </div>
  );
}
