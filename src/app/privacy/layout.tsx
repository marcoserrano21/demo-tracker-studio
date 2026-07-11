import type { Metadata } from 'next';
import { PageTransition } from '@/components/page-transition';

export const metadata: Metadata = {
  title: 'Privacy · Demo Drive Hub',
  description: 'Privacy policy for Demo Drive Hub portfolio demo application.',
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
