import { Badge } from '@/components/ui/Badge';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface StatusConfig {
  label: string;
  variant: BadgeVariant;
}

const statusMap: Record<string, StatusConfig> = {
  pending: { label: 'Pending', variant: 'warning' },
  confirmed: { label: 'Confirmed', variant: 'info' },
  preparing: { label: 'Preparing', variant: 'info' },
  ready: { label: 'Ready', variant: 'success' },
  served: { label: 'Served', variant: 'primary' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
  available: { label: 'Available', variant: 'success' },
  occupied: { label: 'Occupied', variant: 'warning' },
  reserved: { label: 'Reserved', variant: 'info' },
  cleaning: { label: 'Cleaning', variant: 'default' },
  maintenance: { label: 'Maintenance', variant: 'danger' },
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'default' },
  paid: { label: 'Paid', variant: 'success' },
  unpaid: { label: 'Unpaid', variant: 'danger' },
  partial: { label: 'Partial', variant: 'warning' },
  refunded: { label: 'Refunded', variant: 'info' },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusMap[status] ?? { label: status, variant: 'default' as BadgeVariant };

  return (
    <Badge variant={config.variant} dot size="sm" className={className}>
      {config.label}
    </Badge>
  );
}
