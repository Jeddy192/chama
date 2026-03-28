'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmtDate, fmtRelative } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import { Vote, Clock, CheckCircle2, XCircle, Plus } from 'lucide-react';

interface Motion {
  id: string; type: string; description: string; status: string;
  threshold: string; deadline: string; createdAt: string;
}

function getChama() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('cp_chama');
  return raw ? JSON.parse(raw) : null;
}

const STATUS_VARIANT: Record<string, any> = {
  OPEN: 'info', PASSED: 'success', FAILED: 'danger', EXPIRED: 'neutral',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  OPEN: <Clock size={12} />,
  PASSED: <CheckCircle2 size={12} />,
  FAILED: <XCircle size={12} />,
  EXPIRED: <Clock size={12} />,
};

export default function MotionsPage() {
  const [motions, setMotions] = useState<Motion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: '', type: 'CUSTOM', deadlineHours: '24' });

  const chama = getChama();

  useEffect(() => {
    if (!chama) { setLoading(false); return; }
    api.get<Motion[]>(`/api/motions/chama/${chama.id}`)
      .then(setMotions)
      .finally(() => setLoading(false));
  }, []);

  async function createMotion(e: React.FormEvent) {
    e.preventDefault();
    if (!chama) return;
    setCreating(true);
    try {
      await api.post(`/api/motions`, { chamaId: chama.id, ...form, deadlineHours: Number(form.deadlineHours) });
      const updated = await api.get<Motion[]>(`/api/motions/chama/${chama.id}`);
      setMotions(updated);
      setShowForm(false);
      setForm({ description: '', type: 'CUSTOM', deadlineHours: '24' });
    } catch {} finally { setCreating(false); }
  }

  if (loading) return <PageSpinner />;

  const open = motions.filter(m => m.status === 'OPEN');
  const closed = motions.filter(m => m.status !== 'OPEN');

  return (
    <div className="p-8 max-w-4xl animate-fade-up">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-800 text-[var(--text-primary)]">Motions & Voting</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">{open.length} open · {closed.length} closed</p>
        </div>
        <Button onClick={() => setShowForm(s => !s)} variant={showForm ? 'secondary' : 'primary'} size="sm">
          <Plus size={14} /> New motion
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6 animate-fade-up">
          <h2 className="font-700 text-[var(--text-primary)] mb-4">Create motion</h2>
          <form onSubmit={createMotion} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-500 text-[var(--text-primary)] block mb-1.5">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]">
                {['CUSTOM', 'LOAN_APPROVAL', 'REMOVE_MEMBER', 'RULE_CHANGE', 'POOL_DISBURSEMENT'].map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <Input label="Description" placeholder="Describe what members are voting on..." value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
            <Input label="Voting window (hours)" type="number" min="1" max="168" value={form.deadlineHours}
              onChange={e => setForm(f => ({ ...f, deadlineHours: e.target.value }))} />
            <div className="flex gap-3">
              <Button type="submit" loading={creating}>Create & notify members</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Open motions */}
      {open.length > 0 && (
        <div className="mb-6">
          <h2 className="font-600 text-sm text-[var(--text-muted)] uppercase tracking-wide mb-3">Open</h2>
          <div className="flex flex-col gap-3">
            {open.map(m => <MotionCard key={m.id} motion={m} chamaId={chama?.id} onVote={async () => {
              const updated = await api.get<Motion[]>(`/api/motions/chama/${chama!.id}`);
              setMotions(updated);
            }} />)}
          </div>
        </div>
      )}

      {/* Closed motions */}
      {closed.length > 0 && (
        <div>
          <h2 className="font-600 text-sm text-[var(--text-muted)] uppercase tracking-wide mb-3">Closed</h2>
          <div className="flex flex-col gap-3">
            {closed.map(m => <MotionCard key={m.id} motion={m} />)}
          </div>
        </div>
      )}

      {motions.length === 0 && (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <Vote size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No motions yet. Create one to start a vote.</p>
        </div>
      )}
    </div>
  );
}

function MotionCard({ motion, chamaId, onVote }: { motion: Motion; chamaId?: string; onVote?: () => void }) {
  const [detail, setDetail] = useState<any>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    api.get<any>(`/api/motions/${motion.id}`).then(setDetail).catch(() => {});
  }, [motion.id]);

  async function vote(v: boolean) {
    setVoting(true);
    try {
      await api.post(`/api/motions/${motion.id}/vote`, { vote: v });
      const updated = await api.get<any>(`/api/motions/${motion.id}`);
      setDetail(updated);
      onVote?.();
    } catch {} finally { setVoting(false); }
  }

  const isOpen = motion.status === 'OPEN';
  const deadlinePassed = new Date() > new Date(motion.deadline);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={STATUS_VARIANT[motion.status]}>
              {STATUS_ICON[motion.status]}
              <span className="ml-1">{motion.status.charAt(0) + motion.status.slice(1).toLowerCase()}</span>
            </Badge>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--gray-100)] px-2 py-0.5 rounded-full">
              {motion.type.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-sm font-500 text-[var(--text-primary)]">{motion.description}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-[var(--text-muted)]">
            {isOpen ? `Closes ${fmtDate(motion.deadline)}` : fmtRelative(motion.createdAt)}
          </div>
          {detail && (
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              {detail.participation} voted
            </div>
          )}
        </div>
      </div>

      {/* Results (closed) */}
      {detail?.results && (
        <div className="flex gap-4 mt-3 pt-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
            <span className="text-sm tabular font-600 text-[var(--success)]">{detail.results.yes} Yes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[var(--danger)]" />
            <span className="text-sm tabular font-600 text-[var(--danger)]">{detail.results.no} No</span>
          </div>
        </div>
      )}

      {/* Vote buttons (open, not voted, not expired) */}
      {isOpen && !deadlinePassed && detail && !detail.hasVoted && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
          <Button size="sm" variant="secondary" onClick={() => vote(true)} loading={voting}
            className="flex-1 !text-[var(--success)] !border-[var(--success-light)] hover:!bg-[var(--success-light)]">
            ✓ Vote Yes
          </Button>
          <Button size="sm" variant="secondary" onClick={() => vote(false)} loading={voting}
            className="flex-1 !text-[var(--danger)] !border-[var(--danger-light)] hover:!bg-[var(--danger-light)]">
            ✗ Vote No
          </Button>
        </div>
      )}
      {detail?.hasVoted && isOpen && (
        <p className="mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">You've voted on this motion</p>
      )}
    </div>
  );
}
