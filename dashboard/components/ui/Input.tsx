'use client';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-500 text-[var(--text-primary)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={clsx(
          'w-full px-3 py-2.5 rounded-lg border text-sm bg-[var(--surface)] text-[var(--text-primary)]',
          'placeholder:text-[var(--text-muted)]',
          'transition-colors duration-150',
          error
            ? 'border-[var(--danger)] focus:outline-none focus:ring-2 focus:ring-[var(--danger-light)]'
            : 'border-[var(--border)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]',
          className
        )}
      />
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      {hint && !error && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}
