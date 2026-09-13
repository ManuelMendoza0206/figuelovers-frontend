import React from 'react';
import type { ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  'aria-label': string;
  title?: string;
  children: React.ReactNode;
}

const variantClasses = {
  primary: 'bg-brand text-white hover:bg-brand-hover',
  secondary: 'bg-surface text-ink border border-border hover:bg-surface-muted hover:border-border-muted',
  ghost: 'bg-transparent text-ink hover:bg-surface-muted',
  danger: 'bg-error text-white hover:bg-rose-600',
};

// Cambiamos w- fijo por px- para permitir que el texto respire
const sizeClasses = {
  sm: 'h-8 px-2 min-w-[2rem]',
  md: 'h-10 px-3 min-w-[2.5rem]',
  lg: 'h-12 px-4 min-w-[3rem]',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      'aria-label': ariaLabel,
      title,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        aria-label={ariaLabel}
        title={title}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-brand/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';