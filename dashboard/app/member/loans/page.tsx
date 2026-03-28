'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmt, fmtDate, fmtRelative } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { Landmark, Plus } from 'lucide-react';

interface Loan {
  id: string; amount: string; status: string; interestRate: string;
  amountRepaid: string; dueDate: string | null; createdAt: string;
  chama: { id: string; name: string };
  repayments: { id: string; amount: string; paidAt: string }[];
}

interface Chama { id: string; name: string; }

const STATUS_VARIANT: Record<string, any> = {
  REQUESTED: 'neutral', VOTING: 'info', APPROVED: 'warning',
  DISBURSED: 'warning', REPAYING: 'info', REPAID: 'success',
  REJECTED: 'danger', DEFAULTED: 'danger',
};

export default function MemberLoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [chamas, setChamas] = useState<Chama[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [form, setForm] = useState({ chamaId: '', amount: '' });
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Loan[]>('/api/loans/mine'),
      api.get<Chama[]>('/api/chamas'),
    ]).then(([lo, ch]) => { setLoans(lo); setChamas(ch); })
      .finally(() => setLoading(false));
  }, []);

  async function requestLoan(e: React.FormEvent) {
    e.preventDefault();
    setRequesting(true); setMsg(null);
    try {
      await api.post('/api/loans/request', { chamaId: form.chamaId, amount: Number(form.amount) });
      setMsg({ type: 'success', text: 'Loan request submitted. Members will vote on it.' });
      const updated = await api.get<Loan[]>('/api/loans/mine');
      setLoans(updated);
      setShowForm(false);
      setForm({ chamaId: '', amount: '' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally { setRequesting(false); }
  }

  if (loading) return <PageSpinner />;

  const active = loans.filter(l => ['DISBURSED', 'REPAYING'].includes(l.status));
  const pending = loans.filter(l => ['REQUESTED', 'VOTING', 'APPROVED'].includes(l.status));

  return (
    <div className="p-8 max-w-3xl animate-fade-up">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-800 text-[var(--text-primary)]">My Loans</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            {active.length} active · {pending.length} pending
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(s => !s)} variant={showForm ? 'secondary' : 'primary'}>
          <Plus size={14} /> Request loan
        </Button>
      </div>

      {/* Request form */}
      {showForm && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6 animate-fade-up">
          <h2 className="font-700 text-[var(--text-primary)] mb-4">Request a loan</h2>
          <form onSubmit={requestLoan} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-500 text-[var(--text-primary)] block mb-1.5">Chama</label>
              <select value={form.chamaId} onChange={e => setForm(f => ({ ...f, chamaId: e.target.value }))} required
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]">
                <option value="">Select chama...</option>
                {chamas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Input label="Amount (KES)" type="number" min="100" placeholder="5000"
              value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
            {msg && <p className={`text-sm ${msg.type === 'success' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{msg.text}</p>}
            <div className="flex gap-3">
              <Button type="submit" loading={requesting}>Submit request</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
          <p className="mt-3 text-xs text-[var(--text-muted)]">Requires trust score ≥ 50. Members will vote within 24 hours.</p>
        </div>
      )}

      {loans.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <Landmark size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No loans yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {loans.map(loan => {
            const progress = Number(loan.amount) > 0 ? (Number(loan.amountRepaid) / Number(loan.amount)) * 100 : 0;
            const outstanding = Number(loan.amount) - Number(loan.amountRepaid);
            return (
              <div key={loan.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-xs text-[var(--text-muted)] mb-1">{loan.chama.name}</div>
                    <div className="text-2xl font-800 tabular text-[var(--text-primary)]">{fmt(loan.amount)}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      {(Number(loan.interestRate) * 100).toFixed(0)}% interest · requested {fmtRelative(loan.createdAt)}
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[loan.status]}>
                    {loan.status.charAt(0) + loan.status.slice(1).toLowerCase()}
                  </Badge>
                </div>

                {['DISBURSED', 'REPAYING', 'REPAID'].includes(loan.status) && (
                  <div>
                    <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5">
                      <span>Repaid: <span className="font-600 tabular text-[var(--text-primary)]">{fmt(loan.amountRepaid)}</span></span>
                      <span>Outstanding: <span className="font-600 tabular text-[var(--text-primary)]">{fmt(outstanding)}</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--gray-100)]">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(progress, 100)}%`, background: 'var(--success)' }} />
                    </div>
                    {loan.dueDate && (
                      <p className="text-xs text-[var(--text-muted)] mt-1.5">Due {fmtDate(loan.dueDate)}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
