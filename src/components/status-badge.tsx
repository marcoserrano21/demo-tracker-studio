
'use client';

import type { VehicleStatus } from '@/lib/types';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: VehicleStatus | 'Not Available';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const statusStyles: { [key in VehicleStatus | 'Not Available']: string } = {
    Available: 'bg-green-500/20 text-green-400 border-green-500/30',
    'On Demo': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Charging: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Scheduled: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'Needs Attention': 'bg-red-500/20 text-red-400 border-red-500/30',
    Sold: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    'Not Available': 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <Badge
      variant="outline"
      className={cn('pointer-events-none', statusStyles[status])}
    >
      {status}
    </Badge>
  );
}
