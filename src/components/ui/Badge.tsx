import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'outline';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-[#1E3A5F]/10 text-[#161B33]',
      success: 'bg-[#48BB78]/10 text-[#48BB78]',
      warning: 'bg-[#ED8936]/10 text-[#ED8936]',
      error: 'bg-[#F56565]/10 text-[#F56565]',
      outline: 'border border-gray-200 text-gray-500',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
