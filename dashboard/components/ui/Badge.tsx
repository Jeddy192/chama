'use client';
import { clsx } from 'clsx';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

const styles = {
  success: 'bg-[var(--success-light)] text-[var(--success)]',
  warning: 'bg-[var(--warning-light)] text-[oklch(52%_0.18_75)]',
  danger:  'bg-[var(--danger-light)] text-[var(--danger)]',
  info:    'bg-[var(--info-light)] text-[var(--info)]',
  neutral: 'bg-[var(--gray-100)] text-[var(--gray-600)]',
};

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-600 tabular',
      styles[variant],
      className
    )}>
      {children}
    </span>
  );
}
