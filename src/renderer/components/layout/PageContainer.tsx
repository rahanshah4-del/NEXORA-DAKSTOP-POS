import { cn } from '@/utils/cn';
import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'full' | 'xl' | '2xl';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const maxWidthClasses = {
  full: '',
  xl: 'max-w-screen-xl mx-auto',
  '2xl': 'max-w-screen-2xl mx-auto',
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function PageContainer({
  children,
  className,
  maxWidth = 'full',
  padding = 'md',
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'w-full',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
