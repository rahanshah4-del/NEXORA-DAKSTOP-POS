import { cn } from '@/utils/cn';

function Shimmer({ className }: { className: string }) {
  return <div className={cn('animate-pulse rounded bg-pos-divider', className)} />;
}

function Block({ className, body }: { className?: string; body: string }) {
  return (
    <div className={cn('rounded-card border border-pos-card-border bg-pos-card p-[14px]', className)}>
      <Shimmer className="h-3 w-24" />
      <Shimmer className={cn('mt-4 w-full opacity-70', body)} />
    </div>
  );
}

/** Mirrors the real grid so nothing shifts when the data lands. */
export function DashboardLoading() {
  return (
    <div className="space-y-[12px]" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-[12px]">
        <div className="col-span-2 rounded-card bg-pos-deep p-[14px]">
          <Shimmer className="h-3 w-32 bg-pos-deep-tile" />
          <Shimmer className="mt-4 h-12 w-56 bg-pos-deep-tile" />
          <Shimmer className="mt-6 h-12 w-full bg-pos-deep-tile" />
        </div>
        <Block className="col-span-1" body="h-24" />
        <Block className="col-span-1" body="h-24" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-[12px]">
        <Block className="xl:col-span-2" body="h-[168px]" />
        <Block body="h-[168px]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[12px]">
        <Block body="h-48" />
        <Block body="h-48" />
        <div className="rounded-card bg-pos-deep p-[14px]">
          <Shimmer className="h-3 w-28 bg-pos-deep-tile" />
          <Shimmer className="mt-4 h-40 w-full bg-pos-deep-tile" />
        </div>
      </div>
    </div>
  );
}
