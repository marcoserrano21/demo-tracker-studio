'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from './ui/sheet';
import { Separator } from './ui/separator';
import type { Advisor, Vehicle } from '@/lib/types';
import { getVehicleImage, normalizeTrim } from '@/lib/data';
import { VehiclePhoto } from './vehicle-photo';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export const DRIVE_FLOW_SHEET_CLASS =
  'w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full max-h-[100dvh] overflow-hidden px-0 pb-0 gap-0 border-l border-border/50 shadow-2xl';

export function DriveFlowSheetContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SheetContent className={cn(DRIVE_FLOW_SHEET_CLASS, className)}>
      {children}
    </SheetContent>
  );
}

export function DriveFlowHeader({
  icon: Icon,
  accentClass,
  title,
  description,
}: {
  icon: LucideIcon;
  accentClass: string;
  title: string;
  description: string;
}) {
  return (
    <SheetHeader className="shrink-0 px-4 sm:px-6 pt-5 pb-4 space-y-3 border-b border-border/50 bg-card/20">
      <div className="flex items-start gap-3 pr-8">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            accentClass,
          )}
        >
          <Icon className="h-5 w-5 text-white" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <SheetTitle className="text-left text-lg sm:text-xl font-semibold tracking-tight leading-tight">
            {title}
          </SheetTitle>
          <SheetDescription className="text-left text-sm leading-snug">
            {description}
          </SheetDescription>
        </div>
      </div>
    </SheetHeader>
  );
}

function batteryTone(level: number) {
  if (level >= 80) return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20';
  if (level >= 50) return 'text-sky-600 bg-sky-500/10 border-sky-500/20';
  if (level >= 15) return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
  return 'text-red-600 bg-red-500/10 border-red-500/20';
}

export function DriveFlowVehicleHero({ vehicle }: { vehicle: Vehicle }) {
  const imageSrc = getVehicleImage(vehicle.model, vehicle.trim);

  return (
    <div className="relative mx-4 sm:mx-6 rounded-2xl overflow-hidden border border-border/50 bg-muted/30">
      <div className="relative aspect-[16/10] sm:aspect-[2/1] w-full">
        <VehiclePhoto
          src={imageSrc}
          alt={`${vehicle.model} ${normalizeTrim(vehicle.trim)}`}
          fill
          variant="hero"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Fleet vehicle
          </p>
          <p className="mt-1 text-base sm:text-lg font-semibold tracking-tight">
            {vehicle.model}
            <span className="text-muted-foreground font-normal">
              {' '}
              · {normalizeTrim(vehicle.trim)}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground font-mono">
            VIN ···{vehicle.vin.slice(-6)}
          </p>
        </div>
        <div
          className={cn(
            'absolute top-3 right-3 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums backdrop-blur-sm',
            batteryTone(vehicle.batteryLevel),
          )}
        >
          {vehicle.batteryLevel}%
        </div>
      </div>
    </div>
  );
}

export function DriveFlowScrollBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DriveFlowSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-border/50 bg-card/50 p-4 sm:p-5 space-y-4',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function DriveFlowFieldHeader({
  icon: Icon,
  title,
  hint,
  required,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-primary shrink-0" aria-hidden />}
        <span className="text-sm font-semibold text-foreground">
          {title}
          {required && (
            <span className="text-destructive ml-0.5" aria-hidden>
              *
            </span>
          )}
        </span>
      </div>
      {hint && <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>}
    </div>
  );
}

export function DriveFlowDivider() {
  return <Separator className="bg-border/50" />;
}

export function DriveFlowFooter({ children }: { children: React.ReactNode }) {
  return (
    <SheetFooter className="shrink-0 flex-col sm:flex-col gap-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-border/50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/85 safe-area-pb">
      {children}
    </SheetFooter>
  );
}

export const driveFlowInputClass =
  'h-12 sm:h-14 rounded-xl border border-border/60 bg-background/80 hover:border-border focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors';

export const driveFlowSelectTriggerClass =
  'h-12 sm:h-14 rounded-xl border border-border/60 bg-background/80 hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors';

