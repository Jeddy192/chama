'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmtDate, fmtRelative } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { Vote, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface Motion {
  id: string; type: string; description: string; status: string;
  threshold: string; deadline: string; createdAt: string;
  participation?: string; hasVoted?: boolean;
  results?: { yes: number; no: number };
}

interface Chama { id: string; name: string; }

const STATUS_VARIANT: Record<string, any> = {
  OPEN: 'info', PASSED: 'success', FAILED: 'danger', EXPIRED: 'neutral',
};

export default function MemberMotionsPage() {
  const [motions, setMotions] = useState<{ chama: Chama; motions: Motion[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);

  useEffect(() => {
    api.get<Chama[]>('/api/chamas').then(async chamas => {
      const all = await Promise.all(chamas.map(async c => {
        const ms = await api.get<Motion[]>(`/api/motions/chama/${c.id}`);
        const detailed = await Promise.all(ms.map(m => api.get<Motion>(`/api/motions/${m.id}`)));
        return { chama: c, motions: detailed };
      }));
      setMotions(all);
    }).finally(() => setLoading(false));
  }, []);

  async function vote(motionId: string, v: boolean, chamaId: string) {
    setVoting(motionId);
    try {
      await api.post(`/api/motions/${motionId}/vote`, { vote: v });
      // Refresh
      const updated = await api.get<Motion>(`/api/motions/${motionId}`);
      setMotions(prev => prev.map(g =>
        g.chama.id === chamaId
          ? { ...g, motions: g.motions.map(m => m.id === motionId ? updated : m) }
          : g
      ));
    } catch {} finally { setVoting(null); }
  }

  if (loading) return <PageSpinner />;

  const allMotions = motions.flatMap(g => g.motions.map(m => ({ ...m, chamaName: g.chama.name, chamaId: g.chama.id })));
  const open = allMotions.filter(m => m.status === 'OPEN');
  const closed = allMotions.filter(m => m.status !== 'OPEN');

  return (
    <div className="p-8 max-w-3xl animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-800 text-[var(--text-primary)]">Vote</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          {open.filter(m => !m.hasVoted).length} awaiting your vote
        </p>
      </div>

      {open.length > 0 && (
        <div className="mb-8">
          <h2 className="font-600 text-sm text-[var(--text-muted)] uppercase tracking-wide mb-3">Open votes</h2>
          <div className="flex flex-col gap-3">
            {open.map(m => (
              <div key={m.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="info"><Clock size={10} className="mr-1" />Open</Badge>
                      <span className="text-xs text-[var(--text-muted)]">{(m as any).chamaName}</span>
                    </div>
                    <p className="text-sm font-500 text-[var(--text-primary)]">{m.description}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {m.participation} voted · closes {fmtDate(m.deadline)}
                    </p>
                  </div>
                </div>

                {m.hasVoted ? (
                  <p className="text-sm text-[var(--text-muted)] pt-3 border-t border-[var(--border)]">
                    ✓ You've voted on this motion
                  </p>
                ) : new Date() > new Date(m.deadline) ? (
                  <p className="text-sm text-[var(--text-muted)] pt-3 border-t border-[var(--border)]">Voting closed</p>
                ) : (
                  <div className="flex gap-2 pt-3 border-t border-[var(--border)]">
                    <Button size="sm" variant="secondary" loading={voting === m.id}
                      onClick={() => vote(m.id, true, (m as any).chamaId)}
                      className="flex-1 !text-[var(--success)] !border-[var(--success-light)] hover:!bg-[var(--success-light)]">
                      <CheckCircle2 size={14} /> Yes
                    </Button>
                    <Button size="sm" variant="secondary" loading={voting === m.id}
                      onClick={() => vote(m.id, false, (m as any).chamaId)}
                      className="flex-1 !text-[var(--danger)] !border-[var(--danger-light)] hover:!bg-[var(--danger-light)]">
                      <XCircle size={14} /> No
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {closed.length > 0 && (
        <div>
          <h2 className="font-600 text-sm text-[var(--text-muted)] uppercase tracking-wide mb-3">Past votes</h2>
          <div className="flex flex-col gap-3">
            {closed.map(m => (
              <div key={m.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={STATUS_VARIANT[m.status]}>
                        {m.status === 'PASSED' ? <CheckCircle2 size={10} className="mr-1" /> : <XCircle size={10} className="mr-1" />}
                        {m.status.charAt(0) + m.status.slice(1).toLowerCase()}
                      </Badge>
                      <span className="text-xs text-[var(--text-muted)]">{(m as any).chamaName}</span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">{m.description}</p>
                  </div>
                  {m.results && (
                    <div className="text-right shrink-0">
                      <div className="text-xs text-[var(--success)] font-600 tabular">{m.results.yes} yes</div>
                      <div className="text-xs text-[var(--danger)] font-600 tabular">{m.results.no} no</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {allMotions.length === 0 && (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <Vote size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No motions to vote on yet.</p>
        </div>
      )}
    </div>
  );
}
