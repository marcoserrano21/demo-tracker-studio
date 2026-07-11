
'use client';

import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Vehicle, VehicleModel, SeatConfiguration } from '@/lib/types';
import {
  modelImages,
  vehicleOptions,
  getVehicleImage,
  getWheelsForVehicle,
  getExteriorColorsForVehicle,
  getInteriorColorsForVehicle,
  getSeatsForVehicle,
  normalizeTrim,
  getSeatDisplayLabel,
} from '@/lib/data';
import { useEffect, useMemo } from 'react';

const vehicleSchema = z.object({
  model: z.enum(['Model S', 'Model 3', 'Model X', 'Model Y', 'Cybertruck', 'Roadster']),
  trim: z.string().min(1, 'Trim is required'),
  vin: z.string().min(5, 'VIN must be at least 5 characters').max(17, 'VIN must be at most 17 characters'),
  exteriorColor: z.string().min(1, 'Exterior color is required'),
  interiorColor: z.string().min(1, 'Interior color is required'),
  wheelSize: z.string().min(1, 'Wheel size is required'),
  seats: z.enum(['4-seater', '5-seater', '6-seater', '7-seater']),
  batteryLevel: z.coerce.number().min(0).max(100),
  licensePlate: z.string().max(12).optional().or(z.literal('')),
});

interface VehicleFormProps {
  vehicle: Vehicle | null;
  onSubmit: (data: Vehicle) => void;
  onCancel: () => void;
  storeCode?: string;
}

function getExteriorOptions(model: VehicleModel, trim: string): string[] {
  if (model === 'Model 3' || model === 'Model Y') {
    return getExteriorColorsForVehicle(model, trim);
  }
  return vehicleOptions.exteriorColors[model as keyof typeof vehicleOptions.exteriorColors] ?? [];
}

function getInteriorOptions(model: VehicleModel, trim: string): string[] {
  if (model === 'Model 3' || model === 'Model Y' || model === 'Cybertruck') {
    return getInteriorColorsForVehicle(model, trim);
  }
  return vehicleOptions.interiorColors[model as keyof typeof vehicleOptions.interiorColors] ?? [];
}

function getWheelOptions(model: VehicleModel, trim: string): string[] {
  if (model === 'Model 3' || model === 'Model Y' || model === 'Cybertruck') {
    return getWheelsForVehicle(model, trim);
  }
  return vehicleOptions.wheels[model as keyof typeof vehicleOptions.wheels] ?? [];
}

function getSeatOptions(model: VehicleModel, trim: string): SeatConfiguration[] {
  if (model === 'Model 3' || model === 'Model Y') {
    return getSeatsForVehicle(model, trim);
  }
  const defaults: Record<VehicleModel, SeatConfiguration[]> = {
    'Model S': ['5-seater'],
    'Model 3': ['5-seater'],
    'Model X': ['5-seater', '6-seater', '7-seater'],
    'Model Y': ['5-seater'],
    'Cybertruck': ['5-seater'],
    'Roadster': ['4-seater'],
  };
  return defaults[model];
}

