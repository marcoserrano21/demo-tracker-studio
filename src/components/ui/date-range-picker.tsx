'use client';

import * as React from 'react';
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  differenceInCalendarDays,
  isSameDay,
} from 'date-fns';
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { type DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useBreakpoint } from '@/hooks/use-breakpoint';

interface Preset {
  name: string;
  range: DateRange;
}

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  disabledDays?: React.ComponentProps<typeof Calendar>['disabled'];
  presets?: Preset[];
  variant?: 'default' | 'compact';
}

function rangesMatch(a: DateRange | undefined, b: DateRange): boolean {
  if (!a?.from || !a?.to || !b.from || !b.to) return false;
  return isSameDay(a.from, b.from) && isSameDay(a.to, b.to);
}

function getRangeDayCount(range: DateRange | undefined): number | null {
  if (!range?.from || !range?.to) return null;
  return differenceInCalendarDays(range.to, range.from) + 1;
}

const defaultPresets: Preset[] = [
  { name: 'Today', range: { from: new Date(), to: new Date() } },
  { name: 'Yesterday', range: { from: addDays(new Date(), -1), to: addDays(new Date(), -1) } },
  {
    name: 'This Week',
    range: { from: startOfWeek(new Date(), { weekStartsOn: 0 }), to: endOfWeek(new Date(), { weekStartsOn: 0 }) },
  },
  {
    name: 'Last Week',
    range: {
      from: startOfWeek(addDays(new Date(), -7), { weekStartsOn: 0 }),
      to: endOfWeek(addDays(new Date(), -7), { weekStartsOn: 0 }),
    },
  },
  { name: 'This Month', range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
  {
    name: 'Last Month',
    range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) },
  },
  { name: 'This Quarter', range: { from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) } },
  {
    name: 'Last Quarter',
    range: {
      from: startOfQuarter(subQuarters(new Date(), 1)),
      to: endOfQuarter(subQuarters(new Date(), 1)),
    },
  },
];

function DateSummaryCard({
  label,
  value,
  active,
  placeholder,
}: {
  label: string;
  value?: Date;
  active?: boolean;
  placeholder: string;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-0.5 rounded-xl border px-3 py-2.5 transition-all duration-200',
        active
          ? 'border-primary/40 bg-primary/10 shadow-[inset_0_1px_0_hsl(var(--primary)/0.12)]'
          : 'border-border/60 bg-muted/30'
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          'truncate text-sm font-semibold tabular-nums',
          value ? 'text-foreground' : 'text-muted-foreground/70'
        )}
      >
        {value ? format(value, 'MMM d, yyyy') : placeholder}
      </span>
    </div>
  );
}

