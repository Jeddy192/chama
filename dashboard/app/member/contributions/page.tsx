'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmt, fmtDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';

interface Chama { id: string; name: string; contributionAmount: string; nextContributionDate: string; }
interface Contribution { id: string; amount: string; status: string; dueDate: string; mpesaReceiptNo: string | null; }

export default function MemberContributionsPage() {
  const [chamas, setChamas] = useState<Chama[]>([]);
  const [contribs, setContribs] = useState<Record<string, Contribution[]>>({});
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get<Chama[]>('/api/chamas').then(async ch => {
      setChamas(ch);
      const map: Record<string, Contribution[]> = {};
      await Promise.all(ch.map(async c => {
        map[c.id] = await api.get<Contribution[]>(`/api/contributions/mine/${c.id}`);
      }));
      setContribs(map);
    }).finally(() => setLoading(false));
  }, []);

  async function pay(chamaId: string) {
    setPaying(chamaId);
    try {
      await api.post('/api/contributions/pay', { chamaId });
      setMsg(m => ({ ...m, [chamaId]: 'STK Push sent — enter your M-Pesa PIN to complete.' }));
    } catch (err: any) {
      setMsg(m => ({ ...m, [chamaId]: err.message }));
    } finally { setPaying(null); }
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="p-8 max-w-3xl animate-fade-up">
      <h1 className="text-2xl font-800 text-[var(--text-primary)] mb-8">My Contributions</h1>

      {chamas.map(chama => {
        const list = contribs[chama.id] || [];
        const latest = list[0];
        const unpaid = !latest || latest.status !== 'PAID';

        return (
          <div key={chama.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-700 text-[var(--text-primary)]">{chama.name}</h2>
                <p className="text-sm text-[var(--text-muted)]">Next due: {fmtDate(chama.nextContributionDate)}</p>
              </div>
              {unpaid && (
                <div>
                  <Button size="sm" onClick={() => pay(chama.id)} loading={paying === chama.id}>
                    Pay {fmt(chama.contributionAmount)}
                  </Button>
                  {msg[chama.id] && <p className="text-xs mt-1 text-[var(--success)] max-w-[200px] text-right">{msg[chama.id]}</p>}
                </div>
              )}
            </div>

            {list.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No contributions yet.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-2 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Due date</th>
                    <th className="text-left py-2 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Amount</th>
                    <th className="text-left py-2 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Status</th>
                    <th className="text-left py-2 text-xs font-600 text-[var(--text-muted)] uppercase tracking-wide">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(c => (
                    <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-3 text-sm text-[var(--text-secondary)] tabular">{fmtDate(c.dueDate)}</td>
                      <td className="py-3 text-sm font-700 tabular text-[var(--text-primary)]">{fmt(c.amount)}</td>
                      <td className="py-3">
                        <Badge variant={c.status === 'PAID' ? 'success' : c.status === 'MISSED' ? 'danger' : 'warning'}>
                          {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                        </Badge>
                      </td>
                      <td className="py-3 text-xs text-[var(--text-muted)] font-mono">{c.mpesaReceiptNo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