export function VehicleForm({ vehicle, onSubmit, onCancel, storeCode = '' }: VehicleFormProps) {
  const defaultModel = vehicle?.model || 'Model 3';
  const defaultTrim = normalizeTrim(vehicle?.trim || vehicleOptions.trims[defaultModel][0], defaultModel);

  const { register, handleSubmit, control, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      model: defaultModel,
      trim: defaultTrim,
      vin: vehicle?.vin || '',
      exteriorColor: vehicle?.exteriorColor || getExteriorOptions(defaultModel, defaultTrim)[0],
      interiorColor: vehicle?.interiorColor || getInteriorOptions(defaultModel, defaultTrim)[0],
      wheelSize: vehicle?.wheelSize || getWheelOptions(defaultModel, defaultTrim)[0],
      seats: vehicle?.seats || getSeatOptions(defaultModel, defaultTrim)[0],
      batteryLevel: vehicle?.batteryLevel || 80,
      licensePlate: vehicle?.licensePlate || '',
    },
  });

  const selectedModel = watch('model');
  const selectedTrim = watch('trim');

  const exteriorOptions = useMemo(
    () => getExteriorOptions(selectedModel, selectedTrim),
    [selectedModel, selectedTrim],
  );
  const interiorOptions = useMemo(
    () => getInteriorOptions(selectedModel, selectedTrim),
    [selectedModel, selectedTrim],
  );
  const wheelOptions = useMemo(
    () => getWheelOptions(selectedModel, selectedTrim),
    [selectedModel, selectedTrim],
  );
  const seatOptionsList = useMemo(
    () => getSeatOptions(selectedModel, selectedTrim),
    [selectedModel, selectedTrim],
  );

  useEffect(() => {
    if (!vehicle) return;
    const normalizedTrim = normalizeTrim(vehicle.trim, vehicle.model);
    if (normalizedTrim !== vehicle.trim) {
      setValue('trim', normalizedTrim);
    }
    const validSeats = getSeatOptions(vehicle.model, normalizedTrim);
    if (!validSeats.includes(vehicle.seats)) {
      setValue('seats', validSeats[0]);
    }
  }, [vehicle, setValue]);

  useEffect(() => {
    if (vehicle) return;
    const trim = vehicleOptions.trims[selectedModel][0];
    setValue('trim', trim);
    setValue('exteriorColor', getExteriorOptions(selectedModel, trim)[0]);
    setValue('interiorColor', getInteriorOptions(selectedModel, trim)[0]);
    setValue('wheelSize', getWheelOptions(selectedModel, trim)[0]);
    setValue('seats', getSeatOptions(selectedModel, trim)[0]);
  }, [selectedModel, setValue, vehicle]);

  useEffect(() => {
    if (vehicle) return;
    setValue('exteriorColor', exteriorOptions[0]);
    setValue('interiorColor', interiorOptions[0]);
    setValue('wheelSize', wheelOptions[0]);
    setValue('seats', seatOptionsList[0]);
  }, [selectedTrim, exteriorOptions, interiorOptions, wheelOptions, seatOptionsList, setValue, vehicle]);

  const selectedWheel = watch('wheelSize');
  const selectedInterior = watch('interiorColor');
  const selectedSeats = watch('seats');

  useEffect(() => {
    if (wheelOptions.length > 0 && !wheelOptions.includes(selectedWheel)) {
      setValue('wheelSize', wheelOptions[0]);
    }
    if (interiorOptions.length > 0 && !interiorOptions.includes(selectedInterior)) {
      setValue('interiorColor', interiorOptions[0]);
    }
    if (seatOptionsList.length > 0 && !seatOptionsList.includes(selectedSeats)) {
      setValue('seats', seatOptionsList[0]);
    }
  }, [selectedTrim, wheelOptions, interiorOptions, seatOptionsList, selectedWheel, selectedInterior, selectedSeats, setValue]);

  const processSubmit = (data: z.infer<typeof vehicleSchema>) => {
    const normalizedTrim = normalizeTrim(data.trim, data.model);
    const completeVehicleData: Vehicle = {
      ...data,
      trim: normalizedTrim,
      id: vehicle?.id || '',
      storeId: vehicle?.storeId || storeCode,
      status: vehicle?.status || 'Available',
      imageUrl: getVehicleImage(data.model, normalizedTrim),
    };
    onSubmit(completeVehicleData);
  };

  return (
    <form onSubmit={handleSubmit(processSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Controller
            name="model"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(modelImages) as VehicleModel[]).map((modelName) => (
                    <SelectItem key={modelName} value={modelName}>{modelName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.model && <p className="text-red-500 text-sm">{errors.model.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="trim">Trim</Label>
          <Controller
            name="trim"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="trim">
                  <SelectValue placeholder="Select a trim" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleOptions.trims[selectedModel].map((trim) => (
                    <SelectItem key={trim} value={trim}>{trim}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.trim && <p className="text-red-500 text-sm">{errors.trim.message}</p>}
        </div>
      </div>
      
      <div className="space-y-2">
          <Label htmlFor="vin">VIN</Label>
          <Input id="vin" {...register('vin')} />
          {errors.vin && <p className="text-red-500 text-sm">{errors.vin.message}</p>}
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="space-y-2">
          <Label htmlFor="exteriorColor">Exterior Color</Label>
          <Controller
            name="exteriorColor"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="exteriorColor">
                  <SelectValue placeholder="Select a color" />
                </SelectTrigger>
                <SelectContent>
                  {exteriorOptions.map((color) => (
                    <SelectItem key={color} value={color}>{color}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.exteriorColor && <p className="text-red-500 text-sm">{errors.exteriorColor.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="interiorColor">Interior Color</Label>
           <Controller
            name="interiorColor"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="interiorColor">
                  <SelectValue placeholder="Select an interior" />
                </SelectTrigger>
                <SelectContent>
                  {interiorOptions.map((color) => (
                    <SelectItem key={color} value={color}>{color}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.interiorColor && <p className="text-red-500 text-sm">{errors.interiorColor.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="wheelSize">Wheels</Label>
           <Controller
            name="wheelSize"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="wheelSize">
                  <SelectValue placeholder="Select wheels" />
                </SelectTrigger>
                <SelectContent>
                  {wheelOptions.map((wheel) => (
                    <SelectItem key={wheel} value={wheel}>{wheel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.wheelSize && <p className="text-red-500 text-sm">{errors.wheelSize.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="seats">Seats</Label>
          <Controller
            name="seats"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="seats">
                  <SelectValue placeholder="Select seat configuration" />
                </SelectTrigger>
                <SelectContent>
                  {seatOptionsList.map((s) => (
                    <SelectItem key={s} value={s}>{getSeatDisplayLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.seats && <p className="text-red-500 text-sm">{errors.seats.message}</p>}
        </div>
      </div>


      <div className="space-y-2">
          <Label htmlFor="licensePlate">License plate</Label>
          <Input
            id="licensePlate"
            {...register('licensePlate')}
            placeholder="e.g. EV123CL"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            For manager records and CSV export only — not shown on the Fleet page.
          </p>
          {errors.licensePlate && <p className="text-destructive text-sm">{errors.licensePlate.message}</p>}
      </div>

      <div className="space-y-2">
          <Label htmlFor="batteryLevel">Battery Level (%)</Label>
          <Input id="batteryLevel" type="number" {...register('batteryLevel')} />
          {errors.batteryLevel && <p className="text-destructive text-sm">{errors.batteryLevel.message}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Vehicle</Button>
      </div>
    </form>
  );
}
