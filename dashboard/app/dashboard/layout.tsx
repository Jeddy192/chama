'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { api } from '@/lib/api';

interface Chama { id: string; name: string; myRole: string; }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [chama, setChama] = useState<Chama | null>(null);

  useEffect(() => {
    const auth = getAuth();
    if (!auth) { router.push('/login'); return; }
    api.get<Chama[]>('/api/chamas').then(chamas => {
      const admin = chamas.find(c => c.myRole === 'ADMIN' || c.myRole === 'TREASURER');
      if (admin) {
        setChama(admin);
        localStorage.setItem('cp_chama', JSON.stringify(admin));
      } else if (chamas.length > 0) {
        setChama(chamas[0]);
        localStorage.setItem('cp_chama', JSON.stringify(chamas[0]));
      }
    }).catch(() => {});
  }, [router]);

  return (
    <div className="flex min-h-screen">
      <Sidebar role="treasurer" chamaName={chama?.name} />
      <main className="flex-1 overflow-auto" style={{ marginLeft: 'var(--sidebar-w)' }}>
        {children}
      </main>
    </div>
  );
}
