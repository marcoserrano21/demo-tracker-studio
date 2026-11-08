import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Analytics } from '@vercel/analytics/react';
import { SkipLink } from '@/components/skip-link';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Demo Drive Hub - Showroom demo fleet OS',
  description: 'Showroom demo fleet OS - find, start, and finish demos with live availability and FSD logging.',
  applicationName: 'Demo Drive Hub',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Demo Drive Hub - Showroom demo fleet OS',
    description: 'Showroom demo fleet OS - portfolio case study by Marco Serrano.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Demo Drive Hub - Showroom demo fleet OS',
    description: 'Showroom demo fleet OS - find, start, and finish demos with live availability.',
  },
  appleWebApp: {
    capable: true,
    title: 'DD Hub',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon-192.png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <SkipLink />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
