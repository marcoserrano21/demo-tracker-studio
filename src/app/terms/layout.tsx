import type { Metadata } from 'next';
import { PageTransition } from '@/components/page-transition';

export const metadata: Metadata = {
  title: 'Terms · Demo Drive Hub',
  description: 'Terms of service for Demo Drive Hub portfolio demo application.',
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
