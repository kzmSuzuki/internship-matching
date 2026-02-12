import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#1A202C] mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-lg border border-gray-200 bg-white/50 px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] disabled:cursor-not-allowed disabled:opacity-50 transition-all backdrop-blur-sm',
            error && 'border-[#F56565] focus-visible:ring-[#F56565]',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-[#F56565]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
