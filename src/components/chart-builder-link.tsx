/**
 * Chart Builder Navigation Link
 * Add this to your header/navigation to provide access to the visual chart builder
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';

interface ChartBuilderLinkProps {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
}

/**
 * Navigation link to the Chart Builder
 * 
 * Usage:
 * ```tsx
 * import { ChartBuilderLink } from '@/components/chart-builder-link';
 * 
 * // In your nav/header:
 * <ChartBuilderLink />
 * ```
 */
export function ChartBuilderLink({
  variant = 'ghost',
  size = 'default',
  showIcon = true,
  showLabel = true,
  className = ''
}: ChartBuilderLinkProps) {
  return (
    <Link href="/chart-builder" passHref>
      <Button variant={variant} size={size} className={className}>
        {showIcon && <BarChart3 className={showLabel ? 'h-4 w-4 mr-2' : 'h-4 w-4'} />}
        {showLabel && 'Chart Builder'}
      </Button>
    </Link>
  );
}

/**
 * Compact icon-only version for mobile/small spaces
 */
export function ChartBuilderIconLink({ className = '' }: { className?: string }) {
  return (
    <ChartBuilderLink
      variant="ghost"
      size="icon"
      showIcon={true}
      showLabel={false}
      className={className}
    />
  );
}

/**
 * Full button version with description (for menus)
 */
export function ChartBuilderMenuItem({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/chart-builder" passHref>
      <div
        className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
        onClick={onClick}
      >
        <div className="mt-1">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="font-medium">Chart Builder</div>
          <div className="text-sm text-muted-foreground">
            Create interactive charts with drag-and-drop
          </div>
        </div>
      </div>
    </Link>
  );
}

export default ChartBuilderLink;
