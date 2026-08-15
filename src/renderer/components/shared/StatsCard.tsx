import React from 'react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral' | 'warning';
  icon: LucideIcon;
  iconColor?: string;
  className?: string;
  onClick?: () => void;
}

const changeIconMap: Record<string, LucideIcon> = {
  positive: TrendingUp,
  negative: TrendingDown,
  warning: AlertTriangle,
  neutral: Minus,
};

export function StatsCard({
  title,
  value,
  subtitle,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'text-primary',
  className,
  onClick,
}: StatsCardProps) {
  const ChangeIcon = changeIconMap[changeType] ?? Minus;

  return (
    <Card className={className} onClick={onClick} hover={!!onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-content-secondary uppercase tracking-wider">
            {title}
          </p>
          <p className="text-2xl font-bold text-content mt-1.5 tracking-tight">
            {value}
          </p>
          {(subtitle || change) && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {change && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-xs font-semibold',
                    changeType === 'positive' && 'text-success',
                    changeType === 'negative' && 'text-danger',
                    changeType === 'warning' && 'text-warning',
                    changeType === 'neutral' && 'text-content-secondary',
                  )}
                >
                  {React.createElement(ChangeIcon, { className: 'h-3 w-3' })}
                  {change}
                </span>
              )}
              {subtitle && (
                <span className="text-xs text-content-tertiary">{subtitle}</span>
              )}
            </div>
          )}
        </div>
        <div
          className={cn(
            'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
            iconColor === 'text-primary' ? 'bg-primary/10' : '',
            iconColor === 'text-success' ? 'bg-success/10' : '',
            iconColor === 'text-warning' ? 'bg-warning/10' : '',
            iconColor === 'text-danger' ? 'bg-danger/10' : '',
            iconColor === 'text-info' ? 'bg-info/10' : '',
          )}
        >
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
      </div>
    </Card>
  );
}

