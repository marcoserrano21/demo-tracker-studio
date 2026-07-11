'use client';

import { BatteryFull, BatteryMedium, BatteryLow, BatteryWarning, Radio } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import type { BatterySource } from '@/lib/types';
import { cn } from '@/lib/utils';

interface BatteryIndicatorProps {
  level: number;
  source?: BatterySource;
  syncedAt?: number | { toMillis?: () => number };
}

export default function BatteryIndicator({ level, source, syncedAt }: BatteryIndicatorProps) {
  const getBatteryColor = () => {
    if (level > 70) return 'text-green-500';
    if (level > 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getBatteryIcon = () => {
    if (level > 70) return <BatteryFull className={`h-5 w-5 ${getBatteryColor()}`} />;
    if (level > 30) return <BatteryMedium className={`h-5 w-5 ${getBatteryColor()}`} />;
    if (level > 10) return <BatteryLow className={`h-5 w-5 ${getBatteryColor()}`} />;
    return <BatteryWarning className={`h-5 w-5 ${getBatteryColor()}`} />;
  };

  const isLive = source === 'fleet_api';
  const syncLabel = (() => {
    if (!syncedAt) return null;
    const ms = typeof syncedAt === 'number' ? syncedAt : syncedAt.toMillis?.();
    if (!ms) return null;
    return new Date(ms).toLocaleString();
  })();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            {getBatteryIcon()}
            <span className={`text-sm font-semibold ${getBatteryColor()}`}>
              {level}%
            </span>
            {isLive && (
              <Radio
                className={cn('h-3 w-3 text-emerald-500')}
                aria-label="Live telemetry"
              />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Battery Level: {level}%</p>
          <p className="text-xs opacity-80">
            {isLive ? `Live · Fleet API${syncLabel ? ` · ${syncLabel}` : ''}` : 'Manual entry'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
