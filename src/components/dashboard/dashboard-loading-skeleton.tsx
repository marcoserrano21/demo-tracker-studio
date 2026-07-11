import { Skeleton } from '@/components/ui/skeleton';

export function DashboardLoadingSkeleton() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-6xl space-y-8" role="status" aria-label="Loading dashboard">
        <Skeleton className="h-16 w-1/4" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
