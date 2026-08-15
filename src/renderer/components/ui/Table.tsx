import { cn } from '@/utils/cn';

interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  className?: string;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  loadingRows?: number;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  className,
  onRowClick,
  emptyState,
  isLoading = false,
  loadingRows = 5,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className={cn('w-full overflow-hidden rounded-xl border border-border', className)}>
        <table className="w-full">
          <thead>
            <tr className="bg-surface-secondary">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-content-secondary uppercase tracking-wider',
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: loadingRows }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="border-t border-border">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 bg-surface-tertiary rounded animate-pulse w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data.length && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn('w-full overflow-hidden rounded-xl border border-border', className)}>
      <table className="w-full">
        <thead>
          <tr className="bg-surface-secondary">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold text-content-secondary uppercase tracking-wider',
                  col.headerClassName,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row, idx) => (
            <tr
              key={keyExtractor(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'transition-colors duration-75',
                onRowClick && 'cursor-pointer hover:bg-surface-tertiary',
                idx % 2 === 1 && 'bg-surface-secondary/50',
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn('px-4 py-3 text-sm text-content', col.className)}
                >
                  {col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