export function DateRangePicker({
  className,
  date,
  onDateChange,
  disabledDays,
  presets: customPresets,
  variant = 'default',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date);
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'sm';
  const presets = customPresets ?? defaultPresets;

  React.useEffect(() => {
    setTempDate(date);
  }, [date]);

  const activePreset = presets.find((preset) => rangesMatch(tempDate, preset.range))?.name;
  const dayCount = getRangeDayCount(tempDate);
  const awaitingEnd = Boolean(tempDate?.from && !tempDate?.to);
  const isSingleDay =
    tempDate?.from && tempDate?.to && isSameDay(tempDate.from, tempDate.to);

  const handleApply = () => {
    if (tempDate?.from && !tempDate.to) {
      onDateChange({ from: tempDate.from, to: tempDate.from });
    } else {
      onDateChange(tempDate);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempDate(date);
    setIsOpen(false);
  };

  const handlePresetSelect = (preset: Preset) => {
    setTempDate(preset.range);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) setTempDate(date);
  };

  const triggerLabel = date?.from
    ? date.to
      ? isSameDay(date.from, date.to)
        ? format(date.from, 'MMM d, yyyy')
        : `${format(date.from, 'MMM d')} – ${format(date.to, 'MMM d, yyyy')}`
      : format(date.from, 'MMM d, yyyy')
    : 'Select dates';

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            id="date-range-trigger"
            variant="outline"
            aria-label="Open date range picker"
            className={cn(
              'group/ddh-trigger h-10 w-full justify-start gap-2.5 rounded-xl border-border/70 bg-background/80 px-3 font-normal shadow-sm backdrop-blur-sm transition-all duration-200',
              'hover:border-primary/30 hover:bg-accent/40 hover:shadow-md',
              variant === 'compact' ? 'sm:w-full' : 'sm:w-[min(100%,320px)]',
              !date?.from && 'text-muted-foreground'
            )}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover/ddh-trigger:bg-primary/15">
              <CalendarDays className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground">
              {triggerLabel}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
              aria-hidden
            />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={8}
          className={cn(
            'ddh-date-range-picker w-[min(calc(100vw-2rem),720px)] overflow-hidden rounded-2xl border border-border/70 bg-popover p-0 shadow-2xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98] data-[side=bottom]:slide-in-from-top-1'
          )}
        >
          {/* Header */}
          <div className="border-b border-border/60 bg-gradient-to-b from-muted/40 to-transparent px-4 pb-3 pt-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  Choose your range
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {awaitingEnd
                    ? 'Tap your end date to finish the range'
                    : 'Pick a quick preset or tap two dates on the calendar'}
                </p>
              </div>
              {dayCount !== null && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  {dayCount} {dayCount === 1 ? 'day' : 'days'}
                </span>
              )}
            </div>

            {/* Preset chips */}
            <div
              className="mt-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-none"
              role="listbox"
              aria-label="Quick date presets"
            >
              {presets.map((preset) => {
                const isActive = activePreset === preset.name;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handlePresetSelect(preset)}
                    className={cn(
                      'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border/70 bg-background/80 text-muted-foreground hover:border-primary/30 hover:bg-accent hover:text-foreground'
                    )}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selection summary */}
          <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3 sm:px-5">
            <DateSummaryCard
              label="Start"
              value={tempDate?.from}
              active={Boolean(tempDate?.from)}
              placeholder="Pick start"
            />
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
            <DateSummaryCard
              label="End"
              value={tempDate?.to ?? (isSingleDay ? tempDate?.from : undefined)}
              active={Boolean(tempDate?.to || isSingleDay)}
              placeholder={awaitingEnd ? 'Pick end' : 'Pick end'}
            />
          </div>

          {/* Calendar */}
          <div className="px-2 py-3 sm:px-4 sm:py-4">
            <Calendar
              mode="range"
              selected={tempDate}
              onSelect={setTempDate}
              defaultMonth={tempDate?.from}
              numberOfMonths={isMobile ? 1 : 2}
              disabled={disabledDays}
              showOutsideDays
              weekStartsOn={0}
              variant="compact"
              className="ddh-day-picker mx-auto bg-transparent p-0"
              pagedNavigation={!isMobile}
              classNames={{
                months: cn(
                  'ddh-rdp-months w-full',
                  'grid grid-cols-1 sm:grid-cols-2',
                  'gap-x-6 gap-y-3',
                  /* Nav is a direct child of Months in v9 — span full row above month grids */
                  '[&>nav]:col-span-1 sm:[&>nav]:col-span-2',
                  '[&>nav]:row-start-1',
                  '[&>nav]:justify-self-center',
                  '[&>nav]:w-full',
                  '[&>nav]:max-w-[280px]',
                ),
                month: 'space-y-3 min-w-fit w-full justify-self-center',
                month_caption: 'flex justify-center items-center mb-2 pt-1',
                caption: 'flex justify-center items-center mb-2 pt-1',
                caption_label: 'text-sm font-semibold tracking-tight text-foreground',
                nav: 'flex flex-row w-full items-center justify-between gap-4 py-0.5',
                button_previous: cn(
                  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/90 p-0 text-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary'
                ),
                button_next: cn(
                  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/90 p-0 text-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary'
                ),
                nav_button:
                  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/90 p-0 text-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary',
                nav_button_previous: 'static shrink-0',
                nav_button_next: 'static shrink-0',
                head_row: 'flex w-full justify-between',
                head_cell:
                  'w-9 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80',
                row: 'mt-1 flex w-full justify-between',
                cell: cn(
                  'relative h-9 w-9 p-0 text-center',
                  '[&:has([aria-selected].day-range-end)]:rounded-r-full',
                  '[&:has([aria-selected].day-range-start)]:rounded-l-full',
                  '[&:has([aria-selected].day-range-middle)]:bg-primary/14',
                  'first:[&:has([aria-selected])]:rounded-l-full last:[&:has([aria-selected])]:rounded-r-full'
                ),
                day: cn(
                  'h-9 w-9 p-0 text-sm font-medium aria-selected:opacity-100',
                  'hover:bg-accent/80 hover:rounded-full'
                ),
                day_range_start: 'day-range-start ddh-range-start',
                day_range_end: 'day-range-end ddh-range-end',
                day_range_middle: 'day-range-middle ddh-range-middle aria-selected:bg-transparent',
                day_selected:
                  'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full font-semibold shadow-[0_2px_8px_hsl(var(--primary)/0.35)]',
                day_today: 'font-bold text-primary ring-1 ring-primary/40 rounded-full',
                day_outside: 'text-muted-foreground/35 opacity-50',
                day_disabled: 'text-muted-foreground/25 opacity-40',
              }}
            />
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-muted-foreground sm:text-sm">
              {tempDate?.from ? (
                tempDate.to ? (
                  <>
                    <span className="font-medium text-foreground">
                      {format(tempDate.from, 'MMM d, yyyy')}
                    </span>
                    {' → '}
                    <span className="font-medium text-foreground">
                      {format(tempDate.to, 'MMM d, yyyy')}
                    </span>
                    {dayCount !== null && (
                      <span className="ml-1 text-muted-foreground">
                        ({dayCount} {dayCount === 1 ? 'day' : 'days'})
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    Start:{' '}
                    <span className="font-medium text-foreground">
                      {format(tempDate.from, 'MMM d, yyyy')}
                    </span>
                    <span className="ml-1 text-primary">— select end date</span>
                  </>
                )
              ) : (
                'No dates selected yet'
              )}
            </p>
            <div className="flex gap-2 sm:shrink-0">
              <Button variant="ghost" size="sm" onClick={handleCancel} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={!tempDate?.from}
                className="flex-1 sm:flex-none sm:min-w-[88px]"
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
