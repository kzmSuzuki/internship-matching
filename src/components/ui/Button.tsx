import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-gradient-to-r from-[#161B33] to-[#142841] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 border border-white/10', 
      // Made primary a gradient to look "liquid"
      secondary: 'glass-button text-[#1E3A5F] bg-white/40 hover:bg-white/60',
      outline: 'glass-button border border-[#1E3A5F]/30 text-[#1E3A5F] hover:bg-[#1E3A5F]/5',
      ghost: 'text-[#1E3A5F] hover:bg-[#1E3A5F]/10',
      danger: 'glass-button bg-gradient-to-r from-[#F56565] to-[#E53E3E] text-white border-0',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 py-2',
      lg: 'h-12 px-6 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/50 disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
