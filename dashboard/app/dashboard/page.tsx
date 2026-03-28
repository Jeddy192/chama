'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmt, fmtDate } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { TrendingUp, Users, CreditCard, Landmark, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface Chama {
  id: string; name: string; contributionAmount: string;
  frequency: string; nextContributionDate: string;
  members: { id: string; role: string; trustScore: number; user: { id: string; name: string; phone: string } }[];
  pools: { id: string; name: string; balance: string; contributionSplit: string }[];
}

interface Contribution {
  id: string; amount: string; status: string;
  user: { name: string }; dueDate: string;
}

interface Loan {
  id: string; amount: string; status: string;
  borrower: { name: string }; createdAt: string;
}

function getChama(): { id: string; name: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('cp_chama');
  return raw ? JSON.parse(raw) : null;
}

export default function DashboardPage() {
  const [chama, setChama] = useState<Chama | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const c = getChama();
    if (!c) { setLoading(false); return; }
    Promise.all([
      api.get<Chama>(`/api/chamas/${c.id}`),
      api.get<Contribution[]>(`/api/contributions/chama/${c.id}`),
      api.get<Loan[]>(`/api/loans/chama/${c.id}`),
    ]).then(([ch, co, lo]) => {
      setChama(ch); setContributions(co); setLoans(lo);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;
  if (!chama) return (
    <div className="p-8 text-center text-[var(--text-muted)]">
      <p className="mb-4">No chama found.</p>
      <a href="/dashboard/create" className="text-[var(--primary)] font-500 hover:underline">Create your first chama →</a>
    </div>
  );

  const totalBalance = chama.pools.reduce((s, p) => s + Number(p.balance), 0);
  const paidThisCycle = contributions.filter(c => c.status === 'PAID').length;
  const pendingThisCycle = contributions.filter(c => c.status === 'PENDING').length;
  const missedThisCycle = contributions.filter(c => c.status === 'MISSED').length;
  const activeLoans = loans.filter(l => ['DISBURSED', 'REPAYING'].includes(l.status));
  const pendingLoans = loans.filter(l => ['REQUESTED', 'VOTING', 'APPROVED'].includes(l.status));

  const stats = [
    { label: 'Total pool balance', value: fmt(totalBalance), icon: TrendingUp, color: 'var(--primary)' },
    { label: 'Members', value: chama.members.length, icon: Users, color: 'var(--info)' },
    { label: 'Paid this cycle', value: `${paidThisCycle}/${chama.members.length}`, icon: CheckCircle2, color: 'var(--success)' },
    { label: 'Active loans', value: activeLoans.length, icon: Landmark, color: 'var(--warning)' },
  ];

  return (
    <div className="p-8 max-w-6xl animate-fade-up">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-800 text-[var(--text-primary)]">{chama.name}</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          {chama.frequency.charAt(0) + chama.frequency.slice(1).toLowerCase()} contributions of {fmt(chama.contributionAmount)} · Next due {fmtDate(chama.nextContributionDate)}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-500 text-[var(--text-muted)] uppercase tracking-wide">{label}</span>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="text-2xl font-800 text-[var(--text-primary)] tabular">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Collection status */}
        <div className="lg:col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="font-700 text-[var(--text-primary)] mb-4">Collection status</h2>
          <div className="flex gap-4 mb-5">
            {[
              { label: 'Paid', count: paidThisCycle, color: 'var(--success)', bg: 'var(--success-light)' },
              { label: 'Pending', count: pendingThisCycle, color: 'var(--warning)', bg: 'var(--warning-light)' },
              { label: 'Missed', count: missedThisCycle, color: 'var(--danger)', bg: 'var(--danger-light)' },
            ].map(({ label, count, color, bg }) => (
              <div key={label} className="flex-1 rounded-lg p-3 text-center" style={{ background: bg }}>
                <div className="text-xl font-800 tabular" style={{ color }}>{count}</div>
                <div className="text-xs font-500 mt-0.5" style={{ color }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden bg-[var(--gray-100)] mb-5">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(paidThisCycle / Math.max(chama.members.length, 1)) * 100}%`, background: 'var(--success)' }} />
          </div>

          {/* Recent contributions */}
          <div className="flex flex-col gap-2">
            {contributions.slice(0, 6).map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-2.5">
                  <Avatar name={c.user.name} size="sm" />
                  <span className="text-sm font-500 text-[var(--text-primary)]">{c.user.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm tabular text-[var(--text-secondary)]">{fmt(c.amount)}</span>
                  <Badge variant={c.status === 'PAID' ? 'success' : c.status === 'MISSED' ? 'danger' : 'warning'}>
                    {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          {contributions.length > 6 && (
            <a href="/dashboard/contributions" className="block mt-3 text-sm text-[var(--primary)] font-500 hover:underline">
              View all {contributions.length} contributions →
            </a>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Pools */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
            <h2 className="font-700 text-[var(--text-primary)] mb-4">Pools</h2>
            <div className="flex flex-col gap-3">
              {chama.pools.map(pool => (
                <div key={pool.id}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm font-500 text-[var(--text-primary)]">{pool.name}</span>
                    <span className="text-sm font-700 tabular text-[var(--text-primary)]">{fmt(pool.balance)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--gray-100)]">
                      <div className="h-full rounded-full" style={{ width: `${pool.contributionSplit}%`, background: 'var(--primary)' }} />
                    </div>
                    <span className="text-xs text-[var(--text-muted)] tabular">{pool.contributionSplit}%</span>
                  </div>
                </div>
              ))}
            </div>
            <a href="/dashboard/pools" className="block mt-4 text-sm text-[var(--primary)] font-500 hover:underline">Manage pools →</a>
          </div>

          {/* Pending loans */}
          {pendingLoans.length > 0 && (
            <div className="bg-[var(--warning-light)] border border-[oklch(85%_0.10_75)] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={16} style={{ color: 'var(--warning)' }} />
                <h2 className="font-700 text-[oklch(40%_0.18_75)]">Needs attention</h2>
              </div>
              <div className="flex flex-col gap-2">
                {pendingLoans.map(l => (
                  <div key={l.id} className="flex items-center justify-between">
                    <span className="text-sm text-[oklch(40%_0.18_75)]">{l.borrower.name} — {fmt(l.amount)}</span>
                    <Badge variant="warning">{l.status.charAt(0) + l.status.slice(1).toLowerCase()}</Badge>
                  </div>
                ))}
              </div>
              <a href="/dashboard/loans" className="block mt-3 text-sm font-500 text-[oklch(40%_0.18_75)] hover:underline">Review loans →</a>
            </div>
          )}

          {/* Members quick view */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
            <h2 className="font-700 text-[var(--text-primary)] mb-4">Members</h2>
            <div className="flex flex-col gap-2.5">
              {chama.members.slice(0, 5).map(m => (
                <div key={m.id} className="flex items-center gap-2.5">
                  <Avatar name={m.user.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-500 text-[var(--text-primary)] truncate">{m.user.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">{m.role}</div>
                  </div>
                  <div className="text-sm font-700 tabular" style={{
                    color: m.trustScore >= 75 ? 'var(--success)' : m.trustScore >= 50 ? 'var(--warning)' : 'var(--danger)'
                  }}>{m.trustScore}</div>
                </div>
              ))}
            </div>
            <a href="/dashboard/members" className="block mt-4 text-sm text-[var(--primary)] font-500 hover:underline">
              View all {chama.members.length} members →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
