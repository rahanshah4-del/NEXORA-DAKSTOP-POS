import { cn } from '@/utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  hover?: boolean;
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  children,
  className,
  variant = 'default',
  padding = 'md',
  onClick,
  hover = false,
}: CardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={cn(
        variant === 'elevated'
          ? 'bg-surface-elevated border border-border shadow-panel'
          : 'bg-surface-secondary border border-border',
        'rounded-xl',
        paddingClasses[padding],
        hover && 'transition-all duration-150 hover:border-border-strong hover:shadow-panel',
        onClick && 'cursor-pointer w-full text-left',
        className,
      )}
    >
      {children}
    </Component>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between pb-3 mb-3 border-b border-border', className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return <h3 className={cn('text-sm font-semibold text-content', className)}>{children}</h3>;
}
