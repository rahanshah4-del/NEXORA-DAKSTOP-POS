import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-1 text-sm', className)}>
      <Link
        to="/"
        className="text-content-tertiary hover:text-content transition-colors p-0.5"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, idx) => (
        <span key={idx} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-content-tertiary" />
          {item.path ? (
            <Link
              to={item.path}
              className="text-content-tertiary hover:text-content transition-colors font-medium"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-content font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
