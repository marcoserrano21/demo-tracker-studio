import type { Metadata } from 'next';
import { PageTransition } from '@/components/page-transition';

export const metadata: Metadata = {
  title: 'Contact · Demo Drive Hub',
  description: 'Get in touch with Marco Serrano about Demo Drive Hub.',
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
