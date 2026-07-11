
'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AchievementIconProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  quality?: number;
  priority?: boolean;
}

export function AchievementIcon({ src, alt, width, height, className, quality = 95, priority = false }: AchievementIconProps) {
  const isSvg = src.toLowerCase().endsWith('.svg');

  if (isSvg) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={width} height={height} className={cn(className)} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      quality={quality}
      priority={priority}
      className={cn(className)}
    />
  );
}
