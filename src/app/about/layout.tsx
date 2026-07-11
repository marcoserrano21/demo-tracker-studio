import type { Metadata } from 'next';
import { PageTransition } from '@/components/page-transition';

export const metadata: Metadata = {
  title: 'About · Demo Drive Hub | Marco Serrano',
  description:
    'Case study: EV retail demo fleet app built by Marco Serrano. UI/UX design, AI-assisted full-stack development, and digital product strategy. 50% admin time saved, 147 drives logged.',
  openGraph: {
    title: 'Demo Drive Hub · Product Case Study',
    description:
      'From whiteboard chaos to a real-time demo drive platform. Built by a retail advisor who ships.',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
