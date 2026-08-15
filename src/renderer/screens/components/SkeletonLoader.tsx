import React from 'react';
import { cn } from '@/utils/cn';

interface SkeletonProps { className?: string; variant?: 'text' | 'circular' | 'rectangular'; }

export const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'text' }) => (
  <div
    className={cn(
      'animate-shimmer bg-gradient-to-r from-surface-secondary via-surface-tertiary to-surface-secondary bg-[length:200%_100%]',
      variant === 'circular' && 'rounded-full',
      variant === 'rectangular' && 'rounded-lg',
      variant === 'text' && 'rounded-md',
      className,
    )}
    aria-hidden="true"
  />
);

export const CardSkeleton: React.FC = () => (
  <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-8 w-1/2" />
    <Skeleton className="h-3 w-2/3" />
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => (
  <div className="space-y-3 p-4" role="status" aria-label="Loading table">
    <div className="flex gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className="h-8 flex-1" />
        ))}
      </div>
    ))}
    <span className="sr-only">Loading...</span>
  </div>
);

export const GridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" role="status" aria-label="Loading grid">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
    <span className="sr-only">Loading...</span>
  </div>
);

export const DetailSkeleton: React.FC = () => (
  <div className="space-y-4 p-6" role="status" aria-label="Loading details">
    <Skeleton className="h-8 w-1/3" />
    <Skeleton className="h-4 w-2/3" />
    <div className="grid grid-cols-2 gap-4 mt-6">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
    <span className="sr-only">Loading...</span>
  </div>
);
