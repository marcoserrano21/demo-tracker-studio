"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type DayPickerProps, type ClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = DayPickerProps & {
  className?: string;
  variant?: 'default' | 'compact' | 'large';
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  variant = 'default',
  ...props
}: CalendarProps) {
  const sizeClasses = {
    default: {
      cell: "h-12 w-12 min-w-[3rem]",
      day: "h-12 w-12 text-base font-semibold",
      head_cell: "w-12 min-w-[3rem] h-8",
      padding: "p-4",
    },
    compact: {
      cell: "h-10 w-10 min-w-[2.5rem]", 
      day: "h-10 w-10 text-sm font-medium",
      head_cell: "w-10 min-w-[2.5rem] h-6",
      padding: "p-3",
    },
    large: {
      cell: "h-16 w-16 min-w-[4rem]",
      day: "h-16 w-16 text-lg font-bold", 
      head_cell: "w-16 min-w-[4rem] h-10",
      padding: "p-6",
    }
  };
  
  const sizes = sizeClasses[variant];
  
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(sizes.padding, "bg-transparent w-fit max-w-sm mx-auto", className)}
      classNames={{
        months: cn(
          "w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3",
          "[&>nav]:col-span-1 sm:[&>nav]:col-span-2",
          "[&>nav]:row-start-1",
          "[&>nav]:justify-self-center",
          "[&>nav]:w-full",
          "[&>nav]:max-w-[280px]",
        ),
        month: "space-y-4 min-w-fit w-full justify-self-center",
        month_caption: "flex justify-center items-center mb-3",
        caption: "flex justify-center items-center mb-3",
        caption_label: "text-xl font-bold text-foreground tracking-tight",
        nav: "flex flex-row w-full items-center justify-between gap-4 py-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-9 w-9 shrink-0 bg-background/90 p-0 border-border/60 text-foreground shadow-sm hover:border-primary/40 hover:bg-primary/10 hover:text-primary transition-all rounded-lg"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-9 w-9 shrink-0 bg-background/90 p-0 border-border/60 text-foreground shadow-sm hover:border-primary/40 hover:bg-primary/10 hover:text-primary transition-all rounded-lg"
        ),
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-9 w-9 shrink-0 bg-background/90 p-0 border-border/60 text-foreground shadow-sm hover:border-primary/40 hover:bg-primary/10 hover:text-primary transition-all rounded-lg"
        ),
        nav_button_previous: "static shrink-0",
        nav_button_next: "static shrink-0",
        table: "w-full border-collapse table-fixed",
        head_row: "flex w-full justify-between mb-3",
        head_cell: cn(
          "text-muted-foreground font-semibold text-sm text-center flex items-center justify-center tracking-wide",
          sizes.head_cell
        ),
        row: "flex w-full justify-between mb-2",
        cell: cn(
          "text-center relative focus-within:relative focus-within:z-20 flex items-center justify-center p-0",
          sizes.cell
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground transition-all duration-200 flex items-center justify-center rounded-lg border-0",
          sizes.day
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-700 focus:text-white font-semibold shadow-lg",
        day_today: "bg-accent/80 text-accent-foreground font-semibold ring-1 ring-border/50",
        day_outside:
          "text-muted-foreground/40 opacity-40 aria-selected:bg-accent/30 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground/30 opacity-20 hover:text-muted-foreground/30 hover:bg-transparent cursor-not-allowed",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...props }) => {
          const Icon = orientation === 'left' ? ChevronLeft : ChevronRight;
          return <Icon className={cn("h-4 w-4", className)} {...props} />;
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
