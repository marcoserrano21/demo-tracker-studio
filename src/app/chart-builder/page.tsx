import { redirect } from 'next/navigation';
import ChartBuilderClient from './chart-builder-client';

export default function ChartBuilderPage() {
  if (process.env.NODE_ENV === 'production') {
    redirect('/about');
  }
  return <ChartBuilderClient />;
}
