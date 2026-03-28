'use client';
import { initials } from '@/lib/utils';
import { clsx } from 'clsx';

const COLORS = [
  'oklch(52% 0.16 38)',   // terracotta
  'oklch(45% 0.14 155)',  // forest green
  'oklch(55% 0.14 240)',  // blue
  'oklch(52% 0.16 300)',  // purple
  'oklch(60% 0.18 200)',  // teal
  'oklch(58% 0.18 60)',   // amber
];

function colorFor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={clsx('rounded-full flex items-center justify-center font-700 text-white shrink-0', sizes[size], className)}
      style={{ background: colorFor(name) }}
      aria-label={name}
    >
      {initials(name)}
    </div>
  );
}
