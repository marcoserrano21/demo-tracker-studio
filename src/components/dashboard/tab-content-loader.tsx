import { Skeleton } from '@/components/ui/skeleton';

export function TabContentLoader() {
  return (
    <div className="p-4">
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/4" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
