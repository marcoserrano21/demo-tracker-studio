'use client';

import { BatteryFull, BatteryMedium, BatteryLow, BatteryWarning } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface BatteryIndicatorProps {
  level: number;
}

export default function BatteryIndicator({ level }: BatteryIndicatorProps) {
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

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            {getBatteryIcon()}
            <span className={`text-sm font-semibold ${getBatteryColor()}`}>
              {level}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Battery Level: {level}%</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
