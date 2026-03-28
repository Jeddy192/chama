'use client';

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: 20, height: 20,
        border: '2px solid var(--gray-200)',
        borderTopColor: 'var(--primary)',
        borderRadius: '50%',
        animation: 'spin 600ms linear infinite',
      }}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Spinner />
    </div>
  );
}
