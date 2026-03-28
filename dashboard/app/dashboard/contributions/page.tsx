'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmt, fmtDate } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { downloadCSV } from '@/lib/csv';
import { Smartphone, RefreshCw, CheckCircle2 } from 'lucide-react';

interface Contribution {
  id: string; amount: string; status: string; dueDate: string;
  mpesaReceiptNo: string | null; transactionDate: string | null;
  user: { id: string; name: string; phone: string };
}
interface Member { id: string; user: { id: string; name: string } }

function getChama() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('cp_chama');
  return raw ? JSON.parse(raw) : null;
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  PAID: 'success', PENDING: 'warning', MISSED: 'danger', PARTIAL: 'warning',
};

export default function ContributionsPage() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [collecting, setCollecting] = useState(false);
  const [collectMsg, setCollectMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifyResults, setVerifyResults] = useState<Record<string, string>>({});

  const chama = getChama();

  async function reload() {
    if (!chama) return;
    const [co, ch] = await Promise.all([
      api.get<Contribution[]>(`/api/contributions/chama/${chama.id}`),
      api.get<any>(`/api/chamas/${chama.id}`),
    ]);
    setContributions(co); setMembers(ch.members);
  }

  useEffect(() => {
    if (!chama) { setLoading(false); return; }
    reload().finally(() => setLoading(false));
  }, []);

  async function collectAll() {
    if (!chama) return;
    setCollecting(true); setCollectMsg(null);
    try {
      const res = await api.post<{ sent: number; results: any[] }>(`/api/contributions/collect-all/${chama.id}`, {});
      setCollectMsg({ text: `STK Push sent to ${res.sent} members`, ok: true });
      await reload();
    } catch (e: any) {
      setCollectMsg({ text: e.message, ok: false });
    } finally { setCollecting(false); }
  }

  async function verifyTx(txId: string) {
    setVerifying(txId);
    try {
      await api.post(`/api/mpesa/verify/${txId}`, {});
      setVerifyResults(r => ({ ...r, [txId]: 'Verified ✓' }));
      await reload();
    } catch (e: any) {
      setVerifyResults(r => ({ ...r, [txId]: e.message }));
    } finally { setVerifying(null); }
  }

  if (loading) return <PageSpinner />;

  const cycles = [...new Set(contributions.map(c => c.dueDate.split('T')[0]))].sort().reverse();
  const filtered = filter === 'ALL' ? contributions : contributions.filter(c => c.status === filter);
  const latestCycle = cycles[0];
  const cycleContribs = contributions.filter(c => c.dueDate.split('T')[0] === latestCycle);

  return (
    <div className="p-8 max-w-5xl animate-fade-up">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-800 text-[var(--text-primary)]">Contributions</h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">Track who's paid, pending, or missed</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button size="sm" variant="secondary" loading={collecting} onClick={collectAll}>
              <Smartphone size={13} /> Collect now
            </Button>
            <button
              onClick={() => downloadCSV('contributions.csv', contributions.map(c => ({
                Name: c.user.name, Phone: c.user.phone, Amount: c.amount,
                Status: c.status, DueDate: c.dueDate, Receipt: c.mpesaReceiptNo || '',
              })))}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm font-500 text-[var(--text-secondary)] hover:bg-[var(--gray-100)] transition-colors cursor-pointer bg-[var(--surface)]"
            >↓ Export CSV</button>
          </div>
        </div>
        {collectMsg && (
          <p className={`mt-2 text-sm ${collectMsg.ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {collectMsg.text}
          </p>
        )}
      </div>

      {/* Current cycle grid */}
      {latestCycle && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6">
          <h2 className="font-700 text-[var(--text-primary)] mb-1">Current cycle</h2>
          <p className="text-sm text-[var(--text-muted)] mb-5">Due {fmtDate(latestCycle)}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {members.map(m => {
              const contrib = cycleContribs.find(c => c.user.id === m.user.id);
              const status = contrib?.status || 'PENDING';
              const colors = {
                PAID:    { bg: 'var(--success-light)', border: 'oklch(80% 0.10 155)', text: 'var(--success)' },
                PENDING: { bg: 'var(--warning-light)', border: 'oklch(85% 0.12 75)',  text: 'oklch(52% 0.18 75)' },
                MISSED:  { bg: 'var(--danger-light)',  border: 'oklch(85% 0.10 22)',  text: 'var(--danger)' },
                PARTIAL: { bg: 'var(--info-light)',    border: 'oklch(85% 0.08 240)', text: 'var(--info)' },
              }[status] || { bg: 'var(--gray-100)', border: 'var(--border)', text: 'var(--text-muted)' };
              return (
                <div key={m.id} className="rounded-lg p-3 flex items-center gap-2.5 border"
                  style={{ background: colors.bg, borderColor: colors.border }}>
                  <Avatar name={m.user.name} size="sm" />
                  <div className="min-w-0">
                    <div className="text-xs font-600 truncate" style={{ color: colors.text }}>{m.user.name}</div>
                    <div className="text-xs font-500 mt-0.5" style={{ color: colors.text }}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['ALL', 'PAID', 'PENDING', 'MISSED'].map(s => (
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
              <th className="text-left px-6 py-3 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Member</th>
              <th className="text-left px-6 py-3 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Amount</th>
              <th className="text-left px-6 py-3 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Status</th>
              <th className="text-left px-6 py-3 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Due date</th>
              <th className="text-left px-6 py-3 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Receipt</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--gray-50)] transition-colors">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.user.name} size="sm" />
                    <div>
                      <div className="text-sm font-500 text-[var(--text-primary)]">{c.user.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">{c.user.phone}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3 text-sm font-700 tabular text-[var(--text-primary)]">{fmt(c.amount)}</td>
                <td className="px-6 py-3">
                  <Badge variant={STATUS_VARIANT[c.status] || 'neutral'}>
                    {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                  </Badge>
                </td>
                <td className="px-6 py-3 text-sm text-[var(--text-secondary)] tabular">{fmtDate(c.dueDate)}</td>
                <td className="px-6 py-3 text-xs text-[var(--text-muted)] tabular font-mono">
                  {c.mpesaReceiptNo || '—'}
                </td>
                <td className="px-6 py-3">
                  {c.status === 'PENDING' && (
                    <div>
                      <button onClick={() => verifyTx(c.id)}
                        disabled={verifying === c.id}
                        className="flex items-center gap-1 text-xs font-600 text-[var(--info)] hover:underline cursor-pointer disabled:opacity-50">
                        {verifying === c.id
                          ? <RefreshCw size={11} className="animate-spin" />
                          : <CheckCircle2 size={11} />}
                        Verify
                      </button>
                      {verifyResults[c.id] && (
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{verifyResults[c.id]}</p>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)] text-sm">No contributions found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
