
"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-16 z-[200] flex max-h-screen w-[calc(100%-2rem)] max-w-[320px] mx-4 flex-col-reverse gap-2 p-2 sm:right-4 sm:top-16 sm:flex-col sm:max-w-sm sm:p-4 sm:gap-3",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start overflow-hidden rounded-2xl border-2 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full backdrop-blur-xl hover:shadow-3xl hover:scale-[1.02] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "border-emerald-500/30 bg-gradient-to-br from-background/98 via-emerald-50/5 to-background/98 dark:from-background/98 dark:via-emerald-950/30 dark:to-background/98 text-foreground shadow-emerald-500/10 hover:shadow-emerald-500/20 ring-1 ring-emerald-500/10",
        destructive:
          "destructive group border-red-500/40 bg-gradient-to-br from-background/98 via-red-50/10 to-background/98 dark:from-background/98 dark:via-red-950/40 dark:to-background/98 text-red-900 dark:text-red-100 shadow-red-500/20 hover:shadow-red-500/30 ring-1 ring-red-500/20",
        warning:
          "warning group border-amber-500/40 bg-gradient-to-br from-background/98 via-amber-50/10 to-background/98 dark:from-background/98 dark:via-amber-950/40 dark:to-background/98 text-amber-900 dark:text-amber-100 shadow-amber-500/20 hover:shadow-amber-500/30 ring-1 ring-amber-500/20",
        achievement:
          "achievement group border-purple-500/40 bg-gradient-to-br from-background/98 via-purple-50/10 to-background/98 dark:from-background/98 dark:via-purple-950/40 dark:to-background/98 text-purple-900 dark:text-purple-100 shadow-purple-500/20 hover:shadow-purple-500/30 ring-1 ring-purple-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants> & {
      duration?: number
    }
>(({ className, variant, children, duration = 3000, onOpenChange, ...props }, ref) => {
  const [progress, setProgress] = React.useState(100);

  React.useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        // Properly trigger the toast dismissal
        onOpenChange?.(false);
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [duration, onOpenChange]);

  // Determine icon based on variant
  const getIcon = () => {
    switch (variant) {
      case 'destructive':
        return <XCircle className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 text-red-600 dark:text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 text-amber-600 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />;
      case 'achievement':
        return null; // No status icon for achievements
      default:
        return <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />;
    }
  };

  // Progress bar color based on variant
  const getProgressBarColor = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-gradient-to-r from-red-500 via-red-600 to-red-500 dark:from-red-400 dark:via-red-500 dark:to-red-400';
      case 'warning':
        return 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 dark:from-amber-400 dark:via-amber-500 dark:to-amber-400';
      case 'achievement':
        return 'bg-gradient-to-r from-purple-500 via-purple-600 to-purple-500 dark:from-purple-400 dark:via-purple-500 dark:to-purple-400';
      default:
        return 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 dark:from-emerald-400 dark:via-emerald-500 dark:to-emerald-400';
    }
  };

  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), "p-4 sm:p-5 md:p-6", className)}
      onOpenChange={onOpenChange}
      {...props}
    >
      <div className="flex w-full items-start gap-3 sm:gap-4">
        {/* Status Icon */}
        {getIcon() && (
          <div className="flex-shrink-0 mt-1 p-2 rounded-xl bg-gradient-to-br from-background/50 to-background/30 shadow-inner">
            {getIcon()}
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {children}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/5 dark:bg-white/5 overflow-hidden rounded-b-2xl">
        <div
          className={cn(
            "h-full transition-all duration-100 ease-linear shadow-[0_0_10px_currentColor]",
            getProgressBarColor()
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </ToastPrimitives.Root>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-3 sm:right-4 sm:top-4 rounded-xl p-1.5 sm:p-2 text-foreground/50 opacity-0 transition-all duration-300 hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 hover:rotate-90 hover:scale-110 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 group-hover:opacity-100 group-[.destructive]:text-red-400 group-[.destructive]:hover:text-red-50 group-[.destructive]:hover:bg-red-500/20 group-[.destructive]:focus:ring-red-400 shadow-lg",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4 sm:h-5 sm:w-5" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm sm:text-base font-bold leading-tight tracking-tight", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-xs sm:text-sm opacity-95 leading-relaxed", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
