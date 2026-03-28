'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmt } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { PiggyBank, Plus, Target } from 'lucide-react';

interface Pool {
  id: string; name: string; balance: string; targetAmount: string | null;
  contributionSplit: string; withdrawalMethod: string; lockMonths: number;
  annualInterestRate: string; interestEarned: string; myInterestShare: number;
}

function getChama() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('cp_chama');
  return raw ? JSON.parse(raw) : null;
}

const WITHDRAWAL_LABELS: Record<string, string> = {
  VOTE: 'Requires vote', ADMIN_APPROVAL: 'Admin approval', AUTO_AT_TARGET: 'Auto at target',
};

export default function PoolsPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', targetAmount: '', contributionSplit: '', withdrawalMethod: 'VOTE', lockMonths: '0' });
  const [splitError, setSplitError] = useState('');

  const chama = getChama();

  useEffect(() => {
    if (!chama) { setLoading(false); return; }
    api.get<Pool[]>(`/api/pools/chama/${chama.id}`)
      .then(setPools)
      .finally(() => setLoading(false));
  }, []);

  const totalSplit = pools.reduce((s, p) => s + Number(p.contributionSplit), 0);

  async function createPool(e: React.FormEvent) {
    e.preventDefault();
    if (!chama) return;
    const newTotal = totalSplit + Number(form.contributionSplit);
    if (newTotal > 100) { setSplitError(`Total split would be ${newTotal}% — must be ≤ 100%`); return; }
    setCreating(true); setSplitError('');
    try {
      await api.post(`/api/pools`, {
        chamaId: chama.id, name: form.name,
        targetAmount: form.targetAmount ? Number(form.targetAmount) : undefined,
        contributionSplit: Number(form.contributionSplit),
        withdrawalMethod: form.withdrawalMethod,
        lockMonths: Number(form.lockMonths),
      });
      const updated = await api.get<Pool[]>(`/api/pools/chama/${chama.id}`);
      setPools(updated);
      setShowForm(false);
      setForm({ name: '', targetAmount: '', contributionSplit: '', withdrawalMethod: 'VOTE', lockMonths: '0' });
    } catch (err: any) { setSplitError(err.message); }
    finally { setCreating(false); }
  }

  if (loading) return <PageSpinner />;

  const totalBalance = pools.reduce((s, p) => s + Number(p.balance), 0);

  return (
    <div className="p-8 max-w-4xl animate-fade-up">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-800 text-[var(--text-primary)]">Pools</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Total balance: <span className="font-700 tabular text-[var(--text-primary)]">{fmt(totalBalance)}</span>
            {' · '}{100 - totalSplit}% of contributions unallocated
          </p>
        </div>
        <Button onClick={() => setShowForm(s => !s)} variant={showForm ? 'secondary' : 'primary'} size="sm">
          <Plus size={14} /> New pool
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6 animate-fade-up">
          <h2 className="font-700 text-[var(--text-primary)] mb-4">Create pool</h2>
          <form onSubmit={createPool} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Pool name" placeholder="e.g. December Dividends" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <Input label="Contribution split (%)" type="number" min="1" max="100" placeholder="20"
              value={form.contributionSplit} onChange={e => setForm(f => ({ ...f, contributionSplit: e.target.value }))} required />
            <Input label="Target amount (optional)" type="number" placeholder="50000"
              value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} />
            <div>
              <label className="text-sm font-500 text-[var(--text-primary)] block mb-1.5">Withdrawal method</label>
              <select value={form.withdrawalMethod} onChange={e => setForm(f => ({ ...f, withdrawalMethod: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]">
                <option value="VOTE">Requires vote</option>
                <option value="ADMIN_APPROVAL">Admin approval</option>
                <option value="AUTO_AT_TARGET">Auto at target</option>
              </select>
            </div>
            <Input label="Lock period (months)" type="number" min="0" value={form.lockMonths}
              onChange={e => setForm(f => ({ ...f, lockMonths: e.target.value }))} />
            {splitError && <p className="col-span-2 text-sm text-[var(--danger)]">{splitError}</p>}
            <div className="col-span-2 flex gap-3">
              <Button type="submit" loading={creating}>Create pool</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Investment info */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-700 text-[var(--text-primary)]">Where your money is invested</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          {[
            { name: 'CIC Money Market Fund', rate: '12%', type: 'Low risk',    desc: 'Daily liquidity, capital guaranteed' },
            { name: 'Cytonn High Yield',     rate: '14%', type: 'Medium risk', desc: 'Fixed income, quarterly payouts' },
            { name: 'T-Bills (91-day)',       rate: '15.8%', type: 'Government', desc: 'CBK-backed, zero default risk' },
          ].map(({ name, rate, type, desc }) => (
            <div key={name} className="rounded-xl p-4 border border-[var(--border)] bg-[var(--gray-50)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-600 px-2 py-0.5 rounded-full bg-[var(--success-light)] text-[var(--success)]">{type}</span>
                <span className="text-sm font-800 tabular text-[var(--success)]">{rate} p.a.</span>
              </div>
              <div className="text-sm font-700 text-[var(--text-primary)] mb-0.5">{name}</div>
              <div className="text-xs text-[var(--text-muted)]">{desc}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Idle pool funds are automatically swept into money market instruments daily. Interest accrues to your pool balance and is distributed proportionally at cycle end.
        </p>
      </div>

      {/* Split overview */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6">
        <h2 className="font-700 text-[var(--text-primary)] mb-4">Contribution allocation</h2>
        <div className="flex h-4 rounded-full overflow-hidden gap-0.5 mb-3">
          {pools.map((p, i) => {
            const colors = ['var(--primary)', 'var(--success)', 'var(--info)', 'var(--warning)', 'oklch(52% 0.16 300)'];
            return (
              <div key={p.id} className="h-full transition-all duration-500"
                style={{ width: `${p.contributionSplit}%`, background: colors[i % colors.length] }} />
            );
          })}
          {totalSplit < 100 && (
            <div className="h-full flex-1 bg-[var(--gray-100)]" />
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {pools.map((p, i) => {
            const colors = ['var(--primary)', 'var(--success)', 'var(--info)', 'var(--warning)', 'oklch(52% 0.16 300)'];
            return (
              <div key={p.id} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
                {p.name} ({p.contributionSplit}%)
              </div>
            );
          })}
        </div>
      </div>

      {/* Pool cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {pools.map(pool => {
          const progress = pool.targetAmount ? (Number(pool.balance) / Number(pool.targetAmount)) * 100 : null;
          return (
            <div key={pool.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-700 text-[var(--text-primary)]">{pool.name}</h3>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">{WITHDRAWAL_LABELS[pool.withdrawalMethod]}</div>
                </div>
                <PiggyBank size={18} style={{ color: 'var(--primary)' }} />
              </div>

              <div className="text-2xl font-800 tabular text-[var(--text-primary)] mb-1">{fmt(pool.balance)}</div>
              {pool.targetAmount && (
                <div className="text-xs text-[var(--text-muted)] mb-3">of {fmt(pool.targetAmount)} target</div>
              )}

              {progress !== null && (
                <div className="mb-3">
                  <div className="h-1.5 rounded-full bg-[var(--gray-100)]">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progress, 100)}%`, background: 'var(--primary)' }} />
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Target size={10} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs text-[var(--text-muted)] tabular">{progress.toFixed(1)}% of target</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <Badge variant="neutral">{pool.contributionSplit}% split</Badge>
                {pool.lockMonths > 0 && <Badge variant="warning">Locked {pool.lockMonths}mo</Badge>}
                <Badge variant="success">
                  {(Number(pool.annualInterestRate) * 100).toFixed(0)}% p.a.
                </Badge>
              </div>

              {Number(pool.interestEarned) > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                    <span>Total interest earned</span>
                    <span className="font-700 tabular text-[var(--success)]">+{fmt(pool.interestEarned)}</span>
                  </div>
                  {pool.myInterestShare > 0 && (
                    <div className="flex justify-between text-xs text-[var(--text-muted)]">
                      <span>Your share</span>
                      <span className="font-700 tabular text-[var(--success)]">+{fmt(pool.myInterestShare)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
