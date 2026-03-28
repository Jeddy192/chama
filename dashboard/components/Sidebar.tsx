'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { clearAuth, getAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import {
  LayoutDashboard, Users, CreditCard, RotateCcw,
  Landmark, Vote, PiggyBank, LogOut, Plus, ChevronDown,
  Sparkles, Hash, Settings,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const TREASURER_NAV = [
  { href: '/dashboard',               icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/members',       icon: Users,           label: 'Members' },
  { href: '/dashboard/contributions', icon: CreditCard,      label: 'Contributions' },
  { href: '/dashboard/rotation',      icon: RotateCcw,       label: 'Rotation' },
  { href: '/dashboard/loans',         icon: Landmark,        label: 'Loans' },
  { href: '/dashboard/motions',       icon: Vote,            label: 'Motions' },
  { href: '/dashboard/pools',         icon: PiggyBank,       label: 'Pools' },
  { href: '/dashboard/insights',      icon: Sparkles,        label: 'AI Insights',  soon: true },
  { href: '/dashboard/ussd',          icon: Hash,            label: 'USSD',         soon: true },
  { href: '/dashboard/settings',      icon: Settings,        label: 'Settings' },
];

const MEMBER_NAV = [
  { href: '/member',               icon: LayoutDashboard, label: 'My Overview' },
  { href: '/member/contributions', icon: CreditCard,      label: 'My Contributions' },
  { href: '/member/loans',         icon: Landmark,        label: 'My Loans' },
  { href: '/member/motions',       icon: Vote,            label: 'Vote' },
];

interface Chama { id: string; name: string; myRole: string; }

interface NavItem { href: string; icon: React.ElementType; label: string; soon?: boolean; }

interface SidebarProps {
  role: 'treasurer' | 'member';
  chamaName?: string;
}

export function Sidebar({ role, chamaName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getAuth>>(null);
  const [chamas, setChamas] = useState<Chama[]>([]);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const nav = role === 'treasurer' ? TREASURER_NAV : MEMBER_NAV;

  const currentChama = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('cp_chama') || 'null')
    : null;

  const isAdminOrTreasurer = chamas.some(
    c => c.id === currentChama?.id && (c.myRole === 'ADMIN' || c.myRole === 'TREASURER')
  );

  useEffect(() => {
    setUser(getAuth());
    api.get<Chama[]>('/api/chamas').then(setChamas).catch(() => {});
  }, []);

  // Close switcher on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setShowSwitcher(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function switchChama(chama: Chama) {
    localStorage.setItem('cp_chama', JSON.stringify(chama));
    setShowSwitcher(false);
    router.refresh();
    router.push(role === 'treasurer' ? '/dashboard' : '/member');
  }

  function logout() {
    clearAuth();
    router.push('/login');
  }

  const displayName = currentChama?.name || chamaName;

  return (
    <aside
      className="fixed top-0 left-0 h-full flex-col border-r border-[var(--border)] bg-[var(--surface)] hidden md:flex"
      style={{ width: 'var(--sidebar-w)' }}
    >
      {/* Logo + chama switcher */}
      <div className="px-4 py-4 border-b border-[var(--border)]" ref={switcherRef}>
        <button
          onClick={() => chamas.length > 1 && setShowSwitcher(s => !s)}
          className={clsx(
            'w-full flex items-center gap-2.5 rounded-lg p-1.5 -mx-1.5 transition-colors text-left',
            chamas.length > 1 ? 'hover:bg-[var(--gray-100)] cursor-pointer' : 'cursor-default'
          )}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-800 shrink-0"
            style={{ background: 'var(--primary)' }}>CP</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-700 text-[var(--text-primary)] leading-tight">ChamaPesa</div>
            {displayName && (
              <div className="text-xs text-[var(--text-muted)] truncate max-w-[130px]">{displayName}</div>
            )}
          </div>
          {chamas.length > 1 && (
            <ChevronDown size={14} className={clsx('text-[var(--text-muted)] transition-transform shrink-0', showSwitcher && 'rotate-180')} />
          )}
        </button>

        {/* Chama dropdown */}
        {showSwitcher && (
          <div className="mt-1 rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--surface)] shadow-sm">
            {chamas.map(c => (
              <button key={c.id} onClick={() => switchChama(c)}
                className={clsx(
                  'w-full text-left px-3 py-2.5 text-sm transition-colors cursor-pointer',
                  c.id === currentChama?.id
                    ? 'bg-[var(--primary-light)] text-[var(--primary)] font-600'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--gray-100)]'
                )}>
                <div className="font-500 truncate">{c.name}</div>
                <div className="text-xs opacity-60">{c.myRole.charAt(0) + c.myRole.slice(1).toLowerCase()}</div>
              </button>
            ))}
            <Link href="/dashboard/create"
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-muted)] hover:bg-[var(--gray-100)] border-t border-[var(--border)] transition-colors">
              <Plus size={13} /> New chama
            </Link>
          </div>
        )}
      </div>

      {/* Role switcher — only show treasurer tab if user is admin/treasurer */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex rounded-lg overflow-hidden border border-[var(--border)] text-xs font-600">
          {(isAdminOrTreasurer || role === 'treasurer') && (
            <Link href="/dashboard" className={clsx(
              'flex-1 text-center py-1.5 transition-colors',
              role === 'treasurer' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--gray-100)]'
            )}>Treasurer</Link>
          )}
          <Link href="/member" className={clsx(
            'flex-1 text-center py-1.5 transition-colors',
            role === 'member' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--gray-100)]'
          )}>Member</Link>
        </div>
      </div>

      {/* No chama state */}
      {!currentChama && role === 'treasurer' && (
        <div className="px-3 py-2">
          <Link href="/dashboard/create"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-500 transition-colors border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]">
            <Plus size={14} /> Create a chama
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 pb-4 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label, soon }: NavItem) => {
          const active = pathname === href || (href !== '/dashboard' && href !== '/member' && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-500 transition-colors duration-150 mb-0.5',
                active
                  ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--gray-100)] hover:text-[var(--text-primary)]'
              )}>
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {label}
              {soon && (
                <span className="ml-auto text-[10px] font-700 px-1.5 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)]">
                  SOON
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 border-t border-[var(--border)] pt-3">
        {user && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <Avatar name={user.name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-600 text-[var(--text-primary)] truncate">{user.name}</div>
              <div className="text-xs text-[var(--text-muted)] truncate">{user.phone}</div>
            </div>
            <button onClick={logout}
              className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors p-1 rounded cursor-pointer"
              title="Logout">
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>

    {/* Mobile bottom nav */}
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface)] flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {nav.slice(0, 5).map(({ href, icon: Icon, label }: NavItem) => {
        const active = pathname === href || (href !== '/dashboard' && href !== '/member' && pathname.startsWith(href));
        return (
          <Link key={href} href={href}
            className={clsx(
              'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-600 transition-colors',
              active ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
            )}>
            <Icon size={18} strokeWidth={active ? 2.5 : 2} />
            {label.split(' ')[0]}
          </Link>
        );
      })}
    </nav>
  );
}
