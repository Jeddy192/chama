'use client';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary:   'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm',
  secondary: 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--gray-100)]',
  ghost:     'text-[var(--text-secondary)] hover:bg-[var(--gray-100)] hover:text-[var(--text-primary)]',
  danger:    'bg-[var(--danger-light)] text-[var(--danger)] hover:bg-[oklch(88%_0.08_22)]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

export function Button({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-500 rounded-lg transition-colors duration-150 cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          style={{ animation: 'spin 600ms linear infinite' }} />
      )}
      {children}
    </button>
  );
}
