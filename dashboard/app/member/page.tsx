'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getAuth } from '@/lib/auth';
import { fmt, fmtDate, trustColor, trustLabel } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { TrendingUp, CreditCard, Landmark, Shield } from 'lucide-react';

interface Chama {
  id: string; name: string; contributionAmount: string;
  frequency: string; nextContributionDate: string;
  myRole: string;
  members: { userId: string; trustScore: number; role: string }[];
}

interface Contribution {
  id: string; amount: string; status: string; dueDate: string; mpesaReceiptNo: string | null;
}

interface Loan {
  id: string; amount: string; status: string; amountRepaid: string; dueDate: string | null;
  chama: { id: string; name: string };
}

export default function MemberOverviewPage() {
  const [chamas, setChamas] = useState<Chama[]>([]);
  const [contributions, setContributions] = useState<Record<string, Contribution[]>>({});
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [payMsg, setPayMsg] = useState<Record<string, string>>({});

  const user = getAuth();

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get<Chama[]>('/api/chamas'),
      api.get<Loan[]>('/api/loans/mine'),
    ]).then(async ([ch, lo]) => {
      setChamas(ch);
      setLoans(lo);
      const contribMap: Record<string, Contribution[]> = {};
      await Promise.all(ch.map(async c => {
        const co = await api.get<Contribution[]>(`/api/contributions/mine/${c.id}`);
        contribMap[c.id] = co;
      }));
      setContributions(contribMap);
    }).finally(() => setLoading(false));
  }, []);

  async function pay(chamaId: string) {
    setPaying(chamaId); setPayMsg(m => ({ ...m, [chamaId]: '' }));
    try {
      await api.post('/api/contributions/pay', { chamaId });
      setPayMsg(m => ({ ...m, [chamaId]: 'STK Push sent to your phone. Enter your M-Pesa PIN to complete.' }));
    } catch (err: any) {
      setPayMsg(m => ({ ...m, [chamaId]: err.message }));
    } finally { setPaying(null); }
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="p-8 max-w-4xl animate-fade-up">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          {user && <Avatar name={user.name} size="lg" />}
          <div>
            <h1 className="text-2xl font-800 text-[var(--text-primary)]">Hello, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="text-[var(--text-secondary)] text-sm">{user?.phone}</p>
          </div>
        </div>
      </div>

      {/* Chama cards */}
      {chamas.map(chama => {
        const myMembership = chama.members.find(m => m.userId === user?.id);
        const trustScore = myMembership?.trustScore ?? 50;
        const myContribs = contributions[chama.id] || [];
        const latestContrib = myContribs[0];
        const paidThisMonth = latestContrib?.status === 'PAID';
        const activeLoans = loans.filter(l => l.chama.id === chama.id && ['DISBURSED', 'REPAYING'].includes(l.status));

        return (
          <div key={chama.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-800 text-lg text-[var(--text-primary)]">{chama.name}</h2>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">
                  {chama.frequency.charAt(0) + chama.frequency.slice(1).toLowerCase()} · {fmt(chama.contributionAmount)} per cycle
                </p>
              </div>
              <Badge variant={chama.myRole === 'ADMIN' ? 'info' : chama.myRole === 'TREASURER' ? 'warning' : 'neutral'}>
                {chama.myRole.charAt(0) + chama.myRole.slice(1).toLowerCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
              {/* Trust score */}
              <div className="rounded-xl p-4 border" style={{ background: 'var(--gray-50)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield size={13} style={{ color: trustColor(trustScore) }} />
                  <span className="text-xs font-500 text-[var(--text-muted)]">Trust score</span>
                </div>
                <div className="text-2xl font-800 tabular mb-1" style={{ color: trustColor(trustScore) }}>{trustScore}</div>
                <div className="text-xs font-500" style={{ color: trustColor(trustScore) }}>{trustLabel(trustScore)}</div>
                <div className="mt-2 h-1.5 rounded-full bg-[var(--gray-200)]">
                  <div className="h-full rounded-full" style={{ width: `${trustScore}%`, background: trustColor(trustScore) }} />
                </div>
              </div>

              {/* This cycle */}
              <div className="rounded-xl p-4 border" style={{
                background: paidThisMonth ? 'var(--success-light)' : 'var(--warning-light)',
                borderColor: paidThisMonth ? 'oklch(80% 0.08 155)' : 'oklch(85% 0.12 75)',
              }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <CreditCard size={13} style={{ color: paidThisMonth ? 'var(--success)' : 'oklch(52% 0.18 75)' }} />
                  <span className="text-xs font-500" style={{ color: paidThisMonth ? 'var(--success)' : 'oklch(52% 0.18 75)' }}>This cycle</span>
                </div>
                <div className="text-sm font-700" style={{ color: paidThisMonth ? 'var(--success)' : 'oklch(52% 0.18 75)' }}>
                  {paidThisMonth ? '✓ Paid' : latestContrib?.status === 'MISSED' ? '✗ Missed' : 'Pending'}
                </div>
                <div className="text-xs mt-1" style={{ color: paidThisMonth ? 'var(--success)' : 'oklch(52% 0.18 75)' }}>
                  Due {fmtDate(chama.nextContributionDate)}
                </div>
              </div>

              {/* Active loans */}
              <div className="rounded-xl p-4 border" style={{ background: 'var(--gray-50)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Landmark size={13} style={{ color: 'var(--info)' }} />
                  <span className="text-xs font-500 text-[var(--text-muted)]">Active loans</span>
                </div>
                <div className="text-2xl font-800 tabular text-[var(--text-primary)]">{activeLoans.length}</div>
                {activeLoans.length > 0 && (
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    {fmt(activeLoans.reduce((s, l) => s + Number(l.amount) - Number(l.amountRepaid), 0))} outstanding
                  </div>
                )}
              </div>
            </div>

            {/* Pay button */}
            {!paidThisMonth && (
              <div>
                <Button onClick={() => pay(chama.id)} loading={paying === chama.id} className="w-full">
                  Pay {fmt(chama.contributionAmount)} via M-Pesa
                </Button>
                {payMsg[chama.id] && (
                  <p className="mt-2 text-sm text-[var(--success)]">{payMsg[chama.id]}</p>
                )}
              </div>
            )}

            {/* Recent contributions */}
            {myContribs.length > 0 && (
              <div className="mt-5 pt-5 border-t border-[var(--border)]">
                <h3 className="text-sm font-600 text-[var(--text-muted)] mb-3">Recent contributions</h3>
                <div className="flex flex-col gap-2">
                  {myContribs.slice(0, 4).map(c => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">{fmtDate(c.dueDate)}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-600 tabular text-[var(--text-primary)]">{fmt(c.amount)}</span>
                        <Badge variant={c.status === 'PAID' ? 'success' : c.status === 'MISSED' ? 'danger' : 'warning'}>
                          {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {chamas.length === 0 && (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">You're not in any chama yet. Ask your treasurer to invite you.</p>
        </div>
      )}
    </div>
  );
}
