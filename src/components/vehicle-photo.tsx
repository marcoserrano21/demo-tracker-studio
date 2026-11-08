'use client';

import Image, { type ImageProps } from 'next/image';
import { cn } from '@/lib/utils';

type VehiclePhotoVariant = 'card' | 'carousel' | 'thumb' | 'hero' | 'compact';

type VehiclePhotoProps = Omit<ImageProps, 'src' | 'alt'> & {
  src: string;
  alt: string;
  variant?: VehiclePhotoVariant;
};

/** Default sizes tuned for phone/tablet DPR so we do not underserve retina screens. */
const VARIANT_SIZES: Record<VehiclePhotoVariant, string> = {
  // Full-bleed fleet cards (grid)
  card: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px',
  // Carousel slides - nearly full width on phones, half on tablets
  carousel: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px',
  // Floor Mode / list thumbs (80–96 CSS px → request ~2–3× for retina)
  thumb: '(max-width: 768px) 192px, 160px',
  // Check-in / check-out hero
  hero: '(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 560px',
  compact: '(max-width: 768px) 200px, 128px',
};

function isLocalFleetSrc(src: string): boolean {
  return src.startsWith('/vehicles/');
}

/**
 * Vehicle photography for fleet UI.
 * Local `/vehicles/*` assets are already compressed JPEGs (~1024px) -
 * skipping the optimizer avoids a second AVIF/WebP pass that looks pixelated on mobile.
 */
export function VehiclePhoto({
  src,
  alt,
  variant = 'card',
  className,
  sizes,
  quality,
  unoptimized,
  ...rest
}: VehiclePhotoProps) {
  const localFleet = typeof src === 'string' && isLocalFleetSrc(src);

  return (
    <Image
      src={src}
      alt={alt}
      sizes={sizes ?? VARIANT_SIZES[variant]}
      quality={quality ?? 90}
      // Local fleet JPEGs: serve originals - sharper on phone/tablet retina
      unoptimized={unoptimized ?? localFleet}
      className={cn('object-cover object-center', className)}
      {...rest}
    />
  );
}