/** Drop duplicate advisor records (same id, or same name+storeId when id is missing). */
export function dedupeAdvisors(advisors: Advisor[]): Advisor[] {
  const seen = new Set<string>();
  return advisors.filter((adv) => {
    const key = adv.id || `${adv.name.trim().toLowerCase()}:${adv.storeId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Stable, unique SelectItem value — never use display name alone (Radix keys native <option> by value). */
export function getAdvisorSelectValue(advisor: Advisor, index: number): string {
  if (advisor.id) return advisor.id;
  if (advisor.email) return `${advisor.storeId}::${advisor.email}`;
  return `${advisor.storeId}::${advisor.name}::${index}`;
}

export function findAdvisorBySelectValue(advisors: Advisor[], value: string): Advisor | undefined {
  if (!value) return undefined;
  const deduped = dedupeAdvisors(advisors);
  const byId = deduped.find((a) => a.id === value);
  if (byId) return byId;
  return deduped.find((a, index) => getAdvisorSelectValue(a, index) === value);
}

/** Resolve a select value (id or legacy name) to the display name stored on drive logs. */
export function resolveAdvisorName(advisors: Advisor[], value: string): string {
  if (!value) return '';
  const match = findAdvisorBySelectValue(advisors, value);
  if (match) return match.name;
  const byName = advisors.find((a) => a.name === value);
  return byName?.name ?? value;
}

/** Resolve a drive-log advisor name to a select value (advisor id). */
export function resolveAdvisorId(advisors: Advisor[], name: string): string {
  if (!name) return '';
  const match = advisors.find((a) => a.name === name);
  if (!match) return '';
  const deduped = dedupeAdvisors(advisors);
  const index = deduped.findIndex((a) => a.id === match.id || (a.name === match.name && a.storeId === match.storeId));
  return index >= 0 ? getAdvisorSelectValue(deduped[index], index) : match.id;
}

export function AdvisorSelect({
  advisors,
  value,
  onValueChange,
  name,
  placeholder,
  required,
}: {
  advisors: Advisor[];
  value: string;
  onValueChange: (value: string) => void;
  name?: string;
  placeholder: string;
  required?: boolean;
}) {
  const optionEntries = useMemo(() => {
    const sorted = dedupeAdvisors(advisors).sort((a, b) => a.name.localeCompare(b.name));
    const usedValues = new Set<string>();
    return sorted.map((adv, index) => {
      let selectValue = getAdvisorSelectValue(adv, index);
      if (usedValues.has(selectValue)) {
        selectValue = `${selectValue}::${index}`;
      }
      usedValues.add(selectValue);
      return { advisor: adv, selectValue };
    });
  }, [advisors]);

  const normalizedValue = useMemo(() => {
    if (!value) return '';
    const direct = optionEntries.find((entry) => entry.selectValue === value);
    if (direct) return direct.selectValue;
    const byId = optionEntries.find((entry) => entry.advisor.id === value);
    if (byId) return byId.selectValue;
    const byName = optionEntries.find((entry) => entry.advisor.name === value);
    if (byName) return byName.selectValue;
    return '';
  }, [value, optionEntries]);

  return (
    <Select name={name} value={normalizedValue} onValueChange={onValueChange} required={required}>
      <SelectTrigger className={driveFlowSelectTriggerClass}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-xl max-h-[min(320px,50vh)]">
        {optionEntries.map(({ advisor: adv, selectValue }) => (
          <SelectItem
            key={selectValue}
            value={selectValue}
            className="h-12 sm:h-14 cursor-pointer rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full overflow-hidden bg-primary/10 ring-1 ring-border/60 flex items-center justify-center shrink-0">
                {adv.avatarUrl ? (
                  <Image
                    src={adv.avatarUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] font-bold text-primary">
                    {adv.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <span className="font-medium text-sm">{adv.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DriveFlowOptionGrid({
  children,
  columns = 3,
}: {
  children: React.ReactNode;
  columns?: 2 | 3;
}) {
  return (
    <div
      className={cn(
        'grid gap-2 sm:gap-3',
        columns === 3 ? 'grid-cols-3' : 'grid-cols-2',
      )}
    >
      {children}
    </div>
  );
}

export function DriveFlowOptionButton({
  selected,
  disabled,
  onClick,
  children,
  className,
  accentSelected,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  accentSelected?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex min-h-[3.25rem] sm:min-h-14 flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected
          ? cn('border-primary bg-primary/10 shadow-sm', accentSelected)
          : 'border-border/60 bg-background/60 hover:border-border hover:bg-muted/40',
        disabled && 'opacity-40 cursor-not-allowed hover:bg-background/60',
        className,
      )}
    >
      {children}
    </button>
  );
}
