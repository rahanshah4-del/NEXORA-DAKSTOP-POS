import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { ButtonSpinner } from './Loading';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-content hover:bg-primary-hover shadow-sm active:scale-[0.98]',
  secondary:
    'bg-surface-tertiary text-content hover:bg-border border border-border active:scale-[0.98]',
  ghost:
    'text-content-secondary hover:text-content hover:bg-surface-tertiary active:scale-[0.98]',
  danger:
    'bg-danger text-white hover:bg-red-600 shadow-sm active:scale-[0.98]',
  outline:
    'border border-border text-content hover:bg-surface-tertiary active:scale-[0.98]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-base gap-2.5 rounded-lg',
  icon: 'h-9 w-9 p-0 justify-center rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          variantClasses[variant],
          sizeClasses[size],
          size === 'icon' && 'p-0',
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <ButtonSpinner />
        ) : (
          leftIcon
        )}
        {size !== 'icon' && children}
        {size !== 'icon' && rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';
