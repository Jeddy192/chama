'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmt, fmtDate, fmtRelative } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';

import { downloadCSV } from '@/lib/csv';

interface Loan {
  id: string; amount: string; status: string; interestRate: string;
  amountRepaid: string; disbursedAt: string | null; dueDate: string | null;
  createdAt: string;
  borrower: { id: string; name: string; phone: string };
  repayments: { id: string; amount: string; paidAt: string }[];
}

function getChama() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('cp_chama');
  return raw ? JSON.parse(raw) : null;
}

const STATUS_VARIANT: Record<string, any> = {
  REQUESTED: 'neutral', VOTING: 'info', APPROVED: 'warning',
  DISBURSED: 'warning', REPAYING: 'info', REPAID: 'success',
  REJECTED: 'danger', DEFAULTED: 'danger',
};

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const chama = getChama();

  useEffect(() => {
    if (!chama) { setLoading(false); return; }
    api.get<Loan[]>(`/api/loans/chama/${chama.id}`)
      .then(setLoans)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  const filtered = filter === 'ALL' ? loans : loans.filter(l => l.status === filter);
  const totalOut = loans.filter(l => ['DISBURSED', 'REPAYING'].includes(l.status))
    .reduce((s, l) => s + Number(l.amount) - Number(l.amountRepaid), 0);

  return (
    <div className="p-8 max-w-5xl animate-fade-up">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-800 text-[var(--text-primary)]">Loans</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            {loans.filter(l => ['DISBURSED', 'REPAYING'].includes(l.status)).length} active · {fmt(totalOut)} outstanding
          </p>
        </div>
        <button
          onClick={() => downloadCSV('loans.csv', loans.map(l => ({
            Borrower: l.borrower.name, Phone: l.borrower.phone,
            Amount: l.amount, Repaid: l.amountRepaid, Status: l.status,
            DueDate: l.dueDate || '', Requested: l.createdAt,
          })))}
          className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm font-500 text-[var(--text-secondary)] hover:bg-[var(--gray-100)] transition-colors cursor-pointer bg-[var(--surface)]"
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending review', count: loans.filter(l => ['REQUESTED', 'VOTING'].includes(l.status)).length, color: 'var(--warning)' },
          { label: 'Active', count: loans.filter(l => ['DISBURSED', 'REPAYING'].includes(l.status)).length, color: 'var(--info)' },
          { label: 'Repaid', count: loans.filter(l => l.status === 'REPAID').length, color: 'var(--success)' },
          { label: 'Defaulted', count: loans.filter(l => l.status === 'DEFAULTED').length, color: 'var(--danger)' },
        ].map(({ label, count, color }) => (
          <div key={label} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-2xl font-800 tabular mb-1" style={{ color }}>{count}</div>
            <div className="text-xs text-[var(--text-muted)]">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['ALL', 'VOTING', 'APPROVED', 'DISBURSED', 'REPAYING', 'REPAID', 'DEFAULTED'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className="px-3 py-1.5 rounded-lg text-sm font-500 transition-colors cursor-pointer"
            style={{
              background: filter === s ? 'var(--primary)' : 'var(--surface)',
              color: filter === s ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${filter === s ? 'var(--primary)' : 'var(--border)'}`,
            }}>
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--gray-50)]">
              <th className="text-left px-6 py-3 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Borrower</th>
              <th className="text-left px-6 py-3 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Amount</th>
              <th className="text-left px-6 py-3 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Repaid</th>
              <th className="text-left px-6 py-3 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Status</th>
              <th className="text-left px-6 py-3 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Due</th>
              <th className="text-left px-6 py-3 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Requested</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => {
              const progress = Number(l.amount) > 0 ? (Number(l.amountRepaid) / Number(l.amount)) * 100 : 0;
              return (
                <tr key={l.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--gray-50)] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={l.borrower.name} size="sm" />
                      <div>
                        <div className="text-sm font-500 text-[var(--text-primary)]">{l.borrower.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{l.borrower.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-700 tabular text-[var(--text-primary)]">{fmt(l.amount)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-[var(--gray-100)]">
                        <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'var(--success)' }} />
                      </div>
                      <span className="text-xs tabular text-[var(--text-muted)]">{fmt(l.amountRepaid)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={STATUS_VARIANT[l.status]}>
                      {l.status.charAt(0) + l.status.slice(1).toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)] tabular">
                    {l.dueDate ? fmtDate(l.dueDate) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{fmtRelative(l.createdAt)}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)] text-sm">No loans found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
