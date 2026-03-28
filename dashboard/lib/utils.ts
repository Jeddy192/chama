export function fmt(amount: number | string | { toString(): string }) {
  return `KES ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function fmtDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtRelative(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return fmtDate(date);
}

export function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function trustColor(score: number): string {
  if (score >= 75) return 'var(--success)';
  if (score >= 50) return 'var(--warning)';
  return 'var(--danger)';
}

export function trustLabel(score: number): string {
  if (score >= 75) return 'Excellent';
  if (score >= 50) return 'Good';
  if (score >= 25) return 'Fair';
  return 'Poor';
}
