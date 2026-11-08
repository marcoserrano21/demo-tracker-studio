'use client';

import { cn } from '@/lib/utils';

interface HubLogoProps {
  expanded?: boolean;
  className?: string;
  /** Show product subtitle under the brand name when expanded */
  showSubtitle?: boolean;
}

/** Bold Demo Drive Hub mark - filled shapes for small-size legibility. */
function HubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Hub pulse - real-time fleet tracking */}
      <circle
        cx="12"
        cy="6.5"
        r="4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        opacity="0.4"
      />
      <circle cx="12" cy="6.5" r="2" fill="currentColor" />
      {/* Vehicle - solid silhouette */}
      <path
        fill="currentColor"
        d="M5 14.5h14l-1.2-3.4A2 2 0 0 0 15.9 9.75H8.1a2 2 0 0 0-1.9 1.35L5 14.5Zm-1.25 0h16.5c.41 0 .75.34.75.75v1.25c0 .69-.56 1.25-1.25 1.25h-.85a2 2 0 0 1-3.9 0H8.5a2 2 0 0 1-3.9 0h-.85c-.69 0-1.25-.56-1.25-1.25V15.25c0-.41.34-.75.75-.75Z"
      />
    </svg>
  );
}

export const PRODUCT_SUBTITLE = 'Showroom demo fleet OS';

export function HubLogo({ expanded = false, className, showSubtitle = false }: HubLogoProps) {
  return (
    <div
      className={cn(
        'flex items-center text-foreground transition-[gap,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        expanded ? 'gap-2 px-1' : 'gap-0 justify-center',
        className
      )}
      aria-label={`Demo Drive Hub - ${PRODUCT_SUBTITLE}`}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          'bg-primary text-primary-foreground shadow-sm',
          'ring-1 ring-primary/40'
        )}
      >
        <HubMark className="h-5 w-5" />
      </div>
      <div
        className={cn(
          'flex flex-col overflow-hidden',
          'transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          'motion-reduce:transition-none',
          expanded
            ? 'max-w-[14rem] translate-x-0 opacity-100'
            : 'pointer-events-none max-w-0 -translate-x-1.5 opacity-0'
        )}
        aria-hidden={!expanded}
      >
        <span className="text-sm font-semibold leading-tight tracking-tight whitespace-nowrap">
          Demo Drive Hub
        </span>
        {showSubtitle && (
          <span className="text-[10px] font-medium leading-tight text-muted-foreground whitespace-nowrap">
            {PRODUCT_SUBTITLE}
          </span>
        )}
      </div>
    </div>
  );
}
