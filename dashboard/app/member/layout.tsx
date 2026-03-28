'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getAuth()) router.push('/login');
  }, [router]);

  return (
    <div className="flex min-h-screen">
      <Sidebar role="member" />
      <main className="flex-1 overflow-auto" style={{ marginLeft: 'var(--sidebar-w)' }}>
        {children}
      </main>
    </div>
  );
}
